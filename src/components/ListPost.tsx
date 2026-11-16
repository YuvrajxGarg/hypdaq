"use client";
import { useEffect, useState } from "react";
import { BUY_WINDOW_H, H, Listing, MAX_LISTINGS_PER_DAY, MAX_POST_AGE_H, SCOUT_SHARES, SETTLE_H, Stat, fmtAge, fmtNum, metric, metricName } from "@/lib/game";
import { ParsedLink, parseLink, platform } from "@/lib/platforms";
import { igPostedAt, xPostedAt } from "@/lib/postTime";
import { State } from "@/lib/store";
import { avBg } from "./Market";

type Peek = ParsedLink & { title?: string; creator?: string; postedAt?: number; thumb?: string; stats?: Omit<Stat, "at">; source?: string[] };

const istDay = (ms: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(ms));

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
  const today = state.listings.filter((l) => istDay(l.listedAt) === istDay(now)).length;
  const ageH = peek?.postedAt ? (Date.now() - peek.postedAt) / H : undefined;
  const tooOld = ageH != null && ageH > MAX_POST_AGE_H;
  const creator = (peek?.creator ?? "").replace(/^@/, "");
  const title = peek?.title || (ok ? `${ok.kind}${creator ? ` by @${creator}` : ""}` : "");

  const problem = !ok ? null
    : dupe ? `Already on the market (spotted by @${dupe.scout}). Trade it from the feed.`
    : tooOld ? `Posted ${fmtAge(ageH!)} ago. Only posts under ${MAX_POST_AGE_H}h old can be listed, so nobody lists something that already blew up.`
    : loading ? null
    : ageH == null ? "Couldn't confirm when this was posted, so it can't be listed. Check the link and try again."
    : !peek?.stats ? `Couldn't read this post's ${metricName(ok.platform)} right now, so there's nothing to settle on. ${ok.platform === "reels" ? "Instagram often blocks our reader; try again in a bit." : "Try again in a bit."}`
    : today >= MAX_LISTINGS_PER_DAY ? `You've listed ${MAX_LISTINGS_PER_DAY} posts today. Come back tomorrow.`
    : null;

  const submit = () => {
    if (!ok) return setErr(parsed && "error" in parsed ? parsed.error : "Paste a link first.");
    if (problem) return setErr(problem);
    const id = `${ok.platform}-${ok.postId}`;
    const l: Listing = {
      id, platform: ok.platform, kind: ok.kind, postId: ok.postId, url: ok.url, title, creator: creator || "unknown",
      scout: "you", listedAt: Date.now(), postedAt: peek!.postedAt, thumb: peek!.thumb,
      stats: [{ at: Date.now(), ...peek!.stats! }],
    };
    update((s) => ({
      ...s,
      listings: [...s.listings, l],
      holdings: { ...s.holdings, [id]: { listingId: id, shares: SCOUT_SHARES, founder: SCOUT_SHARES, cost: 0, firstBuyAt: Date.now() } },
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
              <p style={{ fontSize: 15, lineHeight: 1.4, color: peek.title ? "var(--text)" : "var(--muted)" }}>{peek.title ?? "Title not readable from this link."}</p>
            )}
            <div className="stat-line">
              <span>Posted <b>{ageH != null ? `${fmtAge(ageH)} ago` : loading ? "…" : "unknown"}</b></span>
              {peek.stats && <span><b className="num">{fmtNum(metric(ok, { at: 0, ...peek.stats }))}</b> {metricName(ok.platform)} now</span>}
              {ageH != null && <span className={tooOld ? "down" : "up"}>{tooOld ? "Too old to list" : "Fresh enough"}</span>}
            </div>
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
