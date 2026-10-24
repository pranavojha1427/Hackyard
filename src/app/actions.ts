"use server";

import { createClient } from "@/utils/supabase/server";
import { getMongoProjects } from "@/lib/project-store";

import { FALLBACK_PROJECTS } from "@/lib/fallback-data";

export async function getAIHealthScores() {
  let projects: any[] = [];

  function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))
    ]);
  }

  try {
    const supabase = await createClient();
    const pageSize = 1000;
    const estimatedTotal = 3000;
    const pages = Math.ceil(estimatedTotal / pageSize);
    
    const promises = Array.from({ length: pages }).map((_, page) => 
      supabase
        .from("projects")
        .select("id, original_cost, revised_cost, cumulative_expenditure, physical_progress, sector, agency, state, land_acquisition_issue, forest_clearance_issue, contractor_delay, burn_rate_6m, phys_burn_rate_6m")
        .range(page * pageSize, (page + 1) * pageSize - 1)
    );

    const [results, mongoProjects] = await withTimeout(
      Promise.all([
        Promise.all(promises.map(p => Promise.resolve(p).catch(() => ({ data: null })))),
        getMongoProjects().catch(() => [])
      ]),
      800,
      [[], []]
    );

    for (const res of results) {
      if (res?.data) projects.push(...res.data);
    }

    if (mongoProjects && mongoProjects.length > 0) {
      projects = [...projects, ...mongoProjects.map((p: any) => ({ ...p, id: p._id.toString() }))];
    }
  } catch (err) {
    console.warn("Notice: Using fallback projects for AI Health evaluation");
  }

  // If Supabase returned no data, use the 1,981 seed projects
  if (projects.length === 0) {
    projects = [...FALLBACK_PROJECTS];
  }

  const scores: Record<string, any> = {};

  projects.forEach((data) => {
    const original_cost = Number(data.original_cost) || 0;
    const revised_cost = Number(data.revised_cost) || (original_cost > 0 ? original_cost : 0);
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
    if (overall_health === "Critical" || overall_health === "At Risk") {
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
    } else {
      shap_explanations.push(`Cost and progress metrics are within normal operational limits -> Favorable`);
    }

    scores[data.id] = {
      overall_health,
      recommendation,
      SHAP_Explanation: shap_explanations,
      cost_overrun_score: cost_overrun_score.toFixed(0),
      schedule_risk_score: schedule_risk_score.toFixed(0)
    };
  });

  // Optional external Python ML API call with strict 1s abort signal (if configured)
  if (process.env.ML_API_URL) {
    try {
      const pythonPayload = {
        projects: projects.slice(0, 100).map(p => ({
          project_id: p.id.toString(),
          original_cost: Number(p.original_cost) || 0,
          revised_cost: Number(p.revised_cost) || 0,
          physical_progress: Number(p.physical_progress) || 0
        }))
      };

      const res = await fetch(`${process.env.ML_API_URL}/api/ml/shap-bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pythonPayload),
        signal: AbortSignal.timeout(1000)
      });
      
      if (res.ok) {
        const mlResults = await res.json();
        for (const pid of Object.keys(mlResults)) {
          if (scores[pid]) {
            scores[pid].SHAP_Explanation = [ mlResults[pid].natural_language_explanation ];
          }
        }
      }
    } catch (e) {
      // Graceful fallback to local MoSPI calculations
    }
  }

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
