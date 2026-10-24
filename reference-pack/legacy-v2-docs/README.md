# Familiar, photographic marketplace V2

A mobile-first, browser-local secondhand clothing demonstrator inspired closely by the supplied Stitch marketplace layouts. It combines photographic discovery, useful garment comparison, optional Search by feel, guided prepared recordings for buyers and sellers, and coherent simulated commerce.

## Run locally

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The root route opens the marketplace. Browse `/shop`, use Search by feel, or open `/sell` for the seller studio.

## Build and deploy to Vercel

Unzip the deployable archive and use the directory containing `package.json` as the project root. Import that directory through your repository or Vercel workflow.

- Framework: Vite.
- Install: `npm ci`.
- Build: `npm run build`.
- Output: `dist`.
- Environment variables: none.
- Backend, database and external service configuration: none.

`vercel.json` includes the SPA rewrite to `/index.html`. Static photographs, fonts and bundles are local assets. The ZIP is a deployable source project, not a change to your current Vercel account. Source is authoritative; rebuild `dist` after edits.

```sh
npm run build
npm run preview
```

## Verify

```sh
npm test
npm run verify:assets
npm run verify:fixtures
npm run build
npx playwright install chromium
FAMILIAR_TEST_PRODUCTION=1 npm run test:browser
```

The unit suite checks state transitions, authored feel discovery, measurement differences, recording progress, legacy persistence, publication snapshots and immutable order facts. Asset checks verify the local WebP registry, decoded dimensions, checksums and file completeness. Browser checks exercise Chromium desktop and simulated phone viewports. The browser script writes its results to `../familiar-v2-check` by default; set `FAMILIAR_QA_DIR` to choose another directory. Packaged verification evidence records the checks actually run.

## What is included

- Twelve prepared listings, one prepared private blue reference, and 36 local photographs across 13 garment sets.
- Search, filters, sorting, saved pieces, listing galleries, measurements and original-photo inspection.
- A Search by feel action beside the shopping search bar, private reference selection, preferences, three eligible suggestions when available, paired photographs and four measurement differences.
- Shared six-task prepared recording: front, back, label, movement, gentle pull, and fabric/wear.
- Multiple local seller drafts and private references, resumable recording progress, review, correction, retake and publication.
- Bag and candidate-only Buy now, checkout recovery, reservation/order timeline, cancellation, disputes and optional arrival reflection.
- Browser-local persistence and validated migration from the previous `familiar-v1` state. Saved items, existing bag entries, edited Cloud draft and recorded receipts are retained where valid.

There is no customer-facing 3D viewer. Product photographs replace the earlier garment models. The original V1 documentation is preserved under `reference-pack/legacy-v1-docs` as historical material. Unused 3D source/models are archived under `reference-pack/legacy-v1-implementation`; Three.js is not a runtime dependency. Legacy public poster files remain to preserve old receipt image URLs.

## Demonstration boundaries

All names, seller identities, prices, measurements, feel profiles, conversations and commerce states are prepared examples. Record controls show camera-style prompts and timed demonstration takes. They do not access a device camera, upload files or create real footage. Photographs illustrate prepared garments and are not evidence of actual secondhand condition. Label and reverse views are not invented when the selected set lacks them.

Feel suggestions use authored qualitative profiles and intentions, with availability, category, size and ordinary search constraints applied first. They do not use garment inference, laboratory measurements, identity verification or an overall match percentage. Exact skin feel, fit, odor, cleanliness, authenticity and hidden damage remain unknown.

State belongs to this browser profile. Nothing is shared across users or devices. Real payments, shipping, authentication, messages and a backend are outside this deliverable.

Read `docs/DESIGN_AND_STATE_SPEC.md`, `docs/INPUTS_AND_LIMITS.md` and `docs/ASSET_PROVENANCE.md` for the design contract, boundaries and source records.
