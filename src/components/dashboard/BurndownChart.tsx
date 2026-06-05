"use client";

import { useMemo } from "react";

interface DataPoint {
  date: string;
  count: number;
}

interface BurndownChartProps {
  data: DataPoint[];
  title?: string;
}

export function BurndownChart({ data, title = "Dokončené úkoly" }: BurndownChartProps) {
  const { points, max, xLabels, total } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.count), 1);
    const total = data.reduce((s, d) => s + d.count, 0);

    // Show at most 7 x-axis labels evenly spaced
    const step = Math.max(1, Math.floor(data.length / 7));
    const xLabels = data
      .map((d, i) => ({ i, label: d.date.slice(5) }))
      .filter((_, i) => i % step === 0 || i === data.length - 1);

    const W = 500;
    const H = 140;
    const pad = { top: 10, right: 16, bottom: 28, left: 32 };
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;

    const points = data.map((d, i) => ({
      x: pad.left + (i / Math.max(data.length - 1, 1)) * innerW,
      y: pad.top + innerH - (d.count / max) * innerH,
      count: d.count,
      date: d.date,
    }));

    return { points, max, xLabels, total, W, H, pad, innerW, innerH };
  }, [data]);

  const W = 500;
  const H = 140;
  const pad = { top: 10, right: 16, bottom: 28, left: 32 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  if (points.length === 0) return null;

  // Build SVG path
  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const areaPath = [
    linePath,
    `L ${points[points.length - 1].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)}`,
    `L ${points[0].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)}`,
    "Z",
  ].join(" ");

  // Y-axis gridlines at 0, max/2, max
  const gridY = [0, 0.5, 1].map((frac) => ({
    y: pad.top + innerH - frac * innerH,
    label: Math.round(frac * max),
  }));

  return (
    <div className="rounded-3xl border overflow-hidden"
      style={{ background: "var(--bg-card)", borderColor: "var(--border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="px-6 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-1)" }}>{title}</h2>
          <p className="text-[12.5px] mt-0.5" style={{ color: "var(--text-3)" }}>
            Celkem dokončeno: <span className="font-semibold" style={{ color: "var(--accent)" }}>{total}</span> úkolů za posledních 30 dní
          </p>
        </div>
      </div>

      <div className="px-4 pb-5">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: 140 }}
          aria-hidden
        >
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {gridY.map(({ y, label }) => (
            <g key={y}>
              <line
                x1={pad.left} y1={y.toFixed(1)}
                x2={pad.left + innerW} y2={y.toFixed(1)}
                stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3"
              />
              <text
                x={pad.left - 6} y={y + 4}
                textAnchor="end" fontSize="9" fill="var(--text-3)"
              >
                {label}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGrad)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Dots at non-zero points */}
          {points.map((p, i) =>
            p.count > 0 ? (
              <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3"
                fill="var(--accent)" stroke="var(--bg-card)" strokeWidth="1.5" />
            ) : null
          )}

          {/* X-axis labels */}
          {xLabels.map(({ i, label }) => {
            const p = points[i];
            if (!p) return null;
            return (
              <text key={i} x={p.x.toFixed(1)} y={H - 6}
                textAnchor="middle" fontSize="9" fill="var(--text-3)">
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
