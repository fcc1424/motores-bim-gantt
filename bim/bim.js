/* Motor BIM único · v1
   Un solo visor para todos los proyectos. Cada proyecto aporta solo datos:
   data/proyecto.json, data/escena.b64.txt, data/plan.b64.txt, data/laminas.b64.txt y, si existen, módulos (data/mt.json).
   No editar por proyecto: cualquier mejora aquí se propaga a todos al volver a publicar sus artefactos. */
(()=>{
'use strict';
const BIM_VERSION='1.0';
async function loadPack(url){
  const r=await fetch(url);if(!r.ok)throw new Error(url+' '+r.status);
  const raw=Uint8Array.from(atob((await r.text()).trim()),c=>c.charCodeAt(0));let buf=raw.buffer;
  if(raw[0]===0x1f&&raw[1]===0x8b)buf=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const jl=new DataView(buf).getUint32(0,true);const meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,jl)));
  let base=4+jl;base+=(4-base%4)%4;const T={f32:Float32Array,u16:Uint16Array,i16:Int16Array,u8:Uint8Array,u32:Uint32Array,i32:Int32Array};
  const A={};Object.entries(meta._a||{}).forEach(([k,[t,o,n]])=>{A[k]=new T[t](buf.slice(base+o,base+o+n*T[t].BYTES_PER_ELEMENT));});
  return {meta,A};}
/* modelos federados: formato binario de elementos (posiciones u16 sobre bbox, colores u8, índices u32, triángulo→elemento u16) */
async function loadModel(m){
  const r=await fetch(m.file);if(!r.ok)throw new Error(m.file+' '+r.status);
  const raw=Uint8Array.from(atob((await r.text()).trim()),c=>c.charCodeAt(0));let buf=raw.buffer;
  if(raw[0]===0x1f&&raw[1]===0x8b)buf=await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const jl=new DataView(buf).getUint32(0,true);const meta=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,4,jl)));
  let o=4+jl;o+=(4-o%4)%4;
  const pos=new Uint16Array(buf,o,meta.nv*3);o+=meta.nv*6;
  const col=new Uint8Array(buf,o,meta.nv*3);o+=meta.nv*3;o+=(4-o%4)%4;
  const idx=new Uint32Array(buf,o,meta.nt*3);o+=meta.nt*12;
  const TE=new Uint16Array(buf,o,meta.nt);
  const [x0,y0,z0,x1,y1,z1]=meta.bbox,sx=(x1-x0)/65535,sy=(y1-y0)/65535,sz=(z1-z0)/65535;
  const W=new Float32Array(meta.nv*3);for(let i=0;i<meta.nv;i++){W[i*3]=x0+pos[i*3]*sx;W[i*3+1]=y0+pos[i*3+1]*sy;W[i*3+2]=z0+pos[i*3+2]*sz;}
  const I=new Uint32Array(meta.nt*3);const TL=new Uint8Array(meta.nt);
  meta.chunks.forEach((ch,ci)=>{for(let t=ch.t0;t<ch.t0+ch.nt;t++){TL[t]=ci;for(let q=0;q<3;q++)I[t*3+q]=idx[t*3+q]+ch.v0;}});
  const ne=meta.elements.length,cnt=new Uint32Array(ne+1);for(let t=0;t<meta.nt;t++)cnt[TE[t]+1]++;for(let e=0;e<ne;e++)cnt[e+1]+=cnt[e];
  const fill=cnt.slice(0,ne),ET=new Uint32Array(meta.nt);for(let t=0;t<meta.nt;t++)ET[fill[TE[t]]++]=t;
  return {key:m.key,name:m.name,src:m.src,kind:m.kind,short:m.short,meta,W,I,TE,TL,col,EO:cnt,ET,els:meta.elements,hidden:new Set()};}
async function loadModels(list,say){const MD={};let n=0;await Promise.all(list.map(m=>loadModel(m).then(d=>{MD[m.key]=d;n++;say&&say('Cargando modelos… '+n+' de '+list.length);})));
  const o={};list.forEach(m=>{if(MD[m.key])o[m.key]=MD[m.key];});return o;}
async function boot(){
  const ld=document.getElementById('loading');const say=t=>{if(ld)ld.textContent=t;};
  try{
    const base=(window.BIM_DATA||'data/');
    say('Cargando proyecto…');const P=await (await fetch(base+'proyecto.json')).json();
    say('Cargando modelo…');const F=P.files||{};const E={meta:{},A:{}};
    const [SC,PL,LM,MTD,MDL]=await Promise.all([F.escena?loadPack(F.escena):E,F.plan?loadPack(F.plan):{meta:{layers:{}},A:{}},F.laminas?loadPack(F.laminas):{meta:{sheets:[]},A:{}},F.mt?fetch(F.mt).then(r=>r.json()):null,P.modelos?loadModels(P.modelos.list,say):null]);
    if(!(window.THREE&&THREE.OrbitControls)){await new Promise(r=>window.addEventListener('load',r,{once:true}));}
    if(!(window.THREE&&THREE.OrbitControls)){say('No se pudo cargar el motor 3D. Revisa la conexión y recarga la página.');return;}
    ENGINE(P,SC,PL,LM,MTD,MDL);
  }catch(e){console.error(e);say('No se pudo cargar el proyecto: '+e.message);}
}
function ENGINE(P,SC,PL,LM,MTD,MDL){
/* ---------- proyecto ---------- */
const PRJ={nombre:P.nombre,codigo:P.codigo,ubicacion:P.ubicacion||'',mandante:P.mandante||'',etapa:P.etapa||'',sistema:P.sistema||'',E0:P.E0,N0:P.N0,conv:P.conv};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const NF={};
const fmt=(v,d=2)=>{if(v==null||!isFinite(v))return '—';NF[d]=NF[d]||new Intl.NumberFormat('es-CL',{minimumFractionDigits:d,maximumFractionDigits:d});return NF[d].format(v);};
const E0=PRJ.E0,N0=PRJ.N0,CONV=PRJ.conv,RNP=P.rnp||0;
const ZR=P.zr;
const BB=P.bbox;const BC=[(BB.x0+BB.x1)/2,(BB.y0+BB.y1)/2];
const P2=f=>{const o=[];for(let i=0;i+1<f.length;i+=2)o.push([f[i],f[i+1]]);return o;};
const dist2=(a,b)=>Math.hypot(b[0]-a[0],b[1]-a[1]);
const plen=P=>{let s=0;for(let i=1;i<P.length;i++)s+=dist2(P[i-1],P[i]);return s;};
const parea=P=>{let s=0;for(let i=0,j=P.length-1;i<P.length;j=i++)s+=P[j][0]*P[i][1]-P[i][0]*P[j][1];return Math.abs(s)/2;};
const utmE=x=>x+E0, utmN=y=>y+N0;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KEY=P.lsKey||((P.id||PRJ.codigo)+'-');
function lsGet(k,d){try{const v=localStorage.getItem(KEY+k);return v==null?d:JSON.parse(v);}catch(e){return d;}}
function lsSet(k,v){try{localStorage.setItem(KEY+k,JSON.stringify(v));}catch(e){}}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),2600);}
function hint(msg){const h=$('#hint');if(!msg){h.classList.remove('on');return;}h.textContent=msg;h.classList.add('on');}
/* ---------- terreno: grilla regular (cm sobre zb) ---------- */
const G=SC.meta.terrain||null;
const GZ=(()=>{if(!G)return new Float32Array(0);const t=SC.A.tz,n=G.nx*G.ny,o=new Float32Array(n);for(let k=0;k<n;k++){const v=t[k];o[k]=v===-32768?NaN:G.zb+v/100;}return o;})();
const gAt=(i,j)=>(!G||i<0||j<0||i>=G.nx||j>=G.ny)?NaN:GZ[j*G.nx+i];
function hz(x,y){if(!G)return null;const fx=(x-G.x0)/G.dx,fy=(y-G.y0)/G.dx,i=Math.floor(fx),j=Math.floor(fy),tx=fx-i,ty=fy-j;
  const a=gAt(i,j),b=gAt(i+1,j),c=gAt(i,j+1),d=gAt(i+1,j+1);
  if(isFinite(a)&&isFinite(b)&&isFinite(c)&&isFinite(d))return a*(1-tx)*(1-ty)+b*tx*(1-ty)+c*(1-tx)*ty+d*tx*ty;
  let s=0,w=0;[[a,(1-tx)*(1-ty)],[b,tx*(1-ty)],[c,(1-tx)*ty],[d,tx*ty]].forEach(([v,k])=>{if(isFinite(v)){s+=v*(k+1e-3);w+=k+1e-3;}});return w?s/w:null;}
function pip(p,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
function slopeAt(x,y){const a=hz(x-1,y),b=hz(x+1,y),c=hz(x,y-1),d=hz(x,y+1);if([a,b,c,d].some(v=>v==null))return null;return Math.hypot((b-a)/2,(d-c)/2)*100;}
let ZMIN=1e9,ZMAX=-1e9;for(const z of GZ){if(isFinite(z)){if(z<ZMIN)ZMIN=z;if(z>ZMAX)ZMAX=z;}}
if(P.zmm){ZMIN=Math.min(ZMIN,P.zmm[0]);ZMAX=Math.max(ZMAX,P.zmm[1]);}if(ZMIN>ZMAX){ZMIN=ZR-1;ZMAX=ZR+10;}
const PTS=(P.puntos||[]).map(p=>({x:p[0],y:p[1],z:p[2],n:p[3]}));
const PRS=(P.pr||[]).map(p=>({...p}));
const b64=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);};
const XI=SC.meta.ifc||null;const IEL=XI?XI.els:[];const IFC_STO=XI?XI.sto:[];
const IBB=(()=>{if(P.focus&&P.focus.ifc)return P.focus.ifc;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;IEL.forEach(e=>{if(!e.bb)return;x0=Math.min(x0,e.bb[0]);y0=Math.min(y0,e.bb[1]);x1=Math.max(x1,e.bb[3]);y1=Math.max(y1,e.bb[4]);});if(x0>x1)return {x0:BB.x0,x1:BB.x1,y0:BB.y0,y1:BB.y1,c:BC};return {x0,x1,y0,y1,c:[(x0+x1)/2,(y0+y1)/2]};})();
function nearestPt(x,y){let b=null,bd=1e9;for(const p of PTS){const d=Math.hypot(p.x-x,p.y-y);if(d<bd){bd=d;b=p;}}return b?{...b,d:bd}:null;}
/* ---------- módulo: movimiento de tierras (solo si el proyecto trae data/mt.json) ---------- */
const HAS_MT=!!MTD;
function inRings(R,x,y){let c=false;for(const r of R)if(pip([x,y],r))c=!c;return c;}
let MT=null,MTZ={},MTP={eb:0.65,ep:0.65,tr:1.5,tc:1.0},PR_ALL=[],PR_BLD=[],PR_PARK=[],MASK=null,MTNN=null;
if(HAS_MT){
  MT=(()=>{const n=MTD.nx*MTD.ny;const zd=b64(MTD.zd,Int16Array),cl=b64(MTD.cls,Uint8Array),cx=b64(MTD.cjmax,Int16Array),cn=b64(MTD.cjmin,Int16Array);
    const ZD=new Float32Array(n),ZTc=new Float32Array(n),CX=new Float32Array(n),CN=new Float32Array(n);
    const gi0=Math.round((MTD.x0!=null?MTD.x0-G.x0:MTD.i0*G.dx)/G.dx),gj0=Math.round((MTD.y0!=null?MTD.y0-G.y0:MTD.j0*G.dx)/G.dx);
    for(let j=0;j<MTD.ny;j++)for(let i=0;i<MTD.nx;i++){const k=j*MTD.nx+i;ZD[k]=zd[k]===-32768?NaN:100+zd[k]/100;ZTc[k]=gAt(i+gi0,j+gj0);CX[k]=cx[k]===-32768?NaN:100+cx[k]/100;CN[k]=cn[k]===-32768?NaN:100+cn[k]/100;}
    return {nx:MTD.nx,ny:MTD.ny,x0:G.x0+gi0*G.dx,y0:G.y0+gj0*G.dx,ZD,ZT:ZTc,CL:cl,CX,CN};})();
  MTZ=MTD.zonas||{1:'Edificio',2:'Pavimentos exteriores',3:'Estacionamientos'};
  try{const o=JSON.parse(localStorage.getItem(KEY+'mtp2')||'{}');Object.assign(MTP,o);}catch(e){}
  MT.ZB=(()=>{const z=b64(MTD.zb,Int16Array),o=new Float32Array(z.length);for(let k=0;k<z.length;k++)o[k]=z[k]===-32768?NaN:100+z[k]/100;return o;})();
  MT.ZF=new Float32Array(MT.nx*MT.ny);
  PR_ALL=MTD.P.all.map(P2);PR_BLD=MTD.P.bld.map(P2);PR_PARK=MTD.P.park.map(P2);
  MTNN=b64(MTD.nn,Uint32Array);
  MASK=(()=>{const xs=[],ys=[];PR_ALL.forEach(r=>r.forEach(p=>{xs.push(p[0]);ys.push(p[1]);}));const x0=Math.min(...xs)-2,y0=Math.min(...ys)-2,w=Math.max(...xs)+2-x0,h=Math.max(...ys)+2-y0;
    const N=2048,cv=document.createElement('canvas');cv.width=cv.height=N;const g=cv.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,N,N);g.globalCompositeOperation='lighter';
    const draw=(R,col)=>{g.fillStyle=col;g.beginPath();R.forEach(r=>{r.forEach((p,i)=>{const X=(p[0]-x0)/w*N,Y=(1-(p[1]-y0)/h)*N;i?g.lineTo(X,Y):g.moveTo(X,Y);});g.closePath();});g.fill('evenodd');};
    draw(PR_ALL,'#ff0000');draw(PR_BLD,'#00ff00');draw(PR_PARK,'#0000ff');
    return {cv,box:[x0,y0,w,h],tex:null};})();
}
function mtBottom(){if(!HAS_MT)return;const {ZD,ZB,CL,ZF}=MT;for(let k=0;k<ZF.length;k++){const c=CL[k];ZF[k]=c===2?ZB[k]:c===1?ZD[k]-MTP.eb:ZD[k]-MTP.ep;}}
mtBottom();
function mtAt(x,y){if(!HAS_MT)return null;const i=Math.round(x-MT.x0),j=Math.round(y-MT.y0);if(i<0||j<0||i>=MT.nx||j>=MT.ny)return null;const k=j*MT.nx+i;if(!isFinite(MT.ZD[k])||!isFinite(MT.ZT[k]))return null;return {zd:MT.ZD[k],zf:MT.ZF[k],zt:MT.ZT[k],c:MT.CL[k]};}
function mtCalc(p=MTP){const Z={1:{a:0,c:0,r:0,hmax:0,cmax:0},2:{a:0,c:0,r:0,hmax:0,cmax:0},3:{a:0,c:0,r:0,hmax:0,cmax:0}};let cj=0,tr=0,tc=0;const {nx,ny,ZD,ZT,CL,CX,CN,ZF}=MT;
  const ok=k=>isFinite(ZD[k])&&isFinite(ZT[k]);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(!ok(k))continue;const zd=ZF[k],d=zd-ZT[k],z=Z[CL[k]]||Z[3];z.a++;
    if(d>0){z.r+=d;z.hmax=Math.max(z.hmax,d);if(isFinite(CX[k]))cj+=Math.max(0,Math.min(zd,CX[k])-Math.max(ZT[k],CN[k]));}else{z.c-=d;z.cmax=Math.max(z.cmax,-d);}
    const edge=i===0||j===0||i===nx-1||j===ny-1||!ok(k-1)||!ok(k+1)||!ok(k-nx)||!ok(k+nx);
    if(edge){if(d>0)tr+=0.5*p.tr*d*d;else tc+=0.5*p.tc*d*d;}}
  const T={a:0,c:0,r:0};Object.values(Z).forEach(z=>{T.a+=z.a;T.c+=z.c;T.r+=z.r;});
  return {Z,T,cj,tr,tc,R:T.r-cj+tr,C:T.c+tc};}
function inProj(x,y){return HAS_MT&&LV.tcut&&inRings(PR_ALL,x,y);}
function zWalk(x,y){const q=mtAt(x,y);return q?q.zd:(hz(x,y)??ZR);}
/* ---------- capas ---------- */
const LAYERS=P.layers.map(l=>({...l}));
if(!HAS_MT){const i=LAYERS.findIndex(l=>l.id==='tcut');if(i>=0)LAYERS.splice(i,1);}
const LV={};LAYERS.forEach(l=>LV[l.id]=!l.off);
const LOP={};LAYERS.forEach(l=>LOP[l.id]=1);{const s0=lsGet('lop',{});Object.keys(s0).forEach(k=>{if(k in LOP&&isFinite(s0[k]))LOP[k]=Math.max(0,Math.min(1,+s0[k]));});}

/* ---------- escena 3D ---------- */
const V3=(x,y,z)=>new THREE.Vector3(x,z-ZR,-y);
let renderer,scene,camP,camO,ctlP,ctlO,camMode='persp',cam;
const GROUPS={};const PICK=[];const HIDDEN=new Set();const SNAPV=(P.snap||[]).map(s=>({x:s[0],y:s[1],z:s[2],lyr:s[3]}));
function mkGroup(id){const g=new THREE.Group();g.name=id;g.visible=LV[id]!==false;scene.add(g);GROUPS[id]=g;return g;}
function grp(id){return GROUPS[id]||mkGroup(id);}
function lineMat(c,op=1){return new THREE.LineBasicMaterial({color:c,transparent:op<1,opacity:op});}
function maskTex(){if(!MASK.tex){MASK.tex=new THREE.CanvasTexture(MASK.cv);MASK.tex.minFilter=THREE.LinearFilter;MASK.tex.magFilter=THREE.LinearFilter;MASK.tex.generateMipmaps=false;}return MASK.tex;}
function maskMat(mat,ch,mode){if(!HAS_MT)return mat;const u={uMask:{value:maskTex()},uBox:{value:new THREE.Vector4(...MASK.box)},uCh:{value:new THREE.Vector3(ch===0?1:0,ch===1?1:0,ch===2?1:0)},uMode:{value:mode}};
  mat.onBeforeCompile=sh=>{Object.assign(sh.uniforms,u);
    sh.vertexShader='varying vec3 vWP;\n'+sh.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n  vWP=(modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader='uniform sampler2D uMask;uniform vec4 uBox;uniform vec3 uCh;uniform float uMode;varying vec3 vWP;\n'+sh.fragmentShader.replace('void main() {','void main() {\n  if(uMode!=0.0){vec2 uv=vec2((vWP.x-uBox.x)/uBox.z,((-vWP.z)-uBox.y)/uBox.w);float m=0.0;if(uv.x>=0.0&&uv.x<=1.0&&uv.y>=0.0&&uv.y<=1.0)m=dot(texture2D(uMask,uv).rgb,uCh);if(uMode>0.5&&m>0.5)discard;if(uMode<-0.5&&m<0.5)discard;}');};
  mat.customProgramCacheKey=()=>'mask'+ch;mat.userData.mask=u;return mat;}
let TER=null;
function buildTerrain(){if(!G)return;
  const nx=G.nx,ny=G.ny,pos=new Float32Array(nx*ny*3),col=new Float32Array(nx*ny*3);
  const c0=new THREE.Color('#9fae8c'),c1=new THREE.Color('#c9b98f'),c2=new THREE.Color('#b69a7a');
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,x=G.x0+i*G.dx,y=G.y0+j*G.dx;let z=GZ[k];if(!isFinite(z))z=ZR;
    const v=V3(x,y,z);pos[k*3]=v.x;pos[k*3+1]=v.y;pos[k*3+2]=v.z;
    const t=Math.min(1,Math.max(0,(z-ZMIN)/Math.max(0.01,ZMAX-ZMIN)));const c=t<.5?c0.clone().lerp(c1,t*2):c1.clone().lerp(c2,(t-.5)*2);col[k*3]=c.r;col[k*3+1]=c.g;col[k*3+2]=c.b;}
  const idx=[];for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;if(isFinite(GZ[a])&&isFinite(GZ[b])&&isFinite(GZ[c])&&isFinite(GZ[d]))idx.push(a,c,b,b,c,d);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();
  const m=new THREE.Mesh(geo,maskMat(new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),0,0));m.userData.terrain=true;grp('terreno').add(m);PICK.push(m);
  TER={mesh:m};}
/* ortofoto de contexto (solo si el proyecto trae P.orto): imagen rectificada en coordenadas locales, drapeada sobre el terreno */
const ORTO=P.orto||null;
function hzc(x,y){if(!G)return ZR;const cx=Math.min(G.x0+G.dx*(G.nx-1),Math.max(G.x0,x)),cy=Math.min(G.y0+G.dx*(G.ny-1),Math.max(G.y0,y));const z=hz(cx,cy);return z==null?ZR:z;}
function buildOrto(){if(!ORTO)return;const o=ORTO,S=o.step||2,nx=Math.ceil((o.x1-o.x0)/S)+1,ny=Math.ceil((o.y1-o.y0)/S)+1,lift=o.lift!=null?o.lift:0.05;
  const pos=new Float32Array(nx*ny*3),uv=new Float32Array(nx*ny*2),ins=new Uint8Array(nx*ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,x=Math.min(o.x1,o.x0+i*S),y=Math.min(o.y1,o.y0+j*S),v=V3(x,y,hzc(x,y)+lift);
    pos[k*3]=v.x;pos[k*3+1]=v.y;pos[k*3+2]=v.z;uv[k*2]=(x-o.x0)/(o.x1-o.x0);uv[k*2+1]=(y-o.y0)/(o.y1-o.y0);ins[k]=!o.foot||pip([x,y],o.foot)?1:0;}
  const idx=[];for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;if(ins[a]&&ins[b]&&ins[c]&&ins[d])idx.push(a,b,c,b,d,c);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setIndex(idx);
  const tex=new THREE.TextureLoader().load(o.file);tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-0.5,polygonOffsetUnits:-0.5}));m.userData.orto=true;grp(o.layer||'orto').add(m);}
/* geometría desde la escena empaquetada (posiciones u16 sobre bbox) */
const QB=SC.meta.bb||[0,0,0,1,1,1],QS=[(QB[3]-QB[0])/65535,(QB[4]-QB[1])/65535,(QB[5]-QB[2])/65535];
function deq(arr,v0,n){const o=new Float32Array(n*3);for(let i=0;i<n;i++){const k=(v0+i)*3;const x=QB[0]+arr[k]*QS[0],y=QB[1]+arr[k+1]*QS[1],z=QB[2]+arr[k+2]*QS[2];o[i*3]=x;o[i*3+1]=z-ZR;o[i*3+2]=-y;}return o;}
const INFOS=SC.meta.infos||[];
const infoOf=i=>{if(i==null||i<0)return null;const f=INFOS[i];return {title:f.t||'',kind:f.k||'',rows:f.r||[],note:f.n||undefined,layer:f.ly||undefined};};
const INSTS=[];
function buildScene(){const A=SC.A;
  (SC.meta.meshes||[]).forEach(m=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(deq(A.mp,m.v0,m.n),3));
    let mat;if(m.vc!=null){const c=new Float32Array(m.n*3);for(let i=0;i<m.n*3;i++)c[i]=A.mc[m.vc+i]/255;g.setAttribute('color',new THREE.BufferAttribute(c,3));mat=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:!!m.tr,opacity:m.op,depthWrite:!(m.tr&&m.op<1)});}
    else mat=new THREE.MeshLambertMaterial({color:m.c,side:THREE.DoubleSide,transparent:!!m.tr,opacity:m.op,depthWrite:!(m.tr&&m.op<1),polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    g.computeVertexNormals();const me=new THREE.Mesh(g,mat);if(m.hid)me.visible=false;if(m.lv!=null)me.userData.level=m.lv;
    const inf=infoOf(m.i);if(inf){me.userData.info=inf;}PICK.push(me);grp(m.l).add(me);});
  (SC.meta.lines||[]).forEach(m=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(deq(A.lp,m.v0,m.n),3));
    const mat=m.dash?new THREE.LineDashedMaterial({color:m.c,dashSize:1.2,gapSize:0.8,transparent:(m.op??1)<1,opacity:m.op??1}):lineMat(m.c,m.op??1);
    const l=m.seg?new THREE.LineSegments(g,mat):new THREE.Line(g,mat);if(m.dash)l.computeLineDistances();
    const inf=infoOf(m.i);if(inf){l.userData.info=inf;PICK.push(l);}grp(m.l).add(l);});
  (SC.meta.inst||[]).forEach(m=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(A.ig.slice(m.g0*3,(m.g0+m.ng)*3),3));g.computeVertexNormals();
    const im=new THREE.InstancedMesh(g,new THREE.MeshLambertMaterial({color:m.c,transparent:(m.op??1)<1,opacity:m.op??1}),m.n);const M=new THREE.Matrix4();
    const base=A.im.slice(m.m0*16,(m.m0+m.n)*16);for(let i=0;i<m.n;i++){M.fromArray(base,i*16);im.setMatrixAt(i,M);}im.instanceMatrix.needsUpdate=true;
    (m.f||[]).forEach(f=>im.userData[f]=true);im.userData.base=base;INSTS.push(im);grp(m.l).add(im);if((m.f||[]).length)PICK.push(im);});
  buildLabels();}
const LBL=[];
function addLabel(x,y,z,txt,cls='',lyr){const d=document.createElement('div');d.className='lbl '+cls;d.textContent=txt;$('#labels').appendChild(d);const o={v:V3(x,y,z),d,lyr};LBL.push(o);return o;}
function buildLabels(){(P.labels||[]).forEach(l=>addLabel(l.x,l.y,l.z,l.s,l.cls||'',l.l||undefined));}
/* modelos con elementos (IFC u otros): triángulos con índice de elemento */
const IMESH=[];
const PAL=(P.materiales&&P.materiales.pal)||{};
let MATMODE=(P.materiales&&P.materiales.modo)||'ifc';try{MATMODE=localStorage.getItem(KEY+'mat')||MATMODE;}catch(e){}
function setMeshMat(me){const m=me.material;let col,tr;if(MATMODE==='render'&&PAL[me.userData.mk]){col=new THREE.Color(PAL[me.userData.mk][0]);tr=PAL[me.userData.mk][1];}else{const c=me.userData.cI;col=new THREE.Color(c[0],c[1],c[2]);tr=c[3]||0;}
  m.color=col;m.transparent=tr>0.01;m.opacity=1-Math.min(0.85,tr);m.depthWrite=tr<=0.01;m.userData.op0=null;m.needsUpdate=true;}
function setMatMode(v){MATMODE=v;try{localStorage.setItem(KEY+'mat',v);}catch(e){}IMESH.forEach(setMeshMat);LAYERS.forEach(l=>{if(LOP[l.id]<1)setLayerOp(l.id,LOP[l.id]);});}
function buildIFC(){if(!XI)return;const A=SC.A;let t0=0;
  XI.meshes.forEach(m=>{const pos=deq(A.xp,m.v0,m.n);const nt=m.n/3;const EI=A.xe.slice(t0,t0+nt);t0+=nt;
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.computeVertexNormals();
    const me=new THREE.Mesh(g,new THREE.MeshLambertMaterial({side:THREE.DoubleSide}));me.userData.ifc=EI;me.userData.level=m.lv;me.userData.cI=m.cI;me.userData.mk=m.mk;setMeshMat(me);grp(m.l).add(me);PICK.push(me);IMESH.push(me);});}
let ISEL=null;const IHID=new Map();
function ifcInfo(ei){const e=IEL[ei];return {kind:e.k||'',title:e.t||'Elemento',rows:e.r||[],ifc:ei};}
function ifcTris(ei){const out=[];IMESH.forEach(me=>{const E=me.userData.ifc;for(let t=0;t<E.length;t++)if(E[t]===ei)out.push([me,t]);});return out;}
function ifcHighlight(ei){clearSel();const Pp=[];let host=null;ifcTris(ei).forEach(([me,t])=>{host=me;const a=me.geometry.attributes.position.array;for(let k=0;k<9;k++)Pp.push(a[t*9+k]);});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(Pp,3));g.computeVertexNormals();
  const col=getComputedStyle(document.documentElement).getPropertyValue('--sel').trim()||'#e0a100';
  const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:0.75,side:THREE.DoubleSide,depthTest:true,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}));m.renderOrder=9;
  if(host)m.position.y=host.position.y;scene.add(m);ISEL={ei,mesh:m};}
function ifcHide(ei){ifcTris(ei).forEach(([me,t])=>{const a=me.geometry.attributes.position.array;let h=IHID.get(me);if(!h){h=new Map();IHID.set(me,h);}if(h.has(t))return;h.set(t,a.slice(t*9,t*9+9));for(let k=0;k<9;k++)a[t*9+k]=a[t*9+(k%3)];me.geometry.attributes.position.needsUpdate=true;});}
function ifcShowAll(){IHID.forEach((h,me)=>{const a=me.geometry.attributes.position.array;h.forEach((v,t)=>a.set(v,t*9));me.geometry.attributes.position.needsUpdate=true;});IHID.clear();}
function ifcHiddenCount(){let n=new Set();IHID.forEach((h,me)=>h.forEach((v,t)=>n.add(me.userData.ifc[t])));return n.size;}
/* ---------- módulo: modelos federados con elementos (IFC/DXF convertidos), interferencias y ejes ----------
   Se activa si proyecto.json trae «modelos». Formato de archivo: gzip(u32 + JSON{nv,nt,bbox,chunks,elements} + pos u16 + col u8 + idx u32 + TE u16). */
