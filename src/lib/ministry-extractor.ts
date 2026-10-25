export const ALL_MINISTRIES = [
  "Department for Promotion of Industry & Internal Trade",
  "Department of Higher Education",
  "Department of Sports",
  "Department of Telecommunications",
  "Department of Water Resources, River Development & GR",
  "Ministry of Chemicals and Fertilizers",
  "Ministry of Civil Aviation",
  "Ministry of Coal",
  "Ministry of Health & Family Welfare",
  "Ministry of Housing & Urban Affairs",
  "Ministry of Labour and Employment",
  "Ministry of Mines",
  "Ministry of New & Renewable Energy",
  "Ministry of Petroleum & Natural Gas",
  "Ministry of Ports, Shipping and Waterways",
  "Ministry of Power",
  "Ministry of Railways",
  "Ministry of Road Transport & Highways",
  "Ministry of Steel"
];

/**
 * Maps any project sector, agency, and title to its official Government of India Ministry.
 */
export function extractMinistry(
  sector?: string | null,
  agency?: string | null,
  projectName?: string | null,
  assignedMinistry?: string | null
): string {
  if (assignedMinistry && assignedMinistry.trim().length > 0 && assignedMinistry !== "Other") {
    return assignedMinistry.trim();
  }

  const s = (sector || "").toLowerCase();
  const a = (agency || "").toLowerCase();
  const p = (projectName || "").toLowerCase();

  // 1. Roads, Highways & National Expressways
  if (
    s.includes("road") ||
    s.includes("highway") ||
    a.includes("nhai") ||
    a.includes("nhidcl") ||
    a.includes("morth") ||
    p.includes("expressway") ||
    p.includes("highway") ||
    p.includes("nh-")
  ) {
    return "Ministry of Road Transport & Highways";
  }

  // 2. Railways & Dedicated Freight Corridors
  if (
    s.includes("rail") ||
    a.includes("railway") ||
    a.includes("rvnl") ||
    a.includes("ircon") ||
    a.includes("dfccil") ||
    a.includes("mrts") ||
    p.includes("railway") ||
    p.includes("line doubling") ||
    p.includes("broad gauge")
  ) {
    return "Ministry of Railways";
  }

  // 3. Urban Public Transport, Metros & Urban Infrastructure
  if (
    s.includes("urban public transport") ||
    s.includes("construction") ||
    a.includes("dmrc") ||
    a.includes("kmrl") ||
    a.includes("bmrcl") ||
    a.includes("cmrl") ||
    a.includes("mmrda") ||
    p.includes("metro") ||
    p.includes("smart city")
  ) {
    return "Ministry of Housing & Urban Affairs";
  }

  // 4. Coal & Lignite Extraction
  if (
    s.includes("coal") ||
    a.includes("coal") ||
    a.includes("cfl") ||
    a.includes("cil") ||
    a.includes("secl") ||
    a.includes("wcl") ||
    a.includes("ecl") ||
    a.includes("mccl") ||
    a.includes("bccil") ||
    p.includes("ocp") ||
    p.includes("coal")
  ) {
    return "Ministry of Coal";
  }

  // 5. Petroleum, Natural Gas, Oil Pipelines & Refineries
  if (
    s.includes("oil") ||
    s.includes("gas") ||
    s.includes("petroleum") ||
    a.includes("ongc") ||
    a.includes("iocl") ||
    a.includes("bpcl") ||
    a.includes("hpcl") ||
    a.includes("gail") ||
    p.includes("pipeline") ||
    p.includes("refinery")
  ) {
    return "Ministry of Petroleum & Natural Gas";
  }

  // 6. Power, Hydroelectric, Thermal, Grid Transmission & Energy Storage
  if (
    s.includes("electricity") ||
    s.includes("energy storage") ||
    s.includes("transmission") ||
    s.includes("power") ||
    a.includes("ntpc") ||
    a.includes("pgcil") ||
    a.includes("powergrid") ||
    a.includes("nhpc") ||
    a.includes("sjvn") ||
    a.includes("neepco") ||
    a.includes("thdc") ||
    a.includes("dvc") ||
    p.includes("thermal") ||
    p.includes("substation")
  ) {
    return "Ministry of Power";
  }

  // 7. Water Resources, River Development & Ganga Rejuvenation
  if (
    s.includes("water resources") ||
    s.includes("waste & water") ||
    s.includes("irrigation") ||
    a.includes("nwda") ||
    a.includes("cwc") ||
    p.includes("barrage") ||
    p.includes("canal") ||
    p.includes("dam")
  ) {
    return "Department of Water Resources, River Development & GR";
  }

  // 8. Ports, Shipping and Inland Waterways
  if (
    s.includes("inland waterways") ||
    s.includes("port") ||
    s.includes("shipping") ||
    a.includes("iwai") ||
    p.includes("terminal") ||
    p.includes("waterway")
  ) {
    return "Ministry of Ports, Shipping and Waterways";
  }

  // 9. Civil Aviation & Airports
  if (
    s.includes("aviation") ||
    s.includes("airport") ||
    a.includes("aai") ||
    p.includes("airport") ||
    p.includes("runway")
  ) {
    return "Ministry of Civil Aviation";
  }

  // 10. Healthcare & Family Welfare
  if (
    s.includes("health") ||
    s.includes("hospital") ||
    a.includes("aiims") ||
    p.includes("aiims") ||
    p.includes("hospital") ||
    p.includes("medical college")
  ) {
    return "Ministry of Health & Family Welfare";
  }

  // 11. Higher Education
  if (
    s.includes("education") ||
    a.includes("iit") ||
    a.includes("nit") ||
    a.includes("iim") ||
    p.includes("campus") ||
    p.includes("university") ||
    p.includes("institute")
  ) {
    return "Department of Higher Education";
  }

  // 12. Telecommunications
  if (
    s.includes("telecom") ||
    s.includes("communication") ||
    a.includes("bsnl") ||
    a.includes("bbnl") ||
    p.includes("optical fibre") ||
    p.includes("bharatnet")
  ) {
    return "Department of Telecommunications";
  }

  // 13. Steel & Mines
  if (
    s.includes("metals") ||
    s.includes("mining") ||
    s.includes("steel") ||
    a.includes("nmdc") ||
    a.includes("nalco") ||
    a.includes("sail") ||
    a.includes("rinl")
  ) {
    if (a.includes("sail") || a.includes("rinl") || p.includes("steel") || s.includes("steel")) {
      return "Ministry of Steel";
    }
    return "Ministry of Mines";
  }

  // 14. Chemicals & Fertilizers
  if (s.includes("chemical") || s.includes("fertilizer") || a.includes("iffco") || a.includes("kribhco")) {
    return "Ministry of Chemicals and Fertilizers";
  }

  // 15. Sports & Youth Affairs
  if (s.includes("sport") || a.includes("sai") || p.includes("stadium")) {
    return "Department of Sports";
  }

  // 16. New & Renewable Energy
  if (s.includes("renewable") || s.includes("solar") || s.includes("wind") || a.includes("seci") || a.includes("ireda")) {
    return "Ministry of New & Renewable Energy";
  }

  return "Department for Promotion of Industry & Internal Trade";
}
