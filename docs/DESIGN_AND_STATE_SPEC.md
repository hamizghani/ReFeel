# Familiar V3 design and state specification

## Product and visual contract

English, USD, centimetres and S/M/L. Ordinary shopping works without Match or a private reference. The catalogue starts with twelve prepared listings; fifty inert Coming soon cards remain separate from purchasable inventory. Buyers and sellers can add multiple local records from prepared garment templates.

The revision follows the supplied Stitch marketplace, listing-gallery, paired-comparison, recording-studio, review and order layouts. The attached DESIGN GUIDELINE front-matter palette is the selected authority: lavender canvas `#FDF7FF`, ink `#1D1A25`, purple primary `#5E4874`, white surfaces and restrained pastel highlights. Newsreader provides editorial headings; Plus Jakarta Sans provides interface text. Color supports hierarchy, not unsupported authenticity or condition certification.

Mobile uses photographic cards, accessible search/filter controls, stacked comparison and deliberate bottom navigation. Desktop uses a filter rail, wider galleries, paired motion or photographs and aligned measurement rows. Deeper source explanations remain available without replacing useful shopping facts. Damages, missingness, fees and availability must remain visible where they affect a decision.

## Current modules

| Module | Responsibility |
|---|---|
| `src/marketplace.css`, `src/styles.css`, route styles | Shared lavender tokens, self-hosted type, responsive composition and interaction states |
| `src/domain.ts`, `src/store.tsx` | Typed prepared facts, validated immutable transitions, version-1 migration and synchronous local persistence |
| `src/media.ts` | Garment-associated photograph registry and local cover paths |
| `src/MarketplacePages.tsx`, `src/buyer.ts` | Discovery, ordinary search, filters, sorting and saved pieces |
| `src/ProductPages.tsx`, `src/components/PhotoGallery.tsx`, `src/components/GarmentShowcase.tsx` | Listing details, interactive shirt presentation, original-photo inspection and photograph-linked evidence |
| `src/cloth/physics.ts`, `src/cloth/choreography.ts`, `src/components/AnimatedGarment.tsx` | Fixed-step cloth dynamics, smooth six-action choreography, exploration and fallback |
| `src/feel.ts`, `src/FeelPages.tsx` | Relative Shape/Give/Texture/Softness descriptions, private references, eligible suggestions, paired animation and measurement differences |
| `src/recording.ts`, `src/components/GuidedRecording.tsx`, `src/StudioPages.tsx` | Shared buyer/seller prepared recording, drafts, review, retakes and publication |
| `src/CommercePages.tsx` | Checkout, receipts, orders and aftercare |
| `src/components/RetainedFlows.tsx` | Local conversations/reports, moderation, reflection and supplementary privacy/session state |
| `scripts/verify-photo-assets.mjs`, `scripts/verify-fixtures.mjs` | Photographic registry checks and independent runtime fixture/state checks |

The current runtime uses one revised Cloud GLB with pinned Three.js. One base geometry is reused as a clearly illustrative blue reference. Older V1 models and V2 documentation remain labeled historical material under `reference-pack`. Public legacy SVG posters preserve old receipt URLs. The marketplace itself keeps photographic cards; WebGL loads lazily only on relevant product, comparison and walkthrough routes. Hidden viewers stop continuous rendering; failed viewers offer original photos.

## Persistence and records

`familiar-v1` retains schema version 1 for compatibility, with validated additive fields: `localDrafts`, `localListings`, `activeDraftId`, `capturedSteps`, `privateReferences`, `feelIntent`, `feelDescription`, description attribution and walkthrough progress kind. Old saved IDs, bag entries, private reference name, Cloud draft, valid publication and purchase receipts are restored. New local IDs require a valid prepared template; arbitrary IDs, external photograph injection and malformed records are discarded. Unknown historical unit prices are not reconstructed from today's listing.

Seller draft sessions retain their own garment facts, walkthrough stage, six completed task IDs and review decisions. Changing the active draft saves the current session before loading the next. Buyer references retain the same recording progress separately. Deleting a selected private reference selects another valid reference or recovers to an empty state. Prepared photograph availability and explicit qualitative descriptions exist independently of whether the walkthrough has been viewed. An unknown qualitative dimension abstains without blocking known dimensions.

