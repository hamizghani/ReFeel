# Familiar guided-media marketplace revision

**Goal:** Deliver a mobile-first, photographic Familiar marketplace that closely follows the supplied Stitch layouts, offers guided prepared recordings for buyers and sellers, and makes fabric comparison materially more useful.

**Authorization:** The user approved implementation on 14 October 2026 and requested a new deployable ZIP. Live website inspection is read-only. No deployment, backend, authentication, device camera, payment processing or real inference is in scope.

## Resolved product contract

- Remove 3D from every customer-facing route.
- Use the DESIGN GUIDELINE.md front-matter palette: canvas #fdf7ff, primary #5e4874, ink #1d1a25 and its related lavender surfaces. Use Newsreader headings and Plus Jakarta Sans controls/body.
- Use photographic garment images and coherent source records; avoid recursive screenshot imagery.
- Keep English, USD, centimetres, S/M/L, the existing garment names/prices and $5 standard delivery.
- Prepared, camera-style guided recording is shared between sellers and buyers. It prompts the wearer/owner to show the garment, flip it, bring the label closer, show motion, pull and release the fabric, and inspect surface/wear. It progresses through recording, review, retake and completion states without accessing a physical camera.
- Place Search by feel beside ordinary search. Keep reference selection/capture, feel intentions, eligible results and full comparison connected.
- Fabric behavior and familiar feel lead comparison; measurements/material/shape/condition and purchase information remain visible. Exact tactile feeling and fit are not guaranteed, and absent support is explicit. No invented match percentages or sensor readings.
- Support additional local drafts and prepared private references. Keep all changes in the browser and preserve old local state where valid.
- Keep working saved items, bag, Buy now, availability, publication, immutable receipts, moderation and aftercare consequences.

## Live-site findings

The current site was opened through the requested cloud browser. Shop, listing, comparison and seller routes were inspected. Comparison uses verbose source paragraphs and lacks aligned measurement deltas. The cloud browser offered a static fallback for the old 3D view. The seller page edits one prepared garment and advances checks rather than capturing device media. The redesign addresses these observed behaviors.

## Structure and implementation tasks

1. **Media registry and assets.** `src/media.ts` provides `mediaFor(id)` and `coverFor(id)`, local photographic sources, available view kinds and provenance. Self-host Newsreader. Independently verify required photographs, dimensions, download formats and recursive-image exclusion.
2. **Domain and persistence.** Extend `src/domain.ts` and `src/store.tsx` with local drafts, published local listings, private references, prepared recording steps and feel intent. Preserve old APIs and commerce transitions. Write tests for legacy migration, draft publication snapshots, deleted references, recorded-step recovery and local dynamic IDs before implementing.
3. **Marketplace and details.** `MarketplacePages.tsx` replaces sparse discovery with a compact search/category/filter area, photo-led cards, desktop filter rail, removable chips, useful metadata and a Search by feel action. `ProductPages.tsx` adds photo galleries, fabric/feel information, measurements, seller/condition sources and clear purchase controls.
4. **Shared guided recording.** `GuidedRecording.tsx` and `StudioPages.tsx` provide six prepared recording tasks, a viewfinder, timer/playback, framing guides, retake, save/resume, seller review/publication and private-reference creation. Every control has a state consequence; no fake device or inference claim.
5. **Feel search and comparison.** `feel.ts` and `FeelPages.tsx` retrieve eligible candidates from explicit prepared fabric profiles and intentions. Show paired photographs, property observations, measurement deltas, condition sources, missingness and alternatives. Test ranking changes, filters/availability, reference incompatibility and unknown measurements.
6. **Commerce.** `CommercePages.tsx` rebuilds checkout and order/aftercare presentation using the existing state contracts and new photographs. Keep immutable purchase details, failed-payment recovery, reservation changes and optional reflection.
7. **Application shell.** `App.tsx` wires routes and shared navigation, responsive mobile bottom navigation, offline/storage feedback, account/privacy and immersive capture/checkout layouts. `styles.css` locks the visual tokens and shared component rhythm.
8. **Review and packaging.** Test unit/domain behavior, actual desktop/mobile rendering, connected buyer/seller journeys, source recovery, local persistence, search/feel controls and accessible focus/labels/contrast. Conduct independent evaluator review and fix substantive issues. Build Vite output; create an archive-specific manifest; verify ZIP CRC, every declared member/hash and a clean extracted install/test/build.

## Review focus

- Different photos or notes for the same garment must never be silently combined as evidence.
- A completed recording task must persist after refresh; retake invalidates only dependent findings.
- Publication and receipt media must stay stable when a draft/reference is edited.
- Saved/held/sold/removed inventory must remain consistent in search, feel results, bag and checkout.
- Small screens must preserve actionable comparison information without overlapping headings, controls or fixed navigation.

## Delivery

One root-level Vite/React deployable ZIP containing editable source, local photographic assets, package lockfile, built output, Vercel configuration, supplied design guideline, retained references, verification evidence and current product/deployment documentation. The live Vercel project will not be changed in this task.
