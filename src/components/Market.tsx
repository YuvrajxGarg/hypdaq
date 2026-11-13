"use client";
import { useState } from "react";
import { BUY_WINDOW_H, MAX_SHARES_PER_TRADE, SETTLE_H, fmtAge, fmtNum, fmtPct, fmtPrice, fmtX, shareValue, ticker } from "@/lib/game";
import { NICHES } from "@/lib/catalog";
import { platform } from "@/lib/platforms";
import { Snap, sharesFor } from "@/lib/market";
import { State } from "@/lib/store";
import { Spark, ViewsChart } from "./charts";
import { Chip, Num, burst } from "./fx";

export type Actions = {
  buy: (s: Snap, n: number, call?: number) => string | null;
  sell: (s: Snap, n: number) => string | null;
};
export type Sort = "For you" | "New" | "Rising" | "Ended";

const hueOf = (niche: string) => NICHES.find((n) => n.id === niche)?.hue ?? 0;

export function postBg(niche: string, id: string) {
  const hue = hueOf(niche);
  const a = (id.length * 37 + id.charCodeAt(id.length - 1) * 13) % 70;
  return `radial-gradient(120% 70% at ${15 + a}% 8%, hsl(${hue} 80% 48% / .8), transparent 60%),
    radial-gradient(90% 60% at 90% 85%, hsl(${(hue + 40) % 360} 70% 26% / .9), transparent 70%),
    linear-gradient(165deg, hsl(${hue} 35% 13%), #050505)`;
}
export const avBg = (creator: string) => {
  let h = 0;
  for (const c of creator) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 50) % 360} 60% 30%))`;
};

const sv = (d: React.ReactNode, size = 22, fill = "none", sw = 1.8) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill === "none" ? "currentColor" : "none"} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);
export const I = {
  trend: (s = 26) => sv(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>, s),
  people: (s = 26) => sv(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></>, s),
  rocket: (s = 26) => sv(<><path d="M12 3c3 2 5 5.5 5 9.5L15 16H9l-2-3.5C7 8.5 9 5 12 3z" /><circle cx="12" cy="10" r="1.6" /><path d="M9 16l-2 4M15 16l2 4" /></>, s),
  eye: (s = 14) => sv(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>, s),
  heart: (s = 14) => sv(<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z" />, s),
  chat: (s = 14) => sv(<path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6.2A8 8 0 1 1 21 12z" />, s),
  repost: (s = 14) => sv(<><path d="M17 2l4 4-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="M7 22l-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></>, s),
  send: (s = 14) => sv(<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />, s),
  bars: (s = 14) => sv(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />, s),
  play: (s = 22) => sv(<path d="M8 5v14l11-7z" />, s, "#fff"),
  back: (s = 18) => sv(<path d="M15 18l-6-6 6-6" />, s),
  plus: (s = 22) => sv(<path d="M12 5v14M5 12h14" />, s),
  reels: (s = 22) => sv(<><rect x="3" y="3" width="18" height="18" rx="5" /><path d="M3 8h18M8 3l3 5M14 3l3 5" /><path d="M10 11.5v5l4.5-2.5z" /></>, s),
  yt: (s = 22) => sv(<><rect x="2.5" y="5" width="19" height="14" rx="4" /><path d="M10 9.5v5l4.5-2.5z" /></>, s),
  x: (s = 20) => sv(<><path d="M4 5h16M4 10h16M4 15h10" /><path d="M4 20h7" /></>, s),
  user: (s = 22) => sv(<><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>, s),
};

export function statusLine(s: Snap) {
  if (s.status === "open") return `Buying open · ${fmtAge(s.buyClosesIn)} left`;
  if (s.status === "closed") return `Buying closed · settles in ${fmtAge(s.settlesIn)}`;
  if (s.status === "void") return "Voided: fake views, everyone refunded";
  return `Settled · paid ${fmtPrice(shareValue(s.growth))} a share`;
}
export const changeTxt = (s: Snap) => (s.status === "settled" ? "final" : s.status === "void" ? "void" : s.t < 1 ? "new" : fmtPct(s.change));
export const shownPrice = (s: Snap) => (s.status === "settled" ? shareValue(s.growth) : s.price);

export function Change({ s }: { s: Snap }) {
  const live = s.status === "open" || s.status === "closed";
  return live && s.t >= 1 ? <Chip v={s.change} /> : <Chip v={0} label={changeTxt(s)} />;
}

/** The market for one post: price, chart, a few numbers, your position. Used in side panels and detail pages. */
export function MarketBox({ s, state, chart = true }: { s: Snap; state: State; chart?: boolean }) {
  const l = s.l;
  const hold = state.holdings[l.id];
  const p = platform(l.platform);
  return (
    <div className="mbox">
      <div>
        <div className="muted" style={{ fontSize: 12 }}>${ticker(l)} · {statusLine(s)}</div>
        <div className="row" style={{ alignItems: "baseline", marginTop: 4 }}>
          <Num className="big" value={shownPrice(s)} fmt={fmtPrice} />
          <Change s={s} />
        </div>
      </div>
      {chart && <ViewsChart points={s.history} maxH={Math.max(1, Math.min(s.t, SETTLE_H))} fmt={fmtPrice} unit="" yMin={1} label="Price since listing"
        cutoff={BUY_WINDOW_H < s.t ? BUY_WINDOW_H : undefined} refs={[{ label: "Pays now", value: shareValue(s.growth), dashed: true }]} />}
      <div className="kv">
        <div><div className="k">A share pays now</div><div className="v num">{fmtPrice(shareValue(s.growth))}</div></div>
        <div><div className="k">Growth since listing</div><div className="v num">{fmtX(s.growth)}</div></div>
        <div><div className="k">{p.unit[0].toUpperCase() + p.unit.slice(1)}</div><div className="v num">{fmtNum(s.eng.views)}</div></div>
        <div><div className="k">Holders</div><div className="v num">{fmtNum(s.holders)}</div></div>
      </div>
      {hold && (
        <div className="stat-line" style={{ paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <span>You own <b className="num">{hold.shares}</b>{hold.founder ? ` (${hold.founder} founder)` : ""}</span>
          <span>Paid <b className="num">{Math.round(hold.cost)}</b></span>
          <span>Worth <b className="num">{Math.round(hold.shares * (s.status === "void" ? 0 : shownPrice(s)))}</b></span>
        </div>
      )}
      <p className="hint" style={{ fontSize: 12 }}>
        Settles {SETTLE_H / 24} days after listing on the post&apos;s {p.unit}. A share pays log₂(1 + growth): flat pays 1.00, 3× pays 2.00, 15× pays 4.00.
      </p>
    </div>
  );
}

const LOG_MIN = 1.5, LOG_MAX = 8;

export function TradeSheet({ s, side: initial, state, actions, onClose }: { s: Snap; side: "buy" | "sell"; state: State; actions: Actions; onClose: () => void }) {
  const hold = state.holdings[s.l.id];
  const sellable = hold ? hold.shares - (hold.founder ?? 0) : 0;
  const [side, setSide] = useState<"buy" | "sell">(initial === "sell" && sellable > 0 ? "sell" : s.canBuy ? "buy" : "sell");
  const maxBuy = Math.min(MAX_SHARES_PER_TRADE, sharesFor(state.coins, s.shares));
  const [n, setN] = useState(() => (side === "buy" ? Math.min(20, maxBuy) : sellable));
  const [guess, setGuess] = useState(false);
  const nowViews = s.eng.views;
  const [logCall, setLogCall] = useState(() => Math.min(LOG_MAX, Math.log10(Math.max(100, nowViews * 3))));
  const [err, setErr] = useState<string | null>(null);
  const call = Math.round(Math.pow(10, logCall));
  const max = side === "buy" ? maxBuy : sellable;
  const nn = Math.max(0, Math.min(n, max));
  const coins = side === "buy" ? s.cost(nn) : s.sellFor(nn);
  const unit = platform(s.l.platform).unit;

  const go = (ev: React.MouseEvent) => {
    const e = side === "buy" ? actions.buy(s, nn, guess ? call : undefined) : actions.sell(s, nn);
    if (e) return setErr(e);
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2);
    onClose();
  };
  const chips = side === "buy" ? [10, 25, 50, 100] : [Math.ceil(sellable / 4), Math.ceil(sellable / 2), sellable];

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Trade">
        <div className="grab" />
        <div className="between" style={{ marginBottom: 18 }}>
          <div className="row" style={{ minWidth: 0 }}>
            <span className="av" style={{ background: avBg(s.l.creator), width: 36, height: 36 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>${ticker(s.l)}</div>
              <div className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>@{s.l.creator}</div>
            </div>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <Spark values={s.history.map((p) => p.v)} w={64} h={28} color={s.change >= 0 ? "var(--up)" : "var(--down)"} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}><Num value={s.price} fmt={fmtPrice} /></div>
              <div style={{ fontSize: 12, marginTop: 2 }}><Change s={s} /></div>
            </div>
          </div>
        </div>
        {sellable > 0 && s.canBuy && (
          <div className="seg" style={{ marginBottom: 18 }}>
            <span className="ind" style={{ transform: side === "sell" ? "translateX(100%)" : "none" }} />
            <button className={side === "buy" ? "on" : ""} onClick={() => { setSide("buy"); setN(Math.min(20, maxBuy)); }}>Buy</button>
            <button className={side === "sell" ? "on" : ""} onClick={() => { setSide("sell"); setN(sellable); }}>Sell</button>
          </div>
        )}
        <div style={{ textAlign: "center", margin: "6px 0 10px" }}>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.05em" }}><Num value={nn} fmt={(v) => String(v)} /></div>
          <div className="muted" style={{ fontSize: 13 }}>shares · {side === "buy" ? "costs" : "you get"} <b className="num" style={{ color: "var(--text)" }}>{Math.round(coins)}</b> coins · avg {nn ? fmtPrice(coins / nn) : "–"}</div>
        </div>
        <input type="range" min={0} max={Math.max(0, max)} step={1} value={nn} onChange={(e) => setN(+e.target.value)} aria-label="Shares" disabled={max <= 0} />
        <div className="quick" style={{ justifyContent: "center", marginTop: 10 }}>
          {chips.filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
            <button key={v} className={`pill ${nn === v ? "on" : ""}`} disabled={v > max} onClick={() => setN(v)}>{side === "sell" && v === sellable ? "All" : v}</button>
          ))}
        </div>
        {side === "buy" && nn > 0 && (
          <p className="hint" style={{ textAlign: "center", marginTop: 14 }}>
            Pays {Math.round(nn * 2)} if the post grows 3× by day 7, {Math.round(nn * 4)} if it grows 15×.
          </p>
        )}
        {side === "buy" && (
          <div style={{ marginTop: 14, textAlign: "center" }}>
            {!guess ? (
              <button className="link" onClick={() => setGuess(true)}>Add a 7-day guess for bonus points</button>
            ) : (
              <div className="panel" style={{ textAlign: "left" }}>
                <div className="between"><span className="muted" style={{ fontSize: 13 }}>{unit} on day 7 (now {fmtNum(nowViews)})</span><button className="link" onClick={() => setGuess(false)}>Remove</button></div>
                <div className="num" style={{ fontSize: 24, fontWeight: 700, margin: "4px 0" }}>{fmtNum(call)}</div>
                <input type="range" min={LOG_MIN} max={LOG_MAX} step={0.01} value={logCall} onChange={(e) => setLogCall(+e.target.value)} aria-label="Your 7-day guess" />
                <p className="hint" style={{ fontSize: 12 }}>100 points if exact, 0 if off by 10×.</p>
              </div>
            )}
          </div>
        )}
        {err && <p className="err" style={{ marginTop: 10, textAlign: "center" }}>{err}</p>}
        <button className={`btn block ${side === "buy" ? "red" : "white"}`} style={{ marginTop: 18 }} disabled={nn <= 0} onClick={go}>
          {side === "buy" ? `Buy ${nn} shares` : `Sell ${nn} shares`}
        </button>
        <p className="dim" style={{ fontSize: 12, textAlign: "center", marginTop: 10 }}>
          {side === "sell" && hold?.founder ? `${hold.founder} founder shares stay locked until settlement. ` : ""}You have {Math.round(state.coins)} coins.
        </p>
      </div>
    </>
  );
}