const MO=P.modelos||null;const HAS_MOD=!!(MO&&MDL&&Object.keys(MDL).length);
const MD=MDL||{};
const MEPC=(MO&&MO.mep)||{};const MEP=k=>!!MEPC[k];
const DSH=(MO&&MO.dsh)||{};const LEVELS=(MO&&MO.levels)||[];
const LVC=(MO&&MO.lvCuts)||[3.675,7.5];
const lvOfZ=z=>{let i=0;while(i<LVC.length&&z>=LVC[i])i++;return i;};
const lvOn=lv=>LV['lv|'+lv]!==false;
const fz=(z,d=2)=>(z>0.004?'+':z<-0.004?'−':'±')+fmt(Math.abs(z),d);
const GRIDS=((MO&&MO.grids)||[]).map(g=>({...g,v:Math.abs(g.a[0]-g.b[0])<0.5,h:Math.abs(g.a[1]-g.b[1])<0.5}));
const CLASH=(MO&&MO.clash)||[];
const SEV=(MO&&MO.sev)||{int:{n:'Interferencia',c:'#b3261e',d:''},rev:{n:'Revisar',c:'#b7791f',d:''},con:{n:'Contacto',c:'#2f5d86',d:''}};
const CSTN=(MO&&MO.cstn)||{abierta:'Abierta',resuelta:'Resuelta',aceptada:'Aceptada'};
const CST=lsGet('clash',{});const saveCST=()=>lsSet('clash',CST);
const cstOf=id=>(CST[id]&&CST[id].s)||'abierta';
const pairOf=c=>[[MD[c.ma||'est'],c.e],[MD[c.mb||'arq'],c.a]];
const MSECS=(MO&&MO.secs)||[];
const PLAN_H=(MO&&MO.planH)||[];
const LSTY={};LAYERS.forEach(l=>{if(l.st)LSTY[l.id]=l;});
const STY=k=>{const [m,c,g]=k.split('|');const l=LSTY[m+'|'+c];if(!l)return {c:'#555',w:0.2};return g&&l.stg?l.stg:l.st;};
const ORDER=k=>{const [m,c]=k.split('|');const l=LSTY[m+'|'+c];return l?l.ord:10;};
const MESHES=[];
function buildMeshes(d){
  const MAXT=16000;
  d.meta.chunks.forEach((ch,ci)=>{
    const lyr=d.key+'|'+ch.c;const g=grp(lyr);
    for(let s=ch.t0;s<ch.t0+ch.nt;s+=MAXT){
      const e=Math.min(ch.t0+ch.nt,s+MAXT);let vmin=1e12,vmax=-1;for(let k=s*3;k<e*3;k++){const v=d.I[k];if(v<vmin)vmin=v;if(v>vmax)vmax=v;}
      const nv=vmax-vmin+1,p=new Float32Array(nv*3),c=new Float32Array(nv*3);
      for(let i=0;i<nv;i++){const j=(vmin+i)*3;p[i*3]=d.W[j];p[i*3+1]=d.W[j+2]-ZR;p[i*3+2]=-d.W[j+1];c[i*3]=d.col[j]/255;c[i*3+1]=d.col[j+1]/255;c[i*3+2]=d.col[j+2]/255;}
      const ix=new Uint32Array((e-s)*3);for(let k=0;k<ix.length;k++)ix[k]=d.I[s*3+k]-vmin;
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setAttribute('color',new THREE.BufferAttribute(c,3));geo.setIndex(new THREE.BufferAttribute(ix,1));geo.computeVertexNormals();geo.computeBoundingSphere();geo.computeBoundingBox();
      const mat=ch.glass?new THREE.MeshPhongMaterial({color:0x9fb7c4,transparent:true,opacity:0.3,depthWrite:false,side:THREE.DoubleSide,shininess:60})
        :new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide,shininess:0,specular:0x000000});
      const mesh=new THREE.Mesh(geo,mat);mesh.userData={m:d.key,t0:s,nt:e-s,lyr,lv:ch.lv,level:ch.lv,glass:ch.glass,ix0:ix,vmin};mesh.visible=lvOn(ch.lv);
      g.add(mesh);PICK.push(mesh);MESHES.push(mesh);
    }
  });
}
/* pisos para primera persona: superficies horizontales en grilla de 0,5 m */
const FL={k:0.5,x0:0,y0:0,nx:0,ny:0,m:new Map()};
function buildFloors(){if(!HAS_MOD)return;
  const skip=new Set((MO&&MO.floorSkip)||['Letreros','Barandas','Puertas y ventanas','Armaduras','Conexiones','Perfiles Metalcon','Vigas','Viguetas','Columnas']);const zcap=(MO&&MO.floorCap)||null;
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;Object.values(MD).forEach(d=>{const b=d.meta.bbox;x0=Math.min(x0,b[0]);y0=Math.min(y0,b[1]);x1=Math.max(x1,b[3]);y1=Math.max(y1,b[4]);});
  const k=FL.k;FL.x0=x0;FL.y0=y0;FL.nx=Math.ceil((x1-x0)/k)+1;FL.ny=Math.ceil((y1-y0)/k)+1;
  const add=(i,j,z)=>{const key=j*FL.nx+i;let a=FL.m.get(key);if(!a){a=[];FL.m.set(key,a);}if(!a.some(v=>Math.abs(v-z)<0.08))a.push(z);};
  Object.values(MD).forEach(d=>{if(MEP(d.key))return;const W=d.W,I=d.I;const cats=d.meta.chunks.map(ch=>skip.has(ch.c)||ch.glass);
    for(let t=0;t<d.meta.nt;t++){if(cats[d.TL[t]])continue;const a=I[t*3]*3,b=I[t*3+1]*3,c=I[t*3+2]*3;
      const ux=W[b]-W[a],uy=W[b+1]-W[a+1],uz=W[b+2]-W[a+2],vx=W[c]-W[a],vy=W[c+1]-W[a+1],vz=W[c+2]-W[a+2];
      const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx,nl=Math.hypot(nx,ny,nz);if(!nl||Math.abs(nz)/nl<0.85)continue;
      const zz=Math.max(W[a+2],W[b+2],W[c+2]);if(zcap&&zz>zcap.z&&d.key===zcap.m&&d.meta.chunks[d.TL[t]].c!==zcap.keep)continue;
      const tx0=Math.min(W[a],W[b],W[c]),tx1=Math.max(W[a],W[b],W[c]),ty0=Math.min(W[a+1],W[b+1],W[c+1]),ty1=Math.max(W[a+1],W[b+1],W[c+1]);
      const i0=Math.ceil((tx0-x0)/k-0.5),i1=Math.floor((tx1-x0)/k-0.5),j0=Math.ceil((ty0-y0)/k-0.5),j1=Math.floor((ty1-y0)/k-0.5);
      const det=ux*vy-uy*vx;let hit=false;
      for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const px=x0+(i+0.5)*k-W[a],py=y0+(j+0.5)*k-W[a+1];const s=(px*vy-py*vx)/det,r=(ux*py-uy*px)/det;if(s<-1e-6||r<-1e-6||s+r>1+1e-6)continue;hit=true;add(i,j,W[a+2]+s*uz+r*vz);}
      if(!hit){const cx=(W[a]+W[b]+W[c])/3,cy=(W[a+1]+W[b+1]+W[c+1])/3;add(Math.floor((cx-x0)/k),Math.floor((cy-y0)/k),(W[a+2]+W[b+2]+W[c+2])/3);}
    }});}
function floorAt(x,y,zref){if(!FL.nx)return null;const i=Math.floor((x-FL.x0)/FL.k),j=Math.floor((y-FL.y0)/FL.k);if(i<0||j<0||i>=FL.nx||j>=FL.ny)return null;const a=FL.m.get(j*FL.nx+i);if(!a)return null;let b=null;for(const z of a)if(z<=zref+0.45&&(b==null||z>b))b=z;return b;}
function gridExt(g,e=4){const dx=g.b[0]-g.a[0],dy=g.b[1]-g.a[1],L=Math.hypot(dx,dy);return [[g.a[0]-dx/L*e,g.a[1]-dy/L*e],[g.b[0]+dx/L*e,g.b[1]+dy/L*e]];}
function buildGrids(){if(!GRIDS.length)return;
  const g=grp('co|grid');const mat=new THREE.LineDashedMaterial({color:0x55606a,dashSize:1.2,gapSize:0.5});
  const m=1.0,X0=BB.x0-m,X1=BB.x1+m,Y0=BB.y0-m,Y1=BB.y1+m;
  const clip=(a,b)=>{let t0=0,t1=1;const d=[b[0]-a[0],b[1]-a[1]];for(const [p,q] of [[-d[0],a[0]-X0],[d[0],X1-a[0]],[-d[1],a[1]-Y0],[d[1],Y1-a[1]]]){if(Math.abs(p)<1e-12){if(q<0)return null;continue;}const r=q/p;if(p<0)t0=Math.max(t0,r);else t1=Math.min(t1,r);}return t0<t1?[t0,t1]:null;};
  const seg=(p,q)=>{const geo=new THREE.BufferGeometry().setFromPoints([V3(p[0],p[1],0.02),V3(q[0],q[1],0.02)]);const l=new THREE.Line(geo,mat);l.computeLineDistances();g.add(l);};
  const at=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  GRIDS.forEach(gr=>{const [a,b]=gridExt(gr,3.6);const c=clip(a,b);if(!c){seg(a,b);}else{if(c[0]>0)seg(a,at(a,b,c[0]));if(c[1]<1)seg(at(a,b,c[1]),b);}
    const [a2,b2]=gridExt(gr,4.6);addLabel(a2[0],a2[1],0.3,gr.n,'grid','co|grid');addLabel(b2[0],b2[1],0.3,gr.n,'grid','co|grid');});
  for(let i=0;i<GRIDS.length;i++)for(let j=i+1;j<GRIDS.length;j++){const A=GRIDS[i],B=GRIDS[j];const t=segX(A.a,A.b,B.a,B.b);if(t==null)continue;const x=A.a[0]+(A.b[0]-A.a[0])*t,y=A.a[1]+(A.b[1]-A.a[1])*t;SNAPV.push({x,y,z:0,lyr:'co|grid',n:'Eje '+A.n+'/'+B.n});}}
function buildClashes(){if(!CLASH.length)return;
  const g=grp('co|clash');
  CLASH.forEach(c=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.32,14,10),new THREE.MeshBasicMaterial({color:SEV[c.s].c,depthTest:false,transparent:true,opacity:0.9}));m.renderOrder=20;m.position.copy(V3(c.p[0],c.p[1],c.p[2]));m.userData={clash:c};g.add(m);PICK.push(m);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(0.55,0.05,6,24),new THREE.MeshBasicMaterial({color:SEV[c.s].c,depthTest:false}));ring.renderOrder=20;ring.position.copy(m.position);ring.rotation.x=Math.PI/2;g.add(ring);
    addLabel(c.p[0],c.p[1],c.p[2]+0.9,'C'+c.id,'clash '+c.s,'co|clash');});}
function buildModels(){if(!HAS_MOD)return;Object.values(MD).forEach(buildMeshes);buildGrids();buildClashes();}
function hitElem(h){const u=h.object.userData;if(u.iso){const ref=ISO.tris[h.faceIndex];return ref?{d:MD[ref[0]],ei:MD[ref[0]].TE[ref[1]],t:ref[1]}:null;}if(!u.m)return null;const d=MD[u.m];const loc=u.tmap?u.tmap[h.faceIndex]:h.faceIndex;const t=u.t0+loc;return {d,ei:d.TE[t],t};}
function elTris(d,ei){return d.ET.subarray(d.EO[ei],d.EO[ei+1]);}
function elGeom(list,withColor){let n=0;list.forEach(([d,ei])=>n+=d.EO[ei+1]-d.EO[ei]);const p=new Float32Array(n*9),c=withColor?new Float32Array(n*9):null,tris=[];let o=0;
  list.forEach(([d,ei])=>{elTris(d,ei).forEach(t=>{tris.push([d.key,t]);for(let q=0;q<3;q++){const v=d.I[t*3+q]*3;p[o]=d.W[v];p[o+1]=d.W[v+2]-ZR;p[o+2]=-d.W[v+1];if(c){const gl=d.meta.chunks[d.TL[t]].glass;c[o]=gl?0.62:d.col[v]/255;c[o+1]=gl?0.72:d.col[v+1]/255;c[o+2]=gl?0.77:d.col[v+2]/255;}o+=3;}});});
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));if(c)g.setAttribute('color',new THREE.BufferAttribute(c,3));g.computeVertexNormals();g.computeBoundingSphere();g.computeBoundingBox();return {g,tris};}
const cssv=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
let MSEL=null;
function clearMSel(){if(MSEL){MSEL.meshes.forEach(m=>{scene.remove(m);m.geometry.dispose();});MSEL=null;}}
function mHighlight(list,cols){clearSel();const meshes=list.map(([d,ei],i)=>{const {g}=elGeom([[d,ei]],false);const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:(cols&&cols[i])||cssv('--sel')||'#e0a100',transparent:true,opacity:0.62,depthTest:false,side:THREE.DoubleSide}));m.renderOrder=15;scene.add(m);return m;});MSEL={list,meshes};}
function rebuildIdx(d){
  MESHES.filter(m=>m.userData.m===d.key).forEach(m=>{const u=m.userData;const keep=[];for(let k=0;k<u.nt;k++){if(!d.hidden.has(d.TE[u.t0+k]))keep.push(k);}
    if(keep.length===u.nt){if(u.tmap){m.geometry.setIndex(new THREE.BufferAttribute(u.ix0,1));u.tmap=null;}return;}
    const ix=new Uint32Array(keep.length*3);keep.forEach((k,i)=>{ix[i*3]=u.ix0[k*3];ix[i*3+1]=u.ix0[k*3+1];ix[i*3+2]=u.ix0[k*3+2];});m.geometry.setIndex(new THREE.BufferAttribute(ix,1));u.tmap=Uint32Array.from(keep);});}
const mHiddenN=()=>Object.values(MD).reduce((s,d)=>s+d.hidden.size,0);
function hideEl(d,ei){d.hidden.add(ei);rebuildIdx(d);}
function showAllHiddenM(){Object.values(MD).forEach(d=>{if(d.hidden.size){d.hidden.clear();rebuildIdx(d);}});}
const ISO={on:false,mesh:null,tris:null};
function isolate(list){exitIso(true);const {g,tris}=elGeom(list,true);const m=new THREE.Mesh(g,new THREE.MeshPhongMaterial({vertexColors:true,flatShading:true,side:THREE.DoubleSide,shininess:0}));m.userData={iso:true};scene.add(m);ISO.on=true;ISO.mesh=m;ISO.tris=tris;Object.values(GROUPS).forEach(gr=>{if(gr.name!=='co|clash'&&gr.name!=='co|grid')gr.visible=false;});
  const b=g.boundingBox;const c=b.getCenter(new THREE.Vector3()),s=b.getSize(new THREE.Vector3());const w=worldOf(c);focusWorld(w.x,w.y,Math.max(6,s.length()*1.4),w.z);}
function exitIso(quiet){if(!ISO.on)return;scene.remove(ISO.mesh);ISO.mesh.geometry.dispose();ISO.on=false;ISO.mesh=null;Object.values(GROUPS).forEach(gr=>gr.visible=LV[gr.name]!==false);if(!quiet)toast('Se muestra el modelo completo.');}
function clashesOf(d,ei){return CLASH.filter(c=>((c.ma||'est')===d.key&&c.e===ei)||((c.mb||'arq')===d.key&&c.a===ei));}
function elRows(d,e,ei){
  const b=e.bb;const rows=[['Disciplina',d.name],['Categoría',e.c],['Nivel del visor',LEVELS[e.lv]||'—']];
  const kind=d.kind||(MEP(d.key)?'mep':'ifc');
  if(kind==='mep'){(e.ds||[]).forEach(r=>rows.push(r));rows.push(['Capa DXF',e.ly||'—']);}
  else if(kind==='ifc'){rows.push(['Clase IFC',e.cls||'—']);if(e.st)rows.push(['Nivel Revit',e.st]);if(e.m&&e.m.length)rows.push(['Material',e.m.join(', ')]);}
  else{rows.push(['Capa SketchUp',e.ly||'—']);if(e.m&&e.m.length)rows.push(['Acabado inferido',e.m.join(', ')]);}
  rows.push(['Dimensión X',fmt(b[3]-b[0])+' m'],['Dimensión Y',fmt(b[4]-b[1])+' m'],['Altura',fmt(b[5]-b[2])+' m'],['Cota inferior',fz(b[2])+' m'],['Cota superior',fz(b[5])+' m'],['Centro X · Y',fmt((b[0]+b[3])/2,2)+' · '+fmt((b[1]+b[4])/2,2)],['Triángulos',fmt(e.t,0)],...(kind==='mep'?[['Código visor',e.g]]:[['GlobalId',e.g],['Id IFC','#'+e.id]]));
  return rows;}
function elInfo(d,ei,xyz){const e=d.els[ei];const cl=clashesOf(d,ei);
  return {kind:d.name+' · '+e.c,title:e.n||'Elemento',rows:elRows(d,e,ei),xy:xyz?[xyz.x,xyz.y,xyz.z]:null,
    extra:cl.length?`<p class="note warn">En ${cl.length===1?'una interferencia':cl.length+' interferencias'}: ${cl.map(c=>`<button class="btn" data-clash="${c.id}" style="margin:4px 4px 0 0">C${c.id} · ${SEV[c.s].n}</button>`).join('')}</p>`:''};}
function clashInfo(c){
  const [[da,ia],[db,ib]]=pairOf(c),e=da.els[ia],a=db.els[ib];const st=cstOf(c.id);const kd=d=>d.kind||(MEP(d.key)?'mep':'ifc');const idr=(d,x)=>kd(d)==='ifc'?[['Clase IFC',x.cls||''],['GlobalId '+(d.short||d.key)+'.',x.g]]:kd(d)==='skp'?[['Capa '+(d.short||d.key)+'.',x.ly||'—'],['GlobalId '+(d.short||d.key)+'.',x.g]]:[['Capa DXF',x.ly||'—']];
  const nm=d=>DSH[d.key]||d.name;
  return {kind:'coordinación · '+nm(da).toLowerCase()+' contra '+nm(db).toLowerCase(),title:'Interferencia C'+c.id,rows:[['Severidad',SEV[c.s].n+' · '+SEV[c.s].d],...(c.nt?[['Observación',c.nt]]:[]),['Profundidad del choque',fmt(c.d*100,1)+' cm'],['Extensión del contacto',fmt(c.l,2)+' m'],[nm(da),e.n+' · '+e.c],...idr(da,e),[nm(db),a.n+' · '+a.c],...idr(db,a),['Posición X · Y',fmt(c.p[0])+' · '+fmt(c.p[1])],['Cota',fz(c.p[2])+' m'],['Estado',CSTN[st]]],
    xy:c.p,extra:`<label style="display:block;margin-top:8px;font-size:13px">Estado <select class="sm" id="pp-cst">${Object.entries(CSTN).map(([k,v])=>`<option value="${k}"${k===st?' selected':''}>${v}</option>`).join('')}</select></label><input id="pp-cnote" value="${esc((CST[c.id]&&CST[c.id].n)||'')}" placeholder="Nota de coordinación (responsable, decisión)" style="margin-top:6px;width:100%;border:1px solid var(--rule);border-radius:6px;padding:5px 7px;background:var(--panel);color:var(--ink)">`,
    note:'Amarillo: '+nm(da).toLowerCase()+'. Rojo: '+nm(db).toLowerCase()+'. La caja de sección encierra 10 × 10 m alrededor del choque. Detectado por choque de mallas entre ambos modelos; la penetración es aproximada.'+(((MO&&MO.clashNotes)||{})[da.key]||''),
    btns:'<button class="btn" id="pp-pair">Aislar el par</button><button class="btn" id="pp-nobox">Quitar caja de sección</button><button class="btn" id="pp-tab">Ver en tablero</button>',
    wire:()=>{$('#pp-cst').onchange=e=>{CST[c.id]={...(CST[c.id]||{}),s:e.target.value};saveCST();toast('Estado guardado en este navegador.');};$('#pp-cnote').onchange=e=>{CST[c.id]={...(CST[c.id]||{}),n:e.target.value.trim()};saveCST();toast('Nota guardada.');};
      $('#pp-pair').onclick=()=>{isolate(pairOf(c));mHighlight(pairOf(c),[cssv('--sel'),'#b3261e']);};$('#pp-tab').onclick=openCoord;$('#pp-nobox').onclick=()=>{clearBox();toast('Caja de sección desactivada.');};}};}
function setCutUI(){[['x0','cb-x0','o-x0'],['x1','cb-x1','o-x1'],['y0','cb-y0','o-y0'],['y1','cb-y1','o-y1']].forEach(([k,id,o])=>{$('#'+id).value=CUT[k];$('#'+o).textContent=fmt(k[0]==='x'?utmE(CUT[k]):utmN(CUT[k]),1);});$('#cb-z').value=CUT.z;$('#o-z').textContent=fmt(CUT.z,2);$('#cut-box').checked=CUT.box;$('#cut-h').checked=CUT.h;$('#cut-v').checked=CUT.v;applyCut();}
function clashBox(c){const r=5;Object.assign(CUT,{box:true,h:true,x0:c.p[0]-r,x1:c.p[0]+r,y0:c.p[1]-r,y1:c.p[1]+r,z:Math.min(ZMAX+2,c.p[2]+2.2)});setCutUI();$('#cutp').hidden=false;$('#btn-cut').setAttribute('aria-pressed','true');}
function clearBox(){CUT.box=false;CUT.h=false;CUT.v=false;setCutUI();$('#cutp').hidden=true;$('#btn-cut').setAttribute('aria-pressed','false');}
function gotoClash(c){if(!c)return;setTab('3d');if(camMode==='fp'||camMode==='plan')setCam('persp');setLayer('co|clash',true);renderLayers();
  mHighlight(pairOf(c),[cssv('--sel'),'#b3261e']);clashBox(c);focusWorld(c.p[0],c.p[1],11,c.p[2]);showInfo(clashInfo(c),null);}
/* cortes horizontales del modelo para plantas */
const SLICE={};
function sliceAt(h){if(SLICE[h])return SLICE[h];const out={};
  Object.values(MD).forEach(d=>{if(MEP(d.key))return;const W=d.W,I=d.I;const cl=d.meta.chunks.map(ch=>d.key+'|'+ch.c+(ch.glass?'|g':''));const acc={};
    for(let t=0;t<d.meta.nt;t++){const i0=I[t*3]*3,i1=I[t*3+1]*3,i2=I[t*3+2]*3;const z0=W[i0+2]-h,z1=W[i1+2]-h,z2=W[i2+2]-h;if((z0>0&&z1>0&&z2>0)||(z0<=0&&z1<=0&&z2<=0))continue;const Q=[];
      const ed=(p,q,a,b)=>{if((a>0)===(b>0))return;const k=a/(a-b);Q.push(W[p]+(W[q]-W[p])*k,W[p+1]+(W[q+1]-W[p+1])*k);};ed(i0,i1,z0,z1);ed(i1,i2,z1,z2);ed(i2,i0,z2,z0);if(Q.length<4)continue;
      const lk=cl[d.TL[t]];(acc[lk]||(acc[lk]=[])).push(Q[0],Q[1],Q[2],Q[3],d.TE[t]);}
    Object.entries(acc).forEach(([k,v])=>{const n=v.length/5,s=new Float32Array(n*4),e=new Uint16Array(n);for(let i=0;i<n;i++){s[i*4]=v[i*5];s[i*4+1]=v[i*5+1];s[i*4+2]=v[i*5+2];s[i*4+3]=v[i*5+3];e[i]=v[i*5+4];}out[k]={s,e,m:d.key};});});
  return SLICE[h]=out;}
const MBAND=(MO&&MO.mepBands)||[[3,[-6,3]],[6,[3,6]],[99,[6,11]]];
function allBand(h){for(const [lim,b] of MBAND)if(h<lim)return b;return MBAND[MBAND.length-1][1];}
const VERT=new Set((MO&&MO.vert)||['Bajadas','Ductos de extracción','Shafts solicitados','Bajadas y ventilaciones']);
const BYLV=new Set((MO&&MO.mepByLevel)||['apf','as']);
function allFoot(h){const [b0,b1]=allBand(h);const out={};const lvh=lvOfZ(h);Object.keys(MEPC).forEach(key=>{const d=MD[key];if(!d)return;const byLv=BYLV.has(key);
  d.els.forEach((e,i)=>{if(d.hidden.has(i)||!e.fp)return;const z0=e.bb[2],z1=e.bb[5];if(!((byLv?e.lv===lvh:(z0>=b0&&z0<b1))||(z0<h&&z1>h&&VERT.has(e.c))))return;const k=key+'|'+e.c;const a=out[k]||(out[k]={s:[],e:[],m:key});
    e.fp.forEach(Pp=>{for(let j=1;j<Pp.length;j++){a.s.push(Pp[j-1][0],Pp[j-1][1],Pp[j][0],Pp[j][1]);a.e.push(i);}});});});
  Object.values(out).forEach(a=>{a.s=new Float32Array(a.s);a.e=new Uint16Array(a.e);});return out;}
function modelPlanDL(o={}){
  const s=o.scale||200,dl=[];const kk=200/s;const on=id=>o.layers?!!o.layers[id]:LV[id];
  const h=o.h!=null?o.h:1.2;const sl={...sliceAt(h),...allFoot(h)};
  const lo=id=>(!o.layers&&LOP[id]<1)?LOP[id]:null;
  if(on('co|grid')){GRIDS.forEach(g=>{const [a,b]=gridExt(g,3);dl.push({t:'L',p:[a,b],c:INK.g1,w:0.13,d:[6,1.2,0.8,1.2],lo:lo('co|grid')});const [a2,b2]=gridExt(g,3+2.6/(1000/s));[a2,b2].forEach(p=>{dl.push({t:'C',x:p[0],y:p[1],r:0,rp:2.6,f:'#ffffff',c:INK.k,w:0.2,lo:lo('co|grid')});dl.push({t:'T',x:p[0],y:p[1],dy:-0.75,s:g.n,h:2.1,a:'middle',c:INK.k,b:true,lo:lo('co|grid')});});});}
  Object.keys(sl).sort((p,q)=>ORDER(p)-ORDER(q)).forEach(key=>{const lid=key.split('|').slice(0,2).join('|');if(!on(lid))return;const d=MD[sl[key].m];let s0=sl[key].s;
    if(!o.layers&&d.hidden.size){const keep=[];for(let i=0;i<sl[key].e.length;i++)if(!d.hidden.has(sl[key].e[i]))keep.push(s0[i*4],s0[i*4+1],s0[i*4+2],s0[i*4+3]);s0=new Float32Array(keep);}
    const st=STY(key);const mk=key.split('|')[0];const mono=o.mono&&!String(o.mono).split(',').includes(mk)&&!((o.mono==='arq'||o.mono==='est')&&MEP(mk));dl.push({t:'M',s:s0,c:mono?INK.g2:st.c,w:mono?0.13:st.w*kk*1.2,lo:lo(lid),lyr:lid});});
  if(on('co|clash')){CLASH.filter(c=>o.allClash||lvOfZ(c.p[2])===lvOfZ(h)).forEach(c=>{const col=SEV[c.s].c;dl.push({t:'C',x:c.p[0],y:c.p[1],r:0,rp:2.2,f:'none',c:col,w:0.4,id:'cl-'+c.id});dl.push({t:'T',x:c.p[0],y:c.p[1],dx:2.6,dy:1.6,s:'C'+c.id,h:2,a:'start',c:col,b:true,bg:1,id:'cl-'+c.id});});}
  if(o.secMarks){MSECS.forEach(sc=>{[sc.a,sc.b].forEach((p,i)=>{dl.push({t:'L',p:[p,[p[0]+(i?-1:1)*(sc.b[0]-sc.a[0])/dist2(sc.a,sc.b)*3,p[1]+(i?-1:1)*(sc.b[1]-sc.a[1])/dist2(sc.a,sc.b)*3]],c:INK.ora||'#b7791f',w:0.5,id:'sec-'+sc.n});dl.push({t:'T',x:p[0],y:p[1],dy:2,s:sc.n,h:3,a:'middle',c:INK.ora||'#b7791f',b:true,bg:1,id:'sec-'+sc.n});});dl.push({t:'L',p:[sc.a,sc.b],c:INK.ora||'#b7791f',w:0.15,d:[8,1.5,1,1.5],id:'sec-'+sc.n});});}
  dl.lay=dl.map(e=>e.lyr||(e.id?String(e.id).split('-')[0]:'modelo'));return dl;}
/* cortes verticales del modelo */
function sectionData(a,b,o={}){
  const L=dist2(a,b),ux=(b[0]-a[0])/L,uy=(b[1]-a[1])/L,nx=-uy,ny=ux;const out={};const lay=o.layers||LV;
  Object.values(MD).forEach(d=>{const W=d.W,I=d.I,nv=W.length/3;const sd=new Float32Array(nv);for(let i=0;i<nv;i++)sd[i]=(W[i*3]-a[0])*nx+(W[i*3+1]-a[1])*ny;
    const cl=d.meta.chunks.map(ch=>(lay[d.key+'|'+ch.c]&&(o.layers||lvOn(ch.lv)))?d.key+'|'+ch.c+(ch.glass?'|g':''):null);const acc={};
    for(let t=0;t<d.meta.nt;t++){const lk=cl[d.TL[t]];if(!lk)continue;if(!o.layers&&d.hidden.size&&d.hidden.has(d.TE[t]))continue;const i0=I[t*3],i1=I[t*3+1],i2=I[t*3+2];const s0=sd[i0],s1=sd[i1],s2=sd[i2];
      if((s0>0&&s1>0&&s2>0)||(s0<0&&s1<0&&s2<0))continue;const Q=[];
      const ed=(p,q,sp,sq)=>{if((sp>0)===(sq>0)&&sp!==0&&sq!==0)return;const k=sp/(sp-sq);if(!isFinite(k))return;const x=W[p*3]+(W[q*3]-W[p*3])*k,y=W[p*3+1]+(W[q*3+1]-W[p*3+1])*k,z=W[p*3+2]+(W[q*3+2]-W[p*3+2])*k;Q.push((x-a[0])*ux+(y-a[1])*uy,z);};
      ed(i0,i1,s0,s1);ed(i1,i2,s1,s2);ed(i2,i0,s2,s0);if(Q.length<4)continue;
      let sA=Q[0],zA=Q[1],sB=Q[2],zB=Q[3];if(Math.abs(sA-sB)<1e-4&&Math.abs(zA-zB)<1e-4)continue;
      if(sA>sB){[sA,sB]=[sB,sA];[zA,zB]=[zB,zA];}if(sB<0||sA>L)continue;
      if(sA<0){zA=zA+(zB-zA)*(0-sA)/(sB-sA);sA=0;}if(sB>L){zB=zA+(zB-zA)*(L-sA)/(sB-sA);sB=L;}
      (acc[lk]||(acc[lk]=[])).push(sA,zA,sB,zB);}
    Object.entries(acc).forEach(([k,v])=>out[k]=new Float32Array(v));});
  const X=[];GRIDS.forEach(g=>{const [p,q]=gridExt(g,0);const t=segX(a,b,p,q);if(t!=null)X.push({s:t*L,n:g.n});});X.sort((p,q)=>p.s-q.s);
  const CL=CLASH.filter(c=>Math.abs((c.p[0]-a[0])*nx+(c.p[1]-a[1])*ny)<1.5).map(c=>({c,s:(c.p[0]-a[0])*ux+(c.p[1]-a[1])*uy})).filter(x=>x.s>=0&&x.s<=L);
  return {a,b,L,segs:out,X,CL};}
function sectionDL(sd,box,o={}){
  const [bx,by,bw,bh]=box;const zr=(MO&&MO.secZ)||[-1.5,12.5];const zmin=zr[0],zmax=zr[1];
  const k=o.k||Math.min((bw-26)/sd.L,(bh-12)/(zmax-zmin));const ox=bx+18,oy=by+8;const X=s=>ox+s*k,Y=z=>oy+(zmax-z)*k;const dl=[];
  const lv=[...((MO&&MO.storeys)||[]).map(s=>({z:s.z,n:s.n,c:INK.g1})),...((MO&&MO.losas)||[]).map(s=>({z:s.z,n:s.n,c:INK.ora||'#b7791f',arq:1}))];
  lv.forEach(l=>{dl.push({t:'L',p:[[X(0),Y(l.z)],[X(sd.L),Y(l.z)]],c:l.c,w:0.13,d:[3,1.2]});dl.push({t:'T',x:X(sd.L)+1.5,y:Y(l.z)+(l.arq?2.6:0.7),s:fz(l.z)+'  '+l.n,h:1.7,a:'start',c:l.c});});
  sd.X.forEach(x=>{dl.push({t:'L',p:[[X(x.s),Y(zmax-0.6)],[X(x.s),Y(zmin)]],c:INK.g2,w:0.13,d:[4,1,0.6,1]});dl.push({t:'C',x:X(x.s),y:Y(zmax-0.6)-2.6,r:2.4,rp:2.4,f:'#ffffff',c:INK.k,w:0.2});dl.push({t:'T',x:X(x.s),y:Y(zmax-0.6)-1.95,s:x.n,h:2,a:'middle',c:INK.k,b:true});});
  Object.keys(sd.segs).sort((p,q)=>ORDER(p)-ORDER(q)).forEach(key=>{const v=sd.segs[key],st=STY(key),q=new Float32Array(v.length);for(let i=0;i<v.length;i+=2){q[i]=X(v[i]);q[i+1]=Y(v[i+1]);}dl.push({t:'M',s:q,c:st.c,w:st.w,lyr:key});});
  sd.CL.forEach(x=>{dl.push({t:'C',x:X(x.s),y:Y(x.c.p[2]),r:1.6,rp:1.6,f:'none',c:SEV[x.c.s].c,w:0.35});dl.push({t:'T',x:X(x.s)+2,y:Y(x.c.p[2])-1.8,s:'C'+x.c.id,h:1.8,a:'start',c:SEV[x.c.s].c,b:true,bg:1});});
  const en=o.ends||['A','B'];dl.push({t:'T',x:X(0),y:oy-2,s:en[0],h:2.6,a:'middle',c:INK.ora||'#b7791f',b:true});dl.push({t:'T',x:X(sd.L),y:oy-2,s:en[1],h:2.6,a:'middle',c:INK.ora||'#b7791f',b:true});
  dl.push({t:'L',p:[[X(0),Y(0)],[X(sd.L),Y(0)]],c:INK.k,w:0.18});
  return {dl,X,Y,k,ox,oy,zmin,zmax};}
