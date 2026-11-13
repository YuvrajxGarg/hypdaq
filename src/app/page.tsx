"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DAILY_COINS, GAME, H, Listing, MAX_SHARES_PER_TRADE, marketListings, shareValue, simulate, ticker } from "@/lib/game";
import { PlatformId } from "@/lib/platforms";
import { Snap, snapshot } from "@/lib/market";
import { useGameState } from "@/lib/store";
import { Actions, Details, Slide, TradeSheet } from "@/components/Feed";
import { ListPost } from "@/components/ListPost";
import { Insights, Leaders, Portfolio } from "@/components/Pages";

const TABS = ["Feed", "List a post", "Portfolio", "Leaders", "Insights"] as const;
type Tab = (typeof TABS)[number];
const SORTS = ["For you", "New", "Rising", "Settled"] as const;
type Sort = (typeof SORTS)[number];
const PLATS: { id: PlatformId | "all"; label: string }[] = [
  { id: "all", label: "All" }, { id: "reels", label: "Reels" }, { id: "youtube", label: "YouTube" }, { id: "x", label: "X" },
];
const istDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(ms));

export default function Home() {
  const { state, update, ready, reset } = useGameState();
  const [tab, setTab] = useState<Tab>("Feed");
  const [sort, setSort] = useState<Sort>("For you");
  const [plat, setPlat] = useState<PlatformId | "all">("all");
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState<{ id: string; side: "buy" | "sell" | "details" } | null>(null);
  const [active, setActive] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => Date.now() + state.clockH * H, [state.clockH, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2400); }, []);

  const listings: Listing[] = useMemo(() => {
    if (!mounted) return [];
    const mine = state.myListings.map((m) => simulate(m));
    return [...mine, ...marketListings(now)];
  }, [mounted, now, state.myListings]);
  const snaps = useMemo(() => new Map(listings.map((l) => [l.id, snapshot(l, state, now)] as [string, Snap])), [listings, state, now]);

  // daily coins + settlement payouts
  useEffect(() => {
    if (!ready || !mounted) return;
    const today = istDay(now);
    const due: Record<string, number> = {};
    for (const h of Object.values(state.holdings)) {
      const s = snaps.get(h.listingId);
      if (!s || state.paid[h.listingId] != null) continue;
      if (s.status === "settled") due[h.listingId] = h.shares * shareValue(s.growth);
      if (s.status === "void") due[h.listingId] = h.cost;
    }
    const drip = state.lastDrip !== today;
    if (!drip && !Object.keys(due).length) return;
    update((st) => ({
      ...st,
      coins: st.coins + Object.values(due).reduce((a, b) => a + b, 0) + (drip && st.lastDrip ? DAILY_COINS : 0),
      lastDrip: today,
      paid: { ...st.paid, ...due },
    }));
    if (Object.keys(due).length) toast(`${Object.keys(due).length} market${Object.keys(due).length > 1 ? "s" : ""} settled · +${Math.round(Object.values(due).reduce((a, b) => a + b, 0))} coins`);
  }, [ready, mounted, now, snaps, state.holdings, state.paid, state.lastDrip, update, toast]);

  const feed = useMemo(() => {
    let xs = [...snaps.values()].filter((s) => plat === "all" || s.l.platform === plat);
    const live = (s: Snap) => s.status === "open" || s.status === "closed";
    if (sort === "New") xs = xs.filter((s) => s.status === "open").sort((a, b) => b.l.listedAt - a.l.listedAt);
    else if (sort === "Rising") xs = xs.filter(live).sort((a, b) => b.change - a.change);
    else if (sort === "Settled") xs = xs.filter((s) => !live(s)).sort((a, b) => b.l.listedAt - a.l.listedAt);
    else {
      const score = (s: Snap) => (s.status === "open" ? 2 : live(s) ? 1 : 0) * 10 + Math.log10(1 + s.growth) * 2 + s.l.heat - s.t / 48 + (s.l.mine ? 5 : 0);
      xs = xs.filter(live).sort((a, b) => score(b) - score(a));
    }
    return xs;
  }, [snaps, sort, plat]);

  useEffect(() => {
    if (!focus || tab !== "Feed") return;
    const i = feed.findIndex((s) => s.l.id === focus);
    const el = feedRef.current;
    if (i >= 0 && el) { el.scrollTo({ top: i * el.clientHeight }); setActive(i); }
    setFocus(null);
  }, [focus, feed, tab]);

  const openListing = (id: string) => {
    const s = snaps.get(id);
    setSort(s && (s.status === "settled" || s.status === "void") ? "Settled" : "New");
    setPlat("all");
    setTab("Feed");
    setFocus(id);
  };

  const actions: Actions = {
    buy: (s, n, call) => {
      if (!s.canBuy) return "Buying has closed on this market.";
      if (n <= 0 || n > MAX_SHARES_PER_TRADE) return `Buy between 1 and ${MAX_SHARES_PER_TRADE} shares at a time.`;
      const cost = s.cost(n);
      if (cost > state.coins + 1e-6) return `That costs ${Math.round(cost)} coins and you have ${Math.round(state.coins)}.`;
      update((st) => {
        const h = st.holdings[s.l.id];
        return {
          ...st,
          coins: st.coins - cost,
          holdings: { ...st.holdings, [s.l.id]: { listingId: s.l.id, shares: (h?.shares ?? 0) + n, cost: (h?.cost ?? 0) + cost, call: call ?? h?.call, firstBuyAt: h?.firstBuyAt ?? now, founder: h?.founder } },
          trades: [...st.trades, { listingId: s.l.id, side: "buy", shares: n, coins: cost, at: now }],
        };
      });
      toast(`Bought ${n} $${ticker(s.l)} for ${Math.round(cost)}`);
      return null;
    },
    sell: (s, n) => {
      const h = state.holdings[s.l.id];
      const free = h ? h.shares - (h.founder ?? 0) : 0;
      if (!s.canSell) return "This market has settled.";
      if (n <= 0 || n > free) return free ? `You can sell up to ${free} shares.` : "You have no sellable shares here.";
      const back = s.sellFor(n);
      update((st) => {
        const cur = st.holdings[s.l.id]!;
        const left = cur.shares - n;
        const holdings = { ...st.holdings };
        if (left <= 0) delete holdings[s.l.id];
        else holdings[s.l.id] = { ...cur, shares: left, cost: cur.cost * (left / cur.shares) };
        return { ...st, coins: st.coins + back, holdings, trades: [...st.trades, { listingId: s.l.id, side: "sell", shares: n, coins: back, at: now }] };
      });
      toast(`Sold ${n} for ${Math.round(back)}`);
      return null;
    },
  };

  if (!mounted || !ready) return <div style={{ minHeight: "100vh" }} />;
  const cur = feed[Math.min(active, feed.length - 1)];
  const sheetSnap = sheet ? snaps.get(sheet.id) : undefined;

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="brand"><span className="brand-dot" />{GAME}</div>
          <nav className="tabs">
            {TABS.map((t) => <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>)}
          </nav>
          <div className="wallet">
            <span className="chip red" title="Posts, numbers and other players are simulated in this prototype">Sample data</span>
            <span className="chip">Coins <b className="num">{Math.round(state.coins)}</b></span>
          </div>
        </div>
      </header>

      {tab === "Feed" && (
        <main className="app-main">
          <div className="filters">
            {SORTS.map((s) => <button key={s} className={`pill ${sort === s ? "on" : ""}`} onClick={() => { setSort(s); setActive(0); feedRef.current?.scrollTo({ top: 0 }); }}>{s}</button>)}
            <span className="pill sep">|</span>
            {PLATS.map((p) => <button key={p.id} className={`pill ${plat === p.id ? "on" : ""}`} onClick={() => { setPlat(p.id); setActive(0); feedRef.current?.scrollTo({ top: 0 }); }}>{p.label}</button>)}
          </div>
          <div className="feed" ref={feedRef} onScroll={(e) => setActive(Math.round(e.currentTarget.scrollTop / e.currentTarget.clientHeight))}>
            {feed.map((s) => (
              <section className="slide" key={s.l.id} id={`post-${s.l.id}`}>
                <Slide s={s} state={state} onTrade={(side) => setSheet({ id: s.l.id, side })} onDetails={() => setSheet({ id: s.l.id, side: window.innerWidth > 1000 ? (s.canBuy ? "buy" : "details") : "details" })} />
                <aside className="side-panel">{cur && cur.l.id === s.l.id && <Details s={s} state={state} />}</aside>
              </section>
            ))}
            <div className="end-card">
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>You&apos;re all caught up.</p>
                <p>Seen something that should be here?</p>
                <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setTab("List a post")}>List a post</button>
              </div>
            </div>
          </div>
        </main>
      )}
      {tab === "List a post" && <ListPost all={listings} state={state} now={now} update={update} onListed={(id) => { toast("Listed. You hold 20 founder shares."); openListing(id); }} />}
      {tab === "Portfolio" && <Portfolio snaps={snaps} state={state} update={update} reset={reset} open={openListing} />}
      {tab === "Leaders" && <Leaders state={state} snaps={snaps} day={istDay(now)} />}
      {tab === "Insights" && <Insights now={now} />}

      {sheet && sheetSnap && sheet.side !== "details" && <TradeSheet key={sheet.id + sheet.side} s={sheetSnap} side={sheet.side} state={state} actions={actions} onClose={() => setSheet(null)} />}
      {sheet && sheetSnap && sheet.side === "details" && (
        <>
          <div className="scrim" onClick={() => setSheet(null)} />
          <div className="sheet" role="dialog" aria-label="Market details">
            <div className="grab" />
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}><Details s={sheetSnap} state={state} /></div>
            {sheetSnap.canBuy && <button className="btn primary block" style={{ marginTop: 14 }} onClick={() => setSheet({ id: sheet.id, side: "buy" })}>Buy</button>}
          </div>
        </>
      )}
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
