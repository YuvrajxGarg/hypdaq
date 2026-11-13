"use client";
import { useId, useState } from "react";
import { fmtNum as fmtViews } from "@/lib/game";

export function Spark({ values, w = 120, h = 32, color = "currentColor" }: { values: number[]; w?: number; h?: number; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

type Ref = { label: string; value: number; dashed?: boolean };

/** Views over hours. One line; optional horizontal reference lines (your call, crowd). */
export function ViewsChart({ points, maxH, refs = [], cutoff, fmt = fmtViews, unit = "views", yMin = 0, label = "Views over time" }: { points: { h: number; v: number }[]; maxH: number; refs?: Ref[]; cutoff?: number; fmt?: (v: number) => string; unit?: string; yMin?: number; label?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const col = points[points.length - 1].v >= points[0].v ? "#2fe39a" : "#ff5c7a";
  const W = 500, H = 190, L = 44, R = 12, T = 12, B = 24;
  const yMax = Math.max(...points.map((p) => p.v), ...refs.map((r) => r.value), yMin + 0.5) * 1.12;
  const x = (h: number) => L + (h / maxH) * (W - L - R);
  const y = (v: number) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.h).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = `${d}L${x(points[points.length - 1].h)},${y(yMin)}L${x(points[0].h)},${y(yMin)}Z`;
  const ticks = [0, 0.5, 1].map((f) => yMin + f * (yMax / 1.12 - yMin));
  const xt = maxH > 48 ? [0, 24, 48, 72, 96, 120, 144, 168].filter((t) => t <= maxH) : [...new Set([0, maxH / 4, maxH / 2, (3 * maxH) / 4, maxH].map(Math.round))].filter((t) => t <= maxH);
  const hp = hover != null ? points.reduce((a, b) => (Math.abs(b.h - hover) < Math.abs(a.h - hover) ? b : a)) : null;
  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={label}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          setHover(Math.max(0, Math.min(maxH, ((px - L) / (W - L - R)) * maxH)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.06)" />
            <text x={L - 8} y={y(t) + 4} fill="#8b8b90" fontSize={10} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={t} x={x(t)} y={H - 6} fill="#8b8b90" fontSize={10} textAnchor="middle">{t === 0 ? "0" : t >= 24 && t % 24 === 0 ? `${t / 24}d` : `${t}h`}</text>
        ))}
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={col} stopOpacity={0.28} />
            <stop offset="1" stopColor={col} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={d} fill="none" stroke={col} strokeWidth={2} strokeLinejoin="round" />
        {!hp && <circle cx={x(points[points.length - 1].h)} cy={y(points[points.length - 1].v)} r={3.5} fill={col} />}
        {cutoff != null && <line x1={x(cutoff)} x2={x(cutoff)} y1={T} y2={H - B} stroke="#5b5b60" strokeDasharray="3 3" />}
        {refs.map((r, i) => {
          const close = i > 0 && Math.abs(y(r.value) - y(refs[0].value)) < 14;
          const below = close && y(r.value) >= y(refs[0].value);
          return (
            <g key={r.label}>
              <line x1={L} x2={W - R} y1={y(r.value)} y2={y(r.value)} stroke="#f2f2f0" strokeOpacity={r.dashed ? 0.45 : 0.85} strokeDasharray={r.dashed ? "4 4" : undefined} />
              <text x={i === 0 ? W - R : L + 6} y={y(r.value) + (below ? 13 : -5)} fill="#f2f2f0" fillOpacity={r.dashed ? 0.6 : 0.95} fontSize={10.5} textAnchor={i === 0 ? "end" : "start"}>{r.label} {fmt(r.value)}</text>
            </g>
          );
        })}
        {hp && (
          <g>
            <line x1={x(hp.h)} x2={x(hp.h)} y1={T} y2={H - B} stroke="#8b8b90" />
            <circle cx={x(hp.h)} cy={y(hp.v)} r={4.5} fill={col} stroke="#0f0f10" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && (
        <div className="num" style={{ position: "absolute", top: 4, left: 50, fontSize: 12, background: "rgba(8,8,10,.9)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "3px 8px" }}>
          {hp.h < 48 ? `${Math.round(hp.h)}h` : `day ${(hp.h / 24).toFixed(1)}`} · {fmt(hp.v)} {unit}
        </div>
      )}
    </div>
  );
}

export function Bars({ rows, fmt }: { rows: { key: string; value: number; tip: string; note?: string }[]; fmt: (v: number) => string }) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="bars">
      {rows.map((r) => (
        <div className="bar-row" key={r.key}>
          <span>{r.key}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          <span className="num r">{fmt(r.value)}{r.note ? <span className="dim"> {r.note}</span> : null}</span>
          <span className="tip">{r.tip}</span>
        </div>
      ))}
    </div>
  );
}

