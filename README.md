# HYPDAQ

A daily game: invest in reels before they blow up. A Revolio Labs prototype in the SLANGDAQ family.

## How it plays

- **Floor**: six new reels each day (midnight IST). You see their first hours: views, share/save/like/comment rates.
  Predict the 7-day view count and stake coins (1,000 play coins a day).
- **Go early**: buy at 2h for ×3.0 profit, or wait for 6h / 12h / 24h data (×2.2 / ×1.6 / ×1.2). Waiting is one-way.
- **Scoring**: accuracy = 1 − |log10(call ÷ actual)| (zero once you're 10× off). Coins back = stake × 2.2 × accuracy^1.5.
  The early multiplier applies to profit only, never to losses.
- **Creators**: back a creator to go *viral* or call them *irrelevant*. Each has a Hype Index; you win 3× the 7-day move
  in your direction, and can lose at most your stake.
- **Deep Cuts**: five long-tail reels under 4K views. One free pick a day. Points = log growth ÷ √(share of players who
  picked it), so a sleeper nobody backed scores most (rarity scoring, krillion-style).
- **Portfolio**: open and settled positions, weekly leaderboard. "Fast-forward 7 days" settles a day instantly (demo only).
- **Insights**: for creators and agencies. Median 7-day views by format, hook, length, audio and niche; share rate at 6h vs
  outcome; reels the crowd under-called and over-hyped.

## What is mocked

Everything data-related is simulated from a per-day seed in `src/lib/engine.ts`, and every caption, creator and handle in
`src/lib/catalog.ts` is fictional:

- Reels, their view curves, engagement signals and 7-day outcomes.
- Creator Hype Index history and future moves.
- The crowd (players' median calls, player counts, Deep Cut pick shares) and the leaderboard players.
- Insights are computed from ~600 simulated settled reels, so they reflect the model's built-in effects, not real reels.

Player state is saved in the browser (`localStorage`, key `hypdaq.v1`). No accounts, no server, no real money.

## Making it live (next steps)

1. **Reel feed**: replace `dailyFloor()` with a cron that picks fresh public reels (e.g. via a licensed social data API)
   and snapshots views and engagement at 2h/6h/12h/24h/7d into a database (Supabase, like SLANGDAQ).
2. **Crowd**: store every player's call server-side, so crowd medians, Deep Cut shares and leaderboards are real.
3. **Accounts**: sign-in so portfolios survive across devices.
4. **Insights**: run the same breakdowns over real settled reels and real player calls.

## Develop

```
npm install
npm run dev        # http://localhost:3002
npm run build
npm run typecheck
```

Deploys: Vercel project `hypdaq`, production from `main` only. `vercel.json` turns off builds for every other branch.
