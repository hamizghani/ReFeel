# Familiar V2 design and state specification

## Product and visual contract

English, USD, centimetres and S/M/L. Ordinary shopping works without Match or a private reference. The catalogue starts with twelve prepared listings; fifty inert Coming soon cards remain separate from purchasable inventory. Buyers and sellers can add multiple local records from prepared garment templates.

The revision follows the supplied Stitch marketplace, listing-gallery, paired-comparison, recording-studio, review and order layouts. The attached DESIGN GUIDELINE front-matter palette is the selected authority: lavender canvas `#FDF7FF`, ink `#1D1A25`, purple primary `#5E4874`, white surfaces and restrained pastel highlights. Newsreader provides editorial headings; Plus Jakarta Sans provides interface text. Color supports hierarchy, not unsupported authenticity or condition certification.

Mobile uses photographic cards, accessible search/filter controls, stacked comparison and deliberate bottom navigation. Desktop uses a filter rail, wider galleries, paired photographs and aligned measurement rows. Deeper source explanations remain available without replacing useful shopping facts. Damages, missingness, fees and availability must remain visible where they affect a decision.

## Current modules

| Module | Responsibility |
|---|---|
| `src/marketplace.css`, `src/styles.css`, route styles | Shared lavender tokens, self-hosted type, responsive composition and interaction states |
| `src/domain.ts`, `src/store.tsx` | Typed prepared facts, validated immutable transitions, version-1 migration and synchronous local persistence |
| `src/media.ts` | Garment-associated photograph registry and local cover paths |
| `src/MarketplacePages.tsx`, `src/buyer.ts` | Discovery, ordinary search, filters, sorting and saved pieces |
| `src/ProductPages.tsx`, `src/components/PhotoGallery.tsx` | Listing details, galleries, original-photo inspection and photograph-linked evidence |
| `src/feel.ts`, `src/FeelPages.tsx` | Authored qualitative feel profiles, private references, eligible suggestions and measurement differences |
| `src/recording.ts`, `src/components/GuidedRecording.tsx`, `src/StudioPages.tsx` | Shared buyer/seller prepared recording, drafts, review, retakes and publication |
| `src/CommercePages.tsx` | Checkout, receipts, orders and aftercare |
| `src/components/RetainedFlows.tsx` | Local conversations/reports, moderation, reflection and supplementary privacy/session state |
| `scripts/verify-photo-assets.mjs`, `scripts/verify-fixtures.mjs` | Photographic registry checks and independent runtime fixture/state checks |

Dead model modules, GLBs and earlier authoring/verification scripts are archived in `reference-pack/legacy-v1-implementation`. Previous documentation/briefs/QA are retained in their labeled legacy folders. Legacy SVG poster files remain public only so old immutable receipt URLs can resolve. Current customer journeys use photographs and no WebGL canvas or Three.js dependency.

## Persistence and records

`familiar-v1` retains schema version 1 for compatibility, with validated additive fields: `localDrafts`, `localListings`, `activeDraftId`, `capturedSteps`, `privateReferences` and `feelIntent`. Old saved IDs, bag entries, private reference name, Cloud draft, valid publication and purchase receipts are restored. New local IDs require a valid prepared template; arbitrary IDs, external photograph injection and malformed records are discarded. Unknown historical unit prices are not reconstructed from today's listing.

Seller draft sessions retain their own garment facts, recording stage, six saved task IDs and review decisions. Changing the active draft saves the current session before loading the next. Buyer references retain the same recording progress separately. Deleting a selected private reference selects another valid reference or recovers to an empty state. A missing movement or pull task does not block comparisons of an already recorded different property.

Core writes happen synchronously when an action is dispatched, protecting immediate-refresh changes. Unavailable browser storage leaves current-visit interaction usable with an honest warning. Supplementary conversation, moderation and reflection state remains at `familiar-retained-v1`.

## Recording, source support and review

Task order is front, back, label, movement, gentle pull, and fabric/wear. Start/stop, timed prompts, keep take, retry and continue represent a prepared example. A saved take is required before the new recording flow advances. No physical camera, video stream, uploaded blob, sensor or server exists.

Some media sets do not contain a true reverse view, readable composition label or damaged area. The walkthrough must identify the prepared view's limitation rather than relabel a front photo as new proof.

Evidence properties retain the fixed order Drape, Movement, Stretch, Surface. Supported, limited and unavailable describe source context. Confirmed, corrected, unsure and unreviewed describe the seller decision separately. Seller-described condition or give is not photograph verification. A prepared movement/pull take can provide limited demonstration context but never measured elasticity or recovery. Corrections retain original observations and photograph links.

Retaking a task invalidates its dependent review decisions while preserving unaffected decisions. Publication requires the completed six-task session and a decision for every property; correction requires text. A separate moderation hold or appeal remains distinct from capture readiness.

## Feel discovery and useful comparison

The search bar exposes Search by feel. The query, desired qualities, avoided qualities, selected reference and property preference survive navigation/reload. Ordinary category, size, price and meaningful search constraints determine eligibility first. Only active inventory and compatible garment families can appear.

Feel discovery is deterministic and authored, not an AI textile model. Internal profile distances order suggestions but are not displayed as confidence, percentages or laboratory readings. The legacy property-specific discovery order remains for compatibility. Unknown profile values and missing relevant takes require abstention rather than inferred mechanics.

Comparison supplies garment identities, photographs, label sizes, four flat measurements, signed candidate-minus-reference centimetre differences, material provenance, shape/fabric observations, condition notes, price/delivery and explicit gaps. Measurements are prepared example facts, not derived from photos or body-fit promises. Original photos are available from context. Smaller eligible pools return fewer candidates.

## Publication and commerce invariants

Last-published garment facts, evidence decisions and photograph identity remain stable while a new seller draft is edited or retaken. Republish atomically replaces the public version. This applies to Cloud and additional local listings.

Saved identity survives inventory changes. Active owned listings can pause/remove/resume; reserved or sold stock cannot use those controls to bypass orders. Private references and Coming soon records cannot enter checkout.

Buy now includes only its selected candidate and preserves unrelated bag items. Decline retains inputs, checkout context and active stock. Standard delivery is $5. A successful local order reserves stock and snapshots purchase-time name, price, size, condition, poster and total. Optional destination/method are bounded local data. Subsequent edits do not rewrite a receipt. Early cancellation/expiry releases stock where permitted; dispatch/delivery and disputes have intentional transitions.

Aftercare supports general and optional property reflection, skipping, issue reporting and saving a delivered purchase privately using its receipt identity. The invitation creates an unfinished reference requiring guided takes, rather than restoring an unrelated blue fixture.

## Verification boundaries

Unit, asset and browser checks test actual state, media and visible UI. Browser tests use Chromium with desktop and simulated mobile viewports, plus bounded Axe checks. These are not physical-device camera testing, full human accessibility certification, inference validation or live Vercel deployment. Current verification results are separate from historical V1 evidence.
