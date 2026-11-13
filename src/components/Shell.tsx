"use client";
// App frame: live ticker tape, left nav, right account dock (desktop), top bar + bottom nav (phone),
// and the "You" hub that keeps portfolio, leaderboard and insights in one place.
import { useState } from "react";
import { GAME, fmtPrice, fmtSigned, ticker } from "@/lib/game";
import { PlatformId } from "@/lib/platforms";
import { Snap } from "@/lib/market";
import { State } from "@/lib/store";
import { Insights, Leaders, Portfolio, bookStats, leaderRows } from "./Pages";
import { Spark } from "./charts";
import { Chip, Num } from "./fx";
import { I, avBg } from "./Market";

export type Page = null | "list" | "you";
export type HubTab = "portfolio" | "leaders" | "insights";
export const APPS: { id: PlatformId; label: string; icon: (s?: number) => React.ReactNode }[] = [
  { id: "reels", label: "Reels", icon: I.reels }, { id: "youtube", label: "YouTube", icon: I.yt }, { id: "x", label: "X", icon: I.x },
];

export function Tape({ items, open }: { items: Snap[]; open: (id: string) => void }) {
  if (!items.length) return <div className="tape" />;
  const row = (k: string) => items.map((s) => (
    <button key={s.l.id + k} onClick={() => open(s.l.id)}>
      ${ticker(s.l)} <b className="num">{fmtPrice(s.price)}</b> <span className={`num ${s.change >= 0 ? "up" : "down"}`}>{s.change >= 0 ? "▲" : "▼"}{Math.abs(s.change * 100).toFixed(1)}%</span>
    </button>
  ));
  return (
    <div className="tape" aria-label="Live markets">
      <div className="tape-in">{row("a")}{row("b")}</div>
    </div>
  );
}

export function Side({ app, page, counts, go, goApp, held }: {
  app: PlatformId; page: Page; counts: Record<PlatformId, number>; held: number;
  go: (p: Page) => void; goApp: (a: PlatformId) => void;
}) {
  return (
    <nav className="side">
      <div className="brand"><span className="brand-dot" /><span className="brand-txt">{GAME}</span><small>beta</small></div>
      {APPS.map((a) => (
        <button key={a.id} className={`nav ${!page && app === a.id ? "on" : ""}`} onClick={() => goApp(a.id)} title={a.label}>
          {a.icon(20)}<span className="lbl">{a.label}</span><span className="count num">{counts[a.id]}</span>
        </button>
      ))}
      <div className="side-sep" />
      <button className={`nav ${page === "you" ? "on" : ""}`} onClick={() => go("you")} title="You">
        {I.user(20)}<span className="lbl">You</span>{held > 0 && <span className="count num">{held} open</span>}
      </button>
      <div className="side-foot">
        <button className="btn red" onClick={() => go("list")} title="List a post">{I.plus(18)}<span className="lbl">List a post</span></button>
        <p className="side-note">Sample data: posts, numbers and other players are simulated. Play money only.</p>
      </div>
    </nav>
  );
}

