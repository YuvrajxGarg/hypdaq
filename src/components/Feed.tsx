"use client";
import { useState } from "react";
import {
  BUY_WINDOW_H, EARLY_NOTE, MAX_SHARES_PER_TRADE, SETTLE_H, fmtAge, fmtNum, fmtPct, fmtPrice, fmtX, priceAt, shareValue, ticker,
} from "@/lib/game";
import { NICHES } from "@/lib/catalog";
import { platform } from "@/lib/platforms";
import { Snap, sharesFor } from "@/lib/market";
import { State } from "@/lib/store";
import { ViewsChart } from "./charts";

export type Actions = {
  buy: (s: Snap, n: number, call?: number) => string | null;
  sell: (s: Snap, n: number) => string | null;
};

const hueOf = (niche: string) => NICHES.find((n) => n.id === niche)?.hue ?? 0;

export function postBg(niche: string, id: string) {
  const hue = hueOf(niche);
  const a = (id.length * 37 + id.charCodeAt(id.length - 1) * 13) % 70;
  return `radial-gradient(120% 70% at ${15 + a}% 8%, hsl(${hue} 85% 50% / .85), transparent 60%),
    radial-gradient(90% 60% at 90% 85%, hsl(${(hue + 40) % 360} 70% 28% / .9), transparent 70%),
    linear-gradient(165deg, hsl(${hue} 35% 13%), #050505)`;
}

const Icon = {
  eye: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  heart: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z" /></svg>,
  chat: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a8 8 0 0 1-11.8 7L3 21l2-6.2A8 8 0 1 1 21 12z" /></svg>,
  share: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>,
};

function PostVisual({ s }: { s: Snap }) {
  const l = s.l;
  if (l.platform === "youtube")
    return (
      <div className="post-body card" style={{ background: "linear-gradient(180deg,#0b0b0b,#000)" }}>
        <div className="yt-card" style={{ background: postBg(l.tags.niche, l.id) }}>
          <span className="play"><svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span>
          {l.title}
        </div>
      </div>
    );
  if (l.platform === "x")
    return (
      <div className="post-body card" style={{ background: "radial-gradient(80% 60% at 50% 30%, #161616, #000)" }}>
        <div className="x-card">
          <div className="who"><span className="av" style={{ background: postBg(l.tags.niche, l.id) }} /><div><b>{l.creator}</b><div className="muted">@{l.creator}</div></div></div>
          <p>{l.title}</p>
        </div>
      </div>
    );
  return (
    <div className="post-body" style={{ background: postBg(l.tags.niche, l.id) }}>
      <div className="post-cap">{l.title}</div>
    </div>
  );
}

export function Slide({ s, state, onTrade, onDetails }: { s: Snap; state: State; onTrade: (side: "buy" | "sell") => void; onDetails: () => void }) {
  const l = s.l;
  const p = platform(l.platform);
  const hold = state.holdings[l.id];
  const sellable = hold ? hold.shares - (hold.founder ?? 0) : 0;
  return (
    <div className="frame">
      <PostVisual s={s} />
      <div className="top-chips">
        <span className="status">{p.short} · {l.kind}</span>
        <span className={`status ${s.status === "open" ? "open" : s.status === "void" ? "void" : ""}`}>
          {s.status === "open" ? `Open · ${fmtAge(s.buyClosesIn)} left` : s.status === "closed" ? `Buying closed · settles in ${fmtAge(s.settlesIn)}` : s.status === "void" ? "Void · refunded" : "Settled"}
        </span>
      </div>
      <div className="rail">
        <div className="rail-price" onClick={onDetails} role="button">
          <div className="tk">${ticker(l)}</div>
          <div className="p num">{fmtPrice(s.status === "settled" ? shareValue(s.growth) : s.price)}</div>
          <div className={`num ${s.change >= 0 ? "up" : "down"}`} style={{ fontSize: 11, fontWeight: 600 }}>{s.status === "settled" ? "final" : s.t < 1 ? "new" : `${fmtPct(s.change)} 24h`}</div>
        </div>
        <button className="rail-btn buy" disabled={!s.canBuy} onClick={() => onTrade("buy")}><span className="ic">Buy</span>{s.canBuy ? `${fmtNum(s.holders)} in` : "closed"}</button>
        <button className="rail-btn" disabled={!s.canSell || sellable <= 0} onClick={() => onTrade("sell")}><span className="ic">Sell</span>{hold ? `${hold.shares} held` : "—"}</button>
        <button className="rail-btn" onClick={onDetails}><span className="ic num" style={{ fontSize: 12 }}>{fmtX(s.growth)}</span>growth</button>
      </div>
      <div className="post-info">
        <div className="who">@{l.creator} <span className="muted" style={{ fontWeight: 400 }}>· {fmtNum(l.creatorFollowers)}</span></div>
        <div className="title">{l.title}</div>
        <div className="scout">Scouted by {l.mine ? <b style={{ color: "#fff" }}>you</b> : `@${l.scout}`} · listed {fmtAge(s.t)} ago, when the post was {fmtAge(l.postAgeAtListH)} old</div>
        <div className="real">
          <span title={p.unit}>{Icon.eye}{fmtNum(s.eng.views)} {l.platform === "x" ? "eng." : ""}</span>
          <span title="Likes">{Icon.heart}{fmtNum(s.eng.likes)}</span>
          <span title="Comments">{Icon.chat}{fmtNum(s.eng.comments)}</span>
          <span title={l.platform === "x" ? "Reposts" : "Shares"}>{Icon.share}{fmtNum(s.eng.shares)}</span>
        </div>
      </div>
    </div>
  );
}

