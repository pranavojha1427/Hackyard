"use server";

import { createClient } from "@/utils/supabase/server";
import { getMongoProjects } from "@/lib/project-store";
import { FALLBACK_PROJECTS } from "@/lib/fallback-data";

let cachedHealthScores: { data: Record<string, any>; timestamp: number } | null = null;
const HEALTH_CACHE_TTL = 5 * 60 * 1000;

export async function getAIHealthScores() {
  if (cachedHealthScores && Date.now() - cachedHealthScores.timestamp < HEALTH_CACHE_TTL) {
    return cachedHealthScores.data;
  }
  const supabase = await createClient();
  let projects: any[] = [];
  try {
    // Fetch all projects using pagination IN PARALLEL to avoid timeouts
    const pageSize = 1000;
    const estimatedTotal = 12000;
    const pages = Math.ceil(estimatedTotal / pageSize);
    
    const promises = Array.from({ length: pages }).map((_, page) => 
      supabase
        .from("projects")
        .select("id, original_cost, revised_cost, cumulative_expenditure, physical_progress, sector, agency, state, land_acquisition_issue, forest_clearance_issue, contractor_delay, burn_rate_6m, phys_burn_rate_6m")
        .range(page * pageSize, (page + 1) * pageSize - 1)
    );

    const results = await Promise.all(promises);
    for (const res of results) {
      if (res.data) projects.push(...res.data);
    }
  } catch (err) {
    console.warn("Supabase fetch in actions:", err);
  }

  // Append MongoDB projects so custom proposals also get AI Health Scores
  const mongoProjects = await getMongoProjects().catch(e => { console.error("Mongo Error in actions:", e); return []; });
  if (mongoProjects && mongoProjects.length > 0) {
    projects = [...projects, ...mongoProjects.map(p => ({ ...p, id: p._id.toString() }))];
  }

  // If projects are still empty, use resilient seed fallback projects
  if (projects.length === 0 && FALLBACK_PROJECTS && FALLBACK_PROJECTS.length > 0) {
    projects = [...FALLBACK_PROJECTS];
  }

  const scores: Record<string, any> = {};

  projects.forEach((data) => {
      const original_cost = Number(data.original_cost) || 0;
      const revised_cost = Number(data.revised_cost) || 0;
      const expenditure = Number(data.cumulative_expenditure) || 0;
      const physical_progress = Number(data.physical_progress) || 0;

      const cost_escalation = revised_cost - original_cost;
      let cost_overrun_percent = 0.0;
      if (original_cost > 0) {
          cost_overrun_percent = (cost_escalation / original_cost) * 100;
      }
          
      let financial_progress = 0.0;
      if (revised_cost > 0) {
          financial_progress = (expenditure / revised_cost) * 100;
      }
          
      const implementation_discrepancy = physical_progress - financial_progress;
      
      const cost_overrun_score = Math.max(0.0, Math.min(100.0, cost_overrun_percent * 2));
      const schedule_risk_score = Math.max(0.0, Math.min(100.0, (100.0 - physical_progress) + Math.max(0.0, -implementation_discrepancy)));

      let overall_health = "On Track";
      let recommendation = "Maintain current monitoring protocols. Project execution velocity remains well-aligned with financial deployments, reflecting strong governance. Continue regular milestone tracking and ensure risk mitigation contingency funds remain available to sustain this operational momentum.";

      if (cost_overrun_percent > 10.0 && physical_progress < 50.0) {
          overall_health = "Critical";
          recommendation = "Trigger immediate financial scrutiny and halt further disbursements. Given the cost overrun exceeding 10% coupled with a physical progress below 50%, an exhaustive forensic audit is highly recommended to identify fund leakages and restructure timelines.";
      } else if (cost_overrun_score > 30.0 || schedule_risk_score > 50.0) {
          overall_health = "At Risk";
          recommendation = "Conduct a thorough review of the project execution plan immediately. With schedule and cost risk scores climbing, it is vital to mandate contractor performance metrics, expedite pending clearances, and streamline supply chains to prevent further delays.";
      }

      const shap_explanations: string[] = [];
      
      if (overall_health === "Critical") {
          if (cost_overrun_percent > 10.0) {
              shap_explanations.push(`Cost overrun is ${cost_overrun_percent.toFixed(1)}% -> High cost-risk contribution`);
          }
          if (physical_progress < 50.0) {
              shap_explanations.push(`Physical progress is ${physical_progress.toFixed(1)}% below plan -> High schedule-risk contribution`);
          }
          if (cost_escalation > 0) {
              shap_explanations.push(`Revised cost increased by ₹${cost_escalation.toFixed(1)} Cr -> Medium-high cost-risk contribution`);
          }
          if (implementation_discrepancy < -10) {
              shap_explanations.push(`Financial progress exceeds physical by ${(-implementation_discrepancy).toFixed(1)}% -> Fund diversion risk`);
          }
      }

      scores[data.id] = {
          overall_health,
          recommendation,
          SHAP_Explanation: shap_explanations,
          cost_overrun_score: cost_overrun_score.toFixed(0),
          schedule_risk_score: schedule_risk_score.toFixed(0)
      };
  });

  
  const pythonMLUrl = process.env.PYTHON_ML_URL;
  if (pythonMLUrl) {
    try {
      const pythonPayload = {
        projects: projects.map(p => ({
          project_id: p.id.toString(),
          original_cost: Number(p.original_cost) || 0,
          revised_cost: Number(p.revised_cost || p.original_cost) || 0,
          physical_progress: Number(p.physical_progress) || 0
        }))
      };

      const res = await fetch(`${pythonMLUrl.replace(/\/$/, "")}/api/ml/shap-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pythonPayload),
        signal: AbortSignal.timeout(2500)
      });
      
      if (res.ok) {
        const mlResults = await res.json();
        for (const pid of Object.keys(mlResults)) {
          if (scores[pid] && mlResults[pid]?.natural_language_explanation) {
            scores[pid].SHAP_Explanation = [ mlResults[pid].natural_language_explanation ];
          }
        }
      }
    } catch (e) {
      console.warn("External Python ML API optional sync skipped:", e);
    }
  }

  cachedHealthScores = {
    data: scores,
    timestamp: Date.now()
  };

  return scores;
}

export async function updateAlertStatus(alertId: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_alerts")
    .update({ status: "Escalated" })
    .eq("id", alertId);
    
  if (error) {
    console.error("Error updating alert status:", error);
    throw new Error(error.message);
  }
}
