"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { UploadCloud, CheckCircle, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function InvestmentParity({ projects }: { projects: any[] }) {
  const [isUploading, setIsUploading] = useState(false);
  const [hasUploaded, setHasUploaded] = useState(false);
  
  // Aggregate current active project costs by sector (live database data)
  const activeCostsBySector = projects.reduce((acc: Record<string, number>, p: any) => {
    if (p.is_completed) return acc;
    const sector = p.sector || "Others";
    if (!acc[sector]) acc[sector] = 0;
    acc[sector] += (p.revised_cost || p.original_cost || 0);
    return acc;
  }, {} as Record<string, number>);

  // Mock macro budget extracted from "uploaded PDF"
  const macroBudgets: Record<string, number> = {
    "Roads & Highways": 500000,
    "Railways": 250000,
    "Water Resources": 100000,
    "Electricity Generation": 120000,
    "Oil & Gas": 80000,
    "Healthcare": 40000,
    "Education": 30000,
    "Urban Public Transport": 95000
  };

  const chartData = Object.keys(macroBudgets).map(sector => ({
    name: sector,
    allocatedBudget: macroBudgets[sector],
    activeProjectCosts: activeCostsBySector[sector] || 0,
    variance: macroBudgets[sector] - (activeCostsBySector[sector] || 0),
    isOverBudget: (activeCostsBySector[sector] || 0) > macroBudgets[sector]
  })).sort((a, b) => b.allocatedBudget - a.allocatedBudget);

  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", "MACRO_PLAN");
    // We send a sum of all active project costs as our "expected cost" to the backend
    const totalActiveCost = Object.values(activeCostsBySector).reduce((a, b) => a + b, 0);
    formData.append("expected_cost", String(totalActiveCost));
    
    try {
      const res = await fetch("https://helping-affiliation-las-weekends.trycloudflare.com/api/parity/analyze", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (e) {
      console.error(e);
      // Fallback in case python server is down
      setAnalysisResult({ error: "Backend server unreachable. Using fallback macro data." });
    }
    
    setIsUploading(false);
    setHasUploaded(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-lg text-white">
        <div>
          <h2 className="text-2xl font-bold font-serif flex items-center"><FileText className="mr-2" /> PDF Parity Gatekeeper</h2>
          <p className="text-slate-300 text-sm mt-1">Cross-reference live project costs with official 5-Year Macro Budget Plans to prevent overspending.</p>
        </div>
        {!hasUploaded && !isUploading && (
          <label className="bg-indigo-500 hover:bg-indigo-600 px-4 py-2 rounded text-sm font-semibold flex items-center transition cursor-pointer">
            <UploadCloud className="w-4 h-4 mr-2" /> Upload Budget PDF
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
          </label>
        )}
        {isUploading && (
          <div className="flex items-center text-indigo-300 font-mono text-sm">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Extracting Macro Values...
          </div>
        )}
        {hasUploaded && (
          <div className="flex items-center text-emerald-400 font-mono text-sm border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 rounded">
            <CheckCircle className="w-4 h-4 mr-2" /> Budget Plan Indexed
          </div>
        )}
      </div>

      {!hasUploaded && !isUploading ? (
        <Card className="border-dashed border-2 border-slate-300 bg-slate-50">
          <CardContent className="flex flex-col items-center justify-center h-64 text-slate-500">
            <UploadCloud className="w-12 h-12 mb-4 text-slate-400" />
            <p>Upload a national or state investment plan (PDF/CSV) to initialize parity checks.</p>
          </CardContent>
        </Card>
      ) : hasUploaded ? (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {analysisResult && (
            <div className={`p-4 rounded-md border ${analysisResult.error || analysisResult.discrepancy ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
              <div className="flex items-start">
                {analysisResult.error || analysisResult.discrepancy ? <AlertCircle className="w-5 h-5 mr-3 mt-0.5" /> : <CheckCircle className="w-5 h-5 mr-3 mt-0.5" />}
                <div>
                  <h3 className="font-bold text-sm">Python Backend PDF Analysis</h3>
                  <p className="text-sm mt-1">{analysisResult.error ? analysisResult.error : analysisResult.message}</p>
                  {analysisResult.detected_cost && (
                    <p className="text-xs font-mono mt-2 bg-white/50 inline-block px-2 py-1 rounded">Extracted Cost: ₹{Math.round(analysisResult.detected_cost).toLocaleString()} Cr vs DB Expected: ₹{Math.round(analysisResult.expected_cost).toLocaleString()} Cr</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {chartData.slice(0, 3).map(d => (
              <Card key={d.name} className={`border-l-4 ${d.isOverBudget ? 'border-red-500 bg-red-50' : 'border-emerald-500'}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-slate-700 uppercase tracking-wide">{d.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-xs text-slate-500 font-mono">Allocated (PDF)</p>
                      <p className="text-xl font-bold text-slate-800">₹{d.allocatedBudget.toLocaleString()} Cr</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-mono">Tracked (Live DB)</p>
                      <p className={`text-xl font-bold ${d.isOverBudget ? 'text-red-600' : 'text-slate-800'}`}>₹{Math.round(d.activeProjectCosts).toLocaleString()} Cr</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${d.isOverBudget ? 'bg-red-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(100, (d.activeProjectCosts / d.allocatedBudget) * 100)}%` }}
                    />
                  </div>
                  {d.isOverBudget && (
                     <p className="text-xs text-red-600 mt-2 font-mono flex items-center">
                       <AlertCircle className="w-3 h-3 mr-1" /> Budget exceeded by ₹{Math.abs(d.variance).toLocaleString()} Cr!
                     </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-mono text-sm uppercase">Sector Variance Analysis (Tracked vs Allocated)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()} Cr`]}
                      contentStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontFamily: 'monospace', fontSize: '12px' }} />
                    <Bar dataKey="allocatedBudget" name="Allocated (PDF)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="activeProjectCosts" name="Live Tracked Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
