"use client";

import { FormEvent, useState, useEffect } from "react";
import { BRICS_STATES } from "@/lib/constants";
import { CheckCircle2, AlertCircle, Loader2, UserCheck, ShieldCheck, Building2, MapPin } from "lucide-react";

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

export function AdminAccountManager({ currentUser }: { currentUser?: any }) {
  const isStateAdmin = currentUser?.role === "state_admin";
  const defaultRole = "State Admin";
  const availableRoles = ["State Admin", "Ministry", "Agency", "Engineer"];

  const [form, setForm] = useState({ name: "", email: "", password: "", role: defaultRole, ministry: "", agency: "", state: "", country: "India" });
  const STATES = BRICS_STATES["India"];
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [provisionedUsers, setProvisionedUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setProvisionedUsers(data.users);
        }
      }
    } catch (err) {
      console.warn("Could not fetch provisioned users:", err);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); 
    setLoading(true); 
    setSuccessMessage("");
    setErrorMessage("");
    
    const payload = { ...form, country: "India" };
    if (isStateAdmin && payload.role === "Ministry") {
        payload.state = currentUser.state;
    }

    try {
      const res = await fetch("/api/admin/users", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(payload) 
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to create account.");
      }
      setSuccessMessage(`Account successfully provisioned for ${form.email}. Temporary credentials are now active for login.`);
      setForm({ name: "", email: "", password: "", role: defaultRole, ministry: "", agency: "", state: "", country: "India" });
      await fetchUsers();
    } catch (e: any) { 
      setErrorMessage(e.message || "Failed to create account."); 
    }
    finally { 
      setLoading(false); 
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-xs">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h2 className="font-black text-xl uppercase tracking-tight text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" /> Platform User Provisioning
          </h2>
          <p className="text-xs font-mono text-slate-500 mt-1">
            ADMIN ONLY: PRIVILEGED ROLES AND REGIONAL ACCESS ARE PROVISIONED HERE
          </p>
        </div>
        
        {successMessage && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 text-emerald-800 text-sm font-semibold rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-300 text-rose-800 text-sm font-semibold rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-mono uppercase text-slate-600 block mb-1">Full Name</label>
            <input 
              required 
              type="text" 
              placeholder="e.g. Shrabasti Ghosh"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-sans outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              value={form.name} 
              onChange={e => setForm({...form, name: e.target.value})}
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate-600 block mb-1">Email</label>
            <input 
              required 
              type="email" 
              placeholder="e.g. officer@pragatipulse.gov.in"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-sans outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              value={form.email} 
              onChange={e => setForm({...form, email: e.target.value})}
            />
          </div>

          <div>
            <label className="text-xs font-mono uppercase text-slate-600 block mb-1">Temporary Password</label>
            <input 
              required 
              type="password" 
              minLength={8}
              placeholder="Minimum 8 characters"
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-sans outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              value={form.password} 
              onChange={e => setForm({...form, password: e.target.value})}
            />
          </div>
          
          <div>
            <label className="text-xs font-mono uppercase text-slate-600 block mb-1">Role</label>
            <select 
              className="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-sans bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
              value={form.role} 
              onChange={e => setForm({...form, role: e.target.value})}
            >
              {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {form.role === "Agency" && (
            <div className="col-span-1 md:col-span-2">
              <label className="text-xs font-mono uppercase text-slate-600 block mb-1">Agency / Company</label>
              <input 
                required 
                placeholder="e.g. L&T Construction"
                className="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-sans outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                value={form.agency} 
                onChange={e => setForm({...form, agency: e.target.value})}
              />
            </div>
          )}

          {form.role === "State Admin" && (
            <div className="col-span-1 md:col-span-2">
              <label className="text-xs font-mono uppercase text-slate-600 block mb-1">State Assignment</label>
              <select 
                required 
                className="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-sans bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                value={form.state} 
                onChange={e => setForm({...form, state: e.target.value})}
              >
                <option value="" disabled>Select State</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          {form.role === "Ministry" && (
            <div className="col-span-1 md:col-span-2">
              <label className="text-xs font-mono uppercase text-slate-600 block mb-1">Ministry / Department</label>
              <select 
                required 
                className="w-full border border-slate-300 p-2.5 rounded-lg text-sm font-sans bg-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                value={form.ministry} 
                onChange={e => setForm({...form, ministry: e.target.value})}
              >
                <option value="" disabled>Select Ministry / Department</option>
                {MINISTRIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {form.role === "Ministry" && isStateAdmin && (
              <div className="col-span-1 md:col-span-2 mt-1 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 flex items-center">
                  This ministry account will automatically be tied to your state: <strong>&nbsp;{currentUser.state}</strong>.
              </div>
          )}

          <div className="col-span-1 md:col-span-2 pt-2">
            <button 
              type="submit" 
              disabled={loading} 
              className="px-6 py-3 bg-slate-900 text-white font-semibold uppercase text-xs tracking-wider rounded-lg hover:bg-slate-800 disabled:opacity-50 w-full md:w-auto flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Provisioning...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Provisioned Accounts Table */}
      {provisionedUsers.length > 0 && (
        <div className="bg-white border-2 border-slate-200 p-6 rounded-xl shadow-xs">
          <h3 className="font-bold text-sm uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" /> Active Provisioned Platform Users ({provisionedUsers.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="p-3 font-semibold">Name</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Role</th>
                  <th className="p-3 font-semibold">Jurisdiction / State</th>
                  <th className="p-3 font-semibold">Date Created</th>
                </tr>
              </thead>
              <tbody>
                {provisionedUsers.map((u) => (
                  <tr key={u._id || u.email} className="border-b border-slate-100 hover:bg-slate-50/80">
                    <td className="p-3 font-medium text-slate-800">{u.name}</td>
                    <td className="p-3 font-mono text-slate-600">{u.email}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 text-[10px] uppercase">
                        {(u.role || "").replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">
                      {u.state ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-rose-500" /> {u.state}
                        </span>
                      ) : u.ministry ? (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-indigo-500" /> {u.ministry}
                        </span>
                      ) : (
                        "National"
                      )}
                    </td>
                    <td className="p-3 text-slate-400">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
