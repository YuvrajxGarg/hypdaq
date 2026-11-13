"use client";
import { useEffect, useState } from "react";
import { Format, Hook, NICHES } from "@/lib/catalog";
import { BUY_WINDOW_H, H, Listing, MAX_LISTINGS_PER_DAY, MAX_POST_AGE_H, SCOUT_SHARES, SETTLE_H, fmtAge } from "@/lib/game";
import { ParsedLink, parseLink, platform } from "@/lib/platforms";
import { igPostedAt, xPostedAt } from "@/lib/postTime";
import { rngFor } from "@/lib/rng";
import { MyListing, State } from "@/lib/store";
import { avBg } from "./Market";

type Peek = ParsedLink & { title?: string; creator?: string; postedAt?: number; source?: string[] };

const istDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(ms));

// Tags for Insights, guessed from the title. Rough on purpose; real classification comes later.
const NICHE_WORDS: Record<string, RegExp> = {
  food: /food|recipe|cook|chai|biryani|maggi|eat|restaurant|street/i, pets: /dog|cat|pet|puppy|kitten/i,
  cricket: /cricket|ipl|bowl|bat|wicket|kohli|dhoni/i, money: /money|₹|rupee|invest|stock|salary|budget|sip|crore|lakh/i,
  beauty: /makeup|skin|hair|beauty|glow/i, dance: /dance|choreo/i, travel: /travel|trip|goa|manali|flight|visa/i,
  gym: /gym|workout|protein|fitness|lift/i, tech: /phone|iphone|laptop|ai|tech|app|gadget/i, music: /song|music|cover|singing|beat/i,
  study: /study|exam|jee|neet|upsc|college|student/i,
};
function guessTags(title: string, kind: string) {
  const niche = Object.entries(NICHE_WORDS).find(([, re]) => re.test(title))?.[0] ?? "comedy";
  const hook: Hook = /^pov/i.test(title) ? "POV" : /\?\s*$/.test(title) ? "Question" : /^\d+|\b\d+ (things|ways|tips)/i.test(title) ? "Number list" : /day \d+/i.test(title) ? "Day N series" : "Cold open";
  const format: Format = /how to|tutorial|guide|tips/i.test(title) ? "Tutorial" : /before|after/i.test(title) ? "Before/after" : kind === "Video" ? "Vlog" : "Skit";
  return { niche: NICHES.some((n) => n.id === niche) ? niche : "comedy", hook, format };
}

