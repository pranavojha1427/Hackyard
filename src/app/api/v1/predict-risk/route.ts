import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const original_cost = Number(data.original_cost) || 0;
    const revised_cost = Number(data.revised_cost) || 0;
    const expenditure = Number(data.expenditure) || 0;
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
    let recommendation = "Continue monitoring.";

    if (cost_overrun_percent > 10.0 && physical_progress < 50.0) {
        overall_health = "Critical";
        recommendation = "Trigger financial scrutiny";
    } else if (cost_overrun_score > 30.0 || schedule_risk_score > 50.0) {
        overall_health = "At Risk";
        recommendation = "Review project execution plan and address delays.";
    }

    
    let shap_explanations: string[] = [];
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

    if (process.env.ML_API_URL) {
      try {
        const res = await fetch(`${process.env.ML_API_URL}/api/ml/shap`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_id: data.project_id || "test",
            original_cost: original_cost,
            revised_cost: revised_cost,
            physical_progress: physical_progress
          }),
          signal: AbortSignal.timeout(1000)
        });
        if (res.ok) {
          const mlData = await res.json();
          if (mlData.natural_language_explanation) {
            shap_explanations = [ mlData.natural_language_explanation ];
          }
        }
      } catch (e) {
        // Fallback to local SHAP explanations
      }
    }


    return NextResponse.json({
      project_id: data.project_id,
      predictions: {
          predicted_cost_overrun_pct: Number(cost_overrun_percent.toFixed(2)),
          predicted_time_overrun_months: Number((schedule_risk_score / 2).toFixed(2)) // mock
      },
      shap_attribution: {
          top_cost_drivers: {},
          top_time_drivers: {}
      },
      rule_based: {
          cost_overrun_score: Number(cost_overrun_score.toFixed(2)),
          schedule_risk_score: Number(schedule_risk_score.toFixed(2)),
          overall_health: overall_health,
          recommendation: recommendation,
          cost_escalation_crores: Number(cost_escalation.toFixed(2)),
          cost_overrun_percentage: Number(cost_overrun_percent.toFixed(2)),
          implementation_discrepancy_percentage: Number(implementation_discrepancy.toFixed(2)),
          SHAP_Explanation: shap_explanations
      }
    });
  } catch (error: any) {
    console.error("Predict error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
