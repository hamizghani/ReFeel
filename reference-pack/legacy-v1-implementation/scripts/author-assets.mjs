/**
 * Familiar original garment workshop.
 * Reproduce: node scripts/author-assets.mjs
 * Meshes are tailored, hollow lofted fabric surfaces. No photographs or third-party
 * garment geometry is used. CPU studio rendering keeps regeneration self-contained.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import http from 'node:http';
import * as THREE from 'three';
import { chromium } from 'playwright';

const ROOT = path.resolve(import.meta.dirname, '..');
const MODEL_DIR = path.join(ROOT, 'public/models');
const POSTER_DIR = path.join(ROOT, 'public/posters');
for (const d of [MODEL_DIR, POSTER_DIR]) fs.mkdirSync(d, { recursive: true });
const PI = Math.PI;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const srgb=v=>v<.0031308?v*12.92:1.055*Math.pow(v,1/2.4)-.055;
const fabricTypes={cotton:{roughness:.88,normal:.15},knit:{roughness:1,normal:.38},linen:{roughness:.96,normal:.28},denim:{roughness:.94,normal:.25},silk:{roughness:.55,normal:.12}};
const specs=[
 {id:'cloud-poplin',name:'Cloud Poplin Blouse',type:'shirt',fabric:'cotton',color:'#e8e2d5',background:'#e3e8ef',collar:true,sleeve:.49,body:.66,w:.237,d:.108,buttons:true},
 {id:'moss-knit',name:'Moss Knit Cardigan',type:'cardigan',fabric:'knit',color:'#73866f',background:'#e7e9db',sleeve:.46,body:.67,w:.25,d:.13,open:true},
 {id:'airloom-linen',name:'Airloom Linen Overshirt',type:'shirt',fabric:'linen',color:'#bdbaab',background:'#e9e2d6',collar:true,sleeve:.48,body:.7,w:.266,d:.116,buttons:true,pockets:true},
 {id:'petal-tee',name:'Petal Cotton Tee',type:'tee',fabric:'cotton',color:'#c9919a',background:'#f0e1e3',sleeve:.19,body:.62,w:.235,d:.102},
 {id:'sunday-denim',name:'Sunday Straight Denim',type:'trousers',fabric:'denim',color:'#6683a0',background:'#dce7ed',body:.99},
 {id:'ink-trousers',name:'Ink Pleated Trousers',type:'trousers',fabric:'linen',color:'#3e454b',background:'#e5e3df',body:1.04,pleats:true},
 {id:'apricot-slip',name:'Apricot Slip Dress',type:'dress',fabric:'silk',color:'#c99c7d',background:'#efe1d7',body:1.04,w:.225,d:.10},
 {id:'tide-shirt',name:'Tide Stripe Shirt',type:'shirt',fabric:'cotton',color:'#81a4ad',background:'#e0e8e9',collar:true,sleeve:.46,body:.71,w:.24,d:.112,buttons:true,stripe:true},
 {id:'oat-vest',name:'Oat Knit Vest',type:'vest',fabric:'knit',color:'#bfae90',background:'#ebe5d8',body:.62,w:.228,d:.105},
 {id:'lilac-wrap',name:'Lilac Wrap Top',type:'wrap',fabric:'silk',color:'#aaa0b9',background:'#e6e0ec',body:.60,w:.23,d:.11,sleeve:.31},
 {id:'rose-jacket',name:'Rose Chore Jacket',type:'shirt',fabric:'denim',color:'#ab7d79',background:'#eee1dd',collar:true,sleeve:.46,body:.63,w:.258,d:.127,buttons:true,pockets:true},
 {id:'sage-skirt',name:'Sage Midi Skirt',type:'skirt',fabric:'linen',color:'#8f9f8d',background:'#e6eadf',body:.83},
 {id:'my-blue-blouse',name:'My Blue Blouse',type:'blouse',fabric:'silk',color:'#7a9db5',background:'#e0e9ef',body:.63,w:.24,d:.12,sleeve:.31,neck:'round',gather:true},
];

function color(hex){return new THREE.Color(hex);}
function material(name,base,fabric,extra={}){
 return new THREE.MeshStandardMaterial({name,color:base,roughness:fabricTypes[fabric]?.roughness??.9,metalness:0,side:THREE.DoubleSide,...extra});
}
function geometry(rows,cols,fn,reverse=false){
 const pos=[],uv=[],idx=[];
 for(let r=0;r<=rows;r++)for(let c=0;c<=cols;c++){pos.push(...fn(r/rows,c/cols));uv.push(c/cols,r/rows);}
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const a=r*(cols+1)+c,b=a+1,d=a+cols+1,e=d+1;
  if(reverse)idx.push(a,d,b,b,d,e);else idx.push(a,b,d,b,e,d);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function mesh(group,name,g,m){const o=new THREE.Mesh(g,m);o.name=name;group.add(o);return o;}
function curve(group,name,pts,r,m,segments=48){return mesh(group,name,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p))),segments,r,4,false),m);}
function box(group,name,dim,pos,m){const o=mesh(group,name,new THREE.BoxGeometry(...dim),m);o.position.set(...pos);return o;}
function sphere(group,name,pos,r,m,scale=[1,1,1]){const o=mesh(group,name,new THREE.SphereGeometry(r,10,6),m);o.position.set(...pos);o.scale.set(...scale);return o;}
function profileSample(p,t){let k=0;while(k<p.length-2&&t>p[k+1][0])k++;const a=p[k],b=p[k+1],q=clamp((t-a[0])/(b[0]-a[0]),0,1),p0=p[Math.max(0,k-1)],p3=p[Math.min(p.length-1,k+2)];return a.slice(1).map((v,i)=>{const n=i+1;return .5*((2*v)+(-p0[n]+b[n])*q+(2*p0[n]-5*v+4*b[n]-p3[n])*q*q+(-p0[n]+3*v-3*b[n]+p3[n])*q*q*q);});}

function makeShirt(s){
 const g=new THREE.Group();g.name=s.id;const m=material(`${s.fabric}-woven-shell`,s.color,s.fabric);
 m.userData={fabric:s.fabric,stripe:s.stripe};
 const seam=material('slightly-raised-sewn-seam',color(s.color).multiplyScalar(.88),s.fabric);
 const trim=material('folded-collar-and-cuffs',color(s.color).multiplyScalar(.94),s.fabric);
 const dark=material('inside-neck-shadow',color(s.color).multiplyScalar(.67),s.fabric);
 const button=material('matte-corozo-buttons','#d3cab8','cotton');
 const hem=-s.body/2,top=s.body/2;
 const pr=[[0,s.w*1.00,s.d*.90],[.30,s.w*.93,s.d],[.67,s.w*1.01,s.d*1.02],[.8,s.w*1.035,s.d*.94],[.88,s.w*1.02,s.d*.77],[.93,s.w*.9,s.d*.65],[1,.088,.061]];
 const opening=s.open?.25:0;
 function body(t,u,off=0){
  const theta=opening+(PI*2-opening*2)*u;
  const [w,d]=profileSample(pr,t);
  const folds=(Math.sin(theta*9+t*2.5)+.35*Math.sin(theta*17-t*9))*.0042*Math.sin(PI*t*.91)+Math.sin(t*62+Math.abs(Math.sin(theta))*17)*.0025*Math.exp(-(((t-.68)/.18)**2))*Math.abs(Math.sin(theta));
  const soft=s.fabric==='knit'?1.65:s.fabric==='silk'?1.45:s.fabric==='linen'?1.45:1.18;
  const hemWave=Math.sin(theta*5+.8)*.008*(1-t)**5;
  const x=Math.sin(theta)*(w+folds*soft);
  const z=Math.cos(theta)*(d+folds*soft+off);
  const vestNeck=s.type==='vest'&&Math.cos(theta)>0?-.11*Math.cos(theta)**2*Math.max(0,(t-.7)/.3)**3:0;
  const y=lerp(hem,top,t)+hemWave+(t>.8?Math.sin(theta)**2*.024*Math.sin((t-.8)*PI/.2):0)+vestNeck;
  return[x,y,z];
 }
 const bodyGeometry=geometry(36,56,(t,u)=>body(t,u));
 if(s.type==='vest'){
  const old=Array.from(bodyGeometry.index.array),filtered=[];
  for(let i=0;i<old.length;i+=3){const ids=old.slice(i,i+3);const t=ids.reduce((sum,n)=>sum+Math.floor(n/57)/36,0)/3,u=ids.reduce((sum,n)=>sum+(n%57)/56,0)/3,a=u*PI*2;const delta=Math.min(Math.abs(a-PI/2),Math.abs(a-PI*1.5));if(((t-.82)/.165)**2+(delta/.41)**2>=1)filtered.push(...ids);}
  bodyGeometry.setIndex(filtered);bodyGeometry.computeVertexNormals();
 }
 mesh(g,'hollow-tailored-body',bodyGeometry,m);
 // Neck facing makes the thickness/opening legible without filling the hollow torso.
 mesh(g,'inside-neck-facing',geometry(5,50,(t,u)=>{const p=body(1-t*.05,u,-.002);p[1]-=.012*t;return p;},true),dark);
 const ring=t=>Array.from({length:61},(_,i)=>body(t,i/60,.0009));
 curve(g,'double-stitched-hem',ring(.008),.0022,seam,90);
 if(s.pockets)curve(g,'back-yoke-seam',Array.from({length:33},(_,i)=>body(.82,.27+i/32*.46,.001)),.0012,seam,40);
 if(s.open){
  for(const u of [0,1]){
   mesh(g,`ribbed-open-front-${u}`,geometry(36,3,(t,q)=>body(t,clamp(u+(u===0?1:-1)*q*.02,0,1),.003)),trim);
   curve(g,`open-front-fold-${u}`,Array.from({length:42},(_,i)=>body(i/41,u,.003)),.0021,seam,48);
  }
  // Raised knit ribs along cuffs and lower welt.
  for(let i=0;i<21;i++)curve(g,`knit-rib-${i}`,Array.from({length:6},(_,j)=>body(j*.008,(i+1)/22,.0018)),.001,seam,6);
 }else if(s.buttons){
  mesh(g,'folded-front-placket',geometry(32,3,(t,u)=>{const p=body(t,.5+u*.018-.009);p[2]=-p[2]+.004;return p;},true),trim);
  for(let i=0;i<6;i++){const t=.13+i*.137;const p=body(t,0,.009);sphere(g,`button-${i+1}`,p,.0058,button,[1,1,.33]);for(const dx of [-.0012,.0012])sphere(g,`button-hole-${i}-${dx}`,[p[0]+dx,p[1],p[2]+.0021],.00065,seam);}
  for(const dx of [-.013,.013])curve(g,'placket-edge',Array.from({length:35},(_,i)=>{const p=body(i/34,0,.006);p[0]=dx;return p;}),.00125,seam,42);
 }
 if(s.collar){
  // Curved rear collar band, then two sculpted pointed front leaves.
  mesh(g,'standing-collar-band',geometry(6,42,(t,u)=>{const a=.23+(PI*2-.46)*u;return[Math.sin(a)*(.09+t*.01),top-.01+t*.034,Math.cos(a)*(.065+t*.016)];}),trim);
  for(const side of [-1,1]){
   const pts=[[side*.015,top+.012,.078],[side*.076,top+.017,.064],[side*.119,top-.074,.088],[side*.06,top-.056,.139]];
   mesh(g,`pointed-collar-${side}`,geometry(7,10,(t,u)=>{
    const a=pts[0].map((v,i)=>lerp(v,pts[3][i],t));const b=pts[1].map((v,i)=>lerp(v,pts[2][i],t));return a.map((v,i)=>lerp(v,b[i],u)+(i===2?Math.sin(PI*u)*Math.sin(PI*t)*.011:0));
   },side<0),trim);
   curve(g,`collar-topstitch-${side}`,[pts[0],pts[3],pts[2],pts[1]],.0009,seam,22);
  }
 }else{
  curve(g,'soft-neck-binding',ring(1),s.type==='vest'?.005:.0035,trim,60);
 }
 if(s.type!=='vest')for(const side of [-1,1]){
  const armStart=new THREE.Vector3(side*(s.w*.70),top-.095,0);
  const armEnd=new THREE.Vector3(side*(s.w*.90+s.sleeve*.43),top-.125-s.sleeve*.80,.018);
  const dir=armEnd.clone().sub(armStart).normalize();const front=new THREE.Vector3(0,0,1);const cross=new THREE.Vector3().crossVectors(dir,front).normalize();
  const short=s.sleeve<.25;const cuffWidth=s.type==='blouse'?.066:s.open?.057:.047;
  const tube=(t,u,extra=0)=>{
   const a=u*PI*2;const cap=clamp(t/.19,0,1);const radius=(lerp(.081,cuffWidth,t)+(s.type==='blouse'?Math.sin(PI*t)*.027:s.open?Math.sin(PI*t)*.014:Math.sin(PI*t)*.005))*(.07+.93*cap*cap*(3-2*cap));
   const ripple=Math.sin(a*7+t*9)*.0032*Math.sin(PI*t)+Math.sin(t*32+a*2)*.0015;
   const p=armStart.clone().lerp(armEnd,t).addScaledVector(cross,Math.sin(a)*(radius+ripple+extra)).addScaledVector(front,Math.cos(a)*(radius*.88+ripple+extra));
   p.y-=Math.sin(PI*t)*.008;return p.toArray();
  };
  mesh(g,`hollow-${side<0?'left':'right'}-sleeve`,geometry(short?20:28,28,(t,u)=>tube(t,u)),m);
  // The root is hidden inside the torso: a curved cap is sewn into the armhole.
  curve(g,`underarm-seam-${side}`,Array.from({length:32},(_,i)=>tube(i/31,.75,.001)),.0014,seam,32);
  mesh(g,`open-cuff-facing-${side}`,geometry(5,30,(t,u)=>tube(.945+t*.055,u,.002)),trim);
  curve(g,`cuff-hem-${side}`,Array.from({length:31},(_,i)=>tube(.985,i/30,.002)),.00165,seam,42);
  if(!short)sphere(g,`cuff-button-${side}`,tube(.973,.1,.003),.0052,button,[1,1,.4]);
  if(s.open)for(let i=0;i<28;i++)curve(g,`cuff-knit-rib-${side}-${i}`,[tube(.94,i/28,.0028),tube(1,i/28,.0028)],.001,seam,3);
  if(s.id==='cloud-poplin'&&side===1){
   const wear=material('authored-cuff-friction-mark','#9b8e77','cotton');
   // Conforms to the ACTUAL outer front cuff rather than approximate global coordinates.
   mesh(g,'right-cuff-wear-patch',geometry(9,28,(r,u)=>{const a=u*PI*2,irregular=1+.12*Math.sin(a*5)+.06*Math.cos(a*9);return tube(.966+Math.sin(a)*r*.025,Math.cos(a)*r*.041*irregular,.0038);}),wear);
   const threadMaterial=material('loose-original-cuff-thread','#8d816b','cotton');
   for(let i=0;i<5;i++){
    const a=tube(.982,.007+i*.007,.0045),b=tube(.998,.009+i*.007,.0055);b[1]-=.008;b[2]+=.003;
    curve(g,`right-cuff-wear-thread-${i}`,[a,b],.00065,threadMaterial,5);
   }
  }
 }
 if(s.pockets){
  for(const side of [-1,1]){
   const px=side*.135,py=top-.21;
   const pocket=(t,u)=>[px+(u-.5)*.115,py-t*.118,.112+Math.sin(PI*u)*.014+Math.sin(PI*t)*.007];
   mesh(g,`hollow-patch-pocket-${side}`,geometry(14,15,pocket),trim);
   curve(g,`pocket-top-opening-${side}`,Array.from({length:14},(_,i)=>pocket(0,i/13)),.002,seam,20);
   curve(g,`pocket-u-seam-${side}`,[pocket(0,0),pocket(.9,0),pocket(1,.1),pocket(1,.9),pocket(.9,1),pocket(0,1)],.0015,seam,28);
  }
 }
 if(s.type==='wrap'){
  curve(g,'diagonal-wrap-fold',[[-.079,top-.003,.065],[-.024,top-.06,.103],[.087,top-.195,.113],[.13,hem+.13,.113]],.0028,trim,40);
  mesh(g,'flat-wrap-belt',geometry(3,25,(t,u)=>{const a=(u-.5)*PI;return[Math.sin(a)*.236,hem+.10+t*.03,Math.cos(a)*.112+.008];}),trim);
  curve(g,'self-fabric-wrap-tie',[[.15,hem+.115,.125],[.22,hem+.104,.14],[.26,hem+.03,.116],[.23,hem-.033,.077]],.006,trim,28);
 }
 // The tiny brand label is an authored garment feature, separate from evidence claims.
 if(s.id==='cloud-poplin'){
  box(g,'woven-neck-label',[.070,.040,.0018],[0,top-.045,-.058],material('ivory-woven-label','#eae4d8','cotton'));
  const print=material('original-readable-label-print','#ffffff','cotton');print.userData={fabric:'cotton',diffusePng:labelPrintPng()};
  const labelGeometry=new THREE.PlaneGeometry(.067,.036);for(let i=1;i<labelGeometry.attributes.uv.array.length;i+=2)labelGeometry.attributes.uv.array[i]=1-labelGeometry.attributes.uv.array[i];
  const printMesh=mesh(g,'woven-neck-label-print',labelGeometry,print);printMesh.position.set(0,top-.045,-.0567);
 }else{
  box(g,'woven-neck-label',[.045,.019,.0016],[0,top-.019,-.06],material('ivory-woven-label','#eae4d8','cotton'));
  for(let i=0;i<5;i++)box(g,`label-thread-${i}`,[.0022,.009,.0017],[-.012+i*.006,top-.019,-.0587],seam);
 }
 return g;
}

function makeBottom(s){
 const g=new THREE.Group();g.name=s.id;const m=material(`${s.fabric}-fabric`,s.color,s.fabric);m.userData={fabric:s.fabric};const seam=material('sewn-edges',color(s.color).multiplyScalar(.78),s.fabric);const trim=material('folded-waistband',color(s.color).multiplyScalar(.92),s.fabric);
 const top=s.body/2,bottom=-s.body/2;
 if(s.type==='trousers'){
  mesh(g,'hollow-tailored-hip',geometry(18,50,(t,u)=>{const a=u*PI*2,w=lerp(.18,.205,t),d=lerp(.078,.10,t);return[Math.sin(a)*w,top-t*.25-(1-Math.abs(Math.sin(a)))*.065*t**3,Math.cos(a)*d];}),m);
  for(const side of [-1,1]){
   const leg=(t,u)=>{const a=u*PI*2;const root=clamp(t/.16,0,1),r=lerp(.11,.09,t)*(.39+.61*root*root*(3-2*root));return[side*(.095+t*.024)+Math.sin(a)*(r+Math.sin(a*5+t*4)*.005),top-.14-t*(s.body-.14),Math.cos(a)*(r*.76+Math.sin(a*5+t*7)*.005)];};
   mesh(g,`open-tapered-leg-${side}`,geometry(44,34,leg),m);
   curve(g,`trouser-leg-hem-${side}`,Array.from({length:35},(_,i)=>leg(.985,i/34)),.002,seam,42);
   curve(g,`pressed-leg-line-${side}`,Array.from({length:38},(_,i)=>{const p=leg(i/37,0);p[2]+=.002;return p;}),s.pleats?.002:.001,seam,40);
   curve(g,`outer-leg-seam-${side}`,Array.from({length:38},(_,i)=>leg(i/37,side>0?.25:.75)),.0015,seam,40);
  }
  curve(g,'zip-fly',[[0,top-.05,.081],[.004,top-.15,.101],[.014,top-.23,.111]],.0015,seam,18);
  for(const side of [-1,1])curve(g,`hip-pocket-stitch-${side}`,[[side*.058,top-.04,.079],[side*.105,top-.12,.092],[side*.182,top-.16,.083]],.0015,seam,24);
 }else{
  const surface=(t,u)=>{const a=u*PI*2,w=lerp(.17,.32,t),d=lerp(.074,.135,t),f=Math.sin(a*11+t*2)*.008*(.3+t);return[Math.sin(a)*(w+f),lerp(top,bottom,t)+Math.sin(a*4)*.006*t**4,Math.cos(a)*(d+f)];};
  mesh(g,'hollow-flared-skirt',geometry(46,64,surface),m);curve(g,'skirt-hem',Array.from({length:65},(_,i)=>surface(.99,i/64)),.002,seam,84);
 }
 const waist=t=>Array.from({length:51},(_,i)=>{const a=i/50*PI*2;return[Math.sin(a)*.18,top-t,Math.cos(a)*.079];});
 mesh(g,'hollow-waistband',geometry(4,50,(t,u)=>{const a=u*PI*2;return[Math.sin(a)*.181,top-t*.041,Math.cos(a)*.08];}),trim);
 curve(g,'waistband-top-stitch',waist(.004),.0015,seam,64);curve(g,'waistband-lower-stitch',waist(.037),.0015,seam,64);
 return g;
}
function makeDress(s){
 const g=new THREE.Group();g.name=s.id;const m=material('fluid-satin-shell',s.color,'silk');m.userData={fabric:'silk'};const seam=material('bias-sewn-edge',color(s.color).multiplyScalar(.82),'silk');
 const pr=[[0,.315,.126],[.4,.235,.115],[.72,.17,.09],[.9,.198,.103],[1,.16,.082]];
 const surface=(t,u)=>{const a=u*PI*2,[w,d]=profileSample(pr,t),f=Math.sin(a*9+t*4)*.007*Math.sin(PI*t);return[Math.sin(a)*(w+f),lerp(-s.body/2,s.body/2-.085,t)-Math.cos(a)**2*.04*t**10,Math.cos(a)*(d+f)];};
 mesh(g,'hollow-bias-cut-dress',geometry(55,64,surface),m);
 for(const t of [.006,1])curve(g,t===1?'soft-scoop-neckline':'dress-hem',Array.from({length:65},(_,i)=>surface(t,i/64)),.002,seam,88);
 for(const side of [-1,1])curve(g,`satin-shoulder-strap-${side}`,[[side*.12,s.body/2-.124,.065],[side*.115,s.body/2,.016],[side*.12,s.body/2-.119,-.065]],.008,m,35);
 return g;
}
function makeVest(s){
 const g=new THREE.Group();g.name=s.id;const m=material('soft-knit-vest',s.color,'knit');m.userData={fabric:'knit'};const edge=material('ribbed-arm-and-neck-binding',color(s.color).multiplyScalar(.83),'knit');
 const bottom=-s.body/2,top=s.body/2;
 const topProfile=[[0,-.115],[.38,-.019],[.68,-.022],[1,-.19]];
 function panel(t,u,side){const q=u*2-1,w=s.w*(1-.055*t),x=q*w;let ytop=top+profileSample(topProfile,Math.abs(q))[0];if(side<0&&Math.abs(q)<.38)ytop=top-.027;const y=lerp(bottom,ytop,t);const fold=(Math.sin(u*28+t*3)+.3*Math.sin(u*57-t*8))*.0045*Math.sin(PI*t);const z=side*(s.d*(.2+.75*Math.sqrt(Math.max(0,1-q*q)))+fold);return[x,y,z];}
 for(const side of [-1,1]){
  mesh(g,side<0?'knit-vest-back-panel':'knit-vest-front-panel',geometry(38,60,(t,u)=>panel(t,u,side),side<0),m);
  curve(g,`vest-neck-shoulder-arm-binding-${side}`,Array.from({length:61},(_,i)=>panel(1,i/60,side)),.004,edge,88);
  curve(g,`vest-lower-welt-${side}`,Array.from({length:61},(_,i)=>panel(.014,i/60,side)),.003,edge,72);
 }
 for(const u of [0,1])mesh(g,`vest-sewn-side-${u}`,geometry(28,8,(t,q)=>{const a=panel(t,u,-1),b=panel(t,u,1);return a.map((v,i)=>lerp(v,b[i],q));},u===0),m);
 for(const side of [-1,1])mesh(g,`vest-shoulder-strap-${side}`,geometry(8,12,(t,u)=>{const q=side*(.41+u*.23),v=(q+1)/2,a=panel(1,v,-1),b=panel(1,v,1);return a.map((n,i)=>lerp(n,b[i],t)+(i===1?Math.sin(PI*t)*.004:0));}),m);
 return g;
}
function makeGarment(s){return s.type==='trousers'||s.type==='skirt'?makeBottom(s):s.type==='dress'?makeDress(s):s.type==='vest'?makeVest(s):makeShirt(s);}

// Small deterministic PNG encoder used for original fabric normal maps and posters.
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(buf){let n=0xffffffff;for(const b of buf)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),o=Buffer.alloc(data.length+12);o.writeUInt32BE(data.length,0);t.copy(o,4);data.copy(o,8);o.writeUInt32BE(crc(Buffer.concat([t,data])),data.length+8);return o;}
function png(w,h,rgba){const head=Buffer.alloc(13);head.writeUInt32BE(w,0);head.writeUInt32BE(h,4);head[8]=8;head[9]=6;const rows=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*w*4,w*4).copy(rows,y*(w*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',head),chunk('IDAT',zlib.deflateSync(rows,{level:8})),chunk('IEND',Buffer.alloc(0))]);}
function normalPng(fabric){const n=64,a=new Uint8Array(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const i=(y*n+x)*4,k=fabric==='knit'?1.9:1,warp=Math.sin(x*PI/2)*18*k,weft=Math.sin(y*PI/2)*18*k;a[i]=128+warp;a[i+1]=128+weft+(fabric==='linen'?Math.sin((x+y)*.9)*10:0);a[i+2]=246;a[i+3]=255;}return png(n,n,a);}
function labelPrintPng(){
 const w=512,h=320,a=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=(y*w+x)*4,grain=((x+y)%3===0?1:0);a[at]=240-grain;a[at+1]=237-grain;a[at+2]=226-grain;a[at+3]=255;}
 const glyph={
 'F':['11111','10000','10000','11110','10000','10000','10000'],'A':['01110','10001','10001','11111','10001','10001','10001'],'M':['10001','11011','10101','10101','10001','10001','10001'],'I':['11111','00100','00100','00100','00100','00100','11111'],'L':['10000','10000','10000','10000','10000','10000','11111'],'R':['11110','10001','10001','11110','10100','10010','10001'],
 'S':['01111','10000','10000','01110','00001','00001','11110'],'Z':['11111','00001','00010','00100','01000','10000','11111'],'E':['11111','10000','10000','11110','10000','10000','11111'],'C':['01111','10000','10000','10000','10000','10000','01111'],'O':['01110','10001','10001','10001','10001','10001','01110'],'T':['11111','00100','00100','00100','00100','00100','00100'],'N':['10001','11001','10101','10011','10001','10001','10001'],
 '3':['11110','00001','00001','01110','00001','00001','11110'],'0':['01110','10001','10011','10101','11001','10001','01110'],'°':['01110','01010','01110','00000','00000','00000','00000'],'W':['10001','10001','10001','10101','10101','11011','10001'],'H':['10001','10001','10001','11111','10001','10001','10001'],' ':Array(7).fill('00000')};
 function draw(text,y,scale){const textW=(text.length*6-1)*scale,ox=Math.round((w-textW)/2);for(let i=0;i<text.length;i++)for(let r=0;r<7;r++)for(let c=0;c<5;c++)if(glyph[text[i]][r][c]==='1')for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++){const at=((y+r*scale+yy)*w+ox+(i*6+c)*scale+xx)*4;a[at]=44;a[at+1]=43;a[at+2]=40;}}
 draw('FAMILIAR',27,5);draw('SIZE M',91,7);draw('COTTON',169,6);draw('30° WASH',244,5);
 return png(w,h,a);
}

function exportGLB(group,s){
 group.updateMatrixWorld(true);
 const parts=[],views=[],accessors=[],meshes=[],nodes=[],materials=[],images=[],textures=[];
 let offset=0;const materialMap=new Map();
 function addBuffer(b,target){const pad=(4-b.length%4)%4,idx=views.length;views.push({buffer:0,byteOffset:offset,byteLength:b.length,...(target?{target}: {})});parts.push(b);if(pad)parts.push(Buffer.alloc(pad));offset+=b.length+pad;return idx;}
 function attr(arr,type,components,componentType,target){const b=Buffer.from(arr.buffer,arr.byteOffset,arr.byteLength),view=addBuffer(b,target),min=Array(components).fill(Infinity),max=Array(components).fill(-Infinity);for(let i=0;i<arr.length;i++)min[i%components]=Math.min(min[i%components],arr[i]),max[i%components]=Math.max(max[i%components],arr[i]);const id=accessors.length;accessors.push({bufferView:view,componentType,count:arr.length/components,type,...(type==='VEC3'?{min,max}:{})});return id;}
 function materialId(m){if(materialMap.has(m))return materialMap.get(m);const i=materials.length,fabric=m.userData.fabric??s.fabric;
  function addImage(bytes,name){const image=images.length,index=textures.length;images.push({bufferView:addBuffer(bytes),mimeType:'image/png',name});textures.push({sampler:0,source:image});return index;}
  const normal=addImage(normalPng(fabric),`original-${fabric}-micro-weave`),baseColor=m.userData.diffusePng?addImage(m.userData.diffusePng,'original-fixture-label-print-512x320'):undefined;
  materials.push({name:m.name,pbrMetallicRoughness:{baseColorFactor:[m.color.r,m.color.g,m.color.b,1],...(baseColor!==undefined?{baseColorTexture:{index:baseColor}}:{}),metallicFactor:0,roughnessFactor:m.roughness},normalTexture:{index:normal,scale:fabricTypes[fabric]?.normal??.1,extensions:{KHR_texture_transform:{scale:[8,8]}}},doubleSided:true});materialMap.set(m,i);return i;
 }
 group.traverse(o=>{if(!o.isMesh)return;const ge=o.geometry;const position=attr(ge.attributes.position.array,'VEC3',3,5126,34962),normal=attr(ge.attributes.normal.array,'VEC3',3,5126,34962),uv=attr(ge.attributes.uv.array,'VEC2',2,5126,34962),indices=attr(ge.index.array,'SCALAR',1,ge.index.array.BYTES_PER_ELEMENT===2?5123:5125,34963);const mi=meshes.length;meshes.push({name:o.name,primitives:[{attributes:{POSITION:position,NORMAL:normal,TEXCOORD_0:uv},indices,material:materialId(o.material)}]});nodes.push({name:o.name,mesh:mi,matrix:o.matrixWorld.toArray()});});
 const json={asset:{version:'2.0',generator:'Familiar original procedural garment workshop',copyright:'Original Familiar assets, CC0-1.0'},extensionsUsed:['KHR_texture_transform'],scene:0,scenes:[{name:s.id,nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,images,textures,samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],accessors,bufferViews:views,buffers:[{byteLength:offset}],extras:{origin:'Original authored geometry; no scanned garments or stock models',units:'metres',front:'+Z',fabric:s.fabric,notMeasuredRealGarment:true}};
 const text=Buffer.from(JSON.stringify(json));const jsonBuf=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),bin=Buffer.concat(parts),head=Buffer.alloc(12),jhead=Buffer.alloc(8),bhead=Buffer.alloc(8);head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+jsonBuf.length+8+bin.length,8);jhead.writeUInt32LE(jsonBuf.length,0);jhead.writeUInt32LE(0x4e4f534a,4);bhead.writeUInt32LE(bin.length,0);bhead.writeUInt32LE(0x004e4942,4);return{data:Buffer.concat([head,jhead,jsonBuf,bhead,bin]),json};
}

/** CPU triangle studio renderer. Exact authored mesh is rendered; no proxy outline. */
function render(group,s,{width=800,height=1000,view='front'}={}){
 group.updateMatrixWorld(true);
 const pixels=new Uint8Array(width*height*4),depth=new Float32Array(width*height).fill(-Infinity);
 const bg=color(s.background);const rgb=[bg.r,bg.g,bg.b].map(v=>Math.round(srgb(v)*255));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4;const glow=3*Math.exp(-(((x-width*.42)/width)**2+((y-height*.25)/height)**2)*3);
  const shadow=1-.13*Math.exp(-(((x-width*.51)/(width*.23))**2+((y-height*.90)/(height*.031))**2));
  for(let c=0;c<3;c++)pixels[i+c]=clamp((rgb[c]+glow)*shadow,0,255);pixels[i+3]=255;
 }
 const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const rot=new THREE.Matrix4().makeRotationY(view==='front'?-.12:view==='label'?.3:view==='wear'?-.05:.26);
 const normRot=new THREE.Matrix3().setFromMatrix4(rot);
 let scale=Math.min(width*.81/size.x,height*.80/size.y),cx=width*.5,cy=height*.46;
 let focus=center.clone();
 if(view==='label'){scale=width*4.7;focus=new THREE.Vector3(0,s.body/2-.025,0);cy=height*.53;}
 if(view==='surface'){scale=width*3.2;focus=new THREE.Vector3(-.095,.01,.08);cy=height*.48;}
 if(view==='wear'){scale=width*4.8;focus=new THREE.Vector3(.395,s.body/2-.097-s.sleeve*.78,.02);cy=height*.51;}
 const light=new THREE.Vector3(-.65,.78,1.7).normalize(),fill=new THREE.Vector3(.9,.4,.6).normalize();
 const v=new THREE.Vector3(),n=new THREE.Vector3(),vertices=[];
 group.traverse(o=>{
  if(!o.isMesh)return;const p=o.geometry.attributes.position,norm=o.geometry.attributes.normal,uv=o.geometry.attributes.uv,idx=o.geometry.index.array;
  const normalMatrix=new THREE.Matrix3().getNormalMatrix(o.matrixWorld);vertices.length=0;
  for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).sub(focus).applyMatrix4(rot);n.fromBufferAttribute(norm,i).applyMatrix3(normalMatrix).applyMatrix3(normRot).normalize();vertices.push([cx+v.x*scale,cy-v.y*scale,v.z,n.x,n.y,n.z,uv.getX(i),uv.getY(i)]);}
  const mc=o.material.color,base=[mc.r,mc.g,mc.b];const fab=o.material.userData.fabric??s.fabric;
  for(let i=0;i<idx.length;i+=3){
   const a=vertices[idx[i]],b=vertices[idx[i+1]],c=vertices[idx[i+2]];
   const x0=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),x1=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0]))),y0=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),y1=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   if(x0>x1||y0>y1)continue;
   const area=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(area)<.001)continue;
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const q=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/area;
    const r=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/area;const t=1-q-r;if(q<0||r<0||t<0)continue;
    const z=q*a[2]+r*b[2]+t*c[2],at=y*width+x;if(z<=depth[at])continue;depth[at]=z;
    let nx=q*a[3]+r*b[3]+t*c[3],ny=q*a[4]+r*b[4]+t*c[4],nz=q*a[5]+r*b[5]+t*c[5];const l=Math.hypot(nx,ny,nz)||1;nx/=l;ny/=l;nz/=l;
    if(nz<0)nx*=-1,ny*=-1,nz*=-1;
    const u=q*a[6]+r*b[6]+t*c[6],vv=q*a[7]+r*b[7]+t*c[7];
    const weave=(Math.sin(u*1600)+Math.sin(vv*1600))*(fab==='knit'?.025:.013)+Math.sin(u*97+vv*213)*.007;
    const diffuse=Math.max(0,nx*light.x+ny*light.y+nz*light.z),fillD=Math.max(0,nx*fill.x+ny*fill.y+nz*fill.z);
    let lit=.52+.42*diffuse+.10*fillD+weave;
    if(o.material.userData.stripe)lit*=Math.sin(u*128)>.62?.79:1;
    const shininess=fab==='silk'?42:90,spec=Math.max(0,nz*.96+ny*.25-nx*.1)**shininess*(fab==='silk'?.065:.018);
    for(let k=0;k<3;k++)pixels[at*4+k]=clamp(srgb(Math.max(0,base[k]*lit+spec))*255,0,255);
   }
  }
 });
 return png(width,height,pixels);
}
function poster(id,name,pngBytes,bg,extra=''){
 const b64=pngBytes.toString('base64');return`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="1000" viewBox="0 0 800 1000" role="img" aria-labelledby="title desc"><title id="title">${name}</title><desc id="desc">Original studio illustration of ${name.toLowerCase()}, rendered directly from authored hollow garment geometry. ${extra}</desc><!-- Reproducible original Familiar model-based studio render; CC0-1.0. No source photograph. --><rect width="800" height="1000" fill="${bg}"/><image width="800" height="1000" xlink:href="data:image/png;base64,${b64}"/></svg>`;
}