Core writes happen synchronously when an action is dispatched, protecting immediate-refresh changes. Unavailable browser storage leaves current-visit interaction usable with an honest warning. Supplementary conversation, moderation and reflection state remains at `familiar-retained-v1`.

## Recording, source support and review

Task order is front, back, label, movement, gentle pull, and fabric/wear. The model performs each action through damped camera choreography and a fixed-step XPBD cloth solver. Next is enabled from the start; six seconds ends the example and holds the pose until Next. Pause, replay, Back, saved-step inspection and resumed progress are supported. The same canvas persists across steps for smooth transitions. Reduced-motion users receive stable final poses and manual controls. No physical camera, video stream, uploaded blob, sensor or server exists.

Some media sets do not contain a true reverse view, readable composition label or damaged area. The walkthrough must identify the prepared view's limitation rather than relabel a front photo as new proof.

Evidence properties retain the fixed order Drape, Movement, Stretch, Surface. Supported, limited and unavailable describe source context. Confirmed, corrected, unsure and unreviewed describe the seller decision separately. Seller-described condition or give is not photograph verification. An animated movement/pull example provides visual instruction only. Completing it never changes an evidence source or upgrades support, and never establishes measured elasticity or recovery. `progressKind: animated-demo` distinguishes walkthrough progress from historical prepared progress. Corrections retain original observations and photograph links.

Retaking a task invalidates its dependent review decisions while preserving unaffected decisions. Publication requires all six completed task IDs and the completed session and a decision for every property; correction requires text. A separate moderation hold or appeal remains distinct from capture readiness.

## Feel discovery and useful comparison

The search bar exposes Search by feel. The query, desired qualities, avoided qualities, selected reference and property preference survive navigation/reload. Ordinary category, size, price and meaningful search constraints determine eligibility first. Only active inventory and compatible garment families can appear.

Feel discovery is deterministic and authored, not an AI textile model. Four everyday description dimensions lead the comparison: Shape, Give, Texture and Softness. A summary relates the find directly to the familiar piece. Every side retains seller, owner or prepared attribution. Unknown values remain unknown; softness is never inferred from shape or an animation. Editors save the owner's descriptions privately or the seller's descriptions in a draft. Those edits affect relative language and suggestions, not the authored model mechanics. Compatibility, availability and shopping constraints remain applied before ordering suggestions. No confidence or overall match percentage is exposed. Legacy property evidence stays in a supporting disclosure.

Direct comparison leads with the relative answer and keeps reference/search setup collapsible. Phone animation uses two compact models side by side, each with an enlarged accessible explorer. Desktop keeps full paired cards. Photos and full material/condition facts remain available. Comparison supplies garment identities, photographs, label sizes, four flat measurements, signed candidate-minus-reference centimetre differences, material provenance, shape/fabric observations, condition notes, price/delivery and explicit gaps. Measurements are prepared example facts, not derived from photos or body-fit promises. Original photos are available from context. Smaller eligible pools return fewer candidates.

## Publication and commerce invariants

Last-published garment facts, evidence decisions and photograph identity remain stable while a new seller draft is edited or retaken. Republish atomically replaces the public version. This applies to Cloud and additional local listings.

Saved identity survives inventory changes. Active owned listings can pause/remove/resume; reserved or sold stock cannot use those controls to bypass orders. Private references and Coming soon records cannot enter checkout.

Buy now includes only its selected candidate and preserves unrelated bag items. Decline retains inputs, checkout context and active stock. Standard delivery is $5. A successful local order reserves stock and snapshots purchase-time name, price, size, condition, poster and total. Optional destination/method are bounded local data. Subsequent edits do not rewrite a receipt. Early cancellation/expiry releases stock where permitted; dispatch/delivery and disputes have intentional transitions.

Aftercare supports general and optional property reflection, skipping, issue reporting and saving a delivered purchase privately using its receipt identity. The invitation creates an unfinished reference requiring guided walkthrough steps, rather than restoring an unrelated blue fixture.

## Verification boundaries

Unit, asset and browser checks test actual state, media and visible UI. Browser tests use Chromium with desktop and simulated mobile viewports, plus bounded Axe checks. These are not physical-device camera testing, full human accessibility certification, inference validation or live Vercel deployment. Current verification results are separate from historical V1 evidence.
