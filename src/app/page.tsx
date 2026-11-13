"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DAILY_COINS, GAME, SETTLE_DAYS, addDays, dailyFloor, daysBetween, deepCuts, prettyDay, todayIST } from "@/lib/engine";
import { spentOn, useGameState } from "@/lib/store";
import { Floor } from "@/components/Floor";
import { Creators } from "@/components/Creators";
import { DeepCuts } from "@/components/DeepCuts";
import { Portfolio } from "@/components/Portfolio";
import { Insights } from "@/components/Insights";

const TABS = ["Floor", "Creators", "Deep Cuts", "Portfolio", "Insights"] as const;
type Tab = (typeof TABS)[number];

const HEROES: Record<Tab, [string, string]> = {
  Floor: ["Call the reel <em>before</em> it blows up.", "Six reels, fresh off the upload. Predict their 7-day views. The earlier you buy, the more a good call pays."],
  Creators: ["Viral or <em>irrelevant?</em>", "Bet on where a creator's hype goes over the next week."],
  "Deep Cuts": ["Find the <em>sleeper.</em>", "Rare, niche reels with almost no views. The fewer people who back your pick, the bigger the score."],
  Portfolio: ["Your <em>book.</em>", "Open positions, settled calls and where you stand this week."],
  Insights: ["What's <em>working</em>.", "For creators and agencies: which formats, hooks and lengths actually travel, and where the crowd gets it wrong."],
};

export default function Home() {
  const { state, update, ready, reset } = useGameState();
  const [tab, setTab] = useState<Tab>("Floor");
  const [msg, setMsg] = useState<string | null>(null);
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayIST()), []);
  useEffect(() => {
    const h = location.hash.replace("#", "").replace("-", " ");
    const t = TABS.find((x) => x.toLowerCase() === h.toLowerCase());
    if (t) setTab(t);
  }, []);
  const go = (t: Tab) => { setTab(t); history.replaceState(null, "", `#${t.toLowerCase().replace(" ", "-")}`); window.scrollTo({ top: 0 }); };
  const toast = useCallback((m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2200); }, []);

  const reels = useMemo(() => (today ? dailyFloor(today) : []), [today]);
  const cuts = useMemo(() => (today ? deepCuts(today) : []), [today]);
  const isSettled = useCallback((d: string) => (today ? daysBetween(d, today) >= SETTLE_DAYS || !!state.demoSettled[d] : false), [today, state.demoSettled]);

  if (!today || !ready) return <div style={{ minHeight: "100vh" }} />;
  const left = DAILY_COINS - spentOn(state, today);
  const settled = isSettled(today);
  const [title, sub] = HEROES[tab];

  return (
    <>
      <header className="top">
        <div className="top-in">
          <div className="brand"><span className="brand-dot" />{GAME}</div>
          <nav className="tabs">
            {TABS.map((t) => <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => go(t)}>{t}</button>)}
          </nav>
          <div className="wallet">
            <span className="chip red">Sample data</span>
            <span className="chip">Coins <b className="num">{left}</b></span>
          </div>
        </div>
      </header>
      <main>
        <div className="hero">
          <div>
            <div className="muted" style={{ fontSize: 12, marginBottom: 10, letterSpacing: ".08em", textTransform: "uppercase" }}>
              {prettyDay(today)} · {settled ? "settled (demo)" : `settles ${prettyDay(addDays(today, SETTLE_DAYS))}`}
            </div>
            <h1 dangerouslySetInnerHTML={{ __html: title }} />
            <p className="sub">{sub}</p>
          </div>
          {tab === "Floor" && (
            <div className="mock-note">
              Prototype. Reels, creators, views and the crowd are simulated from a daily seed: no real accounts. Coins are play money and reset daily.
            </div>
          )}
        </div>
        {tab === "Floor" && <Floor reels={reels} day={today} state={state} settled={settled} update={update} toast={toast} />}
        {tab === "Creators" && <Creators day={today} state={state} settled={settled} update={update} toast={toast} />}
        {tab === "Deep Cuts" && <DeepCuts cuts={cuts} day={today} state={state} settled={settled} update={update} toast={toast} />}
        {tab === "Portfolio" && <Portfolio today={today} state={state} isSettled={isSettled} update={update} reset={reset} toast={toast} />}
        {tab === "Insights" && <Insights today={today} />}
        <div className="foot">
          {GAME} is a Revolio Labs prototype. A new floor opens every day at midnight IST. All reels, handles and numbers shown are fictional sample data; no real
          money is involved.
        </div>
      </main>
      {msg && <div className="toast">{msg}</div>}
    </>
  );
}
