// HYPDAQ market logic. Viewers scout posts (Reels, YouTube, X) and list them; everyone trades them.
//
// MOCKED until platform data is connected: every post's views/likes, the other traders and their
// buys are SIMULATED from a seed. The market rules (price curve, settlement, calls, voiding) are the
// real game logic and stay the same when live numbers arrive.

import { CAPTIONS, CREATORS, FORMAT_EFFECT, Format, HOOK_EFFECT, Hook, LENGTH_BUCKETS, NICHES, X_POSTS, YT_TITLES, lengthBucket } from "./catalog";
import { PlatformId } from "./platforms";
import { gauss, hashString, pick, rngFor } from "./rng";

export const GAME = "HYPDAQ";
export const H = 3_600_000;

// ---- rules ----
export const MAX_POST_AGE_H = 24; // a post can be listed only in its first 24h
export const BUY_WINDOW_H = 72; // buying closes 3 days after listing
export const SETTLE_H = 168; // listings settle 7 days after listing
export const SCOUT_SHARES = 20; // free founder shares for the scout, locked until settlement
export const MAX_SHARES_PER_TRADE = 200;
export const START_COINS = 1000;
export const DAILY_COINS = 200;
export const MAX_LISTINGS_PER_DAY = 3;
export const K = 0.0025;
export const EARLY_NOTE = "Every buy pushes the price up, so the earlier you get in, the less growth you need to profit."; // price rises by 0.0025 per share outstanding

export type Tags = { niche: string; format: Format; hook: Hook; lengthSec: number };

export type Listing = {
  id: string;
  platform: PlatformId;
  kind: string;
  postId: string;
  url: string;
  title: string;
  creator: string; // the post's author (not a player)
  creatorFollowers: number;
  scout: string; // the player who listed it
  listedAt: number;
  postAgeAtListH: number;
  tags: Tags;
  mine?: boolean;
  // ---- simulation (replaced by real snapshots) ----
  base: number; // scale of views
  peakHour: number;
  steep: number;
  growth: number; // views 7d after listing ÷ views at listing (hidden)
  heat: number; // how much the crowd piles in
  bought: boolean; // simulated bought-views case
};

// ---------- views ----------

const sig = (h: number, c: number, k: number) => 1 / (1 + Math.exp(-k * (Math.log(Math.max(h, 0.05)) - Math.log(c))));

/** Views at a given post age (hours since the creator posted). */
export function viewsAtAge(l: Listing, age: number): number {
  const v = l.base * sig(age, l.peakHour, l.steep);
  return Math.round(l.bought ? v + l.base * 6 * sig(age, l.postAgeAtListH + 6, 9) : v);
}
export const viewsAtListing = (l: Listing) => viewsAtAge(l, l.postAgeAtListH);
/** Views t hours after listing. */
export const viewsAt = (l: Listing, t: number) => viewsAtAge(l, l.postAgeAtListH + Math.max(0, t));

export function engagementAt(l: Listing, t: number) {
  const views = viewsAt(l, t);
  const organic = l.bought ? Math.round(l.base * sig(l.postAgeAtListH + t, l.peakHour, l.steep)) : views;
  const r = rngFor(`e:${l.id}`);
  const q = Math.log10(l.growth + 1);
  return {
    views,
    likes: Math.round(organic * (l.platform === "x" ? 0.78 : 0.05 * Math.pow(10, 0.25 * q + gauss(r) * 0.08))),
    comments: Math.round(organic * (l.platform === "x" ? 0.06 : 0.0026) * Math.pow(10, 0.2 * q + (l.tags.hook === "Hot take" ? 0.3 : 0))),
    shares: Math.round(organic * (l.platform === "x" ? 0.16 : 0.006 * Math.pow(10, 0.5 * q))),
  };
}

/** Bought views: views jump while likes don't follow. Voids the listing and refunds trades. */
export function isVoid(l: Listing, t: number): boolean {
  if (t < 8) return false;
  const e = engagementAt(l, t);
  return e.views > 3000 && e.likes / e.views < 0.012 && l.platform !== "x";
}

// ---------- value & price ----------

/** What one share pays at settlement: log2(1 + growth since listing). No growth = 1.0, 3× = 2.0, 15× = 4.0. */
export const shareValue = (growth: number) => Math.log2(1 + Math.max(0, growth));
export const growthAt = (l: Listing, t: number) => viewsAt(l, t) / Math.max(1, viewsAtListing(l));

/** Price on the curve for a given number of shares outstanding. */
export const priceAt = (shares: number) => 1 + K * shares;
/** Cost to buy n shares when s are outstanding (area under the curve). */
export const buyCost = (s: number, n: number) => n + K * (s * n + (n * n) / 2);
export const sellReturn = (s: number, n: number) => buyCost(s - n, n);

