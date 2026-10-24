# Familiar original asset provenance

All customer-facing product media in this asset set was authored for Familiar. No Etsy photograph, supplied application screenshot, stock garment photograph, purchased mesh, scanned garment, or third-party logo appears in these files. The original generated artwork and geometry are dedicated under **CC0-1.0**. Three.js remains covered by its own MIT license. Trademark clearance has not been assessed.

## Reproduction

Run `npm ci`, install the Chromium browser with `npx playwright install chromium`, and run `node scripts/author-assets.mjs`. The script constructs the garments, writes binary glTF, renders studio product media in Chromium with Three.js GLTFLoader, generates the pastel placeholders, restores the original editable brand paths, and measures every file for `public/asset-manifest.json`. It does not fetch any model, photograph, font, or texture from the network. An explicitly reported exact-mesh CPU render fallback exists when Chromium is absent.

To update only Cloud Poplin and its capture frames, run `node scripts/author-assets.mjs --cloud-only`; other garments retain their existing assets and manifest entries.

Run `node scripts/verify-assets.mjs` to independently parse the GLB chunks, binary positions, normals, UVs, indices, transforms, embedded fabric textures, and bounds. It checks model budgets, construction nodes, full three-dimensional depth, original embedded poster PNGs, accessible SVG metadata, exact measured bytes, the original 512 × 320 declared label texture, visible cuff-wear nodes, and all 80 required files. The verifier does not import the generation code or trust its geometry calculations.

## Garment construction

Models use metres, Y up, and front +Z. Hollow front/back fabric volume is joined around the sides, with an open neck and lower hem. Tapered sleeves have open cuffs and a shaped shoulder cap whose root lies inside the torso; they are curved tubes rather than a flat sleeve silhouette. Smoothly varying torso profiles, vertical ease folds, sleeve wrinkles, curled hems, sewn edges, collar facings, cuff facings, and raised button geometry give each model volume. No skeleton, animation, cloth solver, or opaque torso filler is included.

| Asset | Distinguishing construction | File size | Authored bounding dimensions, cm |
|---|---|---:|---:|
| `/models/cloud-poplin.glb` | Cream structured cotton blouse; standing collar and two leaves; six buttons; folded placket; crisp stitched hem and long cuffs | 433,556 bytes | 93.1 × 69.2 × 25.2 |
| `/models/moss-knit.glb` | Moss green open cardigan; two front facings; fuller soft sleeves; raised ribbed cuff and welt details | 478,676 bytes | 94.8 × 68.2 × 27.0 |
| `/models/airloom-linen.glb` | Stone linen overshirt; relaxed collar; six buttons; two open raised patch pockets; back yoke seam | 476,792 bytes | 97.4 × 73.2 × 26.1 |
| `/models/my-blue-blouse.glb` | Powder blue round-neck blouse; shorter gathered sleeve volume; distinct neckline and silhouette | 291,172 bytes | 81.2 × 64.1 × 25.7 |

These are intended geometric construction dimensions, **not measurements of a real seller garment**. Listing measurements are prepared domain fixtures and serve a separate interface purpose. The authoritative exact floats, nodes, material names, counts, texture properties, license, authoring method, origin, route use, fallback and byte size are in the JSON manifest.

Materials use rough dielectric fabric rather than plastic or metal. Cotton, linen, knit, denim and satin have distinct roughness and original 64 × 64 PNG fabric normal textures. Seams, buttons, collar/cuffs, woven labels, an original readable Cloud label print and authored Cloud cuff wear meshes have separate named nodes. Every export remains below 500,000 bytes and below the 2 MB hard budget. The models are intentionally stylized studio garments; no laboratory mechanics or exact cloth physics is represented.

## Product and fixture media

`/posters/{id}.svg` exists for the twelve active catalogue ids and the private `my-blue-blouse` reference. Each SVG contains an accessible title/description and a self-contained 800 × 1000 PNG rendered from the same original geometry as the associated garment. For the nine catalogue garments without a deployed GLB, the reproducible workshop constructs their geometry solely to render their poster. Consequently their thumbnails and category silhouettes are also original model-based artwork. The poster keeps the exact named base material colour, with the normal variation from studio lighting.

`coming-soon-01.svg` through `coming-soon-12.svg` contain original studio garment references with different colourways. `placeholder-01.svg` through `placeholder-38.svg` are lightweight original pastel cards. They are the complete fifty-card inert continuation of the catalogue and do not imply real inventory.

`evidence-front.svg`, `evidence-label.svg`, `evidence-surface.svg`, `evidence-movement.svg`, and `evidence-wear.svg` are separate, authored Cloud Poplin fixture frames for the simulated capture walkthrough. The Cloud label texture contains the prepared declaration “FAMILIAR / SIZE M / COTTON / 30° WASH”; this is fixture text, not a fibre composition test. The visible-wear geometry contains a raised original friction mark and five cuff threads. The movement file is a still camera angle; the interactive viewer supplies the staged motion. These files are not real captures and do not demonstrate measured condition or garment behaviour. The application may use separate annotated source-fixture drawings under `/evidence/`, authored by the main application implementation. Neither source-fixture set is an evidentiary claim based on the illustrative 3D model. Exact softness, odor, hygiene, authenticity, hidden damage and laboratory mechanics remain unknown.

## Editable brand system

`/brand/familiar-wordmark.svg` and `/brand/familiar-wordmark-reverse.svg` (also available as `logo-light.svg` and `logo-dark.svg`) are hand-constructed filled lowercase `familiar` wordmarks with named letter paths. They require no installed or remote font. `/brand/familiar-mark.svg` is the primary monochrome compact mark, with `familiar-mark-reverse.svg` for dark surfaces. `mark.svg` is the editable monochrome source with `currentColor`; `/brand/favicon.svg` places it on lilac. An open evidence frame encloses a folded loop ribbon, without a literal hanger or camera symbol. Each source includes an accessible title and description and a construction note. `public/brand/brand-manifest.json` records the intended surface, minimum sizes, palette, originality, license and exact bytes. The generation script embeds these editable original SVG sources so clean regeneration restores them.

## Verification status

All 80 required files passed the independent structural verifier. Four main garment silhouettes were inspected together from their actual rendered media, and the shoulder caps were revised to remove detached sleeve openings. Neck, cuff and hem volumes, material differences, buttons, patch pockets, open cardigan front and the private blue reference are visible in the authored set. Runtime viewer loading, orientation, controls, reduced motion and fallback behavior are checked by the application QA separately. After the label and cuff correction, actual seller capture stage screenshots at 1440px desktop and 390px mobile were inspected: all four upright label lines were legible, and the positive-X cuff friction mark and five loose threads were centered and visible. That runtime pass retained one canvas through capture stages and reported zero browser page errors.
