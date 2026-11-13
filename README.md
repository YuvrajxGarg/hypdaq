# HYPDAQ

A stock market for posts. Viewers scout reels, YouTube videos and X posts they think will blow up, list them, and
everyone trades them in a Reels-style feed. A Revolio Labs prototype in the SLANGDAQ family.

## How it plays

- **Three apps, each in its own native layout** (switch at the top, or the bottom bar on phones):
  - Reels: full-screen vertical feed. The right rail shows price, holders and growth; one red Buy pill by the creator.
  - YouTube: home grid with a price badge on each thumbnail; tap for a watch page with Buy/Sell and the market.
  - X: a timeline of posts with a small market row under each; tap for the post page and chart.
  Tabs: For you / New / Rising / Ended.
- **List a post**: paste a link, nothing else. Post time is read from the link (X and Instagram ids encode it; YouTube from its page), title and creator from free public oEmbed. Must be under 24h old. One market per post, 3 listings a day. The scout gets
  20 founder shares free, locked until settlement, so finding a sleeper early pays and listing-then-dumping doesn't.
- **Price**: a bonding curve. Price = 1 + 0.0025 × shares outstanding, so every buy pushes it up and early buyers pay less.
  Sell back to the curve any time before settlement. Buying closes 3 days after listing; max 200 shares per trade.
- **Settlement**: 7 days after listing we read the post's numbers. Each share pays log₂(1 + growth since listing):
  no growth = 1.00, 3× = 2.00, 15× = 4.00. X posts trade on likes + reposts + replies (views aren't public).
- **Closest call** (optional, on buy): guess the 7-day number. 100 points for exact, 0 if 10× off.
- **Fake views void a market**: if views jump while likes/comments don't follow, the listing is voided and everyone is
  refunded what they paid.
- **Coins**: 1,000 to start, +200 each day you play. Play money only.
- **Leaders**: top traders (settled P&L), best scouts (median growth of what they listed, 10× hits), sharpest calls.
- **Insights** (creators/agencies): growth after listing by how early it was spotted, platform, creator size, format,
  hook and length; posts the market underpriced and overpriced.

## What is mocked

- Every listing in the feed, its creator, caption, view/like/comment curve and outcome: simulated from a seed
  (`src/lib/game.ts`, captions in `src/lib/catalog.ts`). All handles are fictional.
- Other players: their buys (the price curve's crowd), holder counts, leaderboards.
- When you list a post, the link is parsed for real (platform, post id, Reel/Short/Video/Post), but its title, creator
  followers and numbers are typed or simulated, since nothing fetches live data yet.
- Insights are computed from 600 simulated settled listings.
- Your coins, positions and listings live in your browser (`localStorage`, key `hypdaq.v2`).
- Portfolio has a **demo clock** (+6h / +1 day / +7 days) so you can watch markets settle without waiting.

## Making it live

1. **Database + accounts** (Supabase): listings, trades, holdings, snapshots, users. Move trading server-side so the
   price curve is shared by everyone.
2. **Number checker (cron)**: every few hours, snapshot each open listing:
   - YouTube: YouTube Data API (free key), exact views/likes/comments.
   - Instagram Reels: read the public reel page (plays, likes, comments). Instagram often blocks server requests, so
     keep a paid scraping service as a fallback.
   - X: public post data gives likes, reposts and replies (not views), so X markets settle on engagements.
3. **Listing check**: on submit, fetch the post once to fill title/creator/followers, confirm it exists, read its real
   post time (enforces the 24h rule) and take the first snapshot.
4. **Embeds**: show the real post in the feed (Instagram/YouTube/X embeds) instead of the placeholder card.
5. **Fraud**: run the bought-views check on real snapshots; rate-limit accounts; one account per person.

## Develop

```
npm install
npm run dev        # http://localhost:3002
npm run build
npm run typecheck
```

Deploys: Vercel project `hypdaq`, production from `main` only. `vercel.json` skips every other branch.
