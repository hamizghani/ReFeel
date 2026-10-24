# Animated garment rendering

The runtime loads one local GLB. Its forty authored parts are grouped into six shared-material meshes after loading. Every original vertex, seam, button, UV and triangle is retained. The main render pass uses seven draw calls including the shadow floor, compared with forty-one before batching. The complete visible scene has 14,186 triangles. The source manifest still describes the original forty-part GLB.

Static reduced-motion renders of both ivory and blue were compared before and after batching. Each 358 × 401 image had zero changed pixels, with unchanged triangle count and physical displacement. See the structured records in `qa/evidence/render-pixel-fidelity.json`.

This reduction in draw calls did not demonstrate a frame-rate improvement in the controlled software-WebGL benchmark. Warm median display intervals remained approximately 50 ms. Physics and deformation consumed part of the CPU budget; GPU work was asynchronous. `render-profile-before.json` and `render-profile-after.json` preserve those measurements. These results do not predict frame rate on a physical phone.

The renderer interpolates the fixed-step cloth state into the displayed garment, updates surface normals at a bounded frequency, and damps camera position, look target and prescribed rotation. Normal step changes retain cloth state. Replay resets the example. Pause preserves the physical pose. Manual exploration holds the automatic orientation until Reset or the next instruction.

Hidden viewers suspend continuous work and render an initial garment frame after loading. Visibility changes discard inactive-tab catch-up. Reduced-motion views warm the physical pose once and remain static; manual controls and Next continue to work. Resize and narrow-card container rules preserve framing and 44 px controls. Model, shader-context or asset failures have photographic fallback and retry.

Actual browser checks cover rotation, zoom, reset, continuous camera transitions, rapid instruction changes, pause, reduced motion, missing model, retry and disposal through view switching. These are local Chromium checks, not physical-device or Safari/Firefox acceptance.
