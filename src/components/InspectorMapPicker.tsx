"use client";

import { useState, useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default icon paths in Next.js bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const STATE_DEFAULT_COORDS: Record<string, [number, number]> = {
  "Assam": [26.1913, 91.6924],
  "West Bengal": [22.5726, 88.3639],
  "Odisha": [20.9517, 85.0985],
  "Maharashtra": [19.7515, 75.7139],
  "Uttar Pradesh": [26.8467, 80.9462],
  "Gujarat": [22.2587, 71.1924],
  "Delhi": [28.7041, 77.1025],
  "Bihar": [25.0961, 85.3131],
  "Tamil Nadu": [11.1271, 78.6569],
  "Karnataka": [15.3173, 75.7139]
};

// Browser-safe EWKB Point decoder for PostGIS geometry column
function parseEWKBPoint(hex: any): { lat: number; lng: number } | null {
  if (!hex || typeof hex !== "string" || hex.length < 42) return null;
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    const view = new DataView(bytes.buffer);
    const isLittleEndian = view.getUint8(0) === 1;
    let offset = 1;
    const type = view.getUint32(offset, isLittleEndian);
    offset += 4;
    const hasSrid = (type & 0x20000000) !== 0;
    if (hasSrid) {
      offset += 4;
    }
    const x = view.getFloat64(offset, isLittleEndian); // Longitude
    offset += 8;
    const y = view.getFloat64(offset, isLittleEndian); // Latitude
    if (!isNaN(x) && !isNaN(y) && x >= -180 && x <= 180 && y >= -90 && y <= 90) {
      return { lng: x, lat: y };
    }
    return null;
  } catch {
    return null;
  }
}

// Extract lat and lng from any complaint format (EWKB, WKT POINT, JSON object, GeoJSON)
function extractComplaintCoords(c: any): { lat: number; lng: number } | null {
  if (!c) return null;

  if (typeof c.exact_lat === "number" && typeof c.exact_lng === "number") {
    return { lat: c.exact_lat, lng: c.exact_lng };
  }

  // 1. PostGIS EWKB Hex string
  if (typeof c.location === "string" && /^[0-9a-fA-F]{42,}$/.test(c.location)) {
    const parsed = parseEWKBPoint(c.location);
    if (parsed) return parsed;
  }

  // 2. WKT format "POINT(lon lat)"
  const locStr = typeof c.location === "string" ? c.location : (c.location_str || "");
  if (locStr.startsWith("POINT(") || locStr.startsWith("point(")) {
    const match = locStr.match(/POINT\(([-0-9.]+)\s+([-0-9.]+)\)/i);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
  }

  // 3. Object with lat & lon/lng
  if (c.location && typeof c.location === "object") {
    const lat = Number(c.location.lat);
    const lng = Number(c.location.lon ?? c.location.lng);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };

    if (Array.isArray(c.location.coordinates) && c.location.coordinates.length >= 2) {
      const gLng = Number(c.location.coordinates[0]);
      const gLat = Number(c.location.coordinates[1]);
      if (!isNaN(gLat) && !isNaN(gLng)) return { lat: gLat, lng: gLng };
    }
  }

  return null;
}

