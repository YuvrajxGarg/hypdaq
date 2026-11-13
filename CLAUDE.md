# HYPDAQ

A stock market for posts: viewers list reels/YouTube/X posts they think will blow up; everyone trades them in
platform-native views: Reels (vertical feed, market on the rail), YouTube (home grid + watch page), X (timeline + post page). Next.js 15 (App Router), client-only, no database yet.
Read `README.md` for rules, scoring and what is mocked.

- Market rules and the simulation are in `src/lib/game.ts`, per-listing UI numbers in `src/lib/market.ts`; captions/creators in
  `src/lib/catalog.ts` are fictional. Players are VIEWERS scouting other people's posts, not creators posting their own.
  Keep the "Sample data" labels until a real feed replaces the generators.
- Own GitHub repo (`YuvrajxGarg/hypdaq`) and own Vercel project (`hypdaq`). Not part of revolio-labs or revolio-studio-2.
- Production deploys from `main` only; other branches are skipped by `vercel.json`. Batch changes so each merge is one deploy.
- Look: black with red `#ff2a2a` accent, Geist Sans/Mono, no images or AI art. Keep it minimal: one Buy action per post, details on tap.
- UI: `src/app/page.tsx` (shell + routing), `components/Market.tsx` (market box, trade sheet, icons), `Reels.tsx`, `YouTube.tsx`, `XFeed.tsx`.
