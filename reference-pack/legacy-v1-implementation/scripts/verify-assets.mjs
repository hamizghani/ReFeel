/** Independent structural inspection of delivered assets (does not import author code). */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const ROOT=path.resolve(import.meta.dirname,'..'),PUBLIC=path.join(ROOT,'public');
const manifest=JSON.parse(fs.readFileSync(path.join(PUBLIC,'asset-manifest.json'),'utf8'));
const active=['cloud-poplin','moss-knit','airloom-linen','petal-tee','sunday-denim','ink-trousers','apricot-slip','tide-shirt','oat-vest','lilac-wrap','rose-jacket','sage-skirt'];
const models=['cloud-poplin','moss-knit','airloom-linen','my-blue-blouse'];
const required=[...active.map(id=>`/posters/${id}.svg`),'/posters/my-blue-blouse.svg',...models.map(id=>`/models/${id}.glb`),...Array.from({length:12},(_,i)=>`/posters/coming-soon-${String(i+1).padStart(2,'0')}.svg`),...Array.from({length:38},(_,i)=>`/posters/placeholder-${String(i+1).padStart(2,'0')}.svg`),...['front','label','surface','movement','wear'].map(v=>`/posters/evidence-${v}.svg`),...['logo-light','logo-dark','mark','favicon','familiar-wordmark','familiar-wordmark-reverse','familiar-mark','familiar-mark-reverse'].map(v=>`/brand/${v}.svg`)];
for(const p of required){assert(fs.existsSync(path.join(PUBLIC,p)),`Missing ${p}`);assert(manifest.assets.some(a=>a.path===p),`Manifest omits ${p}`);}
for(const a of manifest.assets){const p=path.join(PUBLIC,a.path);assert(fs.existsSync(p),`Manifest refers to missing ${a.path}`);assert.equal(fs.statSync(p).size,a.bytes,`Wrong measured bytes ${a.path}`);assert(a.origin&&a.license&&a.routes?.length,`Incomplete provenance ${a.path}`);}
function parseGLB(file){
 const buf=fs.readFileSync(file);assert.equal(buf.readUInt32LE(0),0x46546c67,'Bad GLB signature');assert.equal(buf.readUInt32LE(4),2,'Bad GLB version');assert.equal(buf.readUInt32LE(8),buf.length,'Bad GLB length');let pos=12,json,bin;
 while(pos<buf.length){const length=buf.readUInt32LE(pos),type=buf.readUInt32LE(pos+4);assert(length%4===0,'Unaligned chunk');assert(pos+8+length<=buf.length,'Invalid chunk length');const data=buf.subarray(pos+8,pos+8+length);if(type===0x4e4f534a)json=JSON.parse(data.toString());if(type===0x004e4942)bin=data;pos+=8+length;}assert(json&&bin,'Missing chunks');return{json,bin,bytes:buf.length};
}
function accessorValues(json,bin,id){const a=json.accessors[id],v=json.bufferViews[a.bufferView],width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4}[a.type],componentBytes={5123:2,5125:4,5126:4}[a.componentType];assert(width&&componentBytes,'Unsupported accessor format');const values=[];const stride=v.byteStride??width*componentBytes;for(let i=0;i<a.count;i++)for(let k=0;k<width;k++){const at=(v.byteOffset??0)+(a.byteOffset??0)+i*stride+k*componentBytes;assert(at+componentBytes<=bin.length,'Accessor beyond buffer');values.push(a.componentType===5126?bin.readFloatLE(at):a.componentType===5123?bin.readUInt16LE(at):bin.readUInt32LE(at));}return{values,count:a.count,width};}
function transformed(x,y,z,m){return[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];}
const summaries=[];
for(const id of models){
 const{json:j,bin,bytes}=parseGLB(path.join(PUBLIC,'models',id+'.glb'));
 assert(bytes<2_000_000,`${id} exceeds mobile budget`);assert.equal(j.asset.version,'2.0');assert.equal(j.extras.front,'+Z');assert(!j.animations&&!j.skins,'Unused animation or rig');assert(j.meshes.length>=12,`${id} lacks garment construction`);assert(j.materials.length>=4&&j.materials.length<=12,`${id} material count`);assert(j.images.length===j.materials.length+(id==='cloud-poplin'?1:0),'Fabric or label textures missing');
 const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];let vertices=0,triangles=0;
 for(const node of j.nodes){
  if(node.mesh===undefined)continue;const m=node.matrix??[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  for(const p of j.meshes[node.mesh].primitives){
   const pos=accessorValues(j,bin,p.attributes.POSITION),norm=accessorValues(j,bin,p.attributes.NORMAL),uv=accessorValues(j,bin,p.attributes.TEXCOORD_0),indices=accessorValues(j,bin,p.indices);assert.equal(norm.count,pos.count);assert.equal(uv.count,pos.count);assert(indices.count%3===0);vertices+=pos.count;triangles+=indices.count/3;
   for(const i of indices.values)assert(i<pos.count,'Out-of-range index');
   for(let i=0;i<pos.values.length;i+=3){const point=transformed(...pos.values.slice(i,i+3),m);for(let d=0;d<3;d++){assert(Number.isFinite(point[d]),'Nonfinite position');min[d]=Math.min(min[d],point[d]);max[d]=Math.max(max[d],point[d]);}}
  }
 }
 const size=max.map((n,i)=>n-min[i]);assert(size[0]>.6&&size[0]<1.3,'Implausible sleeve span');assert(size[1]>.5&&size[1]<.9,'Implausible garment length');assert(size[2]>.17&&size[2]<.4,'Flat cardboard garment rejected');assert(vertices>2000&&triangles>3000,'Insufficient curved cloth geometry');
 const names=j.nodes.map(n=>n.name);assert(names.includes('hollow-tailored-body'));assert(names.includes('hollow-left-sleeve')&&names.includes('hollow-right-sleeve'));assert(names.includes('double-stitched-hem'));assert(names.includes('woven-neck-label'));
 if(id==='cloud-poplin'||id==='airloom-linen'){assert(names.includes('standing-collar-band'));assert(names.includes('pointed-collar--1')&&names.includes('pointed-collar-1'));assert(names.includes('folded-front-placket'));assert(names.includes('button-6'));}
 if(id==='moss-knit'){assert(names.includes('open-front-fold-0')&&names.includes('open-front-fold-1'));assert(names.some(n=>n.startsWith('knit-rib-')));}
 if(id==='airloom-linen')assert(names.includes('hollow-patch-pocket--1')&&names.includes('hollow-patch-pocket-1'));
 if(id==='cloud-poplin'){assert(names.includes('woven-neck-label-print'),'Readable label absent');assert(names.includes('right-cuff-wear-patch'),'Visible cuff mark absent');assert(j.materials.find(m=>m.name==='original-readable-label-print')?.pbrMetallicRoughness.baseColorTexture,'Printed label texture absent');}
 for(const im of j.images){assert.equal(im.mimeType,'image/png');const view=j.bufferViews[im.bufferView],png=bin.subarray(view.byteOffset,view.byteOffset+view.byteLength);assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(png.readUInt32BE(16),im.name.includes('label-print')?512:64);assert.equal(png.readUInt32BE(20),im.name.includes('label-print')?320:64);}
 const entry=manifest.assets.find(a=>a.path===`/models/${id}.glb`);assert.equal(entry.meshCount,j.meshes.length);assert.equal(entry.materialCount,j.materials.length);for(let d=0;d<3;d++){assert(Math.abs(entry.coordinates.boundsMin[d]-min[d])<1e-5);assert(Math.abs(entry.coordinates.boundsMax[d]-max[d])<1e-5);}
 summaries.push({id,bytes,meshes:j.meshes.length,vertices,triangles,boundsCm:size.map(v=>+(v*100).toFixed(1))});
}
for(const p of required.filter(p=>p.endsWith('.svg'))){const text=fs.readFileSync(path.join(PUBLIC,p),'utf8');assert(text.includes('<svg')&&text.includes('<title')&&text.includes('<desc'),`SVG accessibility metadata ${p}`);assert(!/https?:\/\//.test(text.replaceAll('http://www.w3.org/2000/svg','').replaceAll('http://www.w3.org/1999/xlink','')),`External image/font in ${p}`);if(!p.includes('placeholder')&&!p.includes('/brand/')){const b64=text.match(/base64,([A-Za-z0-9+/=]+)/)?.[1];assert(b64,`No original studio render ${p}`);const img=Buffer.from(b64,'base64');assert.equal(img.subarray(0,8).toString('hex'),'89504e470d0a1a0a');assert.equal(img.readUInt32BE(16),800);assert.equal(img.readUInt32BE(20),1000);}}
assert.equal(manifest.assets.filter(a=>a.kind==='coming-soon-reference').length,12);assert.equal(manifest.assets.filter(a=>a.kind==='pastel-placeholder').length,38);assert.equal(manifest.assets.filter(a=>a.kind==='poster').length,13);
console.log(JSON.stringify({result:'PASS',requiredAssets:required.length,manifestEntries:manifest.assets.length,models:summaries},null,2));
