// HYPDAQ market rules. Players list real public posts (Reels, YouTube, X) and trade them.
// No sample data: every listing is a real post, its numbers come from /api/peek snapshots,
// and prices move only on real trades.

import { PlatformId } from "./platforms";

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
export const CHECK_EVERY_H = 1; // how often the number checker re-reads an open listing

/** One reading of a post's public numbers. For X, `views` is not public and stays 0. */
export type Stat = { at: number; views: number; likes: number; comments: number; shares: number };

export type Listing = {
  id: string;
  platform: PlatformId;
  kind: string;
  postId: string;
  url: string;
  title: string;
  creator: string; // the post's author (not a player)
  scout: string; // the player who listed it
  listedAt: number;
  postedAt?: number; // when the creator published it (from the id or the page)
  thumb?: string;
  stats: Stat[]; // first one is taken at listing
};

/** The number a market settles on: views, or likes + reposts + replies on X. */
export const metric = (l: Pick<Listing, "platform">, s: Stat) => (l.platform === "x" ? s.likes + s.shares + s.comments : s.views || s.likes);
export const metricName = (p: PlatformId) => (p === "x" ? "engagements" : p === "reels" ? "plays" : "views");

/** Latest reading at or before t hours after listing (or the first reading). */
export function statAt(l: Listing, t: number): Stat | undefined {
  const cut = l.listedAt + t * H;
  let best = l.stats[0];
  for (const s of l.stats) if (s.at <= cut) best = s;
  return best;
}
/** First reading taken at or after the settlement time, if the checker has made one. */
export const settleStat = (l: Listing) => l.stats.find((s) => s.at >= l.listedAt + SETTLE_H * H);

export function growthAt(l: Listing, t: number) {
  const a = l.stats[0], b = statAt(l, t);
  if (!a || !b) return 1;
  return metric(l, b) / Math.max(1, metric(l, a));
}

/** Bought views: plays jump 5× while likes barely move. Voids the listing and refunds everyone. */
export function isVoid(l: Listing, t: number): boolean {
  if (l.platform === "x") return false;
  const a = l.stats[0], b = statAt(l, t);
  if (!a || !b || b.views < 5000) return false;
  return b.views / Math.max(1, a.views) > 5 && b.likes / Math.max(1, a.likes) < 1.3;
}

// ---------- value & price ----------

/** What one share pays at settlement: log2(1 + growth since listing). No growth = 1.0, 3× = 2.0, 15× = 4.0. */
export const shareValue = (growth: number) => Math.log2(1 + Math.max(0, growth));
/** Price on the curve for a given number of shares outstanding. */
export const priceAt = (shares: number) => 1 + K * shares;
/** Cost to buy n shares when s are outstanding (area under the curve). */
export const buyCost = (s: number, n: number) => n + K * (s * n + (n * n) / 2);
export const sellReturn = (s: number, n: number) => buyCost(s - n, n);

// ---------- settlement & calls ----------

export type Status = "open" | "closed" | "settling" | "settled" | "void";
export function statusOf(l: Listing, t: number): Status {
  if (isVoid(l, Math.min(t, SETTLE_H))) return "void";
  // If no reading lands after day 7 (post deleted, reader blocked), settle on the last reading 3 days later.
  if (t >= SETTLE_H) return settleStat(l) || t >= SETTLE_H + 72 ? "settled" : "settling";
  return t >= BUY_WINDOW_H ? "closed" : "open";
}
/** Growth used for payouts: the reading at settlement once it exists, otherwise the latest. */
export function finalGrowth(l: Listing) {
  const s = settleStat(l), a = l.stats[0];
  if (!s || !a) return growthAt(l, SETTLE_H);
  return metric(l, s) / Math.max(1, metric(l, a));
}

/** Closest call: guess the number 7 days after listing. 100 points for exact, 0 if 10× off. */
export function callPoints(call: number, actual: number) {
  return Math.round(100 * Math.max(0, 1 - Math.abs(Math.log10(call / Math.max(1, actual)))) ** 2);
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function ticker(l: Pick<Listing, "creator" | "id">): string {
  const letters = l.creator.replace(/[^a-z]/gi, "").toUpperCase() || "POST";
  return letters.slice(0, 4) + (hashString(l.id) % 90 + 10);
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

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
