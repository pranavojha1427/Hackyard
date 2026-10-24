
"use client";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { BiddingBoard } from "./BiddingBoard";

export function WorkflowInbox({ currentUser, agencyRanks }: any) {
  const [proposals, setProposals] = useState<any[]>([]);
  const [feedback, setFeedback] = useState("");
  const [projectCodes, setProjectCodes] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState(currentUser.role === "agency" ? "all" : "inbox");

  const load = () => fetch("/api/proposals").then(r => r.json()).then(d => Array.isArray(d) ? setProposals(d) : setProposals([]));
  useEffect(() => { load(); }, []);

  const handleAction = async (id: string, action: string) => {
    if ((action === "reject" || action === "feedback") && !feedback) return alert("Please provide feedback/reason.");
    
    const pCode = projectCodes[id] || undefined;
    if (action === "approve" && currentUser.role === "state_admin" && !pCode) {
       // Ask for confirmation if empty, or just let it pass
    }

    await fetch("/api/proposals", { method: "PUT", body: JSON.stringify({ id, action, feedback, project_code: pCode }) });
    setFeedback(""); load();
  };

  const pending = proposals.filter(p => {
    if(currentUser.role === "state_admin") return p.status === "pending_admin";
    if(currentUser.role === "ministry") return p.status === "pending_ministry" && (p.ministry?.toLowerCase() === currentUser.ministry?.toLowerCase());
    return false;
  });

  const allRelevant = proposals.filter(p => p.status !== "dismissed" || currentUser.role === "state_admin");

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b pb-2">
        {(currentUser.role === "state_admin" || currentUser.role === "ministry") && <button className={`font-semibold ${activeTab==="inbox" ? "text-blue-600" : "text-slate-500"}`} onClick={() => setActiveTab("inbox")}>Inbox ({pending.length})</button>}
        <button className={`font-semibold ${activeTab==="all" ? "text-blue-600" : "text-slate-500"}`} onClick={() => setActiveTab("all")}>All Proposals / Bidding</button>
      </div>

      <div className="flex flex-col gap-4">
        {(activeTab === "inbox" ? pending : allRelevant).map(p => (
          <div key={p._id} className="border p-4 bg-white rounded shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-lg">{p.project_name}</h4>
                  <span className="px-2 py-0.5 text-xs font-mono uppercase bg-slate-100 rounded">{(p.status || 'unknown').replace(/_/g, ' ')}</span>
                </div>
                <p className="text-sm text-slate-600">Proposed by: {p.creatorName} ({p.creatorRole}) - {p.ministry}</p>
              </div>
              <div className="text-right">
                <div className="font-bold text-lg">₹{p.expected_expenditure} Cr</div>
              </div>
            </div>
            
            <div className="bg-slate-50 p-3 rounded text-sm text-slate-700 whitespace-pre-wrap">{p.details}</div>

            {p.feedback && p.feedback.length > 0 && (
              <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-900 border border-yellow-100">
                <div className="font-semibold mb-1">Feedback History:</div>
                {p.feedback.map((f:any, i:number) => <div key={i}><strong>{f.author}:</strong> {f.text}</div>)}
              </div>
            )}

            {activeTab === "inbox" && (
              <div className="flex flex-col gap-2 mt-2">
                {currentUser.role === "state_admin" && (
                  <input 
                    placeholder="Assign Project Code (Required for Approval)" 
                    value={projectCodes[p._id] || ""} 
                    onChange={e => setProjectCodes({...projectCodes, [p._id]: e.target.value})} 
                    className="border border-blue-300 bg-blue-50 p-2 rounded w-full md:w-1/2 text-sm font-mono" 
                  />
                )}
                <div className="flex items-center gap-2">
                  <input placeholder="Feedback / Reason..." value={feedback} onChange={e=>setFeedback(e.target.value)} className="border p-2 rounded flex-1 text-sm" />
                  <Button onClick={() => {
                    if(currentUser.role === "state_admin" && !projectCodes[p._id]) return alert("Please assign a Project Code before approving.");
                    handleAction(p._id, "approve");
                  }} className="bg-green-600 hover:bg-green-700">Approve</Button>
                  <Button onClick={() => handleAction(p._id, "reject")} variant="destructive">Reject</Button>
                </div>
              </div>
            )}

            {activeTab === "all" && p.status === "bidding_open" && (
              <div className="mt-4 border-t pt-4">
                <BiddingBoard proposal={p} currentUser={currentUser} agencyRanks={agencyRanks} />
              </div>
            )}
            
            {activeTab === "all" && p.createdBy === currentUser.id && (p.status === "rejected_by_admin" || p.status === "rejected_by_ministry") && (
              <div className="mt-3 flex justify-end">
                <Button onClick={() => handleAction(p._id, "dismiss")} variant="outline" size="sm" className="text-slate-500">
                  Acknowledge & Dismiss
                </Button>
              </div>
            )}
          </div>
        ))}
        {(activeTab === "inbox" ? pending : allRelevant).length === 0 && <p className="text-slate-500">No proposals found.</p>}
      </div>
    </div>
  );
}