export function Details({ s, state }: { s: Snap; state: State }) {
  const l = s.l;
  const hold = state.holdings[l.id];
  const p = platform(l.platform);
  return (
    <>
      <div className="panel">
        <div className="between" style={{ marginBottom: 6 }}>
          <h3 style={{ margin: 0 }}>${ticker(l)} price</h3>
          <span className="muted num" style={{ fontSize: 12 }}>{fmtNum(s.shares)} shares out</span>
        </div>
        <ViewsChart points={s.history} maxH={Math.max(1, Math.min(s.t, SETTLE_H))} fmt={fmtPrice} unit="" yMin={1} label="Price since listing" cutoff={BUY_WINDOW_H < s.t ? BUY_WINDOW_H : undefined}
          refs={[{ label: "Worth now", value: shareValue(s.growth), dashed: true }]} />
      </div>
      <div className="panel">
        <div className="kv">
          <div><div className="k">Price</div><div className="v num">{fmtPrice(s.price)}</div></div>
          <div><div className="k">A share would pay now</div><div className="v num">{fmtPrice(shareValue(s.growth))}</div></div>
          <div><div className="k">{p.unit} at listing</div><div className="v num">{fmtNum(s.eng.views / s.growth)}</div></div>
          <div><div className="k">Growth since listing</div><div className="v num">{fmtX(s.growth)}</div></div>
          <div><div className="k">Holders</div><div className="v num">{fmtNum(s.holders)}</div></div>
          <div><div className="k">{s.status === "open" ? "Buying closes" : "Settles"}</div><div className="v num">{s.status === "open" ? `in ${fmtAge(s.buyClosesIn)}` : s.settlesIn > 0 ? `in ${fmtAge(s.settlesIn)}` : "done"}</div></div>
        </div>
      </div>
      {hold && (
        <div className="panel">
          <h3>Your position</h3>
          <div className="kv">
            <div><div className="k">Shares</div><div className="v num">{hold.shares}{hold.founder ? <span className="muted" style={{ fontSize: 12 }}> ({hold.founder} founder)</span> : null}</div></div>
            <div><div className="k">Paid</div><div className="v num">{Math.round(hold.cost)}</div></div>
            <div><div className="k">Worth if settled now</div><div className="v num">{Math.round(hold.shares * shareValue(s.growth))}</div></div>
            <div><div className="k">Your call</div><div className="v num">{hold.call ? fmtNum(hold.call) : "—"}</div></div>
          </div>
        </div>
      )}
      <div className="panel">
        <h3>How this settles</h3>
        <p className="hint">
          {SETTLE_H / 24} days after listing we read the post&apos;s {p.unit}. Each share pays log₂(1 + growth): no growth pays 1.00, 3× pays 2.00, 15× pays 4.00.
          {" "}{EARLY_NOTE}
        </p>
        <p className="hint" style={{ marginTop: 8 }}>Numbers come from: {p.source}.</p>
      </div>
    </>
  );
}

const LOG_MIN = 1.5, LOG_MAX = 8;

