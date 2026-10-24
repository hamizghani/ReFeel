import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Use the project's existing build dependency to resolve extensionless TypeScript imports.
// No remote dependency, generated file or experimental Node TS resolution is required.
async function loadModule(relativePath) {
  const result = await build({ entryPoints: [path.join(root, relativePath)], bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent' });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}
const domain = await loadModule('src/domain.ts');
const media = await loadModule('src/media.ts');
const feel = await loadModule('src/feel.ts');
const { CATALOG, REFERENCE, PROPERTIES, initialState, transition, getListing, allListings, rankMatches, sanitizeStoredState } = domain;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/photos/manifest.json'), 'utf8'));
const manifestBySrc = new Map(manifest.items.map(item => [item.src, item]));
assert.equal(CATALOG.length, 12, 'Twelve prepared catalogue garments');
assert.equal(new Set(CATALOG.map(item => item.id)).size, 12, 'Unique catalogue IDs');
assert.equal(media.PHOTO_IDS.length, 13, 'Twelve catalogue sets and one reference');
assert.equal(manifest.items.length, 36, 'Thirty-six photographic assets');
assert.equal(manifestBySrc.size, 36, 'Unique image paths');
assert(!CATALOG.some(item => item.id === REFERENCE.id), 'Private reference is not public inventory');
assert.deepEqual(PROPERTIES, ['Drape', 'Movement', 'Stretch', 'Surface']);

for (const listing of [...CATALOG, REFERENCE]) {
  assert.equal(listing.model, undefined, `${listing.id}: garment evidence stays photograph-linked, separate from the illustrative model`);
  assert.equal(listing.poster, media.coverFor(listing.id), `${listing.id}: photographic cover`);
  assert.deepEqual(listing.evidence.map(item => item.property), PROPERTIES, 'Fixed evidence order');
  const views = media.mediaFor(listing.id).photos;
  assert(views.some(view => view.kind === 'front'), `${listing.id}: garment cover available`);
  for (const observation of listing.evidence) {
    assert(['supported', 'limited', 'unavailable'].includes(observation.support));
    assert(['unreviewed', 'confirmed', 'corrected', 'unsure'].includes(observation.sellerStatus));
    assert(observation.observation.length > 0 && observation.frame.length > 0, 'Useful observation and source context');
    assert(views.some(view => view.src === observation.source), `${listing.id}: source belongs to its own garment set`);
    assert.equal(manifestBySrc.get(observation.source)?.listingId, listing.id);
  }
}
for (const photo of manifest.items) {
  assert(photo.src.startsWith('/photos/') && !photo.src.includes('..'), 'Local safe photograph path');
  const bytes = fs.readFileSync(path.join(root, 'public', photo.src));
  assert.equal(bytes.length, photo.bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), photo.sha256);
  assert.equal(photo.conditionProof, false, 'Prepared imagery is not specimen condition proof');
  assert.equal(photo.sameGarmentSet, true, 'Source-set association retained');
}

for (const property of PROPERTIES) {
  const matches = rankMatches(initialState(), REFERENCE, property);
  assert.equal(matches.length, 3, 'Three eligible legacy suggestions');
  assert.equal(new Set(matches.map(match => match.listing.id)).size, 3);
  for (const match of matches) {
    assert.deepEqual(match.properties.map(item => item.property), PROPERTIES);
    if (property === 'Stretch') assert.equal(match.properties.find(item => item.property === 'Stretch').support, 'unavailable', 'Legacy reference has no measured pull test');
  }
}
const preferences = feel.FEEL_DEFAULTS;
const matches = feel.findFeelMatches(initialState(), REFERENCE, preferences, { category: 'All', size: 'All' });
assert.equal(matches.length, 3, 'Three eligible authored feel suggestions');
assert.equal(new Set(matches.map(match => match.listing.id)).size, 3);
assert(matches.every(match => feel.compatibleGarments(REFERENCE, match.listing)), 'Compatible garment families');
assert(!matches.some(match => 'score' in match || 'percentage' in match || 'distance' in match), 'No overall numeric result exposed');
const unknownReference = { ...REFERENCE, id: 'unknown-reference', templateId: 'unknown-reference', feelDescription: feel.UNKNOWN_FEEL };
assert.deepEqual(feel.findFeelMatches(initialState(), unknownReference, { ...preferences, priority: 'Stretch' }, { category: 'All', size: 'All' }), [], 'Unknown fabric profile abstains');

let state = transition(initialState(), { type: 'REFERENCE_CREATE', templateId: REFERENCE.id });
let reference = getListing(state, state.selectedReference);
const beforeSources = JSON.stringify(reference.evidence);
assert.equal(reference.evidence.find(item => item.property === 'Drape').support, 'supported', 'Prepared front photo exists independently of walkthrough progress');
assert.equal(reference.evidence.find(item => item.property === 'Stretch').support, 'unavailable', 'No garment-specific pull test');
assert.deepEqual(reference.feelDescription, REFERENCE.feelDescription, 'Prepared description is copied with attribution');
assert.equal(reference.feelDescriptionSource, 'prepared');
state = transition(state, { type: 'REFERENCE_RECORDING_COMPLETE', step: 0 });
reference = getListing(state, state.selectedReference);
assert.equal(JSON.stringify(reference.evidence), beforeSources, 'Watching an instruction cannot change source authority');
assert.equal(state.privateReferences.find(item => item.id === state.selectedReference).progressKind, 'animated-demo');
assert.equal(reference.evidence.find(item => item.property === 'Stretch').support, 'unavailable', 'Missing pull stays unavailable');
for (let step = 0; step < 6; step++) {
  state = transition(state, { type: 'REFERENCE_RECORDING_COMPLETE', step });
  state = transition(state, { type: 'REFERENCE_RECORDING_NEXT' });
}
state = transition(state, { type: 'REFERENCE_FINISH' });
assert(state.privateReferences.find(item => item.id === state.selectedReference).ready);
assert.equal(JSON.stringify(getListing(state, state.selectedReference).evidence), beforeSources, 'Completing the demo does not create new evidence');
assert.equal(getListing(state, state.selectedReference).evidence.find(item => item.property === 'Stretch').support, 'unavailable', 'Watching an animated pull does not create measured or captured evidence');
assert.equal(sanitizeStoredState(JSON.parse(JSON.stringify(state))).selectedReference, state.selectedReference, 'Private reference selection survives reload');

state = transition(state, { type: 'LOCAL_DRAFT_CREATE', templateId: 'moss-knit' });
assert.equal(allListings(state).length, 12, 'A draft is not public stock');
for (let step = 0; step < 6; step++) {
  state = transition(state, { type: 'RECORDING_COMPLETE', step });
  state = transition(state, { type: 'RECORDING_NEXT' });
}
for (const property of PROPERTIES) state = transition(state, { type: 'DECIDE', property, status: 'confirmed' });
state = transition(state, { type: 'PUBLISH' });
assert.equal(allListings(state).length, 13);
const published = JSON.stringify(getListing(state, state.activeDraftId));
state = transition(state, { type: 'DRAFT', draft: { name: 'Unpublished edit' } });
assert.equal(JSON.stringify(getListing(state, state.activeDraftId)), published, 'Public version is independent of edits');
assert.equal(JSON.stringify(getListing(sanitizeStoredState(JSON.parse(JSON.stringify(state))), state.activeDraftId)), published, 'Public snapshot survives reload');

console.log(JSON.stringify({ status: 'passed', catalogue: 12, photographicSets: 13, photographs: 36, properties: PROPERTIES, candidateCount: matches.length, checks: ['source associations', 'local photo byte lengths and SHA-256', 'illustrative motion separate from evidence', 'fixed property order', 'eligible authored suggestions', 'missing support stays missing after walkthrough', 'guided completion', 'private reference persistence', 'immutable local publication'] }, null, 2));
