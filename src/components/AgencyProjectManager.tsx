"use client";

import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { BRICS_STATES, COUNTRIES } from "@/lib/constants";

type Project = any;

const empty = {
  project_name: "", sector: "Roads & Highways", ministry: "", state: "",
  original_cost: "", revised_cost: "", cumulative_expenditure: "", physical_progress: "",
  land_acquisition_issue: false, forest_clearance_issue: false, contractor_delay: false,
};

const SECTORS = [
  "Aviation & Aviation Infrastructure", "Coal", "Construction", "Education", 
  "Electricity Generation", "Energy Storage", "Healthcare", "Inland Waterways", 
  "Logistics Infrastructure", "Metals & Mining", "Oil & Gas", "Railways", 
  "Real Estate", "Roads & Highways", "Shipping", "Steel", "Telecommunication", 
  "Tourism, Hospitality & Wellness", "Transmission & Distribution", 
  "Urban Public Transport", "Waste & Water", "Water Resources", "Others"
];



const MINISTRIES = [
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

export function AgencyProjectManager({ projects, agency }: { projects: Project[]; agency?: string }) {
  const [form, setForm] = useState<any>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  function edit(p: Project) {
    setIsCreating(false);
    setEditingId(String(p.id));
    setForm({ ...empty, ...p });
    setMessage("");
    setTimeout(() => {
      document.getElementById("modify-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function startCreate() {
    setEditingId(null);
    setIsCreating(true);
    setForm({ ...empty, project_code: `PRJ-${Date.now().toString().slice(-6)}` });
    setMessage("");
    setTimeout(() => {
      document.getElementById("modify-form")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function reset() { 
    setEditingId(null); 
    setIsCreating(false);
    setForm(empty);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setLoading(true); setMessage("");
    try {
      const endpoint = "/api/agency/projects";
      const method = isCreating ? "POST" : "PATCH";
      const payload = isCreating ? { ...form, agency } : { ...form, projectId: editingId };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setMessage(isCreating ? "New project added successfully!" : "Project update saved.");
      reset();
      setTimeout(() => window.location.reload(), 600);
    } catch (err: any) { setMessage(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-8">
      {/* Table section brought to the top */}
      <div className="bg-white border-2 border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex flex-wrap justify-between bg-slate-50 items-center gap-3">
          <div>
            <h3 className="font-mono uppercase font-bold text-slate-800">Projects owned by your agency</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Manage progress or commission extra projects</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 border rounded">{projects.length} PROJECTS</span>
            <button
              onClick={startCreate}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-mono uppercase font-bold rounded transition-colors shadow-sm"
            >
              + Add Extra Project
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white border-b border-slate-100">
              <tr>
                <th className="p-4 text-left font-mono text-xs text-slate-500">Code</th>
                <th className="p-4 text-left font-mono text-xs text-slate-500">Project</th>
                <th className="p-4 text-left font-mono text-xs text-slate-500">Sector</th>
                <th className="p-4 text-right font-mono text-xs text-slate-500">Progress</th>
                <th className="p-4 text-right font-mono text-xs text-slate-500">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.map((p: any) => (
                <tr key={String(p.id)} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono text-xs text-slate-600">{p.project_code}</td>
                  <td className="p-4 font-medium text-slate-800">{p.project_name}</td>
                  <td className="p-4 text-slate-600">{p.sector}</td>
                  <td className="p-4 text-right font-mono text-emerald-600 font-medium">{Number(p.physical_progress || 0).toFixed(1)}%</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => edit(p)} 
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono uppercase rounded transition-colors shadow-sm"
                    >
                      Modify
                    </button>
                  </td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No projects found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form section (Shown when Modify or Add Extra Project is clicked) */}
      {(editingId || isCreating) && (
        <div id="modify-form" className="bg-white border-2 border-blue-200 shadow-md p-8 rounded-xl animate-[popIn_0.2s_ease-out_forwards]">
          <style>{`
            @keyframes popIn {
              0% { opacity: 0; transform: translateY(-10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <div className="flex items-center justify-between gap-3 mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-black text-2xl uppercase text-slate-800">
                {isCreating ? "Commission Extra Project" : "Modify Project Details"}
              </h2>
              <p className="text-xs font-mono text-slate-500 mt-1">AGENCY / COMPANY: {agency || "Not assigned"}</p>
            </div>
            <button onClick={reset} className="text-sm font-mono text-slate-500 hover:text-slate-800 underline">
              {isCreating ? "Cancel" : "Cancel edit"}
            </button>
          </div>
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isCreating && (
              <label className="text-xs font-mono uppercase text-slate-600 flex flex-col gap-1.5">
                Project Code
                <input
                  type="text"
                  placeholder="e.g. PRJ-998877"
                  className="w-full border border-slate-300 p-2.5 rounded text-sm font-sans bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={form.project_code ?? ""}
                  onChange={e => set("project_code", e.target.value)}
                />
              </label>
            )}
            {[
              ["project_name","Project name","text"],
              ["sector","Sector","select"],
              ["ministry","Ministry / Department","select"],
              ["state","State(s)","select"],
              ["original_cost","Original cost (Cr)","number"],
              ["revised_cost","Revised cost (Cr)","number"],
              ["cumulative_expenditure","Cumulative expenditure (Cr)","number"],
              ["physical_progress","Physical progress (%)","number"]
            ].map(([key,label,type]) => (
              <label key={key} className="text-xs font-mono uppercase text-slate-600 flex flex-col gap-1.5">
                {label}
                {type === "select" ? (
                  <select required className="w-full border border-slate-300 p-2.5 rounded text-sm font-sans bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={form[key] ?? ""} onChange={e => set(key,e.target.value)}>
                    <option value="" disabled>Select {label}</option>
                    {(key === "sector" ? SECTORS : key === "ministry" ? MINISTRIES : BRICS_STATES['India']).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input required={key === "project_name"} type={type} step="any" className="w-full border border-slate-300 p-2.5 rounded text-sm font-sans bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={Number.isNaN(form[key]) ? "" : (form[key] ?? "")} onChange={e => set(key,e.target.value)} />
                )}
              </label>
            ))}
            <div className="col-span-full flex gap-4 mt-2">
              {[["land_acquisition_issue","Land acquisition issue"],["forest_clearance_issue","Forest clearance issue"],["contractor_delay","Contractor delay"]].map(([key,label]) => (
                <label key={key} className="flex items-center gap-2 text-xs font-mono uppercase text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={!!form[key]} onChange={e => set(key,e.target.checked)} /> {label}
                </label>
              ))}
            </div>
            <div className="md:col-span-2 lg:col-span-3 flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
              {message && <span className="text-sm font-mono text-green-600 font-bold">{message}</span>}
              <button disabled={loading} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded text-sm font-bold uppercase transition-colors disabled:opacity-50">
                <Save size={18}/> {loading ? "Saving..." : isCreating ? "Commission Project" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