// The standard path uses an actual Three.js GLTFLoader/WebGL studio in Chromium.
// The CPU mesh renderer above is an explicit regeneration fallback for machines
// without a browser, and still renders the exact geometry rather than a silhouette.
let browser,server,page,renderOrigin;
const renderModels=new Map();
const renderHTML=`<!doctype html><html><head><style>html,body{margin:0;background:transparent}canvas{display:block}</style><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></head><body><script type="module">
import * as T from 'three';import{GLTFLoader}from'three/addons/loaders/GLTFLoader.js';
const renderer=new T.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});renderer.setSize(800,1000);renderer.setPixelRatio(1);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;document.body.append(renderer.domElement);
window.renderGarment=async(id,bg,view='front')=>{
 const scene=new T.Scene();scene.background=new T.Color(bg);const camera=new T.OrthographicCamera(-.5,.5,.625,-.625,.01,15);
 const model=(await new GLTFLoader().loadAsync('/render-model/'+id+'.glb')).scene;
 const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());model.position.sub(center);scene.add(model);model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.normalScale?.multiplyScalar(.58);}});
 const scale=Math.min(.84/size.x,1.0/size.y);camera.zoom=scale;camera.updateProjectionMatrix();
 camera.position.set(.65,.38,4);camera.lookAt(0,0,0);
 if(view==='threequarter'){camera.position.set(1.6,.35,4);camera.lookAt(0,0,0);}
 if(view==='label'){camera.zoom=7.8;camera.position.set(0,2.8,2);camera.lookAt(0,.285,-.0567);camera.updateProjectionMatrix();}
 if(view==='surface'){camera.zoom=3.8;camera.position.set(.25,.12,3);camera.lookAt(-.08,-.04,.08);camera.updateProjectionMatrix();}
 if(view==='wear'){camera.zoom=9;camera.position.set(.43,-.17,3);camera.lookAt(.415,-.181,.065);camera.updateProjectionMatrix();}
 const hemi=new T.HemisphereLight(0xffffff,0xb4a99a,1.0);scene.add(hemi);
 const light=new T.DirectionalLight(0xffffff,3.0);light.position.set(-1.8,2.8,1.2);light.castShadow=true;light.shadow.mapSize.set(1024,1024);light.shadow.camera.left=-.9;light.shadow.camera.right=.9;light.shadow.camera.top=.9;light.shadow.camera.bottom=-.9;light.shadow.bias=-.00005;light.shadow.normalBias=.002;light.shadow.radius=4;scene.add(light);
 const fill=new T.DirectionalLight(0xe9efff,.6);fill.position.set(1.2,.3,-1);scene.add(fill);
 const floor=new T.Mesh(new T.PlaneGeometry(20,20),new T.ShadowMaterial({opacity:.15}));floor.rotation.x=-Math.PI/2;floor.position.y=-size.y/2-.10;floor.receiveShadow=true;scene.add(floor);
 await new Promise(r=>requestAnimationFrame(r));renderer.render(scene,camera);await new Promise(r=>requestAnimationFrame(r));renderer.render(scene,camera);
 const result=renderer.domElement.toDataURL('image/png');scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.normalMap?.dispose();m.dispose();}}});return result;
};window.ready=true;
</script></body></html>`;
let renderingMethod='CPU exact-mesh studio render';
try{
 server=http.createServer((req,res)=>{
  if(req.url==='/'){res.setHeader('content-type','text/html');return res.end(renderHTML);}
  if(req.url.startsWith('/render-model/')){res.setHeader('content-type','model/gltf-binary');return res.end(renderModels.get(req.url.split('/').pop().replace('.glb','')));}
  const f=path.resolve(ROOT,'.'+decodeURIComponent(req.url));if(!f.startsWith(ROOT)||!fs.existsSync(f)){res.writeHead(404);return res.end();}res.setHeader('content-type',f.endsWith('.js')?'application/javascript':'application/octet-stream');res.end(fs.readFileSync(f));
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));renderOrigin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl']});page=await browser.newPage({viewport:{width:800,height:1000}});page.on('pageerror',e=>console.error('studio:',e.message));await page.goto(renderOrigin);await page.waitForFunction(()=>window.ready);renderingMethod='Three.js GLTFLoader / Chromium WebGL studio render';
}catch(e){console.warn('Browser rendering unavailable; using exact-mesh CPU fallback:',e.message);await browser?.close();browser=undefined;server?.close();}
async function studio(group,s,view='front'){
 if(!browser)return render(group,s,{view});renderModels.set(s.id,exportGLB(group,s).data);const data=await page.evaluate(async({id,bg,view})=>await window.renderGarment(id,bg,view),{id:s.id,bg:s.background,view});return Buffer.from(data.split(',')[1],'base64');
}


