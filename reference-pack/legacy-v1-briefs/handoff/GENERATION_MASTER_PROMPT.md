# Familiar Final Product Generation Master Prompt

You are the lead product designer, frontend engineer, 3D interaction designer, asset director, QA engineer, and release packager for the Familiar Final Vision Demonstrator.

Your task is to inspect the companion `Familiar_Vision_Demonstrator.zip` and this complete generation pack, then create the finished Familiar product and two verified ZIP outputs. Work autonomously through the full sequence. Preserve the product decisions below as binding requirements.

## Mission

Create an English-language, USD-priced, mobile-first secondhand clothing marketplace that behaves as if Familiar already exists. The product must let a buyer browse normally, inspect source-linked evidence, compare any active listing with private clothing they own, and complete a coherent simulated order. It must let a seller create a clearer listing through a guided six-stage garment walkthrough, review findings, correct or confirm them, and publish a buyer-facing evidence profile.

The prototype is a final vision demonstrator. Its services may be local and simulated, but the interface, state transitions, 3D assets, copy, media, error paths, and persistence must feel like a finished product.

## Non-negotiable product decisions

- Buyer is the primary route. Seller is the secondary route.
- The entry gateway contains Shop Familiar, Sell with Familiar Evidence, and Explore both.
- Explore both guides the user through buyer discovery, Evidence, Match, and checkout before moving into seller capture.
- English interface copy, USD currency, centimetre measurements, S/M/L labels.
- Editorial and warm brand voice. Capture and evidence instructions remain concise and precise.
- Expressive pastel identity using lilac, powder blue, mint, and soft pink with deep ink text.
- New Familiar wordmark and symbol must be created as clean editable SVG.
- Active catalogue contains twelve distinct active listings. At least three are hero garments with fully authored 3D models.
- Fifty Coming soon items appear after active products in the same marketplace grid. They have no route, no detail page, no cart action, no Match action, and no order state.
- Hero garments are Cloud Poplin Blouse, Moss Knit Cardigan, and Airloom Linen Overshirt.
- The buyer reference is My blue blouse and is private by default.
- Compare with something I own is available on every active listing.
- Match properties are Drape, Movement, Stretch, and Surface.
- Match displays three ranked candidates and property-specific support labels. Never use a universal match percentage.
- Desktop comparison shows two 3D garment stages side by side. Mobile stacks the corresponding property panels and allows each stage to be viewed without losing context.
- Seller capture is a six-stage Next-driven simulation. It does not require camera permission or real upload.
- Seller capture stages are introduction, front view, label, surface, movement, visible wear, followed by review and publish states.
- Review actions are Confirm, Correct, Unsure, and Retake.
- Evidence distinguishes observation, seller confirmation, limited support, and unavailable properties.
- Odor, hygiene, authenticity, exact softness, hidden damage, and laboratory mechanics remain unassessed.
- Checkout supports Add to bag, Buy now, simulated payment, reservation, confirmation, and order timeline.
- No real backend, authentication, payment, shipping, external inventory, or cloud inference is required.
- Local deterministic services and persisted browser state must maintain coherent consequences across routes.
- The final app is root-level Vite + React + TypeScript, configured for Vercel static deployment.
- The final ZIP must include all source, tests, scripts, assets, references, build output, and documentation.

## Input material

Read the entire updated context pack. Read the original context to preserve research boundaries and source claims. Inspect the companion app source and build output. Inspect the marketplace references and guided verification references. Use the four user-specified skill repositories as design and verification guidance when accessible:

- https://github.com/Leonxlnx/taste-skill
- https://github.com/vercel-labs/agent-skills/tree/main/skills/web-design-guidelines
- https://github.com/voltagent/awesome-design-md
- https://github.com/microsoft/playwright-cli

Do not claim a skill was used unless its instructions were actually read. Do not copy references blindly. Extract the interaction principles that matter to Familiar.

## Required build sequence

