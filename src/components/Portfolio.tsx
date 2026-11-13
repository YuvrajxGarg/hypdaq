"use client";
import {
  SETTLE_DAYS, STAGES, addDays, creatorIndexOn, creatorPayout, dailyFloor, daysBetween, deepCutPoints, deepCuts, fmtSigned,
  fmtViews, leaderboard, prettyDay, reelPayout,
} from "@/lib/engine";
import { State } from "@/lib/store";

type Props = { today: string; state: State; isSettled: (d: string) => boolean; update: (fn: (s: State) => State) => void; reset: () => void; toast: (m: string) => void };

export function dayResults(state: State, day: string) {
  const floor = dailyFloor(day);
  const reels = Object.values(state.reels).filter((p) => p.day === day).map((p) => {
    const r = floor.find((x) => x.id === p.reelId)!;
    return { p, r, res: reelPayout(p.stake, p.pred, r.finalViews, STAGES[p.stage].mult) };
  });
  const creators = Object.values(state.creators).filter((p) => p.day === day).map((p) => {
    const exit = creatorIndexOn(p.handle, addDays(day, SETTLE_DAYS));
    return { p, exit, res: creatorPayout(p.stake, p.side, p.entry, exit) };
  });
  const deepId = state.deep[day];
  const deep = deepId ? deepCuts(day).find((c) => c.id === deepId) : undefined;
  const net = reels.reduce((s, x) => s + x.res.net, 0) + creators.reduce((s, x) => s + x.res.net, 0);
  return { reels, creators, deep, net, deepPts: deep ? deepCutPoints(deep) : 0 };
}

export function Portfolio({ today, state, isSettled, update, reset, toast }: Props) {
  const days = [...new Set([
    ...Object.values(state.reels).map((p) => p.day),
    ...Object.values(state.creators).map((p) => p.day),
    ...Object.keys(state.deep),
  ])].sort().reverse();

  let total = 0, totalPts = 0, early = 0;
  for (const d of days) if (isSettled(d)) {
    const res = dayResults(state, d);
    total += res.net; totalPts += res.deepPts;
    early += res.reels.filter((x) => x.p.stage === 0 && x.res.net > 0 && x.r.finalViews >= 1e6).length;
  }
  const lb = leaderboard(today);
  const me = { name: "you", net: total, early };
  const rows = [...lb, me].sort((a, b) => b.net - a.net);
  const rank = rows.indexOf(me) + 1;

  return (
    <>
      <div className="kpis">
        <div className="kpi"><div className="k">Settled P&amp;L</div><div className={`v num ${total >= 0 ? "up" : "down"}`}>{fmtSigned(total)}</div><div className="s">coins, all settled days</div></div>
        <div className="kpi"><div className="k">Deep cut points</div><div className="v num">{totalPts}</div><div className="s">rarity-weighted</div></div>
        <div className="kpi"><div className="k">Called it early</div><div className="v num">{early}</div><div className="s">1M+ reels you bought at 2h</div></div>
        <div className="kpi"><div className="k">Weekly rank</div><div className="v num">#{rank}</div><div className="s">of {rows.length} (sample players)</div></div>
      </div>

      {days.length === 0 && <div className="empty section">No positions yet. Head to the Floor and back a reel.</div>}

      {days.map((d) => {
        const settled = isSettled(d);
        const res = dayResults(state, d);
        const left = SETTLE_DAYS - daysBetween(d, today);
        return (
          <div className="section" key={d}>
            <h2>
              {prettyDay(d)} {d === today && <span className="badge ghost">Today</span>}
              {settled ? <span className={`badge ${res.net >= 0 ? "up" : "down"}`}>Settled {fmtSigned(res.net)}</span> : <span className="badge ghost">Settles in {left}d</span>}
              {!settled && (
                <button className="btn small" style={{ marginLeft: "auto" }}
                  onClick={() => { update((s) => ({ ...s, demoSettled: { ...s.demoSettled, [d]: true } })); toast("Fast-forwarded 7 days (demo)"); }}>
                  Fast-forward 7 days (demo)
                </button>
              )}
            </h2>
            <div className="list">
              {res.reels.map(({ p, r, res: x }) => (
                <div className="pos" key={p.reelId}>
                  <div>
                    <div className="t">{r.caption}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                      @{r.creator.handle} · called {fmtViews(p.pred)} · {p.stake} at {STAGES[p.stage].label} ×{STAGES[p.stage].mult}
                      {settled && <> · actual <b style={{ color: "var(--text)" }}>{fmtViews(r.finalViews)}</b></>}
                    </div>
                  </div>
                  <div className={`num r ${settled ? (x.net >= 0 ? "up" : "down") : "dim"}`} style={{ fontWeight: 700 }}>{settled ? fmtSigned(x.net) : "open"}</div>
                </div>
              ))}
              {res.creators.map(({ p, exit, res: x }) => (
                <div className="pos" key={p.key}>
                  <div>
                    <div className="t">@{p.handle} goes {p.side}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                      Creator bet · {p.stake} at index {p.entry.toFixed(1)}{settled && <> → {exit.toFixed(1)}</>}
                    </div>
                  </div>
                  <div className={`num r ${settled ? (x.net >= 0 ? "up" : "down") : "dim"}`} style={{ fontWeight: 700 }}>{settled ? fmtSigned(x.net) : "open"}</div>
                </div>
              ))}
              {res.deep && (
                <div className="pos">
                  <div>
                    <div className="t">Deep cut: {res.deep.caption}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                      @{res.deep.handle} · picked by {Math.round(res.deep.crowdShare * 100)}% · {fmtViews(res.deep.viewsNow)} views at pick
                      {settled && <> → {fmtViews(res.deep.finalViews)}</>}
                    </div>
                  </div>
                  <div className={`num r ${settled ? "up" : "dim"}`} style={{ fontWeight: 700 }}>{settled ? `${res.deepPts} pts` : "open"}</div>
                </div>
              )}
              {!res.reels.length && !res.creators.length && !res.deep && <div className="pos muted">Nothing on this day.</div>}
            </div>
          </div>
        );
      })}

      <div className="section">
        <h2>Leaderboard · this week <span className="badge ghost">sample players</span></h2>
        <div className="scroll-x">
          <table className="table">
            <thead><tr><th style={{ width: 48 }}>#</th><th>Player</th><th className="r">Early calls</th><th className="r">P&amp;L</th></tr></thead>
            <tbody>
              {rows.slice(0, Math.max(10, rank)).map((r, i) => (
                <tr key={r.name} className={r === me ? "lb-me" : ""}>
                  <td className="num">{i + 1}</td>
                  <td className="handle">{r === me ? "You" : r.name}</td>
                  <td className="r num">{r.early}</td>
                  <td className={`r num ${r.net >= 0 ? "up" : "down"}`}>{fmtSigned(r.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 20 }}>
        <button className="btn small" onClick={() => { if (confirm("Clear all your positions in this browser?")) reset(); }}>Reset my game</button>
      </div>
    </>
  );
}
