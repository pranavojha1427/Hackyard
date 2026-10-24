"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getAIHealthScores } from "@/app/actions";
import { Loader2, MessageSquare, ShieldCheck, FileCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { SessionUser } from "@/lib/auth";

export function computeProjectAiScore(p: any) {
  const original_cost = Number(p.original_cost) || 0;
  const revised_cost = Number(p.revised_cost) || (original_cost > 0 ? original_cost : 0);
  const expenditure = Number(p.cumulative_expenditure) || 0;
  const physical_progress = Number(p.physical_progress) || 0;

  const cost_escalation = revised_cost - original_cost;
  let cost_overrun_percent = 0.0;
  if (original_cost > 0) {
    cost_overrun_percent = (cost_escalation / original_cost) * 100;
  }
      
  let financial_progress = 0.0;
  if (revised_cost > 0) {
    financial_progress = (expenditure / revised_cost) * 100;
  }
      
  const implementation_discrepancy = physical_progress - financial_progress;
  
  const cost_overrun_score = Math.max(0.0, Math.min(100.0, cost_overrun_percent * 2));
  const schedule_risk_score = Math.max(0.0, Math.min(100.0, (100.0 - physical_progress) + Math.max(0.0, -implementation_discrepancy)));

  let overall_health = "On Track";
  let recommendation = "Maintain current monitoring protocols. Project execution velocity remains well-aligned with financial deployments, reflecting strong governance. Continue regular milestone tracking and ensure risk mitigation contingency funds remain available to sustain this operational momentum.";

  if (cost_overrun_percent > 10.0 && physical_progress < 50.0) {
    overall_health = "Critical";
    recommendation = "Trigger immediate financial scrutiny and halt further disbursements. Given the cost overrun exceeding 10% coupled with physical progress below 50%, an exhaustive forensic audit is highly recommended to identify fund leakages and restructure timelines.";
  } else if (cost_overrun_score > 30.0 || schedule_risk_score > 50.0) {
    overall_health = "At Risk";
    recommendation = "Conduct a thorough review of the project execution plan immediately. With schedule and cost risk scores climbing, it is vital to mandate contractor performance metrics, expedite pending clearances, and streamline supply chains to prevent further delays.";
  }

  const shap_explanations: string[] = [];
  if (overall_health === "Critical" || overall_health === "At Risk") {
    if (cost_overrun_percent > 10.0) {
      shap_explanations.push(`Cost overrun is ${cost_overrun_percent.toFixed(1)}% -> High cost-risk contribution`);
    }
    if (physical_progress < 50.0) {
      shap_explanations.push(`Physical progress is ${physical_progress.toFixed(1)}% below plan -> High schedule-risk contribution`);
    }
    if (cost_escalation > 0) {
      shap_explanations.push(`Revised cost increased by ₹${cost_escalation.toFixed(1)} Cr -> Medium-high cost-risk contribution`);
    }
    if (implementation_discrepancy < -10) {
      shap_explanations.push(`Financial progress exceeds physical by ${(-implementation_discrepancy).toFixed(1)}% -> Fund diversion risk`);
    }
  } else {
    shap_explanations.push(`Expenditure velocity matches milestone progress -> Balanced risk profile`);
  }

  return {
    overall_health,
    recommendation,
    SHAP_Explanation: shap_explanations,
    cost_overrun_score: cost_overrun_score.toFixed(0),
    schedule_risk_score: schedule_risk_score.toFixed(0)
  };
}

export function ProjectTableAI({ projects, currentUser }: { projects: any[], currentUser?: SessionUser }) {
  const [aiScores, setAiScores] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const paginatedProjects = projects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(projects.length / itemsPerPage);

  // Feedback State
  const [feedbackProject, setFeedbackProject] = useState<any | null>(null);
  const [feedbackStep, setFeedbackStep] = useState(0); // 0=Phone, 1=OTP, 2=Feedback, 3=Done, 4=View (Admin)
  const [mobileNo, setMobileNo] = useState("");
  const [otp, setOtp] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [adminFeedbacks, setAdminFeedbacks] = useState<any[]>([]);
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);

  useEffect(() => {
    let isMounted = true;
    getAIHealthScores()
      .then((scores) => {
        if (isMounted && scores && Object.keys(scores).length > 0) {
          setAiScores(scores);
        }
      })
      .catch((err) => {
        console.warn("Background AI scores notice:", err);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [projects]);


  const getHealthBadge = (health: string) => {
    if (!health) return <Badge variant="outline" className="border-slate-300 text-slate-500 rounded-none">N/A</Badge>;
    
    switch (health.toLowerCase()) {
      case "critical":
        return <Badge className="bg-red-200 text-red-900 border border-red-300 rounded-none">CRITICAL</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800 border border-orange-200 rounded-none">HIGH</Badge>;
      case "at risk":
      case "medium":
        return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 rounded-none">MEDIUM</Badge>;
      case "on track":
      case "low":
        return <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-none">LOW</Badge>;
      default:
        return <Badge className="bg-slate-200 text-slate-700 rounded-none uppercase">{health}</Badge>;
    }
  };

  const handleSendOTP = async () => {
    if (mobileNo.length < 10) {
      setFeedbackError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setFeedbackError("");
    setIsSubmitting(true);
    
    try {
      const { data } = await supabase
        .from("project_feedbacks")
        .select("id")
        .eq("project_id", feedbackProject.id)
        .eq("mobile_no", mobileNo)
        .maybeSingle();

      if (data) {
        setFeedbackError("Feedback from this mobile number has already been registered for this project.");
        setIsSubmitting(false);
        return;
      }
    } catch (e) {
      console.error(e);
    }

    setIsSubmitting(false);
    setFeedbackStep(1); // Proceed to OTP
  };

  const handleVerifyOTP = () => {
    if (otp.length < 4) {
      setFeedbackError("Please enter the verification code.");
      return;
    }
    setFeedbackError("");
    setFeedbackStep(2); // Proceed to Feedback text
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim()) {
      setFeedbackError("Please provide your feedback.");
      return;
    }
    
    setIsSubmitting(true);
    setFeedbackError("");

    try {
      const { error } = await supabase.from("project_feedbacks").insert({
        project_id: feedbackProject.id,
        mobile_no: mobileNo,
        feedback_text: feedbackText
      });

      if (error) {
        if (error.code === '23505') { // Unique violation
          setFeedbackError("Feedback from this mobile number has already been registered for this project.");
        } else {
          setFeedbackError("An error occurred. Please try again.");
        }
        setIsSubmitting(false);
        return;
      }

      setFeedbackStep(3); // Success
    } catch (e) {
      console.error(e);
      setFeedbackError("Unexpected error occurred.");
    }
    
    setIsSubmitting(false);
  };

  const closeFeedbackModal = () => {
    setFeedbackProject(null);
    setTimeout(() => {
      setFeedbackStep(0);
      setMobileNo("");
      setOtp("");
      setFeedbackText("");
      setFeedbackError("");
    }, 300);
  };

  return (
    <div className="relative">
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow className="border-slate-200 hover:bg-slate-50/50">
            <TableHead className="text-slate-600 font-mono py-4">Code</TableHead>
            <TableHead className="text-slate-600 font-mono py-4">Project Name</TableHead>
            <TableHead className="text-slate-600 font-mono py-4">Sector</TableHead>
            <TableHead className="text-slate-600 font-mono text-right py-4">Orig. Cost</TableHead>
            <TableHead className="text-slate-600 font-mono text-right py-4">Rev. Cost</TableHead>
            <TableHead className="text-slate-600 font-mono text-right py-4">Overrun %</TableHead>
            <TableHead className="text-slate-600 font-mono text-right py-4">Discrepancy</TableHead>
            <TableHead className="text-slate-600 font-mono text-center py-4">AI Health Score</TableHead>
            <TableHead className="text-slate-600 font-mono text-center py-4">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedProjects.map((p) => {
            const aiData = aiScores[p.id] || computeProjectAiScore(p);
            
            return (
              <TableRow 
                key={p.id} 
                className="border-slate-200 hover:bg-slate-200/50 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedProject(p);
                  setIsSheetOpen(true);
                }}
              >
                <TableCell className="font-mono text-xs text-slate-700">{p.project_code}</TableCell>
                <TableCell className="font-medium max-w-[250px] truncate text-slate-900" title={p.project_name}>{p.project_name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-slate-300 text-slate-700 font-mono rounded-none bg-slate-200/50">{p.sector}</Badge>
                </TableCell>
                <TableCell className="text-right font-mono text-slate-700">{p.original_cost?.toFixed(2) || '-'}</TableCell>
                <TableCell className="text-right font-mono text-amber-500">{p.revised_cost?.toFixed(2) || '-'}</TableCell>
                <TableCell className="text-right font-mono">
                  <span className={p.costOverrunPercent > 0 ? "text-red-500" : "text-slate-600"}>
                    {p.costOverrunPercent > 0 ? '+' : ''}{p.costOverrunPercent.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono">
                  <span className={Math.abs(p.implementationDiscrepancy) > 20 ? "text-red-500 font-bold" : "text-slate-600"}>
                    {p.implementationDiscrepancy > 0 ? '+' : ''}{p.implementationDiscrepancy.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-center font-mono">
                  {getHealthBadge(aiData?.overall_health)}
                </TableCell>
                <TableCell className="text-center font-mono">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="font-sans flex items-center gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={async (e) => {
                      e.stopPropagation();
                      setFeedbackProject(p);
                      if (currentUser && currentUser.role !== "user") {
                        setFeedbackStep(4); // View Admin Feedback Step
                        setIsLoadingFeedbacks(true);
                        const { data } = await supabase
                          .from("project_feedbacks")
                          .select("*")
                          .eq("project_id", p.id)
                          .order("created_at", { ascending: false });
                        setAdminFeedbacks(data || []);
                        setIsLoadingFeedbacks(false);
                      } else {
                        setFeedbackStep(0);
                      }
                    }}
                  >
                    <MessageSquare className="w-4 h-4" /> {currentUser && currentUser.role !== "user" ? "Watch Feedback" : "Add Feedback"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-white">
        <p className="text-xs text-slate-500 font-mono">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, projects.length)} of {projects.length}</p>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
        </div>
      </div>


      {/* AI Risk Report Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-slate-50 border-l-2 border-slate-300 text-slate-900 overflow-y-auto sm:max-w-md w-full font-sans">
          <SheetHeader className="border-b border-slate-200 pb-4 mb-4">
            <SheetTitle className="text-xl font-bold uppercase tracking-wide text-slate-900">Explainable AI Risk Report</SheetTitle>
            <SheetDescription className="font-mono text-slate-600 text-xs uppercase">
              {selectedProject?.project_code} — AI Analysis
            </SheetDescription>
          </SheetHeader>
          
          {(() => {
            if (!selectedProject) return null;
            const activeAiScore = aiScores[selectedProject.id] || computeProjectAiScore(selectedProject);

            return (
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="font-mono text-xs text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 text-center">Overall Health</h3>
                <div className="flex items-center justify-center pt-1">
                  {getHealthBadge(activeAiScore?.overall_health)}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <h3 className="font-mono text-xs text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1 text-center">
                  AI Recommendation
                </h3>
                <div className="text-sm bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-md shadow-sm font-medium text-slate-800 leading-relaxed relative overflow-hidden text-center">
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                  {activeAiScore?.recommendation}
                </div>
              </div>

              {activeAiScore?.overall_health === 'Critical' && activeAiScore?.SHAP_Explanation && activeAiScore?.SHAP_Explanation.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-mono text-xs text-red-500 uppercase tracking-widest border-b border-slate-200 pb-1">Critical Risk Factors (SHAP)</h3>
                  <div className="flex flex-col gap-2 mt-2">
                    {activeAiScore.SHAP_Explanation.map((explanation: string, i: number) => {
                      const parts = explanation.split("->");
                      return (
                        <div key={i} className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded">
                          <span className="text-xs text-slate-700 pr-2">{parts[0]?.trim()}</span>
                          {parts[1] && (
                            <span className="text-[10px] font-mono text-red-400 bg-red-950/30 px-2 py-1 rounded">
                              {parts[1].trim()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div className="bg-white p-3 border border-slate-200">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Cost Overrun Score</p>
                  <p className="text-2xl font-black text-slate-900">{activeAiScore?.cost_overrun_score}</p>
                </div>
                <div className="bg-white p-3 border border-slate-200">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Schedule Risk Score</p>
                  <p className="text-2xl font-black text-slate-900">{activeAiScore?.schedule_risk_score}</p>
                </div>
              </div>
            </div>
          );
          })()}
        </SheetContent>
      </Sheet>

      {/* Add Feedback Dialog */}
      <Dialog open={!!feedbackProject} onOpenChange={(open) => !open && closeFeedbackModal()}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-slate-800">
              {feedbackStep === 3 ? "Feedback Submitted!" : feedbackStep === 4 ? "Project Feedback" : "Submit Project Feedback"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {feedbackProject?.project_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {feedbackError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                {feedbackError}
              </div>
            )}

            {feedbackStep === 0 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                  <input 
                    type="tel" 
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    placeholder="Enter your 10-digit mobile number"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                </div>
                <p className="text-xs text-slate-500">We will send a one-time verification code to this number.</p>
              </div>
            )}

            {feedbackStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Verification Code</label>
                  <input 
                    type="text" 
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter the 6-digit code"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-center tracking-widest font-mono text-lg"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-slate-500 text-center">Code sent to +91 {mobileNo}</p>
              </div>
            )}

            {feedbackStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your Feedback</label>
                  <textarea 
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Describe your observations, concerns, or feedback regarding this project..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition min-h-[120px] resize-none"
                  />
                </div>
              </div>
            )}

            {feedbackStep === 3 && (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                  <FileCheck className="w-8 h-8" />
                </div>
                <p className="text-slate-600 text-sm">
                  Your feedback has been recorded securely and will be reviewed by the admin and respective ministry.
                </p>
                <p className="text-xs text-slate-400 font-mono mt-2">Verified Mobile: +91 {mobileNo}</p>
              </div>
            )}

            {feedbackStep === 4 && (
              <div className="space-y-4 max-h-[300px] overflow-y-auto">
                {isLoadingFeedbacks ? (
                  <div className="text-center py-8 text-slate-500 font-mono text-sm">Loading feedbacks...</div>
                ) : adminFeedbacks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">No feedback received for this project yet.</div>
                ) : (
                  adminFeedbacks.map((fb, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <p className="text-sm text-slate-700">{fb.feedback_text}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-slate-500 font-mono">
                        <span>User: +91 {fb.mobile_no?.substring(0, 4)}XXXXXX</span>
                        <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <DialogFooter className="sm:justify-between border-t border-slate-100 pt-4">
            {feedbackStep < 3 ? (
              <>
                <Button variant="ghost" onClick={closeFeedbackModal} className="text-slate-500 hover:text-slate-700">Cancel</Button>
                {feedbackStep === 0 && (
                  <Button onClick={handleSendOTP} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Send OTP
                  </Button>
                )}
                {feedbackStep === 1 && <Button onClick={handleVerifyOTP} className="bg-indigo-600 hover:bg-indigo-700 text-white"><ShieldCheck className="w-4 h-4 mr-2"/> Verify Code</Button>}
                {feedbackStep === 2 && (
                  <Button onClick={handleSubmitFeedback} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Submit Feedback
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={closeFeedbackModal} className="w-full bg-slate-800 hover:bg-slate-900 text-white">Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
