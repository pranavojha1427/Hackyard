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

let cachedAgencyRankings: CacheEntry<any[]> | null = null;
let cachedBenchmarks: CacheEntry<any[]> | null = null;
let cachedAlerts: CacheEntry<any[]> | null = null;
let cachedPortfolioKpi: CacheEntry<any> | null = null;
let cachedMongoProjects: CacheEntry<any[]> | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SHORT_CACHE_TTL_MS = 60 * 1000; // 1 minute

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

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

  try {
    const supabase = await createClient();
    const isFiltered = Object.keys(matchFilter).length > 0;

    // 1. Authoritative Indian infrastructure projects loaded directly from projects_seed.json
    let seedProjectsList = [...FALLBACK_PROJECTS];
    if (isFiltered) {
      if (matchFilter.state) {
        const targetState = matchFilter.state.toLowerCase();
        seedProjectsList = seedProjectsList.filter(p => (p.state || "").toLowerCase().includes(targetState));
      }
      if (matchFilter.ministry) {
        seedProjectsList = seedProjectsList.filter(p => p.ministry === matchFilter.ministry);
      }
      if (matchFilter.agency) {
        seedProjectsList = seedProjectsList.filter(p => p.agency === matchFilter.agency);
      }
    }
    allProjectsRaw = seedProjectsList;

    // 2. Sector benchmarks (cached for 5 minutes)
    let benchPromise: Promise<any>;
    if (cachedBenchmarks && Date.now() - cachedBenchmarks.timestamp < CACHE_TTL_MS) {
      benchPromise = Promise.resolve({ data: cachedBenchmarks.data });
    } else {
      benchPromise = Promise.resolve(supabase.from("sector_benchmarks").select("*")).catch(e => ({ data: null, error: e }));
    }

    // 3. Alerts (cached for 5 minutes)
    let alertsPromise: Promise<any>;
    if (cachedAlerts && Date.now() - cachedAlerts.timestamp < CACHE_TTL_MS) {
      alertsPromise = Promise.resolve({ data: cachedAlerts.data });
    } else {
      alertsPromise = Promise.resolve(supabase.from("project_alerts").select("*").order("id", { ascending: false })).catch(e => ({ data: null, error: e }));
    }

    // 4. Mongo projects (cached for 1 minute)
    let mongoPromise: Promise<any>;
    if (cachedMongoProjects && Date.now() - cachedMongoProjects.timestamp < SHORT_CACHE_TTL_MS) {
      mongoPromise = Promise.resolve(cachedMongoProjects.data);
    } else {
      mongoPromise = getMongoProjects().catch(() => []);
    }

    // 5. Mongo overrides (cached for 1 minute)
    let overridesPromise: Promise<any>;
    if (cachedOverrides && Date.now() - cachedOverrides.timestamp < SHORT_CACHE_TTL_MS) {
      overridesPromise = Promise.resolve(cachedOverrides.data);
    } else {
      overridesPromise = getProjectOverrides().catch(() => []);
    }

    const [benchRes, alertsRes, mongoProjects, fetchedOverrides] = await Promise.all([
      withTimeout(benchPromise, 1500, { data: null, error: null }),
      withTimeout(alertsPromise, 1500, { data: null, error: null }),
      withTimeout(mongoPromise, 300, []),
      withTimeout(overridesPromise, 300, []),
    ]);

    benchData = benchRes?.data || [];
    alertsData = alertsRes?.data || [];
    mongoAgencyProjects = mongoProjects || [];
    overridesData = fetchedOverrides || [];

    // Populate caches if fetched freshly
    if (benchData.length > 0 && !cachedBenchmarks) {
      cachedBenchmarks = { data: benchData, timestamp: Date.now() };
    }
    if (alertsData.length > 0 && !cachedAlerts) {
      cachedAlerts = { data: alertsData, timestamp: Date.now() };
    }
    if (mongoAgencyProjects.length > 0 && !cachedMongoProjects) {
      cachedMongoProjects = { data: mongoAgencyProjects, timestamp: Date.now() };
    }
    if (overridesData.length > 0 && !cachedOverrides) {
      cachedOverrides = { data: overridesData, timestamp: Date.now() };
    }
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
  const overrides = await withTimeout(
    getProjectOverrides(baseProjects.map((p: any) => p.id)).catch(() => []),
    400,
    []
  );
  
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
