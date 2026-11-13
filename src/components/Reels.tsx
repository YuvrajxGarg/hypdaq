"use client";
import { useEffect, useRef, useState } from "react";
import { fmtNum, fmtPrice, fmtX } from "@/lib/game";
import { Snap } from "@/lib/market";
import { State } from "@/lib/store";
import { Num } from "./fx";
import { Change, I, MarketBox, Sort, avBg, postBg, shownPrice } from "./Market";

const TABS: Sort[] = ["For you", "New", "Rising", "Ended"];

export function Reels({ feed, sort, setSort, state, focus, onTrade, onList }: {
  feed: Snap[]; sort: Sort; setSort: (s: Sort) => void; state: State; focus: string | null;
  onTrade: (id: string, side: "buy" | "sell") => void; onList: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const i = focus ? feed.findIndex((s) => s.l.id === focus) : -1;
    el.scrollTo({ top: Math.max(0, i) * el.clientHeight });
    setActive(Math.max(0, i));
  }, [sort, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="reels" ref={ref} onScroll={(e) => setActive(Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight))}>
      {feed.map((s, i) => {
        const l = s.l;
        const hold = state.holdings[l.id];
        return (
          <section className="reel-slide" key={l.id}>
            <div className="reel">
              <div className="reel-art" style={{ background: postBg(l.tags.niche, l.id) }}><p>{l.title}</p></div>
              <div className="reel-tabs">
                {TABS.map((t) => <button key={t} className={sort === t ? "on" : ""} onClick={() => setSort(t)}>{t}</button>)}
              </div>
              <div className="reel-rail">
                <button className="ri" onClick={() => onTrade(l.id, "buy")} aria-label="Price">
                  <span className="bubble">{I.trend(22)}</span>
                  <Num value={shownPrice(s)} fmt={fmtPrice} />
                  <span style={{ fontSize: 11 }}><Change s={s} /></span>
                </button>
                <div className="ri" title="Holders"><span className="bubble">{I.people(22)}</span><span className="num">{fmtNum(s.holders)}</span></div>
                <div className="ri" title="Growth since listing"><span className="bubble">{I.rocket(22)}</span><span className="num">{fmtX(s.growth)}</span></div>
              </div>
              <div className="reel-meta">
                <div className="who-row">
                  <span className="av" style={{ background: avBg(l.creator) }} />
                  <span>{l.creator}</span>
                  {s.canBuy ? (
                    <button className="buy-pill" onClick={() => onTrade(l.id, "buy")}>Buy · {fmtPrice(s.price)}</button>
                  ) : hold && s.canSell && hold.shares > (hold.founder ?? 0) ? (
                    <button className="buy-pill outline" onClick={() => onTrade(l.id, "sell")}>Sell</button>
                  ) : null}
                </div>
                <p className="cap">{l.title}</p>
                <div className="tiny">
                  <span>{I.eye(13)}{fmtNum(s.eng.views)}</span>
                  <span>{I.heart(13)}{fmtNum(s.eng.likes)}</span>
                  <span>{I.chat(13)}{fmtNum(s.eng.comments)}</span>
                  <span>{hold ? `You own ${hold.shares}` : `Spotted by ${l.mine ? "you" : "@" + l.scout}`}</span>
                </div>
              </div>
            </div>
            <aside className="reel-side">{i === active && <MarketBox s={s} state={state} />}</aside>
          </section>
        );
      })}
      <div className="end">
        <div>
          <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>You&apos;re all caught up</p>
          <p style={{ marginBottom: 16 }}>Seen a reel that should be here?</p>
          <button className="btn white" onClick={onList}>List a post</button>
        </div>
      </div>
    </div>
  );
}
