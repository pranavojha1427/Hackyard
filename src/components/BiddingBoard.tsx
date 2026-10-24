
"use client";
import { useState, useEffect } from "react";
import { Button } from "./ui/button";

export function BiddingBoard({ proposal, currentUser, agencyRanks }: any) {
  const [bids, setBids] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => fetch(`/api/bids?proposalId=${proposal._id}`).then(r => r.json()).then(d => Array.isArray(d) ? setBids(d) : setBids([]));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!amount) return;
    setLoading(true);
    const res = await fetch("/api/bids", { method: "POST", body: JSON.stringify({ proposalId: proposal._id, bidAmount: amount, remarks }) });
    setLoading(false);
    const data = await res.json();
    if (data.error) alert(data.error);
    else { alert("Bid placed!"); load(); }
  };

  const award = async (bid: any) => {
    await fetch("/api/proposals", { method: "PUT", body: JSON.stringify({ id: proposal._id, action: "award_bid", agency: bid.agencyName, bidAmount: bid.bidAmount, feedback: `Bid awarded to ${bid.agencyName} for ₹${bid.bidAmount} Cr.` }) });
    alert("Bid Awarded!");
    window.location.reload();
  };

  // Check 1 week rule purely for UI display
  const opened = new Date(proposal.biddingStartedAt || proposal.createdAt).getTime();
  const now = new Date().getTime();
  const msLeft = (opened + 7 * 24 * 60 * 60 * 1000) - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  const isClosed = msLeft <= 0;

  return (
    <div className="bg-slate-50 p-4 rounded border">
      <h4 className="font-bold mb-2">Bidding Platform</h4>
      <div className="text-sm mb-4">
        {isClosed ? <span className="text-red-600 font-bold">Bidding Closed</span> : <span className="text-green-600 font-bold">{daysLeft} days remaining</span>}
      </div>

      {(currentUser.role === "admin" || currentUser.role === "state_admin") && (
        <div className="space-y-2">
          {bids.map((b, i) => (
            <div key={i} className="flex justify-between items-center bg-white p-3 border rounded">
              <div>
                <div className="font-semibold">{b.agencyName}</div>
                <div className="text-xs text-slate-500">{b.remarks}</div>
                
                  {(() => {
                    const rankObj = agencyRanks?.find((r: any) => r.agency === b.agencyName);
                    const agencyRank = rankObj ? agencyRanks.indexOf(rankObj) + 1 : (b.agencyRank || "Unranked");
                    const delayFreq = rankObj ? rankObj.delay_frequency_pct : (b.delayFreq || "0");
                    const costOverrun = rankObj ? rankObj.avg_cost_overrun_pct : (b.costOverrun || "0");
                    
                    return (
                      <div className="text-xs font-mono mt-1 bg-yellow-100 text-yellow-800 px-2 py-0.5 inline-block rounded">
                        Rank: #{agencyRank} | Delay: {delayFreq}% | Cost Overrun: {costOverrun}%
                      </div>
                    );
                  })()}

              </div>
              <div className="text-right flex items-center gap-4">
                <div className="font-bold text-lg">₹{b.bidAmount} Cr</div>
                {!isClosed && <Button size="sm" onClick={() => award(b)}>Award</Button>}
              </div>
            </div>
          ))}
          {bids.length === 0 && <p className="text-sm text-slate-500">No bids yet.</p>}
        </div>
      )}

      {currentUser.role === "agency" && (
        <div className="flex gap-2">
          <input type="number" placeholder="Bid Amount (Cr)" value={amount} onChange={e=>setAmount(e.target.value)} className="border p-2 rounded" />
          <input placeholder="Remarks..." value={remarks} onChange={e=>setRemarks(e.target.value)} className="border p-2 rounded flex-1" />
          <Button disabled={isClosed || loading} onClick={submit}>Place Bid</Button>
        </div>
      )}

      {currentUser.role === "ministry" && (
         <div className="text-sm text-slate-500">{bids.length} bids placed so far. Awaiting Admin decision.</div>
      )}
    </div>
  );
}