export function Dock({ state, snaps, day, open, openHub, onQuickList }: {
  state: State; snaps: Map<string, Snap>; day: string; open: (id: string) => void; openHub: (t: HubTab) => void; onQuickList: (link: string) => void;
}) {
  const b = bookStats(snaps, state);
  const lb = leaderRows(state, snaps, day, "traders");
  const myRank = lb.findIndex((p) => p.me) + 1;
  const [link, setLink] = useState("");
  return (
    <aside className="dock">
      <div className="card balance">
        <div className="between"><span className="label">Balance</span><span className="row" style={{ gap: 6, fontSize: 12, color: "var(--muted)" }}><span className="live-dot" />Live</span></div>
        <div className="big"><span className="coin" /><Num value={Math.round(state.coins)} fmt={(v) => v.toLocaleString("en-IN")} /></div>
        <div className="dim" style={{ fontSize: 12 }}>coins · +200 every day you play</div>
        <div className="mini-kpis">
          <div><div className="k">In markets</div><div className="v num">{Math.round(b.marked)}</div></div>
          <div><div className="k">Open P&amp;L</div><div className={`v num ${b.openPnl >= 0 ? "up" : "down"}`}>{fmtSigned(b.openPnl)}</div></div>
          <div><div className="k">Rank</div><div className="v num">#{myRank}</div></div>
        </div>
      </div>

      <div className="card">
        <h3>Positions <button onClick={() => openHub("portfolio")}>See all</button></h3>
        {b.live.length === 0 ? <p className="hint" style={{ fontSize: 13 }}>Nothing yet. Buy into a post early and it shows up here.</p> : (
          b.live.slice(0, 6).map(({ h, s }) => {
            const pnl = h.shares * s.price - h.cost;
            return (
              <button key={h.listingId} className="pos-row" onClick={() => open(h.listingId)}>
                <span className="av" style={{ background: avBg(s.l.creator) }} />
                <div style={{ minWidth: 0 }}>
                  <div className="t">${ticker(s.l)} <span className="dim num" style={{ fontWeight: 400 }}>×{h.shares}</span></div>
                  <div className="s">{s.l.title}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <Spark values={s.history.slice(-16).map((p) => p.v)} w={44} h={16} color={pnl >= 0 ? "var(--up)" : "var(--down)"} />
                  <div className={`num ${pnl >= 0 ? "up" : "down"}`} style={{ fontSize: 12, fontWeight: 600 }}>{fmtSigned(pnl)}</div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="card">
        <h3>Leaderboard <button onClick={() => openHub("leaders")}>See all</button></h3>
        {lb.slice(0, 3).map((p, i) => (
          <div key={p.name} className={`rank-row ${p.me ? "me" : ""}`}><span className={`medal ${i === 0 ? "g" : ""}`}>{i + 1}</span><span>{p.name}</span><span className="num">{fmtSigned(p.pnl)}</span></div>
        ))}
        {myRank > 3 && <div className="rank-row me"><span className="medal">{myRank}</span><span>You</span><span className="num">{fmtSigned(lb[myRank - 1].pnl)}</span></div>}
      </div>

      <div className="card">
        <h3>Spotted something?</h3>
        <form className="quick-list" onSubmit={(e) => { e.preventDefault(); onQuickList(link); setLink(""); }}>
          <input className="input" placeholder="Paste a post link" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Post link" />
          <button className="btn red" type="submit" aria-label="List">{I.plus(16)}</button>
        </form>
      </div>
    </aside>
  );
}

export function Hub({ tab, setTab, state, snaps, day, now, update, reset, open }: {
  tab: HubTab; setTab: (t: HubTab) => void; state: State; snaps: Map<string, Snap>; day: string; now: number;
  update: (fn: (s: State) => State) => void; reset: () => void; open: (id: string) => void;
}) {
  const b = bookStats(snaps, state);
  const lb = leaderRows(state, snaps, day, "traders");
  const myRank = lb.findIndex((p) => p.me) + 1;
  const net = b.marked + state.coins;
  return (
    <div className="page page-anim">
      <div className="hub-head">
        <div className="card balance">
          <span className="label">Net worth</span>
          <div className="big"><span className="coin" /><Num value={Math.round(net)} fmt={(v) => v.toLocaleString("en-IN")} /></div>
          <div className="row" style={{ gap: 8, fontSize: 13 }}>
            <span className="muted">{Math.round(state.coins)} coins + {Math.round(b.marked)} in markets</span>
          </div>
        </div>
        <div className="mini-kpis" style={{ marginTop: 0, gridTemplateColumns: "1fr 1fr" }}>
          <div><div className="k">Open P&amp;L</div><div className={`v num ${b.openPnl >= 0 ? "up" : "down"}`} style={{ fontSize: 20 }}>{fmtSigned(b.openPnl)}</div></div>
          <div><div className="k">Settled P&amp;L</div><div className={`v num ${b.realised >= 0 ? "up" : "down"}`} style={{ fontSize: 20 }}>{fmtSigned(b.realised)}</div></div>
          <div><div className="k">Rank this week</div><div className="v num" style={{ fontSize: 20 }}>#{myRank} <Chip v={0} label={`of ${lb.length}`} /></div></div>
          <div><div className="k">Call points</div><div className="v num" style={{ fontSize: 20 }}>{b.callPts}</div></div>
        </div>
      </div>
      <div className="tabs">
        {(["portfolio", "leaders", "insights"] as const).map((t) => (
          <button key={t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t === "portfolio" ? "Portfolio" : t === "leaders" ? "Leaderboard" : "Insights"}</button>
        ))}
      </div>
      {tab === "portfolio" && <Portfolio snaps={snaps} state={state} update={update} reset={reset} open={open} />}
      {tab === "leaders" && <Leaders state={state} snaps={snaps} day={day} />}
      {tab === "insights" && <Insights now={now} />}
    </div>
  );
}
