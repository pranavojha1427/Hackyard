"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell, PieChart, Pie, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function SectorDistributionChart({ data }: { data: any[] }) {
  const sortedData = [...data].sort((a, b) => b.count - a.count);
  
  const chartConfig = {
    count: { label: "Project Count", color: "#3b82f6" },
  };

  const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
    '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#84cc16', '#0284c7'
  ];

  return (
    <div className="h-[380px] w-full flex items-center justify-center">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <PieChart>
          <Pie
            data={sortedData}
            cx="50%"
            cy="46%"
            innerRadius={75}
            outerRadius={120}
            paddingAngle={3}
            dataKey="count"
            nameKey="sector"
            stroke="#ffffff"
            strokeWidth={2}
          >
            {sortedData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]} 
                className="transition-all duration-300 hover:opacity-80"
              />
            ))}
          </Pie>
          <RechartsTooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs">
                    <p className="font-bold text-sm text-indigo-300">{item.sector}</p>
                    <p className="mt-1 flex items-center justify-between gap-4 text-slate-300">
                      <span>Projects:</span>
                      <span className="font-mono font-bold text-white text-sm">{item.count}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center" 
            wrapperStyle={{ fontSize: '11px', paddingTop: '16px', fontWeight: 500 }}
          />
        </PieChart>
      </ChartContainer>
    </div>
  );
}

export function CostOverviewChart({ original, revised, expenditure }: { original: number, revised: number, expenditure: number }) {
  const data = [
    { name: 'Original Cost', value: original, fill: '#3b82f6', label: 'Approved Budget' },
    { name: 'Revised Cost', value: revised, fill: '#f59e0b', label: 'Latest Projected' },
    { name: 'Expenditure', value: expenditure, fill: '#10b981', label: 'Actual Spent' },
  ];

  const chartConfig = {
    value: { label: "Amount (₹ Cr)", color: "#3b82f6" },
  };

  return (
    <div className="h-[380px] w-full flex items-center justify-center">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 35, left: 95, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis 
            type="number" 
            stroke="#64748b" 
            fontSize={12} 
            tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k Cr`} 
          />
          <YAxis 
            dataKey="name" 
            type="category" 
            stroke="#334155" 
            fontSize={12} 
            fontWeight={600}
            tickLine={false}
          />
          <RechartsTooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs">
                    <p className="font-bold text-sm text-slate-100">{item.name}</p>
                    <p className="text-slate-400 text-[11px] mb-1">{item.label}</p>
                    <p className="font-mono font-bold text-amber-400 text-sm">
                      ₹{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(item.value)} Cr
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={36}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function PhysicalProgressChart({ data }: { data: any[] }) {
  const chartConfig = {
    count: { label: "Project Count", color: "#10b981" },
  };

  // Distinct chromatic progress stages: Red -> Orange -> Amber -> Blue -> Emerald
  const PROGRESS_COLORS = ['#f43f5e', '#fb923c', '#fbbf24', '#38bdf8', '#10b981'];

  return (
    <div className="h-[380px] w-full">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 15, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis 
            dataKey="range" 
            stroke="#64748b" 
            fontSize={12} 
            fontWeight={500}
            tickLine={false}
          />
          <YAxis 
            stroke="#64748b" 
            fontSize={12} 
            tickLine={false}
          />
          <RechartsTooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                return (
                  <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs">
                    <p className="text-slate-400 text-[11px]">Progress Bracket</p>
                    <p className="font-bold text-sm text-emerald-400">{item.range}</p>
                    <p className="mt-1 flex items-center justify-between gap-4 text-slate-200">
                      <span>Total Projects:</span>
                      <span className="font-mono font-bold text-white text-sm">{item.count}</span>
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={44}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={PROGRESS_COLORS[index % PROGRESS_COLORS.length]} 
                className="transition-all duration-300 hover:opacity-85"
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}

export function StateDistributionChart({ data }: { data: any[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  const chartConfig = {
    count: { label: "Project Count", color: "#f59e0b" },
  };
  
  const COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', 
    '#6366f1', '#84cc16', '#0ea5e9', '#d946ef', '#f97316', '#22c55e', '#a855f7', '#64748b'
  ];

  return (
    <div className="h-[380px] w-full flex items-center justify-center">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <PieChart>
          <Pie
            data={sorted}
            cx="50%"
            cy="46%"
            innerRadius={75}
            outerRadius={120}
            paddingAngle={2}
            dataKey="count"
            nameKey="state"
            stroke="#ffffff"
            strokeWidth={2}
          >
            {sorted.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <RechartsTooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload;
                const cost = item.originalCost || 0;
                const formattedCost = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(cost);
                return (
                  <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/60 text-xs">
                    <p className="font-bold text-sm text-amber-400 mb-1">{item.state}</p>
                    <p className="text-slate-300 flex justify-between gap-3">
                      <span>Projects:</span>
                      <span className="text-white font-mono font-bold">{item.count}</span>
                    </p>
                    <p className="text-slate-300 flex justify-between gap-3 mt-1">
                      <span>Original Cost:</span>
                      <span className="text-emerald-400 font-mono font-bold">₹{formattedCost} Cr</span>
                    </p>
                  </div>
                );
              }
              return null;
            }} 
          />
          <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', paddingTop: '16px' }}/>
        </PieChart>
      </ChartContainer>
    </div>
  );
}