export function TradeSheet({ s, side: initial, state, actions, onClose }: { s: Snap; side: "buy" | "sell"; state: State; actions: Actions; onClose: () => void }) {
  const [side, setSide] = useState(initial);
  const hold = state.holdings[s.l.id];
  const sellable = hold ? hold.shares - (hold.founder ?? 0) : 0;
  const maxBuy = Math.min(MAX_SHARES_PER_TRADE, sharesFor(state.coins, s.shares));
  const [n, setN] = useState(() => Math.min(side === "buy" ? 20 : sellable, side === "buy" ? maxBuy : sellable));
  const [withCall, setWithCall] = useState(!hold?.call);
  const nowViews = s.eng.views;
  const [logCall, setLogCall] = useState(() => Math.min(LOG_MAX, Math.log10(Math.max(100, nowViews * 3))));
  const [err, setErr] = useState<string | null>(null);
  const call = Math.round(Math.pow(10, logCall));
  const max = side === "buy" ? maxBuy : sellable;
  const nn = Math.min(n, max);
  const coins = side === "buy" ? s.cost(nn) : s.sellFor(nn);
  const unit = platform(s.l.platform).unit;

  const go = () => {
    const e = side === "buy" ? actions.buy(s, nn, withCall && s.canBuy ? call : undefined) : actions.sell(s, nn);
    if (e) setErr(e);
    else onClose();
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-label="Trade">
        <div className="grab" />
        <div className="between" style={{ marginBottom: 14 }}>
          <div><div className="muted" style={{ fontSize: 12 }}>${ticker(s.l)} · @{s.l.creator}</div><div className="num" style={{ fontSize: 26, fontWeight: 700 }}>{fmtPrice(s.price)}</div></div>
          <div className="seg" style={{ width: 180 }}>
            <button className={side === "buy" ? "on red" : ""} onClick={() => { setSide("buy"); setN(Math.min(20, maxBuy)); }} disabled={!s.canBuy}>Buy</button>
            <button className={side === "sell" ? "on" : ""} onClick={() => { setSide("sell"); setN(sellable); }} disabled={sellable <= 0}>Sell</button>
          </div>
        </div>
        <div className="between"><span className="muted">Shares</span><span className="num" style={{ fontSize: 20, fontWeight: 700 }}>{nn}</span></div>
        <input type="range" min={0} max={Math.max(0, max)} step={1} value={nn} onChange={(e) => setN(+e.target.value)} aria-label="Shares" disabled={max <= 0} />
        <div className="quick">
          {(side === "buy" ? [10, 25, 50, 100, 200] : [Math.ceil(sellable / 4), Math.ceil(sellable / 2), sellable]).filter((v, i, a) => v > 0 && a.indexOf(v) === i).map((v) => (
            <button key={v} className="btn small" disabled={v > max} onClick={() => setN(v)}>{v === sellable && side === "sell" ? "All" : v}</button>
          ))}
        </div>
        <div className="panel" style={{ marginTop: 14 }}>
          <div className="kv">
            <div><div className="k">{side === "buy" ? "Cost" : "You get"}</div><div className="v num">{Math.round(coins)} coins</div></div>
            <div><div className="k">Avg price</div><div className="v num">{nn ? fmtPrice(coins / nn) : "—"}</div></div>
            <div><div className="k">Price after</div><div className="v num">{fmtPrice(priceAt(s.shares + (side === "buy" ? nn : -nn)))}</div></div>
            <div><div className="k">Your coins</div><div className="v num">{Math.round(state.coins)}</div></div>
          </div>
        </div>
        {side === "buy" && (
          <div className="panel" style={{ marginTop: 12 }}>
            <label className="row" style={{ justifyContent: "space-between", cursor: "pointer" }}>
              <span><b>Closest call</b> <span className="muted">(optional)</span></span>
              <input type="checkbox" checked={withCall} onChange={(e) => setWithCall(e.target.checked)} />
            </label>
            {withCall && (
              <>
                <div className="hint" style={{ margin: "8px 0 2px" }}>{unit} 7 days after listing. Now: {fmtNum(nowViews)}.</div>
                <div className="num" style={{ fontSize: 28, fontWeight: 700 }}>{fmtNum(call)}</div>
                <input type="range" min={LOG_MIN} max={LOG_MAX} step={0.01} value={logCall} onChange={(e) => setLogCall(+e.target.value)} aria-label="Your 7-day call" />
                <div className="quick">
                  {[1.5, 3, 10, 30].map((m) => <button key={m} className="btn small" onClick={() => setLogCall(Math.log10(Math.max(100, nowViews * m)))}>×{m}</button>)}
                </div>
              </>
            )}
          </div>
        )}
        {err && <p className="err" style={{ marginTop: 10 }}>{err}</p>}
        <button className="btn primary block" style={{ marginTop: 14 }} disabled={nn <= 0} onClick={go}>
          {side === "buy" ? `Buy ${nn} for ${Math.round(coins)}` : `Sell ${nn} for ${Math.round(coins)}`}
        </button>
        {side === "sell" && hold?.founder ? <p className="hint" style={{ marginTop: 8 }}>Your {hold.founder} founder shares are locked until settlement.</p> : null}
      </div>
    </>
  );
}
