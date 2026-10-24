"use client";

import React, { useState, useEffect, useCallback } from "react";
import { scaleLinear } from "d3-scale";
import { createClient } from "@supabase/supabase-js";
import { geoMercator, geoIdentity, geoPath, type GeoPermissibleObjects } from "d3-geo";
import type { FeatureCollection, Feature, Geometry } from "geojson";

const colorScale = scaleLinear<string>()
  .domain([0, 50, 100])
  .range(["#10b981", "#f59e0b", "#ef4444"]);

interface ProjectData {
  state: string;
  original_cost: number;
  revised_cost: number;
  physical_progress: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Exclude distant island territories from projection fitting
const ISLAND_TERRITORIES = ["Andaman & Nicobar", "Lakshadweep"];
const WIDTH = 600;
const HEIGHT = 720;

interface StatePath {
  name: string;
  d: string;
}

export default function StateRiskMap({ projects, selectedState, country = "India", onStateSelect }: { projects: ProjectData[], selectedState?: string, country?: string, onStateSelect?: (state: string) => void }) {
  const data = projects || [];
  const [loading, setLoading] = useState(true);
  const [tooltipContent, setTooltipContent] = useState("");
  const [statePaths, setStatePaths] = useState<StatePath[]>([]);

  const handleStateClick = (stateName: string) => {
    if (onStateSelect) {
      onStateSelect(stateName);
    }
  };

  // Load GeoJSON and pre-compute SVG paths
  useEffect(() => {
    setLoading(true);
    
    if (country === "India") {
      fetch("/india.geojson")
        .then((res) => res.json())
        .then((geojson: FeatureCollection) => {
          const mainland: FeatureCollection = {
            type: "FeatureCollection",
            features: geojson.features.filter(
              (f) => !ISLAND_TERRITORIES.includes(f.properties?.ST_NM || "")
            ),
          };
          const projection = geoMercator().fitExtent(
            [[30, 30], [WIDTH - 30, HEIGHT - 30]],
            mainland
          );
          const path = geoPath().projection(projection);
          const paths = geojson.features
            .map((feat) => ({
              name: (feat.properties?.ST_NM as string) || "Unknown",
              d: path(feat as GeoPermissibleObjects) || "",
            }))
            .filter((sp) => sp.d.length > 0);
          setStatePaths(paths);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error loading India map:", err);
          setLoading(false);
        });
      return;
    }

    let geoUrl = "";
    if (country === "All") {
      geoUrl = "https://code.highcharts.com/mapdata/custom/world.geo.json";
    } else {
      let hcPrefix = "";
      if (country === "China") {
        geoUrl = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/china.geojson";
      } else {
        if (country === "Russia") hcPrefix = "ru";
        else if (country === "Brazil") hcPrefix = "br";
        else if (country === "South Africa") hcPrefix = "za";
        if (hcPrefix) {
          geoUrl = `https://code.highcharts.com/mapdata/countries/${hcPrefix}/${hcPrefix}-all.geo.json`;
        }
      }
    }

    if (!geoUrl) {
      setStatePaths([]);
      setLoading(false);
      return;
    }

    fetch(geoUrl)
      .then((res) => res.json())
      .then((geojson: FeatureCollection) => {
        let isProjected = false;
        try {
          let coords = geojson.features[0].geometry.coordinates as any;
          while (Array.isArray(coords[0])) {
            coords = coords[0];
          }
          if (Math.abs(coords[0]) > 180) {
            isProjected = true;
          }
        } catch (e) {}

        const projection = isProjected
          ? geoIdentity()
              .reflectY(true)
              .fitExtent(
                [[30, 30], [WIDTH - 30, HEIGHT - 30]],
                geojson as any
              )
          : geoMercator()
              .fitExtent(
                [[30, 30], [WIDTH - 30, HEIGHT - 30]],
                geojson
              );

        const path = geoPath().projection(projection as any);
        
        const paths = geojson.features
          .map((feat) => ({
            name: (feat.properties?.name as string) || "Unknown",
            d: path(feat as GeoPermissibleObjects) || "",
          }))
          .filter((sp) => sp.d.length > 0);
          
        setStatePaths(paths);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading BRICS map:", err);
        setStatePaths([]);
        setLoading(false);
      });
  }, [country]);

  const REGION_MAPPING: Record<string, string[]> = {
    "sverdlovsk": ["yekaterinburg"],
    "bashkortostan": ["ufa"],
    "udmurt": ["izhevsk"],
    "altay": ["barnaul", "altai"],
    "primor'ye": ["vladivostok", "primorsky"],
    "rostov": ["rostov-on-don"],
    "nizhegorod": ["nizhny novgorod"],
    "perm'": ["perm"],
    "city of st. petersburg": ["saint petersburg"],
    "moskva": ["moscow"],
    "moskovsskaya": ["moscow"],
    "ul'yanovsk": ["ulyanovsk"],
    "tyumen'": ["tyumen"],
    "yaroslavl'": ["yaroslavl"],
    "samara": ["tolyatti", "samara"]
  };

  const getRiskScore = useCallback(
    (stateName: string, d?: string) => {
      const sn = stateName.toLowerCase();
      const aliases = REGION_MAPPING[sn] || [];
      const matched = data.filter(
        (p) =>
          p.state &&
          (p.state.toLowerCase().includes(sn) ||
            sn.includes(p.state.toLowerCase()) ||
            aliases.some(a => p.state.toLowerCase().includes(a) || a.includes(p.state.toLowerCase())))
      );

      if (matched.length === 0) {
        return { risk: -1, count: 0 };
      }

      const totalRisk = matched.reduce((acc, p) => {
        const overrun =
          p.original_cost > 0
            ? ((p.revised_cost - p.original_cost) / p.original_cost) * 100
            : 0;
        return (
          acc +
          (Math.max(0, overrun) +
            Math.max(0, 100 - (p.physical_progress || 0))) /
            2
        );
      }, 0);
      return { risk: Math.min(100, totalRisk / matched.length), count: matched.length };
    },
    [data, country]
  );

  if (loading) {
    return (
      <div className="h-[720px] w-full flex items-center justify-center text-slate-500 font-mono">
        Processing Geographic Data...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Legend */}
      <div className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-white/90 md:bg-white border border-slate-300 p-2 md:p-4 rounded shadow-lg pointer-events-none md:pointer-events-auto max-w-[200px] md:max-w-xs">
        <h4 className="text-slate-800 font-semibold mb-1 md:mb-3 font-serif text-sm md:text-base">
          State Risk Heatmap
        </h4>
        <div className="flex flex-col md:flex-row items-start md:items-center gap-1 md:gap-4 text-xs md:text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
            On Track
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            At Risk
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            Critical
          </div>
        </div>
        {tooltipContent && (
          <div className="mt-3 text-sm font-medium text-slate-900 bg-slate-100 p-2 rounded border border-slate-200">
            {tooltipContent}
          </div>
        )}
      </div>

      {/* SVG Map */}
      {statePaths.length === 0 && country !== "India" ? (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 font-mono bg-slate-50 border-2 border-dashed border-slate-300 min-h-[400px]">
          <span className="text-4xl mb-4">🌍</span>
          <p>GeoJSON boundaries for {country} (BRICS Expansion)</p>
          <p className="text-xs mt-2 text-slate-400">Loading dynamic GIS mapping nodes...</p>
        </div>
      ) : (
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        style={{ maxHeight: 720, width: "100%", height: "auto" }}
      >
        <rect width={WIDTH} height={HEIGHT} fill="#ffffff" />

        {statePaths.map((sp, i) => {
          const { risk, count } = getRiskScore(sp.name, sp.d);
          // Highlight UTs with a slightly thicker default stroke if they are small
          const isUT = ["Chandigarh", "Delhi", "Dadra and Nagar Haveli and Daman and Diu", "Puducherry", "Lakshadweep", "Andaman & Nicobar"].includes(sp.name);
          return (
            <path
              key={i}
              d={sp.d}
              fill={risk >= 0 ? colorScale(risk) : "#f1f5f9"}
              stroke={selectedState === sp.name ? "#0ea5e9" : (isUT ? "#94a3b8" : "#cbd5e1")}
              strokeWidth={selectedState === sp.name ? 2.5 : (isUT ? 1.5 : 1)}
              strokeLinejoin="round"
              className="cursor-pointer transition-opacity duration-150 hover:opacity-80"
              onClick={() => handleStateClick(sp.name)}
              onMouseEnter={() =>
                setTooltipContent(
                  risk >= 0
                    ? `${sp.name}: Risk Score ${risk.toFixed(1)} | Projects: ${count}`
                    : `${sp.name}: No active projects`
                )
              }
              onMouseLeave={() => setTooltipContent("")}
            />
          );
        })}
      </svg>
      )}
    </div>
  );
}