/* tablero de coordinación */
function coordHTML(){
  const cnt={int:0,rev:0,con:0};CLASH.forEach(c=>cnt[c.s]++);const st={abierta:0,resuelta:0,aceptada:0};CLASH.forEach(c=>st[cstOf(c.id)]++);
  const nm=d=>DSH[d.key]||d.name;const T=(MO&&MO.coord)||{};
  const tiles=[['Interferencias detectadas',CLASH.length],['Interferencias ≥ 5 cm',cnt.int],['Por revisar (1 a 5 cm)',cnt.rev],['Contactos bajo 1 cm',cnt.con],['Abiertas',st.abierta+' de '+CLASH.length],['Resueltas o aceptadas',st.resuelta+st.aceptada],...(T.tiles||[]),['Elementos federados',fmt(Object.values(MD).reduce((a,d)=>a+d.els.length,0),0)],...Object.keys(MEPC).filter(k=>MD[k]).map(k=>[nm(MD[k])+' contra otros',CLASH.filter(c=>c.ma===k).length])];
  const rows=CLASH.map(c=>{const [[da,ia],[db,ib]]=pairOf(c),e=da.els[ia],a=db.els[ib],s=cstOf(c.id);return `<tr><td><b>C${c.id}</b></td><td style="white-space:nowrap"><span class="sevdot" style="background:${SEV[c.s].c}"></span>${SEV[c.s].n}<div style="color:var(--ink-3);font-size:12px">${fmt(c.d*100,1)} cm · ${fmt(c.l,2)} m</div></td><td>${MEP(da.key)?`<span class="sevdot" style="background:${MEPC[da.key].c}"></span>`:''}${esc(e.n)}<div style="color:var(--ink-3);font-size:12px">${esc(nm(da))} · ${esc(e.c)}${e.cls?' · '+esc(e.cls):''}</div>${c.nt?`<div style="font-size:12px;margin-top:2px">${esc(c.nt)}</div>`:''}</td><td>${esc(a.n)}<div style="color:var(--ink-3);font-size:12px">${esc(nm(db))} · ${esc(a.c)}${(db.kind==='skp')?' · capa '+esc(a.ly||'—'):a.cls?' · '+esc(a.cls):''}</div></td><td style="white-space:nowrap">${fz(c.p[2])} m<div style="color:var(--ink-3);font-size:12px">${fmt(c.p[0],1)} · ${fmt(c.p[1],1)}</div></td><td><select data-cs="${c.id}">${Object.entries(CSTN).map(([k,v])=>`<option value="${k}"${k===s?' selected':''}>${v}</option>`).join('')}</select><input data-cn="${c.id}" value="${esc((CST[c.id]&&CST[c.id].n)||'')}" placeholder="Nota" style="display:block;margin-top:4px;width:150px;border:1px solid var(--rule);border-radius:6px;padding:3px 6px;background:var(--panel);color:var(--ink)"></td><td><button class="btn" data-go="${c.id}">Ver</button></td></tr>`;}).join('');
  const A=((MO&&MO.lvA)||[]).filter(x=>x[1]>=40),E=((MO&&MO.lvE)||[]).filter(x=>x[1]>=40);const used=new Set();const pairs=[];
  A.forEach(a=>{let b=null,bd=0.3;E.forEach((e,i)=>{const d=Math.abs(e[0]-a[0]);if(d<bd&&!used.has(i)){bd=d;b=i;}});if(b!=null)used.add(b);pairs.push([a,b!=null?E[b]:null]);});E.forEach((e,i)=>{if(!used.has(i))pairs.push([null,e]);});pairs.sort((p,q)=>(p[0]||p[1])[0]-(q[0]||q[1])[0]);
  const lvRows=pairs.map(([a,e])=>{const d=a&&e?(a[0]-e[0]):null;const flag=d!=null&&Math.abs(d)>=0.009;return `<tr><td>${a?fz(a[0])+' m':'—'}<div style="color:var(--ink-3);font-size:12px">${a?fmt(a[1],0)+' m² horizontales':''}</div></td><td>${e?fz(e[0])+' m':'—'}<div style="color:var(--ink-3);font-size:12px">${e?fmt(e[1],0)+' m² horizontales':''}</div></td><td style="white-space:nowrap">${d!=null?`<span class="sevdot" style="background:${flag?'var(--measure)':'var(--accent)'}"></span>${fmt(d*100,0)} cm`:'<span style="color:var(--ink-3)">solo en '+(a?'arquitectura':'estructura')+'</span>'}</td></tr>`;}).join('');
  const cats=[];Object.values(MD).forEach(d=>{const m={};d.els.forEach(e=>{const k=e.c;m[k]=m[k]||LEVELS.map(()=>0);m[k][e.lv]=(m[k][e.lv]||0)+1;});Object.entries(m).forEach(([k,v])=>cats.push([d,k,v]));});
  return `<div style="position:absolute;inset:0;overflow:auto;background:var(--paper)"><div style="max-width:1080px;margin:0 auto;padding:20px 20px 60px">
  <h2 style="font:600 24px/1.2 var(--fc);margin:0 0 4px">${esc(T.title||'Tablero de coordinación')}</h2>
  <p style="color:var(--ink-2);margin:0 0 16px">${esc(T.intro||'')}</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-bottom:18px">${tiles.map(s=>`<div style="background:var(--panel);border:1px solid var(--rule);border-radius:8px;padding:8px 10px"><div style="color:var(--ink-3);font-size:12px">${esc(s[0])}</div><div style="font:600 18px var(--fc)">${esc(s[1])}</div></div>`).join('')}</div>
  <h3 style="margin:0 0 6px;font:600 17px var(--fc)">Interferencias</h3>
  <div style="overflow-x:auto"><table class="ctab"><thead><tr><th>N°</th><th>Severidad</th><th>Elemento</th><th>Contra</th><th>Cota y posición</th><th>Estado y nota</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-top:22px">
   ${lvRows?`<div style="background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:12px 14px"><h3 style="margin:0 0 6px;font:600 17px var(--fc)">Niveles de losa medidos</h3>
    <p style="font-size:12.5px;color:var(--ink-3);margin:0 0 6px">Superficies horizontales de más de 40 m² en cada modelo, emparejadas a menos de 30 cm.</p>
    <table style="width:100%;font-size:13px;border-collapse:collapse"><tr style="color:var(--ink-3);font-size:12px;text-align:left"><th style="padding:4px 0">Arquitectura</th><th>Estructura</th><th>Diferencia</th></tr>${lvRows}</table>
    <p style="font-size:12.5px;color:var(--ink-3);margin:8px 0 0">Niveles Revit del cálculo: ${((MO&&MO.storeys)||[]).map(s=>esc(s.n)+' '+fz(s.z)).join(' · ')}.</p></div>`:''}
   <div style="background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:12px 14px"><h3 style="margin:0 0 6px;font:600 17px var(--fc)">Elementos por categoría y nivel</h3>
    <table style="width:100%;font-size:13px;border-collapse:collapse"><tr style="color:var(--ink-3);font-size:12px;text-align:left"><th style="padding:4px 0">Categoría</th>${LEVELS.map(n=>`<th style="text-align:right">${esc(n)}</th>`).join('')}</tr>${cats.map(([d,k,v])=>`<tr style="border-top:1px solid var(--rule)"><td style="padding:4px 0">${esc(k)} <span style="color:var(--ink-3);font-size:12px">${esc(d.short||d.key)}</span></td>${v.map(n=>`<td style="text-align:right">${n||''}</td>`).join('')}</tr>`).join('')}</table></div>
  </div>
  <p class="note warn" style="margin-top:18px">Los estados y notas se guardan solo en este navegador. Descarga el CSV de interferencias para compartirlos con el equipo.</p>
  <div class="btnrow"><button class="btn pri" id="co-csv">Descargar CSV de interferencias</button><button class="btn" id="co-plan">Ver planta de interferencias</button><button class="btn" id="co-3d">Ver en 3D</button></div></div></div>`;}
function wireCoord(){
  $$('[data-cs]').forEach(s=>s.onchange=()=>{const id=+s.dataset.cs;CST[id]={...(CST[id]||{}),s:s.value};saveCST();toast('Estado guardado en este navegador.');});
  $$('[data-cn]').forEach(s=>s.onchange=()=>{const id=+s.dataset.cn;CST[id]={...(CST[id]||{}),n:s.value.trim()};saveCST();toast('Nota guardada.');});
  $$('[data-go]').forEach(b=>b.onclick=()=>gotoClash(CLASH.find(c=>c.id===+b.dataset.go)));
  $('#co-csv').onclick=()=>save(FN('interferencias')+'.csv',clashCSV());
  $('#co-plan').onclick=()=>{const it=findNav('Interferencias en planta');if(it)runAct(it.a);};
  $('#co-3d').onclick=()=>{const it=findNav('Interferencias en 3D')||findNav('Vista de coordinación');if(it)runAct(it.a);};}
function openCoord(){openTab({id:'coord',title:'Coordinación',type:'coord'});}
const csvNum=v=>fmt(v,3).replace(/\./g,'');
function clashCSV(){const r=['id;severidad;estado;nota;x;y;cota;penetracion_m;extension_m;disciplina_1;elemento_1;categoria_1;clase_o_capa_1;guid_1;disciplina_2;elemento_2;categoria_2;clase_o_capa_2;guid_2;observacion'];
  CLASH.forEach(c=>{const [[da,ia],[db,ib]]=pairOf(c),e=da.els[ia],a=db.els[ib],q=s=>'"'+String(s||'').replace(/"/g,'""')+'"';r.push(['C'+c.id,SEV[c.s].n,CSTN[cstOf(c.id)],q(CST[c.id]&&CST[c.id].n),csvNum(c.p[0]),csvNum(c.p[1]),csvNum(c.p[2]),csvNum(c.d),csvNum(c.l),da.name,q(e.n),e.c,q(e.cls||e.ly),e.g,db.name,q(a.n),a.c,q(a.cls||a.ly),a.g,q(c.nt)].join(';'));});return '﻿'+r.join('\r\n')+'\r\n';}
function elemCSV(){const r=['disciplina;categoria;nivel;nombre;clase_o_capa;guid;id_ifc;xmin;ymin;zmin;xmax;ymax;zmax;interferencias'];const q=s=>'"'+String(s||'').replace(/"/g,'""')+'"';
  Object.values(MD).forEach(d=>d.els.forEach((e,i)=>{r.push([d.name,e.c,LEVELS[e.lv]||'',q(e.n),q(e.cls||e.ly),e.g,e.id,...e.bb.map(csvNum),clashesOf(d,i).map(c=>'C'+c.id).join(' ')].join(';'));}));return '﻿'+r.join('\r\n')+'\r\n';}
const CRCT=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRCT[(c^u[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
async function deflate(u){try{if(typeof CompressionStream==='undefined')return null;const cs=new CompressionStream('deflate-raw');const b=await new Response(new Blob([u]).stream().pipeThrough(cs)).arrayBuffer();return new Uint8Array(b);}catch(e){return null;}}
async function makeZip(files){const parts=[],cen=[];let off=0;const enc=new TextEncoder();
  for(const f of files){const raw=f.data,crc=crc32(raw),def=await deflate(raw),data=def||raw,meth=def?8:0,nm=enc.encode(f.name);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,meth,true);h.setUint16(10,0,true);h.setUint16(12,0x5B3D,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,raw.length,true);h.setUint16(26,nm.length,true);h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nm,data);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,meth,true);c.setUint16(12,0,true);c.setUint16(14,0x5B3D,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,raw.length,true);c.setUint16(28,nm.length,true);c.setUint32(42,off,true);
    cen.push(new Uint8Array(c.buffer),nm);off+=30+nm.length+data.length;}
  const cs=cen.reduce((s,a)=>s+a.length,0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(e.buffer)],{type:'application/zip'});}
const latin=s=>{const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);u[i]=c<256?c:63;}return u;};
function modelDXF(){
  const L=[];const w=(c,v)=>L.push(String(c),String(v));const f3=v=>v.toFixed(3);const pre=PRJ.codigo+'-';
  const lname=s=>(pre+s).normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase().replace(/[^A-Z0-9-]+/g,'-');
  const ACI=(MO&&MO.aci)||{};const LCOL={};LAYERS.forEach(l=>LCOL[l.id]=l.c);
  const HS=PLAN_H.map(p=>p[0]);const layers=new Map();const ents=[];
  HS.forEach(h=>{const sl=sliceAt(h);Object.entries(sl).forEach(([k,v])=>{const [m,c,g]=k.split('|');const ln=lname(`${m}-${c}${g?'-VIDRIO':''}-Z${fmt(h,2).replace(/[^0-9]/g,'')}${h<0?'N':''}`);layers.set(ln,MD[m]&&MD[m].kind==='ifc'?(ACI[LCOL[m+'|'+c]]||9):(g?4:7));for(let i=0;i<v.s.length;i+=4)ents.push(['LINE',ln,v.s[i],v.s[i+1],h,v.s[i+2],v.s[i+3],h]);});});
  Object.keys(MEPC).forEach(k=>MD[k]&&MD[k].els.forEach(e=>{const ln=lname(k.toUpperCase()+'-'+e.c);layers.set(ln,MEPC[k].aci||7);(e.fp||[]).forEach(Pp=>{for(let j=1;j<Pp.length;j++)ents.push(['LINE',ln,Pp[j-1][0],Pp[j-1][1],e.bb[2],Pp[j][0],Pp[j][1],e.bb[2]]);});}));
  layers.set(pre+'EJES',8);layers.set(pre+'EJES-TEXTO',7);layers.set(pre+'INTERFERENCIAS',1);
  w(0,'SECTION');w(2,'HEADER');w(9,'$ACADVER');w(1,'AC1009');w(9,'$DWGCODEPAGE');w(3,'ANSI_1252');w(9,'$INSUNITS');w(70,6);w(0,'ENDSEC');
  w(0,'SECTION');w(2,'TABLES');w(0,'TABLE');w(2,'LAYER');w(70,layers.size);layers.forEach((c,n)=>{w(0,'LAYER');w(2,n);w(70,0);w(62,c);w(6,'CONTINUOUS');});w(0,'ENDTABLE');w(0,'ENDSEC');
  w(0,'SECTION');w(2,'ENTITIES');
  ents.forEach(e=>{w(0,'LINE');w(8,e[1]);w(10,f3(e[2]));w(20,f3(e[3]));w(30,f3(e[4]));w(11,f3(e[5]));w(21,f3(e[6]));w(31,f3(e[7]));});
  GRIDS.forEach(g=>{const [a,b]=gridExt(g,3);w(0,'LINE');w(8,pre+'EJES');w(10,f3(a[0]));w(20,f3(a[1]));w(30,0);w(11,f3(b[0]));w(21,f3(b[1]));w(31,0);[gridExt(g,4.2)[0],gridExt(g,4.2)[1]].forEach(p=>{w(0,'CIRCLE');w(8,pre+'EJES');w(10,f3(p[0]));w(20,f3(p[1]));w(30,0);w(40,'0.600');w(0,'TEXT');w(8,pre+'EJES-TEXTO');w(10,f3(p[0]-0.25));w(20,f3(p[1]-0.25));w(30,0);w(40,'0.500');w(1,g.n);});});
  CLASH.forEach(c=>{w(0,'CIRCLE');w(8,pre+'INTERFERENCIAS');w(10,f3(c.p[0]));w(20,f3(c.p[1]));w(30,f3(c.p[2]));w(40,'0.400');w(0,'TEXT');w(8,pre+'INTERFERENCIAS');w(10,f3(c.p[0]+0.5));w(20,f3(c.p[1]+0.5));w(30,f3(c.p[2]));w(40,'0.300');w(1,'C'+c.id+' '+SEV[c.s].n);});
  w(0,'ENDSEC');w(0,'EOF');return latin(L.join('\r\n')+'\r\n');}
/* láminas definidas por datos (proyecto.json «laminas»): vistas en planta cortada, cortes, simbología, notas y rótulo */
function layerSet(spec){if(!spec)return null;const o={};LAYERS.forEach(l=>o[l.id]=!(spec.except||[]).includes(l.id)&&(!spec.only||spec.only.includes(l.id)));return o;}
function viewportPlanM(dl,rect,s,cx,cy,R,o={}){const T=mkT(s,R,cx,cy,rect[0]+rect[2]/2,rect[1]+rect[3]/2);const items=paperize(planDL({scale:s,...o}),T);
  dl.push({t:'G',clip:rect,items});dl.push(R_(rect[0],rect[1],rect[2],rect[3],INK.k,0.25));return T;}
function viewportSec(dl,rect,sc,s,title,lay){const L=dist2(sc.a,sc.b);const sd=sectionData(sc.a,sc.b,{layers:lay||LV});const k=1000/s;const r=sectionDL(sd,[rect[0]+(rect[2]-L*k-26)/2,rect[1]+6,L*k+26,rect[3]-8],{k,ends:[sc.n,sc.n+"'"]});dl.push({t:'G',clip:rect,items:r.dl});dl.push(R_(rect[0],rect[1],rect[2],rect[3],INK.k,0.25));if(title)dl.push(Tx(rect[0]+3,rect[1]+5,title,2.6,'start',true));return r;}
function sheetSpec(sp){return ()=>{const dl=[];frame(dl);const lay=layerSet(sp.lay);const cx=sp.c?sp.c[0]:(BB.x0+BB.x1)/2,cy=sp.c?sp.c[1]:(BB.y0+BB.y1)/2;
  (sp.views||[]).forEach(v=>{if(v.t==='plan'){viewportPlanM(dl,v.r,v.s,cx,cy,RNP,{h:v.h,layers:lay,mono:v.mono,allClash:v.allClash});if(v.title)dl.push(Tx(v.r[0]+3,v.r[1]+5,v.title,2.4,'start',true));}
    else if(v.t==='sec'){const sc=MSECS[v.sec];if(sc)viewportSec(dl,v.r,sc,v.s,v.title,lay);}});
  let y=18;
  if(sp.clashTable){dl.push(Tx(333,y,'Interferencias detectadas',2.4,'start',true));y+=4.5;dl.push(Tx(333,y,'N°   Sev.   Cota     Elemento · contra',1.6,'start',true,INK.g1));y+=3.4;
    CLASH.forEach(c=>{const [[da,ia],[db,ib]]=pairOf(c),e=da.els[ia],a=db.els[ib];dl.push(Tx(333,y,'C'+c.id,1.6,'start',true,SEV[c.s].c),Tx(339,y,SEV[c.s].n.slice(0,6),1.6,'start',false,SEV[c.s].c),Tx(348,y,fz(c.p[2]),1.6),Tx(358,y,(e.n+' · '+a.c).slice(0,40),1.5));y+=3.4;});
    y+=2;dl.push(Tx(333,y,'Estado según este navegador: '+CLASH.filter(c=>cstOf(c.id)==='abierta').length+' abiertas',1.6,'start',false,INK.g1));}
  else if(sp.legend)y=legend(dl,333,18,sp.legend);
  if(sp.north)northSym(dl,345,y+(sp.northDy||14),RNP);
  if(sp.bar)scaleBar(dl,356,y+(sp.barDy||10),sp.bar);
  (sp.notes||[]).forEach(n=>dl.push(Tx(333,y+n[0],n[1],n[2],'start',!!n[3],n[4]?INK.g1:INK.k)));
  titleBlock(dl,{content:sp.content,scale:sp.scale,code:sp.code});return dl;};}
/* corte en el panel 3D (proyectos con modelos y sin terreno) */
function openSectionPanel(a,b,title){
  const sd=sectionData(a,b);if(prCur&&prCur.line)scene.remove(prCur.line);prCur={sd,title,pd:{a,b},sec:true};const p=$('#profp');p.hidden=false;$('#pr-title').textContent=title+' · '+fmt(sd.L,2)+' m';$('#pr-csv').hidden=true;
  const body=$('#pr-body');const r=body.getBoundingClientRect();const w=Math.max(200,r.width/3.78),h=Math.max(60,r.height/3.78);
  const res=sectionDL(sd,[0,2,w-30,h-2],{});body.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>${svgOf(res.dl)}<g id="prm"></g></svg>`;
  $('#pr-read').textContent='Escala natural, sin exageración';
  const g=new THREE.BufferGeometry().setFromPoints([V3(a[0],a[1],0.05),V3(b[0],b[1],0.05),V3(b[0],b[1],ZMAX+1),V3(a[0],a[1],ZMAX+1),V3(a[0],a[1],0.05)]);prCur.line=new THREE.Line(g,new THREE.LineBasicMaterial({color:MCOL(),depthTest:false}));prCur.line.renderOrder=30;scene.add(prCur.line);
  const svg=body.querySelector('svg');
  svg.onpointermove=ev=>{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const q=pt.matrixTransform(svg.getScreenCTM().inverse());const s=(q.x-res.ox)/res.k,z=res.zmax-(q.y-res.oy)/res.k;if(s<0||s>sd.L)return;const x=a[0]+(b[0]-a[0])*s/sd.L,y=a[1]+(b[1]-a[1])*s/sd.L;
    $('#pr-read').textContent=`Distancia ${fmt(s,2)} m · cota ${fz(z,2)} m`;svg.querySelector('#prm').innerHTML=`<line x1="${res.X(s)}" y1="${res.Y(res.zmin)}" x2="${res.X(s)}" y2="${res.Y(res.zmax)}" stroke="#b7791f" stroke-width="0.3"/>`;
    if(!prCur.mk){prCur.mk=new THREE.Mesh(new THREE.SphereGeometry(0.18,12,10),new THREE.MeshBasicMaterial({color:'#b7791f',depthTest:false}));prCur.mk.renderOrder=32;scene.add(prCur.mk);}prCur.mk.position.copy(V3(x,y,z));};}
/* ---------- módulo MT: volúmenes 3D y corte del terreno ---------- */
const MTMESH=[];let ZFS=null,GHOST=null;
const CUT_HIDE=(HAS_MT&&MTD.cutHide)||['cercos','verde'];
function applyTerrainCut(){if(!TER||!HAS_MT)return;TER.mesh.material.userData.mask.uMode.value=LV.tcut?1:0;TER.mesh.userData.maskTest=LV.tcut?{R:PR_ALL,inside:false}:null;
  hideCutInstances();syncMTVis();}
function hideCutInstances(){if(!HAS_MT)return;const M=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
  INSTS.forEach(im=>{const b=im.userData.base;for(let i=0;i<im.count;i++){M.fromArray(b,i*16);M.decompose(p,q,s);if(inProj(p.x,-p.z))s.setScalar(0.0001);M.compose(p,q,s);im.setMatrixAt(i,M);}im.instanceMatrix.needsUpdate=true;});
  CUT_HIDE.forEach(gid=>GROUPS[gid]&&GROUPS[gid].children.forEach(o=>{if(!o.geometry)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;const cx=(b.min.x+b.max.x)/2,cy=-(b.min.z+b.max.z)/2;o.userData.cutHide=inProj(cx,cy);o.visible=!o.userData.cutHide&&!HIDDEN.has(o);}));}
function gval(A,x,y){const fx=x-MT.x0,fy=y-MT.y0,i=Math.floor(fx),j=Math.floor(fy),tx=fx-i,ty=fy-j;let s=0,w=0;
  [[i,j,(1-tx)*(1-ty)],[i+1,j,tx*(1-ty)],[i,j+1,(1-tx)*ty],[i+1,j+1,tx*ty]].forEach(([a,b,k])=>{if(a<0||b<0||a>=MT.nx||b>=MT.ny)return;const q=MTNN[b*MT.nx+a];if(q===0xFFFFFFFF)return;const v=A[q];if(isFinite(v)){s+=v*(k+1e-4);w+=k+1e-4;}});return w?s/w:null;}
function gridSurf(A,lift,ch,colorFn,mat){const nx=MT.nx,ny=MT.ny,pos=new Float32Array(nx*ny*3),col=colorFn?new Float32Array(nx*ny*3):null,ok=new Uint8Array(nx*ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,q=MTNN[k];if(q===0xFFFFFFFF||!isFinite(A[q]))continue;ok[k]=1;const v=V3(MT.x0+i,MT.y0+j,A[q]+lift);pos[k*3]=v.x;pos[k*3+1]=v.y;pos[k*3+2]=v.z;if(col){const c=colorFn(k,q);col[k*3]=c.r;col[k*3+1]=c.g;col[k*3+2]=c.b;}}
  const idx=[];for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;if(ok[a]&&ok[b]&&ok[c]&&ok[d])idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));if(col)g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  return new THREE.Mesh(g,maskMat(mat,ch,-1));}
function skirt(R,zTop,zBot,lift){const out=[];R.forEach(r=>{for(let e=0;e<r.length;e++){const a=r[e],b=r[(e+1)%r.length],L=dist2(a,b),n=Math.max(1,Math.ceil(L/0.5));let prev=null;
    for(let k=0;k<=n;k++){const t=k/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;const zt=zTop(x,y),zb=zBot(x,y);const cur=(zt!=null&&zb!=null)?[x,y,zt+lift,zb]:null;
      if(prev&&cur){const lo1=Math.min(prev[2],prev[3]),hi1=Math.max(prev[2],prev[3]),lo2=Math.min(cur[2],cur[3]),hi2=Math.max(cur[2],cur[3]);if(hi1-lo1>0.01||hi2-lo2>0.01){const Q=[[prev[0],prev[1],lo1],[cur[0],cur[1],lo2],[cur[0],cur[1],hi2],[prev[0],prev[1],hi1]].map(p=>V3(p[0],p[1],p[2]));out.push(Q[0],Q[1],Q[2],Q[0],Q[2],Q[3]);}}prev=cur;}}});
  const g=new THREE.BufferGeometry().setFromPoints(out);g.computeVertexNormals();return g;}
function buildMT(){if(!HAS_MT)return;MTMESH.forEach(m=>{m.parent&&m.parent.remove(m);m.geometry.dispose();});MTMESH.length=0;
  const add=(m,parent,kind,lyr)=>{m.userData.mt=kind;if(lyr)m.userData.lyr=lyr;parent.add(m);PICK.push(m);MTMESH.push(m);return m;};
  const cFill=new THREE.Color('#c47a35'),cCut=new THREE.Color('#9c8b6e');
  const zf=(x,y)=>gval(MT.ZF,x,y),zt=(x,y)=>hz(x,y),zd=(x,y)=>gval(MT.ZD,x,y);
  ZFS=add(gridSurf(MT.ZF,-0.04,0,(k,q)=>isFinite(MT.ZT[k])&&MT.ZF[q]>MT.ZT[k]?cFill:cCut,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2})),scene,'rasante');ZFS.userData.maskTest={R:PR_ALL,inside:true};
  const fillG=skirt(PR_ALL,(x,y)=>{const a=zf(x,y),b=zt(x,y);return a!=null&&b!=null&&a>b?a-0.04:null;},(x,y)=>{const a=zf(x,y),b=zt(x,y);return a!=null&&b!=null&&a>b?b:null;},0);
  add(new THREE.Mesh(fillG,new THREE.MeshLambertMaterial({color:'#c47a35',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2})),grp('mt_relleno'),'relleno');
  const cutG=skirt(PR_ALL,(x,y)=>{const a=zf(x,y),b=zt(x,y);return a!=null&&b!=null&&b>a?b:null;},(x,y)=>{const a=zf(x,y),b=zt(x,y);return a!=null&&b!=null&&b>a?a-0.04:null;},0);
  const cutW=add(new THREE.Mesh(cutG,new THREE.MeshLambertMaterial({color:'#9c8b6e',side:THREE.DoubleSide})),scene,'corte');cutW.userData.tcutOnly=true;
  if(!GHOST){GHOST=new THREE.Mesh(TER.mesh.geometry,maskMat(new THREE.MeshLambertMaterial({color:'#c0392b',transparent:true,opacity:0.35,depthWrite:false,side:THREE.DoubleSide}),0,-1));GHOST.userData.maskTest={R:PR_ALL,inside:true};GHOST.userData.mt='corte';grp('mt_corte').add(GHOST);PICK.push(GHOST);}
  [[1,PR_BLD,'#9a9da1'],[2,PR_PARK,'#5e6164']].forEach(([ch,R,c])=>{const top=gridSurf(MT.ZD,-0.015,ch,null,new THREE.MeshLambertMaterial({color:c,side:THREE.DoubleSide}));top.userData.maskTest={R,inside:true};add(top,grp('mt_plat'),'plataforma');
    const sg=skirt(R,(x,y)=>{const a=zd(x,y);return a!=null?a-0.015:null;},(x,y)=>{const a=zf(x,y);return a!=null?a-0.04:null;},0);add(new THREE.Mesh(sg,new THREE.MeshLambertMaterial({color:c,side:THREE.DoubleSide})),grp('mt_plat'),'plataforma');});
  syncMTVis();
  LAYERS.forEach(l=>{if(l.id.startsWith('mt_')&&LOP[l.id]<1)setLayerOp(l.id,LOP[l.id]);});}
function syncMTVis(){MTMESH.forEach(m=>{if(m===ZFS)m.visible=!!(LV.tcut||LV.mt_relleno);else if(m.userData.tcutOnly)m.visible=!!LV.tcut;});}
function mtInfo(x,y,kind){const r=mtCalc(),q=mtAt(x,y);const rows=[];if(q){rows.push(['Cota terreno',fmt(q.zt)+' m'],['Nivel terminado',fmt(q.zd)+' m'],['Fondo de plataforma',fmt(q.zf)+' m'],['Espesor de plataforma',fmt(q.zd-q.zf)+' m'],[q.zf>=q.zt?'Altura de relleno':'Profundidad de corte',fmt(Math.abs(q.zf-q.zt))+' m'],['Zona',MTZ[q.c]||'—']);}
  rows.push(['Relleno total',fmt(r.R,0)+' m³'],['Corte total',fmt(r.C,0)+' m³'],['Saldo (relleno − corte)',fmt(r.R-r.C,0)+' m³']);
  return {kind:'movimiento de tierras',title:kind==='rasante'?'Fondo de plataformas':kind==='plataforma'?'Plataforma (nivel terminado a fondo)':kind==='corte'?'Volumen de corte':'Volumen de relleno',rows,note:'Corte y relleno medidos hasta el fondo de las plataformas. Detalle en «Movimiento de tierras».'};}
function initScene(){
  const cv=$('#c3d');
  renderer=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf4f6f2,0x5c5a52,0.85));
  const sun=new THREE.DirectionalLight(0xffffff,0.7);sun.position.set(-120,220,-60);scene.add(sun);
  camP=new THREE.PerspectiveCamera(45,1,0.3,5000);
  camO=new THREE.OrthographicCamera(-100,100,100,-100,-2000,4000);
  LAYERS.forEach(l=>mkGroup(l.id));buildTerrain();buildOrto();buildScene();buildIFC();buildModels();buildMT();applyTerrainCut();
  const t=V3(BC[0],BC[1],hz(BC[0],BC[1])??ZR);const R0=Math.max(BB.x1-BB.x0,BB.y1-BB.y0);camP.position.set(t.x+R0*0.51,t.y+R0*0.47,t.z+R0*0.56);camP.far=Math.max(5000,R0*12);camP.updateProjectionMatrix();
  ctlP=new THREE.OrbitControls(camP,cv);ctlP.target.copy(t);ctlP.enableDamping=true;ctlP.dampingFactor=0.12;ctlP.maxPolarAngle=Math.PI*0.495;ctlP.update();
  ctlO=new THREE.OrbitControls(camO,cv);ctlO.target.copy(t);ctlO.enableDamping=true;ctlO.dampingFactor=0.12;ctlO.enabled=false;ctlO.screenSpacePanning=true;
  cam=camP;applyBg();
}
function applyBg(){const cs=getComputedStyle(document.documentElement);if(scene)scene.background=new THREE.Color(cs.getPropertyValue('--canvas').trim()||'#dfe3dd');}

/* ---------- interacción 3D ---------- */
const ray=window.THREE?new THREE.Raycaster():null;if(ray)ray.params.Line.threshold=0.6;
const mouse=window.THREE?new THREE.Vector2():null;
let tool='sel',northMode='real',selObj=null,selMatBak=null;
let planState={cx:0,cy:0,w:240};
const fp={pos:null,yaw:0,pitch:-0.05,keys:{}};
const measures=[];let mCur=null;let mSeq=1;
let COTAS=lsGet('cotas',[]);if(!Array.isArray(COTAS))COTAS=[];
function saveCotas(){lsSet('cotas',COTAS);}
function resize3d(){const v=$('#v3d');const w=v.clientWidth,h=v.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camP.aspect=w/h;camP.updateProjectionMatrix();updOrtho();}
function updOrtho(){const v=$('#v3d');const a=v.clientWidth/Math.max(1,v.clientHeight);const hw=planState.w/2;camO.left=-hw;camO.right=hw;camO.top=hw/a;camO.bottom=-hw/a;camO.updateProjectionMatrix();}
function northAngle(mode){return mode==='np'?RNP:-CONV;}
function setCam(mode){
  const prev=camMode;camMode=mode;$$('#seg-cam button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.cam===mode));
  const tgt=prev==='persp'?ctlP.target.clone():prev==='plan'?V3(planState.cx,planState.cy,ZR):prev==='fp'&&fp.pos?V3(fp.pos[0],fp.pos[1],ZR):ctlO.target.clone();
  ctlP.enabled=mode==='persp';ctlO.enabled=mode==='iso';
  $('#fpad').classList.toggle('on',mode==='fp'&&matchMedia('(pointer:coarse)').matches);
  if(mode==='persp'){cam=camP;ctlP.target.copy(tgt);ctlP.update();}
  else if(mode==='iso'){cam=camO;camO.zoom=1;ctlO.target.copy(tgt);camO.up.set(0,1,0);const d=400;camO.position.set(tgt.x+d*0.62,tgt.y+d*0.6,tgt.z+d*0.62);camO.lookAt(tgt);planState.w=Math.max(planState.w,220);updOrtho();ctlO.update();}
  else if(mode==='plan'){cam=camO;planState.cx=tgt.x;planState.cy=-tgt.z;placePlanCam();}
  else if(mode==='fp'){cam=camP;fp.pos=fp.pos||(P.fp?[P.fp[0],P.fp[1]]:HAS_MOD?[BC[0],BB.y0-4]:BC.slice());fp.yaw=P.fp&&P.fp[2]!=null?P.fp[2]:HAS_MOD?Math.PI/2:0;if(HAS_MOD)fp.z=floorAt(fp.pos[0],fp.pos[1],0.5)??ZR;fp.pitch=-0.05;hint('Primera persona: W A S D o flechas para caminar, arrastra para mirar. Esc vuelve a perspectiva.');setTimeout(()=>hint(''),3500);}
  updNorthArrow();if(typeof dockSync==='function')dockSync();
}
function placePlanCam(){const a=northAngle(northMode)*Math.PI/180;const ux=Math.sin(a),uy=Math.cos(a);camO.zoom=1;camO.up.set(ux,0,-uy);camO.position.set(planState.cx,400,-planState.cy);camO.lookAt(planState.cx,0,-planState.cy);updOrtho();}
function updNorthArrow(){let th=0;if(camMode==='plan'){th=CONV+northAngle(northMode);}else{const dir=new THREE.Vector3();cam.getWorldDirection(dir);th=CONV-Math.atan2(-dir.x,-dir.z)*180/Math.PI;}$('#narrow').style.transform=`rotate(${-th}deg)`;}
function fit3d(){const FB=P.fit||{...BB,k:1.05},FC=[(FB.x0+FB.x1)/2,(FB.y0+FB.y1)/2];const t=V3(FC[0],FC[1],FB.z!=null?FB.z:(hz(FC[0],FC[1])??ZR)),R=Math.max(FB.x1-FB.x0,FB.y1-FB.y0)*(FB.k||1.05);
  if(camMode==='fp')setCam('persp');
  if(camMode==='persp'){ctlP.target.copy(t);camP.position.set(t.x+R*0.55,t.y+R*0.55,t.z+R*0.7);ctlP.update();}
  else if(camMode==='iso'){camO.zoom=1;ctlO.target.copy(t);planState.w=R*1.3;const d=400;camO.position.set(t.x+d*.62,t.y+d*.6,t.z+d*.62);camO.lookAt(t);updOrtho();ctlO.update();}
  else if(camMode==='plan'){planState.cx=FC[0];planState.cy=FC[1];planState.w=R*1.1;placePlanCam();}}
function focusWorld(x,y,w,z){const t=V3(x,y,z!=null?z:(hz(x,y)??ZR));if(camMode==='fp')setCam('persp');
  if(camMode==='persp'){const off=camP.position.clone().sub(ctlP.target).normalize().multiplyScalar(w*1.1);ctlP.target.copy(t);camP.position.copy(t).add(off);ctlP.update();}
  else if(camMode==='iso'){ctlO.target.copy(t);planState.w=w;const d=400;camO.position.set(t.x+d*.62,t.y+d*.6,t.z+d*.62);camO.lookAt(t);updOrtho();ctlO.update();}
  else{planState.cx=x;planState.cy=y;planState.w=w;placePlanCam();}}
function setMouse(ev){const r=$('#c3d').getBoundingClientRect();mouse.x=((ev.clientX-r.left)/r.width)*2-1;mouse.y=-((ev.clientY-r.top)/r.height)*2+1;return r;}
function visibleDeep(o){while(o){if(!o.visible)return false;o=o.parent;}return true;}
function pick(ev,onlyTerrain){setMouse(ev);ray.setFromCamera(mouse,cam);
  const objs=onlyTerrain?(GROUPS.terreno&&GROUPS.terreno.children[0]?[GROUPS.terreno.children[0]]:[]):PICK.filter(o=>visibleDeep(o)&&!HIDDEN.has(o)&&(!o.userData.m||ISO.on||!(LOP[o.userData.lyr]<0.35))&&(!ISO.on||o.userData.clash||!o.userData.m));if(!onlyTerrain&&ISO.on&&ISO.mesh)objs.push(ISO.mesh);
  let hits=ray.intersectObjects(objs,false);hits=hits.filter(h=>{const t=h.object.userData.maskTest;if(!t)return true;const w=worldOf(h.point);return inRings(t.R,w.x,w.y)===t.inside;});const cp=renderer.clippingPlanes;if(cp&&cp.length)hits=hits.filter(h=>cp.every(p=>p.distanceToPoint(h.point)>=-0.01));if(!onlyTerrain){const hc=hits.find(h=>h.object.userData.clash);if(hc)return hc;}return hits[0]||null;}
const worldOf=p=>({x:p.x,y:-p.z,z:p.y+ZR});
function terrainAtRay(ev){const h=pick(ev,true);return h?worldOf(h.point):null;}
function clearSel(){clearMSel();if(ISEL){scene.remove(ISEL.mesh);ISEL.mesh.geometry.dispose();ISEL=null;}if(selObj){if(selMatBak)selObj.material=selMatBak;selObj=null;selMatBak=null;}}
function highlight(o){clearSel();selObj=o;selMatBak=o.material;const m=o.material.clone();m.color=new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--sel').trim()||'#e0a100');o.material=m;}
function showInfo(info,obj){
  const pane=$('#st-prop');
  if(!info){pane.innerHTML=P.ui.card||`<div class="card"><h4>${esc(PRJ.nombre)}</h4><div class="kind">${esc(PRJ.etapa)}</div></div>`;
    pane.querySelectorAll('[data-nav]').forEach(b=>{const it=findNav(b.dataset.nav);if(!it){b.remove();return;}b.onclick=()=>runAct(it.a);});
    pane.querySelectorAll('[data-img]').forEach(b=>b.onclick=()=>openTab({id:'img-'+b.dataset.img.replace(/\W+/g,'_'),title:b.dataset.title||'Imagen',type:'img',src:b.dataset.img}));return;}
  const rows=(info.rows||[]).map(r=>`<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('');
  const msel=info.msel;const nh=HIDDEN.size+ifcHiddenCount()+mHiddenN();
  pane.innerHTML=`<div class="card"><h4>${esc(info.title)}</h4><div class="kind">${esc(info.kind||'')}${info.layer?' · capa '+esc(info.layer):''}</div><dl class="kv">${rows}</dl>${info.extra||''}${info.note?`<p class="note${info.warn?' warn':''}">${esc(info.note)}</p>`:''}
  <div class="btnrow">${obj||info.ifc!=null?'<button class="btn" id="pp-hide">Ocultar elemento</button>':''}${msel?'<button class="btn" id="pp-mhide">Ocultar</button><button class="btn" id="pp-iso">Aislar</button>':''}${ISO.on?'<button class="btn" id="pp-uniso">Ver modelo completo</button>':''}${nh?`<button class="btn" id="pp-show">Mostrar ocultos (${nh})</button>`:''}${info.xy?'<button class="btn" id="pp-cota">Anotar cota aquí</button>':''}${info.btns||''}</div></div>`;
  if(msel){$('#pp-mhide').onclick=()=>{msel.forEach(([d,ei])=>hideEl(d,ei));clearSel();showInfo(null);toast('Oculto. «Mostrar ocultos» lo repone.');};$('#pp-iso').onclick=()=>{isolate(msel);showInfo(info,obj);};}
  {const ui=$('#pp-uniso');if(ui)ui.onclick=()=>{exitIso();showInfo(info,obj);};}
  $$('#st-prop [data-clash]').forEach(b=>b.onclick=()=>gotoClash(CLASH.find(c=>c.id===+b.dataset.clash)));
  if(info.ifc!=null)$('#pp-hide').onclick=()=>{ifcHide(info.ifc);clearSel();showInfo(null);toast('Elemento oculto. «Mostrar ocultos» lo repone.');};
  if(obj)$('#pp-hide').onclick=()=>{HIDDEN.add(obj);obj.visible=false;clearSel();showInfo(null);toast('Elemento oculto. «Mostrar ocultos» lo repone.');};
  const sh=$('#pp-show');if(sh)sh.onclick=()=>{HIDDEN.forEach(o=>o.visible=true);HIDDEN.clear();ifcShowAll();showAllHiddenM();showInfo(null);};
  if(info.wire)info.wire();
  const ca=$('#pp-cota');if(ca)ca.onclick=()=>addCota(info.xy);
  openSide('prop');
}
function onSelect(ev){const h=pick(ev);if(!h){clearSel();if(ISO.on)return;showInfo(null);return;}const o=h.object;
  if(o.userData.clash){gotoClash(o.userData.clash);return;}
  if(o.userData.m||o.userData.iso){const r=hitElem(h);if(!r)return;const w=worldOf(h.point);mHighlight([[r.d,r.ei]]);showInfo({...elInfo(r.d,r.ei,w),msel:[[r.d,r.ei]]});return;}
  if(o.userData.terrain){clearSel();const w=worldOf(h.point);const z=hz(w.x,w.y);const s=nearestPt(w.x,w.y);
    showInfo({kind:'terreno natural',title:'Cota '+fmt(z,2)+' m',rows:[['Este',fmt(utmE(w.x),3)],['Norte',fmt(utmN(w.y),3)],['Cota terreno',fmt(z,3)+' m'],['Pendiente local',fmt(slopeAt(w.x,w.y),1)+' %'],...(s?[['Punto más cercano','N° '+s.n],['Su cota',fmt(s.z,3)+' m'],['Distancia',fmt(s.d,1)+' m']]:[])],note:'Terreno interpolado (TIN) desde los puntos y las curvas del levantamiento, en grilla de 1 m.',xy:[w.x,w.y,z]});return;}
  if(o.userData.pts){const p=PTS[h.instanceId];if(!p)return;clearSel();showInfo({kind:'punto topográfico',title:'Punto N° '+p.n,rows:[['Cota',fmt(p.z,3)+' m'],['Este',fmt(utmE(p.x),3)],['Norte',fmt(utmN(p.y),3)],['Terreno modelado',fmt(hz(p.x,p.y),3)+' m']],layer:'V-NODE',xy:[p.x,p.y,p.z]});return;}
  {const II=P.instInfo||{};for(const f of Object.keys(o.userData)){const L=II[f];if(L&&h.instanceId!=null&&L[h.instanceId]){const q=L[h.instanceId];clearSel();showInfo({title:q.t,kind:q.k,rows:q.r,layer:q.ly,note:q.n});return;}}}
  if(o.userData.trees){const M=new THREE.Matrix4();o.getMatrixAt(h.instanceId,M);const p=new THREE.Vector3().setFromMatrixPosition(M);const t=[p.x,-p.z];clearSel();showInfo({kind:'vegetación existente',title:'Árbol N° '+(h.instanceId+1),rows:[['Este',fmt(utmE(t[0]),3)],['Norte',fmt(utmN(t[1]),3)],['Cota terreno',fmt(hz(t[0],t[1]))+' m']],note:'Altura y copa representativas.'});return;}
  if(o.userData.mt){clearSel();const w=worldOf(h.point);showInfo(mtInfo(w.x,w.y,o.userData.mt));return;}
  if(o.userData.ifc){const ei=o.userData.ifc[h.faceIndex];if(ei==null)return;ifcHighlight(ei);showInfo(ifcInfo(ei));return;}
  if(o.userData.info){highlight(o);showInfo(o.userData.info,o);}}

/* ---------- referencia de vértices ---------- */
const snapEl=()=>$('#snap');
function findSnap(ev,h){if(ev.altKey||(!SNAPV.length&&!(h&&h.face))){snapEl().style.display='none';return null;}
  const r=$('#c3d').getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;let best=null,bd=13;const v=new THREE.Vector3();
  const cand=SNAPV.filter(s=>LV[s.lyr]);if(h&&h.face&&(h.object.userData.m||h.object.userData.iso)){const pa=h.object.geometry.attributes.position,f=h.face,mw=h.object.matrixWorld;const Q=[f.a,f.b,f.c].map(i=>worldOf(new THREE.Vector3().fromBufferAttribute(pa,i).applyMatrix4(mw)));Q.forEach(p=>cand.push({...p,lyr:'',n:'vértice'}));for(let i=0;i<3;i++){const a=Q[i],b=Q[(i+1)%3];cand.push({x:(a.x+b.x)/2,y:(a.y+b.y)/2,z:(a.z+b.z)/2,lyr:'',n:'punto medio'});}}
  for(const s of cand){v.set(s.x,s.z-ZR,-s.y).project(cam);if(v.z>1||v.z<-1)continue;const sx=(v.x+1)/2*r.width,sy=(1-v.y)/2*r.height;const d=Math.hypot(sx-mx,sy-my);if(d<bd){bd=d;best={s,sx,sy};}}
  const el=snapEl();if(best){el.style.display='block';el.style.left=best.sx+'px';el.style.top=best.sy+'px';return {x:best.s.x,y:best.s.y,z:best.s.z};}el.style.display='none';return null;}
function pointAt(ev){const h=pick(ev);const s=findSnap(ev,h);if(s)return s;return h?worldOf(h.point):null;}

/* ---------- medidas ---------- */
const MCOL=()=>getComputedStyle(document.documentElement).getPropertyValue('--measure').trim()||'#b7791f';
function mLine(pts,closed){const P=pts.map(p=>V3(p.x,p.y,p.z+0.15));if(closed&&P.length>2)P.push(P[0]);const g=new THREE.BufferGeometry().setFromPoints(P);const l=new THREE.Line(g,new THREE.LineBasicMaterial({color:MCOL(),depthTest:false}));l.renderOrder=10;scene.add(l);return l;}
function mDots(pts){const g=new THREE.Group();pts.forEach(p=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.28,10,8),new THREE.MeshBasicMaterial({color:MCOL(),depthTest:false}));m.renderOrder=11;m.position.copy(V3(p.x,p.y,p.z+0.15));g.add(m);});scene.add(g);return g;}
function disposeM(m){[m.line,m.dots].forEach(o=>{if(o)scene.remove(o);});(m.lbls||[]).forEach(l=>{l.d.remove();LBL.splice(LBL.indexOf(l),1);});}
function distStats(a,b){const h=Math.hypot(b.x-a.x,b.y-a.y),dz=b.z-a.z;return {h,dz,s:Math.hypot(h,dz),p:h?dz/h*100:0};}
function finishMeasure(m){measures.push(m);renderMeasures();}
function renderMeasures(){
  const ul=measures.length?'<ul class="mlist">'+measures.map((m,i)=>`<li${m.type==='mark'?` data-mk="${m.id}" style="cursor:pointer" title="Abrir marca de revisión"`:''}><span><b>${esc(m.title)}</b></span><small>${m.sub}${m.type==='cota'?`<br><input class="cnote" id="cn-${m.id}" data-i="${i}" value="${esc(m.note||'')}" placeholder="Agregar nota" style="margin-top:4px;width:100%;border:1px solid var(--rule);border-radius:6px;padding:3px 6px;background:var(--panel)">`:''}</small><button class="rm" data-i="${i}" aria-label="Borrar">×</button></li>`).join('')+'</ul><div class="btnrow"><button class="btn" id="m-clear">Borrar todas</button></div>':'<p class="empty">Aún no hay medidas. Elige Distancia, Área, Cota o Perfil en la barra y haz clic en el modelo.</p>';
  $('#st-meas').innerHTML=ul;
  $$('#st-meas .rm').forEach(b=>b.onclick=()=>{const m=measures.splice(+b.dataset.i,1)[0];disposeM(m);if(m.type==='cota'){COTAS=COTAS.filter(c=>c.id!==m.id);saveCotas();}if(m.type==='mark'){MARKS=MARKS.filter(x=>x.id!==m.id);saveMarks();if(MK.edit&&MK.edit.id===m.id)MK.edit=null;}renderMeasures();});
  $$('#st-meas li[data-mk]').forEach(li=>li.onclick=e=>{if(e.target.closest('.rm'))return;openMark(li.dataset.mk);});
  $$('#st-meas .cnote').forEach(inp=>inp.onchange=()=>{const m=measures[+inp.dataset.i];m.note=inp.value.trim();const c=COTAS.find(c=>c.id===m.id);if(c){c.n=m.note;saveCotas();}m.lbls[0].d.textContent=m.title.replace('Cota ','')+(m.note?' · '+m.note:'');});
  const c=$('#m-clear');if(c)c.onclick=()=>{measures.splice(0).forEach(disposeM);COTAS=[];saveCotas();MARKS=[];saveMarks();MK.edit=null;renderMeasures();};
}
function onMeasureClick(ev){const p=pointAt(ev);if(!p)return;
  if(tool==='cota'){addCota([p.x,p.y,p.z]);return;}
  if(!mCur)mCur={type:tool,pts:[]};mCur.pts.push(p);redrawCur();
  if(tool==='dist'&&mCur.pts.length===2){const [a,b]=mCur.pts,s=distStats(a,b);const m=mCur;m.title='Distancia '+mSeq++;m.sub=`Horizontal ${fmt(s.h)} m · inclinada ${fmt(s.s)} m · desnivel ${fmt(s.dz)} m · pendiente ${fmt(s.p,1)} %`;
    m.lbls=[addLabel((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2+0.6,fmt(s.h)+' m','m')];mCur=null;finishMeasure(m);openSide('meas');}
  if(tool==='prof'&&mCur.pts.length===2){const [a,b]=mCur.pts;const m=mCur;m.title='Perfil '+mSeq++;m.sub=`A–B ${fmt(Math.hypot(b.x-a.x,b.y-a.y))} m`;mCur=null;finishMeasure(m);openProfilePanel([a.x,a.y],[b.x,b.y],m.title);}}
function closeArea(){if(mCur&&mCur.pts)mCur.pts=mCur.pts.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)>0.05);if(!mCur||mCur.type!=='area'||mCur.pts.length<3)return;const m=mCur;const P=m.pts.map(p=>[p.x,p.y]);const A=parea(P),per=plen(P.concat([P[0]]));const zs=m.pts.map(p=>p.z);
  m.title='Área '+mSeq++;m.sub=`${fmt(A)} m² en planta · perímetro ${fmt(per)} m · cotas ${fmt(Math.min(...zs))} a ${fmt(Math.max(...zs))} m`;
  scene.remove(m.line);m.line=mLine(m.pts,true);const c=P.reduce((s,p)=>[s[0]+p[0]/P.length,s[1]+p[1]/P.length],[0,0]);m.lbls=[addLabel(c[0],c[1],ZR+0.8,fmt(A,1)+' m²','m')];mCur=null;finishMeasure(m);openSide('meas');}
