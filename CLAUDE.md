# HYPDAQ

Daily "invest in reels before they blow up" game. Next.js 15 (App Router), client-only, no database yet.
Read `README.md` for rules, scoring and what is mocked.

- All data is simulated and seeded per day in `src/lib/engine.ts`; captions/creators in `src/lib/catalog.ts` are fictional.
  Keep the "Sample data" labels until a real feed replaces the generators.
- Own GitHub repo (`YuvrajxGarg/hypdaq`) and own Vercel project (`hypdaq`). Not part of revolio-labs or revolio-studio-2.
- Production deploys from `main` only; other branches are skipped by `vercel.json`. Batch changes so each merge is one deploy.
- Look: black with red `#ff2a2a` accent, Geist Sans/Mono, no images or AI art.
