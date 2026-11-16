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
