"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ViewComplaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string>("All States");
  const [states, setStates] = useState<string[]>([]);

  useEffect(() => {
    async function fetchComplaints() {
      let data: any[] = [];
      try {
        const res = await fetch('/api/complaints');
        if (res.ok) {
          const json = await res.json();
          data = json.complaints || [];
        }
      } catch {
        // Fallback
      }

      if (data.length === 0) {
        const { data: sData } = await supabase
          .from('citizen_requests')
          .select('*')
          .order('created_at', { ascending: false });
        data = sData || [];
      }

      setComplaints(data);
      const staticStates = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];
      const dbStates = Array.from(new Set(data.map((d: any) => d.state).filter(Boolean)));
      const combined = Array.from(new Set([...staticStates, ...dbStates])).sort();
      setStates(["All States", ...combined]);
      setLoading(false);
    }
    fetchComplaints();
  }, []);

  const filteredComplaints = selectedState === "All States" 
    ? complaints 
    : complaints.filter(c => c.state === selectedState);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">View Complaints</h2>
          <p className="text-sm text-slate-500">Monitor citizen infrastructure demands across different regions.</p>
        </div>
        <select 
          className="border border-slate-300 rounded px-4 py-2 text-sm bg-white"
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
        >
          {states.map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-slate-500 animate-pulse text-center py-10">Loading complaints...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <th className="p-4 font-semibold w-1/6">Category / Ministry</th>
                <th className="p-4 font-semibold w-1/6">Citizen Name</th>
                <th className="p-4 font-semibold w-1/2">Complaint Description</th>
                <th className="p-4 font-semibold">State</th>
                <th className="p-4 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No complaints found for the selected state.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c: any) => (
                  <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <div className="flex flex-wrap items-center gap-1 mb-1">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold inline-block">{c.infrastructure_category || 'Unknown'}</span>
                        {c.hotspot_id && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center">
                            ⚡ Hotspot Active
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{c.ministry || 'Unassigned'}</div>
                    </td>
                    <td className="p-4 text-slate-700 font-medium">{c.name || 'Anonymous'}</td>
                    <td className="p-4 text-slate-700">{c.translated_text || c.raw_text}</td>
                    <td className="p-4 text-slate-600">{c.state || 'Unknown'}</td>
                    <td className="p-4 text-slate-500">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
