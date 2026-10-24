"use client";
import ViewComplaints from "@/components/ViewComplaints";

import { useState, useMemo, useEffect, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectorDistributionChart, CostOverviewChart, PhysicalProgressChart } from "@/components/ExtraCharts";
import { ProjectTableAI } from "@/components/ProjectTableAI";
import StateRiskMap from "@/components/StateRiskMap";
import { AnalyticsTabs } from "@/components/AnalyticsTabs";
import { AdminAccountManager } from "@/components/AdminAccountManager";
import AdminHotspots from "./AdminHotspots";
import AdminInspectors from "./AdminInspectors";
import { AgencyProjectManager } from "@/components/AgencyProjectManager";
import { WorkflowInbox } from "@/components/WorkflowInbox";
import { ProposalForm } from "@/components/ProposalForm";
import InvestmentParity from "./InvestmentParity";
import { NotificationBell } from "@/components/NotificationBell";
import { SessionUser } from "@/lib/auth";
import { I18N } from "@/lib/i18n";



const sectors = [
  "Roads & Highways", "Railways", "Coal", "Oil & Gas",
  "Transmission & Distribution", "Electricity Generation",
  "Water Resources", "Healthcare", "Education",
  "Urban Public Transport", "Others"
];

const TAB_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "proposals", label: "Bidding / Project Addition" },
  { id: "complaints", label: "View Complaints" },
  { id: "my-projects", label: "My Projects" },
  { id: "participatory", label: "Participatory Priority Engine" },
    { id: "gatekeeper", label: "PDF Gatekeeper (Investment Parity)" },
  { id: "agency", label: "Agency Leaderboard" },
  { id: "benchmarks", label: "Benchmarks" },
  { id: "risk", label: "Risk Prediction" },
  { id: "alerts", label: "Alerts & Actions" },
];

type Props = {
  allProjects: any[];
  agencyData: any[];
  benchResData: any[];
  alertsData: any[];
  kpi: any;
  currentUser?: SessionUser;
};

const ALL_MINISTRIES = [
  "Department for Promotion of Industry & Internal Trade",
  "Department of Higher Education",
  "Department of Sports",
  "Department of Telecommunications",
  "Department of Water Resources, River Development & GR",
  "Ministry of Chemicals and Fertilizers",
  "Ministry of Civil Aviation",
  "Ministry of Coal",
  "Ministry of Health & Family Welfare",
  "Ministry of Housing & Urban Affairs",
  "Ministry of Labour and Employment",
  "Ministry of Mines",
  "Ministry of New & Renewable Energy",
  "Ministry of Petroleum & Natural Gas",
  "Ministry of Ports, Shipping and Waterways",
  "Ministry of Power",
  "Ministry of Railways",
  "Ministry of Road Transport & Highways",
  "Ministry of Steel"
];


