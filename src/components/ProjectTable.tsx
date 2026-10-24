"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Sparkles, ShieldAlert } from "lucide-react"

export function ProjectTable({ projects }: { projects: any[] }) {
  const [selectedProject, setSelectedProject] = useState<any | null>(null)
  const [riskData, setRiskData] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleRowClick = async (p: any) => {
    setSelectedProject(p)
    setIsSheetOpen(true)
    setRiskData(null)
    setIsLoading(true)

    try {
      const res = await fetch(`/api/v1/predict-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_cost: p.original_cost || 0,
          revised_cost: p.revised_cost || 0,
          expenditure: p.cumulative_expenditure || 0,
          physical_progress: p.physical_progress || 0
        }),
        signal: AbortSignal.timeout(2000),
      })
      if (res.ok) {
        const data = await res.json()
        setRiskData(data)
      } else {
        console.error("Failed to fetch risk data")
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow className="border-slate-200 hover:bg-slate-50/50">
            <TableHead className="text-slate-600 font-mono py-4">Code</TableHead>
            <TableHead className="text-slate-600 font-mono py-4">Project Name</TableHead>
            <TableHead className="text-slate-600 font-mono py-4">Sector</TableHead>
            <TableHead className="text-slate-600 font-mono text-right py-4">Orig. Cost</TableHead>
            <TableHead className="text-slate-600 font-mono text-right py-4">Rev. Cost</TableHead>
            <TableHead className="text-slate-600 font-mono text-right py-4">Overrun %</TableHead>
            <TableHead className="text-slate-600 font-mono text-right py-4">Discrepancy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((p) => (
            <TableRow 
              key={p.id} 
              className="border-slate-200 hover:bg-slate-200/50 transition-colors cursor-pointer"
              onClick={() => handleRowClick(p)}
            >
              <TableCell className="font-mono text-xs text-slate-700">{p.project_code}</TableCell>
              <TableCell className="font-medium max-w-[300px] truncate text-slate-900" title={p.project_name}>{p.project_name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="border-slate-300 text-slate-700 font-mono rounded-none bg-slate-200/50">{p.sector}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-slate-700">{p.original_cost?.toFixed(2) || '-'}</TableCell>
              <TableCell className="text-right font-mono text-amber-500">{p.revised_cost?.toFixed(2) || '-'}</TableCell>
              <TableCell className="text-right font-mono">
                <span className={p.costOverrunPercent > 0 ? "text-red-500" : "text-slate-600"}>
                  {p.costOverrunPercent > 0 ? '+' : ''}{p.costOverrunPercent.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">
                <span className={Math.abs(p.implementationDiscrepancy) > 20 ? "text-red-500 font-bold" : "text-slate-600"}>
                  {p.implementationDiscrepancy > 0 ? '+' : ''}{p.implementationDiscrepancy.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-white border-l border-slate-200 text-slate-900 overflow-y-auto sm:max-w-lg w-full font-sans shadow-2xl p-6 sm:p-7">
          <SheetHeader className="border-b border-slate-100 pb-5 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Explainable AI Diagnostics
              </span>
            </div>
            <SheetTitle className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Project Risk & Health Report
            </SheetTitle>
            {selectedProject && (
              <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-900 text-white px-2.5 py-0.5 rounded-md">
                    {selectedProject.project_code}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {selectedProject.sector}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900 mt-2 line-clamp-2 leading-snug">
                  {selectedProject.project_name}
                </p>
              </div>
            )}
          </SheetHeader>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="font-mono text-xs text-slate-600 animate-pulse uppercase">Computing SHAP values...</p>
            </div>
          ) : riskData ? (
            <div className="space-y-6">
              
              {/* Overall Health Status */}
              <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Overall Health Status
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    riskData.overall_health === 'Critical' 
                      ? 'bg-rose-50 text-rose-700 border-rose-200' 
                      : riskData.overall_health === 'At Risk' 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${riskData.overall_health === 'Critical' ? 'bg-rose-500 animate-pulse' : riskData.overall_health === 'At Risk' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    {riskData.overall_health.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">
                  Multi-factor governance diagnosis based on schedule variances and budget execution.
                </p>
              </div>

              {/* AI Recommendation */}
              <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/50 to-white border border-indigo-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-indigo-950">
                    AI Executive Recommendation
                  </h3>
                </div>
                <p className="text-sm font-normal text-slate-800 leading-relaxed text-left">
                  {riskData.recommendation}
                </p>
              </div>

              {/* Critical Risk Factors (SHAP) */}
              {riskData.SHAP_Explanation && riskData.SHAP_Explanation.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                        Critical Risk Drivers (SHAP Analysis)
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">Impact</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {riskData.SHAP_Explanation.map((explanation: string, i: number) => {
                      const parts = explanation.split("->");
                      const factorName = parts[0]?.trim();
                      const impactBadge = parts[1]?.trim();
                      const isHigh = impactBadge?.toLowerCase().includes("high");
                      const isMedium = impactBadge?.toLowerCase().includes("medium");

                      return (
                        <div 
                          key={i} 
                          className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:border-slate-300 transition"
                        >
                          <span className="text-xs font-semibold text-slate-800 flex items-center gap-2 leading-snug">
                            <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                            {factorName}
                          </span>
                          {impactBadge && (
                            <span className={`text-xs font-bold px-3 py-1 rounded-lg border whitespace-nowrap text-center shrink-0 ${
                              isHigh 
                                ? "bg-rose-100 text-rose-800 border-rose-200" 
                                : isMedium 
                                  ? "bg-amber-100 text-amber-800 border-amber-200" 
                                  : "bg-blue-100 text-blue-800 border-blue-200"
                            }`}>
                              {impactBadge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Risk Scores with Visual Meters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Cost Overrun Score
                  </p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black text-slate-900">{riskData.cost_overrun_score}</span>
                    <span className="text-xs text-slate-400 font-bold">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        Number(riskData.cost_overrun_score) > 50 ? 'bg-rose-500' : Number(riskData.cost_overrun_score) > 20 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(Number(riskData.cost_overrun_score) || 0, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Schedule Delay Score
                  </p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-3xl font-black text-slate-900">{riskData.schedule_risk_score}</span>
                    <span className="text-xs text-slate-400 font-bold">/ 100</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-3">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        Number(riskData.schedule_risk_score) > 60 ? 'bg-rose-500' : Number(riskData.schedule_risk_score) > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(Number(riskData.schedule_risk_score) || 0, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-10 font-mono text-slate-500 text-sm">
              No data available.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
