# Familiar V2 asset provenance

## Photographic runtime assets

Customer-facing garment views now use local WebP photographs. `public/photos/manifest.json` records 36 images associated with twelve catalogue garments and one private reference. Each record includes source URL/page, credit, view kind, crop, original/final dimensions, byte size, SHA-256, same-garment association and `conditionProof: false`.

`src/media.ts` is the runtime registry. `mediaFor(templateId)` returns available views, credits and source page; `coverFor(templateId)` selects the cover. Additional local drafts/references retain their prepared template association so a different garment is not silently used after assigning a new ID.

Sources include the user-supplied Stitch imagery and public product photographs from UNIQLO, H&M, Select Trends, COMMENSE, ASOS/New Look and SeamsFriendly. These images are not original CC0 Familiar artwork and are not newly photographed secondhand inventory. No blanket ownership or license claim is made. See `docs/PHOTO_ASSET_PROVENANCE.md` for the per-garment table and source limitations.

Detail crops change framing only. They do not add damage, replace labels, create fabric behavior or synthesize an unprovided reverse view. The Cloud neck-label view is not a readable composition or size label. Some lower-resolution supplied Stitch views remain prepared examples.

## Brand, fonts and historical assets

The editable lowercase Familiar wordmark and mark SVGs remain original brand assets. Plus Jakarta Sans and Newsreader are self-hosted with their accompanying font licenses. Brand originality does not clear trademark rights.

The previous GLBs, studio SVG posters and illustrative source frames belong to the V1 build. Any preserved V1 assets/docs are historical or inert reference material, not current photographic evidence or a live 3D capture system. Their original claims and licenses must not be applied to the new third-party photographs.

## Verification

`npm run verify:assets` checks local photo paths, registry/manifest completeness, semantic view kinds, decoded WebP dimensions, byte lengths, SHA-256 and font availability. `npm run verify:fixtures` checks catalogue/reference associations, photograph-linked sources, no model requirement, property ordering and deterministic supported/limited/unavailable behavior. Neither verifier establishes a real seller garment's condition, tactile properties or ownership.
