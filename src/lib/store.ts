"use client";
// Player state lives in this browser only (localStorage) until accounts and a database exist.

import { useCallback, useEffect, useState } from "react";
import { Listing, START_COINS, DAILY_COINS } from "./game";

export type Holding = { listingId: string; shares: number; cost: number; call?: number; firstBuyAt: number; founder?: number };
export type Trade = { listingId: string; side: "buy" | "sell"; shares: number; coins: number; at: number };
export type MyListing = Omit<Listing, "base" | "peakHour" | "steep" | "growth" | "heat" | "bought">;

export type State = {
  coins: number;
  lastDrip: string;
  holdings: Record<string, Holding>;
  trades: Trade[];
  myListings: MyListing[];
  paid: Record<string, number>; // listingId -> coins credited at settlement
  clockH: number; // demo: hours fast-forwarded
};

const KEY = "hypdaq.v2";
const EMPTY: State = { coins: START_COINS, lastDrip: "", holdings: {}, trades: [], myListings: [], paid: {}, clockH: 0 };

export function useGameState() {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let s = EMPTY;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) s = { ...EMPTY, ...JSON.parse(raw) };
    } catch {}
    setState(s);
    setReady(true);
  }, []);
  const update = useCallback((fn: (s: State) => State) => {
    setState((prev) => {
      const next = fn(prev);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  const reset = useCallback(() => update(() => ({ ...EMPTY })), [update]);
  return { state, update, ready, reset, DAILY_COINS };
}
