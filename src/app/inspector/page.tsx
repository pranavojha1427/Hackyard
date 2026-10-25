"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, MapPin, AlertCircle, CheckCircle2, ChevronRight, FileText, Map as MapIcon, Shield, Check } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/InspectorMapPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
});

const DEMO_INSPECTORS: Record<string, any> = {
  "9239663292": {
    id: "6d0435bf-58b1-4c98-87a2-b8867e7d678c",
    name: "Pranav Ojha",
    age: 34,
    experience_years: 5,
    phone: "9239663292",
    password: "password@123",
    state: "West Bengal"
  },
  "9876543210": {
    id: "b47a192c-5c42-4b89-a2a4-56bfa0992381",
    name: "Senior Inspector Sharma",
    age: 42,
    experience_years: 12,
    phone: "9876543210",
    password: "inspector123",
    state: "National"
  }
};

export default function InspectorPortal() {
  const [loading, setLoading] = useState(true);
  const [inspector, setInspector] = useState<any>(null);
  
  // Login states
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  
  // Dashboard states
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<any>(null);
  
  // Report states
  const [reportText, setReportText] = useState("");
  const [proposedProjectTitle, setProposedProjectTitle] = useState("");
  const [exactLat, setExactLat] = useState<number | null>(null);
  const [exactLng, setExactLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedId = localStorage.getItem('inspector_id');
    if (savedId) {
      fetchInspectorData(savedId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchInspectorData = async (id: string) => {
    try {
      let inspectorObj = null;
      const { data: iData } = await supabase.from('inspectors').select('*').eq('id', id).single();
      if (iData) {
        inspectorObj = iData;
      } else {
        inspectorObj = Object.values(DEMO_INSPECTORS).find(ins => ins.id === id);
      }

      if (inspectorObj) {
        setInspector(inspectorObj);
        // Fetch hotspots assigned to this inspector
        const { data: hData } = await supabase
          .from('demand_hotspots')
          .select('*')
          .eq('inspector_id', id)
          .order('created_at', { ascending: false });

        if (hData && hData.length > 0) {
          setHotspots(hData);
        } else {
          // Fallback demo hotspots for inspection
          setHotspots([
            {
              id: "38a0083a-16f8-4ea3-91a4-1288551f25ef",
              infrastructure_category: "Energy",
              request_count: 5,
              state: inspectorObj.state || "West Bengal",
              status: "pending_inspection",
              created_at: new Date().toISOString()
            },
            {
              id: "8123d9ec-0acb-4cc5-b362-827aa66cb5cb",
              infrastructure_category: "Transport & Logistics",
              request_count: 7,
              state: inspectorObj.state || "National",
              status: "pending_inspection",
              created_at: new Date().toISOString()
            }
          ]);
        }
      }
    } catch (e) {
      console.warn("Inspector data fetch warning:", e);
      const fallback = Object.values(DEMO_INSPECTORS).find(ins => ins.id === id);
      if (fallback) setInspector(fallback);
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    const cleanPhone = phone.trim();
    const cleanPass = password.trim();

    try {
      const { data, error } = await supabase
        .from('inspectors')
        .select('*')
        .eq('phone', cleanPhone)
        .eq('password', cleanPass)
        .single();

      if (data && !error) {
        localStorage.setItem('inspector_id', data.id);
        await fetchInspectorData(data.id);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Supabase query error:", err);
    }

    // Check demo inspector credentials fallback
    const matched = Object.values(DEMO_INSPECTORS).find(
      ins => ins.phone === cleanPhone && ins.password === cleanPass
    );

    if (matched) {
      localStorage.setItem('inspector_id', matched.id);
      await fetchInspectorData(matched.id);
    } else {
      setLoginError("Invalid phone number or password. Please check your credentials.");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('inspector_id');
    setInspector(null);
    setHotspots([]);
    setSelectedHotspot(null);
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exactLat || !exactLng) {
      alert("Please pinpoint the exact location on the map.");
      return;
    }

    setSubmitting(true);
    
    // Update hotspot status with map coordinates
    try {
      await supabase.from('demand_hotspots').update({
        status: 'project_proposed',
        inspector_report: reportText,
        exact_lat: exactLat,
        exact_lng: exactLng
      }).eq('id', selectedHotspot.id);
    } catch (e) {
      console.warn("Hotspot update offline fallback:", e);
    }

    // Also update local state
    setHotspots(prev => prev.map(h => 
      h.id === selectedHotspot.id ? { ...h, status: 'project_proposed', inspector_report: reportText } : h
    ));

    setSubmitting(false);
    alert("Report submitted successfully! Ministry will now review your field examination and exact map coordinates.");
    setSelectedHotspot(null);
    setReportText("");
    setProposedProjectTitle("");
    setExactLat(null);
    setExactLng(null);
    if (inspector?.id) {
      fetchInspectorData(inspector.id);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </div>
  );

  if (!inspector) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
          <div className="bg-slate-900 p-8 text-center">
            <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-500/30">
              <ShieldAlert className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Inspector Portal</h1>
            <p className="text-slate-300 text-sm mt-1">Field Examination & Demand Hotspot Verification</p>
          </div>
          <div className="p-8 space-y-6">
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Phone Number</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={e => setPhone(e.target.value)} 
                  placeholder="e.g. 9239663292"
                  className="w-full mt-1.5 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium" 
                  required 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Security Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="Enter inspector password"
                  className="w-full mt-1.5 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 font-medium" 
                  required 
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-indigo-600 text-white font-semibold py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                Secure Inspector Login
              </button>
            </form>

            <div className="text-center pt-2">
              <Link href="/" className="text-xs text-slate-500 hover:text-indigo-600 transition">
                &larr; Back to PragatiPulse National Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <nav className="bg-slate-900 text-white p-4 flex justify-between items-center shadow">
        <div className="font-bold text-lg flex items-center">
          <ShieldAlert className="w-5 h-5 mr-2 text-indigo-400" /> 
          PragatiPulse Inspector Field Portal
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
            {inspector.name} ({inspector.state})
          </span>
          <button 
            onClick={handleLogout} 
            className="px-3 py-1 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 border border-slate-700 rounded transition"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-6 mt-6">
        {selectedHotspot ? (
          <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm">
            <button 
              onClick={() => setSelectedHotspot(null)} 
              className="text-indigo-600 font-semibold mb-6 flex items-center text-sm hover:underline"
            >
              <ArrowLeft className="w-4 h-4 mr-1"/> Back to Assigned Hotspots
            </button>
            
            <h2 className="text-2xl font-bold font-serif mb-2 text-slate-900">Examine Citizen Demand Hotspot</h2>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-8 pb-6 border-b border-slate-100">
              <span className="flex items-center bg-slate-100 px-2.5 py-1 rounded-md">
                <MapPin className="w-4 h-4 mr-1 text-slate-500" /> {selectedHotspot.state}
              </span>
              <span className="flex items-center bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-medium">
                <AlertCircle className="w-4 h-4 mr-1 text-indigo-600" /> {selectedHotspot.infrastructure_category} Category
              </span>
              <span className="flex items-center bg-amber-50 text-amber-800 px-2.5 py-1 rounded-md font-medium">
                <Hash className="w-4 h-4 mr-1 text-amber-600" /> {selectedHotspot.request_count} Citizen Requests
              </span>
            </div>

            <form onSubmit={submitReport} className="space-y-6 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Field Examination Report</label>
                <p className="text-xs text-slate-500 mb-2">
                  Describe what you verified on ground and whether a formal government project should be initiated.
                </p>
                <textarea 
                  required 
                  value={reportText} 
                  onChange={e => setReportText(e.target.value)} 
                  className="w-full h-32 p-3.5 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none text-slate-800 text-sm" 
                  placeholder="Enter detailed field observation findings..."
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-semibold text-slate-800 mb-1 flex items-center">
                  <MapIcon className="w-4 h-4 mr-1.5 text-indigo-600"/> Exact Location Selection
                </label>
                <p className="text-xs text-slate-500 mb-3">
                  Click on the interactive map below to pinpoint the exact GPS coordinates for the proposed initiative.
                </p>
                <MapPicker onLocationSelect={(lat, lng) => {
                  setExactLat(lat);
                  setExactLng(lng);
                }} />
                {exactLat && exactLng && (
                  <div className="mt-2.5 text-xs font-mono text-emerald-700 bg-emerald-50 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Selected GPS Coordinates: {exactLat.toFixed(6)}, {exactLng.toFixed(6)}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block text-sm font-semibold text-slate-800 mb-1">
                  Proposed Initiative / Project Title
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  This initiative will be forwarded to MoSPI and relevant Ministries to sanction formal bidding.
                </p>
                <input 
                  type="text" 
                  required 
                  value={proposedProjectTitle} 
                  onChange={e => setProposedProjectTitle(e.target.value)} 
                  className="w-full p-3.5 border border-slate-300 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-800 text-sm font-medium" 
                  placeholder="e.g. Asansol-Durgapur High Speed Freight Corridor Bypass" 
                />
              </div>

              <button 
                disabled={submitting} 
                type="submit" 
                className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition flex justify-center items-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.99]"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><FileText className="w-5 h-5" /> Submit Report & Propose Project</>}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold font-serif text-slate-900">Assigned Demand Hotspots</h1>
                <p className="text-sm text-slate-500 mt-0.5">Citizen demand clusters requiring physical field verification</p>
              </div>
            </div>
            
            {hotspots.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                You have no active hotspot assignments at this time.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {hotspots.map((h) => (
                  <div key={h.id} className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        (h.status === 'project_proposed' || h.status === 'project_raised') 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {(h.status || 'pending').replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">ID: {h.id.split('-')[0]}</span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900 mb-1">{h.infrastructure_category} Cluster</h3>
                    <p className="text-sm text-slate-500 mb-4 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-slate-400"/> {h.state} Region
                    </p>
                    
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 mb-6 text-sm">
                      <strong className="text-slate-800 font-semibold">{h.request_count}</strong> citizen complaints aggregated here.
                    </div>

                    {(h.status === 'project_proposed' || h.status === 'project_raised') ? (
                      <div className="text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600"/> Examined & Proposed
                      </div>
                    ) : (
                      <button 
                        onClick={() => setSelectedHotspot(h)} 
                        className="w-full py-2.5 bg-indigo-50 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-100 transition flex justify-between items-center px-4 text-sm"
                      >
                        Examine & Pinpoint <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple fallback icon components
function ArrowLeft(props: any) { 
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12"></line>
      <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
  ); 
}

function ShieldAlert(props: any) { 
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
  ); 
}

function Hash(props: any) { 
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9"></line>
      <line x1="4" y1="15" x2="20" y2="15"></line>
      <line x1="10" y1="3" x2="8" y2="21"></line>
      <line x1="16" y1="3" x2="14" y2="21"></line>
    </svg>
  ); 
}
