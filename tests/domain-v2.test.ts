import { describe, expect, it } from 'vitest';
import { initialState, transition, getListing, allListings, rankMatches, REFERENCE, PROPERTIES, sanitizeStoredState, checkoutItems } from '../src/domain';
const act = (state: any, action: any): any => transition(state, action);
function completeSeller(state: any) {
    for (let step = 0; step < 6; step++) {
        state = act(state, { type: 'RECORDING_COMPLETE', step });
        state = act(state, { type: 'RECORDING_NEXT' });
    }
    for (const property of PROPERTIES)
        state = act(state, { type: 'DECIDE', property, status: 'confirmed' });
    return state;
}
describe('photographic local marketplace domain', () => {
    it('creates multiple private drafts without adding them to public search', () => {
        let state: any = initialState();
        state = act(state, { type: 'LOCAL_DRAFT_CREATE', templateId: 'moss-knit' });
        expect(state.activeDraftId).toBe('local-001');
        expect(state.localDrafts).toHaveLength(1);
        expect(allListings(state)).toHaveLength(12);
        expect(getListing(state, 'local-001')).toBeUndefined();
        state = act(state, { type: 'LOCAL_DRAFT_CREATE', templateId: 'airloom-linen' });
        expect(state.localDrafts.map((d: any) => d.id)).toEqual(['local-001', 'local-002']);
    });
    it('publishes only a completed walkthrough and reviewed descriptions with an immutable public snapshot', () => {
        let state: any = act(initialState(), { type: 'LOCAL_DRAFT_CREATE', templateId: 'moss-knit' });
        expect(act(state, { type: 'PUBLISH' })).toBe(state);
        state = completeSeller(state);
        state = act(state, { type: 'DRAFT', draft: { name: 'My everyday cardigan', price: 49 } });
        state = act(state, { type: 'PUBLISH' });
        expect(getListing(state, 'local-001')?.name).toBe('My everyday cardigan');
        expect(allListings(state)).toHaveLength(13);
        const publicJson = JSON.stringify(getListing(state, 'local-001'));
        state = act(state, { type: 'DRAFT', draft: { name: 'Changed only in draft', price: 89 } });
        expect(JSON.stringify(getListing(state, 'local-001'))).toBe(publicJson);
        state = act(state, { type: 'PUBLISH' });
        expect(getListing(state, 'local-001')?.price).toBe(89);
    });
    it('keeps unfinished and completed draft progress separate when switching', () => {
        let state: any = act(initialState(), { type: 'LOCAL_DRAFT_CREATE', templateId: 'moss-knit' });
        state = act(state, { type: 'RECORDING_COMPLETE', step: 0 });
        state = act(state, { type: 'RECORDING_NEXT' });
        state = act(state, { type: 'LOCAL_DRAFT_CREATE', templateId: 'airloom-linen' });
        expect(state.captureStage).toBe(0);
        state = act(state, { type: 'LOCAL_DRAFT_SELECT', id: 'local-001' });
        expect(state.captureStage).toBe(1);
        expect(state.capturedSteps).toEqual([0]);
    });
    it('requires a saved walkthrough step before advancing, and redo clears affected review only', () => {
        let state: any = initialState();
        expect(act(state, { type: 'RECORDING_NEXT' })).toBe(state);
        expect(act(state, { type: 'RECORDING_COMPLETE', step: 3 })).toBe(state);
        state = completeSeller(state);
        expect(state.captureComplete).toBe(true);
        state = act(state, { type: 'RECORDING_RETRY', step: 4 });
        expect(state.capturedSteps).not.toContain(4);
        expect(state.captureComplete).toBe(false);
        expect(state.decisions.Stretch).toBeUndefined();
        expect(state.decisions.Surface.status).toBe('confirmed');
    });
    it('dynamic published inventory participates in saving checkout filters and persistence', () => {
        let state: any = act(initialState(), { type: 'LOCAL_DRAFT_CREATE', templateId: 'moss-knit' });
        state = act(completeSeller(state), { type: 'PUBLISH' });
        state = act(state, { type: 'SAVE', id: 'local-001' });
        state = act(state, { type: 'BUY_NOW', id: 'local-001' });
        expect(checkoutItems(state)).toEqual(['local-001']);
        state = act(state, { type: 'CHECKOUT', payment: 'success' });
        expect(state.orders[0].items).toEqual(['local-001']);
        expect(state.availability['local-001']).toBe('reserved');
        const restored = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
        expect(restored.saved).toContain('local-001');
        expect(restored.orders[0].itemSnapshots?.[0].price).toBe(46);
        expect(rankMatches(restored, REFERENCE, 'Drape', { category: 'Knitwear' }).some(x => x.listing.id === 'local-001')).toBe(false);
    });
    it('can pause remove and resume owned dynamic inventory but not order-bound stock', () => {
        let state: any = act(initialState(), { type: 'LOCAL_DRAFT_CREATE' });
        state = act(completeSeller(state), { type: 'PUBLISH' });
        state = act(state, { type: 'LISTING_PAUSE', id: 'local-001' });
        expect(state.availability['local-001']).toBe('paused');
        state = act(state, { type: 'LISTING_REMOVE', id: 'local-001' });
        expect(getListing(state, 'local-001')).toBeUndefined();
        state = act(state, { type: 'LISTING_RESUME', id: 'local-001' });
        state = act(state, { type: 'BUY_NOW', id: 'local-001' });
        state = act(state, { type: 'CHECKOUT', payment: 'success' });
        expect(act(state, { type: 'LISTING_REMOVE', id: 'local-001' })).toBe(state);
    });
    it('creates buyer walkthroughs while photographs and descriptions remain independent of progress', () => {
        let state: any = act(initialState(), { type: 'REFERENCE_CREATE', templateId: 'my-blue-blouse' });
        expect(state.selectedReference).toBe('private-001');
        expect(state.privateReferences).toHaveLength(2);
        const before = JSON.stringify(getListing(state, 'private-001')?.evidence);
        expect(getListing(state, 'private-001')?.evidence.find(e => e.property === 'Drape')?.support).toBe('supported');
        state = act(state, { type: 'REFERENCE_RECORDING_COMPLETE', step: 0 });
        const ref = getListing(state, 'private-001')!;
        expect(ref.evidence.find(e => e.property === 'Drape')?.support).not.toBe('unavailable');
        expect(JSON.stringify(ref.evidence)).toBe(before);
        expect(ref.evidence.find(e => e.property === 'Stretch')?.support).toBe('unavailable');
        expect(act(state, { type: 'REFERENCE_FINISH' })).toBe(state);
    });
    it('deleting a selected private reference safely selects another and does not alter catalogue', () => {
        let state: any = act(initialState(), { type: 'REFERENCE_CREATE', templateId: 'moss-knit' });
        state = act(state, { type: 'REFERENCE_RENAME', name: 'My soft layer' });
        expect(getListing(state, 'private-001')?.name).toBe('My soft layer');
        state = act(state, { type: 'REFERENCE_DELETE', id: 'private-001' });
        expect(getListing(state, 'private-001')).toBeUndefined();
        expect(state.selectedReference).toBe(REFERENCE.id);
        expect(allListings(state)).toHaveLength(12);
        expect(act(state, { type: 'REFERENCE', id: 'private-001' })).toBe(state);
    });
    it('saves a buyer reference after all six guided walkthrough steps', () => {
        let state: any = act(initialState(), { type: 'REFERENCE_CREATE' });
        for (let step = 0; step < 6; step++) {
            state = act(state, { type: 'REFERENCE_RECORDING_COMPLETE', step });
            state = act(state, { type: 'REFERENCE_RECORDING_NEXT' });
        }
        state = act(state, { type: 'REFERENCE_FINISH' });
        expect(state.privateReferences.find((r: any) => r.id === 'private-001').ready).toBe(true);
        const restored = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
        expect(restored.selectedReference).toBe('private-001');
        expect(getListing(restored, 'private-001')?.model).toBeUndefined();
    });
    it('preserves legacy saved bag draft private name and receipt facts during migration', () => {
        const old: any = initialState();
        delete old.localListings;
        delete old.localDrafts;
        delete old.privateReferences;
        delete old.capturedSteps;
        delete old.activeDraftId;
        delete old.feelIntent;
        old.saved = ['moss-knit'];
        old.bag = ['cloud-poplin'];
        old.draft.name = 'My edited blouse';
        old.privateReferenceName = 'My trusted blouse';
        old.orders = [{ id: 'FAM-old', items: ['petal-tee'], total: 23, status: 'cancelled', createdAt: '2026-10-13T12:00:00.000Z', itemSnapshots: [{ id: 'petal-tee', name: 'Original tee', price: 18, size: 'S', poster: '/posters/petal-tee.svg', condition: 'Recorded condition' }] }];
        const migrated: any = sanitizeStoredState(old);
        expect(migrated.saved).toEqual(['moss-knit']);
        expect(migrated.bag).toEqual(['cloud-poplin']);
        expect(migrated.draft.name).toBe('My edited blouse');
        expect(getListing(migrated, REFERENCE.id)?.name).toBe('My trusted blouse');
        expect(migrated.orders[0].itemSnapshots[0].name).toBe('Original tee');
        expect(migrated.localDrafts).toEqual([]);
    });
    it('rejects injected dynamic IDs external media and malformed draft records', () => {
        const old: any = initialState();
        old.localListings = [{ ...REFERENCE, id: 'evil', poster: 'https://external.invalid/garment.jpg' }];
        old.localDrafts = [{ id: 'local-999', templateId: 'unknown', listing: REFERENCE, capturedSteps: [0, 1, 2, 3, 4, 5], captureStage: 6, captureComplete: true, decisions: {}, published: true }];
        old.saved = ['evil', 'local-999'];
        const state: any = sanitizeStoredState(old);
        expect(state.localListings).toEqual([]);
        expect(state.localDrafts).toEqual([]);
        expect(state.saved).toEqual([]);
    });
    it('sanitizes and persists feel intentions without fabricated numeric scores', () => {
        let state: any = act(initialState(), { type: 'FEEL_INTENT', intent: { query: 'Soft cotton in size M', likes: ['smooth', 'smooth'], dislikes: ['scratchy'], priority: 'Surface' } });
        state = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
        expect(state.feelIntent).toEqual({ query: 'Soft cotton in size M', likes: ['smooth'], dislikes: ['scratchy'], priority: 'Surface', qualities: [], goal: 'shape' });
    });
});
it('keeps published measurement and material facts independent of a revised seller draft', () => {
    let state: any = act(initialState(), { type: 'LOCAL_DRAFT_CREATE', templateId: 'cloud-poplin' });
    state = act(state, { type: 'LOCAL_DRAFT_UPDATE', listing: { measurements: { chest: 55, shoulder: 47 }, material: 'Seller-described cotton' } });
    state = act(completeSeller(state), { type: 'PUBLISH' });
    expect(getListing(state, 'local-001')?.measurements.shoulder).toBe(47);
    state = act(state, { type: 'LOCAL_DRAFT_UPDATE', listing: { measurements: { chest: 65 }, material: 'Different draft material' } });
    expect(getListing(state, 'local-001')?.measurements.chest).toBe(55);
    const restored = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(getListing(restored, 'local-001')?.material).toBe('Seller-described cotton');
    expect(restored.draft.name).toBe(state.draft.name);
});
it('saving a delivered purchase as private reference retains purchase-time name and image', () => {
    let state: any = act(initialState(), { type: 'BUY_NOW', id: 'cloud-poplin' });
    state = act(state, { type: 'CHECKOUT', payment: 'success' });
    expect(act(state, { type: 'REFERENCE_FROM_ORDER', orderId: state.orders[0].id, itemId: 'cloud-poplin' })).toBe(state);
    for (let i = 0; i < 4; i++)
        state = act(state, { type: 'ORDER_ADVANCE', id: state.orders[0].id });
    const purchased = state.orders[0].itemSnapshots[0];
    state = act(state, { type: 'REFERENCE_FROM_ORDER', orderId: state.orders[0].id, itemId: 'cloud-poplin' });
    expect(getListing(state, state.selectedReference)?.poster).toBe(purchased.poster);
    expect(getListing(state, state.selectedReference)?.name).toBe(purchased.name);
    expect(state.privateReferences.find((x: any) => x.id === state.selectedReference).ready).toBe(false);
});
it('unfinished reference walkthrough survives reload without becoming ready', () => {
    let state: any = act(initialState(), { type: 'REFERENCE_CREATE' });
    state = act(state, { type: 'REFERENCE_RECORDING_COMPLETE', step: 0 });
    state = act(state, { type: 'REFERENCE_RECORDING_NEXT' });
    const restored: any = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(restored.selectedReference).toBe('private-001');
    expect(restored.privateReferences[1].captureStage).toBe(1);
    expect(restored.privateReferences[1].capturedSteps).toEqual([0]);
    expect(restored.privateReferences[1].ready).toBe(false);
});
it('completed animated pull examples do not become garment-specific stretch evidence', () => {
    let state: any = act(initialState(), { type: 'REFERENCE_CREATE' });
    for (let step = 0; step < 5; step++) {
        state = act(state, { type: 'REFERENCE_RECORDING_COMPLETE', step });
        state = act(state, { type: 'REFERENCE_RECORDING_NEXT' });
    }
    const stretch = getListing(state, state.selectedReference)?.evidence.find(e => e.property === 'Stretch');
    expect(stretch?.support).toBe('unavailable');
    expect(stretch?.observation).toMatch(/no garment-specific/i);
    expect(stretch?.observation).toMatch(/not|unknown|unmeasured/i);
});
it('forged active draft aliases cannot bypass completed walkthrough steps on reload', () => {
    let state: any = act(initialState(), { type: 'LOCAL_DRAFT_CREATE' });
    state = { ...state, captureStage: 6, captureComplete: true, decisions: Object.fromEntries(PROPERTIES.map(p => [p, { status: 'confirmed', note: '' }])) };
    const restored: any = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(act(restored, { type: 'PUBLISH' })).toBe(restored);
    expect(restored.captureComplete).toBe(false);
});
it('retains the entire dynamic published observation snapshot across reload', () => {
    let state: any = act(initialState(), { type: 'LOCAL_DRAFT_CREATE', templateId: 'cloud-poplin' });
    state = act(completeSeller(state), { type: 'PUBLISH' });
    const original = getListing(state, 'local-001');
    state = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(getListing(state, 'local-001')).toEqual(original);
});
it('replaying the pull example never upgrades private stretch evidence across reload', () => {
    let state: any = act(initialState(), { type: 'REFERENCE_RECORDING_RETAKE', step: 4 });
    state = act(state, { type: 'REFERENCE_RECORDING_COMPLETE', step: 4 });
    expect(getListing(state, REFERENCE.id)?.evidence.find(e => e.property === 'Stretch')?.support).toBe('unavailable');
    state = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(getListing(state, REFERENCE.id)?.evidence.find(e => e.property === 'Stretch')?.support).toBe('unavailable');
});
it('keeps the validated checkout destination and selected method on the immutable order', () => {
    let state: any = act(initialState(), { type: 'BUY_NOW', id: 'cloud-poplin' });
    state = act(state, { type: 'CHECKOUT', payment: 'success', delivery: { fullName: 'Maya Example', address: '12 Market Road, Test City' }, paymentMethod: 'wallet' });
    expect(state.orders[0].delivery).toEqual({ fullName: 'Maya Example', address: '12 Market Road, Test City' });
    expect(state.orders[0].paymentMethod).toBe('wallet');
    state = sanitizeStoredState(JSON.parse(JSON.stringify(state)));
    expect(state.orders[0].delivery.address).toBe('12 Market Road, Test City');
});
it('restores coherent higher-value orders when the prepared local catalogue grows',()=>{
 let state:any=initialState();
 for(let n=1;n<=13;n++){state=act(state,{type:'LOCAL_DRAFT_CREATE'});state=act(state,{type:'DRAFT',draft:{price:9999}});state=act(completeSeller(state),{type:'PUBLISH'});state=act(state,{type:'BAG_ADD',id:state.activeDraftId});}
 state=act(state,{type:'CHECKOUT',payment:'success'});expect(state.orders[0].total).toBe(129992);
 const restored=sanitizeStoredState(JSON.parse(JSON.stringify(state)));expect(restored.orders[0]?.total).toBe(129992);expect(restored.orders[0]?.itemSnapshots).toHaveLength(13);
});
it('preserves spaces while the user types a multiword feel search',()=>{
 let state:any=act(initialState(),{type:'FEEL_INTENT',intent:{query:'soft '}});
 expect(state.feelIntent.query).toBe('soft ');
 state=act(state,{type:'FEEL_INTENT',intent:{query:state.feelIntent.query+'cotton'}});
 expect(state.feelIntent.query).toBe('soft cotton');expect(sanitizeStoredState(JSON.parse(JSON.stringify(state))).feelIntent.query).toBe('soft cotton');
});
it('names a new prepared blue reference once without duplicated possessive words',()=>{
 const state:any=act(initialState(),{type:'REFERENCE_CREATE',templateId:REFERENCE.id});
 expect(getListing(state,state.selectedReference)?.name).toBe(REFERENCE.name);
});
it('keeps prepared garment construction notes specific to jersey knit denim and woven photos',()=>{
 const state=initialState();
 expect(getListing(state,'petal-tee')?.feelNotes).toContain('Jersey appearance');
 expect(getListing(state,'petal-tee')?.feelNotes).not.toContain('Woven appearance');
 expect(getListing(state,'oat-vest')?.feelNotes).toContain('Ribbed knit appearance');
 expect(getListing(state,'sunday-denim')?.feelNotes).toContain('Denim twill appearance');
 expect(getListing(state,'rose-jacket')?.feelNotes).toContain('Twill appearance');
});
