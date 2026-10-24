/**
 * Universal Agency Extractor for PragatiPulse (MoSPI SIH26103)
 * Normalizes and extracts recognized Indian infrastructure agencies
 * from project names, sectors, or raw database agency strings.
 * 
 * Client-safe and server-safe (zero Node.js dependencies).
 */

export function extractAgency(name?: string, sector?: string, existingAgency?: string): string {
  let ag = existingAgency && existingAgency.trim() !== "" && existingAgency !== "Unknown Agency" 
    ? existingAgency.trim() 
    : null;
  const n = (name || "").trim();

  if (!ag && n) {
    const parenMatches = [...n.matchAll(/\(([^)]+)\)/g)].map(m => m[1].trim());
    const cleanParens = parenMatches.filter(m => {
      if (!m || m === "-" || m === "--") return false;
      if (/^[A-Z]\d{6,10}$/i.test(m)) return false;
      if (/^\d+$/.test(m)) return false;
      const lower = m.toLowerCase();
      if (["agency", "project code", "legacy ocms code", "pmgid", "package-1", "phase-i", "phase-ii", "phase-1", "phase-2", "phase i", "phase ii"].includes(lower)) return false;
      return true;
    });

    for (const c of cleanParens) {
      if (c.length >= 2 && c.length <= 80) {
        if (c.includes("Authority") || c.includes("Limited") || c.includes("Corporation") || c.includes("Railway") || 
            c.includes("Ministry") || c.includes("Department") || c.includes("Board") || c.includes("Institute") ||
            c.includes("NHAI") || c.includes("NHIDCL") || c.includes("MoRTH") || c.includes("POWERGRID") ||
            c.includes("NTPC") || c.includes("ONGC") || c.includes("IOCL") || c.includes("BPCL") || c.includes("HPCL") ||
            c.includes("GAIL") || c.includes("CIL") || c.includes("BCCL") || c.includes("CCL") || c.includes("ECL") ||
            c.includes("WCL") || c.includes("SECL") || c.includes("MCL") || c.includes("NCL") || c.includes("SCCL") ||
            c.includes("SAIL") || c.includes("RVNL") || c.includes("DFCCIL") || c.includes("DMRC") || c.includes("BMRCL") ||
            c.includes("BRO") || c.includes("CPWD") || c.includes("AIIMS") || c.includes("NIT") || c.includes("IIT") ||
            c.includes("Metro") || c.includes("Adani") || c.includes("Port") || c.includes("Railways")) {
          ag = c;
          break;
        }
      }
    }

    if (!ag && cleanParens.length > 0) {
      ag = cleanParens[0];
    }
  }

  // Check brackets like [NHAI], [AAI], [BCCL] if still missing
  if (!ag && n) {
    const bracketMatches = [...n.matchAll(/\[([^\]]+)\]/g)].map(m => m[1].trim());
    for (const b of bracketMatches) {
      if (!/^\d+$/.test(b) && !b.includes("Phase") && !b.includes("MW") && !b.includes("KM") && b.length <= 25) {
        ag = b;
        break;
      }
    }
  }

  // Specific domain inferences from title
  const nl = n.toLowerCase();
  const sec = (sector || "").toLowerCase();
  if (nl.includes("zojila") || nl.includes("z-morh") || nl.includes("sardp") || nl.includes("nhidcl")) return "National Highways & Infrastructure Development Corp [NHIDCL]";
  if (nl.includes("iwai") || sec.includes("inland waterways") || nl.includes("waterway") || nl.includes("national waterway")) return "Inland Waterways Authority of India [IWAI]";
  if (nl.includes("baghjan") || nl.includes("nadua") || nl.includes("khagorija") || nl.includes("oil india")) return "Oil India Limited [OIL]";
  if (nl.includes("kandla lpg") || nl.includes("panipat") || nl.includes("paradip") || nl.includes("iocl")) return "Indian Oil Corporation Limited [IOCL]";
  if (nl.includes("mumbai refinery") || nl.includes("captive consumption at mr") || nl.includes("hpcl")) return "Hindustan Petroleum Corporation Limited [HPCL]";
  if (nl.includes("teesta") || nl.includes("nhpc")) return "NHPC Limited";
  if (nl.includes("raghunathpur") || nl.includes("dvc") || nl.includes("damodar valley")) return "Damodar Valley Corporation [DVC]";
  if (nl.includes("nit, delhi") || nl.includes("iim amritsar") || nl.includes("hostel") || nl.includes("academic block") || nl.includes("cpwd")) return "Central Public Works Department [CPWD]";
  if (nl.includes("clean ganga") || nl.includes("nmcg")) return "National Mission for Clean Ganga [NMCG]";

  // Canonicalize common agency acronyms and variants
  if (ag) {
    const l = ag.toLowerCase();
    if (l.includes("ecl - cil")) return "Eastern Coalfields Limited [ECL]";
    if (l.includes("bccl - cil")) return "Bharat Coking Coal Limited [BCCL]";
    if (l.includes("ccl - cil")) return "Central Coalfields Limited [CCL]";
    if (l.includes("wcl - cil")) return "Western Coalfields Limited [WCL]";
    if (l.includes("secl - cil")) return "South Eastern Coalfields Limited [SECL]";
    if (l.includes("mcl - cil")) return "Mahanadi Coalfields Limited [MCL]";
    if (l.includes("ncl - cil")) return "Northern Coalfields Limited [NCL]";
    if (l.includes("rvnl - i") || l.includes("rvnl - ii") || l.includes("rvnl")) return "Rail Vikas Nigam Limited [RVNL]";
    if (l.includes("ministryofpetroleumnaturalgas") || l.includes("ministry of petroleum")) return "Ministry of Petroleum & Natural Gas";
    if (l.includes("ministry of coal") || l.includes("mis mocoal")) return "Ministry of Coal";
    if (l.includes("clean ganga") || l.includes("nmcg")) return "National Mission for Clean Ganga [NMCG]";
    if (l.includes("damodar valley") || l.includes("[dvc]")) return "Damodar Valley Corporation [DVC]";

    if (l.includes("national highways authority") || l === "nhai" || l.includes("[nhai]")) return "National Highways Authority of India [NHAI]";
    if (l.includes("nhidcl")) return "National Highways & Infrastructure Development Corp [NHIDCL]";
    if (l.includes("morth") || l.includes("road transport & highways")) return "Ministry of Road Transport & Highways [MoRTH]";
    if (l.includes("airport authority") || l === "aai" || l.includes("[aai]")) return "Airports Authority of India [AAI]";
    if (l.includes("power grid") || l.includes("powergrid") || l.includes("[powergrid]")) return "Power Grid Corporation of India [POWERGRID]";
    if (l.includes("national thermal power") || l === "ntpc" || l.includes("[ntpc]")) return "NTPC Limited";
    if (l.includes("western coalfields") || l === "wcl" || l.includes("[wcl]")) return "Western Coalfields Limited [WCL]";
    if (l.includes("eastern coalfields") || l === "ecl" || l.includes("[ecl]")) return "Eastern Coalfields Limited [ECL]";
    if (l.includes("bharat coking coal") || l === "bccl" || l.includes("[bccl]")) return "Bharat Coking Coal Limited [BCCL]";
    if (l.includes("central coalfields") || l === "ccl" || l.includes("[ccl]")) return "Central Coalfields Limited [CCL]";
    if (l.includes("south eastern coalfields") || l === "secl" || l.includes("[secl]")) return "South Eastern Coalfields Limited [SECL]";
    if (l.includes("mahanadi coalfields") || l === "mcl" || l.includes("[mcl]")) return "Mahanadi Coalfields Limited [MCL]";
    if (l.includes("northern coalfields") || l === "ncl" || l.includes("[ncl]")) return "Northern Coalfields Limited [NCL]";
    if (l.includes("coal india") || l === "cil" || l.includes("[cil]")) return "Coal India Limited [CIL]";
    if (l.includes("steel authority") || l === "sail" || l.includes("[sail]")) return "Steel Authority of India Limited [SAIL]";
    if (l.includes("oil and natural gas") || l === "ongc" || l.includes("[ongc]")) return "Oil and Natural Gas Corporation [ONGC]";
    if (l.includes("indian oil") || l === "iocl" || l.includes("[iocl]")) return "Indian Oil Corporation Limited [IOCL]";
    if (l.includes("bharat petroleum") || l === "bpcl" || l.includes("[bpcl]")) return "Bharat Petroleum Corporation Limited [BPCL]";
    if (l.includes("hindustan petroleum") || l === "hpcl" || l.includes("[hpcl]")) return "Hindustan Petroleum Corporation Limited [HPCL]";
    if (l.includes("gas authority") || l === "gail" || l.includes("[gail]")) return "GAIL (India) Limited";
    if (l.includes("rail vikas") || l === "rvnl" || l.includes("[rvnl]")) return "Rail Vikas Nigam Limited [RVNL]";
    if (l.includes("dedicated freight") || l === "dfccil" || l.includes("[dfccil]")) return "Dedicated Freight Corridor Corp [DFCCIL]";
    if (l.includes("delhi metro") || l === "dmrc" || l.includes("[dmrc]")) return "Delhi Metro Rail Corporation [DMRC]";
    if (l.includes("bengaluru metro") || l.includes("bangalore metro") || l === "bmrcl" || l.includes("[bmrcl]")) return "Bangalore Metro Rail Corporation [BMRCL]";
    if (l.includes("central public works") || l === "cpwd" || l.includes("[cpwd]")) return "Central Public Works Department [CPWD]";
    if (l.includes("border roads") || l === "bro" || l.includes("[bro]")) return "Border Roads Organisation [BRO]";
    if (l.includes("central railway") || l === "cr" || l.includes("[cr]")) return "Central Railway";
    if (l.includes("eastern railway") || l === "er" || l.includes("[er]")) return "Eastern Railway";
    if (l.includes("northern railway") || l === "nr" || l.includes("[nr]")) return "Northern Railway";
    if (l.includes("southern railway") || l === "sr" || l.includes("[sr]")) return "Southern Railway";
    if (l.includes("western railway") || l === "wr" || l.includes("[wr]")) return "Western Railway";
    if (l.includes("east central railway") || l.includes("[ecr]")) return "East Central Railway";
    if (l.includes("east coast railway") || l.includes("[ecor]")) return "East Coast Railway";
    if (l.includes("north central railway") || l.includes("[ncr]")) return "North Central Railway";
    if (l.includes("north eastern railway") || l.includes("[ner]")) return "North Eastern Railway";
    if (l.includes("northeast frontier railway") || l.includes("[nfr]")) return "Northeast Frontier Railway";
    if (l.includes("north western railway") || l.includes("[nwr]")) return "North Western Railway";
    if (l.includes("south central railway") || l.includes("[scr]")) return "South Central Railway";
    if (l.includes("south eastern railway") || l.includes("[ser]")) return "South Eastern Railway";
    if (l.includes("south east central railway") || l.includes("[secr]")) return "South East Central Railway";
    if (l.includes("south western railway") || l.includes("[swr]")) return "South Western Railway";
    if (l.includes("west central railway") || l.includes("[wcr]")) return "West Central Railway";
    if (l.includes("konkan railway") || l.includes("[krcl]")) return "Konkan Railway Corporation";
    if (l.includes("kolkata metro") || l.includes("metro railway, kolkata")) return "Kolkata Metro";
    return ag;
  }

  // Keyword inferences from title
  if (nl.includes("nhai") || nl.includes("national highway") || nl.includes("greenfield") || nl.includes("expressway") || nl.includes("access controlled") || nl.includes("4l") || nl.includes("6l") || nl.includes("four lane") || nl.includes("six lane") || nl.includes("flyover") || nl.includes("nh-")) return "National Highways Authority of India [NHAI]";
  if (nl.includes("morth") || sec.includes("road") || sec.includes("highway") || nl.includes("widening") || nl.includes("paved shoulder") || nl.includes("rehabilitation") || nl.includes("up-gradation")) return "Ministry of Road Transport & Highways [MoRTH]";
  if (nl.includes("airport") || nl.includes("aai") || nl.includes("taxi track") || nl.includes("apron") || nl.includes("ntb complex") || nl.includes("atm automation")) return "Airports Authority of India [AAI]";
  if (nl.includes("powergrid") || nl.includes("transmission")) return "Power Grid Corporation of India [POWERGRID]";
  if (nl.includes("ntpc")) return "NTPC Limited";
  if (nl.includes("coal") || nl.includes("mine")) return "Coal India Limited [CIL]";
  if (nl.includes("metro")) return "Metro Rail Corporation";
  if (nl.includes("railway") || nl.includes("rail") || sec.includes("rail")) return "Indian Railways";
  if (nl.includes("water") || nl.includes("dam") || nl.includes("barrage") || sec.includes("water")) return "Central Water Commission [CWC]";
  if (nl.includes("hospital") || nl.includes("aiims")) return "AIIMS / Health Ministry";
  if (nl.includes("iit") || nl.includes("nit") || nl.includes("university") || sec.includes("education")) return "Ministry of Education";
  if (nl.includes("petroleum") || nl.includes("refinery") || nl.includes("pipeline") || sec.includes("oil") || sec.includes("gas")) return "Oil and Natural Gas Corporation [ONGC]";

  return "State Infrastructure Agency";
}

