import { supabase } from '@/lib/supabaseClient';
import { getLocalComplaints, updateLocalComplaintsHotspot } from '@/lib/citizen-store';

const STATE_COORDINATES: Record<string, { lat: number; lng: number; multiplier: number }> = {
  "Assam": { lat: 26.1913, lng: 91.6924, multiplier: 1.5 },
  "West Bengal": { lat: 22.5726, lng: 88.3639, multiplier: 1.4 },
  "Odisha": { lat: 20.9517, lng: 85.0985, multiplier: 1.6 },
  "Maharashtra": { lat: 19.7515, lng: 75.7139, multiplier: 1.1 },
  "Uttar Pradesh": { lat: 26.8467, lng: 80.9462, multiplier: 1.8 },
  "Gujarat": { lat: 22.2587, lng: 71.1924, multiplier: 1.0 },
  "Delhi": { lat: 28.7041, lng: 77.1025, multiplier: 1.2 },
  "Bihar": { lat: 25.0961, lng: 85.3131, multiplier: 1.7 },
  "Tamil Nadu": { lat: 11.1271, lng: 78.6569, multiplier: 1.1 },
  "Karnataka": { lat: 15.3173, lng: 75.7139, multiplier: 1.1 }
};

export interface ClusteringResult {
  hotspotsCreated: number;
  hotspotsUpdated: number;
  details: Array<{
    hotspotId: string;
    state: string;
    category: string;
    complaintCount: number;
    inspectorName?: string;
  }>;
}

