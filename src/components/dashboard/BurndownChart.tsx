"use client";

import { useMemo, useRef, useState, useLayoutEffect } from "react";

interface DataPoint {
  date: string;
  count: number;
}

interface BurndownChartProps {
  data: DataPoint[];
  title?: string;
}

const H = 180;
const pad = { top: 14, right: 18, bottom: 30, left: 34 };

export function BurndownChart({ data, title = "Dokončené úkoly" }: BurndownChartProps) {
  // Measure the container so the chart fills the available width without
  // distorting (no preserveAspectRatio="none" stretching of dots/text).
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || 640);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { linePath, areaPath, gridY, xLabels, total, hasData } = useMemo(() => {
    const W = Math.max(width, 280);
    const innerW = W - pad.left - pad.right;
    const innerH = H - pad.top - pad.bottom;
    const max = Math.max(...data.map((d) => d.count), 1);
    const total = data.reduce((s, d) => s + d.count, 0);

    const points = data.map((d, i) => ({
      x: pad.left + (i / Math.max(data.length - 1, 1)) * innerW,
      y: pad.top + innerH - (d.count / max) * innerH,
      count: d.count,
      date: d.date,
    }));

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");

    const areaPath = points.length
      ? [
          linePath,
          `L ${points[points.length - 1].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)}`,
          `L ${points[0].x.toFixed(1)} ${(pad.top + innerH).toFixed(1)}`,
          "Z",
        ].join(" ")
      : "";

    const gridY = [0, 0.5, 1].map((frac) => ({
      y: pad.top + innerH - frac * innerH,
      label: Math.round(frac * max),
    }));

    // At most ~7 evenly spaced x labels
    const step = Math.max(1, Math.floor(data.length / 7));
    const xLabels = points
      .map((p, i) => ({ x: p.x, label: p.date.slice(5), i }))
      .filter((_, i) => i % step === 0 || i === data.length - 1);

    return { linePath, areaPath, gridY, xLabels, total, hasData: points.length > 0, points };
  }, [data, width]);

  if (!hasData) return null;

  const W = Math.max(width, 280);

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

      <div ref={wrapRef} className="px-4 pb-5">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
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
                x2={W - pad.right} y2={y.toFixed(1)}
                stroke="var(--border)" strokeWidth="1" strokeDasharray="4 3"
              />
              <text
                x={pad.left - 8} y={y + 4}
                textAnchor="end" fontSize="11" fill="var(--text-3)"
              >
                {label}
              </text>
            </g>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#chartGrad)" />

          {/* Line */}
          <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />

          {/* X-axis labels */}
          {xLabels.map(({ x, label, i }) => (
            <text key={i} x={x.toFixed(1)} y={H - 8}
              textAnchor="middle" fontSize="11" fill="var(--text-3)">
              {label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