function redrawCur(){if(!mCur)return;if(mCur.line)scene.remove(mCur.line);if(mCur.dots)scene.remove(mCur.dots);mCur.line=mLine(mCur.pts,false);mCur.dots=mDots(mCur.pts);}
function cancelCur(){if(mCur){disposeM(mCur);mCur=null;}}
function addCota(xyz,note,id,silent){const [x,y,z]=xyz;const n=note||'';
  const m={type:'cota',note:n,id:id||('c'+Date.now()),title:'Cota '+fmt(z,2)+' m',sub:`E ${fmt(utmE(x),2)} · N ${fmt(utmN(y),2)}`};
  m.dots=mDots([{x,y,z}]);m.lbls=[addLabel(x,y,z+0.9,fmt(z,2)+' m'+(n?' · '+n:''),'cota')];
  if(!id){COTAS.push({id:m.id,x,y,z,n});saveCotas();}finishMeasure(m);if(!silent)openSide('meas');}
function setTool(t){tool=t;cancelCur();$$('#seg-tool button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===t));snapEl().style.display='none';
  const H={sel:'',dist:'Distancia: marca dos puntos. Alt suspende la referencia a vértices.',area:'Área: marca los vértices y cierra con doble clic o Enter.',cota:'Cota: haz clic donde quieras anotar la cota; la nota se escribe en Medidas.',prof:'Perfil: marca el punto A y el punto B.'};hint(H[t]);if(t==='sel')setTimeout(()=>hint(''),10);if(typeof dockSync==='function')dockSync();}

/* ---------- corte ---------- */
const SECS=P.secs||[];// secciones del proyecto: {n,a:[x,y],b:[x,y],label}
const CUT={box:false,h:false,v:false,x0:BB.x0,x1:BB.x1,y0:BB.y0,y1:BB.y1,z:ZR,sec:0};
function applyCut(){const pl=[];
  if(CUT.box){pl.push(new THREE.Plane(new THREE.Vector3(1,0,0),-CUT.x0),new THREE.Plane(new THREE.Vector3(-1,0,0),CUT.x1),new THREE.Plane(new THREE.Vector3(0,0,-1),-CUT.y0),new THREE.Plane(new THREE.Vector3(0,0,1),CUT.y1));}
  if(CUT.h)pl.push(new THREE.Plane(new THREE.Vector3(0,-1,0),CUT.z-ZR));
  if(CUT.v){const s=SECS[CUT.sec];if(s){const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],L=Math.hypot(dx,dy);let nx=dy/L,ny=-dx/L;if(CUT.inv){nx=-nx;ny=-ny;}pl.push(new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(nx,0,-ny),V3(s.a[0],s.a[1],ZR)));}}
  renderer.clippingPlanes=pl.concat(typeof secPlanes==='function'?secPlanes():[]);}
function initCutUI(){
  const rng=(id,val,key,o)=>{const r=$('#'+id);r.min=key[0]==='x'?BB.x0:BB.y0;r.max=key[0]==='x'?BB.x1:BB.y1;r.step=1;r.value=val;const out=$('#'+o);const u=()=>{CUT[key]=+r.value;out.textContent=fmt(key[0]==='x'?utmE(+r.value):utmN(+r.value),0);applyCut();};r.oninput=u;u();};
  rng('cb-x0',BB.x0,'x0','o-x0');rng('cb-x1',BB.x1,'x1','o-x1');rng('cb-y0',BB.y0,'y0','o-y0');rng('cb-y1',BB.y1,'y1','o-y1');
  const z=$('#cb-z');z.min=Math.floor(ZMIN)-1;z.max=Math.ceil(ZMAX)+15;z.value=Math.round(ZMAX)+1;const oz=$('#o-z');z.oninput=()=>{CUT.z=+z.value;oz.textContent=fmt(CUT.z,1);applyCut();};z.oninput();
  $('#cut-box').onchange=e=>{CUT.box=e.target.checked;applyCut();};$('#cut-h').onchange=e=>{CUT.h=e.target.checked;applyCut();};$('#cut-v').onchange=e=>{CUT.v=e.target.checked;applyCut();};
  const sel=$('#cb-sec');if(SECS.length){sel.innerHTML=SECS.map((s,i)=>`<option value="${i}">${esc(s.label||'Sección '+s.n)}</option>`).join('')+SECS.map((s,i)=>`<option value="${i}|i">${esc(s.label||'Sección '+s.n)} · lado opuesto</option>`).join('');}else{sel.innerHTML='<option>Sin secciones definidas</option>';sel.disabled=true;$('#cut-v').disabled=true;}
  sel.onchange=()=>{const [i,f]=sel.value.split('|');CUT.sec=+i;CUT.inv=!!f;applyCut();};
  $('#btn-cut').onclick=()=>{const p=$('#cutp');p.hidden=!p.hidden;$('#btn-cut').setAttribute('aria-pressed',!p.hidden);};
  $('#cut-x').onclick=()=>{$('#cutp').hidden=true;$('#btn-cut').setAttribute('aria-pressed','false');};
}

/* ---------- puntero ---------- */
const MV={ev:null,req:false};const CLB=P.ejes||['E','N'];
function moveModel(){MV.req=false;const ev=MV.ev;if(!ev||!active3d)return;const h=pick(ev);const s=tool!=='sel'?findSnap(ev,h):null;const ro=$('#readout');
  if(s){ro.innerHTML=`<b>Cota ${fmt(s.z,2)} m</b> · ${CLB[0]} ${fmt(utmE(s.x),2)} · ${CLB[1]} ${fmt(utmN(s.y),2)}${s.n?' · '+esc(s.n):''}`;return;}
  if(h){const w=worldOf(h.point);let nm='';if(h.object.userData.clash)nm='Interferencia C'+h.object.userData.clash.id;else{const r=hitElem(h);if(r){const e=r.d.els[r.ei];nm=(r.d.short?r.d.short+' ':'')+e.n+' · '+e.c;}else if(h.object.userData.info)nm=h.object.userData.info.title;}
    ro.innerHTML=`<b>Cota ${fmt(w.z,2)} m</b> · ${CLB[0]} ${fmt(utmE(w.x),1)} · ${CLB[1]} ${fmt(utmN(w.y),1)}${nm?' · '+esc(nm):''}`+(mCur&&mCur.pts.length?(()=>{const s2=distStats(mCur.pts[mCur.pts.length-1],w);return ` · desde último ${fmt(s2.s)} m`;})():'');}}
