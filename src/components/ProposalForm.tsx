
"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { BRICS_STATES, COUNTRIES } from "@/lib/constants";

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

export function ProposalForm({ currentUser, onSuccess }: any) {
  const [form, setForm] = useState({ project_code: "", project_name: "", sector: "Roads & Highways", ministry: currentUser?.role === "ministry" && currentUser?.ministry ? currentUser.ministry : "Department for Promotion of Industry & Internal Trade", state: "", expected_expenditure: "", start_date: "", end_date: "", details: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: any) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await fetch("/api/proposals", { method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to submit proposal.");
      } else {
        alert("Proposal submitted successfully!");
        if(onSuccess) onSuccess();
      }
    } catch {
      alert("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white p-8 border shadow-sm rounded-xl flex flex-col gap-6 max-w-4xl mx-auto mt-4 w-full">
      <h3 className="font-semibold text-xl border-b pb-2">Create New Project Proposal</h3>
      <div className="grid grid-cols-2 gap-6">
        
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Project Name</label>
          <input required placeholder="Project Name" className="border p-3 rounded-lg" onChange={e => setForm({...form, project_name: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Sector</label>
          <select required className="border p-3 rounded-lg bg-white" value={form.sector} onChange={e => setForm({...form, sector: e.target.value})}>
            <option value="" disabled>Select Sector</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Ministry / Department</label>
          <select required disabled={currentUser?.role === "ministry"} className={`border p-3 rounded-lg ${currentUser?.role === "ministry" ? "bg-slate-100 cursor-not-allowed text-slate-500" : "bg-white"}`} value={form.ministry} onChange={e => setForm({...form, ministry: e.target.value})}>
            <option value="" disabled>Select Ministry</option>
            {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">State</label>
          <select required className="border p-3 rounded-lg bg-white" value={form.state} onChange={e => setForm({...form, state: e.target.value})}>
            <option value="" disabled>Select State</option>
            {(BRICS_STATES[currentUser?.country] || BRICS_STATES['India']).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Expected Expenditure (Cr)</label>
          <input required type="number" placeholder="Expected Expenditure (Cr)" className="border p-3 rounded-lg" onChange={e => setForm({...form, expected_expenditure: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Start Date</label>
          <input required type="date" title="Start Date" className="border p-3 rounded-lg" onChange={e => setForm({...form, start_date: e.target.value})} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">End Date</label>
          <input required type="date" title="End Date" className="border p-3 rounded-lg" onChange={e => setForm({...form, end_date: e.target.value})} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold text-slate-500 uppercase">Project Implementation Details & Summary</label>
        <textarea required placeholder="Project Implementation Details & Summary" className="border p-3 rounded-lg h-32" onChange={e => setForm({...form, details: e.target.value})} />
      </div>
      <Button type="submit" className="py-6 text-lg" disabled={loading}>{loading ? "Submitting..." : "Submit Proposal"}</Button>
    </form>
  );
}

