"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BenchmarksDashboard } from "@/components/BenchmarksDashboard";

type AgencyRow = {
  agency: string;
  total_projects: number;
  delayed_project_count: number;
  delay_frequency_pct: number;
  avg_cost_overrun_pct: number;
};

type Project = {
  id: string;
  project_name: string;
  sector: string;
  cost_overrun_pct: number;
  expenditure_progress_pct: number;
  physical_progress: number;
};

type Benchmark = {
  sector: string;
  avg_cost_overrun_pct: number;
  avg_expenditure_progress_pct: number;
  avg_physical_progress: number;
};

type Alert = {
  id: number;
  project_id: number;
  project_code: string;
  alert_type: string;
  trigger_reason: string;
  severity: string;
  status: string;
  assigned_to: string;
  created_at: string;
  recommended_intervention: string;
};

type Props = {
  activeTab: string;
  agencyData: AgencyRow[];
  projects: Project[];
  benchmarks: Benchmark[];
  alerts: Alert[];
};

export function AnalyticsTabs({ activeTab, agencyData, projects, benchmarks, alerts }: Props) {
  return (
    <div>
      {activeTab === "agency" && <AgencyTab data={agencyData} />}
      {activeTab === "benchmarks" && <BenchmarksTab projects={projects} benchmarks={benchmarks} />}
      {activeTab === "risk" && <RiskPredictionTab />}
      {activeTab === "alerts" && <AlertsTab alerts={alerts} />}
    </div>
  );
}

