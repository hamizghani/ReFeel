# Photographic asset provenance

The Familiar catalogue is a prepared, browser-local demonstrator. Product names, prices, measurements and seller identities are authored examples. The photographs below are stock/product examples used to illustrate those examples; they are not newly captured secondhand inventory, proof of original ownership, or laboratory tests.

## Garment-only catalogue covers

The user approved a consistent garment-only catalogue treatment, including AI reconstruction of fabric obscured by a person. The 12 catalogue items and private blue-blouse reference have separate AI-prepared covers in `public/covers/`. Each cover was made with an individual built-in `imagegen` edit of that item's existing front photograph, then visually inspected. The covers remove people, accessories, backgrounds and cast backdrop shadows. They retain visible garment color, construction and silhouette as closely as possible.

The source photo registry, source files, gallery entries and photographic evidence links remain unchanged. `coverFor()` serves the standardized catalogue cover; `photoCover()` identifies its `ai-reconstructed-demo` provenance and `conditionProof: false`. Generated covers are not inserted into `mediaFor().photos`. Listing galleries and detail/evidence views retain the original prepared photographs.

Covers are 800×1000 transparent WebP files, centered without stretching inside a maximum 680×820 content region. The shared interface provides the background. Sharp was used only for alpha-preserving trim, proportional containment, transparent padding and WebP optimization after generation. There is no runtime image service or third-party hotlink. Total cover payload is approximately 1.16 MB across 13 files.

These are catalogue representations, not condition evidence. AI reconstruction can change tiny fibres, folds, label lettering, exact proportions and hidden construction. Moss, Apricot, Lilac and Sage required fabric reconstruction around a removed model; Apricot also required an inferred lower skirt/hem because its original front photograph is cropped. Airloom required perspective normalization from a tabletop image; Airloom and Ink have low-resolution source details. The original photographs remain the reference for assessing visible details. A targeted second edit corrected Moss to the source's five front buttons.

`public/covers/manifest.json` records each source-photo ID and checksum, generated-file reference, full prompt, any corrective prompt, reconstructed regions, final dimensions, byte length, SHA-256, transparency and framing metadata. These records explicitly distinguish generated covers from original prepared photographs. Run `npm run verify:covers` to verify the complete cover set, alpha-capable WebP headers, dimensions, integrity, source associations and gallery separation.

All selected images were decoded and visually inspected before use. Recursive interface screenshots, unrelated color variants, unrelated suggested products, fabric-choice charts, and disconnected damage close-ups were excluded. Each selected front/back/detail group represents one source garment. Detail crops keep the source garment unchanged and are explicitly labeled as crops. A back view or wear photo is not invented where unavailable.

## Selected garment sets

| Familiar ID | Source | Included views |
|---|---|---|
| `cloud-poplin` | [UNIQLO · prepared photographic example](https://www.uniqlo.com/id/en/products/E480074-000/00) | Front view; Sleeve and cuff detail; Neck label and collar; On-body example |
| `moss-knit` | [Select Trends · prepared photographic example](https://selecttrendsboutique.com/products/moss-green-button-up-cardigan) | Front view; Back view; Knit and buttons: photo crop |
| `airloom-linen` | Supplied Stitch export · prepared photographic example | Full garment, flat; Pocket and fabric: photo crop |
| `petal-tee` | [H&M · prepared photographic example](https://www2.hm.com/en_us/productpage.0963662168.html) | Front view; On-body back view; Jersey fabric detail |
| `sunday-denim` | [UNIQLO · prepared photographic example](https://www.uniqlo.com/id/en/products/E472120-000/00) | Front view; Waistband and pocket detail; Denim weave detail |
| `ink-trousers` | Supplied Stitch export · prepared photographic example | Front view; Pleat and waistband: photo crop |
| `apricot-slip` | [COMMENSE · prepared photographic example](https://thecommense.com/products/satin-backless-slip-dress) | Front view; On-body back view; Bodice and fabric detail |
| `tide-shirt` | [H&M · prepared photographic example](https://www2.hm.com/en_us/productpage.1257417011.html) | Front view; On-body back view; Collar and stripe detail |
| `oat-vest` | [H&M · prepared photographic example](https://www2.hm.com/en_us/productpage.1313249001.html) | Front view; Ribbing and button detail |
| `lilac-wrap` | [ASOS / New Look · prepared photographic example](https://www.asos.com/new-look/new-look-wrap-blouse-in-lilac/prd/203170837) | On-body front view; Wrap and tie: photo crop |
| `rose-jacket` | [H&M · prepared photographic example](https://www2.hm.com/en_us/productpage.1315959003.html) | Front view; On-body back view; Buttons and fabric detail |
| `sage-skirt` | [SeamsFriendly · prepared photographic example](https://seamsfriendly.com/products/sage-green-100-cotton-tier-gathered-midi-skirt) | On-body front view; On-body back view; Hem and gathered tier detail |
| `my-blue-blouse` | [UNIQLO · prepared private reference example](https://www.uniqlo.com/id/en/products/E475719-000/00?colorDisplayCode=61) | Front view; Collar and placket: photo crop; Hem and sleeve: photo crop |

## Source records and processing

The machine-readable `public/photos/manifest.json` contains every original URL, original dimensions, crop coordinates, final dimensions, byte length, and SHA-256 checksum. Original prepared photographs are optimized as WebP and served locally from `/photos/`; no runtime hotlink or third-party image network is required. Crop coordinates are fractions of the original image extent. Those source-photo crops change framing only. No damage, cloth mechanics, labels, or garment elements were added to the source photographs. The separately identified AI catalogue covers follow the reconstruction scope above.

The Airloom and Ink photographs came from the user-supplied Stitch Discover export. They are prepared imagery; their photographic appearance is not proof that they document real stock. Retail-source examples came from the relevant public product pages or public image CDN for that product. Brand information in the source is not a verification badge for Familiar.

A retail product page can describe composition or care, but that page is not a readable specimen care label. Familiar should identify manually entered composition as a prepared seller declaration unless the relevant specimen label is actually supplied. The Cloud neck-label photograph shows a neck brand/collar view, not a readable composition or size label. Source photographs do not establish odor, cleanliness, hidden damage, exact skin feel, or elastic recovery.

## Prepared recording scope

This asset set contains still photographs. Guided camera/recording interactions elsewhere in the application are prepared demonstration interactions, not live camera capture, identity verification, or physical cloth measurement. Playback of prepared photo stages must not be presented as newly captured real footage.

## Fonts

Newsreader weights 400, 500 and 600 are self-hosted in `public/fonts/newsreader-400.ttf`, `newsreader-500.ttf` and `newsreader-600.ttf`. They were retrieved from the Google Fonts stylesheet for `Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600` and its Google Fonts static font URLs. The open-font license is included alongside the fonts where retrieved.

## Verification

Run `node scripts/verify-photo-assets.mjs` to check all registry/manifest paths, decoded WebP dimensions, byte lengths and SHA-256 digests. The original source images and temporary contact sheets are inspection intermediates and are not runtime dependencies.
