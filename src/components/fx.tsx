"use client";
// Small motion pieces: numbers that roll when they change, change chips, and a particle burst.
import { useEffect, useRef } from "react";
import { fmtPct } from "@/lib/game";

/** A number that rolls up (green) or down (red) whenever its value changes. */
export function Num({ value, fmt, className = "" }: { value: number; fmt: (v: number) => string; className?: string }) {
  const prev = useRef(value);
  const dir = useRef<"" | "u" | "d">("");
  const txt = fmt(value);
  if (fmt(prev.current) !== txt) dir.current = value > prev.current ? "u" : "d";
  useEffect(() => { prev.current = value; }, [value]);
  return <span key={txt} className={`num tick ${dir.current} ${className}`}>{txt}</span>;
}

export function Chip({ v, label }: { v: number; label?: string }) {
  const cls = label ? "flat" : Math.abs(v) < 0.0005 ? "flat" : v > 0 ? "up" : "down";
  return <span className={`chip ${cls}`}>{label ?? `${v > 0 ? "▲" : v < 0 ? "▼" : ""} ${fmtPct(Math.abs(v)).replace("+", "")}`}</span>;
}

/** Coins flying out of a point, for a successful trade. */
export function burst(x: number, y: number, colors = ["#ffc542", "#ff3b3b", "#2fe39a", "#ffffff"]) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 26; i++) {
    const el = document.createElement("span");
    el.className = "particle";
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.background = colors[i % colors.length];
    const size = 4 + Math.random() * 6;
    el.style.width = el.style.height = `${size}px`;
    document.body.appendChild(el);
    const a = Math.random() * Math.PI * 2;
    const d = 50 + Math.random() * 110;
    el.animate(
      [
        { transform: "translate(-50%,-50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d - 40}px)) scale(.3)`, opacity: 0 },
      ],
      { duration: 700 + Math.random() * 400, easing: "cubic-bezier(.2,.8,.2,1)" },
    ).onfinish = () => el.remove();
  }
}
