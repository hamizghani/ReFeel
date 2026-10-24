/**
 * Familiar original garment workshop.
 * Reproduce: node scripts/author-animated-garment.mjs
 * Meshes are tailored, hollow lofted fabric surfaces. No photographs or third-party
 * garment geometry is used. CPU studio rendering keeps regeneration self-contained.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import * as THREE from 'three';

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
   const a=u*PI*2;const cap=clamp(t/.19,0,1);const radius=(lerp(.076,cuffWidth,t)+(s.type==='blouse'?Math.sin(PI*t)*.027:s.open?Math.sin(PI*t)*.014:Math.sin(PI*t)*.005))*(.82+.18*cap*cap*(3-2*cap));
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
 const json={asset:{version:'2.0',generator:'Familiar V3 sewn sleeve cloth demonstration',copyright:'Original Familiar assets, CC0-1.0'},extensionsUsed:['KHR_texture_transform'],scene:0,scenes:[{name:s.id,nodes:nodes.map((_,i)=>i)}],nodes,meshes,materials,images,textures,samplers:[{magFilter:9729,minFilter:9987,wrapS:10497,wrapT:10497}],accessors,bufferViews:views,buffers:[{byteLength:offset}],extras:{origin:'Original authored geometry; no scanned garments or stock models',units:'metres',front:'+Z',fabric:s.fabric,notMeasuredRealGarment:true}};
 const text=Buffer.from(JSON.stringify(json));const jsonBuf=Buffer.concat([text,Buffer.alloc((4-text.length%4)%4,32)]),bin=Buffer.concat(parts),head=Buffer.alloc(12),jhead=Buffer.alloc(8),bhead=Buffer.alloc(8);head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(12+8+jsonBuf.length+8+bin.length,8);jhead.writeUInt32LE(jsonBuf.length,0);jhead.writeUInt32LE(0x4e4f534a,4);bhead.writeUInt32LE(bin.length,0);bhead.writeUInt32LE(0x004e4942,4);return{data:Buffer.concat([head,jhead,jsonBuf,bhead,bin]),json};
}


const group=makeShirt(specs[0]);
for(const child of [...group.children]) if(/wear|label-print/.test(child.name))group.remove(child);
const {data,json}=exportGLB(group,specs[0]);
const dest=path.join(MODEL_DIR,'cloud-animated.glb');
fs.writeFileSync(dest+'.tmp',data);fs.renameSync(dest+'.tmp',dest);
const manifest={version:3,assets:[{id:'cloud-animated',path:'/models/cloud-animated.glb',bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex'),source:'Original Familiar procedural Cloud Poplin garment, supplied V1 archive; sleeves reshaped with full-width sewn roots',variants:['cloud','reference'],activeMeshCount:json.nodes.length,removedInventedWearAndCompositionLabel:true,scope:'Single illustrative base shape reused for ivory listing and blue reference. Fixed-step XPBD cloth cage runs in the viewer. This asset does not establish real fabric properties.',reproduce:'node scripts/author-animated-garment.mjs'}]};
fs.writeFileSync(path.join(MODEL_DIR,'manifest.json')+'.tmp',JSON.stringify(manifest,null,2)+'\n');fs.renameSync(path.join(MODEL_DIR,'manifest.json')+'.tmp',path.join(MODEL_DIR,'manifest.json'));
console.log(`Wrote ${data.length} byte sewn-sleeve GLB, ${json.nodes.length} meshes.`);