export function DashboardClientView({ allProjects, agencyData, benchResData, alertsData, kpi, currentUser }: Props) {
  const [language, setLanguage] = useState<string>("en");
  const t = I18N[language] || I18N.en;
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [sectorFilter, setSectorFilter] = useState<string | null>(null);
  const [ministryFilter, setMinistryFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const getMinistry = (sector: string, agency: string, project_name: string, cost: number, assignedMinistry: string | null) => {
    if (assignedMinistry) return assignedMinistry;
    const s = (sector || "").toLowerCase();
    if (s.includes("road") || s.includes("highway")) return "Ministry of Road Transport & Highways";
    if (s.includes("rail")) return "Ministry of Railways";
    if (s.includes("power") || s.includes("energy")) return "Ministry of Power";
    if (s.includes("petroleum") || s.includes("oil") || s.includes("gas")) return "Ministry of Petroleum & Natural Gas";
    if (s.includes("coal")) return "Ministry of Coal";
    if (s.includes("water") || s.includes("river")) return "Department of Water Resources, River Development & GR";
    if (s.includes("telecom") || s.includes("communication")) return "Department of Telecommunications";
    if (s.includes("civil") || s.includes("aviation") || s.includes("airport")) return "Ministry of Civil Aviation";
    if (s.includes("health") || s.includes("hospital")) return "Ministry of Health & Family Welfare";
    if (s.includes("steel")) return "Ministry of Steel";
    if (s.includes("mine") || s.includes("mining")) return "Ministry of Mines";
    if (s.includes("urban") || s.includes("housing")) return "Ministry of Housing & Urban Affairs";
    if (s.includes("port") || s.includes("shipping")) return "Ministry of Ports, Shipping and Waterways";
    if (s.includes("chemical") || s.includes("fertilizer")) return "Ministry of Chemicals and Fertilizers";
    if (s.includes("education")) return "Department of Higher Education";
    if (s.includes("sport")) return "Department of Sports";
    if (s.includes("renewable")) return "Ministry of New & Renewable Energy";
    if (s.includes("industry")) return "Department for Promotion of Industry & Internal Trade";
    return "Other";
  };

  const projectsWithMinistry = useMemo(() => {
    return allProjects.map(p => ({ ...p, ministry: getMinistry(p.sector, p.agency, p.project_name, p.original_cost, p.ministry) }));
  }, [allProjects]);

  // Derive unique options for dropdowns
  const uniqueSectors = useMemo(() => Array.from(new Set(allProjects.map(p => p.sector || "Others"))).sort(), [allProjects]);
  const uniqueMinistries = ALL_MINISTRIES;
  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    projectsWithMinistry.forEach(p => {
      if (p.state) {
        p.state.split(',').forEach((s: string) => {
          const trimmed = s.trim();
          if (trimmed && trimmed !== 'Multi State' && trimmed !== 'Centre') {
            states.add(trimmed);
          }
        });
      }
    });
    return Array.from(states).sort();
  }, [projectsWithMinistry]);

  const filteredProjects = useMemo(() => {
    let result = projectsWithMinistry;

    if (stateFilter) {
      const sn = stateFilter.toLowerCase();
      result = result.filter(p => p.state && p.state.toLowerCase().includes(sn));
    }
    if (sectorFilter) {
      result = result.filter(p => p.sector === sectorFilter);
    }
    if (ministryFilter) {
      result = result.filter(p => p.ministry === ministryFilter);
    }
    return result;
  }, [projectsWithMinistry, stateFilter, sectorFilter, ministryFilter]);

  // KPIs bypass if no filters are active to use precomputed values
  const isFiltered = Boolean(stateFilter || sectorFilter || ministryFilter || (currentUser && currentUser.role !== "admin" && currentUser.role !== "user"));
  const summary = useMemo(() => {
    return {
      totalProjects: filteredProjects.length,
      totalOriginalCost: filteredProjects.reduce((sum, p) => sum + (p.original_cost || 0), 0),
      totalRevisedCost: filteredProjects.reduce((sum, p) => sum + (p.revised_cost || p.original_cost || 0), 0),
      totalExpenditure: filteredProjects.reduce((sum, p) => sum + (p.cumulative_expenditure || 0), 0)
    };
  }, [filteredProjects]);

  const { totalProjects, totalOriginalCost, totalRevisedCost, totalExpenditure } = summary;

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(num));
  };

  const { chartData, progressData, mappedProjects } = useMemo(() => {
    const sectorMap = new Map<string, { sector: string; count: number; original: number; revised: number }>();
    sectors.forEach(s => sectorMap.set(s, { sector: s, count: 0, original: 0, revised: 0 }));
    const progressCounts: Record<string, number> = { '< 20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '>= 80': 0 };

    const mapped = filteredProjects.map(p => {
      let sector = p.sector || "Others";
      const targetSectors = ["Coal","Education","Electricity Generation","Healthcare","Oil & Gas","Railways","Roads & Highways","Transmission & Distribution","Urban Public Transport","Water Resources"];
      if (!targetSectors.includes(sector)) sector = "Others";

      const s = sectorMap.get(sector);
      if (s) { s.count += 1; s.original += p.original_cost || 0; s.revised += p.revised_cost || 0; }

      const prog = p.physical_progress || 0;
      if (prog < 20) progressCounts['< 20']++;
      else if (prog < 40) progressCounts['20-40']++;
      else if (prog < 60) progressCounts['40-60']++;
      else if (prog < 80) progressCounts['60-80']++;
      else progressCounts['>= 80']++;

      const costEscalation = (p.revised_cost || 0) - (p.original_cost || 0);
      const costOverrunPercent = p.original_cost ? (costEscalation / p.original_cost) * 100 : 0;
      const financialProgress = p.revised_cost ? ((p.cumulative_expenditure || 0) / p.revised_cost) * 100 : 0;
      const implementationDiscrepancy = (p.physical_progress || 0) - financialProgress;
      return { ...p, sector, costEscalation, costOverrunPercent, financialProgress, implementationDiscrepancy };
    });

    return {
      chartData: Array.from(sectorMap.values()),
      progressData: Object.entries(progressCounts).map(([range, count]) => ({ range, count })),
      mappedProjects: mapped
    };
  }, [filteredProjects]);

  const searchedProjects = useMemo(() => {
    if (!debouncedSearchQuery) return mappedProjects;
    const q = debouncedSearchQuery.toLowerCase();
    return mappedProjects.filter(p => 
      (p.project_name && p.project_name.toLowerCase().includes(q)) || 
      (p.project_code && p.project_code.toLowerCase().includes(q))
    );
  }, [mappedProjects, debouncedSearchQuery]);


  const benchmarkProjects = useMemo(() => {
    return allProjects.map((p) => {
      let sector = "Others";
      const name = (p.project_name || "").toLowerCase();
      const ag = (p.agency || "").toLowerCase();
      if (name.match(/highway|road|bridge|nhai|expressway|nh-|bypass|nhdp/) || ag.match(/nhai|nhidcl|road/)) sector = "Roads & Highways";
      else if (name.match(/railway|freight|track|gauge/) || ag.match(/rail/)) sector = "Railways";
      else if (name.match(/coal|mine|ocp/) || ag.match(/coal|bccl|ccl|ecl|mcl|ncl|secl|wcl/)) sector = "Coal";
      else if (name.match(/petroleum|refinery|pipeline|oil|gas/) || ag.match(/ongc|iocl|bpcl|hpcl|gail/)) sector = "Oil & Gas";
      else if (name.match(/transmission|substation|grid/) || ag.match(/pgcil|powergrid/)) sector = "Transmission & Distribution";
      else if (name.match(/power|thermal|hydro|electricity|generation|ntpc|nhpc/) || ag.match(/ntpc|nhpc|power/)) sector = "Electricity Generation";
      else if (name.match(/water|river|dam|irrigation/) || ag.match(/water|cwc/)) sector = "Water Resources";
      else if (name.match(/health|hospital|aiims|medical/) || ag.match(/hcc/)) sector = "Healthcare";
      else if (name.match(/school|university|iit|nit|education/) || ag.match(/kvs|navodaya/)) sector = "Education";
      else if (name.match(/metro|urban|mrtc|smart city/) || ag.match(/metro/)) sector = "Urban Public Transport";
      const oc = p.original_cost || 0; const rc = p.revised_cost || oc; const exp = p.cumulative_expenditure || 0;
      return { ...p, sector, cost_overrun_pct: oc > 0 ? ((rc - oc) / oc) * 100 : 0, expenditure_progress_pct: rc > 0 ? (exp / rc) * 100 : 0, physical_progress: p.physical_progress || 0 };
    });
  }, [allProjects]);

  const dynamicAgencyData = useMemo(() => {
    const agencyMap = new Map<string, any>();
    benchmarkProjects.forEach(p => {
      const ag = p.agency;
      if (!ag) return;
      if (!agencyMap.has(ag)) {
        agencyMap.set(ag, { agency: ag, total_projects: 0, delayed_project_count: 0, sum_cost_overrun: 0 });
      }
      const data = agencyMap.get(ag);
      data.total_projects += 1;
      data.sum_cost_overrun += (p.cost_overrun_pct || 0);
      
      let isDelayed = false;
      if (p.original_doc && p.revised_doc) {
        if (new Date(p.revised_doc) > new Date(p.original_doc)) {
          isDelayed = true;
        }
      } else if (p.status === "Ongoing" && p.original_doc && new Date(p.original_doc) < new Date()) {
          isDelayed = true;
      }
      
      if (p.contractor_delay || p.land_acquisition_issue || p.forest_clearance_issue) isDelayed = true;
      
      if (isDelayed) {
        data.delayed_project_count += 1;
      }
    });

    const results = [];
    for (const data of agencyMap.values()) {
      data.delay_frequency_pct = (data.delayed_project_count / data.total_projects) * 100;
      data.avg_cost_overrun_pct = data.sum_cost_overrun / data.total_projects;
      
      // Round to 2 decimal places
      data.delay_frequency_pct = Math.round(data.delay_frequency_pct * 100) / 100;
      data.avg_cost_overrun_pct = Math.round(data.avg_cost_overrun_pct * 100) / 100;
      
      results.push(data);
    }

    results.sort((a, b) => {
      if (a.delay_frequency_pct !== b.delay_frequency_pct) return a.delay_frequency_pct - b.delay_frequency_pct;
      if (a.avg_cost_overrun_pct !== b.avg_cost_overrun_pct) return a.avg_cost_overrun_pct - b.avg_cost_overrun_pct;
      return b.total_projects - a.total_projects;
    });

    return results;
  }, [benchmarkProjects]);


  return (
    <div className="p-3 sm:p-5 md:p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2 w-full">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tighter uppercase border-b-4 border-slate-300 pb-2 text-slate-900">
            PragatiPulse
          </h1>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
            <p className="text-slate-600 font-mono text-sm uppercase">Infrastructure Project Monitoring Platform</p>
            <div className="flex flex-wrap items-center gap-3">
              {!currentUser && <a href="/pulse" className="text-xs font-mono uppercase bg-indigo-600 text-white px-3 py-2 sm:px-4 sm:py-2 hover:bg-indigo-700 transition-colors font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0₹)] border border-black whitespace-nowrap">Add Complaint</a>}
              
              {currentUser ? (
                <>
                  <span className="text-xs font-mono uppercase bg-slate-200 px-3 py-2 hidden md:inline-block">
                    {currentUser.name} - {currentUser.role}
                    {currentUser.ministry ? ' - ' + currentUser.ministry : ""}
                    {currentUser.agency ? ' - ' + currentUser.agency : ""}
                  </span>
                  <NotificationBell />
                  <a href="/logout" className="text-xs font-mono uppercase bg-slate-900 text-white px-3 py-2 hover:bg-slate-800 transition-colors">Logout</a>
                </>
              ) : (
                <a href="/login" className="text-xs font-mono uppercase bg-emerald-600 text-white px-6 py-2 hover:bg-emerald-700 transition-colors font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0₹)] border border-black">Login</a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
        <div className="flex gap-1 border-b border-slate-200 mb-6 md:mb-8 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {(() => {
             const tabs = [];
             if (!currentUser) {
                 tabs.push({ id: 'dashboard', label: 'Overview' }, { id: 'complaints', label: 'Complaints' });
             } else if (currentUser.role === 'admin') {
                 // Central Admin
                 tabs.push(
                     { id: 'dashboard', label: 'Participatory Priority Engine (Dashboard)' },
                     { id: 'gatekeeper', label: 'PDF Gatekeeper (Investment Parity)' },
                       { id: 'accounts', label: 'Accounts (Platform Provisioning)' }
                 );
             } else if (currentUser.role === 'state_admin') {
                 // State Admin
                 tabs.push(
                     { id: 'dashboard', label: 'State Priority Engine' },
                     { id: 'hotspots', label: 'Hotspots' },
                     { id: 'inspectors', label: 'Inspectors' },
                     { id: 'proposals', label: 'Bidding / Proposals' },
                     { id: 'accounts', label: 'Accounts (Ministries)' }
                 );
             } else if (currentUser.role === 'ministry') {
                 tabs.push(
                     { id: 'dashboard', label: 'Dashboard' },
                     { id: 'hotspots', label: 'Field Reports' },
                     { id: 'proposals', label: 'Proposals' },
                     { id: 'complaints', label: 'Complaints' }
                 );
             } else if (currentUser.role === 'agency') {
                 tabs.push(
                     { id: 'dashboard', label: 'Dashboard' },
                     { id: 'proposals', label: 'Bidding' },
                     { id: 'my-projects', label: 'My Projects' },
                     { id: 'complaints', label: 'Complaints' }
                 );
             }
             
               // Add analytics tabs for everyone except unauthenticated
               if (currentUser) {
                   tabs.push(
                       { id: 'agency', label: 'Agency Leaderboard' },
                       { id: 'benchmarks', label: 'Benchmarks' },
                       { id: 'risk', label: 'Risk Prediction' },
                       { id: 'alerts', label: 'Alerts & Actions' }
                   );
               }

               return tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 sm:px-4 sm:py-2 font-semibold text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-b-2 border-slate-900 text-slate-900"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
             ));
          })()}
        </div>

      {/* ── Tab Content ── */}
      {activeTab === "dashboard" && (
        <div className="space-y-8">
          
          {/* Filters Row */}
            <div className="flex flex-wrap gap-4 p-4 bg-white border border-slate-200 rounded-none shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <div className="flex flex-col gap-1 w-full md:w-auto flex-1 min-w-[200px]">
                <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">State / UT (India)</label>
                <select 
                  className="bg-slate-50 border border-slate-300 text-slate-700 p-2 text-sm font-mono focus:border-emerald-500 outline-none"
                  value={stateFilter || ""}
                  onChange={(e) => setStateFilter(e.target.value || null)}
                >
                  <option value="">All States / UTs (India)</option>
                  {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

            <div className="flex flex-col gap-1 w-full md:w-auto flex-1 min-w-[200px]">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Sector</label>
              <select 
                className="bg-slate-50 border border-slate-300 text-slate-700 p-2 text-sm font-mono focus:border-emerald-500 outline-none"
                value={sectorFilter || ""}
                onChange={(e) => setSectorFilter(e.target.value || null)}
              >
                <option value="">All Sectors</option>
                {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {currentUser?.role !== "ministry" && (
  <div className="flex flex-col gap-1 w-full md:w-auto flex-1 min-w-[200px]">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Ministry / Department</label>
              <select 
                className="bg-slate-50 border border-slate-300 text-slate-700 p-2 text-sm font-mono focus:border-emerald-500 outline-none"
                value={ministryFilter || ""}
                onChange={(e) => setMinistryFilter(e.target.value || null)}
              >
                <option value="">All Ministries</option>
                {uniqueMinistries.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
)}
            {(stateFilter || sectorFilter || ministryFilter) && (
              <div className="flex items-end">
                <button 
                  onClick={() => { setStateFilter(null); setSectorFilter(null); setMinistryFilter(null); }}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 p-2 text-sm font-mono h-[38px] px-4 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-sky-100 text-sky-950 border-none shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase">Project Count (in no.)</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black">{totalProjects}</div></CardContent>
            </Card>
            <Card className="bg-amber-100 text-amber-950 border-none shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase">Original Approved Cost (in cr.)</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black">{"\u20B9"}{formatNumber(totalOriginalCost)}</div></CardContent>
            </Card>
            <Card className="bg-rose-100 text-rose-950 border-none shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase">Latest Revised Cost (in cr.)</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black">{"\u20B9"}{formatNumber(totalRevisedCost)}</div></CardContent>
            </Card>
            <Card className="bg-lime-100 text-lime-950 border-none shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-bold uppercase">Cumulative Expenditure (in cr.)</CardTitle></CardHeader>
              <CardContent><div className="text-4xl font-black">{"\u20B9"}{formatNumber(totalExpenditure)}</div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <CardHeader><CardTitle className="font-mono uppercase tracking-wide border-b border-slate-200 pb-2 text-slate-900">Sector-wise Distribution</CardTitle></CardHeader>
              <CardContent className="pt-6"><SectorDistributionChart data={chartData} /></CardContent>
            </Card>
            <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <CardHeader><CardTitle className="font-mono uppercase tracking-wide border-b border-slate-200 pb-2 text-slate-900">Cost Overview</CardTitle></CardHeader>
              <CardContent className="pt-6"><CostOverviewChart original={totalOriginalCost} revised={totalRevisedCost} expenditure={totalExpenditure} /></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
              <CardHeader><CardTitle className="font-mono uppercase tracking-wide border-b border-slate-200 pb-2 text-slate-900">Physical Progress [Project Count]</CardTitle></CardHeader>
              <CardContent className="pt-6"><PhysicalProgressChart data={progressData} /></CardContent>
            </Card>
            <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-200">
                <CardTitle className="font-mono uppercase tracking-wide text-slate-900">Geospatial Risk Analysis</CardTitle>
                {stateFilter && (
                  <button onClick={() => setStateFilter(null)} className="text-xs font-mono bg-slate-200 hover:bg-slate-300 text-slate-900 px-3 py-1 rounded transition-colors">
                    View All States (Clear Filter)
                  </button>
                )}
              </CardHeader>
              <CardContent className="pt-6 flex-1 flex flex-col">
                <Suspense fallback={<div className="h-[300px] md:h-[400px] flex items-center justify-center text-slate-500 font-mono">Loading Map...</div>}>
                  <StateRiskMap country="India" projects={allProjects} selectedState={stateFilter || undefined} onStateSelect={(s) => setStateFilter(s === stateFilter ? null : s)} />
                </Suspense>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <CardTitle className="font-mono uppercase tracking-wide text-slate-900">Project Database</CardTitle>
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 text-sm font-mono focus:border-emerald-500 outline-none"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0"><ProjectTableAI projects={searchedProjects} currentUser={currentUser} /></CardContent>
          </Card>
        </div>
      )}

      {activeTab === "proposals" && (
        <div className="space-y-8 p-6">
          <WorkflowInbox currentUser={currentUser as any} agencyRanks={dynamicAgencyData} />
          {(currentUser?.role === "agency" || currentUser?.role === "ministry") && (
            <ProposalForm currentUser={currentUser as any} onSuccess={() => window.location.reload()} />
          )}
        </div>
      )}
      

      {activeTab === "complaints" && (
        <div className="p-6 bg-slate-50 border border-slate-200 shadow-sm">
          <ViewComplaints />
        </div>
      )}

      {activeTab === "hotspots" && (currentUser?.role === "state_admin" || currentUser?.role === "ministry") ? (
        <AdminHotspots currentUser={currentUser} />
      ) : activeTab === "inspectors" && currentUser?.role === "state_admin" ? (
        <AdminInspectors currentUser={currentUser} />
      ) : activeTab === "accounts" && (currentUser?.role === "admin" || currentUser?.role === "state_admin") ? (
        <AdminAccountManager currentUser={currentUser} />
      ) : activeTab === "my-projects" && currentUser?.role === "agency" ? (
        <AgencyProjectManager projects={allProjects.filter((p: any) => p.agency === currentUser?.agency && !p.is_completed)} agency={currentUser?.agency!} />
      ) : activeTab === "gatekeeper" ? (
        <InvestmentParity projects={filteredProjects} />
      ) : activeTab !== "dashboard" && activeTab !== "proposals" && activeTab !== "complaints" && activeTab !== "hotspots" && activeTab !== "inspectors" && activeTab !== "gatekeeper" && (
        <AnalyticsTabs
          activeTab={activeTab}
          agencyData={dynamicAgencyData}
          projects={benchmarkProjects}
          benchmarks={benchResData}
          alerts={alertsData}
        />
      )}
    </div>
  );
}

