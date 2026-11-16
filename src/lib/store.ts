"use client";
// Player state lives in this browser (localStorage) until accounts and a shared database exist.

import { useCallback, useEffect, useState } from "react";
import { Listing, START_COINS } from "./game";

export type Holding = { listingId: string; shares: number; cost: number; call?: number; firstBuyAt: number; founder?: number };
export type Trade = { listingId: string; side: "buy" | "sell"; shares: number; coins: number; at: number };

export type State = {
  coins: number;
  lastDrip: string;
  holdings: Record<string, Holding>;
  trades: Trade[];
  listings: Listing[]; // real posts listed in this browser, with their number snapshots
  paid: Record<string, number>; // listingId -> coins credited at settlement
};

// v3: real data only. Earlier keys held sample markets and are ignored.
const KEY = "hypdaq.v3";
const EMPTY: State = { coins: START_COINS, lastDrip: "", holdings: {}, trades: [], listings: [], paid: {} };

export function useGameState() {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let s = EMPTY;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) s = { ...EMPTY, ...JSON.parse(raw) };
      localStorage.removeItem("hypdaq.v2");
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
  return { state, update, ready, reset };
}
