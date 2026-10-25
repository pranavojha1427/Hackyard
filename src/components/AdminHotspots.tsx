"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, MapPin, AlertCircle, ShieldAlert, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/InspectorMapPicker"), {
  ssr: false,
  loading: () => <div className="h-64 w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
});

const stateDemographics: Record<string, { population: string, infraDeficit: number, priorityMultiplier: number }> = {
  "West Bengal": { population: "91.3M", infraDeficit: 65, priorityMultiplier: 1.4 },
  "Odisha": { population: "41.9M", infraDeficit: 72, priorityMultiplier: 1.6 },
  "Maharashtra": { population: "112.4M", infraDeficit: 45, priorityMultiplier: 1.1 },
  "Uttar Pradesh": { population: "199.8M", infraDeficit: 78, priorityMultiplier: 1.8 },
  "Gujarat": { population: "60.4M", infraDeficit: 35, priorityMultiplier: 1.0 },
};

export default function AdminHotspots({ currentUser }: { currentUser?: any }) {
  const [unassignedComplaints, setUnassignedComplaints] = useState<any[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch live hotspots (with auto-clustering of 3+ complaints enabled)
      const hsRes = await fetch(`/api/hotspots?autoCluster=true${currentUser?.role === 'state_admin' && currentUser?.state ? `&state=${encodeURIComponent(currentUser.state)}` : ''}`);
      if (hsRes.ok) {
        const hsData = await hsRes.json();
        if (hsData.hotspots) {
          setHotspots(hsData.hotspots);
        }
      } else {
        // Direct Supabase fallback
        let hotspotsQuery = supabase.from('demand_hotspots').select(`*, inspectors ( name, phone )`).order('created_at', { ascending: false });
        if (currentUser?.role === 'state_admin' && currentUser?.state) {
            hotspotsQuery = hotspotsQuery.eq('state', currentUser.state);
        }
        const { data: hData } = await hotspotsQuery;
        setHotspots(hData || []);
      }

      // 2. Fetch unassigned complaints from unified complaints API
      const cRes = await fetch(`/api/complaints${currentUser?.role === 'state_admin' && currentUser?.state ? `?state=${encodeURIComponent(currentUser.state)}` : ''}`);
      let allComplaints: any[] = [];
      if (cRes.ok) {
        const cJson = await cRes.json();
        allComplaints = (cJson.complaints || []).filter((c: any) => !c.hotspot_id);
      } else {
        let complaintsQuery = supabase.from('citizen_requests').select('*').is('hotspot_id', null).order('created_at', { ascending: false });
        if (currentUser?.role === 'state_admin' && currentUser?.state) {
            complaintsQuery = complaintsQuery.eq('state', currentUser.state);
        }
        const { data: cData } = await complaintsQuery;
        allComplaints = cData || [];
      }
      
      // Group similar complaints by state & category for UI grouping
      const grouped = allComplaints.reduce((acc: any, curr) => {
        const key = `${curr.state}-${curr.infrastructure_category}`;
        if (!acc[key]) acc[key] = { state: curr.state, category: curr.infrastructure_category, complaints: [] };
        acc[key].complaints.push(curr);
        return acc;
      }, {});
      
      // Show groups with 2+ complaints as potential hotspots
      setUnassignedComplaints(Object.values(grouped).filter((g: any) => g.complaints.length >= 2));
    } catch (err) {
      console.warn("fetchData warning:", err);
    }
    setLoading(false);
  };

  const handleManualAutoCluster = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hotspots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minThreshold: 2 })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Clustering complete! ${data.hotspotsCreated || 0} new hotspot(s) created, ${data.hotspotsUpdated || 0} updated.`);
      }
    } catch (e) {
      console.error("Clustering error:", e);
    }
    await fetchData();
  };

  const handleCreateAndAssign = async (group: any) => {
    // 1. Find an inspector in that state, or fallback to National or any inspector
    let selectedInspector: any = null;
    const { data: insData } = await supabase.from('inspectors').select('*').eq('state', group.state);
    
    if (insData && insData.length > 0) {
      selectedInspector = insData[Math.floor(Math.random() * insData.length)];
    } else {
      // Fallback: National inspector
      const { data: natData } = await supabase.from('inspectors').select('*').eq('state', 'National');
      if (natData && natData.length > 0) {
        selectedInspector = natData[0];
      } else {
        // Fallback: Any available inspector
        const { data: anyData } = await supabase.from('inspectors').select('*').limit(1);
        if (anyData && anyData.length > 0) {
          selectedInspector = anyData[0];
        }
      }
    }

    if (!selectedInspector) {
      alert("No inspectors available in system to assign.");
      return;
    }

    // 2. Create Hotspot
    const firstCoord = group.complaints.find((c: any) => c.location)?.location || null;
    const { data: hData, error: hError } = await supabase.from('demand_hotspots').insert({
        state: group.state,
        infrastructure_category: group.category,
        request_count: group.complaints.length,
        priority_score: Number((group.complaints.length * 2.2 + 2.5).toFixed(1)),
        average_sentiment: -0.75,
        inspector_id: selectedInspector.id,
        status: 'assigned',
        hotspot_polygon: firstCoord
    }).select().single();

    if (hError || !hData) {
        alert("Error creating hotspot: " + (hError?.message || ""));
        return;
    }

    // 3. Link complaints to Hotspot
    for (let c of group.complaints) {
      if (c.id && !String(c.id).startsWith('local-')) {
        await supabase.from('citizen_requests').update({ hotspot_id: hData.id }).eq('id', c.id);
      }
    }

    alert(`Hotspot created and assigned to Inspector ${selectedInspector.name} (${selectedInspector.state})`);
    fetchData();
  };

  const handleRaiseProject = async (hotspot: any) => {
    // The Ministry raises a project from the Field Report
    // It creates a MongoDB Proposal that goes to Admin
    const project_title = prompt("Enter Project Title for this Initiative:");
    if (!project_title) return;

    // Fetch the project that was temporarily put into postgres by the inspector
    const { data: pData } = await supabase.from('projects').select('*').eq('hml_category', hotspot.infrastructure_category).eq('state', hotspot.state).order('created_at', { ascending: false }).limit(1);

    const description = hotspot.inspector_report || "Raised from Field Report";
    const defaultAmount = hotspot.preferred_amount ? String(hotspot.preferred_amount) : "50";
    const amountStr = prompt(
      hotspot.preferred_amount 
        ? `Enter Estimated Budget in ₹ Crores [Inspector Recommended: ₹${hotspot.preferred_amount} Cr]:` 
        : "Enter Estimated Budget in ₹ Crores:", 
      defaultAmount
    );
    if (!amountStr) return;
    const amount = parseFloat(amountStr) || 0;

    // Append map coordinates to description so the Admin can see exactly where it was pinned
    const coordsStr = hotspot.exact_lat && hotspot.exact_lng ? `\n\n[Map Pinned Coordinates: Lat ${Number(hotspot.exact_lat).toFixed(6)}, Lng ${Number(hotspot.exact_lng).toFixed(6)}]` : "";
    const fullDetails = description + coordsStr;

    const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            project_name: project_title,
            details: fullDetails,
            expected_expenditure: amount,
            sector: hotspot.infrastructure_category,
            state: hotspot.state,
            hotspot_id: hotspot.id
        })
    });

    if (res.ok) {
        alert("Project Proposal sent to Admin for Bidding Verification!");
        // Update hotspot status
        await supabase.from('demand_hotspots').update({ status: 'project_raised' }).eq('id', hotspot.id);
        fetchData();
    } else {
        alert("Failed to raise project.");
    }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>;

  return (
    <div className="p-6 bg-slate-50 border border-slate-200 space-y-8">
      
      {/* Potential Hotspots - Visible to Admins */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'state_admin' || !currentUser?.role) && (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold font-serif text-slate-800 flex items-center mb-1">
              <AlertCircle className="w-6 h-6 mr-2 text-rose-500" /> Detected Demand Hotspots
            </h2>
            <p className="text-slate-500 text-sm">
              Citizen grievances grouped by region & infrastructure category. Automatic clustering triggers when 3+ complaints arrive from the same area.
            </p>
          </div>
          {unassignedComplaints.length > 0 && (
            <button 
              onClick={handleManualAutoCluster}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              Auto-Cluster All Pending Hotspots
            </button>
          )}
        </div>

        {unassignedComplaints.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded text-slate-500">No new unassigned complaints waiting for clustering.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {unassignedComplaints.map((group, idx) => {
              const demo = stateDemographics[group.state] || { population: "N/A", infraDeficit: 50, priorityMultiplier: 1.0 };
              const severityScore = Math.round(group.complaints.length * demo.priorityMultiplier * 10);
              
              return (
              <div key={idx} className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold px-2 py-1 bg-rose-100 text-rose-700 rounded-full">{group.category}</span>
                      <div className="text-slate-700 font-semibold mt-3 flex items-center"><MapPin className="w-4 h-4 mr-1 text-slate-400"/> {group.state} Region</div>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl font-black text-slate-800">{group.complaints.length}</span>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Complaints</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-mono text-slate-500">Demographics</p>
                      <p className="text-xs font-semibold text-slate-700">Pop: {demo.population} | Deficit: {demo.infraDeficit}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-mono text-slate-500">Priority Score</p>
                      <p className="text-sm font-black text-rose-600">{severityScore}</p>
                    </div>
                  </div>

                  <div className="space-y-3 border-t border-slate-100 pt-4 h-24 overflow-y-auto pr-2">
                  {group.complaints.map((c: any) => (
                    <div key={c.id} className="text-sm border-l-2 border-slate-200 pl-3">
                      <span className="font-semibold text-slate-700">{c.name || 'Anonymous'}:</span> <span className="text-slate-600">{c.translated_text}</span>
                    </div>
                  ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <button onClick={() => handleCreateAndAssign(group)} className="w-full py-3 bg-slate-900 text-white font-semibold rounded hover:bg-indigo-600 transition flex justify-center items-center">
                    <ShieldAlert className="w-4 h-4 mr-2" /> Make Hotspot & Assign Inspector
                  </button>
                </div>
              </div>
            );})}
          </div>
        )}
      </div>
      )}

      {/* Active Assignments & Field Reports */}
      <div>
        <h2 className="text-2xl font-bold font-serif text-slate-800 flex items-center mb-1">
            <CheckCircle2 className="w-6 h-6 mr-2 text-emerald-500" /> 
            {currentUser?.role === 'admin' ? "Active Assignments" : "Field Reports & Initiatives"}
        </h2>
        <p className="text-slate-500 text-sm mb-6">Track hotspots that are currently assigned to field inspectors or have proposed initiatives.</p>

        {hotspots.length === 0 ? (
          <div className="p-8 text-center bg-white border border-slate-200 rounded text-slate-500">No hotspots have been created yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {hotspots.map((h) => {
                // If ministry, only show those that are proposed
                if (currentUser?.role === 'ministry' && h.status !== 'project_proposed' && h.status !== 'project_raised') return null;

                return (
                 <div key={h.id} className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${h.status === 'project_proposed' ? 'bg-emerald-500' : h.status === 'project_raised' ? 'bg-indigo-500' : 'bg-amber-500'}`}></div>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-full">{h.infrastructure_category}</span>
                        <div className="text-slate-700 font-semibold mt-3 flex items-center"><MapPin className="w-4 h-4 mr-1 text-slate-400"/> {h.state} Region</div>
                        </div>
                        <div className="text-right">
                        <div className="text-xs font-mono text-slate-400 mb-1">ID: {h.id.split('-')[0]}</div>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${h.status === 'project_proposed' ? 'bg-emerald-100 text-emerald-700' : h.status === 'project_raised' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                            {h.status.replace('_', ' ')}
                        </span>
                        </div>
                    </div>

                    <div className="mt-4 p-4 bg-slate-50 border border-slate-100 rounded text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Citizen Requests:</span>
                            <span className="font-bold text-slate-700">{h.request_count}</span>
                        </div>
                        {h.inspectors && (
                        <div className="flex justify-between">
                            <span className="text-slate-500">Inspector:</span>
                            <span className="font-semibold text-slate-700">{h.inspectors.name} ({h.inspectors.phone || 'Field Officer'})</span>
                        </div>
                        )}
                        {h.inspector_report && (
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <span className="text-xs font-bold text-emerald-600 uppercase mb-1 block flex items-center"><FileText className="w-3 h-3 mr-1"/> Inspector Report</span>
                                <p className="text-slate-600 text-sm italic mb-3">"{h.inspector_report}"</p>
                                {h.exact_lat && h.exact_lng && (
                                    <div className="bg-slate-100 p-2 rounded text-xs font-mono flex items-center text-slate-700">
                                        <MapPin className="w-3 h-3 mr-1 text-rose-500" />
                                        Exact Location Pinned: {Number(h.exact_lat).toFixed(6)}, {Number(h.exact_lng).toFixed(6)}
                                    </div>
                                )}
                                {h.preferred_amount ? (
                                    <div className="mt-2 bg-emerald-50 text-emerald-800 p-2 rounded text-xs font-semibold flex items-center border border-emerald-200">
                                        💰 Inspector Preferred Budget: ₹{h.preferred_amount} Crores
                                    </div>
                                ) : (
                                    <div className="mt-2 bg-slate-100 text-slate-600 p-2 rounded text-xs font-medium flex items-center">
                                        ℹ️ No Preferred Budget Allocated by Inspector (Ministry to Estimate)
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {currentUser?.role === 'ministry' && h.status === 'project_proposed' && (
                        <div className="mt-6 pt-4 border-t border-slate-100">
                            <button onClick={() => handleRaiseProject(h)} className="w-full py-3 bg-indigo-600 text-white font-semibold rounded hover:bg-indigo-700 transition flex justify-center items-center">
                                Raise Project Proposal
                            </button>
                        </div>
                    )}
                 </div>
                );
             })}
          </div>
        )}
      </div>

    </div>
  );
}
