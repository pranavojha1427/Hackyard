import fs from "node:fs";
import path from "node:path";
import { extractAgency } from "./agency-extractor";
export { extractAgency };

let seedProjects: any[] = [];
try {
  const filePath = path.join(process.cwd(), "projects_seed.json");
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      seedProjects = parsed.map((p, index) => {
        const agency = extractAgency(p.project_name, p.sector, p.agency);
        return {
          ...p,
          id: p.id || p.project_code || index + 1,
          agency,
          original_cost: Number(p.original_cost) || 0,
          revised_cost: Number(p.revised_cost ?? p.original_cost) || 0,
          cumulative_expenditure: Number(p.cumulative_expenditure) || 0,
          physical_progress: Number(p.physical_progress) || 0,
          status: p.status || "Ongoing"
        };
      });
    }
  }
} catch (e) {
  console.error("Failed to load projects_seed.json:", e);
}

export const FALLBACK_PROJECTS = seedProjects;


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

export { FALLBACK_AGENCY_RANKINGS } from "./agency-extractor";

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
