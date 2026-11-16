"use client";
import { fmtAge, fmtNum, fmtPrice } from "@/lib/game";
import { Snap } from "@/lib/market";
import { State } from "@/lib/store";
import { Change, EmptyFeed, I, MarketBox, Sort, avBg, postBg, shownPrice } from "./Market";

const CHIPS: Sort[] = ["For you", "New", "Rising", "Ended"];

function Thumb({ s, small }: { s: Snap; small?: boolean }) {
  const l = s.l;
  return (
    <div className="thumb" style={{ background: postBg(l.id) }}>
      <img src={l.thumb ?? `https://i.ytimg.com/vi/${l.postId}/hqdefault.jpg`} alt="" loading="lazy" />
      {!small && <span className="mk"><span className="num">{fmtPrice(shownPrice(s))}</span><Change s={s} /></span>}
      {l.kind === "Short" && <span className="dur">Short</span>}
    </div>
  );
}

export function YouTubeHome({ items, sort, setSort, open, onList }: { items: Snap[]; sort: Sort; setSort: (s: Sort) => void; open: (id: string) => void; onList: () => void }) {
  return (
    <div className="yt">
      <div className="yt-chips">
        {CHIPS.map((c) => <button key={c} className={`pill ${sort === c ? "on" : ""}`} onClick={() => setSort(c)}>{c === "For you" ? "All" : c}</button>)}
      </div>
      {items.length === 0 ? <EmptyFeed app="youtube" sort={sort} onList={onList} /> : (
        <div className="yt-grid">
          {items.map((s) => (
            <button key={s.l.id} className="yt-card" onClick={() => open(s.l.id)}>
              <Thumb s={s} />
              <div className="yt-info">
                <span className="av" style={{ background: avBg(s.l.creator) }} />
                <div>
                  <div className="yt-title">{s.l.title}</div>
                  <div className="yt-sub">{s.l.creator}<br />{fmtNum(s.eng.views)} views · listed {fmtAge(s.t)} ago</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Watch({ s, next, state, onTrade, open, back }: {
  s: Snap; next: Snap[]; state: State; onTrade: (side: "buy" | "sell") => void; open: (id: string) => void; back: () => void;
}) {
  const l = s.l;
  const hold = state.holdings[l.id];
  const sellable = hold ? hold.shares - (hold.founder ?? 0) : 0;
  return (
    <div className="yt">
      <div className="watch">
        <div className="watch-main">
          <button className="back" onClick={back}>{I.back(16)} Home</button>
          <div className="player" style={{ background: postBg(l.id) }}>
            <iframe src={`https://www.youtube-nocookie.com/embed/${l.postId}`} title={l.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
          <h1>{l.title}</h1>
          <div className="chan">
            <div className="row">
              <span className="av" style={{ background: avBg(l.creator) }} />
              <div>
                <div style={{ fontWeight: 600 }}>{l.creator}</div>
                <a className="muted" style={{ fontSize: 12 }} href={l.url} target="_blank" rel="noreferrer">Open on YouTube</a>
              </div>
            </div>
            <div className="yt-pills">
              <span className="yt-pill num">{fmtPrice(shownPrice(s))} <Change s={s} /></span>
              {s.canBuy && <button className="yt-pill red" onClick={() => onTrade("buy")}>Buy</button>}
              {s.canSell && sellable > 0 && <button className="yt-pill" onClick={() => onTrade("sell")}>Sell</button>}
            </div>
          </div>
          <div className="desc">
            <div className="stat-line">
              <span><b className="num">{fmtNum(s.eng.views)}</b> views</span>
              <span><b className="num">{fmtNum(s.eng.likes)}</b> likes</span>
              <span><b className="num">{fmtNum(s.eng.comments)}</b> comments</span>
              <span>Spotted by {l.scout === "you" ? "you" : "@" + l.scout}{l.postedAt ? ` when it was ${fmtAge((l.listedAt - l.postedAt) / 3_600_000)} old` : ""}</span>
            </div>
            <MarketBox s={s} state={state} />
          </div>
        </div>
        <div className="next">
          {next.length > 0 && <div style={{ fontWeight: 700, margin: "4px 0 2px" }}>Up next</div>}
          {next.map((n) => (
            <button key={n.l.id} className="next-item" onClick={() => open(n.l.id)}>
              <Thumb s={n} small />
              <div>
                <div className="yt-title">{n.l.title}</div>
                <div className="yt-sub">{n.l.creator}<br /><span className="num">{fmtPrice(shownPrice(n))}</span> · <Change s={n} /></div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
