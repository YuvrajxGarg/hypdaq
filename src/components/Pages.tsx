"use client";
import { H, Listing, callPoints, fmtNum, fmtSigned, fmtX, median, metric, settleStat, shareValue, ticker } from "@/lib/game";
import { Snap } from "@/lib/market";
import { platform } from "@/lib/platforms";
import { State } from "@/lib/store";
import { Bars } from "./charts";

// ---------------- Portfolio ----------------

export type Row = { h: State["holdings"][string]; s: Snap };
const isLive = (s: Snap) => s.status === "open" || s.status === "closed" || s.status === "settling";
const callResult = (l: Listing, call: number) => { const st = settleStat(l); return st ? { actual: metric(l, st), pts: callPoints(call, metric(l, st)) } : null; };

/** Your book: open and settled positions, their value and P&L. */
export function bookStats(snaps: Map<string, Snap>, state: State) {
  const rows = Object.values(state.holdings).map((h) => ({ h, s: snaps.get(h.listingId) })).filter((x) => x.s) as Row[];
  const live = rows.filter((r) => isLive(r.s));
  const done = rows.filter((r) => !isLive(r.s));
  const marked = live.reduce((t, r) => t + r.h.shares * r.s.price, 0);
  const openPnl = live.reduce((t, r) => t + r.h.shares * r.s.price - r.h.cost, 0);
  const realised = done.reduce((t, r) => t + (state.paid[r.h.listingId] ?? 0) - r.h.cost, 0);
  const callPts = done.reduce((t, r) => t + (r.h.call && r.s.status === "settled" ? callResult(r.s.l, r.h.call)?.pts ?? 0 : 0), 0);
  return { live, done, marked, openPnl, realised, callPts };
}

export function Portfolio({ snaps, state, reset, open }: { snaps: Map<string, Snap>; state: State; reset: () => void; open: (id: string) => void }) {
  const { live, done } = bookStats(snaps, state);
  return (
    <div className="page-anim">
      <Section title="Open" empty="Nothing open yet. List a post you think will blow up, or buy into one you've listed." rows={live} state={state} open={open} />
      <Section title="Settled" empty="Nothing settled yet. Markets settle 7 days after listing, on the post's real numbers." rows={done} state={state} open={open} />
      <div className="section">
        <p className="hint" style={{ marginBottom: 10 }}>Your coins, listings and positions are saved in this browser. Accounts and a shared market come next.</p>
        <button className="btn small" onClick={() => { if (confirm("Clear your coins, positions and listings in this browser?")) reset(); }}>Reset my game</button>
      </div>
    </div>
  );
}

function Section({ title, empty, rows, state, open }: { title: string; empty: string; rows: Row[]; state: State; open: (id: string) => void }) {
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
            const call = h.call ? callResult(l, h.call) : null;
            return (
              <button className="pos" key={l.id} onClick={() => open(l.id)}>
                <div style={{ minWidth: 0 }}>
                  <div className="t">${ticker(l)} · {l.title}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                    {platform(l.platform).short} · {h.shares} shares{h.founder ? ` (${h.founder} founder)` : ""} · paid {Math.round(h.cost)} · growth {fmtX(s.growth)}
                    {h.call ? ` · guess ${fmtNum(h.call)}${settled && call ? ` → ${fmtNum(call.actual)} (${call.pts} pts)` : ""}` : ""}
                    {s.status === "void" ? " · voided, refunded" : ""}
                    {s.status === "settling" ? " · waiting for the day-7 reading" : ""}
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

// ---------------- Insights ----------------

const ageBucket = (h: number) => (h < 1 ? "Under 1h" : h < 6 ? "1–6h" : "6–24h");

function groups(ls: Snap[], key: (s: Snap) => string, order?: string[]) {
  const g = new Map<string, Snap[]>();
  for (const s of ls) g.set(key(s), [...(g.get(key(s)) ?? []), s]);
  const rows = [...g.entries()].map(([k, xs]) => ({
    key: k, value: median(xs.map((s) => s.growth)), note: `${xs.length}`,
    tip: `${xs.length} listing${xs.length > 1 ? "s" : ""} · median growth ${fmtX(median(xs.map((s) => s.growth)))}`,
  }));
  if (order) rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  else rows.sort((a, b) => b.value - a.value);
  return rows;
}

/** What grew after it was listed, from real settled listings only. */
export function Insights({ snaps }: { snaps: Map<string, Snap> }) {
  const done = [...snaps.values()].filter((s) => s.status === "settled");
  if (done.length < 3) {
    return (
      <div className="page-anim">
        <div className="empty">
          Insights appear once 3 markets have settled on real numbers ({done.length}/3 so far). They show what grew after it was spotted: by platform,
          by how early it was listed, and the biggest movers.
        </div>
      </div>
    );
  }
  const top = [...done].sort((a, b) => b.growth - a.growth).slice(0, 5);
  return (
    <div className="page-anim">
      <div className="kpis">
        <div className="kpi"><div className="k">Settled markets</div><div className="v num">{done.length}</div></div>
        <div className="kpi"><div className="k">Median growth</div><div className="v num">{fmtX(median(done.map((s) => s.growth)))}</div><div className="s">7 days after listing</div></div>
        <div className="kpi"><div className="k">Grew 10× or more</div><div className="v num">{Math.round((done.filter((s) => s.growth >= 10).length / done.length) * 100)}%</div></div>
        <div className="kpi"><div className="k">Voided</div><div className="v num">{[...snaps.values()].filter((s) => s.status === "void").length}</div><div className="s">fake views caught</div></div>
      </div>
      <div className="section two">
        <div className="panel"><h3>Growth by platform</h3><Bars rows={groups(done, (s) => platform(s.l.platform).short)} fmt={fmtX} /></div>
        <div className="panel"><h3>Growth by how early it was listed</h3><Bars rows={groups(done, (s) => ageBucket(s.l.postedAt ? (s.l.listedAt - s.l.postedAt) / H : 12), ["Under 1h", "1–6h", "6–24h"])} fmt={fmtX} /></div>
      </div>
      <div className="section">
        <div className="panel">
          <h3>Biggest movers</h3>
          {top.map((s) => (
            <div key={s.l.id} className="between" style={{ padding: "8px 0", borderBottom: "1px solid var(--line)" }}>
              <div style={{ minWidth: 0 }}><div style={{ fontWeight: 600 }}>{s.l.title}</div><div className="muted" style={{ fontSize: 12 }}>{platform(s.l.platform).short} · @{s.l.creator}</div></div>
              <span className="num" style={{ fontWeight: 700 }}>{fmtX(s.growth)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
