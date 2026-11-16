# HYPDAQ

A stock market for posts: viewers list reels/YouTube/X posts they think will blow up; everyone trades them in
platform-native views: Reels (vertical feed, market on the rail), YouTube (home grid + watch page), X (timeline + post page). Next.js 15 (App Router), client-only, no database yet (state in localStorage).
Read `README.md` for rules, scoring and how real numbers are read.

- No sample data: every listing is a real post with real readings (`Listing.stats`) from `/api/peek`. Never add seeded,
  simulated or fictional posts, creators or players. Market rules are in `src/lib/game.ts`, per-listing UI numbers in
  `src/lib/market.ts`; the number checker (hourly re-reads while the app is open) is in `src/app/page.tsx`.
  Players are VIEWERS scouting other people's posts, not creators posting their own.
- Own GitHub repo (`YuvrajxGarg/hypdaq`) and own Vercel project (`hypdaq`). Not part of revolio-labs or revolio-studio-2.
- Production deploys from `main` only; other branches are skipped by `vercel.json`. Batch changes so each merge is one deploy.
- Look: black with red accent, Geist Sans/Mono, no AI art; real thumbnails and embeds of the listed posts only. Keep it minimal: one Buy action per post, details on tap.
- UI: `src/app/page.tsx` (routing), `components/Shell.tsx` (ticker tape, sidebar, account dock, You hub), `Market.tsx` (market box, trade sheet, icons), `fx.tsx` (rolling numbers, chips, trade burst), `Reels.tsx`, `YouTube.tsx`, `XFeed.tsx`.
- Listing is link-only: `src/lib/postTime.ts` reads post time from X/Instagram ids; `/api/peek` reads title, creator, post time and numbers (YouTube page or Data API with optional `YOUTUBE_API_KEY`, X embed data, Instagram embed page). Cloud sessions cannot reach those hosts; it works on Vercel.
