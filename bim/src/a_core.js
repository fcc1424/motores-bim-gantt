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
