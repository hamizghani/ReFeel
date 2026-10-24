import { describe, expect, it } from 'vitest';
import { CATALOG, REFERENCE, initialState, type Listing } from '../src/domain';
import { FEEL_DEFAULTS, findFeelMatches, relativeFeelRows, relativeFeelSummary, describeQuality, measurementDifference } from '../src/feel';

const reference = { ...REFERENCE, feelDescription: { shape: 'balanced', give: 'little', texture: 'smooth', softness: 'somewhat-soft' }, feelDescriptionSource: 'owner' } as Listing;
const cloud = { ...CATALOG[0], feelDescription: { shape: 'crisp', give: 'little', texture: 'smooth', softness: 'somewhat-soft' }, feelDescriptionSource: 'prepared' } as Listing;

describe('ordinary-language relative feel', () => {
  it('compares candidate against the familiar piece with all four readable dimensions', () => {
    const rows = relativeFeelRows(reference, cloud);
    expect(rows.map(r => r.label)).toEqual(['Shape', 'Give', 'Texture', 'Softness']);
    expect(rows.find(r => r.key === 'shape')?.relation).toBe('more');
    expect(rows.find(r => r.key === 'shape')?.summary).toBe('A little more structured');
    expect(rows.find(r => r.key === 'give')?.summary).toBe('Similar give');
    expect(rows.find(r => r.key === 'texture')?.summary).toBe('Similar-looking texture');
    expect(rows.find(r => r.key === 'softness')?.summary).toBe('Similar described softness');
    expect(relativeFeelSummary(reference, cloud)).toContain('with a crisper shape');
  });
  it('uses a stronger phrase only for the two-bucket difference and reverses direction correctly', () => {
    const relaxed = { ...reference, feelDescription: { ...reference.feelDescription!, shape: 'relaxed' as const } };
    expect(relativeFeelRows(relaxed, cloud)[0].summary).toBe('More structured');
    expect(relativeFeelRows(cloud, relaxed)[0].summary).toBe('More relaxed');
    expect(relativeFeelRows(cloud, reference)[0].summary).toBe('A little more relaxed');
  });
  it('requires known descriptions and named sources on both sides for every relative claim', () => {
    const missingSource = { ...reference, feelDescriptionSource: undefined };
    expect(relativeFeelRows(missingSource, cloud).every(r => r.relation === 'unknown')).toBe(true);
    const noSoftness = { ...reference, feelDescription: { ...reference.feelDescription!, softness: 'unknown' as const } };
    expect(relativeFeelRows(noSoftness, cloud).find(r => r.key === 'softness')?.relation).toBe('unknown');
    expect(describeQuality(noSoftness, 'softness').text).toBe('Not described');
  });
  it('attributes softness and give to descriptions without claiming touch verification or measured percentages', () => {
    const softer = { ...cloud, feelDescription: { ...cloud.feelDescription!, softness: 'very-soft' as const, give: 'plenty' as const } };
    const rows = relativeFeelRows(reference, softer);
    expect(rows.find(r => r.key === 'softness')?.summary).toBe('Described as a little softer');
    expect(rows.find(r => r.key === 'give')?.summary).toBe('More give');
    expect(rows.map(r => r.summary).join(' ')).not.toMatch(/%|verified|measured|recovery/i);
    expect(rows.find(r => r.key === 'softness')?.candidate.source).toBe('Prepared description');
  });
  it('does not turn a soft query into a relaxed or draping preference', () => {
    const state = initialState();
    const knownSoft = { ...cloud, id: 'local-soft', templateId: 'cloud-poplin', feelDescription: { ...cloud.feelDescription!, shape: 'crisp' as const, softness: 'very-soft' as const } };
    const relaxedUnknown = { ...cloud, id: 'local-relaxed', templateId: 'cloud-poplin', feelDescription: { ...cloud.feelDescription!, shape: 'relaxed' as const, softness: 'unknown' as const } };
    state.localListings = [knownSoft, relaxedUnknown];
    const result = findFeelMatches(state, reference, { ...FEEL_DEFAULTS, query: 'soft', likes: [], goal: 'softness' }, { category: 'All', size: 'All' }, 20);
    expect(result.some(r => r.listing.id === 'local-relaxed')).toBe(false);
    expect(result[0].listing.feelDescription?.softness).toBe('very-soft');
    expect(result.some(r => r.listing.id === 'local-soft')).toBe(true);
  });
  it('abstains from softer-than-your-piece suggestions if its softness is unknown', () => {
    const unknown = { ...reference, feelDescription: { ...reference.feelDescription!, softness: 'unknown' as const } };
    expect(findFeelMatches(initialState(), unknown, { ...FEEL_DEFAULTS, query: 'softer', likes: [] }, { category: 'All', size: 'All' })).toEqual([]);
  });
  it('does not return equal or less-soft garments for an explicitly softer-than-reference search', () => {
    const state = initialState();
    expect(findFeelMatches(state, reference, { ...FEEL_DEFAULTS, query: 'softer than my blouse', likes: [] }, { category: 'All', size: 'All' })).toEqual([]);
    const softer = { ...cloud, id: 'local-softer', templateId: 'cloud-poplin', feelDescription: { ...cloud.feelDescription!, softness: 'very-soft' as const } };
    state.localListings = [softer];
    expect(findFeelMatches(state, reference, { ...FEEL_DEFAULTS, query: 'softer than my blouse', likes: [] }, { category: 'All', size: 'All' }).map(result => result.listing.id)).toEqual(['local-softer']);
  });
  it('preserves exact flat measurement directions beside the qualitative comparisons', () => {
    expect(measurementDifference(REFERENCE, CATALOG[0], 'chest').text).toBe('1 cm wider');
    expect(measurementDifference(REFERENCE, CATALOG[0], 'length').text).toBe('1 cm longer');
    expect(measurementDifference(REFERENCE, CATALOG[3], 'shoulder').text).toBe('Not recorded');
  });
});
