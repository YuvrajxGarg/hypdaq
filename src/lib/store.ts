"use client";
// Player state lives in this browser only (localStorage). No accounts or server yet.

import { useCallback, useEffect, useState } from "react";

export type ReelPos = { reelId: string; day: string; pred: number; stake: number; stage: number; at: number };
export type CreatorPos = { key: string; handle: string; day: string; side: "viral" | "irrelevant"; stake: number; entry: number };

export type State = {
  reels: Record<string, ReelPos>;
  peeks: Record<string, number>; // reelId -> stage index revealed
  creators: Record<string, CreatorPos>;
  deep: Record<string, string>; // day -> deep cut id
  demoSettled: Record<string, boolean>; // day -> fast-forwarded
};

const KEY = "hypdaq.v1";
const EMPTY: State = { reels: {}, peeks: {}, creators: {}, deep: {}, demoSettled: {} };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function useGameState() {
  const [state, setState] = useState<State>(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setState(load());
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
  const reset = useCallback(() => update(() => EMPTY), [update]);
  return { state, update, ready, reset };
}

export function spentOn(state: State, day: string): number {
  let s = 0;
  for (const p of Object.values(state.reels)) if (p.day === day) s += p.stake;
  for (const p of Object.values(state.creators)) if (p.day === day) s += p.stake;
  return s;
}
