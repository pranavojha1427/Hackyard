/**
 * Universal Agency Extractor for PragatiPulse (MoSPI SIH26103)
 * Normalizes and extracts recognized Indian infrastructure agencies
 * from project names, sectors, or raw database agency strings.
 * 
 * Client-safe and server-safe (zero Node.js dependencies).
 */

export function extractAgency(name?: string, sector?: string, existingAgency?: string): string {
  // If a valid agency already exists and is not a placeholder, clean and return it
  if (existingAgency && existingAgency.trim() !== "" && existingAgency !== "Unknown Agency") {
    const raw = existingAgency.trim();
    // Normalize bracketed tags like "[AAI]" or "[NHAI]"
    const bracketMatch = raw.match(/\[([A-Z0-9\s\-_&]+)\]/);
    if (bracketMatch && bracketMatch[1] && bracketMatch[1].length <= 15) {
      const code = bracketMatch[1].trim();
      if (!code.match(/^\d/) && !code.includes("MW") && !code.includes("KM") && !code.includes("MT")) {
        return code;
      }
    }
    // Clean long descriptive names
    if (raw.toLowerCase().includes("national highways authority of india") || raw === "NHAI") return "NHAI";
    if (raw.toLowerCase().includes("nhidcl")) return "NHIDCL";
    if (raw.toLowerCase().includes("airport authority of india") || raw === "AAI") return "AAI";
    if (raw.toLowerCase().includes("power grid corporation") || raw.toLowerCase().includes("powergrid")) return "POWERGRID";
    if (raw.toLowerCase().includes("national thermal power") || raw === "NTPC") return "NTPC";
    if (raw.toLowerCase().includes("coal india") || raw === "CIL") return "CIL";
    if (raw.toLowerCase().includes("dedicated freight corridor") || raw === "DFCCIL") return "DFCCIL";
    if (raw.toLowerCase().includes("rail vikas") || raw === "RVNL") return "RVNL";
    if (raw.toLowerCase().includes("railway") || raw.toLowerCase().includes("rail")) return "Indian Railways";
    if (raw.toLowerCase().includes("indian oil") || raw === "IOCL") return "IOCL";
    if (raw.toLowerCase().includes("bharat petroleum") || raw === "BPCL") return "BPCL";
    if (raw.toLowerCase().includes("hindustan petroleum") || raw === "HPCL") return "HPCL";
    if (raw.toLowerCase().includes("oil and natural gas") || raw === "ONGC") return "ONGC";
    if (raw.toLowerCase().includes("gas authority") || raw === "GAIL") return "GAIL";
    if (raw.toLowerCase().includes("water commission") || raw === "CWC") return "CWC";
    if (raw.toLowerCase().includes("delhi metro") || raw === "DMRC") return "DMRC";
    if (raw.toLowerCase().includes("bangalore metro") || raw === "BMRCL") return "BMRCL";
    if (raw.toLowerCase().includes("border roads") || raw === "BRO") return "BRO";
    if (raw.toLowerCase().includes("central public works") || raw === "CPWD") return "CPWD";
    if (raw.toLowerCase().includes("steel authority") || raw === "SAIL") return "SAIL";
    if (raw.toLowerCase().includes("telecom") || raw.toLowerCase().includes("bsnl")) return "BSNL";
    return raw;
  }

  const n = (name || "").toLowerCase();
  
  // Check brackets in project name, e.g. "4-Laning of NH-33 [NHAI]"
  const bm = (name || "").match(/\[([A-Z0-9\s\-_&]+)\]/);
  if (bm && bm[1] && bm[1].length <= 15) {
    const val = bm[1].trim();
    if (!val.match(/^\d/) && !val.includes("MW") && !val.includes("KM") && !val.includes("MT")) {
      return val;
    }
  }

  // Agency keywords from project title
  if (n.includes("airport authority") || n.includes("aai") || n.includes("airport")) return "AAI";
  if (n.includes("nhai") || n.includes("national highway") || n.includes("expressway") || n.includes("nh-")) return "NHAI";
  if (n.includes("nhidcl")) return "NHIDCL";
  if (n.includes("dfccil") || n.includes("dedicated freight")) return "DFCCIL";
  if (n.includes("rvnl") || n.includes("rail vikas")) return "RVNL";
  if (n.includes("ircon")) return "IRCON";
  if (n.includes("railway") || n.includes("rail") || n.includes("track") || n.includes("gauge conversion")) return "Indian Railways";
  if (n.includes("ntpc") || n.includes("thermal power")) return "NTPC";
  if (n.includes("nhpc") || n.includes("hydroelectric")) return "NHPC";
  if (n.includes("powergrid") || n.includes("pgcil") || n.includes("substation") || n.includes("transmission")) return "POWERGRID";
  if (n.includes("iocl") || n.includes("indian oil") || n.includes("refinery")) return "IOCL";
  if (n.includes("gail") || n.includes("gas pipeline")) return "GAIL";
  if (n.includes("bpcl") || n.includes("bharat petroleum")) return "BPCL";
  if (n.includes("hpcl") || n.includes("hindustan petroleum")) return "HPCL";
  if (n.includes("ongc")) return "ONGC";
  if (n.includes("secl")) return "SECL";
  if (n.includes("mcl")) return "MCL";
  if (n.includes("wcl")) return "WCL";
  if (n.includes("ccl")) return "CCL";
  if (n.includes("bccl")) return "BCCL";
  if (n.includes("coal india") || n.includes("cil") || n.includes("coal mine")) return "CIL";
  if (n.includes("sail") || n.includes("steel plant") || n.includes("steel authority")) return "SAIL";
  if (n.includes("bmrcl") || n.includes("bangalore metro")) return "BMRCL";
  if (n.includes("dmrc") || n.includes("delhi metro")) return "DMRC";
  if (n.includes("mmrda") || n.includes("mumbai metro")) return "MMRDA";
  if (n.includes("adani")) return "Adani Infrastructure";
  if (n.includes("cwc") || n.includes("water commission") || n.includes("barrage") || n.includes("dam")) return "CWC";
  if (n.includes("cpwd") || n.includes("central public works")) return "CPWD";
  if (n.includes("bro") || n.includes("border roads")) return "BRO";
  if (n.includes("telecom") || n.includes("bsnl") || n.includes("optical fibre")) return "BSNL";
  if (n.includes("hospital") || n.includes("aiims") || n.includes("medical")) return "AIIMS";

  // Derive by Sector
  const s = (sector || "").toLowerCase();
  if (s.includes("aviation") || s.includes("airport")) return "AAI";
  if (s.includes("road") || s.includes("highway")) return "NHAI";
  if (s.includes("rail")) return "Indian Railways";
  if (s.includes("power") || s.includes("generation")) return "NTPC";
  if (s.includes("transmission") || s.includes("grid")) return "POWERGRID";
  if (s.includes("petroleum") || s.includes("oil") || s.includes("gas")) return "IOCL";
  if (s.includes("coal")) return "CIL";
  if (s.includes("urban") || s.includes("metro")) return "DMRC";
  if (s.includes("water") || s.includes("irrigation")) return "CWC";
  if (s.includes("telecom") || s.includes("communication")) return "BSNL";
  if (s.includes("health")) return "AIIMS";

  return "NHAI";
}

