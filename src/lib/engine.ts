// The market engine. Everything here is SIMULATED from a per-day seed: reel curves, engagement
// signals, crowd predictions, creator indices and outcomes. Swap these generators for a real data
// feed (see README) to make the game live.

import {
  AUDIO_EFFECT, Audio, CAPTIONS, CREATORS, Creator, DEEP_CUTS, FORMAT_EFFECT, Format, HOOK_EFFECT, Hook,
  LENGTH_BUCKETS, NICHES, Niche, lengthBucket,
} from "./catalog";
import { gauss, pick, rngFor, shuffle } from "./rng";

export const GAME = "HYPDAQ";
export const DAILY_COINS = 1000;
export const SETTLE_DAYS = 7;
export const HORIZON_H = 168; // 7-day views

// When you buy decides your multiplier on profit. Earlier = less data, bigger reward.
export const STAGES = [
  { hour: 2, mult: 3.0, label: "2h" },
  { hour: 6, mult: 2.2, label: "6h" },
  { hour: 12, mult: 1.6, label: "12h" },
  { hour: 24, mult: 1.2, label: "24h" },
] as const;

export type Signals = { likeRate: number; shareRate: number; saveRate: number; commentRate: number };

export type Reel = {
  id: string;
  day: string;
  niche: Niche;
  creator: Creator;
  caption: string;
  hook: Hook;
  format: Format;
  audio: Audio;
  lengthSec: number;
  postedAt: string; // clock time, IST
  finalViews: number;
  peakHour: number;
  steep: number;
  quality: number; // hidden: drives signals
  crowdMedian: number;
  crowdPlayers: number;
};

// ---------- dates ----------