/** Shares the simulated crowd holds t hours after listing. Hot listings fill fast; buying stops at 72h. */
export function crowdShares(l: Listing, t: number): number {
  const tt = Math.max(0, Math.min(t, BUY_WINDOW_H));
  const early = Math.log10(1 + growthAt(l, Math.min(tt, 12))); // crowd chases early momentum
  const total = 40 + l.heat * (170 + 750 * early);
  const fill = 1 - Math.exp(-tt / 14);
  // after the buy window some holders sell into strength or weakness
  const drift = t > BUY_WINDOW_H ? (growthAt(l, t) / growthAt(l, BUY_WINDOW_H) - 1) * 0.15 : 0;
  return Math.max(0, Math.round(SCOUT_SHARES + total * fill * (1 + Math.max(-0.4, Math.min(0.3, drift)))));
}

export function holdersAt(l: Listing, t: number) {
  return Math.max(1, Math.round(crowdShares(l, t) / 9));
}

// ---------- settlement & calls ----------

export type Status = "open" | "closed" | "settled" | "void";
export function statusOf(l: Listing, t: number): Status {
  if (isVoid(l, Math.min(t, SETTLE_H))) return "void";
  if (t >= SETTLE_H) return "settled";
  return t >= BUY_WINDOW_H ? "closed" : "open";
}

/** Closest call: guess the views 7 days after listing. 100 points for exact, 0 if 10× off. */
export function callPoints(call: number, actual: number) {
  return Math.round(100 * Math.max(0, 1 - Math.abs(Math.log10(call / actual))) ** 2);
}

// ---------- mock world ----------

function skillOf(t: Tags) {
  return (NICHES.find((n) => n.id === t.niche)?.effect ?? 0) + HOOK_EFFECT[t.hook] + FORMAT_EFFECT[t.format] + (t.lengthSec ? lengthBucket(t.lengthSec).effect : 0.05);
}

export function simulate(a: Omit<Listing, "base" | "peakHour" | "steep" | "growth" | "heat" | "bought"> & { allowBought?: boolean }): Listing {
  const r = rngFor(`sim:${a.platform}:${a.postId}`);
  const skill = skillOf(a.tags);
  const luck = gauss(r) * 0.45 + (r() < 0.12 ? 0.9 + r() * 0.8 : 0);
  const reach = a.creatorFollowers * (a.platform === "x" ? 0.012 : a.platform === "youtube" ? 0.2 : 0.3); // X counts engagements, not views
  const base = Math.max(a.platform === "x" ? 40 : 400, Math.round(reach * Math.pow(10, skill * 0.8 + luck)));
  const peakHour = Math.max(2, Math.min(60, Math.exp(1.6 + 0.8 * (skill * 0.8 + luck) + gauss(r) * 0.4)));
  const steep = 1.1 + r() * 0.7;
  const tmp = { ...a, base, peakHour, steep, growth: 1, heat: 0, bought: false } as Listing;
  const growth = viewsAtAge(tmp, a.postAgeAtListH + SETTLE_H) / Math.max(1, viewsAtAge(tmp, a.postAgeAtListH));
  return { ...tmp, growth, heat: Math.max(0.2, 0.6 + gauss(r) * 0.35 + (a.creatorFollowers > 5e5 ? 0.4 : 0)), bought: !!a.allowBought && r() < 0.06 };
}

const SCOUTS = [
  "chartgoblin", "fyp.oracle", "reelwhisperer", "earlybird.09", "hypehunter", "algo.astrologer", "viralvaidya", "scrolltrader",
  "loopqueen", "trendtrader.in", "sleeperpicks", "nocapcapital", "bullish.on.cats", "reelrishi", "contrarian.kid", "hookhunter",
];
const SUFFIX: Record<PlatformId, string> = { reels: "", youtube: "tv", x: "_" };


const EPOCH = Date.UTC(2026, 10, 1); // listing #0
const EVERY_H = 3.6; // a new sample listing roughly every 3.6 hours

