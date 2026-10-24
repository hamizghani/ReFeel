import { describe, expect, it } from 'vitest';
import { GarmentPhysics, type ClothMotion } from '../src/cloth/physics';

const norm = (a: readonly number[]) => Math.hypot(...a);
const probes: readonly (readonly [number, number, number])[] = [
  [-0.22, -0.3, 0.07], [0.17, -0.15, 0.07], [0, -0.3, -0.07],
  [-0.39, -0.12, 0.04], [0.39, -0.12, -0.04], [0, 0.33, 0.05],
];

function run(solver: GarmentPhysics, seconds: number, hz: number, motion: ClothMotion) {
  const frames = Math.round(seconds * hz);
  for (let i = 0; i < frames; i++) solver.advance(1 / hz, motion, Math.min(1, (i + 1) / (6 * hz)));
}

describe('garment XPBD physics', () => {
  it('creates an actual connected cloth cage, not one moving object', () => {
    const solver = new GarmentPhysics('cloud');
    const initial = solver.diagnostics();
    expect(initial.particles).toBeGreaterThanOrEqual(400);
    expect(initial.particles).toBeLessThanOrEqual(850);
    expect(initial.constraints).toBeGreaterThan(initial.particles * 3);
    expect(initial.steps).toBe(0);
    expect(solver.sampleDisplacement(0.17, -0.15, 0.07)).toEqual([0, 0, 0]);
    run(solver, 2, 60, 'sway');
    const a = solver.sampleDisplacement(0.17, -0.15, 0.07);
    const b = solver.sampleDisplacement(0, 0.33, 0.05);
    expect(norm(a)).toBeGreaterThan(0.001);
    expect(norm(a.map((v, i) => v - b[i]))).toBeGreaterThan(0.001);
  });

  it('keeps the supported shoulders and collar pinned', () => {
    const solver = new GarmentPhysics('reference');
    run(solver, 6, 60, 'pull');
    for (const x of [-0.22, -0.12, 0, 0.12, 0.22]) {
      expect(norm(solver.sampleDisplacement(x, 0.33, 0.07))).toBeLessThan(1e-8);
    }
  });

  it('has equivalent fixed-step trajectories at 30, 60 and 120 display Hz', () => {
    const solvers = [30, 60, 120].map(hz => {
      const solver = new GarmentPhysics('cloud');
      run(solver, 6, hz, 'pull');
      return solver;
    });
    for (const probe of probes) {
      const base = solvers[2].sampleDisplacement(...probe);
      for (const solver of solvers.slice(0, 2)) {
        const difference = solver.sampleDisplacement(...probe).map((v, i) => v - base[i]);
        expect(norm(difference)).toBeLessThan(0.0015);
      }
    }
    expect(solvers.map(s => s.diagnostics().steps)).toEqual([720, 720, 720]);
  }, 15000);

  it('responds to a localized pull and dissipates its residual energy after release', () => {
    const pulled = new GarmentPhysics('cloud');
    const idle = new GarmentPhysics('cloud');
    for (let i = 0; i < 180; i++) {
      pulled.advance(1 / 60, 'pull', (i + 1) / 360);
      idle.advance(1 / 60, 'rest', (i + 1) / 360);
    }
    const pullDelta = pulled.sampleDisplacement(0.17, -0.15, 0.07);
    const restDelta = idle.sampleDisplacement(0.17, -0.15, 0.07);
    expect(pullDelta[0] - restDelta[0]).toBeGreaterThan(0.003);
    const shoulder = pulled.sampleDisplacement(0.17, 0.32, 0.07);
    expect(norm(shoulder)).toBeLessThan(0.0001);
    for (let i = 180; i < 240; i++) pulled.advance(1 / 60, 'pull', (i + 1) / 360);
    const releaseEnergy = pulled.diagnostics().kineticEnergy;
    run(pulled, 12, 60, 'rest');
    expect(pulled.diagnostics().kineticEnergy).toBeLessThan(releaseEnergy * 0.2 + 0.0001);
    expect(pulled.diagnostics().maxStrain).toBeLessThan(0.2);
  }, 15000);

  it('keeps gravity, motion and both variants finite for 30 seconds', () => {
    for (const variant of ['cloud', 'reference'] as const) {
      const solver = new GarmentPhysics(variant);
      for (let i = 0; i < 1800; i++) {
        const motion = (['hang', 'sway', 'pull', 'rest'] as const)[Math.floor(i / 450)];
        solver.advance(1 / 60, motion, (i % 450) / 450);
      }
      for (const probe of probes) {
        const displacement = solver.sampleDisplacement(...probe);
        expect(displacement.every(Number.isFinite)).toBe(true);
        expect(norm(displacement)).toBeLessThan(0.35);
      }
      const metrics = solver.diagnostics();
      expect(Number.isFinite(metrics.kineticEnergy)).toBe(true);
      expect(metrics.maxStrain).toBeLessThan(0.2);
    }
  }, 20000);

  it('limits transient strain during the grip, hold and release, not only after settling', () => {
    for (const variant of ['cloud', 'reference'] as const) {
      const solver = new GarmentPhysics(variant);
      for (let frame = 0; frame < 360; frame++) {
        solver.advance(1 / 60, 'pull', (frame + 1) / 360);
        expect(solver.diagnostics().maxStrain).toBeLessThan(0.20);
      }
    }
  }, 10000);

  it('bounds catch-up and rejects invalid frame deltas without poisoning its state', () => {
    const solver = new GarmentPhysics('cloud');
    solver.advance(20, 'pull', 0.5);
    expect(solver.diagnostics().steps).toBeLessThanOrEqual(12);
    const before = solver.diagnostics().steps;
    solver.advance(Number.NaN, 'sway', Number.NaN);
    solver.advance(-2, 'hang', 0.5);
    expect(solver.diagnostics().steps).toBe(before);
    expect(probes.flatMap(probe => solver.sampleDisplacement(...probe)).every(Number.isFinite)).toBe(true);
  });

  it('samples a continuous body/sleeve field so buttons and seams follow the fabric', () => {
    const solver = new GarmentPhysics('reference');
    run(solver, 3, 60, 'sway');
    for (let x = 0.158; x < 0.253; x += 0.002) {
      const a = solver.sampleDisplacement(x, 0.03, 0.05);
      const b = solver.sampleDisplacement(x + 0.002, 0.03, 0.05);
      expect(norm(a.map((v, i) => v - b[i]))).toBeLessThan(0.01);
    }
    const cloth = solver.sampleDisplacement(0, -0.13, 0.072);
    const button = solver.sampleDisplacement(0, -0.13, 0.079);
    expect(norm(cloth.map((v, i) => v - button[i]))).toBeLessThan(0.005);
  });

  it('keeps the bottom torso hem on the torso field while sleeves can drape farther', () => {
    const solver = new GarmentPhysics('cloud');
    run(solver, 3, 60, 'hang');
    expect(norm(solver.sampleDisplacement(0.243, -0.33, 0.06))).toBeLessThan(0.025);
    expect(norm(solver.sampleDisplacement(0.40, -0.12, 0.04))).toBeGreaterThan(0.04);
  });

  it('reset removes the prior take’s displacement, elapsed time and energy', () => {
    const solver = new GarmentPhysics('cloud');
    run(solver, 3, 60, 'pull');
    solver.reset();
    for (const probe of probes) expect(solver.sampleDisplacement(...probe)).toEqual([0, 0, 0]);
    expect(solver.diagnostics().steps).toBe(0);
    expect(solver.diagnostics().kineticEnergy).toBe(0);
  });
});
