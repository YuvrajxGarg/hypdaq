"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DAILY_COINS, GAME, H, Listing, MAX_SHARES_PER_TRADE, marketListings, shareValue, simulate, ticker } from "@/lib/game";
import { PlatformId } from "@/lib/platforms";
import { Snap, snapshot } from "@/lib/market";
import { useGameState } from "@/lib/store";
import { Actions, I, Sort, TradeSheet } from "@/components/Market";
import { Reels } from "@/components/Reels";
import { Watch, YouTubeHome } from "@/components/YouTube";
import { XFeed } from "@/components/XFeed";
import { ListPost } from "@/components/ListPost";
import { APPS, Dock, Hub, HubTab, Page, Side, Tape } from "@/components/Shell";
import { Num } from "@/components/fx";
const istDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(ms));
const live = (s: Snap) => s.status === "open" || s.status === "closed";

function sortFeed(xs: Snap[], sort: Sort) {
  if (sort === "New") return xs.filter((s) => s.status === "open").sort((a, b) => b.l.listedAt - a.l.listedAt);
  if (sort === "Rising") return xs.filter(live).sort((a, b) => b.change - a.change);
  if (sort === "Ended") return xs.filter((s) => !live(s)).sort((a, b) => b.l.listedAt - a.l.listedAt);
  const score = (s: Snap) => (s.status === "open" ? 20 : 10) + Math.log10(1 + s.growth) * 2 + s.l.heat - s.t / 48 + (s.l.mine ? 5 : 0);
  return xs.filter(live).sort((a, b) => score(b) - score(a));
}