/* ─── Agency Leaderboard Tab ─── */
function AgencyTab({ data }: { data: AgencyRow[] }) {
  return (
    <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
      <CardHeader>
        <CardTitle className="font-mono uppercase tracking-wide border-b border-slate-200 pb-2">
          Agency Performance Rankings
        </CardTitle>
        <p className="text-slate-600 text-sm mt-1">
          Agencies sorted by best performance (lowest delay frequency). Rows highlighted in red indicate agencies with &gt;40% delayed projects.
        </p>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table className="w-full min-w-[1000px]">
          <TableHeader>
            <TableRow className="border-slate-200 hover:bg-slate-200/50">
              <TableHead className="font-mono text-slate-600">#</TableHead>
              <TableHead className="font-mono text-slate-600">Agency</TableHead>
              <TableHead className="font-mono text-slate-600 text-right">Total Projects</TableHead>
              <TableHead className="font-mono text-slate-600 text-right">Delayed Count</TableHead>
              <TableHead className="font-mono text-slate-600 text-right">Delay Frequency (%)</TableHead>
              <TableHead className="font-mono text-slate-600 text-right">Avg Cost Overrun (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((agency, index) => {
              const isHighDelay = agency.delay_frequency_pct > 40;
              return (
                <TableRow
                  key={index}
                  className={`border-slate-200 ${isHighDelay ? "bg-red-50 hover:bg-red-100" : "hover:bg-slate-200/50"}`}
                >
                  <TableCell className="text-slate-500 font-mono">{index + 1}</TableCell>
                  <TableCell className="font-medium text-slate-800">
                    {agency.agency}
                    {isHighDelay && (
                      <Badge variant="destructive" className="ml-2 text-[10px] uppercase">
                        Warning
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-slate-700">{agency.total_projects}</TableCell>
                  <TableCell className="text-right text-slate-700">{agency.delayed_project_count}</TableCell>
                  <TableCell className={`text-right ${isHighDelay ? "text-red-600 font-bold" : "text-slate-700"}`}>
                    {agency.delay_frequency_pct}%
                  </TableCell>
                  <TableCell className="text-right text-slate-700">{agency.avg_cost_overrun_pct}%</TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  No agency data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ─── Benchmarks Tab ─── */
function BenchmarksTab({ projects, benchmarks }: { projects: Project[]; benchmarks: Benchmark[] }) {
  return (
    <div className="bg-slate-50 rounded-lg p-6 text-slate-900">
      <BenchmarksDashboard projects={projects} benchmarks={benchmarks} />
    </div>
  );
}

/* ─── Risk Prediction Tab ─── */
function RiskPredictionTab() {
  const [formData, setFormData] = useState({
    original_cost: "",
    revised_cost: "",
    expenditure: "",
    physical_progress: "",
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/v1/predict-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: "demo",
          original_cost: parseFloat(formData.original_cost),
          revised_cost: parseFloat(formData.revised_cost),
          cumulative_expenditure: parseFloat(formData.expenditure),
          physical_progress: parseFloat(formData.physical_progress),
          sector: "Others",
          state: "Unknown",
          land_acquisition_issue: 0,
          forest_clearance_issue: 0,
          contractor_delay: 0
        }),
        signal: AbortSignal.timeout(2000),
      });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to connect to prediction service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Input Form */}
      <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-wide border-b border-slate-200 pb-2">
            Project Risk Predictor
          </CardTitle>
          <p className="text-slate-600 text-sm mt-1">
            Enter project financials to predict risk using the ML model.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: "original_cost", label: "Original Cost (₹ Cr)", placeholder: "e.g. 1500" },
              { name: "revised_cost", label: "Revised Cost (₹ Cr)", placeholder: "e.g. 2100" },
              { name: "expenditure", label: "Cumulative Expenditure (₹ Cr)", placeholder: "e.g. 800" },
              { name: "physical_progress", label: "Physical Progress (%)", placeholder: "e.g. 45" },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-mono text-slate-600 mb-1">{field.label}</label>
                <input
                  type="number"
                  step="any"
                  name={field.name}
                  value={formData[field.name as keyof typeof formData]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  required
                  className="w-full bg-slate-200 border border-slate-300 rounded px-3 py-2 text-slate-900 font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-mono uppercase tracking-wide py-3 rounded transition-colors"
            >
              {loading ? "Analyzing..." : "Predict Risk"}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-red-700 text-sm font-mono">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Result Card */}
      <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-wide border-b border-slate-200 pb-2">
            Prediction Result
          </CardTitle>
        </CardHeader>
        <CardContent>
          {result ? (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className={`text-6xl font-black ${
                  (result.predictions?.predicted_cost_overrun_pct > 15) ? "text-red-500" :
                  (result.predictions?.predicted_cost_overrun_pct > 5) ? "text-amber-500" : "text-emerald-500"
                }`}>
                  {result.predictions?.predicted_cost_overrun_pct?.toFixed(1) ?? "N/A"}%
                </div>
                <Badge
                  variant={result.predictions?.predicted_cost_overrun_pct > 15 ? "destructive" : "default"}
                  className="mt-2 text-sm uppercase"
                >
                  {result.predictions?.predicted_cost_overrun_pct > 15 ? "Critical" : result.predictions?.predicted_cost_overrun_pct > 5 ? "At Risk" : "On Track"}
                </Badge>
                <p className="text-slate-600 text-sm mt-2 font-mono">
                  Cost Overrun Prediction
                </p>
                <p className="text-slate-600 text-sm mt-1 font-mono">
                  Est. Delay: {result.predictions?.predicted_time_overrun_months?.toFixed(1)} months
                </p>
              </div>
              {result.shap_attribution?.top_cost_drivers && (
                <div>
                  <h4 className="text-sm font-mono text-slate-600 uppercase mb-2">Key Risk Drivers (SHAP)</h4>
                  <ul className="space-y-2">
                    {Object.entries(result.shap_attribution.top_cost_drivers).map(([driver, impact], i) => (
                      <li key={i} className="text-sm text-slate-700 bg-slate-200 p-3 rounded border border-slate-300 flex justify-between">
                        <span>{driver}</span>
                        <span className="font-mono text-red-500">{(impact as number) > 0 ? "+" : ""}{(impact as number).toFixed(2)}% impact</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-600 font-mono text-sm">
              Submit a prediction to see results
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ─── Alerts & Actions Tab ─── */
function AlertsTab({ alerts }: { alerts: Alert[] }) {
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden">
        <CardHeader>
          <CardTitle className="font-mono uppercase tracking-wide border-b border-slate-200 pb-2">
            Early Warning Alerts
          </CardTitle>
          <p className="text-slate-600 text-sm mt-1">
            {alerts.length} alerts generated. Click a row for details.
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <div className="max-h-[600px] overflow-y-auto">
            <Table className="w-full min-w-[1000px]">
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow className="border-slate-200 hover:bg-slate-200/50">
                  <TableHead className="font-mono text-slate-600">ID</TableHead>
                  <TableHead className="font-mono text-slate-600">Project Code</TableHead>
                  <TableHead className="font-mono text-slate-600">Type</TableHead>
                  <TableHead className="font-mono text-slate-600">Severity</TableHead>
                  <TableHead className="font-mono text-slate-600">Trigger Reason</TableHead>
                  <TableHead className="font-mono text-slate-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow
                    key={alert.id}
                    className="border-slate-200 hover:bg-slate-200/50 cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <TableCell className="text-slate-500 font-mono">{alert.id}</TableCell>
                    <TableCell className="text-slate-700 font-mono">{alert.project_code || alert.project_id}</TableCell>
                    <TableCell className="text-slate-700">{alert.alert_type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={alert.severity === "High" || alert.severity === "Critical" ? "destructive" : "default"}
                        className="text-[10px] uppercase"
                      >
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 max-w-sm truncate">{alert.trigger_reason}</TableCell>
                    <TableCell>
                      <Badge
                        variant={alert.status === "Open" ? "destructive" : "default"}
                        className="text-[10px] uppercase"
                      >
                        {alert.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {alerts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                      No alerts found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Alert Detail Panel */}
      {selectedAlert && (
        <Card className="bg-white border-slate-200 rounded-none border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-mono uppercase tracking-wide">Alert Detail #{selectedAlert.id}</CardTitle>
            <button
              onClick={() => setSelectedAlert(null)}
              className="text-slate-500 hover:text-slate-700 font-mono text-sm"
            >
              ✕ Close
            </button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 font-mono">Project Code:</span>
                <span className="ml-2 text-slate-800">{selectedAlert.project_code || selectedAlert.project_id}</span>
              </div>
              <div>
                <span className="text-slate-500 font-mono">Type:</span>
                <span className="ml-2 text-slate-800">{selectedAlert.alert_type}</span>
              </div>
              <div>
                <span className="text-slate-500 font-mono">Severity:</span>
                <Badge
                  variant={selectedAlert.severity === "High" || selectedAlert.severity === "Critical" ? "destructive" : "default"}
                  className="ml-2 text-[10px] uppercase"
                >
                  {selectedAlert.severity}
                </Badge>
              </div>
              <div>
                <span className="text-slate-500 font-mono">Status:</span>
                <span className="ml-2 text-slate-800">{selectedAlert.status}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 font-mono">Trigger Reason:</span>
                <p className="mt-1 text-slate-800 bg-slate-200 p-3 rounded border border-slate-300">
                  {selectedAlert.trigger_reason}
                </p>
              </div>
              {selectedAlert.recommended_intervention && (
                <div className="col-span-2">
                  <span className="text-slate-500 font-mono">Recommended Intervention:</span>
                  <p className="mt-1 text-emerald-700 bg-slate-200 p-3 rounded border border-emerald-500">
                    {selectedAlert.recommended_intervention}
                  </p>
                </div>
              )}
              <div>
                <span className="text-slate-500 font-mono">Assigned To:</span>
                <span className="ml-2 text-slate-800">{selectedAlert.assigned_to || "Unassigned"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-mono">Created At:</span>
                <span className="ml-2 text-slate-800">
                  {new Date(selectedAlert.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

