"use client";
import { useMemo, useState } from "react";
import { lengthBucket } from "@/lib/catalog";
import {
  BUY_WINDOW_H, LENGTH_ORDER, Listing, SETTLE_H, archive, breakdown, callPoints, crowdShares, fmtNum, fmtPrice, fmtSigned, fmtX, median,
  priceAt, shareValue, ticker, viewsAt,
} from "@/lib/game";
import { Snap } from "@/lib/market";
import { platform } from "@/lib/platforms";
import { rngFor, gauss } from "@/lib/rng";
import { State } from "@/lib/store";
import { Bars } from "./charts";

// ---------------- Portfolio ----------------

export function Portfolio({ snaps, state, update, reset, open }: {
  snaps: Map<string, Snap>; state: State; update: (fn: (s: State) => State) => void; reset: () => void; open: (id: string) => void;
}) {
  const rows = Object.values(state.holdings).map((h) => ({ h, s: snaps.get(h.listingId) })).filter((x) => x.s) as { h: State["holdings"][string]; s: Snap }[];
  const live = rows.filter((r) => r.s.status === "open" || r.s.status === "closed");
  const done = rows.filter((r) => r.s.status === "settled" || r.s.status === "void");
  const marked = live.reduce((t, r) => t + r.h.shares * r.s.price, 0);
  const realised = done.reduce((t, r) => t + (state.paid[r.h.listingId] ?? 0) - r.h.cost, 0);
  const callPts = done.reduce((t, r) => t + (r.h.call && r.s.status === "settled" ? callPoints(r.h.call, viewsAt(r.s.l, SETTLE_H)) : 0), 0);
  const ff = (h: number) => update((s) => ({ ...s, clockH: h === 0 ? 0 : s.clockH + h }));

  return (
    <div className="page">
      <div className="page-head"><h1>Your book.</h1><p>Positions, settled markets and your scouting record.</p></div>
      <div className="kpis">
        <div className="kpi"><div className="k">Coins</div><div className="v num">{Math.round(state.coins)}</div><div className="s">+200 every day you play</div></div>
        <div className="kpi"><div className="k">Open positions</div><div className="v num">{Math.round(marked)}</div><div className="s">at current prices</div></div>
        <div className="kpi"><div className="k">Settled P&amp;L</div><div className={`v num ${realised >= 0 ? "up" : "down"}`}>{fmtSigned(realised)}</div><div className="s">coins</div></div>
        <div className="kpi"><div className="k">Call points</div><div className="v num">{callPts}</div><div className="s">closest-call score</div></div>
      </div>

      <Section title="Open" empty="Nothing open. Scroll the feed and buy into something early." rows={live} state={state} open={open} />
      <Section title="Settled" empty="Nothing settled yet. Markets settle 7 days after listing." rows={done} state={state} open={open} />

      <div className="section">
        <h2>Demo clock <span className="dim" style={{ fontWeight: 400, fontSize: 12 }}>prototype only</span></h2>
        <p className="hint" style={{ marginBottom: 10 }}>Markets take days to play out. Jump ahead to watch your positions move and settle. {state.clockH ? `Currently +${state.clockH}h.` : ""}</p>
        <div className="quick">
          <button className="btn small" onClick={() => ff(6)}>+6 hours</button>
          <button className="btn small" onClick={() => ff(24)}>+1 day</button>
          <button className="btn small" onClick={() => ff(SETTLE_H)}>+7 days</button>
          <button className="btn small" onClick={() => ff(0)} disabled={!state.clockH}>Back to now</button>
          <button className="btn small" onClick={() => { if (confirm("Clear your coins, positions and listings in this browser?")) reset(); }}>Reset my game</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, empty, rows, state, open }: { title: string; empty: string; rows: { h: State["holdings"][string]; s: Snap }[]; state: State; open: (id: string) => void }) {
  return (
    <div className="section">
      <h2>{title}</h2>
      {rows.length === 0 ? <div className="empty">{empty}</div> : (
        <div className="list">
          {rows.map(({ h, s }) => {
            const l = s.l;
            const settled = s.status === "settled";
            const paid = state.paid[l.id];
            const worth = s.status === "void" ? h.cost : settled ? h.shares * shareValue(s.growth) : h.shares * s.price;
            const pnl = worth - h.cost;
            return (
              <button className="pos" key={l.id} style={{ width: "100%", textAlign: "left" }} onClick={() => open(l.id)}>
                <div>
                  <div className="t">${ticker(l)} · {l.title}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                    {platform(l.platform).short} · {h.shares} shares{h.founder ? ` (${h.founder} founder)` : ""} · paid {Math.round(h.cost)} · growth {fmtX(s.growth)}
                    {h.call ? ` · call ${fmtNum(h.call)}${settled ? ` → ${fmtNum(viewsAt(l, SETTLE_H))} (${callPoints(h.call, viewsAt(l, SETTLE_H))} pts)` : ""}` : ""}
                    {s.status === "void" ? " · voided, refunded" : ""}
                    {settled && paid != null ? ` · paid out ${Math.round(paid)}` : ""}
                  </div>
                </div>
                <div className={`num r ${pnl >= 0 ? "up" : "down"}`} style={{ fontWeight: 700 }}>{fmtSigned(pnl)}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- Leaders ----------------

const PLAYERS = [
  "chartgoblin", "fyp.oracle", "reelwhisperer", "earlybird.09", "hypehunter", "algo.astrologer", "viralvaidya", "scrolltrader", "loopqueen",
  "trendtrader.in", "sleeperpicks", "nocapcapital", "bullish.on.cats", "reelrishi", "contrarian.kid", "hookhunter", "saves.not.likes",
];

export function Leaders({ state, snaps, day }: { state: State; snaps: Map<string, Snap>; day: string }) {
  const [tab, setTab] = useState<"traders" | "scouts" | "calls">("traders");
  const r = rngFor(`lb:${day}`);
  const mock = PLAYERS.map((n) => ({ name: n, pnl: Math.round(gauss(r) * 900 + 400), scout: Math.max(1, 1 + Math.abs(gauss(r)) * 6), hits: Math.floor(r() * 5), calls: Math.round(Math.max(0, gauss(r) * 120 + 180)) }));
  let pnl = 0, calls = 0;
  for (const h of Object.values(state.holdings)) {
    const s = snaps.get(h.listingId);
    if (!s || (s.status !== "settled" && s.status !== "void")) continue;
    pnl += (state.paid[h.listingId] ?? 0) - h.cost;
    if (h.call && s.status === "settled") calls += callPoints(h.call, viewsAt(s.l, SETTLE_H));
  }
  const mine = state.myListings.map((m) => snaps.get(m.id)).filter(Boolean) as Snap[];
  const me = { name: "You", pnl: Math.round(pnl), scout: mine.length ? median(mine.map((s) => s.growth)) : 0, hits: mine.filter((s) => s.growth >= 10).length, calls, me: true };
  const all = [...mock, me];
  const key = tab === "traders" ? "pnl" : tab === "scouts" ? "scout" : "calls";
  const sorted = [...all].sort((a, b) => (b[key] as number) - (a[key] as number));
  return (
    <div className="page">
      <div className="page-head"><h1>Who called it first.</h1><p>This week. Other players are sample data until accounts go live.</p></div>
      <div className="quick" style={{ marginBottom: 14 }}>
        {(["traders", "scouts", "calls"] as const).map((t) => <button key={t} className={`pill ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t === "traders" ? "Top traders" : t === "scouts" ? "Best scouts" : "Sharpest calls"}</button>)}
      </div>
      <p className="hint" style={{ marginBottom: 12 }}>
        {tab === "traders" ? "Settled profit in coins." : tab === "scouts" ? "Median growth of the posts they listed, after listing. Hits = posts that grew 10× or more." : "Points from closest calls on 7-day numbers (100 = exact)."}
      </p>
      <div className="scroll-x">
        <table className="table">
          <thead><tr><th style={{ width: 48 }}>#</th><th>Player</th>{tab === "scouts" && <th className="r">Hits</th>}<th className="r">{tab === "traders" ? "P&L" : tab === "scouts" ? "Median growth" : "Points"}</th></tr></thead>
          <tbody>
            {sorted.map((p, i) => (
              <tr key={p.name} className={"me" in p ? "lb-me" : ""}>
                <td className="num">{i + 1}</td>
                <td className="handle">{p.name}</td>
                {tab === "scouts" && <td className="r num">{p.hits}</td>}
                <td className={`r num ${tab === "traders" ? (p.pnl >= 0 ? "up" : "down") : ""}`}>{tab === "traders" ? fmtSigned(p.pnl) : tab === "scouts" ? (p.scout ? fmtX(p.scout) : "—") : p.calls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------- Insights ----------------

const ageBucket = (h: number) => (h < 1 ? "Under 1h" : h < 6 ? "1–6h" : "6–24h");
const tierBucket = (f: number) => (f < 1e4 ? "Under 10K" : f < 1e5 ? "10K–100K" : f < 1e6 ? "100K–1M" : "1M+");

export function Insights({ now }: { now: number }) {
  const hist = useMemo(() => archive(now), [now]);
  const rows = (b: ReturnType<typeof breakdown>) => b.map((r) => ({ key: r.key, value: r.median, note: `${Math.round(r.hitRate * 100)}% 10×`, tip: `${r.n} listings · median growth ${fmtX(r.median)} · ${Math.round(r.hitRate * 100)}% grew 10×+` }));
  const byPlat = breakdown(hist, (l) => platform(l.platform).short);
  const byAge = breakdown(hist, (l) => ageBucket(l.postAgeAtListH), ["Under 1h", "1–6h", "6–24h"]);
  const byTier = breakdown(hist, (l) => tierBucket(l.creatorFollowers), ["Under 10K", "10K–100K", "100K–1M", "1M+"]);
  const byFormat = breakdown(hist, (l) => l.tags.format);
  const byHook = breakdown(hist, (l) => l.tags.hook);
  const byLen = breakdown(hist.filter((l) => l.tags.lengthSec), (l) => lengthBucket(l.tags.lengthSec).label, LENGTH_ORDER);
  const mispriced = hist.map((l) => ({ l, p: priceAt(crowdShares(l, BUY_WINDOW_H)), v: shareValue(l.growth) }));
  const under = [...mispriced].sort((a, b) => b.v / b.p - a.v / a.p).slice(0, 5);
  const over = [...mispriced].sort((a, b) => b.p / b.v - a.p / a.v).slice(0, 5);
  const marketErr = median(mispriced.map((m) => Math.abs(m.p - m.v)));

  return (
    <div className="page">
      <div className="page-head"><h1>What&apos;s working.</h1><p>For creators and agencies: what grows after it gets spotted, by platform, niche, format and timing. And where the crowd gets it wrong.</p></div>
      <div className="mock-note" style={{ maxWidth: "none", marginBottom: 18 }}>
        Sample data: computed from {hist.length} simulated settled listings. Once live, these numbers come from real listed posts, the tags scouts add, and real trades.
      </div>
      <div className="kpis">
        <div className="kpi"><div className="k">Settled listings</div><div className="v num">{hist.length}</div><div className="s">last 3 weeks</div></div>
        <div className="kpi"><div className="k">Median growth after listing</div><div className="v num">{fmtX(median(hist.map((l) => l.growth)))}</div><div className="s">7 days</div></div>
        <div className="kpi"><div className="k">Grew 10× or more</div><div className="v num">{Math.round((hist.filter((l) => l.growth >= 10).length / hist.length) * 100)}%</div><div className="s">of listings</div></div>
        <div className="kpi"><div className="k">Market miss</div><div className="v num">{fmtPrice(marketErr)}</div><div className="s">median gap, price at close vs payout</div></div>
      </div>
      <div className="section two">
        <div className="panel"><h3>Growth by how early it was listed</h3><Bars rows={rows(byAge)} fmt={fmtX} /><p className="hint" style={{ marginTop: 10 }}>Posts spotted in their first hour grow the most after listing. Scouting early is the edge.</p></div>
        <div className="panel"><h3>Growth by platform</h3><Bars rows={rows(byPlat)} fmt={fmtX} /></div>
        <div className="panel"><h3>By creator size</h3><Bars rows={rows(byTier)} fmt={fmtX} /></div>
        <div className="panel"><h3>By format</h3><Bars rows={rows(byFormat)} fmt={fmtX} /></div>
        <div className="panel"><h3>By hook</h3><Bars rows={rows(byHook)} fmt={fmtX} /></div>
        <div className="panel"><h3>By length (video)</h3><Bars rows={rows(byLen)} fmt={fmtX} /></div>
      </div>
      <div className="section two">
        <Mis title="Underpriced: the crowd missed these" items={under} />
        <Mis title="Overpriced: hype that didn't land" items={over} />
      </div>
    </div>
  );
}

function Mis({ title, items }: { title: string; items: { l: Listing; p: number; v: number }[] }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
      {items.map(({ l, p, v }) => (
        <div key={l.id} className="between" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
          <div>
            <div style={{ fontWeight: 600 }}>{l.title}</div>
            <div className="muted" style={{ fontSize: 12 }}>{platform(l.platform).short} · {l.tags.format} · {l.tags.hook} · price {fmtPrice(p)} → paid {fmtPrice(v)}</div>
          </div>
          <span className="num" style={{ fontWeight: 700 }}>{fmtX(l.growth)}</span>
        </div>
      ))}
    </div>
  );
}
