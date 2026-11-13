"use client";
import { useMemo } from "react";
import { LENGTH_ORDER, Reel, breakdown, fmtPct, fmtViews, median, settledHistory, signalsAt } from "@/lib/engine";
import { lengthBucket } from "@/lib/catalog";
import { Bars, Scatter } from "./charts";

function toRows(rows: ReturnType<typeof breakdown>) {
  return rows.map((r) => ({
    key: r.key,
    value: r.median,
    note: `${r.lift >= 0 ? "+" : ""}${Math.round(r.lift * 100)}%`,
    tip: `${r.n} reels · median ${fmtViews(r.median)} · ${fmtPct(r.viralRate, 0)} hit 1M`,
  }));
}

export function Insights({ today }: { today: string }) {
  const hist = useMemo(() => settledHistory(today), [today]);
  const byFormat = useMemo(() => breakdown(hist, (r) => r.format), [hist]);
  const byHook = useMemo(() => breakdown(hist, (r) => r.hook), [hist]);
  const byLen = useMemo(() => breakdown(hist, (r) => lengthBucket(r.lengthSec).label, LENGTH_ORDER), [hist]);
  const byNiche = useMemo(() => breakdown(hist, (r) => r.niche.label), [hist]);
  const byAudio = useMemo(() => breakdown(hist, (r) => r.audio), [hist]);

  const med = median(hist.map((r) => r.finalViews));
  const viral = hist.filter((r) => r.finalViews >= 1e6).length / hist.length;
  const crowdErr = median(hist.map((r) => Math.abs(Math.log10(r.crowdMedian / r.finalViews))));
  const sleepers = [...hist].sort((a, b) => b.finalViews / b.crowdMedian - a.finalViews / a.crowdMedian).slice(0, 5);
  const overhyped = [...hist].sort((a, b) => b.crowdMedian / b.finalViews - a.crowdMedian / a.finalViews).slice(0, 5);
  const scatter = hist.slice(0, 140).map((r) => ({ x: signalsAt(r, 6).shareRate, y: r.finalViews, label: `${r.caption} (@${r.creator.handle})` }));

  return (
    <>
      <div className="mock-note" style={{ maxWidth: "none", marginBottom: 18 }}>
        Sample data. These insights are computed from {hist.length} simulated, settled reels, not real Instagram reels. With a live feed the same
        breakdowns would run on real outcomes and on what players predicted.
      </div>
      <div className="kpis">
        <div className="kpi"><div className="k">Reels settled</div><div className="v num">{hist.length}</div><div className="s">last 60 days</div></div>
        <div className="kpi"><div className="k">Median 7-day views</div><div className="v num">{fmtViews(med)}</div><div className="s">across all niches</div></div>
        <div className="kpi"><div className="k">Hit 1M+</div><div className="v num">{fmtPct(viral, 1)}</div><div className="s">of reels went viral</div></div>
        <div className="kpi"><div className="k">Crowd miss</div><div className="v num">{Math.pow(10, crowdErr).toFixed(2)}×</div><div className="s">median distance from truth</div></div>
      </div>

      <div className="section">
        <h2>What&apos;s working</h2>
        <div className="takeaways">
          <Take k="Format" top={byFormat[0]} bottom={byFormat[byFormat.length - 1]} />
          <Take k="Hook" top={byHook[0]} bottom={byHook[byHook.length - 1]} />
          <Take k="Length" top={[...byLen].sort((a, b) => b.median - a.median)[0]} bottom={[...byLen].sort((a, b) => a.median - b.median)[0]} />
        </div>
      </div>

      <div className="section two">
        <div className="panel"><h3>Median 7-day views by format</h3><Bars rows={toRows(byFormat)} fmt={fmtViews} /></div>
        <div className="panel"><h3>Median 7-day views by hook</h3><Bars rows={toRows(byHook)} fmt={fmtViews} /></div>
        <div className="panel"><h3>By length</h3><Bars rows={toRows(byLen)} fmt={fmtViews} /></div>
        <div className="panel"><h3>By audio</h3><Bars rows={toRows(byAudio)} fmt={fmtViews} /></div>
        <div className="panel"><h3>By niche</h3><Bars rows={toRows(byNiche)} fmt={fmtViews} /></div>
        <div className="panel">
          <h3>Early signal: share rate at 6h vs 7-day views</h3>
          <Scatter pts={scatter} />
          <p className="hint">Each dot is one reel. Shares in the first hours are the best single predictor of a breakout.</p>
        </div>
      </div>

      <div className="section two">
        <List title="Sleepers the crowd under-called" reels={sleepers} ratio={(r) => r.finalViews / r.crowdMedian} sign="×" />
        <List title="Overhyped by the crowd" reels={overhyped} ratio={(r) => r.crowdMedian / r.finalViews} sign="× over" />
      </div>
    </>
  );
}

type Row = ReturnType<typeof breakdown>[number];
function Take({ k, top, bottom }: { k: string; top: Row; bottom: Row }) {
  return (
    <div className="take">
      <div className="k">{k}</div>
      <div className="v">{top.key}</div>
      <div className="hint">
        <span className="up num">{top.lift >= 0 ? "+" : ""}{Math.round(top.lift * 100)}%</span> vs median. Weakest: {bottom.key}{" "}
        <span className="down num">{Math.round(bottom.lift * 100)}%</span>.
      </div>
    </div>
  );
}

function List({ title, reels, ratio, sign }: { title: string; reels: Reel[]; ratio: (r: Reel) => number; sign: string }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      {reels.map((r) => (
        <div key={r.id} className="between" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{r.caption}</div>
            <div className="muted" style={{ fontSize: 12 }}>{r.format} · {r.hook} · crowd {fmtViews(r.crowdMedian)} → actual {fmtViews(r.finalViews)}</div>
          </div>
          <span className="num" style={{ fontWeight: 700 }}>{ratio(r).toFixed(1)}{sign}</span>
        </div>
      ))}
    </div>
  );
}
