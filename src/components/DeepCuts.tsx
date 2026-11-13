"use client";
import { DeepCut, deepCutPoints, fmtFollowers, fmtViews } from "@/lib/engine";
import { State } from "@/lib/store";

type Props = { cuts: DeepCut[]; day: string; state: State; settled: boolean; update: (fn: (s: State) => State) => void; toast: (m: string) => void };

export function DeepCuts({ cuts, day, state, settled, update, toast }: Props) {
  const picked = state.deep[day];
  const winner = [...cuts].sort((a, b) => deepCutPoints(b) - deepCutPoints(a))[0];
  return (
    <>
      <p className="hint" style={{ maxWidth: 680, marginBottom: 16 }}>
        Five tiny reels from the long tail, all under 4K views. Pick the one you think breaks out this week. Points = how far it grows,
        boosted by how <b style={{ color: "var(--text)" }}>few players</b> picked it. A sleeper nobody saw coming pays the most. One pick a day, no coins at risk.
      </p>
      <div className="deep">
        {cuts.map((c) => {
          const mine = picked === c.id;
          return (
            <button key={c.id} className={`cut ${mine ? "picked" : ""}`} disabled={!!picked && !mine}
              style={picked && !mine ? { opacity: 0.55 } : undefined}
              onClick={() => {
                if (picked) return;
                update((s) => ({ ...s, deep: { ...s.deep, [day]: c.id } }));
                toast(`Deep cut locked: @${c.handle}`);
              }}>
              <span className="stripe" style={{ background: `hsl(${c.hue} 70% 55%)` }} />
              <div className="between"><span className="tag">{c.tag}</span>{mine && <span className="badge red">Your pick</span>}</div>
              <h3>{c.caption}</h3>
              <div className="muted" style={{ fontSize: 12 }}>@{c.handle} · {fmtFollowers(c.followers)} followers</div>
              <div style={{ marginTop: "auto" }}>
                <div className="between" style={{ fontSize: 12 }}>
                  <span className="muted">Views now</span><span className="num">{fmtViews(c.viewsNow)}</span>
                </div>
                {picked && (
                  <>
                    <div className="between" style={{ fontSize: 12, margin: "6px 0 4px" }}>
                      <span className="muted">Picked by</span><span className="num">{Math.round(c.crowdShare * 100)}% of players</span>
                    </div>
                    <div className="share-bar"><i style={{ width: `${c.crowdShare * 100}%` }} /></div>
                  </>
                )}
                {settled && (
                  <div className="between" style={{ fontSize: 13, marginTop: 8 }}>
                    <span>{fmtViews(c.finalViews)} at 7d</span>
                    <span className={`num ${c.id === winner.id ? "up" : ""}`}>{deepCutPoints(c)} pts</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {!picked && <p className="dim" style={{ marginTop: 12, fontSize: 12 }}>Crowd picks are hidden until you lock yours.</p>}
    </>
  );
}
