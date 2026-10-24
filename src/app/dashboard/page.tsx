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

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

let cachedGlobalProjects: CacheEntry<any[]> | null = null;
let cachedAgencyRankings: CacheEntry<any[]> | null = null;
let cachedBenchmarks: CacheEntry<any[]> | null = null;
let cachedAlerts: CacheEntry<any[]> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    const isFiltered = Object.keys(matchFilter).length > 0;

    // 1. Target projects query: if role-filtered (e.g. state_admin), fetch targeted batch in 1 request
    let projectPromise: Promise<any>;
    if (isFiltered) {
      projectPromise = Promise.resolve(
        supabase
          .from("projects")
          .select("id, project_name, project_code, sector, ministry, agency, state, original_cost, revised_cost, cumulative_expenditure, physical_progress, status, original_doc, revised_doc, contractor_delay, land_acquisition_issue, forest_clearance_issue")
          .match(matchFilter)
          .limit(3000)
      ).then(res => [res]).catch(() => []);
    } else if (cachedGlobalProjects && Date.now() - cachedGlobalProjects.timestamp < CACHE_TTL_MS) {
      projectPromise = Promise.resolve([{ data: cachedGlobalProjects.data }]);
    } else {
      const pageSize = 1000;
      const estimatedTotal = 12000;
      const pages = Math.ceil(estimatedTotal / pageSize);
      const promises = Array.from({ length: pages }).map((_, page) => 
        supabase
          .from("projects")
          .select("id, project_name, project_code, sector, ministry, agency, state, original_cost, revised_cost, cumulative_expenditure, physical_progress, status, original_doc, revised_doc, contractor_delay, land_acquisition_issue, forest_clearance_issue")
          .range(page * pageSize, (page + 1) * pageSize - 1)
      );
      projectPromise = Promise.all(promises.map(p => Promise.resolve(p).catch(e => ({ data: null, error: e }))));
    }

    // 2. Target agency rankings (cached for 5 minutes)
    let agencyPromise: Promise<any>;
    if (cachedAgencyRankings && Date.now() - cachedAgencyRankings.timestamp < CACHE_TTL_MS) {
      agencyPromise = Promise.resolve({ data: cachedAgencyRankings.data });
    } else {
      agencyPromise = Promise.resolve(
        supabase.from("agency_performance_rankings").select("*").order("delay_frequency_pct", { ascending: false })
      ).catch(e => ({ data: null, error: e }));
    }

    // 3. Sector benchmarks (cached for 5 minutes)
    let benchPromise: Promise<any>;
    if (cachedBenchmarks && Date.now() - cachedBenchmarks.timestamp < CACHE_TTL_MS) {
      benchPromise = Promise.resolve({ data: cachedBenchmarks.data });
    } else {
      benchPromise = Promise.resolve(supabase.from("sector_benchmarks").select("*")).catch(e => ({ data: null, error: e }));
    }

    // 4. Alerts (cached for 5 minutes)
    let alertsPromise: Promise<any>;
    if (cachedAlerts && Date.now() - cachedAlerts.timestamp < CACHE_TTL_MS) {
      alertsPromise = Promise.resolve({ data: cachedAlerts.data });
    } else {
      alertsPromise = Promise.resolve(supabase.from("project_alerts").select("*").order("id", { ascending: false })).catch(e => ({ data: null, error: e }));
    }

    const [results, agencyRes, benchRes, alertsRes, mongoProjects, kpiRes] = await Promise.all([
      withTimeout(projectPromise, isFiltered ? 2000 : 4500, []),
      withTimeout(agencyPromise, 2500, { data: null, error: null }),
      withTimeout(benchPromise, 2500, { data: null, error: null }),
      withTimeout(alertsPromise, 2500, { data: null, error: null }),
      withTimeout(getMongoProjects().catch(() => []), 800, []),
      withTimeout(Promise.resolve(supabase.rpc("get_portfolio_kpis")).catch(e => ({ data: null, error: e })), 2000, { data: null, error: null }),
    ]);

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

    // Populate caches if fetched freshly
    if (agencyData.length > 0 && !cachedAgencyRankings) {
      cachedAgencyRankings = { data: agencyData, timestamp: Date.now() };
    }
    if (benchData.length > 0 && !cachedBenchmarks) {
      cachedBenchmarks = { data: benchData, timestamp: Date.now() };
    }
    if (alertsData.length > 0 && !cachedAlerts) {
      cachedAlerts = { data: alertsData, timestamp: Date.now() };
    }
    if (!isFiltered && allProjectsRaw.length > 0 && !cachedGlobalProjects) {
      cachedGlobalProjects = { data: allProjectsRaw, timestamp: Date.now() };
    }
  } catch (err) {
    console.warn("Database initialization/fetch warning:", err);
  }

  // If remote database returned no projects or is offline, use resilient fallback data
  if (allProjectsRaw.length === 0 && mongoAgencyProjects.length === 0) {
    allProjectsRaw = [...FALLBACK_PROJECTS];
  }
  if (!agencyData || agencyData.length === 0 || agencyData.every((a: any) => a.agency === "Unknown Agency")) {
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

  if (session && (session.role === "ministry" || session.role === "agency" || session.role === "engineer" || session.role === "state_admin")) {
    const allowedAgencies = new Set(allProjects.map(p => p.agency).filter(Boolean));
    const allowedProjectIds = new Set(allProjects.map(p => String(p.id)));

    const scoped = finalAgencyData.filter(a => allowedAgencies.has(a.agency));
    if (scoped.length > 0) {
      finalAgencyData = scoped;
    }
    finalAlertsData = finalAlertsData.filter(a => allowedProjectIds.has(String(a.project_id)));
  }

  if (!finalAgencyData || finalAgencyData.length === 0 || finalAgencyData.every((a: any) => a.agency === "Unknown Agency")) {
    finalAgencyData = [...FALLBACK_AGENCY_RANKINGS];
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
