# Familiar

A complete browser-local secondhand clothing vision demonstrator. Buyer discovery, source-linked Familiar Evidence, private garment comparison, seller capture and review, and coherent simulated commerce share persisted state.

## Run

Requires Node.js 22.12 or later and npm.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. The application starts at the buyer/seller gateway.

## Verify

```sh
npm test
npm run verify:assets
npm run verify:fixtures
npm run build
npx playwright install chromium
npm run test:browser
```

Browser tests start their own temporary Vite server and test Chromium, desktop and mobile viewports, source media, local persistence, failed payment recovery, six capture stages, one-canvas GLB rendering and WebGL fallback. `qa/evidence` contains inspected screenshots and machine-readable verification results. Structural asset verification checks original model geometry, file sizes, required media and SVG validity.

## Deploy to Vercel

Import this directory as the project root. Vercel reads `vercel.json`: framework Vite, install with `npm ci`, build `npm run build`, output `dist`. Client-side routes rewrite to `index.html`; existing static media and generated bundles retain their own URLs. The configuration follows [Vercel’s Vite SPA guidance](https://vercel.com/docs/frameworks/frontend/vite). No environment variables or secrets are required. A production build is included, and editable source remains the authority.

## Product scope

The interface is English, priced in USD, with centimetre measurements and S/M/L labels. Twelve prepared listings precede fifty inert Coming soon cards. Three hero garments and one private blue blouse reference have original volumetric GLB models. Desktop comparison uses one WebGL canvas with two views; mobile stacks the same stages.

All inventory, sellers, capture media, prices, measurements, comparisons, conversations, delivery estimates and orders are authored examples. No real payment, shipment, camera capture, message delivery, authentication, cloud storage or inference runs. Interactive 3D is illustration and is separate from prepared source media. Source observations do not establish odor, hygiene, authenticity, exact softness, hidden damage or laboratory mechanics. Match uses an authored property-specific discovery order; it is not a measured model prediction.

State saves in this browser profile when storage is available. About & privacy explains the scope and provides reset controls. The app also recovers from malformed saved data and unavailable WebGL/media.

## Editable assets

`npm run verify:assets` validates the current authored assets. To regenerate original models, studio posters and SVG brand assets:

```sh
node scripts/author-assets.mjs
python3 scripts/author-evidence.py
```

The authoring script documents its dependencies. Source SVGs and GLBs, manifests, source-media definitions and asset provenance are included. Model dimensions are authored illustration dimensions, separate from the prepared listing measurements.

## Reference material

The complete source-and-assets archive preserves the supplied generation brief, updated and original context, normalized reference images and original embedded archives. Those materials guide the design and preserve research boundaries; third-party screenshots are not product imagery. See `docs/INPUTS_AND_LIMITS.md` and `docs/ASSET_PROVENANCE.md`.
