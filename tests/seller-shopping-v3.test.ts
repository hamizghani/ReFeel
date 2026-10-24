import { describe, expect, it } from 'vitest';
import { PROPERTIES, initialState, transition } from '../src/domain';
import type { Action, AppState, Availability } from '../src/domain';
import { getSeller, sellerHref, sellerId } from '../src/sellers';

function publishLocal(state: AppState, templateId: string): AppState {
  state = transition(state, { type: 'LOCAL_DRAFT_CREATE', templateId });
  for (let step = 0; step < 6; step++) {
    state = transition(state, { type: 'RECORDING_COMPLETE', step });
    state = transition(state, { type: 'RECORDING_NEXT' });
  }
  for (const property of PROPERTIES) {
    state = transition(state, { type: 'DECIDE', property, status: 'confirmed' });
  }
  return transition(state, { type: 'PUBLISH' });
}

const knownSellers = [
  ['Maya', 'maya', 'cloud-poplin'],
  ['June', 'june', 'moss-knit'],
  ['Ari', 'ari', 'airloom-linen'],
  ['Elena', 'elena', 'petal-tee'],
  ['Noor', 'noor', 'sunday-denim'],
  ['Robin', 'robin', 'ink-trousers'],
  ['Lina', 'lina', 'apricot-slip'],
  ['Sam', 'sam', 'tide-shirt'],
  ['Kit', 'kit', 'oat-vest'],
  ['Tessa', 'tessa', 'lilac-wrap'],
  ['Bea', 'bea', 'rose-jacket'],
  ['Nell', 'nell', 'sage-skirt'],
] as const;

describe('seller shopping profiles', () => {
  it('normalizes names into URI-safe seller routes', () => {
    expect(sellerId('  Maya  ')).toBe('maya');
    expect(sellerHref('  Maya  ')).toBe('/seller/maya');
    expect(sellerId('  JUNE & Co / É  ')).toBe('june%20%26%20co%20%2F%20%C3%A9');
    expect(sellerHref('  JUNE & Co / É  ')).toBe('/seller/june%20%26%20co%20%2F%20%C3%A9');
  });

  it.each(knownSellers)('routes %s to its public inventory', (name, id, listingId) => {
    expect(sellerHref(name)).toBe(`/seller/${id}`);
    const profile = getSeller(initialState(), id);
    expect(profile).toMatchObject({ id, name });
    expect(profile?.listings.map(listing => listing.id)).toEqual([listingId]);
  });

  const unavailableCases: { status: Availability; actions: Action[] }[] = [
    { status: 'paused', actions: [{ type: 'LISTING_PAUSE', id: 'cloud-poplin' }] },
    { status: 'removed', actions: [{ type: 'LISTING_REMOVE', id: 'cloud-poplin' }] },
    {
      status: 'reserved',
      actions: [{ type: 'BUY_NOW', id: 'cloud-poplin' }, { type: 'CHECKOUT', payment: 'success' }],
    },
    {
      status: 'sold',
      actions: [
        { type: 'BUY_NOW', id: 'cloud-poplin' },
        { type: 'CHECKOUT', payment: 'success' },
        { type: 'ORDER_ADVANCE', id: 'FAM-0001' },
      ],
    },
  ];

  it.each(unavailableCases)('retains Maya’s profile when her only garment is $status', ({ status, actions }) => {
    const state = actions.reduce(transition, initialState());
    expect(state.availability['cloud-poplin']).toBe(status);
    expect(getSeller(state, 'maya')).toEqual({ id: 'maya', name: 'Maya', listings: [] });
  });

  it('groups published local garments under You and keeps the profile after their removal', () => {
    let state = publishLocal(initialState(), 'cloud-poplin');
    const firstId = state.activeDraftId;
    state = publishLocal(state, 'moss-knit');
    const secondId = state.activeDraftId;

    expect(sellerHref('You')).toBe('/seller/you');
    expect(getSeller(state, 'you')).toMatchObject({ id: 'you', name: 'You' });
    expect(getSeller(state, 'you')?.listings.map(listing => listing.id)).toEqual([firstId, secondId]);

    state = transition(state, { type: 'LISTING_PAUSE', id: firstId });
    expect(getSeller(state, 'you')?.listings.map(listing => listing.id)).toEqual([secondId]);
    state = transition(state, { type: 'LISTING_REMOVE', id: firstId });
    state = transition(state, { type: 'LISTING_REMOVE', id: secondId });
    expect(getSeller(state, 'you')).toEqual({ id: 'you', name: 'You', listings: [] });
  });

  it('excludes private references and unpublished drafts from seller identity and inventory', () => {
    let state = transition(initialState(), { type: 'REFERENCE_CREATE', templateId: 'moss-knit' });
    state = transition(state, { type: 'LOCAL_DRAFT_CREATE', templateId: 'petal-tee' });
    const unpublishedId = state.activeDraftId;
    expect(getSeller(state, 'you')).toBeUndefined();
    expect(getSeller(state, sellerId('You · private reference'))).toBeUndefined();

    state = publishLocal(state, 'airloom-linen');
    const publicId = state.activeDraftId;
    state = transition(state, { type: 'LOCAL_DRAFT_CREATE', templateId: 'tide-shirt' });
    const publicInventory = getSeller(state, 'you')?.listings.map(listing => listing.id);
    expect(publicInventory).toEqual([publicId]);
    expect(publicInventory).not.toContain(unpublishedId);
    expect(publicInventory).not.toContain(state.activeDraftId);
    for (const reference of state.privateReferences) {
      expect(publicInventory).not.toContain(reference.id);
    }
    expect(getSeller(state, sellerId('You · private reference'))).toBeUndefined();
  });

  it('returns no profile for an unknown seller identifier', () => {
    expect(getSeller(initialState(), 'unknown-seller')).toBeUndefined();
  });
});

describe('adding seller inventory to the bag', () => {
  it('keeps one copy of each garment when add is repeated', () => {
    let state = initialState();
    for (const id of ['cloud-poplin', 'cloud-poplin', 'moss-knit', 'moss-knit']) {
      state = transition(state, { type: 'BAG_ADD', id });
    }
    expect(state.bag).toEqual(['cloud-poplin', 'moss-knit']);
  });

  it('rejects a garment after checkout reserves it and after its order confirms it sold', () => {
    let state = transition(initialState(), { type: 'BAG_ADD', id: 'cloud-poplin' });
    state = transition(state, { type: 'CHECKOUT', payment: 'success' });
    expect(state.availability['cloud-poplin']).toBe('reserved');
    expect(state.bag).toEqual([]);
    expect(transition(state, { type: 'BAG_ADD', id: 'cloud-poplin' })).toBe(state);

    state = transition(state, { type: 'ORDER_ADVANCE', id: state.orders[0].id });
    expect(state.availability['cloud-poplin']).toBe('sold');
    expect(transition(state, { type: 'BAG_ADD', id: 'cloud-poplin' })).toBe(state);
    expect(state.bag).toEqual([]);
  });
});