function initPointer(){
  const cv=$('#c3d');let down=null,planDrag=null,fpDrag=null;
  cv.addEventListener('pointerdown',ev=>{down={x:ev.clientX,y:ev.clientY};
    if(camMode==='plan'){planDrag={x:ev.clientX,y:ev.clientY,cx:planState.cx,cy:planState.cy};cv.setPointerCapture(ev.pointerId);}
    if(camMode==='fp'){fpDrag={x:ev.clientX,y:ev.clientY,yaw:fp.yaw,pitch:fp.pitch};cv.setPointerCapture(ev.pointerId);}});
  cv.addEventListener('pointermove',ev=>{
    if(planDrag){const r=cv.getBoundingClientRect();const k=planState.w/r.width;const dx=(ev.clientX-planDrag.x)*k,dy=(ev.clientY-planDrag.y)*k;const a=northAngle(northMode)*Math.PI/180;const rx=Math.cos(-a),ry=Math.sin(-a),ux=-ry,uy=rx;planState.cx=planDrag.cx-dx*rx+dy*ux;planState.cy=planDrag.cy-dx*ry+dy*uy;placePlanCam();return;}
    if(fpDrag){fp.yaw=fpDrag.yaw-(ev.clientX-fpDrag.x)*0.005;fp.pitch=Math.max(-1.2,Math.min(1.2,fpDrag.pitch-(ev.clientY-fpDrag.y)*0.004));return;}
    if(!G){if(ev.buttons)return;MV.ev=ev;if(!MV.req){MV.req=true;requestAnimationFrame(moveModel);}return;}
    if(tool!=='sel')findSnap(ev);
    const w=terrainAtRay(ev);const ro=$('#readout');
    if(w){ro.innerHTML=`<b>Cota ${fmt(w.z,2)} m</b> · E ${fmt(utmE(w.x),1)} · N ${fmt(utmN(w.y),1)}`+(mCur&&mCur.pts.length?(()=>{const s=distStats(mCur.pts[mCur.pts.length-1],w);return ` · desde último ${fmt(s.h)} m`;})():'');}});
  cv.addEventListener('pointerup',ev=>{planDrag=null;fpDrag=null;if(!down)return;const moved=Math.hypot(ev.clientX-down.x,ev.clientY-down.y);down=null;if(moved>5||ev.button!==0)return;if(tool==='sel')onSelect(ev);else onMeasureClick(ev);});
  cv.addEventListener('dblclick',()=>{if(tool==='area')closeArea();});
  cv.addEventListener('wheel',ev=>{if(camMode==='plan'){ev.preventDefault();planState.w=Math.max(8,Math.min(1500,planState.w*(ev.deltaY>0?1.15:1/1.15)));updOrtho();}},{passive:false});
  const pts=new Map();let pd=0;cv.addEventListener('pointerdown',e=>pts.set(e.pointerId,e));['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,e=>{pts.delete(e.pointerId);pd=0;}));
  cv.addEventListener('pointermove',e=>{if(camMode!=='plan'||pts.size!==2)return;pts.set(e.pointerId,e);const [a,b]=[...pts.values()];const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pd){planState.w=Math.max(8,Math.min(1500,planState.w*pd/d));updOrtho();}pd=d;planDrag=null;});
  window.addEventListener('keydown',ev=>{if(ev.target.matches('input,textarea,select'))return;
    if(camMode==='fp')fp.keys[ev.key.toLowerCase()]=true;
    if(ev.key==='Escape'){if(!$('#help').hidden){$('#help').hidden=true;return;}if(!$('#ardlg').hidden){$('#ardlg').hidden=true;return;}if(mCur)cancelCur();else if(camMode==='fp')setCam('persp');else{clearSel();if(ISO.on)exitIso();showInfo(null);setTool('sel');}}
    if(ev.key==='Enter'&&tool==='area')closeArea();
    if(ev.key.toLowerCase()==='h'&&ISEL){ifcHide(ISEL.ei);clearSel();showInfo(null);}
    if(ev.key.toLowerCase()==='h'&&MSEL&&camMode!=='fp'){MSEL.list.forEach(([d,ei])=>hideEl(d,ei));clearSel();showInfo(null);}
    if(ev.key.toLowerCase()==='h'&&selObj){HIDDEN.add(selObj);selObj.visible=false;clearSel();showInfo(null);}});
  window.addEventListener('keyup',ev=>{fp.keys[ev.key.toLowerCase()]=false;});
  $$('#fpad button').forEach(b=>{const k=b.dataset.k;b.addEventListener('pointerdown',()=>fp.keys[k]=true);['pointerup','pointerleave','pointercancel'].forEach(t=>b.addEventListener(t,()=>fp.keys[k]=false));});
}
let lastT=performance.now(),active3d=true;
function loop(t){requestAnimationFrame(loop);const dt=Math.min(0.1,(t-lastT)/1000);lastT=t;if(!active3d)return;
  if(camMode==='fp'){const k=fp.keys,sp=(k.shift?6:2.6)*dt;const fx=Math.cos(fp.yaw),fy=Math.sin(fp.yaw);let mx=0,my=0;
    if(k.w||k.arrowup){mx+=fx;my+=fy;}if(k.s||k.arrowdown){mx-=fx;my-=fy;}if(k.a||k.arrowleft){mx+=-fy;my+=fx;}if(k.d||k.arrowright){mx+=fy;my+=-fx;}
    if(k.q)fp.yaw+=1.5*dt;if(k.e)fp.yaw-=1.5*dt;
    const n=Math.hypot(mx,my);let z;
    if(HAS_MOD&&!G){if(n){const nx=fp.pos[0]+mx/n*sp*0.62,ny=fp.pos[1]+my/n*sp*0.62;const zf=floorAt(nx,ny,fp.z);if(zf!=null){fp.pos=[nx,ny];fp.z=fp.z+(zf-fp.z)*Math.min(1,dt*12);if(Math.abs(zf-fp.z)<0.01)fp.z=zf;}}else{const zf=floorAt(fp.pos[0],fp.pos[1],fp.z);if(zf!=null)fp.z=fp.z+(zf-fp.z)*Math.min(1,dt*12);}z=fp.z+1.7;}
    else{if(n){const nx=fp.pos[0]+mx/n*sp,ny=fp.pos[1]+my/n*sp;if(hz(nx,ny)!=null)fp.pos=[nx,ny];}
    z=zWalk(fp.pos[0],fp.pos[1])+1.7;}camP.position.copy(V3(fp.pos[0],fp.pos[1],z));camP.up.set(0,1,0);camP.lookAt(V3(fp.pos[0]+Math.cos(fp.yaw)*Math.cos(fp.pitch),fp.pos[1]+Math.sin(fp.yaw)*Math.cos(fp.pitch),z+Math.sin(fp.pitch)));
    $('#readout').innerHTML=`<b>Primera persona</b> · cota suelo ${fmt(z-1.7,2)} m · E ${fmt(utmE(fp.pos[0]),1)} · N ${fmt(utmN(fp.pos[1]),1)}`;}
  else if(camMode==='persp')ctlP.update();else if(camMode==='iso')ctlO.update();
  renderer.render(scene,cam);renderSec();
  const r=$('#v3d');const W=r.clientWidth,H=r.clientHeight;const v=new THREE.Vector3();
  const cps=renderer.clippingPlanes||[];for(const l of LBL){if((l.lyr&&!LV[l.lyr])||(cps.length&&l.lyr&&!cps.every(p=>p.distanceToPoint(l.v)>=-0.3))){l.d.style.display='none';continue;}v.copy(l.v);v.project(cam);if(v.z>1||v.z<-1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1){l.d.style.display='none';continue;}l.d.style.display='';l.d.style.left=((v.x+1)/2*W)+'px';l.d.style.top=((1-v.y)/2*H)+'px';}
  if(camMode!=='plan')updNorthArrow();}
/* ---------- dibujo 2D (papel en mm) ---------- */
/* ---------- dibujo 2D (papel en mm) ---------- */
const INK={k:'#1b1b1b',g1:'#7d847f',g2:'#a9aea9',g3:'#c9ccc8',red:'#b3261e',ora:'#b7791f',tea:'#1e5f5a',blu:'#2f5d86',vio:'#7b3fa0',grn:'#4f7a3a'};
const TXT_CANVAS=document.createElement('canvas').getContext('2d');
function textW(s,h,b){TXT_CANVAS.font=(b?'bold ':'')+'100px Arial, Helvetica, sans-serif';return TXT_CANVAS.measureText(s).width/100*h;}
function mkT(s,R,ox,oy,px,py){const k=1000/s,a=R*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);
  const f=(x,y)=>{const dx=x-ox,dy=y-oy;return [px+(dx*ca-dy*sa)*k,py-(dx*sa+dy*ca)*k];};
  const inv=(X,Y)=>{const rx=(X-px)/k,ry=-(Y-py)/k;return [ox+rx*ca+ry*sa,oy-rx*sa+ry*ca];};return {s,R,k,f,inv};}
function paperize(dl,T){const out=[];
  for(const e of dl){
    if(e.t==='L'||e.t==='P'){out.push({...e,p:e.p.map(q=>T.f(q[0],q[1]))});}
    else if(e.t==='C'){const [X,Y]=T.f(e.x,e.y);out.push({...e,x:X,y:Y,r:e.rp!=null?e.rp:e.r*T.k});}
    else if(e.t==='M'){const q=e.s,o=new Float32Array(q.length);for(let i=0;i<q.length;i+=2){const p=T.f(q[i],q[i+1]);o[i]=p[0];o[i+1]=p[1];}out.push({...e,s:o});}
    else if(e.t==='X'){const [X,Y]=T.f(e.x,e.y);out.push({...e,x:X,y:Y});}
    else if(e.t==='I'){const a=T.f(e.x0,e.y1),b=T.f(e.x1,e.y1),c=T.f(e.x0,e.y0);out.push({...e,m:[b[0]-a[0],b[1]-a[1],c[0]-a[0],c[1]-a[1],a[0],a[1]]});}
    else if(e.t==='T'){let [X,Y]=T.f(e.x,e.y);let a=(e.r||0)+T.R;a=((a%360)+360)%360;if(a>90&&a<=270)a-=180;if(a>180)a-=360;out.push({...e,x:X+(e.dx||0),y:Y-(e.dy||0),r:a});}
    else out.push(e);}
  return out;}
const INK2={grn:'#4f7a3a',blu:'#2f5d86',vio:'#7b3fa0',asf:'#c3c6c9',ver:'#e6e1d6'};
const MTB=[[-2,'#8e1b12'],[-1,'#c0392b'],[-0.5,'#e07a6a'],[-0.1,'#f3c1b8'],[0.1,'#eeeeea'],[0.5,'#c6dbef'],[1,'#8fbbe0'],[2,'#4a90c8'],[3,'#2565a3'],[99,'#123e70']];
function mtColor(d){for(const [b,c] of MTB)if(d<=b)return c;return '#123e70';}
const PLAN=PL.meta;const SCL=PLAN.scales||[250,500,1000,2000];
function bucket(s){if(s==null)return 0;let b=0;SCL.forEach((v,i)=>{if(v<=s)b=i;});return b;}
const PLAN_ORDER=(()=>{const o=(P.planOrder||[]).filter(id=>LAYERS.some(l=>l.id===id));LAYERS.forEach(l=>{if(!o.includes(l.id))o.push(l.id);});return o;})();
function mtPlanDL(on){const dl=[];if(!HAS_MT)return dl;const S=2;for(let j=0;j+S<=MT.ny;j+=S)for(let i=0;i+S<=MT.nx;i+=S){let s=0,n=0;for(let b=0;b<S;b++)for(let a=0;a<S;a++){const k=(j+b)*MT.nx+i+a;if(isFinite(MT.ZD[k])&&isFinite(MT.ZT[k])){s+=MT.ZF[k]-MT.ZT[k];n++;}}if(!n)continue;const d=s/n;if(d>0&&!on('mt_relleno')||d<=0&&!on('mt_corte'))continue;const x=MT.x0+i-0.5,y=MT.y0+j-0.5;dl.push({t:'P',p:[[x,y],[x+S,y],[x+S,y+S],[x,y+S]],f:mtColor(d),o:0.85});}return dl;}
/* planta: listas de dibujo por capa (coordenadas de mundo), con máscara de escalas; textos al final */
function planDL(o={}){if(HAS_MOD&&o.h!=null){const m=modelPlanDL(o),st=staticPlanDL(o);const out=st.concat(m);out.lay=st.lay.concat(m.lay);return out;}return staticPlanDL(o);}
function staticPlanDL(o={}){const on=k=>o.layers?!!o.layers[k]:LV[k];const bit=1<<bucket(o.scale);const dl=[],tx=[],lay=[],layT=[];
  PLAN_ORDER.forEach(id=>{if(!on(id))return;
    if(HAS_MT&&(id==='mt_relleno'||id==='mt_corte')){if(id==='mt_relleno'||!on('mt_relleno')){mtPlanDL(on).forEach(e=>{dl.push(e);lay.push('mt');});}return;}
    if(ORTO&&id===(ORTO.layer||'orto')){dl.push({t:'I',href:ORTO.file,x0:ORTO.x0,x1:ORTO.x1,y0:ORTO.y0,y1:ORTO.y1,lo:(o.layers?1:LOP[id])*(ORTO.planOp!=null?ORTO.planOp:0.6)});lay.push(id);return;}
    const it=PLAN.layers[id];if(!it)return;for(const [m,e] of it){if(!(m&bit))continue;if(e.t==='T'){tx.push(e);layT.push(id);}else{dl.push(e);lay.push(id);}}});
  const out=dl.concat(tx);out.lay=lay.concat(layT);return out;}
let clipN=0;
function svgOf(pp){let s='';
  for(const e of pp){const s0=s.length;try{
    const id=e.id?` data-id="${e.id}" style="cursor:pointer"`:'';
    if(e.t==='L')s+=`<polyline points="${e.p.map(q=>q[0].toFixed(2)+','+q[1].toFixed(2)).join(' ')}" fill="none" stroke="${e.c}" stroke-width="${e.w}"${e.d?` stroke-dasharray="${e.d.join(' ')}"`:''} stroke-linejoin="round" stroke-linecap="round"${id}/>`;
    else if(e.t==='P')s+=`<polygon points="${e.p.map(q=>q[0].toFixed(2)+','+q[1].toFixed(2)).join(' ')}" fill="${e.f||'none'}"${e.o!=null?` fill-opacity="${e.o}"`:''} stroke="${e.c||'none'}" stroke-width="${e.w||0}"${e.d?` stroke-dasharray="${e.d.join(' ')}"`:''}${id}/>`;
    else if(e.t==='C')s+=`<circle cx="${e.x.toFixed(2)}" cy="${e.y.toFixed(2)}" r="${e.r.toFixed(2)}" fill="${e.f||'none'}" stroke="${e.c}" stroke-width="${e.w}"${id}/>`;
    else if(e.t==='M'){const q=e.s;if(q.length){let d='';for(let i=0;i<q.length;i+=4)d+='M'+q[i].toFixed(2)+' '+q[i+1].toFixed(2)+'L'+q[i+2].toFixed(2)+' '+q[i+3].toFixed(2);s+=`<path d="${d}" fill="none" stroke="${e.c}" stroke-width="${e.w}" stroke-linecap="round"/>`;}}
    else if(e.t==='X'){const r=e.rp;s+=`<path d="M${e.x-r} ${e.y-r}L${e.x+r} ${e.y+r}M${e.x-r} ${e.y+r}L${e.x+r} ${e.y-r}" stroke="${e.c}" stroke-width="${e.w}"/>`;}
    else if(e.t==='T'){const tr=e.r?` transform="rotate(${(-e.r).toFixed(2)} ${e.x.toFixed(2)} ${e.y.toFixed(2)})"`:'';const bg=e.bg?` paint-order="stroke" stroke="#fff" stroke-width="${(e.h*(e.bg===1?0.35:0.3)).toFixed(2)}"`:'';
      s+=`<text x="${e.x.toFixed(2)}" y="${e.y.toFixed(2)}" font-size="${e.h}" font-family="Arial, Helvetica, sans-serif"${e.b?' font-weight="bold"':''} text-anchor="${e.a||'start'}" fill="${e.c||'#000'}"${e.sp?` letter-spacing="${e.sp}"`:''}${tr}${bg}${id}>${esc(e.s)}</text>`;}
    else if(e.t==='G'){const cid='cp'+(clipN++);s+=`<clipPath id="${cid}"><rect x="${e.clip[0]}" y="${e.clip[1]}" width="${e.clip[2]}" height="${e.clip[3]}"/></clipPath><g clip-path="url(#${cid})">${svgOf(e.items)}</g>`;}
    else if(e.t==='I'&&e.m)s+=`<image href="${esc(e.href)}" x="0" y="0" width="1" height="1" preserveAspectRatio="none" transform="matrix(${e.m.map(v=>v.toFixed(3)).join(' ')})"/>`;
    else if(e.t==='R')s+=`<rect x="${e.x}" y="${e.y}" width="${e.w2}" height="${e.h2}" fill="${e.f||'none'}" stroke="${e.c||'none'}" stroke-width="${e.w||0}"/>`;
    }finally{if(e.lo!=null&&e.lo<1&&s.length>s0)s=s.slice(0,s0)+`<g opacity="${e.lo.toFixed(2)}">`+s.slice(s0)+'</g>';}}
  return s;}
function makeHost(el,opts){
  el.innerHTML='';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','sv');el.appendChild(svg);
  const st={vb:[0,0,100,100],svg,opts};const setVB=()=>svg.setAttribute('viewBox',st.vb.map(v=>v.toFixed(3)).join(' '));
  st.fit=(b,pad=0.04)=>{const r=el.getBoundingClientRect();const a=r.width/Math.max(1,r.height);let [x,y,w,h]=b;w*=1+pad*2;h*=1+pad*2;x-=b[2]*pad;y-=b[3]*pad;if(w/h>a){const nh=w/a;y-=(nh-h)/2;h=nh;}else{const nw=h*a;x-=(nw-w)/2;w=nw;}st.vb=[x,y,w,h];setVB();};
  st.set=(html,bg)=>{svg.innerHTML=(bg?`<rect x="-1e5" y="-1e5" width="2e5" height="2e5" fill="${bg}"/>`:'')+html;};
  st.toPaper=(cx,cy)=>{const pt=svg.createSVGPoint();pt.x=cx;pt.y=cy;const m=svg.getScreenCTM();if(!m)return [0,0];const q=pt.matrixTransform(m.inverse());return [q.x,q.y];};
  let drag=null;const ptrs=new Map();let pinch=0;
  const zoomAt=(c,f)=>{const [x,y,w,h]=st.vb;const nw=Math.max(2,Math.min(w*f,1e5)),nh=h*nw/w;st.vb=[c[0]-(c[0]-x)*nw/w,c[1]-(c[1]-y)*nh/h,nw,nh];setVB();};
  svg.addEventListener('pointerdown',ev=>{ptrs.set(ev.pointerId,ev);if(ptrs.size===1)drag={x:ev.clientX,y:ev.clientY,vb:st.vb.slice(),moved:false};svg.setPointerCapture(ev.pointerId);});
  svg.addEventListener('pointermove',ev=>{if(ptrs.has(ev.pointerId))ptrs.set(ev.pointerId,ev);
    if(ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);if(pinch)zoomAt(st.toPaper((a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2),pinch/d);pinch=d;drag=null;return;}
    if(drag&&(!opts.measuring||!opts.measuring())){const r=svg.getBoundingClientRect();const k=st.vb[2]/r.width;const dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;if(Math.hypot(dx,dy)>3){drag.moved=true;svg.classList.add('drag');}st.vb=[drag.vb[0]-dx*k,drag.vb[1]-dy*k,st.vb[2],st.vb[3]];setVB();}
    opts.move&&opts.move(ev,st);});
  const up=ev=>{ptrs.delete(ev.pointerId);pinch=0;svg.classList.remove('drag');if(drag&&!drag.moved&&ev.type==='pointerup')opts.click&&opts.click(ev,st);drag=null;};
  svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);svg.addEventListener('dblclick',ev=>opts.dbl&&opts.dbl(ev,st));
  svg.addEventListener('wheel',ev=>{ev.preventDefault();zoomAt(st.toPaper(ev.clientX,ev.clientY),ev.deltaY>0?1.15:1/1.15);},{passive:false});
  st.setVB=setVB;return st;}


/* ---------- perfiles ---------- */
function segX(a,b,c,d){const r=[b[0]-a[0],b[1]-a[1]],q=[d[0]-c[0],d[1]-c[1]],den=r[0]*q[1]-r[1]*q[0];if(Math.abs(den)<1e-12)return null;const t=((c[0]-a[0])*q[1]-(c[1]-a[1])*q[0])/den,u=((c[0]-a[0])*r[1]-(c[1]-a[1])*r[0])/den;return(t>=0&&t<=1&&u>=0&&u<=1)?t:null;}
const PERF=P.perfil||{};
function zonaAt(x,y){for(const z of (PERF.zonas||[]))if(pip([x,y],z.P))return z;return null;}
function profileData(a,b,step=0.5){const L=dist2(a,b),n=Math.max(2,Math.ceil(L/step)),S=[];for(let i=0;i<=n;i++){const t=i/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;const q=mtAt(x,y);S.push({s:L*t,x,y,z:hz(x,y),zd:q?q.zf:null,zt_:q?q.zd:null,c:zonaAt(x,y)});}
  const X=[];const add=(Pp,name,cls)=>{for(let i=1;i<Pp.length;i++){const t=segX(a,b,Pp[i-1],Pp[i]);if(t!=null)X.push({s:t*L,n:name,cls});}};
  (PERF.cruces||[]).forEach(c=>{if(c.l&&!LV[c.l])return;add(c.P,c.n,c.c);});
  X.sort((p,q)=>p.s-q.s);const Xf=[];X.forEach(x=>{if(!Xf.length||x.s-Xf[Xf.length-1].s>0.8||x.n!==Xf[Xf.length-1].n)Xf.push(x);});return {a,b,L,S,X:Xf};}
function profileDL(pd,box,o={}){
  const [bx,by,bw,bh]=box;const zs=pd.S.filter(p=>p.z!=null).map(p=>p.z);if(!zs.length)zs.push(ZR);
  pd.S.forEach(p=>{if(p.zd!=null)zs.push(p.zd);if(p.c&&p.z!=null)zs.push(p.z-p.c.dz);});const zmin=Math.floor(Math.min(...zs)-0.5),zmax=Math.ceil(Math.max(...zs)+0.5);
  const tab=14;const gw=bw-22,gh=bh-tab-8;const ox=bx+20,oy=by+2;
  const kx=o.kx||gw/Math.max(1,pd.L);const ky=o.ky||Math.min(gh/(zmax-zmin),kx*10);
  const ex=ky/kx;const X=s=>ox+s*kx,Y=z=>oy+gh-(z-zmin)*ky;const dl=[];
  const zst=(zmax-zmin)>8?1:0.5;for(let z=zmin;z<=zmax+1e-6;z+=zst){dl.push({t:'L',p:[[X(0),Y(z)],[X(pd.L),Y(z)]],c:INK.g3,w:0.1});dl.push({t:'T',x:ox-1.5,y:Y(z)+0.7,s:fmt(z,1),h:2,a:'end',c:INK.g1});}
  const cst=pd.L>120?20:10;for(let s=0;s<=pd.L+1e-6;s+=cst)dl.push({t:'L',p:[[X(s),Y(zmin)],[X(s),Y(zmax)]],c:INK.g3,w:0.1});
  (pd.X||[]).forEach(x=>{const col={vio:'#7b3fa0',blu:'#2f5d86',tea:INK.tea,k:INK.g1,red:'#7a1f1f',g:INK.g2}[x.cls]||INK.g1;dl.push({t:'L',p:[[X(x.s),Y(zmin)],[X(x.s),Y(zmax)]],c:col,w:0.2,d:[1.2,0.8]});dl.push({t:'T',x:X(x.s)-0.6,y:Y(zmax)+1,s:x.n,h:1.8,r:90,a:'end',c:col});});
  {const segs=[];let cur=[];pd.S.forEach(p=>{if(p.c&&p.z!=null)cur.push([X(p.s),Y(p.z-p.c.dz)]);else if(cur.length){segs.push(cur);cur=[];}});if(cur.length)segs.push(cur);segs.forEach(sg=>dl.push({t:'L',p:sg,c:INK.blu||'#2f5d86',w:0.35,d:[1.5,0.8]}));}
  const tp=pd.S.filter(p=>p.z!=null).map(p=>[X(p.s),Y(p.z)]);
  if(tp.length>1){dl.push({t:'P',p:[...tp,[tp[tp.length-1][0],Y(zmin)],[tp[0][0],Y(zmin)]],f:'#e9e3d3',o:0.9});dl.push({t:'L',p:tp,c:'#5a4a36',w:0.5});}
  if(HAS_MT){const segs=[];let cur=[];pd.S.forEach(p=>{if(p.zd!=null&&p.zd>=zmin&&p.zd<=zmax)cur.push([X(p.s),Y(p.zd)]);else if(cur.length){segs.push(cur);cur=[];}});if(cur.length)segs.push(cur);if(segs.length&&(LV.mt_relleno||LV.mt_corte)){segs.forEach(sg=>dl.push({t:'L',p:sg,c:'#b8860b',w:0.45}));dl.push({t:'T',x:segs[0][0][0]+1,y:segs[0][0][1]+2.6,s:'Fondo de plataforma',h:1.8,a:'start',c:'#b8860b'});const tp2=pd.S.filter(p=>p.zt_!=null&&p.zt_>=zmin&&p.zt_<=zmax).map(p=>[X(p.s),Y(p.zt_)]);if(tp2.length>1)dl.push({t:'L',p:tp2,c:'#7a1f1f',w:0.2,d:[1,0.6]});}}
  (PERF.niveles||[]).forEach(nv=>{if(nv.l&&!LV[nv.l])return;const zn=nv.z;if(zn<zmin||zn>zmax)return;dl.push({t:'L',p:[[X(0),Y(zn)],[X(pd.L),Y(zn)]],c:nv.c||'#7a1f1f',w:0.2,d:[3,1]},{t:'T',x:X(pd.L)-1,y:Y(zn)-0.8,s:nv.s,h:1.8,a:'end',c:nv.c||'#7a1f1f'});});
  dl.push({t:'R',x:X(0),y:Y(zmax),w2:pd.L*kx,h2:(zmax-zmin)*ky,c:INK.k,w:0.25});
  dl.push({t:'T',x:X(0),y:Y(zmax)-1.2,s:'A',h:2.6,a:'middle',c:INK.k,b:true},{t:'T',x:X(pd.L),y:Y(zmax)-1.2,s:'B',h:2.6,a:'middle',c:INK.k,b:true});
  const ty=Y(zmin)+2;dl.push({t:'T',x:ox-1.5,y:ty+3.5,s:'Distancia',h:2,a:'end',c:INK.g1},{t:'T',x:ox-1.5,y:ty+9,s:'Cota',h:2,a:'end',c:INK.g1},{t:'L',p:[[X(0),ty+5.5],[X(pd.L),ty+5.5]],c:INK.g2,w:0.1});
  for(let s=0;s<=pd.L+1e-6;s+=cst){const z=hz(pd.a[0]+(pd.b[0]-pd.a[0])*s/pd.L,pd.a[1]+(pd.b[1]-pd.a[1])*s/pd.L);dl.push({t:'T',x:X(s),y:ty+3.5,s:fmt(s,1),h:1.8,a:'middle',c:INK.k},{t:'T',x:X(s)+0.6,y:ty+9.5,s:fmt(z,2),h:1.8,r:90,a:'start',c:INK.k});}
  return {dl,X,Y,kx,ky,ex,zmin,zmax,ox,oy};}
function profileCSV(pd){const r=['distancia_m;este;norte;cota_terreno_m'];pd.S.forEach(p=>r.push([fmt(p.s,2),fmt(utmE(p.x),3),fmt(utmN(p.y),3),fmt(p.z,3)].join(';').replace(/\./g,'')));return '﻿'+r.join('\r\n')+'\r\n';}

