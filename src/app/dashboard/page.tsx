import { Suspense } from "react";
import { createClient } from "@/utils/supabase/server";
import { DashboardClientView } from "@/components/DashboardClientView";
import { getSession } from "@/lib/auth";
import { getMongoProjects, getProjectOverrides, applyProjectOverrides } from "@/lib/project-store";
import { 
  FALLBACK_PROJECTS, 
  FALLBACK_BENCHMARKS, 
  FALLBACK_AGENCY_RANKINGS, 
  FALLBACK_ALERTS 
} from "@/lib/fallback-data";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const session = await getSession();

  const matchFilter: any = {};
  if (session?.role === "ministry") {
    if (session.ministry) matchFilter.ministry = session.ministry;
    if (session.state) matchFilter.state = session.state;
  } else if (session?.role === "state_admin") {
    if (session.state) matchFilter.state = session.state;
  } else if (session?.role === "agency" || session?.role === "engineer") {
    if (session.agency) matchFilter.agency = session.agency;
  }

  let allProjectsRaw: any[] = [];
  let agencyData: any[] = [];
  let benchData: any[] = [];
  let alertsData: any[] = [];
  let mongoAgencyProjects: any[] = [];
  let kpi: any = null;

  function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  }

  try {
    const supabase = await createClient();

    // Fetch all projects using pagination IN PARALLEL with a strict 1-second timeout
    const pageSize = 1000;
    const estimatedTotal = 12000;
    const pages = Math.ceil(estimatedTotal / pageSize);
    
    const promises = Array.from({ length: pages }).map((_, page) => 
      supabase
        .from("projects")
        .select("id, project_name, project_code, sector, ministry, agency, state, original_cost, revised_cost, cumulative_expenditure, physical_progress, status, original_doc, revised_doc, contractor_delay, land_acquisition_issue, forest_clearance_issue")
        .match(matchFilter)
        .range(page * pageSize, (page + 1) * pageSize - 1)
    );

    const [results, agencyRes, benchRes, alertsRes, mongoProjects, kpiRes] = await withTimeout(
      Promise.all([
        Promise.all(promises.map(p => Promise.resolve(p).catch(e => ({ data: null, error: e })))).catch(() => []),
        Promise.resolve(supabase.from("agency_performance_rankings").select("*").order("delay_frequency_pct", { ascending: false })).catch(e => ({ data: null, error: e })),
        Promise.resolve(supabase.from("sector_benchmarks").select("*")).catch(e => ({ data: null, error: e })),
        Promise.resolve(supabase.from("project_alerts").select("*").order("id", { ascending: false })).catch(e => ({ data: null, error: e })),
        getMongoProjects().catch(e => { console.warn("MongoDB Fetch Error:", e); return []; }),
        Promise.resolve(supabase.rpc("get_portfolio_kpis")).catch(e => ({ data: null, error: e })),
      ]),
      600,
      [[], { data: null }, { data: null }, { data: null }, [], { data: null }] as any
    );

    for (const res of results) {
      if (res?.data) {
        allProjectsRaw.push(...res.data);
      }
    }

    agencyData = agencyRes?.data || [];
    benchData = benchRes?.data || [];
    alertsData = alertsRes?.data || [];
    mongoAgencyProjects = mongoProjects || [];
    kpi = kpiRes?.data?.[0] || null;
  } catch (err) {
    console.warn("Database initialization/fetch warning:", err);
  }

  // If remote database returned no projects or is offline, use resilient fallback data
  if (allProjectsRaw.length === 0 && mongoAgencyProjects.length === 0) {
    allProjectsRaw = [...FALLBACK_PROJECTS];
  }
  if (agencyData.length === 0) {
    agencyData = [...FALLBACK_AGENCY_RANKINGS];
  }
  if (benchData.length === 0) {
    benchData = [...FALLBACK_BENCHMARKS];
  }
  if (alertsData.length === 0) {
    alertsData = [...FALLBACK_ALERTS];
  }

  const baseProjects = allProjectsRaw;
  const overrides = await withTimeout(getProjectOverrides(), 400, []).catch(() => []);
  
  const allProjects = [
    ...applyProjectOverrides(baseProjects, overrides),
    ...(mongoAgencyProjects || [])
      .filter((p: any) => session?.role === "admin" || (session?.role === "state_admin" && p.state === session?.state) || (session?.role === "ministry" && p.ministry === session?.ministry && (session?.state ? p.state === session?.state : true)) || ((session?.role === "engineer" || session?.role === "agency") && p.agency === session?.agency) || session?.role === "user")
      .map((p: any) => { const { _id, ...rest } = p as any; return { ...rest, id: _id.toString(), _source: "mongo" }; }),
  ];

  let finalAgencyData = agencyData;
  let finalAlertsData = alertsData;

  if (session?.role !== "admin") {
    const allowedAgencies = new Set(allProjects.map(p => p.agency).filter(Boolean));
    const allowedProjectIds = new Set(allProjects.map(p => String(p.id)));

    finalAgencyData = finalAgencyData.filter(a => allowedAgencies.has(a.agency));
    finalAlertsData = finalAlertsData.filter(a => allowedProjectIds.has(String(a.project_id)));
  }

  return (
    <DashboardClientView 
      allProjects={allProjects} 
      agencyData={finalAgencyData}
      benchResData={benchData}
      alertsData={finalAlertsData}
      kpi={kpi}
      currentUser={session || undefined}
    />
  );
}
