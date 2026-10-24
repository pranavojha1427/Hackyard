"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Mic, Send, MapPin, CheckCircle, Activity, Sparkles, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function CitizenPortal() {
  const [step, setStep] = useState<"login" | "otp" | "menu" | "complaint">("login");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Form States
  const [name, setName] = useState("");
  const [ministry, setMinistry] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem('citizen_phone')) {
      setMobile(localStorage.getItem('citizen_phone')!);
      setStep("menu");
    }
  }, []);

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => console.error("Location error", err)
      );
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobile.length > 9) setStep("otp");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      localStorage.setItem('citizen_phone', mobile);
      setStep("menu");
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        try {
          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (data.text) {
            setDetails(prev => prev + (prev ? " " : "") + data.text);
          }
        } catch (e) {
          console.error("Transcription error", e);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing mic", err);
      alert("Microphone access is required to use voice commands.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div className="min-h-screen gov-bg-pattern flex flex-col justify-between">
      {/* Top Tricolor Accent Bar */}
      <div className="h-1.5 w-full gov-tricolor-gradient" />

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg bg-white/95 backdrop-blur-md rounded-3xl shadow-xl overflow-hidden border border-slate-200/90">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 text-white text-center relative border-b border-indigo-900/40">
            {step === "complaint" ? (
              <button 
                onClick={() => setStep("menu")} 
                className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <Link 
                href="/dashboard"
                className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Back</span>
              </Link>
            )}

            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-500 text-white shadow-md shadow-indigo-500/25 mb-2 ring-2 ring-indigo-400/30">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">PragatiPulse Citizen Portal</h1>
            <p className="text-indigo-200 text-xs font-medium mt-0.5">
              Participatory Public Grievance & Infrastructure Feedback System
            </p>
          </div>

          {/* Login Step */}
          {step === "login" && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-800">Citizen Identification</h2>
                <p className="text-slate-500 text-xs mt-1">
                  Enter your mobile number to participate directly in national infrastructure monitoring.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Mobile Number</label>
                  <input 
                    type="tel" 
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    placeholder="+91 98765 43210" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition text-sm font-medium"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition shadow-md shadow-indigo-600/20 text-sm"
                >
                  Continue via OTP
                </button>
              </form>
            </div>
          )}

          {/* OTP Step */}
          {step === "otp" && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-bold text-slate-800">Verification Code</h2>
                <p className="text-slate-500 text-xs mt-1">6-digit OTP dispatched to {mobile}</p>
              </div>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Enter Verification Code</label>
                  <input 
                    type="text" 
                    value={otp}
                    onChange={e => setOtp(e.target.value)}
                    placeholder="123456" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none text-center tracking-widest text-xl font-bold font-mono transition"
                    required
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition shadow-md shadow-indigo-600/20 text-sm"
                >
                  Verify & Enter
                </button>
              </form>
            </div>
          )}

          {/* Main Menu Step */}
          {step === "menu" && (
            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-center text-emerald-700 bg-emerald-50 py-2.5 px-4 rounded-xl text-xs font-bold border border-emerald-200">
                <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" /> Mobile verified successfully
              </div>
              
              <button 
                onClick={() => {
                  setStep("complaint");
                  requestLocation();
                }}
                className="w-full text-left p-5 border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 rounded-2xl transition flex items-center group shadow-xs"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
                  <Mic className="w-6 h-6" />
                </div>
                <div className="ml-4">
                  <h3 className="font-bold text-slate-900 group-hover:text-indigo-950 transition">Register Infrastructure Grievance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Voice recording in any Indian language or text submission</p>
                </div>
              </button>
            </div>
          )}

          {/* Complaint Form Step */}
          {step === "complaint" && (
            <div className="flex flex-col max-h-[700px] overflow-y-auto">
              <div className="p-6 sm:p-8 space-y-4">
                
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Citizen Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name" 
                    className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Target Ministry / Department</label>
                  <select 
                    value={ministry}
                    onChange={e => setMinistry(e.target.value)}
                    className="w-full p-2.5 sm:p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition text-sm"
                    required
                  >
                    <option value="" disabled>Select Concerned Ministry</option>
                    <option value="Ministry of Road Transport & Highways">Ministry of Road Transport & Highways</option>
                    <option value="Ministry of Railways">Ministry of Railways</option>
                    <option value="Ministry of Power">Ministry of Power</option>
                    <option value="Department of Water Resources, River Development & GR">Department of Water Resources, River Development & GR</option>
                    <option value="Ministry of Housing & Urban Affairs">Ministry of Housing & Urban Affairs</option>
                    <option value="Ministry of Petroleum & Natural Gas">Ministry of Petroleum & Natural Gas</option>
                    <option value="Ministry of Health & Family Welfare">Ministry of Health & Family Welfare</option>
                    <option value="Ministry of Coal">Ministry of Coal</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Complaint Details (Any Language)
                    </label>
                    <button 
                      onClick={toggleRecording}
                      type="button"
                      className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition ${
                        isRecording 
                          ? 'bg-rose-100 text-rose-700 ring-2 ring-rose-400 animate-pulse' 
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80'
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      {isRecording ? "Recording Audio..." : "Record Voice (Bilingual)"}
                    </button>
                  </div>
                  <textarea 
                    value={details}
                    onChange={e => setDetails(e.target.value)}
                    placeholder="Describe the infrastructure issue in Hindi, Bengali, Tamil, English, etc..." 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition text-sm h-32 resize-none"
                    required
                  />
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {location ? (
                    <div className="text-xs font-semibold text-emerald-700 flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-emerald-600 shrink-0" />
                      GPS Geolocation Captured ({location.lat.toFixed(4)}, {location.lon.toFixed(4)})
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-amber-700 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-amber-600 shrink-0" />
                      Requesting GPS coordinates... (Allow location permission)
                    </div>
                  )}
                </div>

                <button 
                  onClick={async () => {
                    if (!name || !ministry || !details) return alert("Please fill all fields");
                    setIsSubmitting(true);
                    try {
                      const res = await fetch('/api/submit-complaint', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, phone: mobile, details, location, ministry })
                      });
                      if (res.ok) {
                        setStep('menu');
                        alert("Grievance recorded successfully! Dispatched to the relevant ministry.");
                        window.location.href = '/dashboard';
                      } else {
                        alert("Failed to submit. Please try again.");
                      }
                    } catch (e) {
                      console.error("Submit error", e);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting || !location}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-3.5 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 text-sm"
                >
                  {isSubmitting ? "Submitting Grievance..." : <><Send className="w-4 h-4" /> Submit Grievance</>}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-[11px] text-slate-400 font-medium">
        Citizen Engagement Framework • MoSPI • Government of India
      </footer>
    </div>
  );
}
