import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/photos/manifest.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'src/media.ts'),'utf8');
const match=source.match(/const registry: Record<string, GarmentMedia> = ([\s\S]*?);\nexport const PHOTO_IDS/);
assert(match,'Media registry must be machine-readable');
const registry=JSON.parse(match[1]);
function webpSize(buffer){
 assert.equal(buffer.toString('ascii',0,4),'RIFF','WebP RIFF signature');
 assert.equal(buffer.toString('ascii',8,12),'WEBP','WebP format signature');
 for(let offset=12;offset+8<buffer.length;){
  const kind=buffer.toString('ascii',offset,offset+4),size=buffer.readUInt32LE(offset+4),start=offset+8;
  if(kind==='VP8 '){assert.equal(buffer.toString('hex',start+3,start+6),'9d012a');return [buffer.readUInt16LE(start+6)&0x3fff,buffer.readUInt16LE(start+8)&0x3fff];}
  if(kind==='VP8X')return [1+buffer.readUIntLE(start+4,3),1+buffer.readUIntLE(start+7,3)];
  if(kind==='VP8L'){assert.equal(buffer[start],0x2f);const bits=buffer.readUInt32LE(start+1);return [(bits&0x3fff)+1,((bits>>>14)&0x3fff)+1];}
  offset=start+size+(size%2);
 }
 throw new Error('No supported WebP dimensions');
}
const manifestBySrc=new Map(manifest.items.map(i=>[i.src,i]));
assert.equal(manifestBySrc.size,manifest.items.length,'All manifest sources unique');
let count=0,bytes=0;
for(const [id,media] of Object.entries(registry)){
 assert(media.photos.length>=2,`${id}: front and useful additional view required`);
 assert(media.photos.some(p=>p.kind==='front'),`${id}: cover required`);
 for(const photo of media.photos){
  assert(photo.src.startsWith('/photos/')&&!photo.src.includes('..'),'Local safe source path');
  assert(['front','back','detail','label','wear'].includes(photo.kind),'Semantic photo kind');
  const meta=manifestBySrc.get(photo.src);assert(meta,`${photo.src}: provenance required`);
  const buffer=fs.readFileSync(path.join(root,'public',photo.src));
  assert.equal(buffer.length,meta.bytes,'Byte length');
  assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'),meta.sha256,'SHA-256');
  assert.deepEqual(webpSize(buffer),[photo.width,photo.height],'Decoded image dimensions');
  assert.equal(meta.conditionProof,false,'Stock imagery must not become secondhand condition proof');
  assert.equal(meta.listingId,id,'Same listing association');count++;bytes+=buffer.length;
 }
}
assert.equal(Object.keys(registry).length,13,'12 catalogue garments + 1 private reference');
assert.equal(count,manifest.items.length,'Registry and manifest completeness');
for(const weight of [400,500,600])assert(fs.statSync(path.join(root,`public/fonts/newsreader-${weight}.ttf`)).size>50000,'Newsreader font available');
console.log(JSON.stringify({ok:true,garmentSets:Object.keys(registry).length,photographs:count,bytes,formats:['WebP'],localOnly:true,checked:['paths','registry completeness','semantic kinds','decoded dimensions','byte lengths','SHA-256','font availability']},null,2));
