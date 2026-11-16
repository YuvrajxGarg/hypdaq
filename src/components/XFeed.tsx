"use client";
import { fmtAge, fmtNum, fmtPrice, metric, ticker } from "@/lib/game";
import { Snap } from "@/lib/market";
import { State } from "@/lib/store";
import { Change, EmptyFeed, I, MarketBox, Sort, avBg, shownPrice } from "./Market";

const TABS: Sort[] = ["For you", "New", "Rising", "Ended"];

function Tweet({ s, state, open, onTrade, big }: { s: Snap; state: State; open: () => void; onTrade: (side: "buy" | "sell") => void; big?: boolean }) {
  const l = s.l;
  const hold = state.holdings[l.id];
  const age = ((l.postedAt ?? l.listedAt) - l.listedAt) / -3_600_000 + s.t;
  return (
    <article className={big ? "x-detail" : "tweet"} onClick={big ? undefined : open}>
      {!big && <span className="av" style={{ background: avBg(l.creator) }} />}
      <div style={{ minWidth: 0 }}>
        <div className="t-head">
          {big && <span className="av" style={{ background: avBg(l.creator), width: 40, height: 40, marginRight: 8 }} />}
          <b>{l.creator.replace(/_$/, "").replace(/[._]/g, " ")}</b><span>@{l.creator} · {fmtAge(age)}</span>
        </div>
        <p className="t-body">{l.title}</p>
        {big && <a className="muted" style={{ fontSize: 13 }} href={l.url} target="_blank" rel="noreferrer">Open on X</a>}
        <div className="t-actions">
          <span>{I.chat(16)}{fmtNum(s.eng.comments)}</span>
          <span>{I.repost(16)}{fmtNum(s.eng.shares)}</span>
          <span>{I.heart(16)}{fmtNum(s.eng.likes)}</span>
          <span title="Engagements (what X markets trade on)">{I.bars(16)}{fmtNum(metric(l, s.eng))}</span>
        </div>
        {!big && (
          <div className="t-market" onClick={(e) => e.stopPropagation()}>
            <span><span className="tk">${ticker(l)}</span> <b className="num">{fmtPrice(shownPrice(s))}</b> <Change s={s} />{hold ? <span className="tk"> · you own {hold.shares}</span> : null}</span>
            {s.canBuy ? <button className="btn red small" onClick={() => onTrade("buy")}>Buy</button> : <span className="tk">{s.status === "closed" ? "Buying closed" : s.status === "void" ? "Void" : s.status === "settling" ? "Settling" : "Settled"}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

export function XFeed({ items, sort, setSort, state, detail, open, back, onTrade, onList }: {
  items: Snap[]; sort: Sort; setSort: (s: Sort) => void; state: State; detail: Snap | null; onList: () => void;
  open: (id: string) => void; back: () => void; onTrade: (id: string, side: "buy" | "sell") => void;
}) {
  const hold = detail ? state.holdings[detail.l.id] : undefined;
  return (
    <div className="page-anim">
      <div className="x-col">
        {detail ? (
          <>
            <div className="x-tabs" style={{ display: "flex", alignItems: "center", gap: 20, padding: "0 16px", height: 53 }}>
              <button onClick={back} aria-label="Back" style={{ padding: 0 }}>{I.back(20)}</button>
              <b style={{ fontSize: 18 }}>Post</b>
            </div>
            <Tweet s={detail} state={state} open={() => {}} onTrade={(side) => onTrade(detail.l.id, side)} big />
            <div style={{ padding: 16, borderBottom: "1px solid var(--line2)" }}>
              <MarketBox s={detail} state={state} />
              <div className="row" style={{ marginTop: 16 }}>
                {detail.canBuy && <button className="btn red" style={{ flex: 1 }} onClick={() => onTrade(detail.l.id, "buy")}>Buy</button>}
                {detail.canSell && hold && hold.shares > (hold.founder ?? 0) && <button className="btn" style={{ flex: 1 }} onClick={() => onTrade(detail.l.id, "sell")}>Sell</button>}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="x-tabs">
              {TABS.map((t) => <button key={t} className={sort === t ? "on" : ""} onClick={() => setSort(t)}>{t}</button>)}
            </div>
            {items.map((s) => <Tweet key={s.l.id} s={s} state={state} open={() => open(s.l.id)} onTrade={(side) => onTrade(s.l.id, side)} />)}
            {items.length === 0 && <EmptyFeed app="x" sort={sort} onList={onList} />}
          </>
        )}
      </div>
    </div>
  );
}
