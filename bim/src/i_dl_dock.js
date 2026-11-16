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
