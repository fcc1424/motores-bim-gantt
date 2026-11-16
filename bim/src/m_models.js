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