export const FALLBACK_AGENCY_RANKINGS = [
  { agency: "National Highways Authority of India [NHAI]", total_projects: 585, delayed_project_count: 136, delay_frequency_pct: 23.2, avg_cost_overrun_pct: 0.8 },
  { agency: "Ministry of Road Transport & Highways [MoRTH]", total_projects: 359, delayed_project_count: 21, delay_frequency_pct: 5.8, avg_cost_overrun_pct: 1.2 },
  { agency: "National Highways & Infrastructure Development Corp [NHIDCL]", total_projects: 179, delayed_project_count: 11, delay_frequency_pct: 6.1, avg_cost_overrun_pct: 2.7 },
  { agency: "Central Railway", total_projects: 68, delayed_project_count: 26, delay_frequency_pct: 38.2, avg_cost_overrun_pct: 46.8 },
  { agency: "Power Grid Corporation of India [POWERGRID]", total_projects: 67, delayed_project_count: 2, delay_frequency_pct: 3.0, avg_cost_overrun_pct: 1.9 },
  { agency: "Western Railway", total_projects: 44, delayed_project_count: 10, delay_frequency_pct: 22.7, avg_cost_overrun_pct: 33.0 },
  { agency: "Oil and Natural Gas Corporation [ONGC]", total_projects: 43, delayed_project_count: 7, delay_frequency_pct: 16.3, avg_cost_overrun_pct: 9.8 },
  { agency: "Western Coalfields Limited [WCL]", total_projects: 32, delayed_project_count: 0, delay_frequency_pct: 0.0, avg_cost_overrun_pct: 0.0 },
  { agency: "Eastern Coalfields Limited [ECL]", total_projects: 31, delayed_project_count: 0, delay_frequency_pct: 0.0, avg_cost_overrun_pct: 0.0 },
  { agency: "Airports Authority of India [AAI]", total_projects: 27, delayed_project_count: 4, delay_frequency_pct: 14.8, avg_cost_overrun_pct: 5.3 },
  { agency: "Ministry of Coal", total_projects: 21, delayed_project_count: 0, delay_frequency_pct: 0.0, avg_cost_overrun_pct: 0.0 },
  { agency: "Ministry of Petroleum & Natural Gas", total_projects: 21, delayed_project_count: 3, delay_frequency_pct: 14.3, avg_cost_overrun_pct: 7.9 },
  { agency: "East Coast Railway", total_projects: 20, delayed_project_count: 4, delay_frequency_pct: 20.0, avg_cost_overrun_pct: 7.8 },
  { agency: "Indian Oil Corporation Limited [IOCL]", total_projects: 19, delayed_project_count: 7, delay_frequency_pct: 36.8, avg_cost_overrun_pct: 15.6 },
  { agency: "Rail Vikas Nigam Limited [RVNL]", total_projects: 18, delayed_project_count: 6, delay_frequency_pct: 33.3, avg_cost_overrun_pct: 8.6 },
  { agency: "Steel Authority of India Limited [SAIL]", total_projects: 12, delayed_project_count: 3, delay_frequency_pct: 25.0, avg_cost_overrun_pct: 11.8 }
];
