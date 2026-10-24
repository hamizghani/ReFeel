/** A fixed-step XPBD cloth cage; all units are metres and seconds. */
export type ClothVariant = 'cloud' | 'reference';
export type ClothMotion = 'rest' | 'hang' | 'sway' | 'pull';

type Vec3 = [number, number, number];
type Patch = {
  front: number[];
  back: number[];
  columns: number;
  rows: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
};
type Constraint = { a: number; b: number; length: number; compliance: number; lambda: number; strain: boolean; extensionOnly: boolean };
type LayerPair = { front: number; back: number; minimum: number };

const STEP = 1 / 120;
const MAX_STEPS = 12;
const SOLVER_PASSES = 6;
const clamp = (value: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, value));
const smoothstep = (lo: number, hi: number, value: number) => {
  const t = clamp((value - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
};

/** The reference uses a more compliant illustrative profile, not measured fabric data. */
export class GarmentPhysics {
  private readonly variant: ClothVariant;
  private readonly rest: Float64Array;
  private readonly positions: Float64Array;
  private readonly previous: Float64Array;
  private readonly displayPrevious: Float64Array;
  private readonly velocity: Float64Array;
  private readonly grabLambda: Float64Array;
  private readonly grabRegions: { particle: number; influence: number }[] = [];
  private readonly inverseMass: Float64Array;
  private readonly constraints: Constraint[] = [];
  private readonly layers: LayerPair[] = [];
  private readonly body: Patch;
  private readonly left: Patch;
  private readonly right: Patch;
  private accumulator = 0;
  private interpolation = 1;
  private elapsed = 0;
  private stepCount = 0;
  private lastProgress = 0;
  private lastMotion: ClothMotion = 'rest';

  constructor(variant: ClothVariant) {
    this.variant = variant;
    const points: number[] = [];
    const masses: number[] = [];
    const makePatch = (columns: number, rows: number, x0: number, x1: number, y0: number, y1: number, body: boolean): Patch => {
      const patch: Patch = { front: [], back: [], columns, rows, x0, x1, y0, y1 };
      for (const side of [1, -1]) {
        const indexes = side === 1 ? patch.front : patch.back;
        for (let row = 0; row < rows; row++) {
          const v = row / (rows - 1);
          const y = y0 + (y1 - y0) * v;
          for (let column = 0; column < columns; column++) {
            const u = column / (columns - 1);
            const x = x0 + (x1 - x0) * u;
            const depth = body
              ? 0.085 * Math.sqrt(Math.max(0.5, 1 - 0.45 * (x / 0.246) ** 2)) * (0.72 + 0.28 * Math.sin(v * Math.PI))
              : 0.039 * (0.85 + 0.15 * Math.sin(v * Math.PI));
            indexes.push(points.length / 3);
            points.push(x, y, side * depth);
            masses.push(body && y >= 0.245 ? 0 : 1);
          }
        }
      }
      return patch;
    };
    this.body = makePatch(13, 17, -0.246, 0.246, -0.338, 0.33, true);
    this.left = makePatch(6, 9, -0.164, -0.463, -0.211, 0.238, false);
    this.right = makePatch(6, 9, 0.164, 0.463, -0.211, 0.238, false);
    this.rest = new Float64Array(points);
    this.positions = this.rest.slice();
    this.previous = this.rest.slice();
    this.displayPrevious = this.rest.slice();
    this.velocity = new Float64Array(points.length);
    this.grabLambda = new Float64Array(points.length);
    for (const grid of [this.body.front, this.body.back]) {
      for (const particle of grid) {
        const i = particle * 3;
        const distanceX = (Math.abs(this.rest[i]) - 0.16) / 0.042;
        const distanceY = (this.rest[i + 1] + 0.15) / 0.058;
        const influence = Math.exp(-(distanceX * distanceX + distanceY * distanceY) * 0.5);
        if (influence >= 0.08 && masses[particle] !== 0) this.grabRegions.push({ particle, influence });
      }
    }
    this.inverseMass = new Float64Array(masses);

    const softness = variant === 'reference' ? 1.55 : 1;
    const connect = (a: number, b: number, compliance: number, strain = true, extensionOnly = false) => {
      const ai = a * 3, bi = b * 3;
      const length = Math.hypot(this.rest[bi] - this.rest[ai], this.rest[bi + 1] - this.rest[ai + 1], this.rest[bi + 2] - this.rest[ai + 2]);
      this.constraints.push({ a, b, length: extensionOnly ? length * 1.012 : length, compliance: compliance * softness, lambda: 0, strain, extensionOnly });
    };
    for (const patch of [this.body, this.left, this.right]) {
      const { columns, rows } = patch;
      for (const grid of [patch.front, patch.back]) {
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < columns; col++) {
            const index = row * columns + col;
            if (col + 1 < columns) connect(grid[index], grid[index + 1], 3e-8);
            if (row + 1 < rows) connect(grid[index], grid[index + columns], 3e-8);
            if (col + 1 < columns && row + 1 < rows) {
              connect(grid[index], grid[index + columns + 1], 1.2e-7);
              connect(grid[index + 1], grid[index + columns], 1.2e-7);
            }
            // Two-hop distances resist bending without baking a sinusoid into vertices.
            if (col + 2 < columns) connect(grid[index], grid[index + 2], 3e-5, false);
            if (row + 2 < rows) connect(grid[index], grid[index + 2 * columns], 3e-5, false);
          }
        }
      }
      for (let i = 0; i < patch.front.length; i++) {
        connect(patch.front[i], patch.back[i], 7e-5, false);
        const depth = this.rest[patch.front[i] * 3 + 2] - this.rest[patch.back[i] * 3 + 2];
        this.layers.push({ front: patch.front[i], back: patch.back[i], minimum: depth * 0.30 });
      }
    }
    // Long-range unilateral tethers share shoulder load over the whole panel.
    // They constrain excess extension, while allowing compression and folds.
    for (const side of ['front', 'back'] as const) {
      for (let row = 0; row < this.body.rows - 1; row++) {
        for (let col = 0; col < this.body.columns; col++) {
          connect(this.body[side][row * this.body.columns + col],
            this.body[side][(this.body.rows - 1) * this.body.columns + col], 1e-9, false, true);
        }
      }
    }
    // Weld sleeve roots to the closest torso rows on each surface.
    for (const patch of [this.left, this.right]) {
      const col = Math.round(clamp((patch.x0 - this.body.x0) / (this.body.x1 - this.body.x0)) * (this.body.columns - 1));
      for (let row = 0; row < patch.rows; row++) {
        const y = patch.y0 + (patch.y1 - patch.y0) * row / (patch.rows - 1);
        const bodyRow = Math.round(clamp((y - this.body.y0) / (this.body.y1 - this.body.y0)) * (this.body.rows - 1));
        for (const side of ['front', 'back'] as const) {
          connect(patch[side][row * patch.columns], this.body[side][bodyRow * this.body.columns + col], 1e-10);
        }
      }
    }
  }

  reset(): void {
    this.positions.set(this.rest);
    this.previous.set(this.rest);
    this.displayPrevious.set(this.rest);
    this.velocity.fill(0);
    this.grabLambda.fill(0);
    this.constraints.forEach(constraint => { constraint.lambda = 0; });
    this.accumulator = 0;
    this.interpolation = 1;
    this.elapsed = 0;
    this.stepCount = 0;
    this.lastProgress = 0;
    this.lastMotion = 'rest';
  }

  advance(deltaSeconds: number, motion: ClothMotion, progress: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;
    const frame = Math.min(deltaSeconds, STEP * MAX_STEPS);
    const targetProgress = Number.isFinite(progress) ? clamp(progress) : this.lastProgress;
    const startProgress = motion === this.lastMotion ? this.lastProgress : targetProgress;
    this.accumulator = Math.min(this.accumulator + frame, STEP * MAX_STEPS);
    const steps = Math.min(MAX_STEPS, Math.floor((this.accumulator + 1e-10) / STEP));
    for (let i = 0; i < steps; i++) {
      this.displayPrevious.set(this.positions);
      const localProgress = startProgress + (targetProgress - startProgress) * ((i + 1) / Math.max(1, steps));
      this.substep(motion, localProgress);
      this.accumulator -= STEP;
    }
    this.accumulator = Math.max(0, this.accumulator);
    // The previous solved frame is interpolated instead of feeding variable dt to physics.
    this.interpolation = this.accumulator / STEP;
    this.lastProgress = targetProgress;
    this.lastMotion = motion;
  }

  private substep(motion: ClothMotion, progress: number): void {
    const dt = STEP;
    this.previous.set(this.positions);
    this.elapsed += dt;
    this.stepCount++;
    const pos = this.positions, rest = this.rest, velocity = this.velocity;
    const damping = Math.exp(-(this.variant === 'reference' ? 2.6 : 3.2) * dt);
    const windEnvelope = motion === 'sway'
      ? smoothstep(0.03, 0.2, progress) * (1 - smoothstep(0.55, 0.9, progress))
      : motion === 'hang' ? (1 - smoothstep(0.02, 0.55, progress)) * 0.18 : 0;
    const pullEnvelope = motion === 'pull'
      ? smoothstep(0.10, 0.40, progress) * (1 - smoothstep(0.60, 0.82, progress))
      : 0;
    const windX = Math.sin(this.elapsed * 2.1) * 1.4 * windEnvelope;
    const windZ = Math.sin(this.elapsed * 2.6 + 0.7) * 1.7 * windEnvelope;
    for (let particle = 0; particle < this.inverseMass.length; particle++) {
      const i = particle * 3;
      if (this.inverseMass[particle] === 0) {
        pos[i] = rest[i]; pos[i + 1] = rest[i + 1]; pos[i + 2] = rest[i + 2];
        velocity[i] = velocity[i + 1] = velocity[i + 2] = 0;
        continue;
      }
      const exposure = 0.35 + 0.65 * clamp((0.33 - rest[i + 1]) / 0.668);
      const ripple = Math.sin(rest[i] * 11 + rest[i + 1] * 9 + this.elapsed * 2.8);
      // Weak shape memory represents the already sewn, pre-folded garment cage.
      // It is not a renderer transform: gravity, inertia and neighbour constraints still evolve every particle.
      const memory = this.variant === 'reference' ? 7 : 11;
      const ax = windX * exposure + (rest[i] - pos[i]) * memory;
      const ay = -9.81 + (rest[i + 1] - pos[i + 1]) * memory;
      const az = windZ * exposure * (0.7 + 0.3 * ripple) + (rest[i + 2] - pos[i + 2]) * memory;
      velocity[i] = (velocity[i] + ax * dt) * damping;
      velocity[i + 1] = (velocity[i + 1] + ay * dt) * damping;
      velocity[i + 2] = (velocity[i + 2] + az * dt) * damping;
      pos[i] += velocity[i] * dt;
      pos[i + 1] += velocity[i + 1] * dt;
      pos[i + 2] += velocity[i + 2] * dt;
    }
    for (const constraint of this.constraints) constraint.lambda = 0;
    this.grabLambda.fill(0);
    for (let pass = 0; pass < SOLVER_PASSES; pass++) {
      // Alternating order reduces the directional bias of Gauss-Seidel propagation.
      if (pass % 2 === 0 || pass === SOLVER_PASSES - 1) {
        for (let j = 0; j < this.constraints.length; j++) this.solveDistance(this.constraints[j], dt);
      } else {
        for (let j = this.constraints.length - 1; j >= 0; j--) this.solveDistance(this.constraints[j], dt);
      }
      if (pullEnvelope > 0) this.solveGrab(pullEnvelope, dt);
      this.protectDepth();
    }
    this.limitStrain();
    this.protectDepth();
    for (let particle = 0; particle < this.inverseMass.length; particle++) {
      const i = particle * 3;
      if (this.inverseMass[particle] === 0) continue;
      for (let axis = 0; axis < 3; axis++) {
        velocity[i + axis] = (pos[i + axis] - this.previous[i + axis]) / dt;
      }
    }
  }

  private solveDistance(constraint: Constraint, dt: number): void {
    const p = this.positions;
    const ai = constraint.a * 3, bi = constraint.b * 3;
    const dx = p[bi] - p[ai], dy = p[bi + 1] - p[ai + 1], dz = p[bi + 2] - p[ai + 2];
    const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (length < 1e-10) return;
    if (constraint.extensionOnly && length <= constraint.length) {
      constraint.lambda = 0;
      return;
    }
    const wa = this.inverseMass[constraint.a], wb = this.inverseMass[constraint.b];
    if (wa + wb === 0) return;
    const alpha = constraint.compliance / (dt * dt);
    const deltaLambda = (-(length - constraint.length) - alpha * constraint.lambda) / (wa + wb + alpha);
    constraint.lambda += deltaLambda;
    const correction = deltaLambda / length;
    p[ai] -= wa * correction * dx; p[ai + 1] -= wa * correction * dy; p[ai + 2] -= wa * correction * dz;
    p[bi] += wb * correction * dx; p[bi + 1] += wb * correction * dy; p[bi + 2] += wb * correction * dz;
  }

  private solveGrab(envelope: number, dt: number): void {
    const pos = this.positions, rest = this.rest;
    const amplitude = this.variant === 'reference' ? 0.030 : 0.024;
    for (const { particle, influence } of this.grabRegions) {
      const i = particle * 3;
      const alpha = 6e-5 / (dt * dt * influence * envelope);
      // A compliant, externally moved grip. Its XPBD multiplier prevents the
      // target's stiffness increasing simply because more solver passes run.
      for (let axis = 0; axis < 3; axis++) {
        const offset = axis === 0 ? Math.sign(rest[i]) * amplitude * envelope
          : axis === 1 ? -0.003 * envelope : 0.012 * envelope;
        const target = rest[i + axis] + offset;
        const error = pos[i + axis] - target;
        const correction = (-error - alpha * this.grabLambda[i + axis]) / (1 + alpha);
        this.grabLambda[i + axis] += correction;
        pos[i + axis] += correction;
      }
    }
  }

  private limitStrain(): void {
    // A cloth safety inequality, not a measured material curve. It prevents
    // an external grip or an unusually slow frame from overextending a cage edge.
    const p = this.positions;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < this.constraints.length; j++) {
        const c = this.constraints[pass === 0 ? j : this.constraints.length - 1 - j];
        if (!c.strain) continue;
        const a = c.a * 3, b = c.b * 3;
        const dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2];
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const target = clamp(length, c.length * 0.85, c.length * 1.15);
        const error = length - target;
        if (Math.abs(error) < 1e-9 || length < 1e-10) continue;
        const wa = this.inverseMass[c.a], wb = this.inverseMass[c.b];
        if (wa + wb === 0) continue;
        const correction = error / ((wa + wb) * length);
        p[a] += wa * correction * dx; p[a + 1] += wa * correction * dy; p[a + 2] += wa * correction * dz;
        p[b] -= wb * correction * dx; p[b + 1] -= wb * correction * dy; p[b + 2] -= wb * correction * dz;
      }
    }
  }

  private protectDepth(): void {
    const p = this.positions;
    // Paired layer inequalities stop the front panel passing through the back panel.
    // Full triangle self-collision is deliberately outside this small illustrative cage.
    for (const layer of this.layers) {
      const fi = layer.front * 3 + 2, bi = layer.back * 3 + 2;
      const error = layer.minimum - (p[fi] - p[bi]);
      if (error <= 0) continue;
      const wf = this.inverseMass[layer.front], wb = this.inverseMass[layer.back];
      const weight = wf + wb;
      if (weight === 0) continue;
      p[fi] += error * wf / weight;
      p[bi] -= error * wb / weight;
    }
  }

  private samplePatch(patch: Patch, x: number, y: number, z: number): Vec3 {
    const u = clamp((x - patch.x0) / (patch.x1 - patch.x0)) * (patch.columns - 1);
    const v = clamp((y - patch.y0) / (patch.y1 - patch.y0)) * (patch.rows - 1);
    const col = Math.min(patch.columns - 2, Math.floor(u));
    const row = Math.min(patch.rows - 2, Math.floor(v));
    const fu = u - col, fv = v - row;
    const base = row * patch.columns + col;
    const depth = patch === this.body ? 0.058 : 0.029;
    const frontWeight = smoothstep(-depth, depth, z);
    const result: Vec3 = [0, 0, 0];
    for (let side = 0; side < 2; side++) {
      const layerWeight = side === 0 ? frontWeight : 1 - frontWeight;
      if (layerWeight === 0) continue;
      const grid = side === 0 ? patch.front : patch.back;
      for (let corner = 0; corner < 4; corner++) {
        const isRight = corner & 1;
        const isTop = corner >= 2;
        const index = base + isRight + (isTop ? patch.columns : 0);
        const i = grid[index] * 3;
        const weight = (isRight ? fu : 1 - fu) * (isTop ? fv : 1 - fv) * layerWeight;
        for (let axis = 0; axis < 3; axis++) {
          const position = this.displayPrevious[i + axis]
            + (this.positions[i + axis] - this.displayPrevious[i + axis]) * this.interpolation;
          result[axis] += (position - this.rest[i + axis]) * weight;
        }
      }
    }
    return result;
  }

  sampleDisplacement(x: number, y: number, z: number): Vec3 {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return [0, 0, 0];
    const body = this.samplePatch(this.body, x, y, z);
    const lateral = Math.abs(x);
    const underarm = smoothstep(-0.29, -0.19, y);
    const outsideTorso = smoothstep(0.246, 0.30, lateral);
    // The sleeve field is restricted to the upper torso overlap. A bottom hem
    // at the torso's outer x edge must not inherit a hanging sleeve's motion.
    const lowerGate = underarm + (1 - underarm) * outsideTorso;
    const sleeveWeight = smoothstep(0.164, 0.246, lateral)
      * (1 - smoothstep(0.238, 0.30, y)) * lowerGate;
    if (sleeveWeight > 0) {
      const sleeve = this.samplePatch(x < 0 ? this.left : this.right, x, y, z);
      for (let axis = 0; axis < 3; axis++) body[axis] += (sleeve[axis] - body[axis]) * sleeveWeight;
    }
    // Collar and shoulder trims share the same pinned field instead of floating off the cloth.
    const free = 1 - smoothstep(0.245, 0.318, y);
    body[0] *= free; body[1] *= free; body[2] *= free;
    return body;
  }

  diagnostics(): { particles: number; constraints: number; maxStrain: number; kineticEnergy: number; steps: number } {
    let maxStrain = 0, kineticEnergy = 0;
    for (const constraint of this.constraints) {
      if (!constraint.strain) continue;
      const a = constraint.a * 3, b = constraint.b * 3;
      const length = Math.hypot(this.positions[b] - this.positions[a], this.positions[b + 1] - this.positions[a + 1], this.positions[b + 2] - this.positions[a + 2]);
      maxStrain = Math.max(maxStrain, Math.abs(length / constraint.length - 1));
    }
    for (let i = 0; i < this.inverseMass.length; i++) {
      if (!this.inverseMass[i]) continue;
      const index = i * 3;
      kineticEnergy += 0.5 * (this.velocity[index] ** 2 + this.velocity[index + 1] ** 2 + this.velocity[index + 2] ** 2);
    }
    return { particles: this.inverseMass.length, constraints: this.constraints.length, maxStrain, kineticEnergy, steps: this.stepCount };
  }
}