export function todayIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}
export function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime()) / 864e5);
}
export function prettyDay(day: string): string {
  return new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

// ---------- curves ----------

const sig = (h: number, c: number, k: number) => 1 / (1 + Math.exp(-k * (Math.log(Math.max(h, 0.25)) - Math.log(c))));

export function viewsAt(r: Pick<Reel, "finalViews" | "peakHour" | "steep">, h: number): number {
  return Math.round((r.finalViews * sig(h, r.peakHour, r.steep)) / sig(HORIZON_H, r.peakHour, r.steep));
}

export function curve(r: Reel, upTo: number, step = 1): { h: number; v: number }[] {
  const pts: { h: number; v: number }[] = [];
  for (let h = 0; h <= upTo; h += step) pts.push({ h, v: h === 0 ? 0 : viewsAt(r, h) });
  return pts;
}

export function signalsAt(r: Reel, h: number): Signals {
  const rng = rngFor(`${r.id}:sig:${h}`);
  const q = r.quality;
  const n = () => gauss(rng) * 0.12;
  const saveBoost = r.format === "Tutorial" || r.format === "Text on b-roll" ? 0.35 : 0;
  return {
    likeRate: 0.055 * Math.pow(10, 0.18 * q + n()),
    shareRate: 0.006 * Math.pow(10, 0.42 * q + n()),
    saveRate: 0.004 * Math.pow(10, 0.2 * q + saveBoost + n()),
    commentRate: 0.0025 * Math.pow(10, 0.15 * q + (r.hook === "Hot take" ? 0.3 : 0) + n()),
  };
}

// ---------- reel generation ----------

function makeReel(day: string, slot: string, seed: string, nicheId?: string): Reel {
  const rng = rngFor(seed);
  const niche = nicheId ? NICHES.find((n) => n.id === nicheId)! : pick(rng, NICHES);
  const [caption, hook, format] = pick(rng, CAPTIONS[niche.id]);
  const creators = CREATORS.filter((c) => c.niche === niche.id);
  const creator = pick(rng, creators);
  const audios: Audio[] = ["Trending sound", "Original audio", "Voiceover", "Remix"];
  const audio = format === "Talking head" ? pick(rng, ["Original audio", "Voiceover"] as Audio[]) : pick(rng, audios);
  const lengthSec =
    format === "Meme edit" ? 6 + Math.floor(rng() * 12)
    : format === "Vlog" ? 30 + Math.floor(rng() * 60)
    : format === "Talking head" ? 18 + Math.floor(rng() * 50)
    : 8 + Math.floor(rng() * 40);

  const skill =
    niche.effect + HOOK_EFFECT[hook] + FORMAT_EFFECT[format] + AUDIO_EFFECT[audio] + lengthBucket(lengthSec).effect +
    (format === "Skit" && audio === "Original audio" ? 0.2 : 0);
  const size = 0.35 * (Math.log10(creator.followers) - 4.6);
  const luck = gauss(rng) * 0.45 + (rng() < 0.09 ? 1.0 + rng() * 0.6 : 0);
  const quality = skill * 1.4 + gauss(rng) * 0.35 + (luck > 0.8 ? 0.9 : 0); // what engagement reveals
  const logFinal = Math.min(7.8, Math.max(3.0, 4.35 + skill + size + luck));
  const finalViews = Math.round(Math.pow(10, logFinal) / 100) * 100;

  // Big winners tend to be slow burns; flops are front-loaded.
  const peakHour = Math.max(2, Math.min(90, Math.exp(1.2 + 0.7 * (logFinal - 4) + gauss(rng) * 0.5)));
  const steep = 1.5 + rng() * 1.2;

  // The crowd (mock) anchors on early views and under-calls slow burns.
  const early = Math.log10(Math.max(1, viewsAt({ finalViews, peakHour, steep }, 6)));
  const crowdLog = 0.55 * logFinal + 0.45 * (early + 0.9) + gauss(rng) * 0.25;
  const hh = 7 + Math.floor(rng() * 15);
  return {
    id: `${day}:${slot}`,
    day, niche, creator, caption, hook, format, audio, lengthSec,
    postedAt: `${String(hh).padStart(2, "0")}:${rng() < 0.5 ? "00" : "30"}`,
    finalViews, peakHour, steep, quality,
    crowdMedian: Math.round(Math.pow(10, crowdLog) / 100) * 100,
    crowdPlayers: 900 + Math.floor(rng() * 8000),
  };
}

export const FLOOR_SIZE = 6;

export function dailyFloor(day: string): Reel[] {
  const rng = rngFor(`floor:${day}`);
  const niches = shuffle(rng, NICHES.map((n) => n.id)).slice(0, FLOOR_SIZE);
  return niches.map((n, i) => makeReel(day, `f${i}`, `reel:${day}:${i}`, n));
}

// ---------- Deep Cuts (rarity mode) ----------

export type DeepCut = {
  id: string; day: string; caption: string; handle: string; tag: string; followers: number;
  viewsNow: number; finalViews: number; crowdShare: number; hue: number;
};

export function deepCuts(day: string): DeepCut[] {
  const rng = rngFor(`deep:${day}`);
  const picks = shuffle(rng, DEEP_CUTS).slice(0, 5);
  const raw = picks.map((d, i) => {
    const r = rngFor(`deep:${day}:${i}`);
    const followers = 600 + Math.floor(r() * 6000);
    const viewsNow = 400 + Math.floor(r() * 3200);
    const growth = Math.pow(10, 0.3 + Math.abs(gauss(r)) * 0.45 + (r() < 0.2 ? 1.0 + r() * 0.8 : 0));
    const appeal = Math.log10(viewsNow) + r() * 0.8; // what the crowd chases
    return { d, i, followers, viewsNow, finalViews: Math.min(2_500_000, Math.round(viewsNow * growth)), appeal, hue: Math.floor(r() * 360) };
  });
  const tot = raw.reduce((s, x) => s + Math.exp(2.2 * x.appeal), 0);
  return raw.map((x) => ({
    id: `${day}:d${x.i}`, day, caption: x.d.caption, handle: x.d.handle, tag: x.d.tag, followers: x.followers,
    viewsNow: x.viewsNow, finalViews: x.finalViews, crowdShare: Math.exp(2.2 * x.appeal) / tot, hue: x.hue,
  }));
}

export function deepCutPoints(c: DeepCut): number {
  const growth = Math.log10(c.finalViews / c.viewsNow);
  return Math.round((100 * growth) / Math.sqrt(Math.max(c.crowdShare, 0.03)));
}

// ---------- Creator futures ----------

const EPOCH = "2026-09-01";

function creatorPath(handle: string, toDay: string): number[] {
  const n = daysBetween(EPOCH, toDay) + 1;
  const vals: number[] = [];
  let v = 100;
  let drift = 0;
  for (let i = 0; i < n; i++) {
    const r = rngFor(`cr:${handle}:${i}`);
    if (i % 9 === 0) drift = gauss(r) * 0.012; // regimes: rising, flat, fading
    v *= Math.exp(drift - 0.0015 + gauss(r) * 0.022 + (r() < 0.02 ? 0.12 : 0) - (r() < 0.02 ? 0.1 : 0));
    vals.push(Math.round(v * 10) / 10);
  }
  return vals;
}

export type CreatorQuote = Creator & { index: number; change7: number; history: number[]; trend: "Rising" | "Flat" | "Fading" };

export function creatorQuote(c: Creator, day: string): CreatorQuote {
  const p = creatorPath(c.handle, day);
  const history = p.slice(-30);
  const index = p[p.length - 1];
  const change7 = index / p[p.length - 8] - 1;
  return { ...c, index, change7, history, trend: change7 > 0.05 ? "Rising" : change7 < -0.05 ? "Fading" : "Flat" };
}

export function creatorIndexOn(handle: string, day: string): number {
  const p = creatorPath(handle, day);
  return p[p.length - 1];
}

export const creatorBoard = (day: string) => CREATORS.map((c) => creatorQuote(c, day));

// ---------- scoring ----------

export function accuracy(pred: number, actual: number): number {
  return Math.max(0, 1 - Math.abs(Math.log10(pred / actual)));
}

/** Coins back from a reel position. Early multiplier applies to profit only, never to losses. */
export function reelPayout(stake: number, pred: number, actual: number, mult: number) {
  const acc = accuracy(pred, actual);
  const gross = stake * 2.2 * Math.pow(acc, 1.5);
  const profit = gross - stake;
  const net = profit > 0 ? profit * mult : profit;
  return { acc, net: Math.round(net), back: Math.round(stake + net) };
}

export function creatorPayout(stake: number, side: "viral" | "irrelevant", entry: number, exit: number) {
  const ret = exit / entry - 1;
  const net = Math.max(-stake, stake * ret * 3 * (side === "viral" ? 1 : -1));
  return { ret, net: Math.round(net) };
}

// ---------- history for insights ----------

export function settledHistory(today: string, days = 60): Reel[] {
  const out: Reel[] = [];
  for (let i = SETTLE_DAYS; i < SETTLE_DAYS + days; i++) out.push(...dailyFloor(addDays(today, -i)));
  // Extra sample reels from the same model, so the breakdowns are not too thin.
  for (let i = 0; i < days * 4; i++) out.push(makeReel(addDays(today, -SETTLE_DAYS - (i % days)), `x${i}`, `sample:${i}:${today}`));
  return out;
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function breakdown<K extends string>(reels: Reel[], key: (r: Reel) => K, order?: readonly K[]) {
  const groups = new Map<K, Reel[]>();
  for (const r of reels) {
    const k = key(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const all = median(reels.map((r) => r.finalViews));
  const rows = [...groups.entries()].map(([k, rs]) => {
    const med = median(rs.map((r) => r.finalViews));
    return { key: k, n: rs.length, median: med, lift: med / all - 1, viralRate: rs.filter((r) => r.finalViews >= 1e6).length / rs.length };
  });
  if (order) rows.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  else rows.sort((a, b) => b.median - a.median);
  return rows;
}

export const LENGTH_ORDER = LENGTH_BUCKETS.map((b) => b.label);

// ---------- mock leaderboard ----------

const NAMES = [
  "chartgoblin", "fyp.oracle", "reelwhisperer", "earlybird.09", "hypehunter", "algo.astrologer", "viralvaidya",
  "scrolltrader", "loopqueen", "trendtrader.in", "sleeperpicks", "nocapcapital", "bullish.on.cats", "reelrishi",
  "contrarian.kid", "duetdealer", "hookhunter", "saves.not.likes", "midnight.scroller", "the.algo.whisperer",
];

export function leaderboard(day: string) {
  const rng = rngFor(`lb:${day}`);
  return NAMES.map((n) => ({ name: n, net: Math.round((gauss(rng) * 700 + 380) / 5) * 5, early: Math.floor(rng() * 4) }))
    .sort((a, b) => b.net - a.net);
}

// ---------- formatting ----------

export function fmtViews(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e5 ? 0 : 1)}K`;
  return String(Math.round(v));
}
export const fmtPct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const fmtSigned = (n: number) => (n > 0 ? `+${n}` : String(n));
export const fmtFollowers = fmtViews;