export default function Home() {
  const { state, update, ready, reset } = useGameState();
  const [app, setApp] = useState<PlatformId>("reels");
  const [page, setPage] = useState<Page>(null);
  const [sorts, setSorts] = useState<Record<PlatformId, Sort>>({ reels: "For you", youtube: "For you", x: "For you" });
  const [watch, setWatch] = useState<string | null>(null); // YouTube watch page
  const [post, setPost] = useState<string | null>(null); // X post page
  const [focus, setFocus] = useState<string | null>(null); // Reels: scroll to
  const [hubTab, setHubTab] = useState<HubTab>("portfolio");
  const [prefill, setPrefill] = useState("");
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [sheet, setSheet] = useState<{ id: string; side: "buy" | "sell" } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null); // a just-listed post to open once it's in the market

  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => setTick((x) => x + 1), 10_000);
    return () => clearInterval(t);
  }, []);
  const now = useMemo(() => Date.now() + state.clockH * H, [state.clockH, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2400); }, []);

  const listings: Listing[] = useMemo(() => {
    if (!mounted) return [];
    return [...state.myListings.map((m) => simulate(m)), ...marketListings(now)];
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
    const total = Object.values(due).reduce((a, b) => a + b, 0);
    update((st) => ({ ...st, coins: st.coins + total + (drip && st.lastDrip ? DAILY_COINS : 0), lastDrip: today, paid: { ...st.paid, ...due } }));
    const n = Object.keys(due).length;
    if (n) toast(`${n} market${n > 1 ? "s" : ""} settled · +${Math.round(total)} coins`);
  }, [ready, mounted, now, snaps, state.holdings, state.paid, state.lastDrip, update, toast]);

  const byApp = useMemo(() => {
    const out = { reels: [] as Snap[], youtube: [] as Snap[], x: [] as Snap[] };
    for (const s of snaps.values()) out[s.l.platform].push(s);
    return out;
  }, [snaps]);
  // the sample catalog repeats captions; show each caption once unless you hold it
  const dedupe = useCallback((xs: Snap[]) => {
    const seen = new Set<string>();
    return xs.filter((s) => {
      if (s.l.mine || state.holdings[s.l.id]) return true;
      if (seen.has(s.l.title)) return false;
      seen.add(s.l.title);
      return true;
    });
  }, [state.holdings]);
  const feed = useMemo(() => dedupe(sortFeed(byApp[app], sorts[app])), [byApp, app, sorts, dedupe]);

  const setSort = (s: Sort) => { setSorts((x) => ({ ...x, [app]: s })); setFocus(null); };
  const goApp = (a: PlatformId) => { setApp(a); setPage(null); setWatch(null); setPost(null); window.scrollTo({ top: 0 }); };
  const go = (p: Page) => { setPage(p); if (p !== "list") setPrefill(""); window.scrollTo({ top: 0 }); };
  const openHub = (t: HubTab) => { setHubTab(t); go("you"); };

  const openListing = (id: string) => {
    const s = snaps.get(id);
    if (!s) return;
    const a = s.l.platform;
    setApp(a); setPage(null);
    if (a === "reels") {
      const ended = !live(s);
      setSorts((x) => ({ ...x, reels: ended ? "Ended" : s.status === "open" ? "New" : "For you" }));
      setFocus(id);
    } else if (a === "youtube") setWatch(id);
    else setPost(id);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (pending && snaps.has(pending)) { openListing(pending); setPending(null); }
  }, [pending, snaps]); // eslint-disable-line react-hooks/exhaustive-deps

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
      toast(`Bought ${n} $${ticker(s.l)} · ${Math.round(cost)} coins`);
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
      toast(`Sold ${n} $${ticker(s.l)} · +${Math.round(back)} coins`);
      return null;
    },
  };

  if (!mounted || !ready) return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
        <div className="brand" style={{ padding: 0 }}><span className="brand-dot" />{GAME}</div>
        <div className="skel" style={{ width: 140, height: 4 }} />
      </div>
    </div>
  );
  const trade = (id: string, side: "buy" | "sell") => setSheet({ id, side });
  const sheetSnap = sheet ? snaps.get(sheet.id) : undefined;
  const watchSnap = watch ? snaps.get(watch) : undefined;
  const postSnap = post ? snaps.get(post) ?? null : null;
  const day = istDay(now);
  const tape = sortFeed([...snaps.values()], "Rising").slice(0, 18);
  const held = Object.keys(state.holdings).filter((id) => { const x = snaps.get(id); return x && live(x); }).length;

  return (
    <>
      <Tape items={tape} open={openListing} />
      <header className="mtop">
        <button className="brand" onClick={() => goApp(app)}><span className="brand-dot" />{GAME}</button>
        <button className="coins" onClick={() => openHub("portfolio")}><span className="coin" /><Num value={Math.round(state.coins)} fmt={(v) => v.toLocaleString("en-IN")} /></button>
      </header>
      <div className="shell">
        <Side app={app} page={page} go={go} goApp={goApp} held={held}
          counts={{ reels: byApp.reels.filter(live).length, youtube: byApp.youtube.filter(live).length, x: byApp.x.filter(live).length }} />
        <main className="main" key={page ?? app}>
      {!page && app === "reels" && <Reels feed={feed} sort={sorts.reels} setSort={setSort} state={state} focus={focus} onTrade={trade} onList={() => go("list")} />}
      {!page && app === "youtube" && (watchSnap
        ? <Watch s={watchSnap} next={feed.filter((s) => s.l.id !== watch).slice(0, 12)} state={state} onTrade={(side) => trade(watchSnap.l.id, side)} open={(id) => { setWatch(id); window.scrollTo({ top: 0 }); }} back={() => setWatch(null)} />
        : <YouTubeHome items={feed} sort={sorts.youtube} setSort={setSort} open={(id) => { setWatch(id); window.scrollTo({ top: 0 }); }} />)}
      {!page && app === "x" && (
        <XFeed items={feed} sort={sorts.x} setSort={setSort} state={state} detail={postSnap}
          open={(id) => { setPost(id); window.scrollTo({ top: 0 }); }} back={() => setPost(null)} onTrade={trade} />
      )}
      {page === "list" && <ListPost initial={prefill} all={listings} state={state} now={now} update={update} onListed={(id) => { toast("Listed. You hold 20 founder shares."); setPending(id); }} />}
      {page === "you" && <Hub tab={hubTab} setTab={setHubTab} state={state} snaps={snaps} day={day} now={now} update={update} reset={reset} open={openListing} />}
        </main>
        <Dock state={state} snaps={snaps} day={day} open={openListing} openHub={openHub} onQuickList={(l) => { setPrefill(l); go("list"); }} />
      </div>

      <nav className="bottom-nav">
        {APPS.map((a) => <button key={a.id} className={!page && app === a.id ? "on" : ""} onClick={() => goApp(a.id)}>{a.icon(22)}{a.label}</button>)}
        <button className={page === "list" ? "on" : ""} onClick={() => go("list")} aria-label="List a post"><span className="plus">{I.plus(20)}</span></button>
        <button className={page === "you" ? "on" : ""} onClick={() => go("you")}>{I.user(22)}You</button>
      </nav>

      {sheet && sheetSnap && <TradeSheet key={sheet.id + sheet.side} s={sheetSnap} side={sheet.side} state={state} actions={actions} onClose={() => setSheet(null)} />}
      {msg && <div className="toast" key={msg}><i>✓</i>{msg}</div>}
    </>
  );
}
