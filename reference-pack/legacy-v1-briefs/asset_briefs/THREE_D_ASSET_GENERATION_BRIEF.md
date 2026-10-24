# Three-dimensional Garment Asset Brief

## Required models

Create three distinct lightweight garment assets:

- `cloud-poplin.glb`: structured cotton blouse, collar, sleeves, button placket, crisp hem.
- `moss-knit.glb`: lightweight knit cardigan, open front, soft sleeve volume, visible knit scale.
- `airloom-linen.glb`: linen overshirt, relaxed collar, patch pockets, slightly structured drape.

Create a private reference proxy:

- `my-blue-blouse.glb`: simple blue blouse proxy with a distinct silhouette from Cloud Poplin.

## Technical constraints

- GLB preferred for deployability.
- Keep each hero GLB within an agreed mobile budget and record the measured size in the manifest.
- Use compressed textures and a small number of materials.
- Avoid dense simulation meshes, unnecessary bones, and unused animation data.
- Models must load through Three.js or React Three Fiber.
- Each model must have an image fallback.
- Store asset origin, authoring method, license, and intended route in a manifest.

## Viewer behavior

Viewer controls: drag rotate, pinch or wheel zoom, reset view, state buttons, reduced motion. Capture states: neutral, front, label, surface, movement, wear. Match states: reference, candidate, paired comparison. Fallback states: poster image and accessible evidence text.

## Review

Open each model in the running app on mobile and desktop. Confirm garment silhouette, material differentiation, loading, interaction, animation, cleanup, and fallback. Record screenshots or short preview captures in the QA evidence folder.
