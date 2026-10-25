import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getLocalComplaints } from '@/lib/citizen-store';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const state = searchParams.get('state');

    // 1. Fetch Supabase complaints
    let query = supabase
      .from('citizen_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (state && state !== 'All States') {
      query = query.eq('state', state);
    }

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 3500)
    );

    const { data: supaData } = await Promise.race([query, timeoutPromise]);

    // 2. Fetch local complaints
    const localData = getLocalComplaints();

    // 3. Merge & deduplicate
    const complaintsMap = new Map<string, any>();

    (supaData || []).forEach((c: any) => {
      const key = `${c.hashed_phone || ''}:::${(c.raw_text || '').slice(0, 30)}`;
      complaintsMap.set(key, c);
    });

    localData.forEach(lc => {
      const key = `${lc.hashed_phone || ''}:::${(lc.raw_text || '').slice(0, 30)}`;
      if (!complaintsMap.has(key)) {
        if (!state || state === 'All States' || lc.state === state) {
          complaintsMap.set(key, lc);
        }
      }
    });

    const combined = Array.from(complaintsMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({
      success: true,
      complaints: combined
    });
  } catch (err: any) {
    console.error("GET /api/complaints error:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
