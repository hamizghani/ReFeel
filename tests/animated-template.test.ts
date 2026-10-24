import { describe, expect, it } from 'vitest';
import { animatedVariant } from '../src/cloth/presentation';

describe('one modeled garment family', () => {
  it('uses the listing and reference variants for their matching templates', () => {
    expect(animatedVariant({id:'cloud-poplin'})).toBe('cloud');
    expect(animatedVariant({id:'my-blue-blouse'})).toBe('reference');
    expect(animatedVariant({id:'reference-003',templateId:'my-blue-blouse'})).toBe('reference');
  });
  it('keeps published template copies aligned and other garments photographic', () => {
    expect(animatedVariant({id:'local-003',templateId:'cloud-poplin'})).toBe('cloud');
    expect(animatedVariant({id:'petal-tee'})).toBeUndefined();
    expect(animatedVariant({id:'cloud-poplin',templateId:'petal-tee'})).toBeUndefined();
  });
});