export function ListPost({ all, state, now, update, onListed, initial = "" }: {
  all: Listing[]; state: State; now: number; update: (fn: (s: State) => State) => void; onListed: (id: string) => void; initial?: string;
}) {
  const [link, setLink] = useState(initial);
  const [peek, setPeek] = useState<Peek | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const parsed = link.trim() ? parseLink(link) : null;
  const ok = parsed && !("error" in parsed) ? parsed : null;
  const key = ok ? `${ok.platform}:${ok.postId}` : "";

  useEffect(() => {
    setPeek(null);
    setErr(null);
    if (!ok) return;
    // post time from the id works offline; the rest needs the server
    let fromUrl: string | undefined;
    try {
      const parts = new URL(/^https?:/i.test(ok.url) ? ok.url : `https://${ok.url}`).pathname.split("/").filter(Boolean);
      if (parts.length > 2 && !["i", "reel", "reels", "p", "shorts", "watch"].includes(parts[0])) fromUrl = parts[0].replace(/^@/, "");
    } catch {}
    const local: Peek = { ...ok, creator: fromUrl, postedAt: ok.platform === "x" ? xPostedAt(ok.postId) ?? undefined : ok.platform === "reels" ? igPostedAt(ok.postId) ?? undefined : undefined };
    setPeek(local);
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/peek?url=${encodeURIComponent(link.trim())}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: Peek | null) => { if (d) setPeek({ ...local, ...Object.fromEntries(Object.entries(d).filter(([, v]) => v != null)) }); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const dupe = ok ? all.find((l) => l.platform === ok.platform && l.postId === ok.postId) : undefined;
  const today = state.myListings.filter((l) => istDay(l.listedAt) === istDay(now)).length;
  const ageH = peek?.postedAt ? (Date.now() - peek.postedAt) / H : undefined;
  const tooOld = ageH != null && ageH > MAX_POST_AGE_H;
  const creator = (peek?.creator ?? "").replace(/^@/, "");
  const title = peek?.title || (ok ? `${ok.kind}${creator ? ` by @${creator}` : ""}` : "");

  const problem = !ok ? null
    : dupe ? `Already on the market (spotted by @${dupe.scout}). Trade it from the feed.`
    : tooOld ? `Posted ${fmtAge(ageH!)} ago. Only posts under ${MAX_POST_AGE_H}h old can be listed, so nobody lists something that already blew up.`
    : today >= MAX_LISTINGS_PER_DAY ? `You've listed ${MAX_LISTINGS_PER_DAY} posts today. Come back tomorrow.`
    : null;

  const submit = () => {
    if (!ok) return setErr(parsed && "error" in parsed ? parsed.error : "Paste a link first.");
    if (problem) return setErr(problem);
    const id = `u-${ok.platform}-${ok.postId}`;
    const handle = creator || "unknown";
    const tags = guessTags(title, ok.kind);
    const r = rngFor(`f:${handle}`);
    const ml: MyListing = {
      id, platform: ok.platform, kind: ok.kind, postId: ok.postId, url: ok.url, title, creator: handle,
      creatorFollowers: Math.round(Math.pow(10, 3 + r() * 3.5)), // sample until the checker reads real followers
      scout: "you", listedAt: now, postAgeAtListH: Math.max(0.2, ageH ?? 3), mine: true,
      tags: { ...tags, lengthSec: ok.platform === "x" ? 0 : ok.kind === "Video" ? 300 : 20 },
    };
    update((s) => ({
      ...s,
      myListings: [...s.myListings, ml],
      holdings: { ...s.holdings, [id]: { listingId: id, shares: SCOUT_SHARES, founder: SCOUT_SHARES, cost: 0, firstBuyAt: now } },
    }));
    onListed(id);
  };

  return (
    <div className="page page-anim" style={{ maxWidth: 640 }}>
      <div className="page-head">
        <h1>Spotted one early?</h1>
        <p>Paste a link to a reel, YouTube video or X post you think will blow up. We read the rest. You get {SCOUT_SHARES} founder shares free.</p>
      </div>
      <div className="form">
        <input className="input" style={{ fontSize: 16, padding: "16px 18px" }} autoFocus aria-label="Link to the post"
          placeholder="instagram.com/reel/…   youtube.com/shorts/…   x.com/…/status/…" value={link} onChange={(e) => setLink(e.target.value)} />
        {parsed && "error" in parsed && <p className="err">{parsed.error}</p>}

        {ok && peek && (
          <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="row">
              <span className="av" style={{ background: avBg(creator || ok.postId), width: 40, height: 40 }} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{creator ? `@${creator}` : loading ? "Reading…" : "Creator not readable yet"}</div>
                <div className="muted" style={{ fontSize: 12 }}>{platform(ok.platform).label} · {ok.kind}</div>
              </div>
            </div>
            {loading && !peek.title ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}><div className="skel" style={{ height: 14, width: "92%" }} /><div className="skel" style={{ height: 14, width: "60%" }} /></div>
            ) : (
              <p style={{ fontSize: 15, lineHeight: 1.4, color: peek.title ? "var(--text)" : "var(--muted)" }}>{peek.title ?? "Title not readable yet. The number checker fills it in."}</p>
            )}
            <div className="stat-line">
              <span>Posted <b>{ageH != null ? `${fmtAge(ageH)} ago` : loading ? "…" : "unknown"}</b></span>
              {ageH != null && <span className={tooOld ? "down" : "up"}>{tooOld ? "Too old to list" : "Fresh enough"}</span>}
            </div>
            {!loading && (!peek.title || ageH == null) && (
              <p className="dim" style={{ fontSize: 12 }}>
                {ageH == null ? "Post time couldn't be checked here, so this prototype uses a sample age. " : ""}Live, the checker confirms these on submit.
              </p>
            )}
          </div>
        )}

        {(err || problem) && <p className="err">{err ?? problem}</p>}
        <button className="btn red block" onClick={submit} disabled={!ok || !!problem || loading}>{loading ? "Reading the post…" : `List it · get ${SCOUT_SHARES} founder shares`}</button>
        <p className="dim" style={{ fontSize: 12, textAlign: "center" }}>{today}/{MAX_LISTINGS_PER_DAY} listings used today</p>
      </div>
      <div className="rules" style={{ marginTop: 32 }}>
        <div><b>Fresh posts only</b>Under {MAX_POST_AGE_H}h old. We read the post time from the link, so it can&apos;t be faked.</div>
        <div><b>One market per post</b>If it&apos;s already listed, buy in from the feed.</div>
        <div><b>Founder shares are locked</b>Your {SCOUT_SHARES} free shares can&apos;t be sold until settlement, so nobody lists and dumps.</div>
        <div><b>Timeline</b>Buying is open {BUY_WINDOW_H / 24} days; the market settles on day {SETTLE_H / 24} on the post&apos;s real numbers. Fake views void it.</div>
      </div>
    </div>
  );
}
