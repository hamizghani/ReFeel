# ReFeel — Secondhand Marketplace

A mobile-first, browser-local secondhand clothing prototype featuring a modern Botanical Emerald Green design system, interactive garments with simulated cloth motion, and tactile feel-based comparisons.

## Key Features & UI Improvements

- **Botanical Emerald Green Design System**: Fresh, cohesive, and sophisticated green primary palette (`#184e38`) paired with sage tints and crisp off-white canvas.
- **ReFeel Match**: Compare paired garments and short tactile differences (Shape, Give, Texture, Softness) with private reference pieces.
- **Interactive 3D Cloth Simulation**: Real-time fixed-step XPBD cloth physics (rotate, sway, pull, release) using Three.js.
- **Elevated UI Chrome**: Translucent backdrop blur headers, elevated card shadows, polished floating 3D control dock, and streamlined mobile navigation.
- **Local-First & Private**: Browser-local storage, independent reference wardrobe, and simulated checkout flow.

## Run locally

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run dev
```

The root opens shopping. Cloud Poplin is the first prepared listing, with a **See it move** entry. **Sell a piece** is visible in the header; **Sell** also appears in mobile navigation. Search by feel is available beside the shopping search box.

## Deploy to Vercel

Unzip and use the directory containing `package.json` as the project root. Import it through your repository or Vercel workflow.

- Framework: Vite
- Install: `npm ci`
- Build: `npm run build`
- Output: `dist`
- Environment variables or backend setup: none

`vercel.json` supplies the SPA rewrite to `/index.html`. All photographs, fonts and the garment model are local. The archive contains source, a lockfile, a production build and supporting checks. Rebuild `dist` after source edits. Providing this ZIP does not change the existing live deployment.

## Main journeys

- Browse twelve prepared listings, search, filter, save, inspect original photographs, compare flat measurements and use simulated checkout.
- Explore Cloud Poplin by rotating, zooming, hanging and swaying, or gently pulling and releasing its fabric. Switch to original photographs for the photographed garment and condition.
- Compare Cloud with an illustrative blue version of the same base model. Both follow the same chosen action; each is independently explorable. Other garment types retain their own photographs.
- Read four differences in ordinary terms: **Shape**, **Give**, **Texture**, and **Softness**. The summary starts from your familiar piece. Descriptions retain seller, owner or prepared attribution; unknown qualities remain unknown. Measurements, condition, composition source, price and delivery stay available.
- Edit a private familiar piece's four descriptions. Sellers can edit the same descriptions in draft details before publishing.
- Follow six buyer or seller demonstration steps: full garment, reverse, label closer, hang and move, gentle pull, fabric and wear closer. **Next is available immediately**. Each example lasts six seconds, then holds while waiting for Next. Pause, replay, Back, inspection and resume are available. Viewing a saved step does not invalidate completion.
- Review, correct or mark seller findings unsure, then publish a browser-local listing. Public snapshots and existing purchase receipts remain independent of later draft edits.

## Verify

```sh
npm test
npm run verify:assets
npm run verify:fixtures
npm run verify:models
npm run verify:covers
npm run build
npx playwright install chromium
FAMILIAR_TEST_PRODUCTION=1 npm run test:browser
FAMILIAR_TEST_PRODUCTION=1 node scripts/studio-browser-tests.mjs
FAMILIAR_TEST_PRODUCTION=1 npm run test:navigation
FAMILIAR_TEST_PRODUCTION=1 npm run test:shopping
```

The numerical cloth suite checks supports, localized deformation, recovery, transient strain, long-run stability and display-rate agreement. State tests cover descriptions, walkthrough progress, review invalidation, migration, shopping and receipts. Asset checks verify local geometry, photographs, dimensions and hashes. Chromium checks exercise real rendered WebGL, interaction, short-phone controls, fallback, source context and bounded automated accessibility checks.

Browser output defaults to `../familiar-v3-check`; use `FAMILIAR_QA_DIR` to change it. The studio script writes to `../familiar-v3-studio-check`. Current release evidence is in `qa/evidence`. Historical V1/V2 material is labeled under `reference-pack`.

## Demonstration boundaries

There is one authored base garment, rendered in ivory and blue. Its fixed-step XPBD simulation has gravity, inertia, damping, structural/shear/bending constraints, support pins, seam coupling, limited thickness collision and localized grip forces. The parameters are tuned for this illustration. They are **not calibrated measurements of the photographed textiles**, and do not establish softness, elasticity, recovery or body fit. Changing a description changes the comparison, not the model's physical parameters. See `docs/CLOTH_PHYSICS.md` and `docs/RENDERING.md`.

The recording interface is a guided demonstration. It does not access a camera, scan a garment, create a real video or upload media. Next saves walkthrough progress; it never upgrades the authority of a source photograph or creates measured evidence. Names, measurements, prices, seller accounts, profiles and transactions are prepared examples. Photographs are not specimen-specific proof of secondhand condition.

No backend, cross-device sync, real authentication, messages, payments or shipping exists. Records live in this browser profile and can be lost when storage is cleared. Frame behavior was checked in headless Chromium with software WebGL and simulated phone sizes. Physical-device performance, Safari/Firefox acceptance and real tactile prediction remain unverified.

See `docs/DESIGN_AND_STATE_SPEC.md`, `docs/INPUTS_AND_LIMITS.md` and `docs/ASSET_PROVENANCE.md` for the current contract and provenance.