export async function autoClusterHotspots(
  targetState?: string,
  targetCategory?: string,
  minThreshold: number = 3
): Promise<ClusteringResult> {
  const result: ClusteringResult = {
    hotspotsCreated: 0,
    hotspotsUpdated: 0,
    details: []
  };

  try {
    // 1. Fetch unassigned complaints from Supabase
    let query = supabase
      .from('citizen_requests')
      .select('*')
      .is('hotspot_id', null)
      .order('created_at', { ascending: false });

    if (targetState) {
      query = query.eq('state', targetState);
    }
    if (targetCategory) {
      query = query.eq('infrastructure_category', targetCategory);
    }

    const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: "query timeout" } }), 3000)
    );

    const { data: supaComplaints } = await Promise.race([query, timeoutPromise]);

    // 2. Fetch unassigned local complaints
    const localComplaints = getLocalComplaints().filter(c => !c.hotspot_id);

    // Merge and deduplicate by phone + text snippet
    const complaintMap = new Map<string, any>();

    (supaComplaints || []).forEach((c: any) => {
      const key = `${c.hashed_phone || ''}-${(c.raw_text || '').slice(0, 30)}`;
      complaintMap.set(key, c);
    });

    localComplaints.forEach(lc => {
      const key = `${lc.hashed_phone || ''}-${(lc.raw_text || '').slice(0, 30)}`;
      if (!complaintMap.has(key)) {
        complaintMap.set(key, {
          id: lc.id,
          name: lc.name,
          hashed_phone: lc.hashed_phone,
          raw_text: lc.raw_text,
          translated_text: lc.translated_text,
          infrastructure_category: lc.infrastructure_category,
          ministry: lc.ministry,
          state: lc.state,
          location: lc.location_str || (lc.location ? `POINT(${lc.location.lon} ${lc.location.lat})` : null),
          exact_lat: lc.location?.lat,
          exact_lng: lc.location?.lon,
          hotspot_id: null,
          created_at: lc.created_at
        });
      }
    });

    const allUnassigned = Array.from(complaintMap.values());

    // 3. Group by state & category
    const groups: Record<string, { state: string; category: string; complaints: any[] }> = {};

    allUnassigned.forEach(c => {
      const state = c.state || "National";
      const category = c.infrastructure_category || "Roads";
      const groupKey = `${state}:::${category}`;

      if (!groups[groupKey]) {
        groups[groupKey] = { state, category, complaints: [] };
      }
      groups[groupKey].complaints.push(c);
    });

    // 4. Evaluate each cluster against the minimum threshold
    for (const groupKey of Object.keys(groups)) {
      const group = groups[groupKey];
      if (group.complaints.length < minThreshold) continue;

      // Calculate centroid / coordinates
      let totalLat = 0;
      let totalLng = 0;
      let coordCount = 0;

      for (const c of group.complaints) {
        if (c.exact_lat && c.exact_lng) {
          totalLat += Number(c.exact_lat);
          totalLng += Number(c.exact_lng);
          coordCount++;
        } else if (typeof c.location === 'string' && c.location.startsWith('POINT(')) {
          const match = c.location.match(/POINT\(([-0-9.]+)\s+([-0-9.]+)\)/);
          if (match) {
            totalLng += parseFloat(match[1]);
            totalLat += parseFloat(match[2]);
            coordCount++;
          }
        }
      }

      const defaultCoords = STATE_COORDINATES[group.state] || { lat: 26.1913, lng: 91.6924, multiplier: 1.2 };
      const avgLat = coordCount > 0 ? Number((totalLat / coordCount).toFixed(6)) : defaultCoords.lat;
      const avgLng = coordCount > 0 ? Number((totalLng / coordCount).toFixed(6)) : defaultCoords.lng;
      const priorityScore = Number(Math.min(10, group.complaints.length * 2.2 + defaultCoords.multiplier * 2).toFixed(1));

      // Check if an existing open hotspot can absorb these complaints
      const { data: existingHotspots } = await supabase
        .from('demand_hotspots')
        .select('*')
        .eq('state', group.state)
        .eq('infrastructure_category', group.category)
        .in('status', ['assigned', 'pending_inspection'])
        .order('created_at', { ascending: false })
        .limit(1);

      let hotspotId: string;
      let inspectorName = "National Field Inspector";

      if (existingHotspots && existingHotspots.length > 0) {
        // Absorb into existing hotspot
        const existing = existingHotspots[0];
        hotspotId = existing.id;
        const newCount = (existing.request_count || 0) + group.complaints.length;

        await supabase
          .from('demand_hotspots')
          .update({
            request_count: newCount,
            priority_score: Math.min(10, (existing.priority_score || 5) + 1.2),
            updated_at: new Date().toISOString()
          })
          .eq('id', hotspotId);

        result.hotspotsUpdated++;
      } else {
        // 5. Select or assign inspector with guaranteed fallback
        // Priority:
        // A. Exact state inspector
        // B. National inspector (Sharma)
        // C. Any inspector
        let assignedInspector: any = null;

        const { data: stateInspectors } = await supabase
          .from('inspectors')
          .select('*')
          .eq('state', group.state);

        if (stateInspectors && stateInspectors.length > 0) {
          assignedInspector = stateInspectors[0];
        } else {
          const { data: natInspectors } = await supabase
            .from('inspectors')
            .select('*')
            .eq('state', 'National');
          if (natInspectors && natInspectors.length > 0) {
            assignedInspector = natInspectors[0];
          } else {
            const { data: anyInspectors } = await supabase
              .from('inspectors')
              .select('*')
              .limit(1);
            if (anyInspectors && anyInspectors.length > 0) {
              assignedInspector = anyInspectors[0];
            }
          }
        }

        const inspectorId = assignedInspector?.id || '1a9136eb-e91b-4af8-8364-272f636bea92';
        inspectorName = assignedInspector?.name || 'Assam Circle Inspector';

        // 6. Insert new hotspot into demand_hotspots
        const { data: newHotspot, error: createErr } = await supabase
          .from('demand_hotspots')
          .insert({
            state: group.state,
            infrastructure_category: group.category,
            request_count: group.complaints.length,
            priority_score: priorityScore,
            average_sentiment: -0.75,
            inspector_id: inspectorId,
            status: 'assigned',
            hotspot_polygon: `POINT(${avgLng} ${avgLat})`,
            exact_lat: avgLat,
            exact_lng: avgLng
          })
          .select()
          .single();

        if (createErr || !newHotspot) {
          console.error("Failed to auto-create hotspot in Supabase:", createErr);
          continue;
        }

        hotspotId = newHotspot.id;
        result.hotspotsCreated++;
      }

      // 7. Link all clustered complaints to this hotspot in Supabase
      const dbComplaintIds = group.complaints
        .map(c => c.id)
        .filter(id => id && !String(id).startsWith('local-'));

      if (dbComplaintIds.length > 0) {
        await supabase
          .from('citizen_requests')
          .update({ hotspot_id: hotspotId })
          .in('id', dbComplaintIds);
      }

      // 8. Update local storage records
      updateLocalComplaintsHotspot(hotspotId, {
        state: group.state,
        category: group.category,
        ids: group.complaints.map(c => c.id)
      });

      result.details.push({
        hotspotId,
        state: group.state,
        category: group.category,
        complaintCount: group.complaints.length,
        inspectorName
      });
    }

    return result;
  } catch (error) {
    console.error("autoClusterHotspots fatal error:", error);
    return result;
  }
}
