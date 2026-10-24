# Familiar V3 asset provenance

## Photographs

`public/photos/manifest.json` records 36 local WebP images across twelve catalogue sets and one private reference. Each record retains source, crop, view kind, dimensions, byte length, SHA-256 and `conditionProof: false`. `src/media.ts` associates each view with its own garment template. Local drafts and references preserve that association.

Sources include supplied Stitch imagery and retail photographs from UNIQLO, H&M, Select Trends, COMMENSE, ASOS/New Look and SeamsFriendly. They are not original CC0 Familiar photography or actual seller condition evidence. `docs/PHOTO_ASSET_PROVENANCE.md` gives the individual sources. No general ownership or license claim is made. Detail crops only change framing; they do not create missing label, reverse or damage evidence.

## Animated shirt

`public/models/cloud-animated.glb` is a revised original procedural shirt from the supplied Familiar V1 asset. Sleeve roots were reshaped for a coherent sewn connection. Invented cuff damage and printed composition/size text were removed. `public/models/manifest.json` records the exact hash, byte length, forty active meshes, source and reproduction command. `scripts/author-animated-garment.mjs` can reproduce this asset.

One base geometry is reused for ivory Cloud and blue illustrative reference. The blue shape is not a reconstruction of the blue photograph. A locally generated weave texture, lighting and physically constrained displacement field are applied by `src/components/AnimatedGarment.tsx`. There is no remote geometry, third-party model download or captured textile parameter source. Neither the asset nor its motion is source evidence for real condition, composition or material feel.

## Brand and fonts

Familiar mark/wordmark SVGs remain original brand assets. Newsreader and Plus Jakarta Sans are self-hosted with font licenses. Historical V1 and V2 source/design material is labeled under `reference-pack`; its superseded claims do not govern this release. Legacy public SVG posters only preserve old receipt image URLs.

## Checks

`verify:assets` verifies photographs and fonts; `verify:models` checks the single GLB, active nodes and integrity; `verify:fixtures` checks source associations and that walkthrough completion cannot promote evidence. These checks do not validate specimen condition, textile calibration or ownership.