export const FALLBACK_AGENCY_RANKINGS = [
  { agency: "NHAI", total_projects: 1033, delayed_project_count: 271, delay_frequency_pct: 26.2, avg_cost_overrun_pct: 14.5 },
  { agency: "NHIDCL", total_projects: 172, delayed_project_count: 55, delay_frequency_pct: 32.0, avg_cost_overrun_pct: 18.2 },
  { agency: "Indian Railways", total_projects: 113, delayed_project_count: 48, delay_frequency_pct: 42.5, avg_cost_overrun_pct: 22.8 },
  { agency: "CWC", total_projects: 76, delayed_project_count: 26, delay_frequency_pct: 34.2, avg_cost_overrun_pct: 16.4 },
  { agency: "POWERGRID", total_projects: 57, delayed_project_count: 4, delay_frequency_pct: 7.0, avg_cost_overrun_pct: 5.2 },
  { agency: "IOCL", total_projects: 51, delayed_project_count: 8, delay_frequency_pct: 15.7, avg_cost_overrun_pct: 8.9 },
  { agency: "CIL", total_projects: 46, delayed_project_count: 14, delay_frequency_pct: 30.4, avg_cost_overrun_pct: 19.1 },
  { agency: "DFCCIL", total_projects: 42, delayed_project_count: 18, delay_frequency_pct: 42.8, avg_cost_overrun_pct: 29.0 },
  { agency: "AAI", total_projects: 25, delayed_project_count: 5, delay_frequency_pct: 20.0, avg_cost_overrun_pct: 10.5 },
  { agency: "NTPC", total_projects: 15, delayed_project_count: 2, delay_frequency_pct: 13.3, avg_cost_overrun_pct: 7.4 },
  { agency: "RVNL", total_projects: 16, delayed_project_count: 6, delay_frequency_pct: 37.5, avg_cost_overrun_pct: 21.0 },
  { agency: "SAIL", total_projects: 12, delayed_project_count: 3, delay_frequency_pct: 25.0, avg_cost_overrun_pct: 12.0 },
  { agency: "DMRC", total_projects: 7, delayed_project_count: 1, delay_frequency_pct: 14.3, avg_cost_overrun_pct: 6.8 }
];
