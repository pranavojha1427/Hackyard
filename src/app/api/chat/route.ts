import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from "@/lib/auth";
import { getMongoProjects, getProjectOverrides, applyProjectOverrides } from "@/lib/project-store";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ response: "Unauthorized" }, { status: 401 });

    const { message } = await req.json();

    // 1. Fetch base Supabase data
    let supaQuery = supabase.from('projects').select('*').limit(2000);
    if (session.role === "ministry" && session.ministry) {
      supaQuery = supaQuery.ilike('ministry', `%${session.ministry}%`);
    } else if (session.role === "agency" && session.agency) {
      supaQuery = supaQuery.ilike('agency', `%${session.agency}%`);
    }

    const { data: supaProjects, error } = await supaQuery;
    if (error) console.error("Supabase Error:", error);

    // 2. Fetch overrides and custom MongoDB projects
    const overrides = await getProjectOverrides((supaProjects || []).map(p => p.id));
    const mergedSupa = applyProjectOverrides(supaProjects || [], overrides);
    const mongoProjects = await getMongoProjects(undefined);
    
    let allProjects = [...mergedSupa, ...mongoProjects];
    
    // 3. Filter custom projects based on RBAC
    if (session.role === "ministry" && session.ministry) {
      allProjects = allProjects.filter(p => p.ministry?.toLowerCase() === session.ministry!.toLowerCase());
    } else if (session.role === "agency" && session.agency) {
      allProjects = allProjects.filter(p => p.agency === session.agency);
    }

    // 4. Build ministry-level aggregates
    const ministryAgg: Record<string, { count: number; original: number; revised: number; expenditure: number }> = {};
    for (const p of allProjects) {
      const m = p.ministry || 'Other';
      if (!ministryAgg[m]) ministryAgg[m] = { count: 0, original: 0, revised: 0, expenditure: 0 };
      ministryAgg[m].count++;
      ministryAgg[m].original += Number(p.original_cost) || 0;
      ministryAgg[m].revised += Number(p.revised_cost) || Number(p.original_cost) || 0;
      ministryAgg[m].expenditure += Number(p.cumulative_expenditure) || 0;
    }

    // 5. Smart Keyword Matching for Project Injection
    const lowerMessage = message.toLowerCase();
    
    // Attempt to score and rank projects based on relevance to the user's query
    // E.g. if message contains "assam" and "railway", boost projects matching those.
    const scoredProjects = allProjects.map(p => {
      let score = 0;
      if (p.state && lowerMessage.includes(p.state.toLowerCase())) score += 50;
      if (p.sector && lowerMessage.includes(p.sector.toLowerCase())) score += 30;
      if (p.ministry && lowerMessage.includes(p.ministry.toLowerCase())) score += 30;
      if (p.project_name && lowerMessage.includes(p.project_name.toLowerCase())) score += 20;
      
      // If asking about cost overruns, boost those with high overruns
      const orig = Number(p.original_cost) || 0;
      const rev = Number(p.revised_cost) || orig;
      const overrunPct = orig > 0 ? ((rev - orig) / orig) * 100 : 0;
      
      if ((lowerMessage.includes("overrun") || lowerMessage.includes("cost")) && overrunPct > 0) {
          score += Math.min(overrunPct, 50); // Add up to 50 points based on overrun severity
      }
      if (lowerMessage.includes("delay") || lowerMessage.includes("critical")) {
          // Add score if progress is low but expenditure is high, or just generally flag it
          score += 20; 
      }
      return { ...p, score, overrunPct };
    });
    
    // Sort by score (desc) and take the top 20 most relevant projects to fit in context window
    const relevantProjects = scoredProjects.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 20);
    
    let specificData = '';
    if (relevantProjects.length > 0) {
      specificData = `\n\nRelevant Project Data for Query:\n`;
      specificData += relevantProjects.map(p => 
        `- [${p.project_name}] Sector: ${p.sector}, State: ${p.state}, Ministry: ${p.ministry}, Original Cost: ${p.original_cost}Cr, Revised Cost: ${p.revised_cost}Cr, Overrun: ${p.overrunPct.toFixed(1)}%, Expenditure: ${p.cumulative_expenditure}Cr, Progress: ${p.physical_progress}%`
      ).join('\n');
    } else {
      // Fallback: If no specific keywords matched, just provide top 10 worst overruns overall
      const worstProjects = scoredProjects.sort((a, b) => b.overrunPct - a.overrunPct).slice(0, 10);
      specificData = `\n\nTop 10 Projects with Highest Cost Overruns:\n`;
      specificData += worstProjects.map(p => 
        `- [${p.project_name}] Sector: ${p.sector}, State: ${p.state}, Ministry: ${p.ministry}, Original Cost: ${p.original_cost}Cr, Revised Cost: ${p.revised_cost}Cr, Overrun: ${p.overrunPct.toFixed(1)}%`
      ).join('\n');
    }

    // 6. Aggregate totals
    const totalOriginal = allProjects.reduce((s, p) => s + (Number(p.original_cost) || 0), 0);
    const totalRevised = allProjects.reduce((s, p) => s + (Number(p.revised_cost) || Number(p.original_cost) || 0), 0);
    const totalExpenditure = allProjects.reduce((s, p) => s + (Number(p.cumulative_expenditure) || 0), 0);

    const ministryStr = Object.entries(ministryAgg)
      .sort((a, b) => b[1].original - a[1].original)
      .map(([m, d]) => `${m}: ${d.count} projects, O=${d.original.toFixed(0)}, R=${d.revised.toFixed(0)}, E=${d.expenditure.toFixed(0)}`)
      .join('\n');

    // 7. Dynamic RBAC Prompt
    const roleNotice = session.role === 'admin' 
      ? 'You have full unrestricted access to all MoSPI data.' 
      : `Due to privacy policies, you are ONLY allowed to see and discuss data belonging to their specific ${session.role}. The data provided below has already been strictly filtered for them. If they ask about other ministries or agencies, inform them they do not have clearance.`;

    const systemPrompt = `You are the MoSPI Intelligence Assistant. All monetary values in INR Crores.
You are talking to a user with role: ${session.role.toUpperCase()} (Name: ${session.name}, Organization: ${session.agency || session.ministry || 'System Admin'}).
${roleNotice}

Total Accessible Portfolio: ${allProjects.length} projects, Original Cost: ${totalOriginal.toFixed(0)} Cr, Revised Cost: ${totalRevised.toFixed(0)} Cr, Cumulative Expenditure: ${totalExpenditure.toFixed(0)} Cr.

${session.role !== 'agency' ? `Ministry breakdown:\n${ministryStr}` : ''}${specificData}
Answer using Markdown with tables if useful. Be analytical, professional, and clear.
Provide deep intelligence based solely on the provided project context.`;

    // 8. Fetch from Gemini AI (Google)
    let res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GOOGLE_API_KEY!
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          { parts: [{ text: message }] }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096, // Huge token limit
        }
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Gemini API Error:", res.status, errText);
      throw new Error(`Gemini API error: ${res.status}`);
    }
    const data = await res.json();
    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
    
    console.log("Final ResponseText:", responseText);
    return NextResponse.json({ response: responseText });
  } catch (error: any) {
    console.error("Chat error:", error);
    return NextResponse.json({ response: `**Error:** ${error.message}` }, { status: 500 });
  }
}