// Editable brand paths are included verbatim so a clean regeneration restores them.
const brandSources = {
  "mark.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" role=\"img\" aria-labelledby=\"familiar-mark-title familiar-mark-desc\" color=\"#25232A\">\n  <title id=\"familiar-mark-title\">Familiar mark</title>\n  <desc id=\"familiar-mark-desc\">An open evidence frame encloses a continuous folded loop: a compact symbol of familiar garments and traceable evidence.</desc>\n  <!-- Construction source: original 64-unit geometric mark. A 5-unit open frame surrounds a 6-unit folded loop, with a diagonal return recalling a garment fold. Rounded joins preserve the silhouette at favicon size. Monochrome, editable SVG paths; no hanger, camera, font, or third-party art. Trademark clearance has not been assessed. -->\n  <g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n    <path id=\"evidence-frame\" stroke-width=\"5\" d=\"M42 8H20C13.37 8 8 13.37 8 20V44C8 50.63 13.37 56 20 56H44C50.63 56 56 50.63 56 44V32\"/>\n    <path id=\"folded-loop\" stroke-width=\"6\" d=\"M41 20H32C27.58 20 24 23.58 24 28V38C24 42.42 27.58 46 32 46H33C37.42 46 41 42.42 41 38C41 33.58 37.42 30 33 30H21M41 20L34 27\"/>\n  </g>\n</svg>\n",
  "familiar-wordmark.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 480 126\" role=\"img\" aria-labelledby=\"familiar-title familiar-desc\">\n  <title id=\"familiar-title\">familiar</title>\n  <desc id=\"familiar-desc\">Original lowercase Familiar wordmark for light surfaces. Quiet rounded sans-serif letterforms, with open counters and a curved lower-case l.</desc>\n  <!-- Construction source: original hand-drawn filled paths on a 65-unit x-height grid; 11-unit stems, 3-unit round overshoot. Each letter remains a named editable path. No font or third-party artwork is embedded. Trademark clearance has not been assessed. -->\n  <g transform=\"translate(8 4)\" fill=\"#25232A\" fill-rule=\"evenodd\">\n    <path id=\"letter-f\" transform=\"translate(0 0)\" d=\"M17 108V53H5V43H17V31C17 15 26 7 41 7C46 7 50 8 54 10L51 20C48 18 45 17 42 17C33 17 28 22 28 31V43H48V53H28V108Z\"/>\n    <path id=\"letter-a-1\" transform=\"translate(63 0)\" d=\"M62 108H51V100C46 107 39 111 29 111C11 111 0 98 0 77C0 56 11 43 29 43C39 43 46 47 51 54V46H62ZM51 77C51 61 43 53 31 53C19 53 11 62 11 77C11 92 19 101 31 101C43 101 51 93 51 77Z\"/>\n    <path id=\"letter-m\" transform=\"translate(139 0)\" d=\"M0 108V46H11V54C15 47 22 43 31 43C41 43 48 48 52 56C57 47 64 43 75 43C91 43 99 53 99 70V108H88V72C88 59 83 53 73 53C61 53 55 62 55 75V108H44V72C44 59 39 53 29 53C17 53 11 62 11 75V108Z\"/>\n    <path id=\"letter-i-1\" transform=\"translate(254 0)\" d=\"M0 46H11V108H0ZM5.5 17C9.4 17 12 19.6 12 23.5C12 27.4 9.4 30 5.5 30C1.6 30 -1 27.4 -1 23.5C-1 19.6 1.6 17 5.5 17Z\"/>\n    <path id=\"letter-l\" transform=\"translate(282 0)\" d=\"M0 8H11V91C11 98 13 101 18 101H22V111H17C5 111 0 106 0 92Z\"/>\n    <path id=\"letter-i-2\" transform=\"translate(319 0)\" d=\"M0 46H11V108H0ZM5.5 17C9.4 17 12 19.6 12 23.5C12 27.4 9.4 30 5.5 30C1.6 30 -1 27.4 -1 23.5C-1 19.6 1.6 17 5.5 17Z\"/>\n    <path id=\"letter-a-2\" transform=\"translate(346 0)\" d=\"M62 108H51V100C46 107 39 111 29 111C11 111 0 98 0 77C0 56 11 43 29 43C39 43 46 47 51 54V46H62ZM51 77C51 61 43 53 31 53C19 53 11 62 11 77C11 92 19 101 31 101C43 101 51 93 51 77Z\"/>\n    <path id=\"letter-r\" transform=\"translate(422 0)\" d=\"M0 108V46H11V57C15 48 22 43 33 43H38V54H32C18 54 11 65 11 81V108Z\"/>\n  </g>\n</svg>\n",
  "familiar-mark-reverse.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" role=\"img\" aria-labelledby=\"familiar-mark-title familiar-mark-desc\" color=\"#25232A\">\n  <title id=\"familiar-mark-title\">Familiar mark</title>\n  <desc id=\"familiar-mark-desc\">An open evidence frame encloses a continuous folded loop: a compact symbol of familiar garments and traceable evidence.</desc>\n  <!-- Construction source: original 64-unit geometric mark. A 5-unit open frame surrounds a 6-unit folded loop, with a diagonal return recalling a garment fold. Rounded joins preserve the silhouette at favicon size. Monochrome, editable SVG paths; no hanger, camera, font, or third-party art. Trademark clearance has not been assessed. -->\n  <g fill=\"none\" stroke=\"#F7F4EE\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n    <path id=\"evidence-frame\" stroke-width=\"5\" d=\"M42 8H20C13.37 8 8 13.37 8 20V44C8 50.63 13.37 56 20 56H44C50.63 56 56 50.63 56 44V32\"/>\n    <path id=\"folded-loop\" stroke-width=\"6\" d=\"M41 20H32C27.58 20 24 23.58 24 28V38C24 42.42 27.58 46 32 46H33C37.42 46 41 42.42 41 38C41 33.58 37.42 30 33 30H21M41 20L34 27\"/>\n  </g>\n</svg>\n",
  "logo-light.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 480 126\" role=\"img\" aria-labelledby=\"familiar-title familiar-desc\">\n  <title id=\"familiar-title\">familiar</title>\n  <desc id=\"familiar-desc\">Original lowercase Familiar wordmark for light surfaces. Quiet rounded sans-serif letterforms, with open counters and a curved lower-case l.</desc>\n  <!-- Construction source: original hand-drawn filled paths on a 65-unit x-height grid; 11-unit stems, 3-unit round overshoot. Each letter remains a named editable path. No font or third-party artwork is embedded. Trademark clearance has not been assessed. -->\n  <g transform=\"translate(8 4)\" fill=\"#25232A\" fill-rule=\"evenodd\">\n    <path id=\"letter-f\" transform=\"translate(0 0)\" d=\"M17 108V53H5V43H17V31C17 15 26 7 41 7C46 7 50 8 54 10L51 20C48 18 45 17 42 17C33 17 28 22 28 31V43H48V53H28V108Z\"/>\n    <path id=\"letter-a-1\" transform=\"translate(63 0)\" d=\"M62 108H51V100C46 107 39 111 29 111C11 111 0 98 0 77C0 56 11 43 29 43C39 43 46 47 51 54V46H62ZM51 77C51 61 43 53 31 53C19 53 11 62 11 77C11 92 19 101 31 101C43 101 51 93 51 77Z\"/>\n    <path id=\"letter-m\" transform=\"translate(139 0)\" d=\"M0 108V46H11V54C15 47 22 43 31 43C41 43 48 48 52 56C57 47 64 43 75 43C91 43 99 53 99 70V108H88V72C88 59 83 53 73 53C61 53 55 62 55 75V108H44V72C44 59 39 53 29 53C17 53 11 62 11 75V108Z\"/>\n    <path id=\"letter-i-1\" transform=\"translate(254 0)\" d=\"M0 46H11V108H0ZM5.5 17C9.4 17 12 19.6 12 23.5C12 27.4 9.4 30 5.5 30C1.6 30 -1 27.4 -1 23.5C-1 19.6 1.6 17 5.5 17Z\"/>\n    <path id=\"letter-l\" transform=\"translate(282 0)\" d=\"M0 8H11V91C11 98 13 101 18 101H22V111H17C5 111 0 106 0 92Z\"/>\n    <path id=\"letter-i-2\" transform=\"translate(319 0)\" d=\"M0 46H11V108H0ZM5.5 17C9.4 17 12 19.6 12 23.5C12 27.4 9.4 30 5.5 30C1.6 30 -1 27.4 -1 23.5C-1 19.6 1.6 17 5.5 17Z\"/>\n    <path id=\"letter-a-2\" transform=\"translate(346 0)\" d=\"M62 108H51V100C46 107 39 111 29 111C11 111 0 98 0 77C0 56 11 43 29 43C39 43 46 47 51 54V46H62ZM51 77C51 61 43 53 31 53C19 53 11 62 11 77C11 92 19 101 31 101C43 101 51 93 51 77Z\"/>\n    <path id=\"letter-r\" transform=\"translate(422 0)\" d=\"M0 108V46H11V57C15 48 22 43 33 43H38V54H32C18 54 11 65 11 81V108Z\"/>\n  </g>\n</svg>\n",
  "favicon.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" role=\"img\" aria-labelledby=\"familiar-favicon-title familiar-favicon-desc\">\n  <title id=\"familiar-favicon-title\">Familiar</title>\n  <desc id=\"familiar-favicon-desc\">Familiar folded loop and evidence frame in deep ink on a lilac square.</desc>\n  <!-- Construction source: original compact mark on the Familiar lilac field. A 5-unit evidence frame and 6-unit folded loop use the same geometry as the compact mark. Editable path geometry; no third-party artwork. Trademark clearance has not been assessed. -->\n  <rect width=\"64\" height=\"64\" rx=\"14\" fill=\"#DCD1F0\"/>\n  <g transform=\"translate(5 5) scale(.84375)\" fill=\"none\" stroke=\"#25232A\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n    <path id=\"evidence-frame\" stroke-width=\"5\" d=\"M42 8H20C13.37 8 8 13.37 8 20V44C8 50.63 13.37 56 20 56H44C50.63 56 56 50.63 56 44V32\"/>\n    <path id=\"folded-loop\" stroke-width=\"6\" d=\"M41 20H32C27.58 20 24 23.58 24 28V38C24 42.42 27.58 46 32 46H33C37.42 46 41 42.42 41 38C41 33.58 37.42 30 33 30H21M41 20L34 27\"/>\n  </g>\n</svg>\n",
  "familiar-wordmark-reverse.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 480 126\" role=\"img\" aria-labelledby=\"familiar-title familiar-desc\">\n  <title id=\"familiar-title\">familiar</title>\n  <desc id=\"familiar-desc\">Original lowercase Familiar wordmark for dark surfaces. Quiet rounded sans-serif letterforms, with open counters and a curved lower-case l.</desc>\n  <!-- Construction source: original hand-drawn filled paths on a 65-unit x-height grid; 11-unit stems, 3-unit round overshoot. Each letter remains a named editable path. No font or third-party artwork is embedded. Trademark clearance has not been assessed. -->\n  <g transform=\"translate(8 4)\" fill=\"#F7F4EE\" fill-rule=\"evenodd\">\n    <path id=\"letter-f\" transform=\"translate(0 0)\" d=\"M17 108V53H5V43H17V31C17 15 26 7 41 7C46 7 50 8 54 10L51 20C48 18 45 17 42 17C33 17 28 22 28 31V43H48V53H28V108Z\"/>\n    <path id=\"letter-a-1\" transform=\"translate(63 0)\" d=\"M62 108H51V100C46 107 39 111 29 111C11 111 0 98 0 77C0 56 11 43 29 43C39 43 46 47 51 54V46H62ZM51 77C51 61 43 53 31 53C19 53 11 62 11 77C11 92 19 101 31 101C43 101 51 93 51 77Z\"/>\n    <path id=\"letter-m\" transform=\"translate(139 0)\" d=\"M0 108V46H11V54C15 47 22 43 31 43C41 43 48 48 52 56C57 47 64 43 75 43C91 43 99 53 99 70V108H88V72C88 59 83 53 73 53C61 53 55 62 55 75V108H44V72C44 59 39 53 29 53C17 53 11 62 11 75V108Z\"/>\n    <path id=\"letter-i-1\" transform=\"translate(254 0)\" d=\"M0 46H11V108H0ZM5.5 17C9.4 17 12 19.6 12 23.5C12 27.4 9.4 30 5.5 30C1.6 30 -1 27.4 -1 23.5C-1 19.6 1.6 17 5.5 17Z\"/>\n    <path id=\"letter-l\" transform=\"translate(282 0)\" d=\"M0 8H11V91C11 98 13 101 18 101H22V111H17C5 111 0 106 0 92Z\"/>\n    <path id=\"letter-i-2\" transform=\"translate(319 0)\" d=\"M0 46H11V108H0ZM5.5 17C9.4 17 12 19.6 12 23.5C12 27.4 9.4 30 5.5 30C1.6 30 -1 27.4 -1 23.5C-1 19.6 1.6 17 5.5 17Z\"/>\n    <path id=\"letter-a-2\" transform=\"translate(346 0)\" d=\"M62 108H51V100C46 107 39 111 29 111C11 111 0 98 0 77C0 56 11 43 29 43C39 43 46 47 51 54V46H62ZM51 77C51 61 43 53 31 53C19 53 11 62 11 77C11 92 19 101 31 101C43 101 51 93 51 77Z\"/>\n    <path id=\"letter-r\" transform=\"translate(422 0)\" d=\"M0 108V46H11V57C15 48 22 43 33 43H38V54H32C18 54 11 65 11 81V108Z\"/>\n  </g>\n</svg>\n",
  "logo-dark.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 480 126\" role=\"img\" aria-labelledby=\"familiar-title familiar-desc\">\n  <title id=\"familiar-title\">familiar</title>\n  <desc id=\"familiar-desc\">Original lowercase Familiar wordmark for dark surfaces. Quiet rounded sans-serif letterforms, with open counters and a curved lower-case l.</desc>\n  <!-- Construction source: original hand-drawn filled paths on a 65-unit x-height grid; 11-unit stems, 3-unit round overshoot. Each letter remains a named editable path. No font or third-party artwork is embedded. Trademark clearance has not been assessed. -->\n  <g transform=\"translate(8 4)\" fill=\"#F7F4EE\" fill-rule=\"evenodd\">\n    <path id=\"letter-f\" transform=\"translate(0 0)\" d=\"M17 108V53H5V43H17V31C17 15 26 7 41 7C46 7 50 8 54 10L51 20C48 18 45 17 42 17C33 17 28 22 28 31V43H48V53H28V108Z\"/>\n    <path id=\"letter-a-1\" transform=\"translate(63 0)\" d=\"M62 108H51V100C46 107 39 111 29 111C11 111 0 98 0 77C0 56 11 43 29 43C39 43 46 47 51 54V46H62ZM51 77C51 61 43 53 31 53C19 53 11 62 11 77C11 92 19 101 31 101C43 101 51 93 51 77Z\"/>\n    <path id=\"letter-m\" transform=\"translate(139 0)\" d=\"M0 108V46H11V54C15 47 22 43 31 43C41 43 48 48 52 56C57 47 64 43 75 43C91 43 99 53 99 70V108H88V72C88 59 83 53 73 53C61 53 55 62 55 75V108H44V72C44 59 39 53 29 53C17 53 11 62 11 75V108Z\"/>\n    <path id=\"letter-i-1\" transform=\"translate(254 0)\" d=\"M0 46H11V108H0ZM5.5 17C9.4 17 12 19.6 12 23.5C12 27.4 9.4 30 5.5 30C1.6 30 -1 27.4 -1 23.5C-1 19.6 1.6 17 5.5 17Z\"/>\n    <path id=\"letter-l\" transform=\"translate(282 0)\" d=\"M0 8H11V91C11 98 13 101 18 101H22V111H17C5 111 0 106 0 92Z\"/>\n    <path id=\"letter-i-2\" transform=\"translate(319 0)\" d=\"M0 46H11V108H0ZM5.5 17C9.4 17 12 19.6 12 23.5C12 27.4 9.4 30 5.5 30C1.6 30 -1 27.4 -1 23.5C-1 19.6 1.6 17 5.5 17Z\"/>\n    <path id=\"letter-a-2\" transform=\"translate(346 0)\" d=\"M62 108H51V100C46 107 39 111 29 111C11 111 0 98 0 77C0 56 11 43 29 43C39 43 46 47 51 54V46H62ZM51 77C51 61 43 53 31 53C19 53 11 62 11 77C11 92 19 101 31 101C43 101 51 93 51 77Z\"/>\n    <path id=\"letter-r\" transform=\"translate(422 0)\" d=\"M0 108V46H11V57C15 48 22 43 33 43H38V54H32C18 54 11 65 11 81V108Z\"/>\n  </g>\n</svg>\n",
  "familiar-mark.svg": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" role=\"img\" aria-labelledby=\"familiar-mark-title familiar-mark-desc\" color=\"#25232A\">\n  <title id=\"familiar-mark-title\">Familiar mark</title>\n  <desc id=\"familiar-mark-desc\">An open evidence frame encloses a continuous folded loop: a compact symbol of familiar garments and traceable evidence.</desc>\n  <!-- Construction source: original 64-unit geometric mark. A 5-unit open frame surrounds a 6-unit folded loop, with a diagonal return recalling a garment fold. Rounded joins preserve the silhouette at favicon size. Monochrome, editable SVG paths; no hanger, camera, font, or third-party art. Trademark clearance has not been assessed. -->\n  <g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\">\n    <path id=\"evidence-frame\" stroke-width=\"5\" d=\"M42 8H20C13.37 8 8 13.37 8 20V44C8 50.63 13.37 56 20 56H44C50.63 56 56 50.63 56 44V32\"/>\n    <path id=\"folded-loop\" stroke-width=\"6\" d=\"M41 20H32C27.58 20 24 23.58 24 28V38C24 42.42 27.58 46 32 46H33C37.42 46 41 42.42 41 38C41 33.58 37.42 30 33 30H21M41 20L34 27\"/>\n  </g>\n</svg>\n"
};
const originalBrandManifest = {
  "brand": "familiar",
  "version": "1.0.0",
  "created": "2026-10-13",
  "license": {
    "type": "CC0-1.0",
    "description": "Original hand-constructed SVG artwork dedicated to the public domain; no external fonts or stock artwork.",
    "trademarkClearance": "not assessed"
  },
  "construction": {
    "wordmark": "Original filled paths with named per-letter geometry; no font dependency.",
    "mark": "An open evidence frame containing a folded continuous loop.",
    "palette": {
      "ink": "#25232A",
      "paper": "#F7F4EE",
      "lilac": "#DCD1F0"
    },
    "minimumSizes": {
      "wordmarkWidthPx": 104,
      "markSizePx": 16
    },
    "clearSpace": "At least one stem-width around the wordmark; one frame stroke-width around the compact mark."
  },
  "assets": [
    {
      "filename": "logo-light.svg",
      "path": "/brand/logo-light.svg",
      "role": "primary wordmark for light surfaces",
      "bytes": 2168,
      "mimeType": "image/svg+xml"
    },
    {
      "filename": "logo-dark.svg",
      "path": "/brand/logo-dark.svg",
      "role": "primary wordmark for dark surfaces",
      "bytes": 2167,
      "mimeType": "image/svg+xml"
    },
    {
      "filename": "mark.svg",
      "path": "/brand/mark.svg",
      "role": "monochrome compact mark; inline CSS can set currentColor",
      "bytes": 1118,
      "mimeType": "image/svg+xml"
    },
    {
      "filename": "favicon.svg",
      "path": "/brand/favicon.svg",
      "role": "favicon with lilac surface",
      "bytes": 1075,
      "mimeType": "image/svg+xml"
    },
    {
      "filename": "familiar-wordmark.svg",
      "path": "/brand/familiar-wordmark.svg",
      "role": "primary",
      "bytes": 2168,
      "mimeType": "image/svg+xml"
    },
    {
      "filename": "familiar-wordmark-reverse.svg",
      "path": "/brand/familiar-wordmark-reverse.svg",
      "role": "reverse primary",
      "bytes": 2167,
      "mimeType": "image/svg+xml"
    },
    {
      "filename": "familiar-mark.svg",
      "path": "/brand/familiar-mark.svg",
      "role": "primary",
      "bytes": 1118,
      "mimeType": "image/svg+xml"
    },
    {
      "filename": "familiar-mark-reverse.svg",
      "path": "/brand/familiar-mark-reverse.svg",
      "role": "reverse primary",
      "bytes": 1113,
      "mimeType": "image/svg+xml"
    }
  ]
};
const brandOutput = path.join(ROOT, 'public/brand');
fs.mkdirSync(brandOutput, { recursive: true });
for (const [name, svg] of Object.entries(brandSources)) fs.writeFileSync(path.join(brandOutput, name), svg);
fs.writeFileSync(path.join(brandOutput, 'brand-manifest.json'), JSON.stringify(originalBrandManifest, null, 2)+'\n');

