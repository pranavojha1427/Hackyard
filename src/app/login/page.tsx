"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Activity, ShieldCheck, ArrowRight, Loader2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid email or password.");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError("Network or server connection failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen gov-bg-pattern flex flex-col justify-between">
      {/* Top Tricolor Accent Bar */}
      <div className="h-1.5 w-full gov-tricolor-gradient" />

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 relative overflow-hidden">
          
          {/* Subtle decorative glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-700 via-blue-600 to-indigo-900 text-white shadow-lg shadow-indigo-600/25 mb-3 ring-4 ring-indigo-50">
              <Activity className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Pragati<span className="text-indigo-600">Pulse</span>
            </h1>
            <p className="mt-1 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              MoSPI Official Authentication Gateway
            </p>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Government Email / ID
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" 
                  type="email" 
                  placeholder="admin@pragatipulse.gov.in"
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" 
                  type="password" 
                  placeholder="••••••••"
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading} 
              className="w-full bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white py-3 rounded-xl font-bold text-sm hover:from-slate-800 hover:to-indigo-900 transition shadow-md shadow-slate-900/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                <>
                  Sign in to Portal
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>New user?</span>
            <Link href="/signup" className="font-bold text-indigo-600 hover:text-indigo-800 underline">
              Create an account
            </Link>
          </div>

          {/* Field Operations Card */}
          <div className="mt-5 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-900">Field Operations</p>
              <p className="text-[11px] text-indigo-700">Dedicated geo-tagging & audit portal</p>
            </div>
            <Link 
              href="/inspector" 
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition shadow-xs"
            >
              Inspector
            </Link>
          </div>

          {/* Return to Dashboard */}
          <div className="mt-4 text-center">
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Overview
            </Link>
          </div>

        </div>
      </div>

      {/* Footer line */}
      <footer className="text-center py-4 text-[11px] text-slate-400 font-medium">
        Ministry of Statistics and Programme Implementation • Government of India
      </footer>
    </main>
  );
}
