import { describe, expect, it } from 'vitest';
import { clampProgress, dampingFactor, fullViewDistance, garmentPose, normaliseStep, pullEnvelope, smoothProgress } from '../src/cloth/choreography';

describe('guided garment choreography', () => {
  it('keeps rapid Next and malformed progress inside finite valid poses', () => {
    for (const step of [undefined, -12, 0, 1, 2, 3, 4, 5, 500, NaN]) {
      for (const progress of [-2, 0, .4, 1, 12, NaN, Infinity]) {
        const pose = garmentPose(step, progress, .75);
        expect([...pose.camera, ...pose.target, pose.yaw, pose.progress].every(Number.isFinite)).toBe(true);
        expect(pose.progress).toBeGreaterThanOrEqual(0);
        expect(pose.progress).toBeLessThanOrEqual(1);
      }
    }
    expect(normaliseStep(5.9)).toBe(5);
    expect(normaliseStep(undefined)).toBeUndefined();
  });
  it('turns to the actual back with an eased full half turn', () => {
    expect(garmentPose(1, 0).yaw).toBe(0);
    expect(garmentPose(1, 1).yaw).toBe(Math.PI);
    expect(garmentPose(1, .47).yaw).toBeCloseTo(Math.PI / 2);
    expect(smoothProgress(.01)).toBeLessThan(.01);
  });
  it('targets the collar and cuff geometry rather than enlarging the whole shirt', () => {
    const label = garmentPose(2), cuff = garmentPose(5), full = garmentPose(0);
    expect(label.target[1]).toBeGreaterThan(.25);
    expect(cuff.target[0]).toBeGreaterThan(.35);
    expect(cuff.target[1]).toBeLessThan(-.12);
    expect(label.camera[2]).toBeLessThan(full.camera[2]);
    expect(cuff.camera[2]).toBeLessThan(full.camera[2]);
  });
  it('frames full sleeves on phones and limits extreme aspect ratios', () => {
    expect(fullViewDistance(.72)).toBeGreaterThan(fullViewDistance(1.4));
    expect(fullViewDistance(.0001)).toBeLessThanOrEqual(4.8);
    expect(fullViewDistance(NaN)).toBe(fullViewDistance(1));
    for (const aspect of [.72, 1, 1.6]) {
      const visibleHalfWidth = fullViewDistance(aspect) * Math.tan(32 * Math.PI / 360) * aspect;
      expect(visibleHalfWidth).toBeGreaterThan(.465);
    }
  });
  it('assigns real drape and localized pull solver motions with a release interval', () => {
    expect(garmentPose(3).motion).toBe('sway');
    expect(garmentPose(4).motion).toBe('pull');
    expect(pullEnvelope(0)).toBe(0);
    expect(pullEnvelope(.5)).toBe(1);
    expect(pullEnvelope(.7)).toBeGreaterThan(0);
    expect(pullEnvelope(1)).toBe(0);
  });
  it('resets deterministically and damps without background catch-up jumps', () => {
    expect(garmentPose(1, 0)).toEqual(garmentPose(1, 0));
    expect(dampingFactor(5)).toBe(dampingFactor(.05));
    expect(dampingFactor(-1)).toBe(0);
    expect(dampingFactor(NaN)).toBe(0);
    expect(clampProgress(Infinity)).toBe(0);
  });
});