1. Inspect the companion app, context, supplied references, and existing package manifests.
2. Write or update a design and state specification before changing product behavior.
3. Define an asset manifest for all active listings, 3D models, poster images, evidence media, and Coming soon placeholders.
4. Create the Familiar wordmark and symbol as SVG, with a clear semantic concept rooted in familiarity, garment continuity, comparison, and evidence.
5. Create or author three real garment 3D assets. Validate that each asset is visibly garment-shaped and not a generic plane.
6. Implement the typed fixture domain and explicit state transitions.
7. Implement buyer marketplace and role gateway.
8. Implement listing detail, Familiar Evidence, and listing-level private comparison.
9. Implement three-result Match with paired 3D and property-level evidence.
10. Implement seller capture, review, correction, and publication.
11. Implement cart, Buy now, checkout, reservation, and order timeline.
12. Implement Coming soon items as inert cards after active results.
13. Add responsive behavior for mobile and desktop.
14. Add WebGL detection, static image fallback, reduced-motion behavior, lazy asset loading, and one-canvas-at-a-time discipline.
15. Add unit, browser, responsive, persistence, and 3D visibility tests.
16. Run the independent review loop below. Fix all critical and substantive issues.
17. Build the app from a clean install, inspect the output, verify ZIP integrity, and produce both required ZIPs.

## Actual 3D acceptance criteria

The 3D requirement is satisfied only when all of the following are true:

- Three distinct garment models exist as GLB or GLTF assets.
- The models have visible garment silhouettes with sleeves, openings, seams, hems, or other construction cues appropriate to their category.
- A viewer can rotate and zoom the garment.
- The viewer can switch between at least three meaningful states: neutral, drape or movement, and surface or inspection.
- Each hero garment uses its own model and material treatment.
- Match can show reference and candidate side by side on desktop.
- Capture changes the garment view according to the task rather than merely changing text.
- The viewer supplies a loading state, WebGL failure fallback, and reduced-motion behavior.
- Asset manifests record size, dimensions, texture information, and intended routes.
- Automated browser checks confirm the viewer mount, selected state, and fallback route.
- A human visual review confirms that the result reads as clothing.

A procedural plane with a wave animation is insufficient. A 3D scene that does not preserve garment identity across states is insufficient. Do not use a 3D asset to claim tactile properties that the evidence does not support.

## Product behavior contract

A buyer opens the role gateway, chooses Shop Familiar, searches or filters the marketplace, and opens an active listing. The listing shows product identity, seller, price, size, delivery estimate, evidence summary, and actions. Compare with something I own opens the private reference picker without losing the candidate listing. A prepared My blue blouse reference is selected by default for the demo. The comparison shows Drape, Movement, Stretch, and Surface separately, then returns to the candidate listing without losing state.

Evidence opens a source view, visible marker, timestamp or frame label, support state, seller status, and unknown properties. Evidence coverage never becomes a quality or condition score.

The seller route begins with a calm introduction and scope explanation, moves through six staged tasks, then opens review. The seller must make a decision before publication. Publication changes the buyer-facing evidence profile. Corrected and unsure findings remain represented as such.

Buying an active item changes its state to reserved or sold in the prepared demo. Coming soon cards never change state.

## Copy contract

Keep all product copy audience-facing and complete. Do not write conversational introductions, explanations of what you created, references to prompts or AI tools, offers of further help, or instructions addressed to the requester into files. Do not use “needs validation”, “further validation needed”, or similar drafting residue. Use warm editorial language for discovery and precise verbs for actions. Use property-specific limitations such as “Stretch comparison unavailable” or “This capture cannot establish exact softness.”

## Package contract

Create:

1. `Familiar_Final_Vercel_Deployable.zip`: root-level deployable project with `package.json`, `package-lock.json`, `src`, `public`, `tests`, `scripts`, `vercel.json`, `dist`, and product documentation.
2. `Familiar_Final_Source_Assets.zip`: complete source, all authored and generated assets, GLB/GLTF files, manifests, normalized references, original supplied archives, updated context pack, prompts, tests, QA evidence, and build instructions.

Do not include secrets, private tokens, node_modules, or hidden machine-specific state. Do include lockfiles and reproducible generation scripts.

## Completion gate

Do not report completion until clean install, unit tests, production build, browser route tests, responsive tests, 3D viewer checks, WebGL fallback check, persistence check, asset manifest check, and ZIP integrity check have run. Report any check that could not run with its concrete reason. Do not substitute a claim of success for evidence.
