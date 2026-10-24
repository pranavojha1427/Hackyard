 "use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed.");
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border-2 border-slate-900 p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.15)]">
        <h1 className="text-3xl font-black tracking-tight">PragatiPulse</h1>
        <p className="mt-1 text-sm text-slate-500 font-mono uppercase">Secure portal login</p>

        <form onSubmit={submit} className="mt-8 space-y-5">
          <label className="block text-sm font-semibold">
            Email
            <input className="mt-2 w-full border border-slate-300 p-3 outline-none focus:border-emerald-500" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm font-semibold">
            Password
            <input className="mt-2 w-full border border-slate-300 p-3 outline-none focus:border-emerald-500" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>

          {error && <p className="bg-red-50 border border-red-200 text-red-700 p-3 text-sm">{error}</p>}

          <button disabled={loading} className="w-full bg-slate-900 text-white p-3 font-bold disabled:opacity-50">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          New user? <Link href="/signup" className="font-bold underline">Create an account</Link>
        </p>

        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500 font-mono uppercase mb-3">Field Operations</p>
          <Link href="/inspector" className="w-full inline-block text-center border-2 border-indigo-600 text-indigo-700 bg-indigo-50 font-bold p-3 hover:bg-indigo-100 transition">
            Inspector Field Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
