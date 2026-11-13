"use client";
import { useEffect, useMemo, useState } from "react";
import {
  DAILY_COINS, HORIZON_H, Reel, STAGES, curve, fmtFollowers, fmtPct, fmtSigned, fmtViews, reelPayout, signalsAt, viewsAt,
} from "@/lib/engine";
import { State, spentOn } from "@/lib/store";
import { Spark, ViewsChart } from "./charts";

export function posterBg(hue: number, seed: string) {
  const a = (seed.length * 37) % 360;
  return `radial-gradient(120% 80% at ${20 + (a % 60)}% 10%, hsl(${hue} 85% 52% / .9), transparent 60%),
    radial-gradient(90% 70% at 90% 90%, hsl(${(hue + 40) % 360} 70% 30% / .9), transparent 70%),
    linear-gradient(160deg, hsl(${hue} 40% 14%), #050505)`;
}

type Props = {
  reels: Reel[]; day: string; state: State; settled: boolean;
  update: (fn: (s: State) => State) => void; toast: (m: string) => void;
};

export function Floor({ reels, day, state, settled, update, toast }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const reel = reels.find((r) => r.id === open);
  return (
    <>
      <div className="how">
        <div><b>1 · Spot it</b>Six fresh reels drop every day. You see their first hours of views and engagement.</div>
        <div><b>2 · Call it</b>Predict the 7-day view count. Closest calls earn the most.</div>
        <div><b>3 · Go early</b>Buy at 2h for ×3 profit, or wait for more data and a smaller multiplier.</div>
        <div><b>4 · Settle</b>After 7 days the real count lands. Coins back, leaderboard moves.</div>
      </div>
      <div className="grid">
        {reels.map((r) => {
          const pos = state.reels[r.id];
          const stage = pos ? pos.stage : state.peeks[r.id] ?? 0;
          const h = STAGES[stage].hour;
          return (
            <button key={r.id} className="reel" style={{ background: posterBg(r.niche.hue, r.id) }} onClick={() => setOpen(r.id)}>
              <div className="reel-top">
                <span className="reel-niche">{r.niche.label}</span>
                {pos ? <span className="badge red">In · {STAGES[pos.stage].label}</span> : <span className="reel-len num">{r.lengthSec}s</span>}
              </div>
              <div>
                <div className="reel-cap">{r.caption}</div>
                <div className="reel-meta"><span>@{r.creator.handle}</span><span>{r.audio === "Original audio" ? "Original" : r.audio === "Trending sound" ? "♪ Trend" : r.audio}</span></div>
                <div className="reel-stat">
                  <span>
                    <span className="big num">{fmtViews(settled ? r.finalViews : viewsAt(r, h))}</span>
                    <span style={{ fontSize: 11, opacity: 0.7 }}> {settled ? "at 7d" : `at ${h}h`}</span>
                  </span>
                  <Spark values={curve(r, settled ? HORIZON_H : h, settled ? 12 : 1).map((p) => p.v)} w={48} h={20} color="#fff" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {reel && <TradeDrawer reel={reel} day={day} state={state} settled={settled} update={update} toast={toast} onClose={() => setOpen(null)} />}
    </>
  );
}

const LOG_MIN = 3, LOG_MAX = 7.7;

function TradeDrawer({ reel: r, day, state, settled, update, toast, onClose }: Omit<Props, "reels"> & { reel: Reel; onClose: () => void }) {
  const pos = state.reels[r.id];
  const stageIdx = pos ? pos.stage : state.peeks[r.id] ?? 0;
  const st = STAGES[stageIdx];
  const now = viewsAt(r, st.hour);
  const prev = viewsAt(r, Math.max(1, st.hour - 1));
  const sig = signalsAt(r, st.hour);
  const left = DAILY_COINS - spentOn(state, day);
  const [logPred, setLogPred] = useState(() => Math.min(LOG_MAX, Math.log10(Math.max(1000, now * 6))));
  const [stake, setStake] = useState(() => Math.min(100, left));
  useEffect(() => { if (!pos) setLogPred(Math.min(LOG_MAX, Math.log10(Math.max(1000, now * 6)))); }, [st.hour]); // eslint-disable-line react-hooks/exhaustive-deps
  const pred = Math.round(Math.pow(10, logPred) / 100) * 100;
  const pts = useMemo(() => curve(r, st.hour, st.hour <= 6 ? 0.25 : 0.5), [r, st.hour]);
  const best = Math.round(stake * 1.2 * st.mult);

  const peek = () => {
    if (stageIdx >= STAGES.length - 1) return;
    update((s) => ({ ...s, peeks: { ...s.peeks, [r.id]: stageIdx + 1 } }));
  };
  const invest = () => {
    if (stake <= 0 || stake > left) return;
    update((s) => ({ ...s, reels: { ...s.reels, [r.id]: { reelId: r.id, day, pred, stake, stage: stageIdx, at: Date.now() } } }));
    toast(`Invested ${stake} on @${r.creator.handle} at ${st.label}`);
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={r.caption}>
        <div className="drawer-in">
          <div className="drawer-head">
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                @{r.creator.handle} · {fmtFollowers(r.creator.followers)} followers · posted {r.postedAt} IST
              </div>
              <h2>{r.caption}</h2>
            </div>
            <button className="x" onClick={onClose} aria-label="Close">×</button>
          </div>
          <div className="tags">
            {[r.niche.label, r.format, `Hook: ${r.hook}`, r.audio, `${r.lengthSec}s`].map((t) => <span key={t} className="tag">{t}</span>)}
          </div>

          {settled ? (
            <Result r={r} pos={pos} />
          ) : (
            <>
              <div>
                <div className="between" style={{ marginBottom: 8 }}>
                  <span className="hint">When you buy sets your profit multiplier</span>
                  {!pos && stageIdx < STAGES.length - 1 && (
                    <button className="btn small" onClick={peek}>Wait for {STAGES[stageIdx + 1].label} data →</button>
                  )}
                </div>
                <div className="stages">
                  {STAGES.map((s, i) => (
                    <div key={s.hour} className={`stage ${i === stageIdx ? "on" : i < stageIdx ? "past" : ""}`}>
                      at {s.label}<b className="num">×{s.mult.toFixed(1)}</b>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel">
                <h3>Live at {st.label}</h3>
                <div className="stats" style={{ marginBottom: 12 }}>
                  <div className="stat"><div className="k">Views</div><div className="v num">{fmtViews(now)}</div></div>
                  <div className="stat"><div className="k">Last hour</div><div className="v num">+{fmtViews(now - prev)}</div></div>
                  <div className="stat"><div className="k">Share rate</div><div className="v num">{fmtPct(sig.shareRate, 2)}</div></div>
                  <div className="stat"><div className="k">Save rate</div><div className="v num">{fmtPct(sig.saveRate, 2)}</div></div>
                  <div className="stat"><div className="k">Like rate</div><div className="v num">{fmtPct(sig.likeRate)}</div></div>
                  <div className="stat"><div className="k">Comments</div><div className="v num">{fmtPct(sig.commentRate, 2)}</div></div>
                  <div className="stat"><div className="k">Players in</div><div className="v num">{pos ? r.crowdPlayers.toLocaleString("en-IN") : "?"}</div></div>
                  <div className="stat"><div className="k">Crowd call</div><div className="v num">{pos ? fmtViews(r.crowdMedian) : "Hidden"}</div></div>
                </div>
                <ViewsChart points={pts} maxH={st.hour} refs={pos ? [{ label: "You", value: pos.pred }, { label: "Crowd", value: r.crowdMedian, dashed: true }].filter((x) => x.value < now * 3) : []} />
                <p className="hint" style={{ marginTop: 8 }}>Shares and saves lead views. A high share rate on low views is how slow burns start.</p>
              </div>

              {pos ? (
                <div className="panel">
                  <h3>Your position</h3>
                  <div className="between">
                    <div><div className="muted" style={{ fontSize: 12 }}>7-day call</div><div className="pred-val num">{fmtViews(pos.pred)}</div></div>
                    <div className="r"><div className="muted" style={{ fontSize: 12 }}>Staked</div><div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{pos.stake}</div></div>
                    <div className="r"><div className="muted" style={{ fontSize: 12 }}>Bought at</div><div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{STAGES[pos.stage].label} ×{STAGES[pos.stage].mult}</div></div>
                  </div>
                  <p className="hint" style={{ marginTop: 10 }}>
                    The crowd says {fmtViews(r.crowdMedian)}. Settles 7 days after posting. Want it now? Use “Fast-forward” in Portfolio (demo only).
                  </p>
                </div>
              ) : (
                <div className="panel">
                  <h3>Your 7-day call</h3>
                  <div className="pred-val num">{fmtViews(pred)} <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>views</span></div>
                  <input type="range" min={LOG_MIN} max={LOG_MAX} step={0.01} value={logPred} onChange={(e) => setLogPred(+e.target.value)} aria-label="Predicted 7-day views" />
                  <div className="quick">
                    {[2, 5, 10, 30, 100].map((m) => (
                      <button key={m} className="btn small" onClick={() => setLogPred(Math.min(LOG_MAX, Math.max(LOG_MIN, Math.log10(now * m))))}>×{m} now</button>
                    ))}
                  </div>
                  <div className="between" style={{ marginTop: 18 }}>
                    <span className="muted">Stake</span>
                    <span className="num" style={{ fontSize: 18, fontWeight: 700 }}>{stake} <span className="muted" style={{ fontSize: 12 }}>of {left} left</span></span>
                  </div>
                  <input type="range" min={0} max={Math.max(0, Math.min(500, left))} step={10} value={stake} onChange={(e) => setStake(+e.target.value)} aria-label="Stake" disabled={left <= 0} />
                  <div className="quick">
                    {[50, 100, 250, 500].map((v) => <button key={v} className="btn small" disabled={v > left} onClick={() => setStake(v)}>{v}</button>)}
                  </div>
                  <p className="hint" style={{ marginTop: 12 }}>
                    A perfect call returns your stake plus <b className="up num">+{best}</b>. Off by 10× or more and the stake is gone.
                  </p>
                  <button className="btn primary block" style={{ marginTop: 14 }} disabled={stake <= 0 || stake > left} onClick={invest}>
                    Invest {stake} at {st.label} · ×{st.mult.toFixed(1)}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

function Result({ r, pos }: { r: Reel; pos?: State["reels"][string] }) {
  const pts = useMemo(() => curve(r, HORIZON_H, 2), [r]);
  const res = pos ? reelPayout(pos.stake, pos.pred, r.finalViews, STAGES[pos.stage].mult) : null;
  return (
    <div className="panel">
      <h3>Settled · 7 days</h3>
      <div className="stats" style={{ marginBottom: 12 }}>
        <div className="stat"><div className="k">Final views</div><div className="v num">{fmtViews(r.finalViews)}</div></div>
        <div className="stat"><div className="k">Your call</div><div className="v num">{pos ? fmtViews(pos.pred) : "—"}</div></div>
        <div className="stat"><div className="k">Crowd call</div><div className="v num">{fmtViews(r.crowdMedian)}</div></div>
        <div className="stat"><div className="k">Result</div><div className={`v num ${res ? (res.net >= 0 ? "up" : "down") : ""}`}>{res ? fmtSigned(res.net) : "No bet"}</div></div>
      </div>
      <ViewsChart points={pts} maxH={HORIZON_H} refs={[...(pos ? [{ label: "You", value: pos.pred }] : []), { label: "Crowd", value: r.crowdMedian, dashed: true }]} cutoff={pos ? STAGES[pos.stage].hour : undefined} />
      {res && <p className="hint" style={{ marginTop: 8 }}>Accuracy {Math.round(res.acc * 100)}%. Bought at {STAGES[pos!.stage].label}, so profit ×{STAGES[pos!.stage].mult}.</p>}
    </div>
  );
}
