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
