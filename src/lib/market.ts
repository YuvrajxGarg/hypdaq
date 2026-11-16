import {
  BUY_WINDOW_H, H, Listing, SETTLE_H, Stat, buyCost, finalGrowth, growthAt, priceAt, sellReturn, shareValue, statAt, statusOf,
} from "./game";
import { State } from "./store";

export type Snap = ReturnType<typeof snapshot>;

/** Shares outstanding at time `at`, from real trades (the scout's founder shares count from listing). */
function sharesAt(l: Listing, state: State, at: number) {
  const founder = l.scout === "you" ? state.holdings[l.id]?.founder ?? 0 : 0;
  let n = at >= l.listedAt ? founder : 0;
  for (const tr of state.trades) if (tr.listingId === l.id && tr.at <= at) n += tr.side === "buy" ? tr.shares : -tr.shares;
  return Math.max(0, n);
}

const ZERO: Stat = { at: 0, views: 0, likes: 0, comments: 0, shares: 0 };

/** Everything the UI needs about one listing at time `now`. */
export function snapshot(l: Listing, state: State, now: number) {
  const t = (now - l.listedAt) / H;
  const hold = state.holdings[l.id];
  const shares = sharesAt(l, state, now);
  const price = priceAt(shares);
  const price24 = priceAt(sharesAt(l, state, now - 24 * H));
  const status = statusOf(l, t);
  const growth = status === "settled" ? finalGrowth(l) : growthAt(l, Math.min(t, SETTLE_H));
  const last = statAt(l, t) ?? ZERO;
  const span = Math.max(1, Math.min(t, SETTLE_H));
  return {
    l, t, status, shares, price,
    change: price / price24 - 1,
    holders: hold ? 1 : 0,
    eng: last,
    checkedAt: last.at,
    growth,
    valueNow: shareValue(growth), // what a share would pay if it settled now
    buyClosesIn: BUY_WINDOW_H - t,
    settlesIn: SETTLE_H - t,
    canBuy: status === "open",
    canSell: status === "open" || status === "closed",
    cost: (n: number) => buyCost(shares, n),
    sellFor: (n: number) => sellReturn(shares, n),
    history: Array.from({ length: 49 }, (_, i) => {
      const tt = (span * i) / 48;
      return { h: tt, v: priceAt(sharesAt(l, state, l.listedAt + tt * H)) };
    }),
    growthHistory: l.stats.map((s) => ({ h: (s.at - l.listedAt) / H, v: growthAt(l, (s.at - l.listedAt) / H) })),
  };
}

/** Max whole shares affordable with `coins` at `s` outstanding. */
export function sharesFor(coins: number, s: number, K = 0.0025) {
  // K/2 n² + (1 + K s) n − coins = 0
  const b = 1 + K * s;
  return Math.max(0, Math.floor((-b + Math.sqrt(b * b + 2 * K * coins)) / K));
}
