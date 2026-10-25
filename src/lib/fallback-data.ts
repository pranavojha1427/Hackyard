import rawSeedProjects from "../../projects_seed.json";

export const FALLBACK_PROJECTS: any[] = Array.isArray(rawSeedProjects)
  ? (rawSeedProjects as any[]).map((p, index) => ({
      ...p,
      id: p.id || p.project_code || index + 1,
      original_cost: Number(p.original_cost) || 0,
      revised_cost: Number(p.revised_cost ?? p.original_cost) || 0,
      cumulative_expenditure: Number(p.cumulative_expenditure) || 0,
      physical_progress: Number(p.physical_progress) || 0,
      status: p.status || "Ongoing"
    }))
  : [];


export const FALLBACK_BENCHMARKS = [
  { sector: "Roads & Highways", avg_cost_overrun_pct: 14.2, avg_delay_months: 18.5, benchmark_efficiency_score: 82.0 },
  { sector: "Railways", avg_cost_overrun_pct: 22.8, avg_delay_months: 26.3, benchmark_efficiency_score: 74.5 },
  { sector: "Electricity Generation", avg_cost_overrun_pct: 11.5, avg_delay_months: 12.0, benchmark_efficiency_score: 88.0 },
  { sector: "Transmission & Distribution", avg_cost_overrun_pct: 8.7, avg_delay_months: 9.4, benchmark_efficiency_score: 91.2 },
  { sector: "Coal", avg_cost_overrun_pct: 19.3, avg_delay_months: 21.0, benchmark_efficiency_score: 76.8 },
  { sector: "Oil & Gas", avg_cost_overrun_pct: 15.4, avg_delay_months: 16.2, benchmark_efficiency_score: 83.4 },
  { sector: "Water Resources", avg_cost_overrun_pct: 28.6, avg_delay_months: 34.0, benchmark_efficiency_score: 68.0 },
  { sector: "Urban Public Transport", avg_cost_overrun_pct: 17.1, avg_delay_months: 19.8, benchmark_efficiency_score: 80.5 }
];

export const FALLBACK_AGENCY_RANKINGS = [
  { agency: "NHAI", total_projects: 420, on_time_projects: 310, delayed_projects: 110, delay_frequency_pct: 26.2, performance_score: 84.5 },
  { agency: "DFCCIL", total_projects: 42, on_time_projects: 24, delayed_projects: 18, delay_frequency_pct: 42.8, performance_score: 71.0 },
  { agency: "PGCIL", total_projects: 95, on_time_projects: 88, delayed_projects: 7, delay_frequency_pct: 7.4, performance_score: 94.2 },
  { agency: "NTPC", total_projects: 86, on_time_projects: 74, delayed_projects: 12, delay_frequency_pct: 13.9, performance_score: 91.0 },
  { agency: "PPA", total_projects: 18, on_time_projects: 6, delayed_projects: 12, delay_frequency_pct: 66.7, performance_score: 58.0 },
  { agency: "GAIL", total_projects: 34, on_time_projects: 29, delayed_projects: 5, delay_frequency_pct: 14.7, performance_score: 89.2 },
  { agency: "SECL", total_projects: 28, on_time_projects: 19, delayed_projects: 9, delay_frequency_pct: 32.1, performance_score: 79.5 },
  { agency: "BMRCL", total_projects: 16, on_time_projects: 9, delayed_projects: 7, delay_frequency_pct: 43.8, performance_score: 72.0 }
];

export const FALLBACK_ALERTS = [
  {
    id: 1,
    project_id: 2,
    project_code: "RLY-504",
    alert_type: "Cost Escalation",
    trigger_reason: "Cost overrun of 31.8% exceeds 15% threshold",
    severity: "Critical",
    status: "Open",
    recommended_intervention: "Detailed Financial Audit and Re-budgeting Approval"
  },
  {
    id: 2,
    project_id: 5,
    project_code: "WTR-209",
    alert_type: "Progress Discrepancy",
    trigger_reason: "Financial progress (68.0%) exceeds physical progress (42.0%) by >15%",
    severity: "Warning",
    status: "Open",
    recommended_intervention: "Mandatory Field Inspection & Joint Review"
  },
  {
    id: 3,
    project_id: 9,
    project_code: "HLT-105",
    alert_type: "Stalled Project",
    trigger_reason: "Physical progress is only 31.0% despite 24 months elapsed",
    severity: "Critical",
    status: "Open",
    recommended_intervention: "Issue Show-Cause Notice to Agency"
  }
];
