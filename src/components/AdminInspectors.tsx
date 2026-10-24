"use client";

import { useState, useEffect } from "react";
import { UserPlus, Shield, Loader2, MapPin, Briefcase, Phone, Hash } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { BRICS_STATES } from "@/lib/constants";

export default function AdminInspectors({ currentUser }: { currentUser?: any }) {
  const [inspectors, setInspectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [experience, setExperience] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState(currentUser?.state || "West Bengal");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchInspectors();
  }, []);

  const fetchInspectors = async () => {
    let query = supabase.from('inspectors').select('*').order('created_at', { ascending: false });
    if (currentUser?.role === 'state_admin' && currentUser?.state) {
        query = query.eq('state', currentUser.state);
    }
    const { data } = await query;
    if (data) setInspectors(data);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const { error } = await supabase.from('inspectors').insert({
      name,
      age: parseInt(age),
      experience_years: parseInt(experience),
      phone,
      state,
      password
    });
    setCreating(false);
    if (error) {
      alert("Failed to create inspector: " + error.message);
    } else {
      alert("Inspector created successfully.");
      setName(""); setAge(""); setExperience(""); setPhone(""); setPassword("");
      fetchInspectors();
    }
  };

  return (
    <div className="p-6 bg-slate-50 border border-slate-200">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold font-serif text-slate-800">Field Inspectors</h2>
          <p className="text-slate-500 text-sm mt-1">Manage state-level infrastructure inspectors.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-6 rounded border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4 flex items-center"><UserPlus className="w-5 h-5 mr-2 text-indigo-600"/> Add New Inspector</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div><label className="text-xs text-slate-500 uppercase font-semibold">Name</label><input type="text" required value={name} onChange={e=>setName(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" /></div>
            <div className="flex gap-4">
              <div className="w-1/2"><label className="text-xs text-slate-500 uppercase font-semibold">Age</label><input type="number" required value={age} onChange={e=>setAge(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" /></div>
              <div className="w-1/2"><label className="text-xs text-slate-500 uppercase font-semibold">Experience (Yrs)</label><input type="number" required value={experience} onChange={e=>setExperience(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" /></div>
            </div>
            <div>
              <label className="text-xs text-slate-500 uppercase font-semibold">State</label>
              <select value={state} onChange={e=>setState(e.target.value)} disabled={currentUser?.role === "state_admin"} className="w-full mt-1 p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none bg-white disabled:bg-slate-100 disabled:text-slate-500">
                {((currentUser?.country && BRICS_STATES[currentUser.country]) || BRICS_STATES["India"]).map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="text-xs text-slate-500 uppercase font-semibold">Phone No (Login ID)</label><input type="tel" required value={phone} onChange={e=>setPhone(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" /></div>
            <div><label className="text-xs text-slate-500 uppercase font-semibold">Password</label><input type="text" required value={password} onChange={e=>setPassword(e.target.value)} className="w-full mt-1 p-2 border border-slate-300 rounded focus:border-indigo-500 outline-none" /></div>
            
            <button disabled={creating} type="submit" className="w-full bg-indigo-600 text-white font-semibold p-2 rounded hover:bg-indigo-700 transition flex items-center justify-center">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Inspector"}
            </button>
          </form>
        </div>

        <div className="md:col-span-2">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>
          ) : inspectors.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded">No inspectors registered yet.</div>
          ) : (
            <div className="bg-white border border-slate-200 rounded shadow-sm overflow-x-auto overflow-y-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <th className="p-4 font-semibold">Inspector Details</th>
                    <th className="p-4 font-semibold">Experience</th>
                    <th className="p-4 font-semibold">State / Location</th>
                    <th className="p-4 font-semibold">Credentials</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectors.map(ins => (
                    <tr key={ins.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-semibold text-slate-800">{ins.name}</div>
                        <div className="text-xs text-slate-500 mt-1">Age {ins.age}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-slate-700"><Briefcase className="w-4 h-4 mr-2 text-indigo-500" /> {ins.experience_years} Years</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center text-slate-700 font-medium"><MapPin className="w-4 h-4 mr-2 text-emerald-500" /> {ins.state}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-slate-600 font-mono"><Phone className="w-3 h-3 inline mr-1" /> {ins.phone}</div>
                        <div className="text-xs text-slate-500 font-mono mt-1"><Hash className="w-3 h-3 inline mr-1" /> {ins.password}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
