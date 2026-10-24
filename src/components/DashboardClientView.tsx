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
import { 
  Layers, 
  Landmark, 
  TrendingUp, 
  Activity, 
  MapPin, 
  Compass, 
  Building2, 
  Search, 
  X, 
  ShieldCheck, 
  Trophy, 
  ClipboardList, 
  MessageSquare, 
  LayoutDashboard, 
  FileSpreadsheet, 
  AlertTriangle, 
  Users, 
  Sparkles, 
  Filter,
  BarChart3
} from "lucide-react";



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
    // Compute agencies dynamically for the active state/filters from filteredProjects
    filteredProjects.forEach(p => {
      const ag = p.agency || extractAgency(p.project_name, p.sector, p.agency);
      if (!ag || ag === "Unknown Agency" || ag === "State Infrastructure Agency") return;
      if (!agencyMap.has(ag)) {
        agencyMap.set(ag, { agency: ag, total_projects: 0, delayed_project_count: 0, sum_cost_overrun: 0 });
      }
      const data = agencyMap.get(ag);
      data.total_projects += 1;
      data.sum_cost_overrun += (p.costOverrunPercent || 0);
      
      let isDelayed = false;
      if (p.revised_doc && p.original_doc && new Date(p.revised_doc) > new Date(p.original_doc)) {
        isDelayed = true;
      } else if (p.status === "Delayed" || p.contractor_delay || p.land_acquisition_issue || p.forest_clearance_issue) {
        isDelayed = true;
      } else if ((p.costOverrunPercent || 0) > 15 || ((p.physical_progress || 0) < 40 && (p.financialProgress || 0) > 60)) {
        isDelayed = true;
      }
      
      if (isDelayed) {
        data.delayed_project_count += 1;
      }
    });

    const results = [];
    for (const data of agencyMap.values()) {
      data.delay_frequency_pct = data.total_projects > 0 ? (data.delayed_project_count / data.total_projects) * 100 : 0;
      data.avg_cost_overrun_pct = data.total_projects > 0 ? data.sum_cost_overrun / data.total_projects : 0;
      
      // Round to 2 decimal places
      data.delay_frequency_pct = Math.round(data.delay_frequency_pct * 100) / 100;
      data.avg_cost_overrun_pct = Math.round(data.avg_cost_overrun_pct * 100) / 100;
      
      results.push(data);
    }

    // Sort by largest active project count first, then by delay frequency
    results.sort((a, b) => {
      if (b.total_projects !== a.total_projects) return b.total_projects - a.total_projects;
      return a.delay_frequency_pct - b.delay_frequency_pct;
    });

    return results;
  }, [filteredProjects]);

  const getTabIcon = (id: string) => {
    switch (id) {
      case 'dashboard': return <LayoutDashboard className="w-4 h-4" />;
      case 'complaints': return <MessageSquare className="w-4 h-4" />;
      case 'gatekeeper': return <FileSpreadsheet className="w-4 h-4" />;
      case 'accounts': return <Users className="w-4 h-4" />;
      case 'hotspots': return <MapPin className="w-4 h-4" />;
      case 'inspectors': return <ShieldCheck className="w-4 h-4" />;
      case 'proposals': return <ClipboardList className="w-4 h-4" />;
      case 'my-projects': return <Layers className="w-4 h-4" />;
      case 'agency': return <Trophy className="w-4 h-4" />;
      case 'benchmarks': return <BarChart3 className="w-4 h-4" />;
      case 'risk': return <ShieldCheck className="w-4 h-4" />;
      case 'alerts': return <AlertTriangle className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen gov-bg-pattern text-slate-900 font-sans pb-16">
      {/* Top Tricolor Accent Bar */}
      <div className="h-1.5 w-full gov-tricolor-gradient" />

      {/* Main Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* Header */}
        <header className="mb-8">
          {/* Top Micro-Line */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase border-b border-slate-200/60 mb-4">
            <span className="flex items-center gap-1.5 text-slate-700">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Government of India • Ministry of Statistics and Programme Implementation (MoSPI)
            </span>
            <span className="hidden sm:inline-block font-mono text-slate-400">
              Online Computerized Monitoring System (OCMS) • SIH26103
            </span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 bg-white/90 backdrop-blur-md p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-700 via-blue-600 to-indigo-900 flex items-center justify-center text-white shadow-md shadow-indigo-600/25 shrink-0 ring-4 ring-indigo-50">
                <Activity className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900">
                  Pragati<span className="text-indigo-600">Pulse</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Centralized Infrastructure Decision-Support & Risk Governance Platform
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!currentUser && (
                <a 
                  href="/pulse" 
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md shadow-blue-500/20 whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Citizen Grievance Portal
                </a>
              )}
              
              {currentUser ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-medium text-slate-700">
                    <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span className="font-bold text-slate-900">{currentUser.name}</span>
                    <span className="text-slate-400">|</span>
                    <span className="uppercase text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      {currentUser.role}
                    </span>
                    {currentUser.ministry && (
                      <span className="hidden xl:inline text-slate-500 truncate max-w-[200px]">
                        • {currentUser.ministry}
                      </span>
                    )}
                  </div>
                  <NotificationBell />
                  <a 
                    href="/logout" 
                    className="text-xs font-semibold uppercase tracking-wider bg-slate-900 text-white px-3.5 py-2 rounded-xl hover:bg-slate-800 transition shadow-xs"
                  >
                    Logout
                  </a>
                </>
              ) : (
                <a 
                  href="/login" 
                  className="text-xs font-bold uppercase tracking-wider bg-slate-900 text-white px-5 py-2.5 rounded-xl hover:bg-slate-800 transition shadow-md shadow-slate-900/20"
                >
                  Official Login
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex gap-2 p-1.5 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {(() => {
              const tabs = [];
              if (!currentUser) {
                tabs.push({ id: 'dashboard', label: 'Overview' }, { id: 'complaints', label: 'Citizen Grievances' });
              } else if (currentUser.role === 'admin') {
                tabs.push(
                  { id: 'dashboard', label: 'Priority Engine' },
                  { id: 'gatekeeper', label: 'PDF Gatekeeper (Parity)' },
                  { id: 'accounts', label: 'Account Provisioning' }
                );
              } else if (currentUser.role === 'state_admin') {
                tabs.push(
                  { id: 'dashboard', label: 'State Priority Engine' },
                  { id: 'hotspots', label: 'Field Hotspots' },
                  { id: 'inspectors', label: 'Field Inspectors' },
                  { id: 'proposals', label: 'Bidding / Proposals' },
                  { id: 'accounts', label: 'Ministry Accounts' }
                );
              } else if (currentUser.role === 'ministry') {
                tabs.push(
                  { id: 'dashboard', label: 'Executive Dashboard' },
                  { id: 'hotspots', label: 'Field Reports' },
                  { id: 'proposals', label: 'Proposals' },
                  { id: 'complaints', label: 'Citizen Complaints' }
                );
              } else if (currentUser.role === 'agency') {
                tabs.push(
                  { id: 'dashboard', label: 'Agency Dashboard' },
                  { id: 'proposals', label: 'Bidding' },
                  { id: 'my-projects', label: 'My Projects' },
                  { id: 'complaints', label: 'Assigned Complaints' }
                );
              }
              
              if (currentUser) {
                tabs.push(
                  { id: 'agency', label: 'Agency Leaderboard' },
                  { id: 'benchmarks', label: 'Sector Benchmarks' },
                  { id: 'risk', label: 'AI Risk Prediction' },
                  { id: 'alerts', label: 'Alerts & Actions' }
                );
              }

              return tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                      isActive
                        ? "bg-gradient-to-r from-slate-900 to-indigo-950 text-white shadow-md shadow-indigo-950/20"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <span className={isActive ? "text-indigo-300" : "text-slate-400"}>
                      {getTabIcon(tab.id)}
                    </span>
                    {tab.label}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* ── Tab Content ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            
            {/* Filter Command Bar */}
            <div className="p-5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  Portfolio Filters
                </div>
                {(stateFilter || sectorFilter || ministryFilter) && (
                  <button 
                    onClick={() => { setStateFilter(null); setSectorFilter(null); setMinistryFilter(null); }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-3 py-1 rounded-lg transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset All Filters
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* State Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    State / UT (India)
                  </label>
                  <select 
                    className="bg-slate-50/80 border border-slate-200 text-slate-800 p-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                    value={stateFilter || ""}
                    onChange={(e) => setStateFilter(e.target.value || null)}
                  >
                    <option value="">All States / UTs ({uniqueStates.length})</option>
                    {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Sector Filter */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    Sector (HML Category)
                  </label>
                  <select 
                    className="bg-slate-50/80 border border-slate-200 text-slate-800 p-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                    value={sectorFilter || ""}
                    onChange={(e) => setSectorFilter(e.target.value || null)}
                  >
                    <option value="">All Sectors ({uniqueSectors.length})</option>
                    {uniqueSectors.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Ministry Filter */}
                {currentUser?.role !== "ministry" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-500" />
                      Ministry / Department
                    </label>
                    <select 
                      className="bg-slate-50/80 border border-slate-200 text-slate-800 p-2.5 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      value={ministryFilter || ""}
                      onChange={(e) => setMinistryFilter(e.target.value || null)}
                    >
                      <option value="">All Ministries ({uniqueMinistries.length})</option>
                      {uniqueMinistries.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 4 Executive KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Project Count */}
              <div className="glass-card glass-card-hover rounded-2xl p-5 border-blue-200/60 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-white flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Active Portfolio</p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-1 tracking-tight">{totalProjects}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between text-xs font-semibold text-blue-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Monitored Projects
                  </span>
                  <span className="bg-blue-100/80 text-blue-800 px-2 py-0.5 rounded-md text-[10px] font-mono">100% OCMS</span>
                </div>
              </div>

              {/* Card 2: Original Approved Cost */}
              <div className="glass-card glass-card-hover rounded-2xl p-5 border-emerald-200/60 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Approved Budget</p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-1 tracking-tight">
                      ₹{formatNumber(totalOriginalCost)} <span className="text-base font-semibold text-slate-500">Cr</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                    <Landmark className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Original Sanction
                  </span>
                  <span className="bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-mono">Baseline</span>
                </div>
              </div>

              {/* Card 3: Latest Revised Cost */}
              <div className="glass-card glass-card-hover rounded-2xl p-5 border-amber-200/60 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Latest Revised Cost</p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-1 tracking-tight">
                      ₹{formatNumber(totalRevisedCost)} <span className="text-base font-semibold text-slate-500">Cr</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/30">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-xs font-semibold text-amber-800">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Escalation: ₹{formatNumber(Math.max(totalRevisedCost - totalOriginalCost, 0))} Cr
                  </span>
                  <span className="bg-amber-100/80 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
                    +{totalOriginalCost > 0 ? ((Math.max(totalRevisedCost - totalOriginalCost, 0) / totalOriginalCost) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>

              {/* Card 4: Cumulative Expenditure */}
              <div className="glass-card glass-card-hover rounded-2xl p-5 border-violet-200/60 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-white flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Cumulative Expenditure</p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-1 tracking-tight">
                      ₹{formatNumber(totalExpenditure)} <span className="text-base font-semibold text-slate-500">Cr</span>
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-500/30">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-violet-100 flex items-center justify-between text-xs font-semibold text-violet-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    Expenditure Ratio
                  </span>
                  <span className="bg-violet-100/80 text-violet-900 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold">
                    {totalRevisedCost > 0 ? ((totalExpenditure / totalRevisedCost) * 100).toFixed(1) : 0}% Spent
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Row 1: Sector Distribution & Cost Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Sector-wise Portfolio Distribution
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400">By Project Count</span>
                </div>
                <SectorDistributionChart data={chartData} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Financial Comparison Overview
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Values in ₹ Cr</span>
                </div>
                <CostOverviewChart original={totalOriginalCost} revised={totalRevisedCost} expenditure={totalExpenditure} />
              </div>
            </div>

            {/* Charts Row 2: Physical Progress & Geospatial Risk Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Physical Progress Distribution
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400">Completion Brackets</span>
                </div>
                <PhysicalProgressChart data={progressData} />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden p-5 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                      Geospatial Risk & Density Analysis
                    </h2>
                  </div>
                  {stateFilter && (
                    <button 
                      onClick={() => setStateFilter(null)} 
                      className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1 rounded-lg transition"
                    >
                      Clear State ({stateFilter})
                    </button>
                  )}
                </div>
                <div className="flex-1 min-h-[360px]">
                  <Suspense fallback={<div className="h-[360px] flex items-center justify-center text-slate-500 font-mono text-xs">Loading State GeoJSON...</div>}>
                    <StateRiskMap country="India" projects={allProjects} selectedState={stateFilter || undefined} onStateSelect={(s) => setStateFilter(s === stateFilter ? null : s)} />
                  </Suspense>
                </div>
              </div>
            </div>

            {/* Project Database Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Project Master Directory</h2>
                    <p className="text-xs text-slate-500">Showing {searchedProjects.length} matching ongoing infrastructure projects</p>
                  </div>
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, code, sector..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 text-slate-800 pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-0">
                <ProjectTableAI projects={searchedProjects} currentUser={currentUser} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Proposals */}
        {activeTab === "proposals" && (
          <div className="space-y-8 bg-white/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-sm">
            <WorkflowInbox currentUser={currentUser as any} agencyRanks={dynamicAgencyData} />
            {(currentUser?.role === "agency" || currentUser?.role === "ministry") && (
              <ProposalForm currentUser={currentUser as any} onSuccess={() => window.location.reload()} />
            )}
          </div>
        )}

        {/* Tab 3: Complaints */}
        {activeTab === "complaints" && (
          <div className="p-6 sm:p-8 bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm">
            <ViewComplaints />
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === "hotspots" && (currentUser?.role === "state_admin" || currentUser?.role === "ministry") ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-6">
            <AdminHotspots currentUser={currentUser} />
          </div>
        ) : activeTab === "inspectors" && currentUser?.role === "state_admin" ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-6">
            <AdminInspectors currentUser={currentUser} />
          </div>
        ) : activeTab === "accounts" && (currentUser?.role === "admin" || currentUser?.role === "state_admin") ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-6">
            <AdminAccountManager currentUser={currentUser} />
          </div>
        ) : activeTab === "my-projects" && currentUser?.role === "agency" ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-6">
            <AgencyProjectManager projects={allProjects.filter((p: any) => p.agency === currentUser?.agency && !p.is_completed)} agency={currentUser?.agency!} />
          </div>
        ) : activeTab === "gatekeeper" ? (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-6">
            <InvestmentParity projects={filteredProjects} />
          </div>
        ) : activeTab !== "dashboard" && activeTab !== "proposals" && activeTab !== "complaints" && activeTab !== "hotspots" && activeTab !== "inspectors" && activeTab !== "gatekeeper" && (
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-sm p-6">
            <AnalyticsTabs
              activeTab={activeTab}
              agencyData={dynamicAgencyData}
              projects={benchmarkProjects}
              benchmarks={benchResData}
              alerts={alertsData}
            />
          </div>
        )}

      </div>
    </div>
  );
}

