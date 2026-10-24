# Familiar garment physics

The Cloud shirt and the blue reference are two illustrative variants of the same authored garment model. They use an actual position-based cloth simulation to make the walkthrough easier to follow. Their motion is **not a measured reconstruction of the photographed fabric**, and it is not evidence of softness, stretch, recovery, or condition.

## Solver

`src/cloth/physics.ts` is independent of Three.js. A 658-particle cage covers the front and back of the torso and both sleeves. Its 4,141 links include structural edges, diagonal shear links, two-hop bending links, front/back thickness links, shoulder load tethers, and sleeve-root seam links. The neckline and shoulder band are pinned as garment support. The rest of the particles retain velocity, respond to gravity and external forces, and exchange constraint corrections with their neighbours.

The distance links use extended position-based dynamics (XPBD). For a link with current distance `l`, rest distance `l0`, inverse particle masses `wa` and `wb`, compliance `alpha`, and time step `h`, the solver evaluates:

```
C = l - l0
alphaTilde = alpha / (h * h)
deltaLambda = (-C - alphaTilde * lambda) / (wa + wb + alphaTilde)
lambda += deltaLambda
```

The correction follows the current distance gradient. Multipliers are reset between physical substeps and accumulated during the iterative constraint passes. This distinction matters: the rendered cloth is not moved by a predefined vertex sinusoid. The sinusoidal signals are small external wind accelerations; the cloth response emerges from integration and constraint solving.

The simulation uses a fixed `1/120 s` physical step, six alternating constraint passes per step, and exponential velocity damping. Display frames accumulate physical time and interpolate the previous and current solved positions. A delayed frame can execute at most 12 substeps, so returning from a background tab cannot trigger an unbounded catch-up loop. Excess inactive-tab time is deliberately discarded.

## Forces and interaction

- Gravity acts downward at `9.81 m/s²` in model coordinates.
- A weak restoring force represents the sewn and pre-folded model's shape memory. It does not replace the cloth constraints.
- The hanging demonstration introduces a small initial disturbance and lets it settle.
- The movement demonstration applies gentle, spatially varying wind and then fades that input out before the final frame.
- The pull demonstration acts on two small lower-torso regions, with a gradual grip, hold, release, and damped recovery.
- The reference variant has more compliant bending and a lower damping coefficient. These are authored illustration settings, not textile measurements.

The grip also uses per-substep XPBD multipliers. This prevents a six-pass solve from repeatedly multiplying the grip stiffness. Its movement is smoothly loaded from progress 0.10 to 0.40, held through 0.60, and fully released by 0.82. A target displacement is an input to the compliant grip, not an asserted fabric stretch percentage.

| Parameter | Cloud | Reference |
| --- | ---: | ---: |
| Structural compliance | `3e-8` | Cloud × `1.55` |
| Shear compliance | `1.2e-7` | Cloud × `1.55` |
| Bending compliance | `3e-5` | Cloud × `1.55` |
| Thickness compliance | `7e-5` | Cloud × `1.55` |
| Shoulder tether compliance | `1e-9` | Cloud × `1.55` |
| Sleeve seam compliance | `1e-10` | Cloud × `1.55` |
| Grip compliance before influence weighting | `6e-5` | `6e-5` |
| Maximum authored grip target | `24 mm` | `30 mm` |
| Velocity damping coefficient | `3.2 s⁻¹` | `2.6 s⁻¹` |
| Shape-memory acceleration coefficient | `11 s⁻²` | `7 s⁻²` |

Free particles have a normalized inverse mass of 1; supported particles have an inverse mass of 0. These numerical parameters were chosen for this finite-resolution visual example and are not a physical textile calibration. The diagnostic kinetic-energy value is consequently a relative simulation quantity, useful for checking decay rather than reporting measured joules.

The renderer receives a continuous displacement field through `sampleDisplacement(x, y, z)`. Bilinear patch sampling and smooth blending across the torso/sleeve boundary allow the cloth, buttons, seams, and other attached trim to share the same deformation. Front and back sampling saturates outside the surface band so a button above a panel follows that panel rather than floating independently.

Paired front/back inequalities protect minimum cage thickness. Long-range shoulder tethers cap excess panel extension while allowing folds. A final strain-safety projection targets an edge-distance range of 85–115% of rest length, preventing a strong grip from producing an isolated, visibly stretched cage edge. Coupled neighbouring constraints mean this projection target is not an assertion that every edge always reaches exactly that range; the authored six-second grip sequence is additionally tested against a 20% maximum absolute strain bound on every 60 Hz display frame.

These are limited geometric protections; the cage does not implement exhaustive triangle-triangle self-collision, calibrated orthotropic material response, skin contact, or a full garment-fitting simulation.

## Verification

The implementation was written after a failing test attempt. The tests exercise supported points, actual local deformation, fixed-step trajectory agreement across 30, 60, and 120 display Hz, localized pull and release, energy dissipation, 30-second runs of both variants, bounded delayed frames, finite-state handling, continuity at sleeves and trim, correct lower-torso sampling, and reset behavior. An additional test checks transient strain on every display frame through grip, hold, and release, rather than checking only sparse samples or the final settled pose.

Numerical solver tests establish those software invariants. They do not establish how a real cloth feels, nor do they establish animation frame rate on a physical phone. Visual inspection and browser frame behavior are separate verification tasks.

## Technical references

- [Müller et al., Position Based Dynamics (2007)](https://matthias-research.github.io/pages/publications/posBasedDyn.pdf).
- [Müller, Ten Minute Physics: Extended Position Based Dynamics](https://matthias-research.github.io/pages/tenMinutePhysics/09-xpbd.pdf).
- [Macklin et al., Small Steps in Physics Simulation (2019)](https://mmacklin.com/smallsteps.pdf), DOI: [10.1145/3309486.3340247](https://doi.org/10.1145/3309486.3340247).

These references support the numerical method. They do not validate the Familiar garments' material parameters.
