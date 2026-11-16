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