const cloudOnly=process.argv.includes('--cloud-only');
const previous=cloudOnly?JSON.parse(fs.readFileSync(path.join(ROOT,'public/asset-manifest.json'),'utf8')):null;
const assets=previous?previous.assets.filter(a=>a.id!=='cloud-poplin'&&a.kind!=='prepared-evidence-fixture'&&a.kind!=='brand'):[];
for(const s of specs){
 if(cloudOnly&&s.id!=='cloud-poplin')continue;
 const group=makeGarment(s),bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());
 const img=await studio(group,s);const out=poster(s.id,s.name,img,s.background);fs.writeFileSync(path.join(POSTER_DIR,`${s.id}.svg`),out);
 assets.push({id:s.id,kind:'poster',path:`/posters/${s.id}.svg`,bytes:Buffer.byteLength(out),format:'SVG with original embedded PNG',color:s.color,background:s.background,origin:'Original authored geometry',renderingMethod,license:'CC0-1.0',routes:s.id==='my-blue-blouse'?['/match','/listing/:id/compare']:['/shop',`/listing/${s.id}`]});
 if(['cloud-poplin','moss-knit','airloom-linen','my-blue-blouse'].includes(s.id)){
  const {data,json}=exportGLB(group,s);fs.writeFileSync(path.join(MODEL_DIR,`${s.id}.glb`),data);
  assets.push({id:s.id,kind:'model',path:`/models/${s.id}.glb`,fallback:`/posters/${s.id}.svg`,bytes:data.length,budgetBytes:2_000_000,format:'glTF 2.0 binary',intendedDimensionsCm:{sleeveSpan:+(size.x*100).toFixed(1),length:+(size.y*100).toFixed(1),depth:+(size.z*100).toFixed(1)},coordinates:{units:'metres',front:'+Z',up:'+Y',boundsMin:bounds.min.toArray(),boundsMax:bounds.max.toArray()},nodes:json.nodes.map(n=>n.name),meshCount:json.meshes.length,materialCount:json.materials.length,materials:json.materials.map(m=>m.name),textures:json.images.map(i=>({name:i.name,mimeType:i.mimeType,dimensions:i.name.includes('label-print')?[512,320]:[64,64],purpose:i.name.includes('label-print')?'Original declared label fixture print':'Original fabric normal map'})),origin:'Original procedural tailoring; hollow torso/sleeve tubes, sewn seams, collar/cuffs, geometry folds',authoringMethod:'scripts/author-assets.mjs (Three.js geometry and direct glTF serialization)',license:'CC0-1.0',routes:s.id==='my-blue-blouse'?['/match','/listing/:id/compare']:['/listing/'+s.id,'/match','/capture','/listing/:id/compare'],notMeasuredRealGarment:true});
 }
 console.log(`${s.id}: ${img.length} poster PNG bytes; ${size.toArray().map(v=>(v*100).toFixed(1)).join(' × ')} cm authored bounds`);
}
const cloud=specs[0],cloudGroup=makeGarment(cloud);
for(const view of ['front','label','surface','movement','wear']){
 const img=await studio(cloudGroup,cloud,view==='movement'?'threequarter':view);
 const out=poster(`evidence-${view}`,`Cloud Poplin ${view} prepared source frame`,img,cloud.background,'Prepared fixture frame for the simulated evidence walkthrough; not captured from a real seller garment.');
 fs.writeFileSync(path.join(POSTER_DIR,`evidence-${view}.svg`),out);assets.push({id:`evidence-${view}`,kind:'prepared-evidence-fixture',path:`/posters/evidence-${view}.svg`,bytes:Buffer.byteLength(out),origin:'Original authored fixture scene, separate file from illustrative product poster',license:'CC0-1.0',routes:['/capture','/review','/listing/cloud-poplin'],notMeasuredRealGarment:true});
}
for(let i=0;!cloudOnly&&i<12;i++){
 const original=specs[i],s={...original,id:`coming-soon-${String(i+1).padStart(2,'0')}`,name:['Buttercup cotton shirt','Seafoam knit layer','Sand linen jacket','Sorbet everyday tee','Indigo relaxed denim','Stone tailored trousers','Peach bias dress','Lagoon cotton shirt','Cream ribbed vest','Wisteria wrap top','Clay chore jacket','Fern everyday skirt'][i],color:['#d2bf8e','#9aa79b','#ccbea7','#d7afa8','#557892','#83817b','#d3b09b','#97b0b5','#d4c6a7','#b7abc6','#b49285','#a5ad91'][i],background:['#eee8d8','#e2e9e2','#eee6db','#f1e5df','#e4e9ed','#e9e7e1','#eee2d9','#e0e8e8','#efeadf','#e9e2ef','#ede0d9','#e7eadf'][i]};
 const out=poster(s.id,s.name,await studio(makeGarment(s),s),s.background);fs.writeFileSync(path.join(POSTER_DIR,`${s.id}.svg`),out);assets.push({id:s.id,kind:'coming-soon-reference',path:`/posters/${s.id}.svg`,bytes:Buffer.byteLength(out),origin:'Original model-based garment studio reference',renderingMethod,license:'CC0-1.0',routes:['/shop'],inert:true});
}
for(let i=1;!cloudOnly&&i<=38;i++){
 const id=`placeholder-${String(i).padStart(2,'0')}`,bg=['#e8e2ef','#e1e9ed','#e5eadf','#f0e2e2','#eee8dc'][i%5];
 const out=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-labelledby="title desc"><title id="title">More clothes, coming soon</title><desc id="desc">Pastel catalogue placeholder.</desc><rect width="800" height="1000" fill="${bg}"/><g fill="none" stroke="#aaa3ae" stroke-width="3" opacity=".22"><rect x="274" y="377" width="252" height="252" rx="51"/><path d="M338 437c62 0 40 114 102 114 33 0 44-26 44-44 0-36-45-56-77-18l-56 65"/></g></svg>`;
 fs.writeFileSync(path.join(POSTER_DIR,`${id}.svg`),out);assets.push({id,kind:'pastel-placeholder',path:`/posters/${id}.svg`,bytes:Buffer.byteLength(out),origin:'Original small SVG placeholder',license:'CC0-1.0',routes:['/shop'],inert:true});
}
const manifest={schemaVersion:1,brand:'Familiar',created:'2026-10-13',reproduce:'node scripts/author-assets.mjs',license:'CC0-1.0 for original generated assets; Three.js code remains MIT',coordinateConvention:'metres, Y up, front +Z',assetPolicy:'Original authored product imagery only. Screenshots from supplied research references are never product media. Illustrative 3D does not establish evidence or measurements.',assets};
// Logo files are independently editable authored SVGs and included after their creation.
const brandDir=path.join(ROOT,'public/brand');if(fs.existsSync(brandDir))for(const f of fs.readdirSync(brandDir).filter(f=>f.endsWith('.svg'))){const p=path.join(brandDir,f);manifest.assets.push({id:f.replace('.svg',''),kind:'brand',path:'/brand/'+f,bytes:fs.statSync(p).size,origin:'Original hand-constructed SVG paths',license:'CC0-1.0',routes:['all']});}
fs.writeFileSync(path.join(ROOT,'public/asset-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await browser?.close();server?.close();
console.log(`Wrote ${assets.length} original assets + manifest.`);
