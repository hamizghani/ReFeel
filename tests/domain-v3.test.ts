import { describe, expect, it } from 'vitest';
import { CATALOG, REFERENCE, PROPERTIES, getActiveDraft, getListing, getReference, initialState, sanitizeStoredState, transition } from '../src/domain';
const act=(state:any,action:any):any=>transition(state,action);
const qualities={softness:'very-soft',give:'some',shape:'relaxed',texture:'smooth'};
const sellerReady=(state:any)=>{for(let step=0;step<6;step++){state=act(state,{type:'RECORDING_COMPLETE',step});state=act(state,{type:'RECORDING_NEXT'});}for(const property of PROPERTIES)state=act(state,{type:'DECIDE',property,status:'confirmed'});return state;};
describe('attributed feel descriptions and animated walkthroughs',()=>{
 it('prefills the hero and private blue descriptions independently of material tests',()=>{
  expect((CATALOG[0] as any).feelDescription).toEqual({softness:'somewhat-soft',give:'little',shape:'crisp',texture:'smooth'});
  expect((REFERENCE as any).feelDescription).toEqual({softness:'somewhat-soft',give:'little',shape:'balanced',texture:'smooth'});
  expect((REFERENCE as any).feelDescriptionSource).toBe('prepared');
  expect(CATALOG.every(x=>(x as any).feelDescription&& (x as any).feelDescriptionSource==='prepared')).toBe(true);
 });
 it('stores owner qualities on the selected private garment and survives refresh',()=>{
  let state:any=act(initialState(),{type:'DESCRIBE_FEEL',qualities});
  expect(getReference(state)).toMatchObject({feelDescription:qualities,feelDescriptionSource:'owner'});
  state=sanitizeStoredState(JSON.parse(JSON.stringify(state)));
  expect(getReference(state)).toMatchObject({feelDescription:qualities,feelDescriptionSource:'owner'});
  expect(CATALOG[0]).toMatchObject({feelDescription:{shape:'crisp'}});
 });
 it('updates an explicitly identified private reference without changing the selected one',()=>{
  let state:any=act(initialState(),{type:'REFERENCE_CREATE',templateId:'moss-knit'});
  const selected=JSON.stringify(getReference(state));
  state=act(state,{type:'DESCRIBE_FEEL',id:REFERENCE.id,qualities});
  expect(JSON.stringify(getReference(state))).toBe(selected);
  expect(getReference(state,REFERENCE.id)).toMatchObject({feelDescription:qualities,feelDescriptionSource:'owner'});
 });
 it('keeps seller qualities private until publishing and does not change prior public or receipt facts',()=>{
  let state:any=act(initialState(),{type:'LOCAL_DRAFT_CREATE',templateId:'cloud-poplin'});
  state=act(state,{type:'DESCRIBE_FEEL',id:state.activeDraftId,qualities});
  expect(getActiveDraft(state).listing).toMatchObject({feelDescription:qualities,feelDescriptionSource:'seller'});
  state=act(sellerReady(state),{type:'PUBLISH'});
  const publicSnapshot=JSON.stringify(getListing(state,'local-001'));
  state=act(state,{type:'BUY_NOW',id:'local-001'});state=act(state,{type:'CHECKOUT',payment:'success'});
  const receipt=JSON.stringify(state.orders[0].itemSnapshots);
  state=act(state,{type:'DESCRIBE_FEEL',id:'local-001',qualities:{...qualities,shape:'crisp'}});
  expect(JSON.stringify(getListing(state,'local-001'))).toBe(publicSnapshot);
  expect(JSON.stringify(state.orders[0].itemSnapshots)).toBe(receipt);
  const restored=sanitizeStoredState(JSON.parse(JSON.stringify(state)));
  expect(JSON.stringify(getListing(restored,'local-001'))).toBe(publicSnapshot);
  expect(getActiveDraft(restored).listing).toMatchObject({feelDescription:{shape:'crisp'}});
 });
 it('asks for a fresh relevant seller review when a described quality changes',()=>{
  let state:any=act(initialState(),{type:'LOCAL_DRAFT_CREATE'});
  state=act(sellerReady(state),{type:'PUBLISH'});
  state=act(state,{type:'DESCRIBE_FEEL',id:state.activeDraftId,qualities:{...getActiveDraft(state).listing.feelDescription,give:'some'}});
  expect(state.decisions.Stretch).toBeUndefined();expect(state.decisions.Drape.status).toBe('confirmed');
  expect(act(state,{type:'PUBLISH'})).toBe(state);
  state=act(state,{type:'DECIDE',property:'Stretch',status:'confirmed'});
  state=act(state,{type:'PUBLISH'});
  expect(getListing(state,state.activeDraftId)).toMatchObject({feelDescription:{give:'some'},feelDescriptionSource:'seller'});
 });
 it('rejects edits to a public catalogue garment without an active draft',()=>{
  const state:any=initialState();
  expect(act(state,{type:'DESCRIBE_FEEL',id:'moss-knit',qualities})).toBe(state);
 });
 it('advances all six seller steps immediately without creating measured source support',()=>{
  const baseline=JSON.stringify(getActiveDraft(initialState()).listing.evidence);
  const state:any=sellerReady(initialState());
  expect(state.captureComplete).toBe(true);expect(state.capturedSteps).toEqual([0,1,2,3,4,5]);
  expect(getActiveDraft(state)).toMatchObject({progressKind:'animated-demo'});
  expect(JSON.stringify(getActiveDraft(state).listing.evidence)).toBe(baseline);
  expect(getActiveDraft(state).listing.evidence.find(e=>e.property==='Stretch')?.support).toBe('unavailable');
 });
 it('saves the buyer animation walkthrough without upgrading unknown give evidence',()=>{
  let state:any=act(initialState(),{type:'REFERENCE_CREATE'});
  const before=JSON.stringify(getReference(state)?.evidence);
  for(let step=0;step<6;step++){state=act(state,{type:'REFERENCE_RECORDING_COMPLETE',step});state=act(state,{type:'REFERENCE_RECORDING_NEXT'});}
  state=act(state,{type:'REFERENCE_CAPTURE_SAVE'});
  expect(state.privateReferences[1]).toMatchObject({ready:true,progressKind:'animated-demo'});
  expect(JSON.stringify(getReference(state)?.evidence)).toBe(before);
  expect(getReference(state)).toMatchObject({feelDescription:{give:'little'}});
 });
 it('moves back without deleting completed progress or reviewer decisions',()=>{
  let state:any=sellerReady(initialState());const decisions=JSON.stringify(state.decisions);
  state=act(state,{type:'RECORDING_PREVIOUS'});
  expect(state.captureStage).toBe(5);expect(state.capturedSteps).toHaveLength(6);expect(JSON.stringify(state.decisions)).toBe(decisions);
  state=act(state,{type:'RECORDING_NEXT'});expect(state.captureStage).toBe(6);
  state=act(state,{type:'REFERENCE_CREATE'});state=act(state,{type:'REFERENCE_RECORDING_COMPLETE',step:0});state=act(state,{type:'REFERENCE_RECORDING_NEXT'});
  state=act(state,{type:'REFERENCE_RECORDING_PREVIOUS'});expect(state.privateReferences[1].captureStage).toBe(0);expect(state.privateReferences[1].capturedSteps).toEqual([0]);
 });
 it('keeps completed readiness and publication after viewing an earlier step and refreshing',()=>{
  let state:any=act(sellerReady(initialState()),{type:'PUBLISH'});
  state=act(state,{type:'RECORDING_VIEW',step:2});
  state=sanitizeStoredState(JSON.parse(JSON.stringify(state)));
  expect(state.captureStage).toBe(2);expect(state.captureComplete).toBe(true);expect(state.published).toBe(true);
  state=act(state,{type:'REFERENCE_CREATE'});
  for(let step=0;step<6;step++){state=act(state,{type:'REFERENCE_RECORDING_COMPLETE',step});state=act(state,{type:'REFERENCE_RECORDING_NEXT'});}
  state=act(state,{type:'REFERENCE_CAPTURE_SAVE'});state=act(state,{type:'REFERENCE_RECORDING_VIEW',step:1});
  state=sanitizeStoredState(JSON.parse(JSON.stringify(state)));
  expect(state.privateReferences[1]).toMatchObject({captureStage:1,ready:true,capturedSteps:[0,1,2,3,4,5]});
 });
 it('rejects malformed quality actions and sanitizes poisoned stored enum values',()=>{
  const initial:any=initialState();
  expect(act(initial,{type:'DESCRIBE_FEEL',qualities:{...qualities,softness:'silk proof'}})).toBe(initial);
  let state:any=act(initial,{type:'DESCRIBE_FEEL',qualities:{...qualities,softness:'unknown'}});
  state.privateReferences[0].listing.feelDescription={...qualities,softness:'measured-soft',texture:['smooth']};
  const restored=sanitizeStoredState(JSON.parse(JSON.stringify(state)));
  expect((getReference(restored) as any).feelDescription).toEqual({...qualities,softness:'unknown',texture:'unknown'});
  expect(restored.privateReferences[0].progressKind).toBe('animated-demo');
 });
 it('does not restore legacy saved-animation flags into stretch evidence',()=>{
  let state:any=act(initialState(),{type:'REFERENCE_CREATE'});
  state.privateReferences[1].capturedSteps=[0,1,2,3,4,5];state.privateReferences[1].captureStage=6;state.privateReferences[1].ready=true;
  const stretch=state.privateReferences[1].listing.evidence.find((e:any)=>e.property==='Stretch');stretch.preparedTake=true;stretch.support='limited';
  const restored=sanitizeStoredState(JSON.parse(JSON.stringify(state)));
  expect(getReference(restored)?.evidence.find(e=>e.property==='Stretch')?.support).toBe('unavailable');
  expect(getReference(restored)?.evidence.find(e=>e.property==='Stretch')).not.toHaveProperty('preparedTake');
 });
});
