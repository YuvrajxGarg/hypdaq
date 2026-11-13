"use client";
import { useState } from "react";
import { NICHES } from "@/lib/catalog";
import { DAILY_COINS, addDays, creatorBoard, creatorIndexOn, creatorPayout, fmtFollowers, fmtSigned, prettyDay, SETTLE_DAYS } from "@/lib/engine";
import { State, spentOn } from "@/lib/store";
import { Spark } from "./charts";

type Props = { day: string; state: State; settled: boolean; update: (fn: (s: State) => State) => void; toast: (m: string) => void };

export function Creators({ day, state, settled, update, toast }: Props) {
  const board = creatorBoard(day);
  const [stake, setStake] = useState(100);
  const left = DAILY_COINS - spentOn(state, day);
  const place = (handle: string, side: "viral" | "irrelevant", entry: number) => {
    const s = Math.min(stake, left);
    if (s <= 0) return;
    const key = `${day}:${handle}`;
    update((st) => ({ ...st, creators: { ...st.creators, [key]: { key, handle, day, side, stake: s, entry } } }));
    toast(`${s} on @${handle} going ${side}`);
  };
  return (
    <>
      <div className="between" style={{ marginBottom: 14, flexWrap: "wrap" }}>
        <p className="hint" style={{ maxWidth: 620 }}>
          Each creator has a Hype Index (100 = where they started on the board). Back them to go <b className="up">viral</b> or call them
          <b className="down"> irrelevant</b>. Positions settle on {prettyDay(addDays(day, SETTLE_DAYS))}: you win 3× the index move in your direction, and can lose at most your stake.
        </p>
        <div className="row">
          <span className="muted">Stake</span>
          {[50, 100, 250].map((v) => (
            <button key={v} className={`btn small ${stake === v ? "primary" : ""}`} onClick={() => setStake(v)}>{v}</button>
          ))}
        </div>
      </div>
      <div className="scroll-x">
        <table className="table">
          <thead>
            <tr><th>Creator</th><th className="hide-sm">Niche</th><th className="r hide-sm">Followers</th><th>30 days</th><th className="r">Index</th><th className="r">7d</th><th className="r">Your call</th></tr>
          </thead>
          <tbody>
            {board.map((c) => {
              const pos = state.creators[`${day}:${c.handle}`];
              const exit = settled && pos ? creatorIndexOn(c.handle, addDays(day, SETTLE_DAYS)) : null;
              const res = pos && exit ? creatorPayout(pos.stake, pos.side, pos.entry, exit) : null;
              return (
                <tr key={c.handle}>
                  <td><div className="handle">@{c.handle}</div><div className="dim" style={{ fontSize: 12 }}>{c.blurb}</div></td>
                  <td className="hide-sm muted">{NICHES.find((n) => n.id === c.niche)?.label}</td>
                  <td className="r num hide-sm">{fmtFollowers(c.followers)}</td>
                  <td><Spark values={c.history} w={90} h={26} color={c.change7 >= 0 ? "#3ddc84" : "#ff6b6b"} /></td>
                  <td className="r num">{c.index.toFixed(1)}</td>
                  <td className={`r num ${c.change7 >= 0 ? "up" : "down"}`}>{(c.change7 * 100).toFixed(1)}%</td>
                  <td className="r">
                    {pos ? (
                      <div>
                        <span className={`badge ${pos.side === "viral" ? "up" : "down"}`}>{pos.side} · {pos.stake}</span>
                        {res && <div className={`num ${res.net >= 0 ? "up" : "down"}`} style={{ fontSize: 12, marginTop: 4 }}>{fmtSigned(res.net)} ({(res.ret * 100).toFixed(1)}%)</div>}
                      </div>
                    ) : settled ? (
                      <span className="dim">Closed</span>
                    ) : (
                      <div className="side">
                        <button className="btn viral" disabled={left <= 0} onClick={() => place(c.handle, "viral", c.index)}>Viral ↑</button>
                        <button className="btn irr" disabled={left <= 0} onClick={() => place(c.handle, "irrelevant", c.index)}>Irrelevant ↓</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
