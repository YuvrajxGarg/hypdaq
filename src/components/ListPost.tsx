"use client";
import { useState } from "react";
import { FORMAT_EFFECT, Format, HOOK_EFFECT, Hook, NICHES } from "@/lib/catalog";
import { Listing, MAX_LISTINGS_PER_DAY, MAX_POST_AGE_H, SCOUT_SHARES, BUY_WINDOW_H, SETTLE_H, fmtNum } from "@/lib/game";
import { PLATFORMS, parseLink, platform } from "@/lib/platforms";
import { rngFor } from "@/lib/rng";
import { MyListing, State } from "@/lib/store";

const AGES = [
  { label: "Under 1 hour", h: 0.5 },
  { label: "1–6 hours", h: 3 },
  { label: "6–24 hours", h: 14 },
  { label: "More than a day", h: 40 },
];

const istDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(ms));

export function ListPost({ all, state, now, update, onListed }: {
  all: Listing[]; state: State; now: number; update: (fn: (s: State) => State) => void; onListed: (id: string) => void;
}) {
  const [link, setLink] = useState("");
  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [age, setAge] = useState(1);
  const [niche, setNiche] = useState("comedy");
  const [format, setFormat] = useState<Format>("Skit");
  const [hook, setHook] = useState<Hook>("POV");
  const [len, setLen] = useState(20);
  const [err, setErr] = useState<string | null>(null);

  const parsed = link ? parseLink(link) : null;
  const ok = parsed && !("error" in parsed) ? parsed : null;
  const dupe = ok ? all.find((l) => l.platform === ok.platform && l.postId === ok.postId) : undefined;
  const today = state.myListings.filter((l) => istDay(l.listedAt) === istDay(now)).length;
  const handle = creator.replace(/^@/, "").trim();
  const followers = handle ? Math.round(Math.pow(10, 3 + rngFor(`f:${handle}`)() * 3.5)) : 0;

  const submit = () => {
    setErr(null);
    if (!ok) return setErr(parsed && "error" in parsed ? parsed.error : "Paste a link first.");
    if (dupe) return setErr("This post is already on the market. Trade it from the feed instead.");
    if (AGES[age].h > MAX_POST_AGE_H) return setErr(`Only posts under ${MAX_POST_AGE_H} hours old can be listed, so nobody lists something that has already blown up.`);
    if (today >= MAX_LISTINGS_PER_DAY) return setErr(`You've listed ${MAX_LISTINGS_PER_DAY} posts today. Come back tomorrow.`);
    if (!handle) return setErr("Add the creator's handle.");
    if (title.trim().length < 4) return setErr("Add a short description of the post.");
    const id = `u-${ok.platform}-${ok.postId}`;
    const ml: MyListing = {
      id, platform: ok.platform, kind: ok.kind, postId: ok.postId, url: ok.url, title: title.trim(), creator: handle, creatorFollowers: followers,
      scout: "you", listedAt: now, postAgeAtListH: AGES[age].h, mine: true,
      tags: { niche, format, hook, lengthSec: ok.platform === "x" ? 0 : len },
    };
    update((s) => ({
      ...s,
      myListings: [...s.myListings, ml],
      holdings: { ...s.holdings, [id]: { listingId: id, shares: SCOUT_SHARES, founder: SCOUT_SHARES, cost: 0, firstBuyAt: now } },
    }));
    onListed(id);
  };

  return (
    <div className="page">
      <div className="hero">
        <div>
          <h1>Spotted one <em>early?</em></h1>
          <p className="sub">List any public reel, YouTube video or X post you think will blow up. You get {SCOUT_SHARES} founder shares free, so the earlier you find it, the more it pays.</p>
        </div>
      </div>
      <div className="two" style={{ alignItems: "start" }}>
        <div className="form">
          <div className="field">
            <label htmlFor="link">Link to the post</label>
            <input id="link" className="input" placeholder="instagram.com/reel/…  ·  youtube.com/shorts/…  ·  x.com/…/status/…" value={link} onChange={(e) => setLink(e.target.value)} />
            {parsed && ("error" in parsed ? <span className="err">{parsed.error}</span> : dupe ? <span className="err">Already listed by @{dupe.scout}. Trade it from the feed.</span> : <span className="ok">{platform(parsed.platform).label} · {parsed.kind} found</span>)}
          </div>
          <div className="field">
            <label htmlFor="title">What&apos;s the post? <span className="dim">(filled in automatically once live data is connected)</span></label>
            <input id="title" className="input" placeholder="e.g. Grandma rates Gen Z slang" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="creator">Creator</label>
              <input id="creator" className="input" placeholder="@handle" value={creator} onChange={(e) => setCreator(e.target.value)} />
              {handle && <span className="dim" style={{ fontSize: 12 }}>{fmtNum(followers)} followers (sample number)</span>}
            </div>
            <div className="field">
              <label htmlFor="age">Posted how long ago?</label>
              <select id="age" className="input" value={age} onChange={(e) => setAge(+e.target.value)}>
                {AGES.map((a, i) => <option key={a.label} value={i}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="niche">Niche</label>
              <select id="niche" className="input" value={niche} onChange={(e) => setNiche(e.target.value)}>
                {NICHES.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="format">Format</label>
              <select id="format" className="input" value={format} onChange={(e) => setFormat(e.target.value as Format)}>
                {Object.keys(FORMAT_EFFECT).map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hook">Hook</label>
              <select id="hook" className="input" value={hook} onChange={(e) => setHook(e.target.value as Hook)}>
                {Object.keys(HOOK_EFFECT).map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            {(!ok || ok.platform !== "x") && (
              <div className="field">
                <label htmlFor="len">Length (seconds)</label>
                <input id="len" className="input" type="number" min={1} max={3600} value={len} onChange={(e) => setLen(Math.max(1, +e.target.value))} />
              </div>
            )}
          </div>
          {err && <p className="err">{err}</p>}
          <button className="btn primary block" onClick={submit}>List it · get {SCOUT_SHARES} founder shares</button>
          <p className="dim" style={{ fontSize: 12 }}>{today}/{MAX_LISTINGS_PER_DAY} listings used today. The tags you add power Insights for everyone.</p>
        </div>
        <div className="rules" style={{ gridTemplateColumns: "1fr" }}>
          <div><b>Fresh posts only</b>Posts must be under {MAX_POST_AGE_H}h old when listed. No listing things that already went viral.</div>
          <div><b>One market per post</b>Each post can be listed once. If it&apos;s already there, buy in from the feed.</div>
          <div><b>Founder shares are locked</b>Your {SCOUT_SHARES} free shares can&apos;t be sold until settlement, so scouts can&apos;t list and dump.</div>
          <div><b>Timeline</b>Buying is open {BUY_WINDOW_H / 24} days, then the market settles at day {SETTLE_H / 24} on real numbers.</div>
          <div><b>Fake views void it</b>If views jump while likes and comments don&apos;t, the listing is voided and everyone is refunded.</div>
          <div><b>Supported</b>{PLATFORMS.map((p) => p.label).join(", ")}. X trades on likes + reposts + replies, since views aren&apos;t public.</div>
        </div>
      </div>
    </div>
  );
}
