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

const cachedProjectsMap = new Map<string, CacheEntry<any[]>>();
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
    const filterKey = JSON.stringify(matchFilter);

    // 1. Target projects query (cached per role/filter for 5 minutes)
    let projectPromise: Promise<any>;
    const cachedEntry = cachedProjectsMap.get(filterKey);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      projectPromise = Promise.resolve([{ data: cachedEntry.data }]);
    } else if (isFiltered) {
      projectPromise = Promise.resolve(
        supabase
          .from("projects")
          .select("id, project_name, project_code, sector, ministry, agency, state, original_cost, revised_cost, cumulative_expenditure, physical_progress, status, original_doc, revised_doc, contractor_delay, land_acquisition_issue, forest_clearance_issue")
          .match(matchFilter)
          .limit(3000)
      ).then(res => [res]).catch(() => []);
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

    // 5. KPI RPC (cached for 5 minutes, omitted for filtered views)
    let kpiPromise: Promise<any>;
    if (isFiltered) {
      kpiPromise = Promise.resolve({ data: null });
    } else if (cachedPortfolioKpi && Date.now() - cachedPortfolioKpi.timestamp < CACHE_TTL_MS) {
      kpiPromise = Promise.resolve({ data: [cachedPortfolioKpi.data] });
    } else {
      kpiPromise = Promise.resolve(supabase.rpc("get_portfolio_kpis")).catch(e => ({ data: null, error: e }));
    }

    // 6. Mongo projects (cached for 1 minute)
    let mongoPromise: Promise<any>;
    if (cachedMongoProjects && Date.now() - cachedMongoProjects.timestamp < SHORT_CACHE_TTL_MS) {
      mongoPromise = Promise.resolve(cachedMongoProjects.data);
    } else {
      mongoPromise = getMongoProjects().catch(() => []);
    }

    const [results, agencyRes, benchRes, alertsRes, mongoProjects, kpiRes] = await Promise.all([
      withTimeout(projectPromise, isFiltered ? 1500 : 3500, []),
      withTimeout(agencyPromise, 1500, { data: null, error: null }),
      withTimeout(benchPromise, 1500, { data: null, error: null }),
      withTimeout(alertsPromise, 1500, { data: null, error: null }),
      withTimeout(mongoPromise, 300, []),
      withTimeout(kpiPromise, 1500, { data: null, error: null }),
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
    if (kpi && !cachedPortfolioKpi) {
      cachedPortfolioKpi = { data: kpi, timestamp: Date.now() };
    }
    if (mongoAgencyProjects.length > 0 && !cachedMongoProjects) {
      cachedMongoProjects = { data: mongoAgencyProjects, timestamp: Date.now() };
    }
    if (allProjectsRaw.length > 0) {
      cachedProjectsMap.set(filterKey, { data: allProjectsRaw, timestamp: Date.now() });
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