/* ---------- láminas ---------- */
/* ---------- láminas ---------- */
const SW=420,SH=297;
const TODAY=new Intl.DateTimeFormat('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date()).replace(/\//g,'-');
function R_(x,y,w,h,c,w1,f){return {t:'R',x,y,w2:w,h2:h,c,w:w1,f};}
function Tx(x,y,s,h,a='start',b=false,c=INK.k,r=0){return {t:'T',x,y,s,h,a,b,c,r};}
function frame(dl){dl.push(R_(0,0,SW,SH,'none',0,'#ffffff'));dl.push(R_(20,10,390,277,INK.k,0.5));}
function northSym(dl,x,y,R){const a=(CONV+R)*Math.PI/180;const rot=(px,py)=>[x+px*Math.cos(a)+py*Math.sin(a),y-(-px*Math.sin(a)+py*Math.cos(a))];
  dl.push({t:'P',p:[rot(0,9),rot(3,-5),rot(0,-2.5),rot(-3,-5)],f:INK.k,c:INK.k,w:0.2});const tp=rot(0,12);if(P.norte==='np'){dl.push(Tx(tp[0],tp[1]+1.2,'NP',3.2,'middle',true));dl.push(Tx(x,y+10,'Norte de proyecto',1.8,'middle',false,INK.g1));}else dl.push(Tx(tp[0],tp[1]+1.2,'N',3.5,'middle',true));}
function scaleBar(dl,x,y,s){const seg=s>=1000?10:s>=500?5:2.5,n=5,k=1000/s;for(let i=0;i<n;i++)dl.push({t:'P',p:[[x+i*seg*k,y],[x+(i+1)*seg*k,y],[x+(i+1)*seg*k,y+1.5],[x+i*seg*k,y+1.5]],f:i%2?'#fff':INK.k,c:INK.k,w:0.15});
  for(let i=0;i<=n;i++)dl.push(Tx(x+i*seg*k,y+4.5,fmt(i*seg,seg<5?1:0),1.8,'middle'));dl.push(Tx(x+n*seg*k+3,y+1.6,'m',1.8));dl.push(Tx(x,y-1.5,'Escala 1:'+fmt(s,0),2,'start',true));}
function titleBlock(dl,o){const x=330,w=80;let y=o.top||205;const RT=P.rotulo||null;
  const row=(h,lab,val,vb=false,vh=2.6)=>{dl.push(R_(x,y,w,h,INK.k,0.2));dl.push(Tx(x+1.5,y+2.8,lab,1.7,'start',false,INK.g1));(Array.isArray(val)?val:[val]).filter(Boolean).forEach((v,i)=>dl.push(Tx(x+1.5,y+2.8+vh+1.2+i*(vh+0.8),v,vh,'start',vb)));y+=h;};
  if(RT)RT.rows.forEach(r=>row(r[2]||12,r[0],r[1],!!r[3],r[4]||2.6));else{row(15,'Proyecto',[PRJ.nombre.toUpperCase()],true,3.2);row(12,'Ubicación',[PRJ.ubicacion],false,2.3);row(11,'Mandante',[PRJ.mandante||''],false,2.6);}
  row(15,'Contenido',o.content,true,2.5);
  const h=12;dl.push(R_(x,y,w/3,h,INK.k,0.2),R_(x+w/3,y,w/3,h,INK.k,0.2),R_(x+2*w/3,y,w/3,h,INK.k,0.2));
  dl.push(Tx(x+1.5,y+2.8,'Escala',1.7,'start',false,INK.g1),Tx(x+w/3+1.5,y+2.8,'Fecha',1.7,'start',false,INK.g1),Tx(x+2*w/3+1.5,y+2.8,'Lámina',1.7,'start',false,INK.g1));
  dl.push(Tx(x+1.5,y+8.5,o.scale,2.5,'start',true),Tx(x+w/3+1.5,y+8.5,TODAY,2.5,'start',true),Tx(x+2*w/3+1.5,y+8.5,o.code,(RT&&RT.codeH)||2.8,'start',true));y+=h;
  dl.push(R_(x,y,w,287-y,INK.k,0.2));((RT&&RT.pie)||[PRJ.etapa+' · Rev. 0']).forEach((t,i)=>dl.push(Tx(x+1.5,y+3+i*3,t,i?1.45:1.7,'start',false,INK.g1)));}
function viewportPlan(dl,rect,s,cx,cy,R,layers){const T=mkT(s,R,cx,cy,rect[0]+rect[2]/2,rect[1]+rect[3]/2);const items=paperize(planDL({scale:s,layers}),T);
  const step=s>=1000?50:25;const cs=[T.inv(rect[0],rect[1]),T.inv(rect[0]+rect[2],rect[1]),T.inv(rect[0],rect[1]+rect[3]),T.inv(rect[0]+rect[2],rect[1]+rect[3])];const ex=[Math.min(...cs.map(c=>c[0])),Math.max(...cs.map(c=>c[0]))],ey=[Math.min(...cs.map(c=>c[1])),Math.max(...cs.map(c=>c[1]))];
  for(let E=Math.ceil(utmE(ex[0])/step)*step;E<=utmE(ex[1]);E+=step)for(let N=Math.ceil(utmN(ey[0])/step)*step;N<=utmN(ey[1]);N+=step){const [X,Y]=T.f(E-E0,N-N0);if(X<rect[0]+2||X>rect[0]+rect[2]-2||Y<rect[1]+2||Y>rect[1]+rect[3]-2)continue;items.push({t:'L',p:[[X-1.5,Y],[X+1.5,Y]],c:INK.g1,w:0.13},{t:'L',p:[[X,Y-1.5],[X,Y+1.5]],c:INK.g1,w:0.13},Tx(X+0.8,Y-0.8,'E '+fmt(E,0),1.3,'start',false,INK.g1),Tx(X+0.8,Y+2,'N '+fmt(N,0),1.3,'start',false,INK.g1));}
  dl.push({t:'G',clip:rect,items});dl.push(R_(rect[0],rect[1],rect[2],rect[3],INK.k,0.25));return T;}
function sheetTipo(){const dl=[];frame(dl);dl.push(R_(22,12,306,273,INK.g2,0.25));dl.push(Tx(175,148,'Área de dibujo',4,'middle',true,INK.g2));
  dl.push(Tx(333,18,'Simbología',2.4,'start',true));dl.push(Tx(333,23,'Sin elementos',1.9,'start',false,INK.g1));northSym(dl,345,180,0);scaleBar(dl,356,176,500);
  titleBlock(dl,{content:['LÁMINA TIPO'],scale:'Indicada',code:PRJ.codigo+'-000'});return dl;}
function legend(dl,x,y,items){dl.push(Tx(x,y,'Simbología',2.4,'start',true));y+=4;items.forEach(([lab,kind,c,d,f])=>{if(kind==='L')dl.push({t:'L',p:[[x,y-0.8],[x+8,y-0.8]],c,w:0.35,d});else if(kind==='P')dl.push({t:'P',p:[[x,y-2],[x+8,y-2],[x+8,y+0.3],[x,y+0.3]],f,c,w:0.15});else dl.push({t:'C',x:x+4,y:y-0.9,r:1.1,f:f||'none',c,w:0.2});dl.push(Tx(x+10,y,lab,1.9));y+=4;});return y;}
/* láminas: listas de dibujo guardadas por proyecto; la fecha del rótulo se actualiza al abrir */
const LDATE=LM.meta.date;
function fixDate(dl){return dl.map(e=>e.t==='T'&&LDATE&&e.s===LDATE?{...e,s:TODAY}:e.t==='G'?{...e,items:fixDate(e.items)}:e);}
function sheetMT(){const dl=[];frame(dl);const r=mtCalc();const lay={...SHEET_BASE,curvas:1,puntos:0,arboles:0,redes:0,mob:0,verde:0,ifc_muros:1,ifc_fach:0,ifc_estr:0,ifc_losas:0,ifc_cub:1,ifc_otros:0,ifc_pav:1,ifc_estac:0,ifc_canal:1,mt_relleno:1,mt_corte:1};
  viewportPlan(dl,[22,12,306,273],1000,IBB.c[0]+8,IBB.c[1]+12,-CONV,lay);
  let y=18;dl.push(Tx(333,y,'Corte y relleno (m)',2.4,'start',true));y+=4;const lab=['> 2,0 corte','1,0 a 2,0 corte','0,5 a 1,0 corte','0,1 a 0,5 corte','± 0,1','0,1 a 0,5 relleno','0,5 a 1,0 relleno','1,0 a 2,0 relleno','2,0 a 3,0 relleno','> 3,0 relleno'];
  MTB.forEach(([b,c],i)=>{dl.push({t:'P',p:[[333,y-2],[341,y-2],[341,y+0.3],[333,y+0.3]],f:c,c:INK.g2,w:0.1});dl.push(Tx(343,y,lab[i],1.8));y+=3.4;});
  y+=3;dl.push(Tx(333,y,'Volúmenes (m³)',2.4,'start',true));y+=4.2;const f0=v=>fmt(v,0);
  dl.push(Tx(333,y,'Zona',1.6,'start',true),Tx(381,y,'Corte',1.6,'end',true),Tx(398,y,'Relleno',1.6,'end',true));y+=3.2;
  [[1,'Edificio (NPT)'],[2,'Pavimentos IFC'],[3,'Estacionamientos']].forEach(([k,n])=>{dl.push(Tx(333,y,n,1.6),Tx(381,y,f0(r.Z[k].c),1.6,'end'),Tx(398,y,f0(r.Z[k].r),1.6,'end'));y+=3;});
  dl.push(Tx(333,y,'Cajón canal',1.6),Tx(398,y,'−'+f0(r.cj),1.6,'end'));y+=3;dl.push(Tx(333,y,'Taludes (est.)',1.6),Tx(381,y,f0(r.tc),1.6,'end'),Tx(398,y,f0(r.tr),1.6,'end'));y+=3;
  dl.push({t:'L',p:[[333,y-2],[399,y-2]],c:INK.k,w:0.15});dl.push(Tx(333,y+0.5,'Total',1.7,'start',true),Tx(381,y+0.5,f0(r.C),1.7,'end',true),Tx(398,y+0.5,f0(r.R),1.7,'end',true));y+=4;
  dl.push(Tx(333,y,'Saldo a aportar: '+f0(r.R-r.C)+' m³',1.8,'start',true));y+=4;
  ['Volúmenes geométricos en banco, grilla de 1 m.','Referencia: fondo de plataformas. Pavimentos: cara','inferior de losas IFC. Edificio: NPT '+fmt(MTD.npt)+' − '+fmt(MTP.eb,2)+' m.','Estacionamientos: demarcación − '+fmt(MTP.ep,2)+' m.','No incluye fundaciones ni escarpe.'].forEach(t_=>{dl.push(Tx(333,y,t_,1.45,'start',false,INK.g1));y+=2.6;});
  northSym(dl,345,y+12,-CONV);scaleBar(dl,358,y+9,1000);
  titleBlock(dl,{content:['MOVIMIENTO DE TIERRAS','CORTE Y RELLENO ESQUEMÁTICO'],scale:'1:1000',code:PRJ.codigo+'-MT-101'});return dl;}

const SHEET_BASE=(()=>{const o={};LAYERS.forEach(l=>o[l.id]=!l.off);['puntos','arboles','redes','mob','verde','ifc_fach','ifc_estr','ifc_losas','ifc_otros','ifc_estac','grilla'].forEach(k=>o[k]=0);return o;})();
const SHEETS=[...(LM.meta.sheets||[]).map(s=>({id:s.id,name:s.name,fn:HAS_MT&&/^MT/.test(s.id)?sheetMT:()=>fixDate(s.dl)})),...(P.laminas||[]).map(sp=>({id:sp.id,name:sp.name,fn:sheetSpec(sp)}))];

/* ---------- PDF ---------- */
/* ---------- PDF ---------- */
const CP1252={0x20AC:0x80,0x201A:0x82,0x192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x2C6:0x88,0x2030:0x89,0x160:0x8A,0x2039:0x8B,0x152:0x8C,0x17D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x2DC:0x98,0x2122:0x99,0x161:0x9A,0x203A:0x9B,0x153:0x9C,0x17E:0x9E,0x178:0x9F};
function winAnsi(s){let o='';for(const ch of s){let c=ch.codePointAt(0);if(c===0x2192)c=0x3E;else if(c===0x2248)c=0x7E;else if(c>255)c=CP1252[c]||0x3F;o+=String.fromCharCode(c);}return o;}
function hexRGB(c){if(!c||c==='none')return null;let m=c.replace('#','');if(m.length===3)m=m.split('').map(x=>x+x).join('');if(!/^[0-9a-fA-F]{6}$/.test(m))m='000000';return [parseInt(m.slice(0,2),16)/255,parseInt(m.slice(2,4),16)/255,parseInt(m.slice(4,6),16)/255];}
function pdfPage(pp){const K=72/25.4,f=v=>(v*K).toFixed(2),X=x=>f(x),Y=y=>f(SH-y);let s='';
  const stroke=(c,w,d)=>{const r=hexRGB(c);s+=`${r.map(v=>v.toFixed(3)).join(' ')} RG ${f(w)} w ${d?'['+d.map(f).join(' ')+'] 0 d':'[] 0 d'}\n`;};
  const fillc=c=>{const r=hexRGB(c);s+=`${r.map(v=>v.toFixed(3)).join(' ')} rg\n`;};
  const walk=arr=>{for(const e of arr){
    if(e.t==='L'){stroke(e.c,e.w,e.d);s+=e.p.map((q,i)=>`${X(q[0])} ${Y(q[1])} ${i?'l':'m'}`).join(' ')+' S\n';}
    else if(e.t==='P'){const hasF=e.f&&e.f!=='none',hasS=e.c&&e.c!=='none'&&e.w;if(hasF){if(e.o!=null&&e.o<1)s+=`/GS${Math.round(e.o*10)} gs\n`;fillc(e.f);}if(hasS)stroke(e.c,e.w,e.d);s+=e.p.map((q,i)=>`${X(q[0])} ${Y(q[1])} ${i?'l':'m'}`).join(' ')+' h '+(hasF&&hasS?'B':hasF?'f':'S')+'\n';if(hasF&&e.o!=null&&e.o<1)s+='/GS10 gs\n';}
    else if(e.t==='R'){const hasF=e.f&&e.f!=='none',hasS=e.c&&e.c!=='none'&&e.w;if(!hasF&&!hasS)continue;if(hasF)fillc(e.f);if(hasS)stroke(e.c,e.w);s+=`${X(e.x)} ${Y(e.y+e.h2)} ${f(e.w2)} ${f(e.h2)} re ${hasF&&hasS?'B':hasF?'f':'S'}\n`;}
    else if(e.t==='C'){const k=0.5523*e.r,x=e.x,y=e.y,r=e.r;const hasF=e.f&&e.f!=='none';if(hasF)fillc(e.f);stroke(e.c,e.w);
      s+=`${X(x+r)} ${Y(y)} m ${X(x+r)} ${Y(y-k)} ${X(x+k)} ${Y(y-r)} ${X(x)} ${Y(y-r)} c ${X(x-k)} ${Y(y-r)} ${X(x-r)} ${Y(y-k)} ${X(x-r)} ${Y(y)} c ${X(x-r)} ${Y(y+k)} ${X(x-k)} ${Y(y+r)} ${X(x)} ${Y(y+r)} c ${X(x+k)} ${Y(y+r)} ${X(x+r)} ${Y(y+k)} ${X(x+r)} ${Y(y)} c ${hasF?'B':'S'}\n`;}
    else if(e.t==='T'){const w=textW(e.s,e.h,e.b);const a=(e.r||0)*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a);const off=e.a==='middle'?w/2:e.a==='end'?w:0;const x0=e.x-off*ca,y0=e.y+off*sa;fillc(e.c||'#000000');const str=winAnsi(e.s).replace(/[\\()]/g,m=>'\\'+m);
      s+=`BT /${e.b?'F2':'F1'} ${f(e.h)} Tf ${ca.toFixed(4)} ${sa.toFixed(4)} ${(-sa).toFixed(4)} ${ca.toFixed(4)} ${X(x0)} ${Y(y0)} Tm (${str}) Tj ET\n`;}
    else if(e.t==='M'){const q=e.s;if(!q.length)continue;stroke(e.c,e.w,e.d);const b=[];for(let i=0;i<q.length;i+=4)b.push(`${X(q[i])} ${Y(q[i+1])} m ${X(q[i+2])} ${Y(q[i+3])} l`);s+=b.join(' ')+' S\n';}
    else if(e.t==='X'){stroke(e.c,e.w);const r=e.rp;s+=`${X(e.x-r)} ${Y(e.y-r)} m ${X(e.x+r)} ${Y(e.y+r)} l ${X(e.x-r)} ${Y(e.y+r)} m ${X(e.x+r)} ${Y(e.y-r)} l S\n`;}
    else if(e.t==='G'){s+=`q ${X(e.clip[0])} ${Y(e.clip[1]+e.clip[3])} ${f(e.clip[2])} ${f(e.clip[3])} re W n\n`;walk(e.items);s+='Q\n';}}};
  s+='1 j 1 J\n';walk(pp);return s;}
