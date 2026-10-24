# Familiar V3.1 — usability revision

15 October 2026. This release is an editable React/Vite project with a rebuilt `dist` folder for a fresh Vercel deployment. Existing live deployments are not changed by receiving this archive.

## Shopping and sellers

Catalogue cards support Add to bag and an actionable View bag link. The product page uses the same behavior on desktop and mobile. View bag resets any previous candidate-only Buy now context, so it opens the actual saved bag. Each listing represents one unique piece with quantity one; stock is never multiplied. Reserved, sold, paused, and removed listings cannot be added.

After addition, an accessible status announces the item and keyboard focus continues on View bag. Mobile buying actions meet a 44-pixel minimum height. Route heading focus respects a user who has already focused an interactive control in the page.

Seller links now open `/seller/:id` wardrobes. These pages show the existing seller identity and currently available public listings, with an honest empty state. They do not invent reviews, ratings, sales totals, or contact details. Private drafts and references are excluded.

## Comparison and recording

Match starts with the paired garments, one comparison verdict, four short differences, and compact price/delivery/save/buy actions. Condition, measurements, materials, explanations, and supporting views are separate closed disclosures. A known cuff-wear note remains visible in the closed condition summary. Detailed source attribution and unknown descriptions remain available. Original photos stay side by side on mobile.

Recording Next no longer resets page scroll. The same renderer, saved progress, immediate Next, keyboard action, replay, back, and six-second hold behavior remain available. Native Back navigation was checked to retain catalogue filters and scroll position.

## Catalogue covers and originals

Thirteen transparent 800×1000 garment-only WebP covers use consistent framing: twelve catalogue garments plus the private blue reference. Covers total approximately 1.16 MB. These are edited demonstration visuals; obscured portions were reconstructed with user approval. Apricot’s cropped lower hem required inference.

The 36 original source photographs remain unchanged and available in listing galleries, original-photo modals, comparisons, and evidence. Generated covers are not condition evidence. `public/covers/manifest.json` records source hashes, generation prompts, asset hashes, and reconstruction notes. The About page explains the cover treatment.

## Deployment

Unzip and use the directory containing `package.json` as the Vercel project root. Choose Vite, install with `npm ci`, build with `npm run build`, and use output directory `dist`. No environment variables are needed. SPA rewrites remain in `vercel.json`.

Source, lockfile, local photographs/fonts/models/covers, rebuilt output, tests, scripts, provenance, previous reference material, and current context are included. `RELEASE_MANIFEST.json` records every archive member’s size and SHA-256. Packaging checks ZIP CRC, member uniqueness, hashes, source/build asset agreement, and passing verification reports.

## Verification and limits

Release results are in `qa/evidence`: 216 unit tests and 52 production browser scenarios passed, with zero uncaught page errors. The main browser suite also completed 22 automated accessibility scans with no serious or critical violations. Commands cover unit/state behavior, photo and cover integrity, fixtures, models, production browser flows, disclosures, shopping, navigation, and automated accessibility. Prior render profiling records are retained under `reference-pack/legacy-v3-qa`; they are historical, not new performance measurements.

The application remains a browser-local vision demonstrator. No production backend, authentication, payment, shipping, camera recording, textile inference, or cross-device synchronization has been added. Browser checks use Chromium and simulated phone/tablet/desktop sizes; they do not certify physical devices, Safari, Firefox, or human accessibility acceptance.
