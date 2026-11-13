import {
  BUY_WINDOW_H, H, Listing, SETTLE_H, buyCost, crowdShares, engagementAt, growthAt, holdersAt, priceAt, sellReturn, shareValue, statusOf,
} from "./game";
import { State } from "./store";

export type Snap = ReturnType<typeof snapshot>;

export function userShares(state: State, id: string) {
  return state.holdings[id]?.shares ?? 0;
}

/** Everything the UI needs about one listing at time `now`. */
export function snapshot(l: Listing, state: State, now: number) {
  const t = (now - l.listedAt) / H;
  const hold = state.holdings[l.id];
  const mine = userShares(state, l.id) - (hold?.founder ?? 0); // founder shares are already in the crowd count
  const since = hold ? (hold.firstBuyAt - l.listedAt) / H : Infinity;
  const out = (tt: number) => crowdShares(l, tt) + (tt >= since ? mine : 0);
  const shares = crowdShares(l, t) + mine;
  const price = priceAt(shares);
  const price24 = priceAt(out(Math.max(0, t - 24)));
  const status = statusOf(l, t);
  const growth = growthAt(l, Math.min(t, SETTLE_H));
  return {
    l, t, status, shares, price,
    change: price / price24 - 1,
    sinceList: price - 1,
    holders: holdersAt(l, t) + (hold && !hold.founder ? 1 : 0),
    eng: engagementAt(l, Math.min(t, SETTLE_H)),
    growth,
    valueNow: shareValue(growth), // what a share would pay if it settled now
    buyClosesIn: BUY_WINDOW_H - t,
    settlesIn: SETTLE_H - t,
    canBuy: status === "open",
    canSell: status === "open" || status === "closed",
    cost: (n: number) => buyCost(shares, n),
    sellFor: (n: number) => sellReturn(shares, n),
    history: Array.from({ length: 49 }, (_, i) => {
      const tt = (Math.min(t, SETTLE_H) * i) / 48;
      return { h: tt, v: priceAt(i === 48 ? shares : out(tt)) };
    }),
  };
}

/** Max whole shares affordable with `coins` at `s` outstanding. */
export function sharesFor(coins: number, s: number, K = 0.0025) {
  // K/2 n² + (1 + K s) n − coins = 0
  const b = 1 + K * s;
  return Math.max(0, Math.floor((-b + Math.sqrt(b * b + 2 * K * coins)) / K));
}