/** Sample market: listings other players made. Stable ids, so positions survive day changes. */
export function marketListings(now: number): Listing[] {
  const out: Listing[] = [];
  const last = Math.floor((now - EPOCH) / (EVERY_H * H));
  const first = Math.max(0, last - Math.ceil((SETTLE_H + 96) / EVERY_H));
  for (let i = last; i >= first; i--) {
    const r = rngFor(`ml:${i}`);
    const platform: PlatformId = (["reels", "reels", "youtube", "x", "reels", "youtube", "x"] as const)[i % 7];
    let title: string, hook: Hook, format: Format, niche: string;
    if (platform === "reels") {
      niche = pick(r, NICHES).id;
      [title, hook, format] = pick(r, CAPTIONS[niche]);
    } else if (platform === "youtube") [title, hook, format, niche] = pick(r, YT_TITLES);
    else [title, hook, format, niche] = pick(r, X_POSTS);
    const pool = CREATORS.filter((c) => c.niche === niche);
    const c = pick(r, pool.length ? pool : CREATORS);
    const lengthSec = platform === "x" ? 0 : format === "Vlog" ? 90 + Math.floor(r() * 600) : 7 + Math.floor(r() * 50);
    const l = simulate({
      id: `m${i}`, platform, kind: platform === "x" ? "Post" : platform === "youtube" ? (lengthSec < 60 ? "Short" : "Video") : "Reel",
      postId: `m${i}`, url: "", title, creator: c.handle + SUFFIX[platform],
      creatorFollowers: Math.round(c.followers * (0.15 + r() * 1.2)), scout: pick(r, SCOUTS),
      listedAt: EPOCH + (i * EVERY_H + r() * 2) * H, postAgeAtListH: 0.4 + Math.pow(r(), 1.7) * 20,
      tags: { niche, format, hook, lengthSec }, allowBought: true,
    });
    out.push(i % 29 === 13 && platform !== "x" ? { ...l, bought: true } : l); // a few bought-view cases, to show voiding
  }
  return out.filter((l) => l.listedAt <= now);
}

/** Larger settled archive for Insights (same model). */
export function archive(now: number): Listing[] {
  const out: Listing[] = [];
  for (let i = 0; i < 600; i++) {
    const r = rngFor(`ar:${i}`);
    const platform: PlatformId = (["reels", "youtube", "x"] as const)[i % 3];
    const niche = pick(r, NICHES).id;
    const src = platform === "reels" ? CAPTIONS[niche].map(([t, h, f]) => [t, h, f, niche] as [string, Hook, Format, string]) : platform === "youtube" ? YT_TITLES : X_POSTS;
    const [title, hook, format, n2] = pick(r, src);
    const lengthSec = platform === "x" ? 0 : 6 + Math.floor(Math.pow(r(), 1.6) * 120);
    out.push(simulate({
      id: `a${i}`, platform, kind: "", postId: `a${i}`, url: "", title, creator: `creator${i}`,
      creatorFollowers: Math.round(Math.pow(10, 3 + r() * 3.4)), scout: pick(r, SCOUTS),
      listedAt: now - (SETTLE_H + 2 + (i % 40) * 10) * H, postAgeAtListH: 0.4 + Math.pow(r(), 1.7) * 20,
      tags: { niche: n2, format, hook, lengthSec },
    }));
  }
  return out;
}

export function ticker(l: Pick<Listing, "creator" | "id">): string {
  const letters = l.creator.replace(/[^a-z]/gi, "").toUpperCase();
  return letters.slice(0, 4) + (hashString(l.id) % 90 + 10);
}

// ---------- stats helpers ----------

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function breakdown(ls: Listing[], key: (l: Listing) => string, order?: readonly string[]) {
  const g = new Map<string, Listing[]>();
  for (const l of ls) g.set(key(l), [...(g.get(key(l)) ?? []), l]);
  const rows = [...g.entries()].map(([k, xs]) => ({
    key: k, n: xs.length, median: median(xs.map((l) => l.growth)), hitRate: xs.filter((l) => l.growth >= 10).length / xs.length,
  }));
  if (order) rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  else rows.sort((a, b) => b.median - a.median);
  return rows;
}
export const LENGTH_ORDER = LENGTH_BUCKETS.map((b) => b.label);
export const listedAge = (l: Listing, now: number) => (now - l.listedAt) / H;

// ---------- format ----------

export function fmtNum(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K`;
  return String(Math.round(v));
}
export const fmtPrice = (p: number) => p.toFixed(2);
export const fmtPct = (x: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(x > 9.99 ? 0 : 1)}%`;
export const fmtSigned = (n: number) => (n > 0 ? `+${Math.round(n)}` : String(Math.round(n)));
export const fmtX = (m: number) => `${m >= 10 ? m.toFixed(0) : m.toFixed(1)}×`;
export function fmtAge(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${Math.floor(h)}h`;
  if (h < 24 * 60) return `${Math.floor(h / 24)}d`;
  if (h < 24 * 730) return `${Math.floor(h / 24 / 30)}mo`;
  return `${Math.floor(h / 24 / 365)}y`;
}
