import fs from 'fs';
import path from 'path';

export interface CitizenComplaint {
  id: string;
  name: string;
  hashed_phone: string;
  raw_text: string;
  translated_text: string;
  infrastructure_category: string;
  ministry: string;
  location?: { lat: number; lon: number } | null;
  location_str?: string | null;
  state: string;
  status: string;
  channel: string;
  hotspot_id?: string | null;
  created_at: string;
}

// In-memory buffer of recent complaints for zero-latency fallback
const inMemoryComplaints: CitizenComplaint[] = [
  {
    id: "complaint-seed-01",
    name: "Pranav Ojha",
    hashed_phone: "9239663292",
    raw_text: "There are severe potholes on the main highway causing heavy traffic jams.",
    translated_text: "There are severe potholes on the main highway causing heavy traffic jams.",
    infrastructure_category: "Roads",
    ministry: "Ministry of Road Transport & Highways",
    location: { lat: 26.1913, lon: 91.6924 },
    location_str: "POINT(91.6924 26.1913)",
    state: "Assam",
    status: "pending",
    channel: "portal",
    hotspot_id: "a7d80079-4dd9-4150-ad43-7daa14c5d8c0",
    created_at: new Date().toISOString()
  }
];

export async function saveLocalComplaint(complaint: Omit<CitizenComplaint, 'id' | 'created_at'>): Promise<CitizenComplaint> {
  const newComplaint: CitizenComplaint = {
    ...complaint,
    id: `local-complaint-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    created_at: new Date().toISOString()
  };

  inMemoryComplaints.unshift(newComplaint);

  try {
    const dataDir = path.join(process.cwd(), '.pragatipulse-data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const filePath = path.join(dataDir, 'citizen_complaints.json');
    fs.writeFileSync(filePath, JSON.stringify(inMemoryComplaints.slice(0, 500), null, 2), 'utf-8');
  } catch (err) {
    console.warn("Could not write citizen complaints to disk:", err);
  }

  return newComplaint;
}

export function getLocalComplaints(): CitizenComplaint[] {
  try {
    const filePath = path.join(process.cwd(), '.pragatipulse-data', 'citizen_complaints.json');
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read local complaints file:", err);
  }
  return inMemoryComplaints;
}

export function updateLocalComplaintsHotspot(hotspotId: string, options: { state?: string; category?: string; ids?: string[] }) {
  try {
    const filePath = path.join(process.cwd(), '.pragatipulse-data', 'citizen_complaints.json');
    const complaints = getLocalComplaints();
    let updated = false;

    for (const c of complaints) {
      const matchId = options.ids && options.ids.includes(c.id);
      const matchStateCategory = options.state && options.category && c.state === options.state && c.infrastructure_category === options.category;
      
      if (matchId || matchStateCategory) {
        c.hotspot_id = hotspotId;
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, JSON.stringify(complaints, null, 2), 'utf-8');
    }
  } catch (err) {
    console.warn("Could not update local complaints hotspot_id:", err);
  }
}
