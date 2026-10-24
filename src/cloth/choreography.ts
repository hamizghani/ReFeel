import type { ClothMotion } from './physics';

export type Point3 = readonly [number, number, number];
export interface GarmentPose {
  yaw: number;
  camera: Point3;
  target: Point3;
  motion: ClothMotion;
  progress: number;
  focus: 'garment' | 'back' | 'label' | 'hang' | 'pull' | 'cuff';
}

export function clampProgress(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

/** Zero slope at both ends keeps the flip from jolting into its next pose. */
export function smoothProgress(value: number): number {
  const p = clampProgress(value);
  return p * p * (3 - 2 * p);
}

export function normaliseStep(step?: number): number | undefined {
  if (step === undefined) return undefined;
  return Number.isFinite(step) ? Math.min(5, Math.max(0, Math.floor(step))) : 0;
}

/** Camera distances preserve the full sleeve span even in a narrow phone frame. */
export function fullViewDistance(aspect = 1): number {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  return Math.min(4.8, Math.max(1.85, 1.88 / Math.max(.4, safeAspect)));
}

export function garmentPose(step?: number, progress = 1, aspect = 1): GarmentPose {
  const stage = normaliseStep(step);
  const p = clampProgress(progress);
  const distance = fullViewDistance(aspect);
  const base: GarmentPose = { yaw: -.065, camera: [0, .035, distance], target: [0, -.005, 0], motion: 'rest', progress: p, focus: 'garment' };
  if (stage === undefined || stage === 0) return base;
  if (stage === 1) return { ...base, yaw: Math.PI * smoothProgress((p - .04) / .86), focus: 'back' };
  if (stage === 2) return { ...base, yaw: 0, camera: [0, .49, .60], target: [0, .295, .012], focus: 'label' };
  if (stage === 3) return { ...base, yaw: -.08, motion: 'sway', focus: 'hang' };
  if (stage === 4) return { ...base, yaw: -.04, camera: [.065, -.045, Math.max(1.4, 1.55 / Math.max(.4, aspect))], target: [.065, -.085, 0], motion: 'pull', focus: 'pull' };
  return { ...base, yaw: 0, camera: [.57, -.08, .39], target: [.398, -.176, .035], focus: 'cuff' };
}

/** Exponential damping is frame-rate independent and safe after a background tab. */
export function dampingFactor(deltaSeconds: number, rate = 7.5): number {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0;
  return 1 - Math.exp(-Math.min(deltaSeconds, .05) * rate);
}

export function pullEnvelope(progress: number): number {
  const p = clampProgress(progress);
  if (p < .15 || p > .83) return 0;
  if (p < .42) return smoothProgress((p - .15) / .27);
  if (p < .6) return 1;
  return 1 - smoothProgress((p - .6) / .23);
}
