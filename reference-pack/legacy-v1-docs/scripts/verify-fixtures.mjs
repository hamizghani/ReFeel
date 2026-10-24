import {CATALOG,REFERENCE,PROPERTIES,initialState,rankMatches} from '../src/domain.ts';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
assert.equal(CATALOG.length,12);assert.equal(new Set(CATALOG.map(x=>x.id)).size,12);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/evidence/manifest.json')));
for(const listing of [...CATALOG,REFERENCE]){
 assert.deepEqual(listing.evidence.map(e=>e.property),PROPERTIES);
 for(const e of listing.evidence){const file=path.join(root,'public',e.source);assert(fs.existsSync(file),e.source);const m=manifest.media.find(x=>x.path===e.source);assert(m,e.source+' not manifested');assert.equal(fs.statSync(file).size,m.bytes);}
 assert(fs.existsSync(path.join(root,'public',listing.poster)),listing.poster);
 if(listing.model)assert(fs.existsSync(path.join(root,'public',listing.model)),listing.model);
}
for(const e of manifest.media){assert(fs.existsSync(path.join(root,'public',e.path)));assert.equal(fs.statSync(path.join(root,'public',e.path)).size,e.bytes)}
const xml=spawnSync('python3',['-c',`from pathlib import Path\nimport xml.etree.ElementTree as E\nfor f in Path('public').rglob('*.svg'): E.parse(f)\nprint('All SVGs parse as XML')`],{cwd:root,encoding:'utf8'});assert.equal(xml.status,0,xml.stderr);
for(const p of PROPERTIES){const r=rankMatches(initialState(),REFERENCE,p);assert.equal(r.length,3);assert.equal(new Set(r.map(x=>x.listing.id)).size,3);for(const item of r){assert.deepEqual(item.properties.map(x=>x.property),PROPERTIES);if(p==='Stretch')assert.equal(item.properties.find(x=>x.property==='Stretch').support,'unavailable')}}
console.log(JSON.stringify({status:'passed',catalogue:12,sourceMedia:manifest.media.length,models:4,properties:PROPERTIES,svgXML:xml.stdout.trim()}));
