"use client";
import { useState } from "react";
import { fmtViews } from "@/lib/engine";

export function Spark({ values, w = 120, h = 32, color = "currentColor" }: { values: number[]; w?: number; h?: number; color?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - ((v - min) / span) * (h - 4)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

type Ref = { label: string; value: number; dashed?: boolean };

/** Views over hours. One line; optional horizontal reference lines (your call, crowd). */
export function ViewsChart({ points, maxH, refs = [], cutoff }: { points: { h: number; v: number }[]; maxH: number; refs?: Ref[]; cutoff?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 500, H = 190, L = 44, R = 12, T = 12, B = 24;
  const yMax = Math.max(...points.map((p) => p.v), ...refs.map((r) => r.value), 10) * 1.12;
  const x = (h: number) => L + (h / maxH) * (W - L - R);
  const y = (v: number) => T + (1 - v / yMax) * (H - T - B);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(p.h).toFixed(1)},${y(p.v).toFixed(1)}`).join("");
  const area = `${d}L${x(points[points.length - 1].h)},${y(0)}L${x(0)},${y(0)}Z`;
  const ticks = [0, 0.5, 1].map((f) => f * yMax / 1.12);
  const xt = maxH > 48 ? [0, 24, 48, 72, 96, 120, 144, 168].filter((t) => t <= maxH) : [...new Set([0, maxH / 4, maxH / 2, (3 * maxH) / 4, maxH].map(Math.round))];
  const hp = hover != null ? points.reduce((a, b) => (Math.abs(b.h - hover) < Math.abs(a.h - hover) ? b : a)) : null;
  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Views over time"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          setHover(Math.max(0, Math.min(maxH, ((px - L) / (W - L - R)) * maxH)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#222224" />
            <text x={L - 8} y={y(t) + 4} fill="#8b8b90" fontSize={10} textAnchor="end">{fmtViews(t)}</text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={t} x={x(t)} y={H - 6} fill="#8b8b90" fontSize={10} textAnchor="middle">{t === 0 ? "0" : t >= 24 && t % 24 === 0 ? `${t / 24}d` : `${t}h`}</text>
        ))}
        <path d={area} fill="rgba(255,42,42,.10)" />
        <path d={d} fill="none" stroke="#ff2a2a" strokeWidth={2} strokeLinejoin="round" />
        {cutoff != null && <line x1={x(cutoff)} x2={x(cutoff)} y1={T} y2={H - B} stroke="#5b5b60" strokeDasharray="3 3" />}
        {refs.map((r, i) => {
          const close = i > 0 && Math.abs(y(r.value) - y(refs[0].value)) < 14;
          const below = close && y(r.value) >= y(refs[0].value);
          return (
            <g key={r.label}>
              <line x1={L} x2={W - R} y1={y(r.value)} y2={y(r.value)} stroke="#f2f2f0" strokeOpacity={r.dashed ? 0.45 : 0.85} strokeDasharray={r.dashed ? "4 4" : undefined} />
              <text x={i === 0 ? W - R : L + 6} y={y(r.value) + (below ? 13 : -5)} fill="#f2f2f0" fillOpacity={r.dashed ? 0.6 : 0.95} fontSize={10.5} textAnchor={i === 0 ? "end" : "start"}>{r.label} {fmtViews(r.value)}</text>
            </g>
          );
        })}
        {hp && (
          <g>
            <line x1={x(hp.h)} x2={x(hp.h)} y1={T} y2={H - B} stroke="#8b8b90" />
            <circle cx={x(hp.h)} cy={y(hp.v)} r={4.5} fill="#ff2a2a" stroke="#0f0f10" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && (
        <div className="num" style={{ position: "absolute", top: 4, left: 50, fontSize: 12, background: "#000", border: "1px solid #2e2e31", borderRadius: 6, padding: "3px 8px" }}>
          {hp.h < 48 ? `${hp.h}h` : `day ${(hp.h / 24).toFixed(1)}`} · {fmtViews(hp.v)} views
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

/** Log-log scatter: early share rate vs final views. Single series. */
export function Scatter({ pts }: { pts: { x: number; y: number; label: string }[] }) {
  const [hi, setHi] = useState<number | null>(null);
  const W = 500, H = 240, L = 46, R = 12, T = 10, B = 30;
  const lx = pts.map((p) => Math.log10(p.x));
  const ly = pts.map((p) => Math.log10(p.y));
  const [x0, x1] = [Math.min(...lx), Math.max(...lx)];
  const [y0, y1] = [Math.floor(Math.min(...ly)), Math.ceil(Math.max(...ly))];
  const sx = (v: number) => L + ((Math.log10(v) - x0) / (x1 - x0)) * (W - L - R);
  const sy = (v: number) => T + (1 - (Math.log10(v) - y0) / (y1 - y0)) * (H - T - B);
  const yt: number[] = [];
  for (let e = y0; e <= y1; e++) yt.push(Math.pow(10, e));
  const xt = [0.002, 0.005, 0.01, 0.02, 0.05, 0.1].filter((t) => Math.log10(t) >= x0 && Math.log10(t) <= x1);
  const h = hi != null ? pts[hi] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Share rate at 6 hours against 7-day views">
        {yt.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={sy(t)} y2={sy(t)} stroke="#222224" />
            <text x={L - 8} y={sy(t) + 4} fill="#8b8b90" fontSize={10} textAnchor="end">{fmtViews(t)}</text>
          </g>
        ))}
        {xt.map((t) => (
          <text key={t} x={sx(t)} y={H - 10} fill="#8b8b90" fontSize={10} textAnchor="middle">{(t * 100).toFixed(t < 0.01 ? 1 : 0)}%</text>
        ))}
        {pts.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={hi === i ? 6 : 4} fill="#ff2a2a" fillOpacity={hi === i ? 1 : 0.55} stroke="#0f0f10" strokeWidth={1.5}
            onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} />
        ))}
      </svg>
      {h && (
        <div style={{ position: "absolute", top: 6, left: 56, fontSize: 12, background: "#000", border: "1px solid #2e2e31", borderRadius: 6, padding: "4px 8px", maxWidth: 260 }}>
          {h.label}<br /><span className="num muted">shares {(h.x * 100).toFixed(2)}% · {fmtViews(h.y)} views</span>
        </div>
      )}
    </div>
  );
}