// Custom complaint pin icon
function createComplaintPinIcon(index: number) {
  return L.divIcon({
    className: "custom-complaint-pin-container",
    html: `
      <div style="position: relative; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: 28px; height: 28px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: pulse 1.8s infinite;"></div>
        <div style="position: relative; width: 22px; height: 22px; border-radius: 50%; background: #dc2626; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 11px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont;">
          ${index}
        </div>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
}

// Custom inspector selected pinpoint icon
function createInspectorPinIcon() {
  return L.divIcon({
    className: "custom-inspector-pin-container",
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: rgba(16, 185, 129, 0.45); animation: pulse 1.5s infinite;"></div>
        <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: #059669; border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 900; font-size: 13px;">
          ✓
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
}

// Interactive map click listener
function MapClickListener({ onSelect }: { onSelect: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

// Helper to keep map centered on hotspot
function MapRecenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center[0], center[1], map]);
  return null;
}

export interface InspectorMapPickerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  hotspot?: {
    id?: string;
    state?: string;
    infrastructure_category?: string;
    request_count?: number;
    exact_lat?: number;
    exact_lng?: number;
    hotspot_polygon?: string;
  } | null;
  complaints?: Array<{
    id?: string;
    name?: string;
    raw_text?: string;
    translated_text?: string;
    location?: any;
    location_str?: string | null;
    exact_lat?: number;
    exact_lng?: number;
    created_at?: string;
  }>;
  selectedLat?: number | null;
  selectedLng?: number | null;
}

export default function InspectorMapPicker({ 
  onLocationSelect,
  hotspot,
  complaints = [],
  selectedLat,
  selectedLng
}: InspectorMapPickerProps) {
  // 1. Determine the cluster center
  const defaultCenter = useMemo<[number, number]>(() => {
    if (selectedLat && selectedLng) {
      return [selectedLat, selectedLng];
    }
    if (hotspot?.exact_lat && hotspot?.exact_lng) {
      return [Number(hotspot.exact_lat), Number(hotspot.exact_lng)];
    }
    if (hotspot?.state && STATE_DEFAULT_COORDS[hotspot.state]) {
      return STATE_DEFAULT_COORDS[hotspot.state];
    }
    return [26.1913, 91.6924]; // Assam / Guwahati default
  }, [hotspot?.exact_lat, hotspot?.exact_lng, hotspot?.state, selectedLat, selectedLng]);

  const [position, setPosition] = useState<[number, number] | null>(
    selectedLat && selectedLng ? [selectedLat, selectedLng] : null
  );

  useEffect(() => {
    if (selectedLat && selectedLng) {
      setPosition([selectedLat, selectedLng]);
    }
  }, [selectedLat, selectedLng]);

  // 2. Parse and assign coordinates for all complaints in this hotspot/project
  const complaintPins = useMemo(() => {
    const baseLat = defaultCenter[0];
    const baseLng = defaultCenter[1];

    return complaints.map((c, idx) => {
      let coords = extractComplaintCoords(c);
      
      // If complaint doesn't have individual coordinates, scatter around hotspot centroid
      if (!coords) {
        const angle = (idx * (2 * Math.PI / Math.max(1, complaints.length))) + 0.4;
        const radius = 0.0018 + (idx % 3) * 0.0009; // ~200m - 300m
        coords = {
          lat: baseLat + radius * Math.cos(angle),
          lng: baseLng + radius * Math.sin(angle)
        };
      }

      return {
        id: c.id || `complaint-${idx}`,
        name: c.name || `Citizen #${idx + 1}`,
        text: c.translated_text || c.raw_text || "Infrastructure issue reported",
        lat: coords.lat,
        lng: coords.lng
      };
    });
  }, [complaints, defaultCenter]);

  const handleSetPosition = (pos: [number, number]) => {
    setPosition(pos);
    onLocationSelect(pos[0], pos[1]);
  };

  return (
    <div className="h-80 sm:h-96 w-full rounded-2xl border-2 border-slate-200 overflow-hidden relative shadow-sm z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={14} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapRecenter center={defaultCenter} />

        {/* 1. Demand Hotspot Zone - Pulsing Red Area */}
        <Circle
          center={defaultCenter}
          radius={700}
          pathOptions={{
            color: "#dc2626",
            fillColor: "#ef4444",
            fillOpacity: 0.16,
            weight: 2,
            dashArray: "6, 6"
          }}
        >
          <Popup>
            <div className="p-1 text-xs">
              <span className="font-bold text-rose-700 uppercase tracking-wide block">
                🚨 Citizen Demand Hotspot Zone
              </span>
              <p className="text-slate-800 font-semibold mt-1">
                {hotspot?.infrastructure_category || "Infrastructure"} Category Cluster
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Region: <strong>{hotspot?.state || "Assam"}</strong>
              </p>
              <div className="mt-1 text-rose-600 font-bold text-[11px]">
                {complaintPins.length} Citizen Grievance{complaintPins.length === 1 ? "" : "s"} Aggregated Here
              </div>
            </div>
          </Popup>
        </Circle>

        {/* 2. Hotspot Complaint Pins */}
        {complaintPins.map((c, idx) => (
          <Marker
            key={c.id || idx}
            position={[c.lat, c.lng]}
            icon={createComplaintPinIcon(idx + 1)}
          >
            <Popup>
              <div className="p-1.5 text-xs max-w-[240px]">
                <div className="flex items-center gap-1.5 mb-1 pb-1 border-b border-slate-100">
                  <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <strong className="text-slate-900 truncate">{c.name}</strong>
                </div>
                <p className="text-slate-700 text-[11px] leading-relaxed italic mb-1.5">
                  "{c.text}"
                </p>
                <div className="text-[10px] text-slate-400 font-mono bg-slate-50 p-1 rounded">
                  GPS: {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 3. Inspector Selected / Pinpointed Project Marker */}
        {position && (
          <Marker position={position} icon={createInspectorPinIcon()}>
            <Popup>
              <div className="p-1.5 text-xs">
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  🎯 Proposed Project Pinpoint
                </span>
                <p className="text-slate-600 text-[11px] mt-1">
                  Verified ground location for government initiative.
                </p>
                <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 p-1 rounded mt-1 border border-emerald-200">
                  Lat: {position[0].toFixed(6)} | Lng: {position[1].toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 4. Click Listener */}
        <MapClickListener onSelect={handleSetPosition} />
      </MapContainer>

      {/* Floating Header Badges & Legend */}
      <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow-md border border-slate-200 text-xs flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
        </span>
        <span className="font-bold text-slate-800">Hotspot Demand Cluster</span>
        <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
          {complaintPins.length} Grievances
        </span>
      </div>

      <div className="absolute top-3 right-3 z-[400] bg-slate-900/90 backdrop-blur-xs text-white px-3 py-1.5 rounded-xl shadow-md text-xs font-semibold flex items-center gap-1.5">
        <span>👉 Click map to pinpoint project location</span>
      </div>

      {/* Bottom Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-xl shadow border border-slate-200 text-[11px] text-slate-600 flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block"></span>
          <span>Complaints ({complaintPins.length})</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block"></span>
          <span>Pinned Initiative Location</span>
        </span>
      </div>
    </div>
  );
}