function buildPDF(pages){const objs=[];const add=o=>{objs.push(o);return objs.length;};
  const cat=add(null),pagesId=add(null),f1=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'),f2=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  let gs='';for(let i=1;i<=10;i++){const id=add(`<< /Type /ExtGState /ca ${(i/10).toFixed(1)} >>`);gs+=`/GS${i} ${id} 0 R `;}
  const kids=[];const W=(SW*72/25.4).toFixed(2),H=(SH*72/25.4).toFixed(2);
  pages.forEach(pp=>{const c=winAnsi(pdfPage(pp));const cs=add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /ExtGState << ${gs}>> >> /Contents ${cs} 0 R >>`));});
  objs[cat-1]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`;objs[pagesId-1]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;
  let out='%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';const offs=[];objs.forEach((o,i)=>{offs.push(out.length);out+=`${i+1} 0 obj\n${o}\nendobj\n`;});
  const xr=out.length;out+=`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('');
  out+=`trailer\n<< /Size ${objs.length+1} /Root ${cat} 0 R /Info << /Title (${winAnsi(PRJ.nombre)}) /Producer (Modelo BIM ${PRJ.codigo}) >> >>\nstartxref\n${xr}\n%%EOF\n`;
  const u=new Uint8Array(out.length);for(let i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;return u;}
/* ---------- módulo MT: informe ---------- */
/* ---------- informe de movimiento de tierras ---------- */
function mtHTML(){const r=mtCalc();const f0=v=>fmt(v,0);const rows=[1,2,3].map(k=>{const z=r.Z[k];return `<tr><td>${esc(MTZ[k])}</td><td>${f0(z.a)}</td><td>${f0(z.c)}</td><td>${f0(z.r)}</td><td>${f0(z.r-z.c)}</td><td>${fmt(z.cmax,2)}</td><td>${fmt(z.hmax,2)}</td></tr>`;}).join('');
  const W=Math.max(r.R,r.C,1);const bar=(v,c)=>`<span style="display:inline-block;height:12px;width:${Math.max(1,v/W*100)}%;background:${c};border-radius:2px;vertical-align:middle"></span>`;
  return `<div style="position:absolute;inset:0;overflow:auto;padding:18px 20px;background:var(--paper)"><div class="card" style="max-width:880px">
  <h4>Movimiento de tierras · ${esc(PRJ.nombre)}</h4><div class="kind">Terreno: ${esc(MTD.src.plano)} (${esc(MTD.src.fecha)}) · Fondo de plataformas: ${esc(MTD.src.ifc)} · grilla de 1 m</div>
  <div style="display:flex;flex-wrap:wrap;gap:14px;margin:14px 0">${[['Relleno',r.R,'#2e86c1'],['Corte',r.C,'#c0392b'],['Saldo a aportar',r.R-r.C,'var(--ink)']].map(([n,v,c])=>`<div style="flex:1;min-width:150px;border:1px solid var(--rule);border-radius:8px;padding:10px 12px"><div style="font-size:12px;color:var(--ink-3)">${n}</div><div style="font:600 24px/1.2 var(--fc);color:${c};font-variant-numeric:tabular-nums">${f0(v)} m³</div></div>`).join('')}</div>
  <div style="font-size:12.5px;color:var(--ink-2);display:grid;grid-template-columns:70px 1fr 90px;gap:6px 10px;align-items:center;max-width:620px"><span>Relleno</span>${bar(r.R,'#2e86c1')}<span style="text-align:right">${f0(r.R)} m³</span><span>Corte</span>${bar(r.C,'#c0392b')}<span style="text-align:right">${f0(r.C)} m³</span></div>
  <div style="overflow-x:auto;margin-top:16px"><table class="mtt" style="border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums;min-width:640px">
  <thead><tr><th style="text-align:left">Zona</th><th>Área m²</th><th>Corte m³</th><th>Relleno m³</th><th>Neto m³</th><th>Corte máx. m</th><th>Relleno máx. m</th></tr></thead>
  <tbody>${rows}<tr><td>Cajón del canal dentro del relleno (se descuenta)</td><td></td><td></td><td>−${f0(r.cj)}</td><td>−${f0(r.cj)}</td><td></td><td></td></tr>
  <tr><td>Taludes perimetrales estimados (relleno ${fmt(MTP.tr,1)}H:1V · corte ${fmt(MTP.tc,1)}H:1V)</td><td></td><td>${f0(r.tc)}</td><td>${f0(r.tr)}</td><td>${f0(r.tr-r.tc)}</td><td></td><td></td></tr>
  <tr style="font-weight:600"><td>Total</td><td>${f0(r.T.a)}</td><td>${f0(r.C)}</td><td>${f0(r.R)}</td><td>${f0(r.R-r.C)}</td><td></td><td></td></tr></tbody></table></div>
  <h4 style="font:600 17px/1.2 var(--fc);margin:18px 0 6px">Parámetros</h4>
  <div style="display:flex;flex-wrap:wrap;gap:12px 22px;font-size:13px"><label>Espesor de plataforma bajo NPT del edificio, m <input id="mt-eb" type="number" step="0.05" min="0" max="3" value="${MTP.eb}" style="width:76px;margin-left:6px;border:1px solid var(--rule);border-radius:6px;padding:3px 6px;background:var(--panel)"></label>
  <label>Espesor de pavimento en estacionamientos, m <input id="mt-ep" type="number" step="0.05" min="0" max="3" value="${MTP.ep}" style="width:76px;margin-left:6px;border:1px solid var(--rule);border-radius:6px;padding:3px 6px;background:var(--panel)"></label>
  <label>Talud de relleno H:1V <input id="mt-tr" type="number" step="0.25" min="0" max="4" value="${MTP.tr}" style="width:66px;margin-left:6px;border:1px solid var(--rule);border-radius:6px;padding:3px 6px;background:var(--panel)"></label>
  <label>Talud de corte H:1V <input id="mt-tc" type="number" step="0.25" min="0" max="4" value="${MTP.tc}" style="width:66px;margin-left:6px;border:1px solid var(--rule);border-radius:6px;padding:3px 6px;background:var(--panel)"></label></div>
  <p class="note">Volúmenes geométricos en banco, sin esponjamiento ni compactación. Corte y relleno se miden hasta el fondo de las plataformas: en pavimentos, la cara inferior de las losas del IFC (hormigón vehicular ${fmt(MTD.th.veh,2)} m y radier peatonal ${fmt(MTD.th.pea,2)} m); en el edificio, el NPT ${fmt(MTD.npt)} m menos el espesor de plataforma, porque el IFC no modela la losa de piso; en la playa de estacionamientos sin plataforma, el nivel de la demarcación menos el espesor de pavimento. Ambos espesores parten en ${fmt(MTD.th.veh,2)} m, igual que el hormigón vehicular del IFC. No incluye excavación de fundaciones ni escarpe de capa vegetal. El relleno sobre el canal descuenta el volumen del cajón.</p>
  <div class="btnrow"><button class="btn" id="mt-3d">Ver volúmenes en 3D</button><button class="btn" id="mt-plan">Planta de corte y relleno</button><button class="btn" id="mt-sheet">Lámina ${esc(PRJ.codigo)}-MT-101</button></div></div></div>`;}
function wireMT(){const st=$('#v2d table');if(st)st.querySelectorAll('th,td').forEach((c,i)=>{c.style.cssText+=';padding:6px 10px;border-bottom:1px solid var(--rule);'+(c.cellIndex?'text-align:right':'text-align:left');});
  const upd=()=>{MTP.eb=Math.max(0,+$('#mt-eb').value||0);MTP.ep=Math.max(0,+$('#mt-ep').value||0);mtBottom();MTP.tr=Math.max(0,+$('#mt-tr').value||0);MTP.tc=Math.max(0,+$('#mt-tc').value||0);lsSet('mtp2',MTP);buildMT();applyTerrainCut();const y=$('#v2d').firstElementChild.scrollTop;$('#v2d').innerHTML=mtHTML();wireMT();$('#v2d').firstElementChild.scrollTop=y;};
  ['#mt-eb','#mt-ep','#mt-tr','#mt-tc'].forEach(id=>$(id).onchange=upd);
  $('#mt-3d').onclick=()=>{setTab('3d');['mt_relleno','tcut'].forEach(l=>setLayer(l,true));['ifc_muros','ifc_fach','ifc_estr','ifc_losas','ifc_cub','ifc_otros'].forEach(l=>setLayer(l,false));renderLayers();setCam('persp');focusWorld(IBB.c[0],IBB.c[1],210);toast('Edificio oculto para ver los volúmenes; actívalo en Capas.');};
  $('#mt-plan').onclick=()=>openPlanTab('plan-mt','Planta de corte y relleno',{scale:1000,focus:IBB.c,fw:230,force:{mt_relleno:true,mt_corte:true,curvas:false,puntos:false,ifc_estac:false,ifc_otros:false,ifc_estr:false}});
  $('#mt-sheet').onclick=()=>{const sh=SHEETS.find(x=>/^MT/.test(x.id));if(sh)openSheet(sh.id);};}

/* ---------- documentos del proyecto (fichas, normativa, imágenes) ---------- */
function renderDoc(id){const d=(P.docs||{})[id];const v=$('#v2d');v.innerHTML=d?d.html:'<p class="empty" style="padding:20px">Documento no disponible.</p>';
  if(!d)return;v.querySelectorAll('[data-nav]').forEach(b=>{const it=findNav(b.dataset.nav);if(!it){b.remove();return;}b.onclick=()=>runAct(it.a);});
  if(d.js){try{new Function('api',d.js)(API);}catch(e){console.error('doc '+id,e);}}}
function openSheet(id){const s=SHEETS.find(x=>x.id===id);if(!s)return;openTab({id:'sh-'+s.id,title:s.name.split(' · ')[0],type:'sheet',fn:s.fn,sheet:s});}
/* ---------- pestañas ---------- */
/* ---------- pestañas ---------- */
const TABS=[{id:'3d',title:'Modelo 3D',type:'3d',fixed:true}];let activeTab='3d';let host2=null,cur2=null;
function renderTabs(){$('#tabs').innerHTML=TABS.map(t=>`<button class="tab" role="tab" data-tab="${t.id}" aria-selected="${t.id===activeTab}">${esc(t.title)}${t.fixed?'':`<span class="x" data-close="${t.id}" role="button" aria-label="Cerrar pestaña">×</span>`}</button>`).join('');
  $$('#tabs .tab').forEach(b=>b.onclick=ev=>{const c=ev.target.dataset.close;if(c){closeTab(c);return;}setTab(b.dataset.tab);});markNav();}
function openTab(t){if(!TABS.find(x=>x.id===t.id))TABS.push(t);setTab(t.id);}
function closeTab(id){const i=TABS.findIndex(t=>t.id===id);if(i<0)return;TABS.splice(i,1);if(activeTab===id)setTab(TABS[Math.max(0,i-1)].id);else renderTabs();}
function setTab(id){activeTab=id;const t=TABS.find(x=>x.id===id);renderTabs();
  const is3=t.type==='3d';$('#v3d').hidden=!is3;$('#v2d').hidden=is3;$('#tb3d').hidden=!is3;$('#tb2d').hidden=is3;active3d=is3;
  $('#tb2d').querySelectorAll('#seg-tool2,#seg-north,label').forEach(el=>el.style.display=t.type==='plan'?'':'none');{const lc=$('#lab-cut');if(lc)lc.style.display=t.type==='plan'&&t.h!=null?'':'none';}
  $('#btn-3d-from2d').style.display=(t.type==='sheet'||t.type==='img')?'none':'';
  if(is3){resize3d();return;}
  cur2=t;if(t.type==='plan'){syncScale(t.scale);syncNorthBtns(t.north);if(t.h!=null)syncH(t.h);}
  cur2=t;if(t.type==='doc'||t.type==='mt'||t.type==='coord'){if(t.type==='mt'){$('#v2d').innerHTML=mtHTML();wireMT();}else if(t.type==='coord'){$('#v2d').innerHTML=coordHTML();wireCoord();}else renderDoc(t.id);host2=null;$('#tb2d').querySelectorAll('#btn-3d-from2d,#btn-fit2').forEach(b=>b.style.display='none');return;}
  $('#btn-fit2').style.display='';host2=makeHost($('#v2d'),{click:click2,move:move2,dbl:()=>closeArea2(),measuring:()=>tool2!=='nav'});
  const ro=document.createElement('div');ro.className='readout';ro.id='ro2';ro.style.cssText='position:absolute;left:10px;bottom:10px';ro.textContent=t.type==='plan'?(t.h!=null&&HAS_MOD?'Rueda para acercar, arrastra para desplazar. Una marca de corte abre el corte; un círculo rojo abre la interferencia.':'Rueda para acercar, arrastra para desplazar.'):t.type==='prof'?(t.sec?'Pasa el cursor por el corte para leer la cota.':'Pasa el cursor por el perfil para leer la cota.'):t.type==='img'?(t.title||'Imagen'):'Lámina A3. Rueda para acercar, arrastra para desplazar.';$('#v2d').appendChild(ro);
  render2(true);}
function markNav(){$$('.nav li button').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===activeTab));}
let tool2='nav',m2=null;
function planT(t){return mkT(t.scale,t.north==='np'?RNP:-CONV,BC[0],BC[1],0,0);}
function render2(fit){const t=cur2;if(!t||!host2)return;
  if(t.type==='plan'){const T=planT(t);t.T=T;host2.set(svgOf(paperize(planDL({scale:t.scale,layers:t.force?{...LV,...t.force}:null,h:t.h,mono:t.mono,allClash:t.allClash,secMarks:t.h!=null}),T))+'<g id="m2g"></g>','#ffffff');if(t.h!=null&&HAS_MOD){const lb={t:'T',x:0,y:0,s:t.title+' · plano de corte '+fz(t.h)+' m',h:3.2*t.scale/200,a:'start',b:true,c:INK.k};const p0=T.f(BB.x0,BB.y1+9);lb.x=p0[0];lb.y=p0[1];host2.svg.insertAdjacentHTML('beforeend',svgOf([lb]));
    host2.svg.querySelectorAll('[data-id^="sec-"]').forEach(el=>el.addEventListener('click',ev=>{ev.stopPropagation();const n=el.dataset.id.slice(4);const s=MSECS.find(x=>x.n===n);if(s)openProfileTab('Corte '+n+'-'+n,s.a,s.b);}));
    host2.svg.querySelectorAll('[data-id^="cl-"]').forEach(el=>el.addEventListener('click',ev=>{ev.stopPropagation();const c=CLASH.find(x=>x.id===+el.dataset.id.slice(3));if(c)showInfo(clashInfo(c),null);}));}
    if(fit&&t.h!=null&&HAS_MOD&&!t.focus&&!t.fitPoly){const q=[T.f(BB.x0-6,BB.y0-6),T.f(BB.x1+6,BB.y1+10)];host2.fit([Math.min(q[0][0],q[1][0]),Math.min(q[0][1],q[1][1]),Math.abs(q[1][0]-q[0][0]),Math.abs(q[1][1]-q[0][1])],0.03);}
    else if(fit){if(t.fitPoly&&t.fitPoly.length){const q=t.fitPoly.map(p=>T.f(p[0],p[1])),xs=q.map(p=>p[0]),ys=q.map(p=>p[1]);host2.fit([Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)],0.08);}else{const c=t.focus||BC,w=t.fw||460,p=T.f(c[0],c[1]),k=T.k;host2.fit([p[0]-w*k/2,p[1]-w*k*0.45,w*k,w*k*0.9],0.02);}}drawM2();}
  else if(t.type==='prof'&&t.sec){const sd=t.sd||(t.sd=sectionData(t.pd.a,t.pd.b));const k=10;const w=sd.L*k+70,h=((MO&&MO.secZ)?(MO.secZ[1]-MO.secZ[0]):14)*k+30;
    const nm=(t.title.match(/^Corte ([A-Z])-/)||[])[1];const r=sectionDL(sd,[0,10,w,h],{k,ends:nm?[nm,nm+"'"]:null});t.map=r;const dl=[{t:'T',x:18,y:6,s:t.title+' · 1:100 · L = '+fmt(sd.L,2)+' m',h:4,a:'start',b:true,c:INK.k},...r.dl];
    host2.set(svgOf(dl)+'<g id="m2g"></g>','#ffffff');if(fit)host2.fit([0,0,w,h+12]);}
  else if(t.type==='img'){host2.set(`<image href="${esc(t.src)}" x="0" y="0" width="400" height="260" preserveAspectRatio="xMidYMid meet"/>`,'#2a2c2a');if(fit)host2.fit([0,0,400,260],0.02);}
  else if(t.type==='prof'){const pd=t.pd;const kx=2,ky=10;const zz=pd.S.filter(p=>p.z!=null).map(p=>p.z);const w=pd.L*kx+40,h=Math.max(60,(Math.ceil(Math.max(...zz,ZR)+0.5)-Math.floor(Math.min(...zz,ZR)-0.5))*ky+40);const r=profileDL(pd,[0,8,w,h],{kx,ky});t.map=r;host2.set(svgOf([{t:'T',x:20,y:4,s:t.title+' · L = '+fmt(pd.L,2)+' m',h:3,a:'start',b:true,c:INK.k},...r.dl])+'<g id="m2g"></g>','#ffffff');if(fit)host2.fit([0,0,w,h+10]);}
  else if(t.type==='sheet'){host2.set(svgOf(t.fn()),'#9aa09b');if(fit)host2.fit([0,0,SW,SH],0.02);}}
function snap2(ev){const t=cur2;if(!t||t.type!=='plan')return null;const [px,py]=host2.toPaper(ev.clientX,ev.clientY);const w=t.T.inv(px,py);return {x:w[0],y:w[1],z:t.h!=null?t.h:(hz(w[0],w[1])??ZR)};}
function move2(ev){const t=cur2;const ro=$('#ro2');if(!ro)return;
  if(t.type==='plan'){const p=snap2(ev);if(!p)return;ro.innerHTML=`<b>Cota ${fmt(p.z,2)} m</b> · E ${fmt(utmE(p.x),2)} · N ${fmt(utmN(p.y),2)}${m2&&m2.pts.length?' · desde último '+fmt(dist2([p.x,p.y],[m2.pts[m2.pts.length-1].x,m2.pts[m2.pts.length-1].y]))+' m':''}`;}
  if(t.type==='prof'&&t.sec&&t.map){const [px,py]=host2.toPaper(ev.clientX,ev.clientY);const s=(px-t.map.ox)/t.map.k,z=t.map.zmax-(py-t.map.oy)/t.map.k;if(s<0||s>t.sd.L)return;ro.innerHTML=`<b>Distancia ${fmt(s,2)} m · cota ${fz(z,2)} m</b>`;const g=host2.svg.querySelector('#m2g');if(g){const X=t.map.X(s),Y=t.map.Y(z);g.innerHTML=`<line x1="${X}" y1="${t.map.Y(t.map.zmin)}" x2="${X}" y2="${t.map.Y(t.map.zmax)}" stroke="#b7791f" stroke-width="0.25"/><line x1="${t.map.X(0)}" y1="${Y}" x2="${t.map.X(t.sd.L)}" y2="${Y}" stroke="#b7791f" stroke-width="0.2"/>`;}return;}
  if(t.type==='prof'&&t.map){const [px]=host2.toPaper(ev.clientX,ev.clientY);const s=(px-t.map.ox)/t.map.kx;if(s<0||s>t.pd.L)return;const x=t.pd.a[0]+(t.pd.b[0]-t.pd.a[0])*s/t.pd.L,y=t.pd.a[1]+(t.pd.b[1]-t.pd.a[1])*s/t.pd.L;ro.innerHTML=`<b>Dm ${fmt(s,2)} m · cota ${fmt(hz(x,y),2)} m</b> · E ${fmt(utmE(x),2)} · N ${fmt(utmN(y),2)}`;}}
function click2(ev){const t=cur2;if(t.type!=='plan'||tool2==='nav')return;const p=snap2(ev);if(!p)return;if(!m2)m2={type:tool2,pts:[]};m2.pts.push(p);
  if(tool2==='dist'&&m2.pts.length===2){const [a,b]=m2.pts,s=distStats(a,b);measures.push({type:'dist2',title:'Distancia en planta '+mSeq++,sub:`Horizontal ${fmt(s.h)} m · desnivel ${fmt(s.dz)} m`});renderMeasures();openSide('meas');toast('Distancia '+fmt(s.h)+' m');m2.done=true;}
  drawM2();if(m2&&m2.done)m2=null;}
function closeArea2(){if(m2&&m2.pts)m2.pts=m2.pts.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)>0.05);if(!m2||m2.type!=='area'||m2.pts.length<3)return;const P=m2.pts.map(p=>[p.x,p.y]);const A=parea(P);measures.push({type:'area2',title:'Área en planta '+mSeq++,sub:`${fmt(A)} m² · perímetro ${fmt(plen(P.concat([P[0]])))} m`});renderMeasures();openSide('meas');toast('Área '+fmt(A)+' m²');m2.closed=true;drawM2();m2=null;}
function drawM2(){const g=host2&&host2.svg.querySelector('#m2g');if(!g||!cur2.T)return;g.innerHTML='';if(!m2)return;const q=m2.pts.map(p=>cur2.T.f(p.x,p.y));const k=host2.vb[2]/host2.svg.getBoundingClientRect().width;
  g.innerHTML=`<polyline points="${q.concat(m2.closed?[q[0]]:[]).map(p=>p.join(',')).join(' ')}" fill="${m2.closed?'rgba(183,121,31,.15)':'none'}" stroke="#b7791f" stroke-width="${k*2}"/>${q.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="${k*4}" fill="#b7791f"/>`).join('')}`;}
function openProfileTab(title,a,b){const sec=HAS_MOD&&!G;openTab({id:'prof-'+title.replace(/\W+/g,'_'),title,type:'prof',sec,pd:sec?{a,b,L:dist2(a,b)}:profileData(a,b)});}
function syncScale(s){const sel=$('#sel-scale');if(![...sel.options].some(o=>+o.value===+s))sel.insertAdjacentHTML('beforeend',`<option value="${s}">1:${s}</option>`);sel.value=String(s);}
function syncH(h){const s=$('#sel-h');if(!s)return;if(![...s.options].some(o=>+o.value===h))s.insertAdjacentHTML('beforeend',`<option value="${h}">${fz(h)}</option>`);s.value=String(h);}
function openPlanTab(id,title,o){if(TABS.find(t=>t.id===id)){setTab(id);return;}const T0={id,title,type:'plan',scale:o.scale||500,north:o.north||P.norteDef||'real',focus:o.focus,fw:o.fw,force:o.force,fitPoly:o.fitPoly,h:o.h,mono:o.mono,allClash:o.allClash};openTab(T0);syncScale(T0.scale);syncNorthBtns(T0.north);}
function syncNorthBtns(n){$$('#seg-north button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.north===n));}
let prCur=null;
function openProfilePanel(a,b,title){if(HAS_MOD&&!G){openSectionPanel(a,b,title);return;}const pd=profileData(a,b);prCur={pd,title};$('#profp').hidden=false;$('#pr-title').textContent=title+' · '+fmt(pd.L,2)+' m';
  const body=$('#pr-body');const r=body.getBoundingClientRect();const w=Math.max(200,r.width/3.78),h=Math.max(60,r.height/3.78);
  const res=profileDL(pd,[0,2,w,h-2],{});body.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>${svgOf(res.dl)}<g id="prm"></g></svg>`;
  $('#pr-read').textContent='Exageración vertical ×'+fmt(res.ex,1);$('#pr-csv').hidden=!DLCAP;
  const svg=body.querySelector('svg');svg.onpointermove=ev=>{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;const q=pt.matrixTransform(svg.getScreenCTM().inverse());const s=(q.x-res.ox)/res.kx;if(s<0||s>pd.L)return;const x=a[0]+(b[0]-a[0])*s/pd.L,y=a[1]+(b[1]-a[1])*s/pd.L,z=hz(x,y);if(z==null)return;
    $('#pr-read').textContent=`Dm ${fmt(s,2)} m · cota ${fmt(z,2)} m`;svg.querySelector('#prm').innerHTML=`<line x1="${res.X(s)}" y1="${res.Y(res.zmin)}" x2="${res.X(s)}" y2="${res.Y(res.zmax)}" stroke="#b7791f" stroke-width="0.3"/>`;
    if(!prCur.mk){prCur.mk=new THREE.Mesh(new THREE.SphereGeometry(0.6,12,10),new THREE.MeshBasicMaterial({color:'#b7791f',depthTest:false}));prCur.mk.renderOrder=12;scene.add(prCur.mk);}prCur.mk.position.copy(V3(x,y,z+0.3));};}
function closeProfilePanel(){$('#profp').hidden=true;if(prCur&&prCur.mk)scene.remove(prCur.mk);if(prCur&&prCur.line)scene.remove(prCur.line);prCur=null;}

/* ---------- panel lateral ---------- */
function openSide(st){$('#side').hidden=false;$('#btn-side').setAttribute('aria-pressed','true');$$('.stabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.st===st));['prop','lyr','meas'].forEach(k=>$('#st-'+k).hidden=k!==st);}
function opCtl(k,id,v,nm){const p=Math.round(v*100);return `<span class="lyr-op"><input type="range" min="0" max="100" step="5" value="${p}" data-o${k}="${esc(id)}" aria-label="Opacidad ${esc(nm)}" title="Opacidad"><output>${p}%</output></span>`;}
function renderLayers(){let h='',g='';LAYERS.forEach(l=>{if(l.grp!==g){g=l.grp;const ls=LAYERS.filter(x=>x.grp===g),n=ls.filter(x=>LV[x.id]).length;const noop=ls.every(x=>x.noop);h+=`<label class="lyr-grp"><input type="checkbox" data-g="${esc(g)}" ${n===ls.length?'checked':''} data-mixed="${n>0&&n<ls.length?1:0}"> ${esc(g)} <small>${n}/${ls.length}</small>${noop?'':opCtl('g',g,ls.reduce((a,x)=>a+LOP[x.id],0)/ls.length,'grupo '+g)}</label>`;}h+=`<div class="lyr-row${l.noop?' nolvl':''}"><label class="lyr"><input type="checkbox" data-l="${l.id}" ${LV[l.id]?'checked':''}><span class="sw" style="background:${l.c}"></span>${esc(l.name)}</label>${opCtl('l',l.id,LOP[l.id],l.name)}</div>`;});
  if(Object.keys(PAL).length)h=`<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:13px"><span style="color:var(--ink-2)">Colores del IFC</span><div class="seg" role="group" aria-label="Colores del IFC"><button data-mm="render" aria-pressed="${MATMODE==='render'}">Render</button><button data-mm="ifc" aria-pressed="${MATMODE!=='render'}">IFC</button></div></div>`+h;h+=`<div class="btnrow"><button class="btn" id="ly-all">Mostrar todo</button>${((P.ui&&P.ui.layerBtns)||[]).map((b,i)=>`<button class="btn" data-lyb="${i}">${esc(b.t)}</button>`).join('')}</div>${P.ui&&P.ui.layerNote?`<p class="note">${esc(P.ui.layerNote)}</p>`:''}`;
  $('#st-lyr').innerHTML=h;
  $$('#st-lyr input[data-l]').forEach(i=>i.onchange=()=>{setLayer(i.dataset.l,i.checked);renderLayers();});
  $$('#st-lyr input[data-g]').forEach(i=>{i.indeterminate=i.dataset.mixed==='1';i.onchange=()=>{LAYERS.filter(l=>l.grp===i.dataset.g).forEach(l=>setLayer(l.id,i.checked));renderLayers();};});
  $$('#st-lyr .lyr-op').forEach(w=>{w.onclick=e=>e.stopPropagation();w.onmousedown=e=>e.stopPropagation();});
  $$('#st-lyr input[data-ol]').forEach(i=>i.oninput=()=>{setLayerOp(i.dataset.ol,i.value/100);i.nextElementSibling.value=i.value+'%';lsSet('lop',LOP);});
  $$('#st-lyr input[data-og]').forEach(i=>i.oninput=()=>{i.nextElementSibling.value=i.value+'%';LAYERS.filter(l=>l.grp===i.dataset.og).forEach(l=>{setLayerOp(l.id,i.value/100);const r=$(`#st-lyr input[data-ol="${l.id}"]`);if(r){r.value=i.value;r.nextElementSibling.value=i.value+'%';}});lsSet('lop',LOP);});
  $$('#st-lyr [data-mm]').forEach(b=>b.onclick=()=>{setMatMode(b.dataset.mm);renderLayers();});
  $('#ly-all').onclick=()=>{LAYERS.forEach(l=>{setLayer(l.id,true);if(HAS_MOD)setLayerOp(l.id,1);});if(HAS_MOD)lsSet('lop',LOP);renderLayers();};
  $$('#st-lyr [data-lyb]').forEach(b=>b.onclick=()=>{const x=P.ui.layerBtns[+b.dataset.lyb];const it=x.nav?findNav(x.nav):null;runAct(it?it.a:x.a);});}
function opMat(m,f){if(!m)return;const u=m.userData||(m.userData={});if(u.op0==null){u.op0=m.opacity;u.tr0=m.transparent;u.dw0=m.depthWrite;}m.opacity=u.op0*f;m.transparent=u.tr0||f<1;m.depthWrite=f<1?false:u.dw0;m.needsUpdate=true;}
function setLayerOp(id,f){LOP[id]=f;const g=GROUPS[id];if(!g)return;g.traverse(o=>{if(!o.material)return;(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>opMat(m,f));});}
function setLayer(id,v){LV[id]=v;if(id.startsWith('lv|')){MESHES.forEach(m=>m.visible=lvOn(m.userData.lv));}else if(GROUPS[id]&&!ISO.on)GROUPS[id].visible=v;if(id==='tcut')applyTerrainCut();else if(id.startsWith('mt_'))syncMTVis();if(cur2&&!$('#v2d').hidden&&cur2.type==='plan'&&host2){const c=host2.vb;render2(false);host2.vb=c;host2.setVB();}}
/* ---------- descargas ---------- */
/* ---------- descargas ---------- */
let DLCAP=null;
async function save(filename,data){if(!DLCAP){toast('Las descargas no están disponibles en esta vista.');return;}try{await DLCAP.save({filename,data});toast('Descarga lista: '+filename);}catch(e){if(e&&e.code==='declined')return;if(e&&e.code==='rate_limited'){toast('Hay otra descarga pendiente; intenta en un momento.');return;}toast('No se pudo descargar ('+(e&&e.code||'error')+').');}}
function dlMenu(anchor){const m=$('#dlmenu');const t=TABS.find(x=>x.id===activeTab);const it=[];
  if(!DLCAP)m.innerHTML='<button disabled>Descargas no disponibles aquí<small>Abre el artefacto publicado en claude.ai para descargar.</small></button>';
  else{if(t.type==='3d')it.push(['jpg','Imagen JPEG de esta vista','Captura del modelo tal como se ve']);
    if(t.type==='sheet')it.push(['pdf1','PDF de esta lámina','A3 vectorial, '+t.title]);
    if(t.type==='mt'&&HAS_MT)it.push(['csvmt','CSV · volúmenes de corte y relleno','Por zona, en m³']);
    if(t.type==='plan'||t.type==='prof')it.push(['svg','SVG de esta vista','Vector editable en Illustrator o Inkscape'],['pdfv','PDF A3 de esta vista','Con viñeta del proyecto, a la escala elegida']);
    if(t.type==='prof'&&!t.sec)it.push(['csv','CSV del perfil','Cotas cada 0,5 m, separador punto y coma']);
    if(t.type==='3d'&&prCur&&!prCur.sec)it.push(['csvp','CSV del perfil abierto','Cotas cada 0,5 m']);
    if(t.type==='plan')it.push(['dxf','DXF de esta vista','Coordenadas UTM reales, capas del modelo']);
    it.push(['hr'],['pdfall','PDF · juego de láminas',SHEETS.length+' láminas A3 vectoriales']);if(HAS_MOD)it.push(['dxfm','DXF · plantas cortadas y ejes',PLAN_H.length+' planos de corte, especialidades, ejes e interferencias, en 3D · .zip'],...(CLASH.length?[['csvc','CSV · interferencias','Con estado y nota de este navegador']]:[]),['csve','CSV · elementos de los modelos',fmt(Object.values(MD).reduce((a,d)=>a+d.els.length,0),0)+' filas con GlobalId o código']);if(PTS.length||PRS.length)it.push(['csvpts','CSV · puntos topográficos',fmt(PTS.length,0)+' puntos'+(PRS.length?' y '+PRS.length+' PR':'')]);
    m.innerHTML=it.map(i=>i[0]==='hr'?'<hr>':`<button data-dl="${i[0]}">${i[1]}<small>${i[2]}</small></button>`).join('');}
  const r=anchor.getBoundingClientRect();m.hidden=false;m.style.top=(r.bottom+6)+'px';m.style.left=Math.max(8,Math.min(window.innerWidth-m.offsetWidth-8,r.right-m.offsetWidth))+'px';
  $$('#dlmenu [data-dl]').forEach(b=>b.onclick=async()=>{m.hidden=true;await doDl(b.dataset.dl,t);});}
const FN=s=>PRJ.codigo+'_'+s.replace(/\W+/g,'_');
async function doDl(k,t){
  if(k==='jpg'){renderer.render(scene,cam);$('#c3d').toBlob(b=>save(FN('vista_3D')+'.jpg',b),'image/jpeg',0.92);}
  else if(k==='pdf1')save(FN(t.sheet.name.split(' · ')[0])+'.pdf',new Blob([buildPDF([t.fn()])]));
  else if(k==='pdfall')save(FN('juego_laminas')+'.pdf',new Blob([buildPDF(SHEETS.map(s=>s.fn()))]));
  else if(k==='svg'){const s=host2.svg.cloneNode(true);s.setAttribute('xmlns','http://www.w3.org/2000/svg');s.removeAttribute('class');save(FN(t.title)+'.svg','<?xml version="1.0" encoding="UTF-8"?>\n'+s.outerHTML);}
  else if(k==='pdfv')save(FN(t.title)+'.pdf',new Blob([buildPDF([sheetFromView(t)])]));
  else if(k==='csv')save(FN('perfil_'+t.title)+'.csv',profileCSV(t.pd));
  else if(k==='csvp'&&prCur)save(FN('perfil')+'.csv',profileCSV(prCur.pd));
  else if(k==='csvmt'){const r=mtCalc();const n_=(v,d)=>fmt(v,d).replace(/\./g,'');const L=['zona;area_m2;corte_m3;relleno_m3;neto_m3'];[1,2,3].forEach(z=>{const q=r.Z[z];L.push([MTZ[z],n_(q.a,0),n_(q.c,1),n_(q.r,1),n_(q.r-q.c,1)].join(';'));});L.push(['Cajón canal (descuento)','','',n_(-r.cj,1),n_(-r.cj,1)].join(';'));L.push(['Taludes estimados','',n_(r.tc,1),n_(r.tr,1),n_(r.tr-r.tc,1)].join(';'));L.push(['Total',n_(r.T.a,0),n_(r.C,1),n_(r.R,1),n_(r.R-r.C,1)].join(';'));save(FN('movimiento_de_tierras')+'.csv','\ufeff'+L.join('\r\n')+'\r\n');}
  else if(k==='dxfm'){toast('Preparando DXF…');const z=await makeZip([{name:FN('plantas_ejes')+'.dxf',data:modelDXF()}]);save(FN('DXF')+'.zip',z);}
  else if(k==='csvc')save(FN('interferencias')+'.csv',clashCSV());
  else if(k==='csve')save(FN('elementos')+'.csv',elemCSV());
  else if(k==='dxf')save(FN(t.title)+'.dxf',dxfOf(planDL({scale:t.scale,layers:t.force?{...LV,...t.force}:null}),t.scale));
  else if(k==='csvpts'){const r=['punto;este;norte;cota'];PRS.forEach(p=>r.push([p.n,fmt(p.E,3),fmt(p.N,3),fmt(p.z,3)].join(';').replace(/\./g,'')));PTS.forEach(p=>r.push([p.n,fmt(utmE(p.x),3),fmt(utmN(p.y),3),fmt(p.z,3)].join(';').replace(/\./g,'')));save(FN('puntos_topograficos')+'.csv','\ufeff'+r.join('\r\n')+'\r\n');}}
function sheetFromView(t){const dl=[];frame(dl);const rect=[22,12,306,273];
  if(t.type==='plan'&&t.h!=null&&HAS_MOD){const vb=host2.vb;const c=t.T.inv(vb[0]+vb[2]/2,vb[1]+vb[3]/2);viewportPlanM(dl,rect,t.scale,c[0],c[1],RNP,{h:t.h,layers:{...LV},allClash:t.allClash,mono:t.mono,secMarks:true});northSym(dl,345,40,RNP);scaleBar(dl,356,36,t.scale);}
  else if(t.type==='prof'&&t.sec){const sd=t.sd;const s=sd.L>61?250:200;const k=1000/s;const r=sectionDL(sd,[24,60,Math.min(300,sd.L*k+26),140],{k});dl.push(...r.dl);dl.push(Tx(24,40,t.title+' · escala 1:'+s,3,'start',true));scaleBar(dl,356,36,s);}
  else if(t.type==='plan'){const vb=host2.vb;const c=t.T.inv(vb[0]+vb[2]/2,vb[1]+vb[3]/2);viewportPlan(dl,rect,t.scale,c[0],c[1],t.north==='np'?RNP:-CONV,t.force?{...LV,...t.force}:{...LV});northSym(dl,345,40,t.north==='np'?RNP:-CONV);scaleBar(dl,356,36,t.scale);}
  else{const pd=t.pd;const r=profileDL(pd,[24,40,300,150],{kx:Math.min(278/pd.L,2)});dl.push(...r.dl);dl.push(Tx(24,30,t.title+' · exageración vertical ×'+fmt(r.ex,1),3,'start',true));}
  titleBlock(dl,{content:[t.title.toUpperCase().slice(0,38),'VISTA DE TRABAJO'],scale:t.type==='plan'?'1:'+t.scale:(t.sec?'1:'+(t.sd.L>61?250:200):'Indicada'),code:PRJ.codigo+'-TRB'});return dl;}

/* DXF R12 de una planta: listas de dibujo en coordenadas de mundo llevadas a UTM */
function dxfOf(dl,scale){const k=scale/1000;const o=['0','SECTION','2','HEADER','9','$INSUNITS','70','6','0','ENDSEC','0','SECTION','2','ENTITIES'];
  const lay=i=>String((dl.lay&&dl.lay[i])||'0').replace(/[^A-Za-z0-9_\-]/g,'_').toUpperCase();
  const aci=c=>{const r=hexRGB(c||'#000');if(!r)return 7;const [R_,G_,B_]=r;const M=Math.max(R_,G_,B_),m=Math.min(R_,G_,B_);if(M-m<0.12)return M>0.8?7:M>0.55?9:M>0.3?8:250;const h=(M===R_?((G_-B_)/(M-m))%6:M===G_?(B_-R_)/(M-m)+2:(R_-G_)/(M-m)+4)*60;const hh=(h+360)%360;return hh<20||hh>=340?1:hh<50?30:hh<70?2:hh<160?3:hh<200?4:hh<260?5:6;};
  const n=v=>(+v).toFixed(3);
  dl.forEach((e,i)=>{const L=lay(i),C=String(aci(e.c||e.f));
    if(e.t==='L'||e.t==='P'){o.push('0','POLYLINE','8',L,'62',C,'66','1','70',e.t==='P'?'1':'0');e.p.forEach(q=>o.push('0','VERTEX','8',L,'10',n(utmE(q[0])),'20',n(utmN(q[1])),'30','0'));o.push('0','SEQEND','8',L);}
    else if(e.t==='M'){for(let k2=0;k2+3<e.s.length;k2+=4)o.push('0','LINE','8',L,'62',C,'10',n(utmE(e.s[k2])),'20',n(utmN(e.s[k2+1])),'30','0','11',n(utmE(e.s[k2+2])),'21',n(utmN(e.s[k2+3])),'31','0');}
    else if(e.t==='C'){o.push('0','CIRCLE','8',L,'62',C,'10',n(utmE(e.x)),'20',n(utmN(e.y)),'30','0','40',n(e.rp!=null?e.rp*k:e.r));}
    else if(e.t==='T'){o.push('0','TEXT','8',L,'62',C,'10',n(utmE(e.x)),'20',n(utmN(e.y)),'30','0','40',n(e.h*k),'1',String(e.s).replace(/\n/g,' '),'50',n(e.r||0));if(e.a==='middle'||e.a==='end')o.push('72',e.a==='middle'?'1':'2','11',n(utmE(e.x)),'21',n(utmN(e.y)),'31','0');}});
  o.push('0','ENDSEC','0','EOF');return o.join('\r\n');}

/* ---------- dock de control ---------- */
/* ---------- dock de control ---------- */
const DOCK={nav:'orbit',sub:null,expl:0,mk:false};
const SECT={type:null,s:1,v:{x:0,y:0,z:0},box:null};
let secScene=null,secHover=null,secDrag=null,HOME=null;
let MARKS=lsGet('marks',[]);if(!Array.isArray(MARKS))MARKS=[];
function saveMarks(){lsSet('marks',MARKS);}
const MK={tool:'pen',col:'#e03131',strokes:[],cur:null,edit:null,saved:true};
const SEC_COL='#2f9bd6';
const sv=(b,f=1)=>`<svg viewBox="0 0 24 24" aria-hidden="true" fill="${f?'currentColor':'none'}" stroke="currentColor" stroke-width="${f?0:2}" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
const IC={
 home:sv('<path d="M12 3 2.5 11.2h2.9V20.5h5.2v-6h2.8v6h5.2v-9.3h2.9z"/>'),
 fit:sv('<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><path d="M12 7.2l2.2 2.6H9.8zM12 16.8l-2.2-2.6h4.4zM7.2 12l2.6-2.2v4.4zM16.8 12l-2.6 2.2V9.8z" fill="currentColor" stroke="none"/>',0),
 pan:sv('<path d="M12 1.8l3.3 3.8H13v5.3h5.4V8.6l3.8 3.4-3.8 3.4v-2.3H13v5.4h2.3L12 22.2l-3.3-3.7H11v-5.4H5.6v2.3L1.8 12l3.8-3.4v2.3H11V5.6H8.7z"/>'),
 zoom:sv('<circle cx="10" cy="10" r="6"/><path d="M14.6 14.6 20.5 20.5" stroke-width="3"/>',0),
 orbit:sv('<path d="M4.6 10.2a7.8 7.8 0 0 1 13.2-3.8M19.4 13.8a7.8 7.8 0 0 1-13.2 3.8"/><path d="M19.6 3.4v5.4h-5.4zM4.4 20.6v-5.4h5.4z" fill="currentColor" stroke="none"/>',0),
 fp:sv('<circle cx="12.6" cy="3.6" r="2.1"/><path d="M10.6 6.8h3.2l2.7 4.6-1.6.9-1.7-2.8-.7 4 2.8 3.4v5.3h-1.9v-4.6l-2.4-2.6-1 3.8-2.3 3.6-1.6-1 2-3.2 1-6.3-1.6 1.3v2.4H5.7V10z"/>'),
 meas:sv('<path d="M3 6.5h18M3 6.5l2.6-2.2M3 6.5l2.6 2.2M21 6.5l-2.6-2.2M21 6.5l-2.6 2.2"/><rect x="2.5" y="12" width="19" height="7.5" rx="1"/><path d="M6.5 12v3M10 12v2M13.5 12v3M17 12v2"/>',0),
 sec:sv('<path d="M12 2.8 20.2 7.2v9.6L12 21.2 3.8 16.8V7.2z"/><path d="M3.8 7.2 12 11.6l8.2-4.4M12 11.6v9.6"/><path d="M12 11.6l8.2-4.4v9.6L12 21.2z" fill="currentColor" stroke="none" opacity=".45"/>',0),
 expl:sv('<path d="M12 1.8 19.4 5.6 12 9.4 4.6 5.6z"/><path d="M3.9 8.3l7.1 3.7v9.6l-7.1-3.7zM20.1 8.3 13 12v9.6l7.1-3.7z"/>'),
 mk:sv('<path d="M15.6 3.4l5 5L9.4 19.6 3.6 21l1.4-5.8z"/><path d="M13.4 5.6l5 5"/>',0),
 px:sv('<path d="M6 3.5l6.5 3.2v13.8L6 17.3z" fill="currentColor" opacity=".55" stroke="none"/><path d="M6 3.5l6.5 3.2v13.8L6 17.3z"/><path d="M12.5 13.2H21M18.2 10.6l2.8 2.6-2.8 2.6"/>',0),
 py:sv('<path d="M11.5 6.7 18 3.5v13.8l-6.5 3.2z" fill="currentColor" opacity=".55" stroke="none"/><path d="M11.5 6.7 18 3.5v13.8l-6.5 3.2z"/><path d="M11.5 13.5 3.5 17M4.2 13.6 3.5 17l3.6.8"/>',0),
 pz:sv('<path d="M2.5 15.5 12 11.5l9.5 4L12 19.5z" fill="currentColor" opacity=".55" stroke="none"/><path d="M2.5 15.5 12 11.5l9.5 4L12 19.5z"/><path d="M12 13V2.8M9.2 5.6 12 2.8l2.8 2.8"/>',0),
 box:sv('<path d="M3.8 7.4 12 3l8.2 4.4v9.2L12 21l-8.2-4.4z"/><path d="M3.8 7.4 12 11.8l8.2-4.4M12 11.8V21"/><path d="M12 11.8l8.2-4.4v9.2L12 21z" fill="currentColor" stroke="none" opacity=".55"/>',0),
 dist:sv('<path d="M4 18 20 6"/><circle cx="4" cy="18" r="2.2" fill="currentColor"/><circle cx="20" cy="6" r="2.2" fill="currentColor"/>',0),
 area:sv('<path d="M4 7l9-3.5 7 7-4.5 9.5H6z" fill="currentColor" opacity=".3" stroke="none"/><path d="M4 7l9-3.5 7 7-4.5 9.5H6z"/>',0),
 cota:sv('<path d="M12 21 5.5 10.5h13z" fill="currentColor" opacity=".35" stroke="none"/><path d="M12 21 5.5 10.5h13zM3 10.5h18M12 3v4"/>',0),
 prof:sv('<path d="M2.5 17.5 7 12l4 3 4.5-7 6 5"/><path d="M2.5 21h19"/>',0),
 pen:sv('<path d="M3.5 19c3-4 5.5 2.5 9-2s5-9 8-11"/>',0),
 arrow:sv('<path d="M4 20 19 5M11 5h8v8"/>',0),
 rect:sv('<rect x="3.5" y="6" width="17" height="12" rx="1"/>',0),
 ell:sv('<ellipse cx="12" cy="12" rx="9" ry="6.5"/>',0),
 text:sv('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',0),
 undo:sv('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',0),
 save:sv('<path d="M5 3.5h11l3.5 3.5v13.5H5z"/><path d="M8 3.5v5h7v-5M8 20.5v-6h8v6"/>',0)
};
const DK=[['home','Inicio'],['fit','Ajustar'],['pan','Encuadre'],['zoom','Zoom'],['orbit','Órbita'],['fp','Primera persona'],['meas','Medir'],['sec','Sección'],['expl','Descomponer'],['mk','Marca de revisión']];
function flash(msg,ms=3800){hint(msg);clearTimeout(flash.h);flash.h=setTimeout(()=>hint(''),ms);}
function setNav(m){DOCK.nav=m;if(camMode==='fp')setCam('persp');if(m==='orbit'&&camMode==='plan')setCam('persp');
  const MB={orbit:THREE.MOUSE.ROTATE,pan:THREE.MOUSE.PAN,zoom:THREE.MOUSE.DOLLY};[ctlP,ctlO].forEach(c=>{c.mouseButtons.LEFT=MB[m];c.touches.ONE=m==='pan'?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE;});
  $('#c3d').style.cursor=m==='pan'?'move':m==='zoom'?'zoom-in':'';
  flash({orbit:'Órbita: arrastra para girar alrededor del modelo.',pan:'Encuadre: arrastra para desplazar la vista.',zoom:'Zoom: arrastra hacia arriba o abajo para acercar o alejar.'}[m],2600);}
function goHome(){if(camMode!=='persp')setCam('persp');camP.position.copy(HOME.p);ctlP.target.copy(HOME.t);ctlP.update();}
function fitSel(){if(camMode==='fp')setCam('persp');if(!selObj&&!ISEL){fit3d();return;}
  const bx=new THREE.Box3().setFromObject(ISEL?ISEL.mesh:selObj);if(bx.isEmpty()){fit3d();return;}const c=bx.getCenter(new THREE.Vector3()),L=Math.max(4,bx.getSize(new THREE.Vector3()).length());
  if(camMode==='persp'){const dir=camP.position.clone().sub(ctlP.target).normalize();ctlP.target.copy(c);camP.position.copy(c).addScaledVector(dir,L*1.3);ctlP.update();}
  else if(camMode==='iso'){ctlO.target.copy(c);planState.w=L*1.4;const d=400;camO.zoom=1;camO.position.set(c.x+d*.62,c.y+d*.6,c.z+d*.62);camO.lookAt(c);updOrtho();ctlO.update();}
  else{planState.cx=c.x;planState.cy=-c.z;planState.w=L*1.4;placePlanCam();}}
function secDomain(){return {x0:BB.x0,x1:BB.x1,y0:BB.y0,y1:BB.y1,z0:Math.floor(ZMIN)-3,z1:Math.ceil(ZMAX)+12};}
function secLim(a){return a==='x'?[BB.x0-20,BB.x1+20]:a==='y'?[BB.y0-20,BB.y1+20]:[ZMIN-10,ZMAX+40];}
function KP(a,v,s){const n=a==='x'?new THREE.Vector3(-1,0,0):a==='y'?new THREE.Vector3(0,0,1):new THREE.Vector3(0,-1,0);const c=a==='z'?v-ZR:v;return new THREE.Plane(n.multiplyScalar(s),c*s);}
function secPlanes(){if(!SECT.type)return[];if(SECT.type==='box'){const b=SECT.box;return [KP('x',b.x1,1),KP('x',b.x0,-1),KP('y',b.y1,1),KP('y',b.y0,-1),KP('z',b.z1,1),KP('z',b.z0,-1)];}return [KP(SECT.type,SECT.v[SECT.type],SECT.s)];}
function secClear(){if(!secScene)secScene=new THREE.Scene();while(secScene.children.length){const o=secScene.children[0];secScene.remove(o);o.traverse(q=>{if(q.geometry)q.geometry.dispose();if(q.material)q.material.dispose();});}}
function secQuad(a,v,r,hov){const c=a==='x'?[[v,r.y0,r.z0],[v,r.y1,r.z0],[v,r.y1,r.z1],[v,r.y0,r.z1]]:a==='y'?[[r.x0,v,r.z0],[r.x1,v,r.z0],[r.x1,v,r.z1],[r.x0,v,r.z1]]:[[r.x0,r.y0,v],[r.x1,r.y0,v],[r.x1,r.y1,v],[r.x0,r.y1,v]];
  const P=c.map(p=>V3(p[0],p[1],p[2]));
  secScene.add(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([P[0],P[1],P[2],P[0],P[2],P[3]]),new THREE.MeshBasicMaterial({color:SEC_COL,transparent:true,opacity:hov?0.26:0.12,side:THREE.DoubleSide,depthTest:false,depthWrite:false})));
  secScene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(P),new THREE.LineBasicMaterial({color:SEC_COL,transparent:true,opacity:hov?1:0.7,depthTest:false})));
  return P.reduce((s,p)=>s.add(p.clone().multiplyScalar(0.25)),new THREE.Vector3());}
function secHandle(a,pos,key){const hov=secHover===key;const g=new THREE.Group();const mat=new THREE.MeshBasicMaterial({color:hov?'#f59f00':SEC_COL,depthTest:false,transparent:true});
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,3.2,8),mat));const c1=new THREE.Mesh(new THREE.ConeGeometry(0.34,0.85,16),mat);c1.position.y=1.95;g.add(c1);const c2=new THREE.Mesh(new THREE.ConeGeometry(0.34,0.85,16),mat);c2.position.y=-1.95;c2.rotation.z=Math.PI;g.add(c2);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.45,16,12),mat));const px=new THREE.Mesh(new THREE.CylinderGeometry(0.9,0.9,5,8),new THREE.MeshBasicMaterial({visible:false}));g.add(px);
  if(a==='x')g.rotation.z=-Math.PI/2;else if(a==='y')g.rotation.x=Math.PI/2;g.position.copy(pos);g.userData.handle=true;g.traverse(o=>{o.renderOrder=10;o.userData.sec={key,a};});secScene.add(g);}
function buildSec(){secClear();if(!SECT.type)return;
  if(SECT.type==='box'){const b=SECT.box;[['x','x0'],['x','x1'],['y','y0'],['y','y1'],['z','z0'],['z','z1']].forEach(([a,k])=>secHandle(a,secQuad(a,b[k],b,secHover===k),k));return;}
  const a=SECT.type,v=SECT.v[a],r=secDomain(),c=secQuad(a,v,r,secHover===a);secHandle(a,c,a);
  const dir=(a==='x'?new THREE.Vector3(1,0,0):a==='y'?new THREE.Vector3(0,0,-1):new THREE.Vector3(0,1,0)).multiplyScalar(SECT.s);
  const p=c.clone().addScaledVector(a==='z'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),a==='z'?(r.x1-r.x0)*0.35:(r.z1-r.z0)*0.3);
  const ar=new THREE.ArrowHelper(dir,p,5,SEC_COL,1.6,1.1);ar.traverse(o=>{if(o.material){o.material.depthTest=false;o.material.transparent=true;o.material.opacity=0.8;}o.renderOrder=10;});secScene.add(ar);}
function secRead(a,v){return a==='x'?'E '+fmt(utmE(v),2):a==='y'?'N '+fmt(utmN(v),2):'Cota '+fmt(v,2)+' m';}
function setSection(t){if(!t)SECT.type=null;else if(t==='box'){SECT.type='box';SECT.box={...secDomain()};}else{const d=secDomain();SECT.type=t;SECT.s=1;SECT.v[t]=t==='z'?ZR+1:(d[t+'0']+d[t+'1'])/2;}
  secHover=null;applyCut();buildSec();dockSync();
  if(t)flash(t==='box'?'Caja de sección: arrastra las flechas de cada cara para recortar. Doble clic en una flecha devuelve esa cara a su borde.':'Arrastra la flecha para mover el plano. Doble clic en la flecha invierte el lado recortado.');}
function setSecVal(h,v){const L=secLim(h.a);v=Math.max(L[0],Math.min(L[1],v));
  if(SECT.type==='box'){const b=SECT.box;if(h.key.endsWith('0'))v=Math.min(v,b[h.a+'1']-1);else v=Math.max(v,b[h.a+'0']+1);b[h.key]=v;}else SECT.v[h.a]=v;
  applyCut();buildSec();$('#readout').innerHTML=`<b>${SECT.type==='box'?'Caja de sección':'Plano '+h.a.toUpperCase()}</b> · ${secRead(h.a,v)}`;}
function secHit(ev){if(!secScene||!secScene.children.length)return null;setMouse(ev);ray.setFromCamera(mouse,cam);const hs=[];secScene.children.forEach(g=>{if(g.userData.handle)g.traverse(o=>{if(o.isMesh)hs.push(o);});});
  const h=ray.intersectObjects(hs,false)[0];return h?{key:h.object.userData.sec.key,a:h.object.userData.sec.a,p:h.point.clone()}:null;}
function renderSec(){if(!secScene||!secScene.children.length)return;
  secScene.children.forEach(g=>{if(!g.userData.handle)return;const k=cam.isOrthographicCamera?(cam.right-cam.left)/cam.zoom*0.008:cam.position.distanceTo(g.position)*0.016;g.scale.setScalar(Math.max(0.3,k));});
  const cp=renderer.clippingPlanes;renderer.clippingPlanes=[];renderer.autoClear=false;renderer.render(secScene,cam);renderer.autoClear=true;renderer.clippingPlanes=cp;}
/* descomponer: los grupos con userData.level se separan verticalmente */
function applyExpl(k){DOCK.expl=k;IMESH.forEach(me=>{me.position.y=Math.max(0,me.userData.level-1)*k*10;});MESHES.forEach(me=>{me.position.y=(me.userData.lv||0)*k*6;});if(MSEL)MSEL.meshes.forEach(m=>m.position.y=0);if(ISEL){const lv=IMESH.find(me=>me.userData.ifc.includes(ISEL.ei));if(lv)ISEL.mesh.position.y=lv.position.y;}}
/* marca de revisión */
function mkResize(){const c=$('#mk'),v=$('#v3d'),r=devicePixelRatio||1;c.width=Math.max(1,v.clientWidth*r);c.height=Math.max(1,v.clientHeight*r);mkDraw();}
function mkDraw(){const c=$('#mk'),x=c.getContext('2d'),r=devicePixelRatio||1,W=c.width/r,H=c.height/r;x.setTransform(r,0,0,r,0,0);x.clearRect(0,0,W,H);if(!DOCK.mk)return;
  const all=MK.cur?MK.strokes.concat([MK.cur]):MK.strokes;
  for(const s of all){x.strokeStyle=s.c;x.fillStyle=s.c;x.lineWidth=3;x.lineCap='round';x.lineJoin='round';const P=q=>[q[0]*W,q[1]*H];
    if(s.t==='pen'){x.beginPath();s.p.forEach((q,i)=>{const [a,b]=P(q);i?x.lineTo(a,b):x.moveTo(a,b);});x.stroke();}
    else if(s.t==='text'){const [a,b]=P(s.a);x.font='600 17px Barlow, system-ui, sans-serif';x.lineWidth=4;x.strokeStyle='rgba(255,255,255,.9)';x.strokeText(s.s,a,b);x.fillText(s.s,a,b);}
    else{const [a,b]=P(s.a),[c2,d]=P(s.b);
      if(s.t==='arrow'){x.beginPath();x.moveTo(a,b);x.lineTo(c2,d);x.stroke();const g=Math.atan2(d-b,c2-a),L=15;x.beginPath();x.moveTo(c2,d);x.lineTo(c2-L*Math.cos(g-0.45),d-L*Math.sin(g-0.45));x.lineTo(c2-L*Math.cos(g+0.45),d-L*Math.sin(g+0.45));x.closePath();x.fill();}
      else if(s.t==='rect')x.strokeRect(Math.min(a,c2),Math.min(b,d),Math.abs(c2-a),Math.abs(d-b));
      else if(s.t==='ell'){x.beginPath();x.ellipse((a+c2)/2,(b+d)/2,Math.max(0.5,Math.abs(c2-a)/2),Math.max(0.5,Math.abs(d-b)/2),0,0,Math.PI*2);x.stroke();}}}}
function mkText(px,py,q){const old=$('#mk-in');if(old)old.remove();const i=document.createElement('input');i.id='mk-in';i.className='mk-in';i.placeholder='Escribe y pulsa Enter';i.style.left=px+'px';i.style.top=(py-16)+'px';i.style.color=MK.col;$('#v3d').appendChild(i);setTimeout(()=>i.focus(),0);
  let done=false;const commit=ok=>{if(done)return;done=true;const t=i.value.trim();i.remove();if(ok&&t){MK.strokes.push({t:'text',c:MK.col,a:q,s:t});MK.saved=false;mkDraw();renderSub();}};
  i.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter')commit(true);if(e.key==='Escape')commit(false);};i.onblur=()=>commit(true);}
function enterMarkup(edit){DOCK.mk=true;MK.strokes=edit?JSON.parse(JSON.stringify(edit.strokes)):[];MK.edit=edit||null;MK.saved=true;MK.cur=null;$('#mk').classList.add('on');mkResize();DOCK.sub='mk';dockSync();
  flash('Marca de revisión: la vista queda fija mientras dibujas. «Guardar» la deja en Medidas junto con la vista.');}
function exitMarkup(){if(!DOCK.mk)return;if(MK.strokes.length&&!MK.saved)toast('Marca de revisión sin guardar descartada');
  DOCK.mk=false;MK.strokes=[];MK.cur=null;MK.edit=null;const i=$('#mk-in');if(i)i.remove();$('#mk').classList.remove('on');mkDraw();if(DOCK.sub==='mk')DOCK.sub=null;dockSync();}
function camState(){const s={mode:camMode};if(camMode==='persp'){s.p=camP.position.toArray();s.t=ctlP.target.toArray();}else if(camMode==='iso'){s.p=camO.position.toArray();s.t=ctlO.target.toArray();s.w=planState.w;s.z=camO.zoom;}else if(camMode==='plan'){s.cx=planState.cx;s.cy=planState.cy;s.w=planState.w;s.n=northMode;}else s.fp={pos:fp.pos.slice(),yaw:fp.yaw,pitch:fp.pitch};return s;}
function setCamState(s){if(s.mode==='fp'){fp.pos=s.fp.pos.slice();setCam('fp');fp.yaw=s.fp.yaw;fp.pitch=s.fp.pitch;hint('');return;}
  if(s.mode==='plan')northMode=s.n||northMode;setCam(s.mode);
  if(s.mode==='persp'){camP.position.fromArray(s.p);ctlP.target.fromArray(s.t);ctlP.update();}
  else if(s.mode==='iso'){ctlO.target.fromArray(s.t);camO.position.fromArray(s.p);planState.w=s.w;camO.zoom=s.z||1;updOrtho();camO.lookAt(ctlO.target);ctlO.update();}
  else{planState.cx=s.cx;planState.cy=s.cy;planState.w=s.w;placePlanCam();}}
const VNAME={persp:'perspectiva',iso:'isométrica',plan:'planta',fp:'primera persona'};
function markMeasure(m){return {type:'mark',id:m.id,title:'Marca de revisión '+m.n,sub:`${m.strokes.length} trazo${m.strokes.length===1?'':'s'} · vista ${VNAME[m.cam.mode]||''} · clic para abrir`};}
function mkSave(){if(!MK.strokes.length){toast('Dibuja algo antes de guardar');return;}let m=MK.edit;
  if(m){m.strokes=JSON.parse(JSON.stringify(MK.strokes));m.cam=camState();const i=measures.findIndex(x=>x.id===m.id);if(i>=0)measures[i]=markMeasure(m);else measures.push(markMeasure(m));}
  else{const n=MARKS.reduce((a,x)=>Math.max(a,x.n||0),0)+1;m={id:'mk'+Date.now(),n,cam:camState(),strokes:JSON.parse(JSON.stringify(MK.strokes)),date:new Date().toISOString()};MARKS.push(m);MK.edit=m;measures.push(markMeasure(m));}
  saveMarks();MK.saved=true;renderMeasures();renderSub();toast('Marca de revisión guardada en Medidas');}
function openMark(id){const m=MARKS.find(x=>x.id===id);if(!m)return;if(!active3d)setTab('3d');if(DOCK.mk){MK.saved=true;exitMarkup();}if(tool!=='sel')setTool('sel');setCamState(m.cam);enterMarkup(m);}
function openSub(k){if(DOCK.mk&&k!=='mk')exitMarkup();DOCK.sub=k;dockSync();}
function dockAct(id){if(DOCK.mk&&['home','fit','pan','zoom','orbit','fp','meas'].includes(id))exitMarkup();
  switch(id){case 'home':goHome();break;case 'fit':fitSel();break;case 'pan':case 'zoom':case 'orbit':setNav(id);break;case 'fp':setCam(camMode==='fp'?'persp':'fp');break;
    case 'meas':if(DOCK.sub==='meas'){DOCK.sub=null;setTool('sel');}else{DOCK.sub='meas';if(tool==='sel')setTool('dist');}break;
    case 'sec':openSub(DOCK.sub==='sec'?null:'sec');break;case 'expl':openSub(DOCK.sub==='expl'?null:'expl');break;
    case 'mk':if(DOCK.mk)exitMarkup();else{if(tool!=='sel')setTool('sel');enterMarkup();}break;}
  dockSync();}
function subAct(k,a){if(k==='sec'){if(a==='clear')setSection(null);else setSection(SECT.type===a?null:a);}
  else if(k==='meas')setTool(a);else if(k==='expl'){if(a==='reset'){applyExpl(0);dockSync();}}
  else if(k==='mk'){if(a.startsWith('c:')){MK.col=a.slice(2);renderSub();}else if(a==='undo'){MK.strokes.pop();MK.saved=false;mkDraw();renderSub();}else if(a==='save')mkSave();else if(a==='clear'){MK.strokes=[];MK.saved=false;mkDraw();renderSub();}else{MK.tool=a;renderSub();}}}
function renderSub(){const s=$('#dsub'),k=DOCK.sub;s.hidden=!k;if(!k){s.innerHTML='';return;}
  const B=(id,ic,lb,on)=>`<button class="dk sm" data-sb="${id}" aria-pressed="${on?'true':'false'}">${ic}<span>${lb}</span></button>`;
  const CLR=(id,lb,en)=>`<span class="dsep"></span><button class="dk-clear" data-sb="${id}"${en?'':' disabled'}>${lb}</button>`;let h='';
  if(k==='sec')h=B('x',IC.px,'Plano X',SECT.type==='x')+B('y',IC.py,'Plano Y',SECT.type==='y')+B('z',IC.pz,'Plano Z',SECT.type==='z')+B('box',IC.box,'Box',SECT.type==='box')+CLR('clear','BORRAR',!!SECT.type);
  else if(k==='meas')h=B('dist',IC.dist,'Distancia',tool==='dist')+B('area',IC.area,'Área',tool==='area')+B('cota',IC.cota,'Cota',tool==='cota')+B('prof',IC.prof,'Perfil',tool==='prof');
  else if(k==='expl')h=`<div class="dk-range"><label for="dk-ex">Separación</label><input type="range" id="dk-ex" min="0" max="100" step="1" value="${Math.round(DOCK.expl*100)}"><output id="dk-exo">${Math.round(DOCK.expl*100)} %</output></div>`+CLR('reset','RESTABLECER',DOCK.expl>0);
  else if(k==='mk')h=B('pen',IC.pen,'Lápiz',MK.tool==='pen')+B('arrow',IC.arrow,'Flecha',MK.tool==='arrow')+B('rect',IC.rect,'Rectángulo',MK.tool==='rect')+B('ell',IC.ell,'Círculo',MK.tool==='ell')+B('text',IC.text,'Texto',MK.tool==='text')
    +'<span class="dsep"></span><div class="dk-sws" role="group" aria-label="Color">'+[['#e03131','Rojo'],['#f59f00','Ámbar'],['#1c7ed6','Azul'],['#212529','Negro']].map(([c,n])=>`<button class="dk-sw" data-sb="c:${c}" style="--c:${c}" aria-pressed="${MK.col===c}" title="${n}" aria-label="${n}"></button>`).join('')+'</div>'
    +'<span class="dsep"></span>'+B('undo',IC.undo,'Deshacer',false)+B('save',IC.save,MK.saved&&MK.edit?'Guardada':'Guardar',false)+CLR('clear','BORRAR',MK.strokes.length>0);
  s.innerHTML=h;s.setAttribute('aria-label',{sec:'Sección',meas:'Medir',expl:'Descomponer',mk:'Marca de revisión'}[k]);
  s.querySelectorAll('[data-sb]').forEach(b=>b.onclick=()=>subAct(k,b.dataset.sb));
  const ex=$('#dk-ex');if(ex){ex.oninput=()=>{applyExpl(+ex.value/100);$('#dk-exo').textContent=ex.value+' %';const r=s.querySelector('[data-sb="reset"]');if(r)r.disabled=!+ex.value;};ex.onchange=()=>dockSync();}
  if(k==='mk'){const u=s.querySelector('[data-sb="undo"]');if(u)u.disabled=!MK.strokes.length;}}
function dockSync(){if(!$('#dmain'))return;const set=(id,on)=>{const b=$('#dk-'+id);if(b)b.setAttribute('aria-pressed',on?'true':'false');};const nav=!DOCK.mk&&camMode!=='fp';
  set('home',false);set('fit',false);set('orbit',nav&&camMode!=='plan'&&DOCK.nav==='orbit');set('pan',nav&&(camMode==='plan'||DOCK.nav==='pan'));set('zoom',nav&&camMode!=='plan'&&DOCK.nav==='zoom');
  set('fp',camMode==='fp');set('meas',tool!=='sel'||DOCK.sub==='meas');set('sec',!!SECT.type||DOCK.sub==='sec');set('expl',DOCK.expl>0||DOCK.sub==='expl');set('mk',DOCK.mk);renderSub();}
function initDock(){HOME={p:camP.position.clone(),t:ctlP.target.clone()};secScene=new THREE.Scene();
  $('#dmain').innerHTML=DK.map(([id,l])=>`<button class="dk" id="dk-${id}" data-dk="${id}" aria-pressed="false" title="${l}">${IC[id]}<span>${l}</span></button>`).join('');
  $$('#dmain .dk').forEach(b=>b.onclick=()=>dockAct(b.dataset.dk));
  const v=$('#v3d'),cv=$('#c3d'),mk=$('#mk');
  v.addEventListener('pointerdown',ev=>{if(DOCK.mk||ev.button!==0||ev.target!==cv)return;const h=secHit(ev);if(!h)return;ev.stopPropagation();ev.preventDefault();
    const d=h.a==='x'?new THREE.Vector3(1,0,0):h.a==='y'?new THREE.Vector3(0,0,-1):new THREE.Vector3(0,1,0);const start=SECT.type==='box'?SECT.box[h.key]:SECT.v[h.a];secDrag=h;cv.style.cursor='grabbing';
    const mv=e=>{setMouse(e);ray.setFromCamera(mouse,cam);const o=ray.ray.origin,u=ray.ray.direction,w=h.p.clone().sub(o);const b=d.dot(u),dd=d.dot(w),e2=u.dot(w),den=1-b*b;if(den<1e-4)return;setSecVal(h,start+(b*e2-dd)/den);};
    const up=()=>{window.removeEventListener('pointermove',mv);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);secDrag=null;cv.style.cursor=DOCK.nav==='pan'?'move':DOCK.nav==='zoom'?'zoom-in':'';};
    window.addEventListener('pointermove',mv);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);},true);
  v.addEventListener('dblclick',ev=>{if(ev.target!==cv)return;const h=secHit(ev);if(!h)return;ev.stopPropagation();if(SECT.type==='box')SECT.box[h.key]=secDomain()[h.key];else SECT.s=-SECT.s;applyCut();buildSec();},true);
  cv.addEventListener('pointermove',ev=>{if(secDrag||DOCK.mk||!SECT.type)return;const h=secHit(ev);const k=h?h.key:null;if(k!==secHover){secHover=k;buildSec();cv.style.cursor=k?'grab':(DOCK.nav==='pan'?'move':DOCK.nav==='zoom'?'zoom-in':'');}});
  const q=ev=>{const r=mk.getBoundingClientRect();return [(ev.clientX-r.left)/r.width,(ev.clientY-r.top)/r.height];};
  mk.addEventListener('pointerdown',ev=>{if(!DOCK.mk||ev.button!==0)return;const p=q(ev);if(MK.tool==='text'){ev.preventDefault();const r=mk.getBoundingClientRect();mkText(ev.clientX-r.left,ev.clientY-r.top,p);return;}
    mk.setPointerCapture(ev.pointerId);MK.cur=MK.tool==='pen'?{t:'pen',c:MK.col,p:[p]}:{t:MK.tool,c:MK.col,a:p,b:p};mkDraw();});
  mk.addEventListener('pointermove',ev=>{if(!MK.cur)return;const p=q(ev);if(MK.cur.t==='pen')MK.cur.p.push(p);else MK.cur.b=p;mkDraw();});
  const end=()=>{if(!MK.cur)return;const c=MK.cur;MK.cur=null;const big=c.t==='pen'?c.p.length>1:Math.hypot(c.b[0]-c.a[0],c.b[1]-c.a[1])>0.004;if(big){MK.strokes.push(c);MK.saved=false;}mkDraw();renderSub();};
  mk.addEventListener('pointerup',end);mk.addEventListener('pointercancel',end);
  window.addEventListener('keydown',ev=>{if(!DOCK.mk||ev.target.matches('input,textarea,select'))return;if(ev.key==='Escape'){ev.stopImmediatePropagation();exitMarkup();}else if((ev.ctrlKey||ev.metaKey)&&ev.key.toLowerCase()==='z'){ev.preventDefault();subAct('mk','undo');}},true);
  new ResizeObserver(()=>{if(DOCK.mk)mkResize();}).observe(v);
  if(MARKS.length){MARKS.forEach(m=>measures.push(markMeasure(m)));renderMeasures();}
  dockSync();}
/* ---------- navegador (desde proyecto.json) ---------- */
const ICO={cube:'<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 1.5 14 5v6l-6 3.5L2 11V5z M2 5l6 3.5L14 5 M8 8.5V14.5"/></svg>',plan:'<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="2" width="12" height="12"/><path d="M2 8h6V2"/></svg>',prof:'<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1.5 12 5 8l3 2 3.5-5 3 3"/><path d="M1.5 14.5h13"/></svg>',sheet:'<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="1.5" y="3" width="13" height="10"/><path d="M10.5 9.5h4M10.5 3v10"/></svg>',warn:'<svg class="ico" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M8 2 15 14H1z"/><path d="M8 6.5v3.5M8 11.8v.4"/></svg>'};
const NAV=P.nav||[];
function findNav(t){for(const s of NAV)for(const it of s.items)if(it.t===t&&it.a)return it;return null;}
function tabIdOf(a){if(!a)return '';return a.type==='plan'?a.id:a.type==='tab'&&a.mod==='coord'?'coord':a.type==='prof'?'prof-'+a.title.replace(/\W+/g,'_'):a.type==='sheet'?'sh-'+a.id:a.type==='doc'||a.type==='tab'?a.id:'';}
function runAct(a){if(!a)return;
  if(a.lv){Object.entries(a.lv).forEach(([k,v])=>{if(k in LV)setLayer(k,v);});}
  if(a.op){Object.entries(a.op).forEach(([k,v])=>{if(k in LOP)setLayerOp(k,v);});lsSet('lop',LOP);}
  if(a.lv||a.op)renderLayers();
  switch(a.type){
    case 'fit':setTab('3d');setCam(a.mode||'persp');fit3d();break;
    case 'fp':setTab('3d');if(a.reset)fp.pos=null;setCam('fp');break;
    case 'cam':setTab('3d');setCamState(a.cam);break;
    case 'focus':setTab('3d');setCam(a.mode||'persp');focusWorld(a.x,a.y,a.w||100,a.z);break;
    case 'clash':gotoClash(CLASH.find(c=>c.id===a.id));break;
    case 'plan':openPlanTab(a.id,a.title,a);break;
    case 'prof':openProfileTab(a.title,a.a,a.b);break;
    case 'sheet':openSheet(a.id);break;
    case 'doc':openTab({id:a.id,title:(P.docs[a.id]||{}).title||a.id,type:'doc'});break;
    case 'tab':if(a.mod==='mt'&&!HAS_MT)break;openTab({id:a.id,title:a.title,type:a.mod});break;}}
function buildNav(){
  const ic=(a,it)=>it&&it.ic==='warn'?ICO.warn:!a?ICO.sheet:['fit','fp','cam','focus'].includes(a.type)?ICO.cube:a.type==='plan'?ICO.plan:a.type==='prof'?ICO.prof:ICO.sheet;
  let h='';NAV.forEach((s,si)=>{h+=`<h2>${esc(s.h)}</h2><ul>`+(s.items.length?s.items.map((it,ii)=>it.dis||!it.a?`<li><button disabled style="color:var(--ink-3);cursor:default">${esc(it.t)}</button></li>`:`<li><button data-nv="${si}.${ii}" data-tab="${esc(tabIdOf(it.a))}">${ic(it.a,it)}${esc(it.t)}${it.s?`<small>${esc(it.s)}</small>`:''}</button></li>`).join(''):`<li><button disabled style="color:var(--ink-3);cursor:default">Sin elementos</button></li>`)+'</ul>';});
  $('#nv-dyn').innerHTML=h;
  $$('#nv-dyn button[data-nv]').forEach(b=>b.onclick=()=>{const [si,ii]=b.dataset.nv.split('.').map(Number);runAct(NAV[si].items[ii].a);navAuto();});
  const U=P.ui||{};
  $('#stages').innerHTML=(U.stages||[]).map(s=>`<li class="${s.now?'now':''}">${esc(s.t)}</li>`).join('');
  $('#qa').innerHTML=(U.qa||[]).map(q=>`<li class="${esc(q.s)}"><b>${esc(q.t)}</b>${esc(q.d)}</li>`).join('');
  $('#h-stages').hidden=!(U.stages||[]).length;$('#h-qa').hidden=!(U.qa||[]).length;}
function navAuto(){if(matchMedia('(max-width:900px)').matches){$('#nav').hidden=true;$('#btn-nav').setAttribute('aria-pressed','false');}}
function fillUI(){const U=P.ui||{};document.title=P.title||(PRJ.nombre+' · Modelo BIM');
  $('.brand b').textContent=U.brand||PRJ.nombre;$('.brand span').textContent=U.brandSub||PRJ.ubicacion;
  $('.stage-chip span').innerHTML=U.chip||esc(PRJ.etapa);
  if(U.help)$('#help .box').innerHTML=U.help;}
/* API para scripts de documentos */
const API={P,fz,fmt,esc,$,$$,lsGet,lsSet,toast,runAct,setLayer,renderLayers,openTab,setTab,openPlanTab,openSheet,hz,utmE,utmN};

/* ---------- inicio ---------- */
function init(){
  fillUI();
  buildFloors();initScene();if(P.fitOnStart)fit3d();LAYERS.forEach(l=>{if(LOP[l.id]<1)setLayerOp(l.id,LOP[l.id]);});initPointer();initCutUI();initDock();
  if(P.escalas)$('#sel-scale').innerHTML=P.escalas.map(s=>`<option value="${s}">1:${s}</option>`).join('');
  {const sh=$('#sel-h');if(sh){sh.innerHTML=PLAN_H.map(p=>`<option value="${p[0]}">${esc(p[1])}</option>`).join('');sh.onchange=e=>{if(!cur2||cur2.type!=='plan')return;cur2.h=+e.target.value;const c=host2.vb;render2(false);host2.vb=c;host2.setVB();toast('Plano de corte a '+fz(cur2.h)+' m');};}}
  if(P.norteDef==='np'){northMode='np';$$('#seg-north3 button,#seg-north button').forEach(b=>{const v=b.dataset.n3||b.dataset.north;b.setAttribute('aria-pressed',v==='np');if(v==='real'&&P.sinNorteReal){b.disabled=true;b.title='Norte real: falta el dato de orientación del predio';}});}buildNav();renderLayers();showInfo(null);renderTabs();
  COTAS.forEach(c=>addCota([c.x,c.y,c.z],c.n,c.id,true));
  $$('#seg-cam button').forEach(b=>b.onclick=()=>{setCam(b.dataset.cam);if(b.dataset.cam==='plan')fit3d();});
  $$('#seg-tool button').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
  $$('#seg-north3 button').forEach(b=>b.onclick=()=>{northMode=b.dataset.n3;$$('#seg-north3 button').forEach(x=>x.setAttribute('aria-pressed',x===b));if(camMode!=='plan'){setCam('plan');fit3d();}else placePlanCam();updNorthArrow();});
  $$('#seg-tool2 button').forEach(b=>b.onclick=()=>{tool2=b.dataset.tool2;m2=null;drawM2();$$('#seg-tool2 button').forEach(x=>x.setAttribute('aria-pressed',x===b));host2&&host2.svg.classList.toggle('meas',tool2!=='nav');});
  $('#sel-scale').onchange=e=>{if(!cur2||cur2.type!=='plan')return;const vb=host2.vb,c=cur2.T.inv(vb[0]+vb[2]/2,vb[1]+vb[3]/2),old=cur2.scale;cur2.scale=+e.target.value;render2(false);const p=cur2.T.f(c[0],c[1]);const w=vb[2]*old/cur2.scale,h=vb[3]*old/cur2.scale;host2.vb=[p[0]-w/2,p[1]-h/2,w,h];host2.setVB();};
  $$('#seg-north button').forEach(b=>b.onclick=()=>{if(!cur2||cur2.type!=='plan')return;const vb=host2.vb,c=cur2.T.inv(vb[0]+vb[2]/2,vb[1]+vb[3]/2);cur2.north=b.dataset.north;syncNorthBtns(cur2.north);northMode=cur2.north;render2(false);const p=cur2.T.f(c[0],c[1]);host2.vb=[p[0]-vb[2]/2,p[1]-vb[3]/2,vb[2],vb[3]];host2.setVB();});
  $('#btn-fit').onclick=fit3d;$('#btn-fit2').onclick=()=>render2(true);
  $('#btn-3d-from2d').onclick=()=>{const t=cur2;let c,w;if(t.type==='plan'){const vb=host2.vb;c=t.T.inv(vb[0]+vb[2]/2,vb[1]+vb[3]/2);w=vb[2]/t.T.k;northMode=t.north;}else{c=[(t.pd.a[0]+t.pd.b[0])/2,(t.pd.a[1]+t.pd.b[1])/2];w=t.pd.L*1.2;}
    setTab('3d');setCam(t.type==='plan'?'plan':'persp');focusWorld(c[0],c[1],w);};
  $('#btn-dl').onclick=e=>dlMenu(e.currentTarget);$('#btn-dl2').onclick=e=>dlMenu(e.currentTarget);
  document.addEventListener('pointerdown',e=>{const m=$('#dlmenu');if(!m.hidden&&!m.contains(e.target)&&!e.target.closest('#btn-dl,#btn-dl2'))m.hidden=true;});
  $('#btn-nav').onclick=()=>{const n=$('#nav');n.hidden=!n.hidden;$('#btn-nav').setAttribute('aria-pressed',!n.hidden);setTimeout(resize3d,0);};
  $('#btn-side').onclick=()=>{const n=$('#side');n.hidden=!n.hidden;$('#btn-side').setAttribute('aria-pressed',!n.hidden);setTimeout(resize3d,0);};
  $$('.stabs button').forEach(b=>b.onclick=()=>openSide(b.dataset.st));
  const wireHelp=()=>{const x=$('#help-x');if(x)x.onclick=()=>$('#help').hidden=true;};wireHelp();
  $('#btn-help').onclick=()=>{$('#help').hidden=false;const x=$('#help-x');if(x)x.focus();};$('#help').onclick=e=>{if(e.target.id==='help')$('#help').hidden=true;};
  if(P.ar&&P.ar.url){const b=$('#btn-ar');b.hidden=false;const d=$('#ardlg');
    $('#ar-qr').innerHTML=P.ar.qr||'';$('#ar-url').value=P.ar.url;$('#ar-open').href=P.ar.url;
    b.onclick=()=>{d.hidden=false;$('#ar-x').focus();};$('#ar-x').onclick=()=>d.hidden=true;d.onclick=e=>{if(e.target===d)d.hidden=true;};
    $('#ar-copy').onclick=async()=>{const i=$('#ar-url');try{await navigator.clipboard.writeText(P.ar.url);toast('Enlace copiado');}catch(e){i.select();try{document.execCommand('copy');toast('Enlace copiado');}catch(e2){toast('Selecciona el enlace y cópialo');}}};}
  $('#btn-theme').onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;r.dataset.theme=dark?'light':'dark';lsSet('theme',r.dataset.theme);applyBg();};
  $('#pr-x').onclick=closeProfilePanel;$('#pr-csv').onclick=()=>prCur&&save(FN('perfil')+'.csv',profileCSV(prCur.pd));
  $('#pr-open').onclick=()=>{if(!prCur)return;const {a,b}=prCur.pd;openProfileTab(prCur.title,a,b);};
  if(matchMedia('(max-width:900px)').matches){$('#nav').hidden=true;$('#btn-nav').setAttribute('aria-pressed','false');$('#side').hidden=true;$('#btn-side').setAttribute('aria-pressed','false');}
  new ResizeObserver(()=>{if(active3d)resize3d();}).observe($('#v3d'));
  if(!G)$('#readout').textContent='Pasa el cursor por el modelo para leer la cota.';
  resize3d();$('#loading').remove();requestAnimationFrame(loop);
  try{if(window.claude&&window.claude.use)window.claude.use('downloads').then(d=>{DLCAP=d||null;$('#pr-csv').hidden=!DLCAP||!prCur;},()=>{});}catch(e){}
  window.__BIM={P,LV,setLayer,runAct,setTab,TABS,get activeTab(){return activeTab;},camState,version:BIM_VERSION};
}
{const t=lsGet('theme',null);if(t)document.documentElement.dataset.theme=t;}
init();
}
boot();
})();
