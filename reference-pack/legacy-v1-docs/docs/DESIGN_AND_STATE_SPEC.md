# Familiar design and state specification

## Product

English mobile-first secondhand clothing marketplace. Buyers browse without adding a reference. Source-linked Familiar Evidence and optional private garment comparison inform a purchase; seller capture and review create a clearer published profile. Prices use USD, measurements use centimetres and sizes use S/M/L. All services are deterministic browser-local examples with no backend, camera access, authentication or real transactions.

The initial catalogue contains twelve distinct listings. Fifty inert Coming soon cards follow: twelve original garment render references and thirty-eight inexpensive pastel placeholders. Coming soon items have no route, bag action, comparison action or order state.

## Visual system

Warm off-white, deep ink, lilac, powder blue, mint and soft pink. Self-hosted Plus Jakarta Sans with a Georgia editorial accent. Pill controls; rounded cards and panels; visible focus; large tap targets; readable supporting copy. Editable lowercase wordmark and a folded-loop/evidence-frame compact symbol have light and reverse variants.

## Modules

| Module | Responsibility |
|---|---|
| `src/domain.ts` | Typed fixtures, availability, immutable transitions, source support, authored Match order, publication and order snapshots, recovery validation |
| `src/store.tsx` | Core React context and versioned local persistence; storage failure preserves current-visit usability |
| `src/router.tsx` | Native URLs, links, history navigation and current pathname |
| `src/App.tsx` | Gateway, marketplace, listing, evidence, comparison, privacy, recovery, shell and publication gate |
| `src/SellerCommerce.tsx` | Draft editor, six capture stages, seller decisions, publication preview, checkout and order timeline |
| `src/components/GarmentViewer.tsx` | Lazy GLB loading, one-canvas rendering, desktop paired views, mobile stacking, controls, camera states and fallback |
| `src/components/SourceCapture.tsx` | Actual source-file view, localized marker, crop/zoom, authored movement-frame sequence and unavailable-media recovery |
| `src/components/RetainedFlows.tsx` | Validated local reference preparation, contextual conversations/reports, distinct moderation history, four-property aftercare and local privacy controls |
| `scripts/author-assets.mjs` | Reproducible original model, material, poster and SVG-brand authoring |
| `scripts/author-evidence.py` | Original independent prepared source-frame illustrations |

The current TypeScript interfaces and reducers are authoritative. Tests pin all material invariants.

## Core state

Core state schema version 1 persists at `familiar-v1`. It includes saved IDs, bag IDs, active/paused/removed/reserved/sold availability, checkout mode and Buy-now selection, private-reference name/availability, selected comparison listing/property/category/size, capture stage/completion, seller decisions, current draft, last published snapshot, orders, guided exploration and payment recovery.

`BAG_ADD` uses ordinary bag checkout. `BUY_NOW` selects one active item independently of the bag. A successful purchase removes purchased IDs only, preserving unrelated bag contents. A decline keeps inventory and checkout context unchanged. Unknown and Coming soon IDs are rejected. The prepared seller can pause, remove and restore Cloud Poplin while it is not reserved or sold; paused pieces remain visible with buying disabled, removed public routes recover, and order-bound stock follows its timeline.

`COMPARISON` validates and persists the chosen listing, property, size and category. `REFERENCE_DELETE` removes the reference from future comparisons; restore and prepared-replacement flows recover it intentionally.

## Source support and Match

Four properties appear in the fixed order Drape, Movement, Stretch and Surface. Each has supported, limited or unavailable source support. Seller status is separately unreviewed, confirmed, corrected or unsure. Corrections retain the original source observation and support metadata. Missing mechanics are never filled in.

Match applies category/size eligibility, then a property-specific authored discovery order grounded in the fixture's visible silhouette, weave or sequence. It returns three distinct active candidates when enough eligible pieces exist; narrower filters can return fewer. Unsupported reference properties are explicitly unavailable and do not receive a match score. No universal percentage is shown. The About page discloses the authored ranking.

Prepared source frames are separate from the interactive 3D illustrations. Markers use each image's intrinsic coordinate space. Failed media changes the visible inspector to unavailable-for-this-visit with retry, preserving the original observation for context. Three-frame illustrative movement playback can pause and stops after a short cycle.

Odor, hygiene, authenticity, exact softness, hidden damage and laboratory mechanics stay unassessed. Evidence coverage is not a condition or quality score.

## Seller and publication

Six capture stages are introduction, front, label, surface, movement and visible wear. Next advances the state; no camera or upload is required. Each changes the authored garment view. Capture issues block progression until retried. Retake returns to the relevant stage and invalidates the affected current-draft decisions.

Review requires a decision on all four findings. Confirm, Correct, Unsure and Retake have distinct consequences; correction text is required. Draft edits autosave valid changes and invalid fields display errors.

Publication creates a deep immutable snapshot of the current draft and seller decisions. Subsequent edits, corrections or retakes leave the buyer-facing version unchanged until republishing. The original source evidence remains attached.

A separate persisted moderation scenario records hold reason, original finding, appeal and prepared decision history. The publication route is gated while held or awaiting review. Clearing that hold does not bypass capture or seller-review gates. Moderation, visible condition and ordinary review readiness remain separate concepts.

## Commerce and aftercare

Checkout validates full name and delivery address, offers fixed $5 standard delivery and Card/Wallet selection without collecting payment credentials, and supports declined-payment recovery. Successful local checkout reserves stock, creates an order and leads to confirmation and timeline.

Order item snapshots retain purchase-time name, size, unit price, condition and poster, together with the recorded total. Later seller changes never rewrite receipt details. Legacy records without item snapshots state that the unit price was not recorded rather than inventing one.

Reservation, confirmation, packing, dispatch and delivery have explicit transitions. Pre-dispatch cancellation or reservation expiry releases inventory where permitted. Delivered orders support general expectation feedback and an issue/dispute note. A separate optional reflection records expected versus observed Drape, Movement, Stretch and Surface, supports skipping, and offers a return to the private reference.

## Supplemental local state

The independent schema version 1 at `familiar-retained-v1` stores bounded conversation drafts/history/reports, four-property aftercare, prepared-reference processing/incomplete/ready state, moderation history and prepared-session panel state. Updates are validated before persistence; malformed values recover without claiming saved work.

Reference replacement pauses comparison while processing or incomplete. A ready prepared reference can be restored without requiring uploads. Conversation replies and reports stay on the device. Local JSON export, consent withdrawal, reset and prepared sign-out have intentional consequences; sign-out does not erase the bag or order history.

## Rendering and recovery

Only one WebGL canvas is active. Desktop uses two scissor views for comparison; mobile stacks reference and candidate. Three.js and model loading are lazy. Drag/pinch/wheel and keyboard/button controls rotate, zoom and reset. Neutral, drape, movement, surface, label and wear views preserve garment identity. Movement stops after four seconds and reduced motion uses a still pose.

WebGL or model failure provides an accessible poster fallback and retry/static-view controls. The marketplace remains usable without 3D. Missing routes, malformed storage, offline visits and failed source media have clear recovery. Route headings receive keyboard focus once loaded. The mobile navigation uses safe-area spacing.

## Verification

Unit tests cover domain and supplemental state invariants, persistence, invalid transitions, immutable published/receipt snapshots and source alignment. Browser checks exercise desktop and phone layouts, journeys, controls, fallback, source recovery, reference management, moderation, privacy and local consequences. Accessibility scans cover visible primary surfaces. Asset verifiers independently inspect GLB geometry and metadata, source-file existence, SVG XML, counts and fixed property order.
