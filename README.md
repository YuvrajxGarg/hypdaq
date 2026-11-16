# HYPDAQ

A stock market for posts. Viewers scout reels, YouTube videos and X posts they think will blow up, list them, and
everyone trades them in a Reels-style feed. A Revolio Labs prototype in the SLANGDAQ family.

## How it plays

- **Three apps, each in its own native layout** (switch at the top, or the bottom bar on phones):
  - Reels: full-screen vertical feed with the real Instagram embed. The right rail shows price, real plays and growth; one red Buy pill by the creator.
  - YouTube: home grid of real thumbnails with a price badge; tap for a watch page with the real player, Buy/Sell and the market.
  - X: a timeline of posts with a small market row under each; tap for the post page and chart.
  Tabs: For you / New / Rising / Ended.
- **List a post**: paste a link, nothing else. Post time is read from the link (X and Instagram ids encode it; YouTube from its page); title, creator and the first reading of its numbers come from `/api/peek`. A post can't be listed if its time or numbers can't be read. Must be under 24h old. One market per post, 3 listings a day. The scout gets
  20 founder shares free, locked until settlement, so finding a sleeper early pays and listing-then-dumping doesn't.
- **Price**: a bonding curve. Price = 1 + 0.0025 × shares outstanding, so every buy pushes it up and early buyers pay less.
  Sell back to the curve any time before settlement. Buying closes 3 days after listing; max 200 shares per trade.
- **Settlement**: on the first reading taken 7 days or more after listing (if none arrives within 3 more days, the last reading counts). Each share pays log₂(1 + growth since listing):
  no growth = 1.00, 3× = 2.00, 15× = 4.00. X posts trade on likes + reposts + replies (views aren't public).
- **Closest call** (optional, on buy): guess the 7-day number. 100 points for exact, 0 if 10× off.
- - **Insights**: growth after listing by platform and by how early it was spotted, plus the biggest movers. Computed from
  your real settled markets; appears after 3 have settled.

## Real data, no samples

- There is no sample data. Every listing is a real post someone pasted; feeds start empty.
- **Reading numbers** (`src/app/api/peek/route.ts`, free sources only):
  - YouTube: the watch page (views, likes, comments, upload time), or the YouTube Data API if `YOUTUBE_API_KEY` is set
    in Vercel (more reliable, free quota).
  - X: the public embed data (likes, reposts, replies). Views aren't public.
  - Instagram: the public embed page. Instagram often blocks server requests, so reels can fail to list with a clear
    "couldn't read" message.
- **Number checker**: while the app is open, each unsettled listing is re-read about hourly (`src/app/page.tsx`).
  There is no server cron yet, so readings only happen when someone has the app open.
- **Prices move only on real trades.** There are no other players yet: your coins, trades and listings live in your
  browser (`localStorage`, key `hypdaq.v3`). Older sample saves are cleared on load.

## Next

1. **Database + accounts** (Supabase): listings, snapshots, trades, holdings, users, so everyone trades one shared
   price curve and sees each other's listings, with a leaderboard.
2. **Server cron** for the number checker, so markets update and settle without the app open.
3. **Fraud**: run the bought-views check on real snapshots; rate-limit accounts; one account per person.

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
