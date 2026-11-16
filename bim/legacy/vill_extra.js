(()=>{
 const R3=v=>Math.round(v*1000)/1000;
 const ser=o=>{if(o==null)return o;if(ArrayBuffer.isView(o))return Array.from(o,R3);if(Array.isArray(o))return o.map(ser);if(typeof o==='number')return R3(o);if(typeof o==='object'){const r={};for(const k in o)r[k]=ser(o[k]);return r;}return o;};
 const q=s=>document.querySelector(s);
 const dom={title:document.title,brand:q('.brand b')?.textContent||'',brandSub:q('.brand span')?.textContent||'',chip:q('.stage-chip span')?.innerHTML||'',help:q('#help .box')?.innerHTML||'',
  stages:[...document.querySelectorAll('#stages li')].map(li=>({t:li.textContent,now:li.classList.contains('now')})),
  qa:[...document.querySelectorAll('#qa li')].map(li=>({s:li.className,t:li.querySelector('b')?.textContent||'',d:[...li.childNodes].slice(1).map(n=>n.textContent).join('')}))};
 const allLv=v=>{const o={};LAYERS.forEach(l=>o[l.id]=v(l));return o;};
 const viewAllAct=(k)=>{const ks=k.split(',');const lv=allLv(l=>!l.m||ks.includes(l.m)||!MEP(l.m));const op={};
   LAYERS.forEach(l=>{if(l.m==='arq')op[l.id]=0.12;else if(l.m==='est')op[l.id]=0.25;else if(MEP(l.m))op[l.id]=1;});
   ['arq|Entorno','arq|Puertas y ventanas','arq|Letreros','arq|Barandas','est|Armaduras','est|Conexiones','est|Perfiles Metalcon','co|clash'].forEach(id=>lv[id]=false);
   if(ks.includes('apf')){LAYERS.forEach(l=>{if(l.m==='est')op[l.id]=0.1;else if(l.m==='arq')op[l.id]=0.07;});['est|Viguetas','arq|Cubierta','arq|Techumbre'].forEach(id=>{if(id in lv)lv[id]=false;});}
   const b=ks.length>1?[BB.x0,BB.y0,0,BB.x1,BB.y1,0]:MD[k].meta.bbox;return {type:'focus',mode:'persp',x:(b[0]+b[3])/2,y:(b[1]+b[4])/2,w:55,z:k==='ext'?5:2,lv,op};};
 const coordAct={type:'fit',mode:'persp',lv:allLv(l=>l.id!=='arq|Entorno'),op:{'arq|General':0.18,'arq|Cubierta':0.18,'arq|Entorno':0.18,'arq|Puertas y ventanas':0.5}};
 const v3=[['Modelo federado',{type:'fit',mode:'persp'}],['Isométrica del edificio',{type:'fit',mode:'iso'}],['Planta 3D',{type:'fit',mode:'plan'}],['Recorrido desde la calle',{type:'fp',reset:1}],
  ['Estructura sola',{type:'fit',mode:'persp',lv:allLv(l=>l.m==='est'||!l.m)}],['Aguas lluvias',viewAllAct('all')],['Extracción de baños',viewAllAct('ext')],['Sanitario',viewAllAct('apf,as')],
  ['Solo segundo piso',{type:'focus',mode:'persp',x:BB.cx,y:BB.cy,w:60,z:5,lv:allLv(l=>!l.id.startsWith('lv|')||l.id==='lv|1')}],['Vista de coordinación',coordAct]];
 const pl=[['plan-p1','Planta primer piso',{h:1.2}],['plan-p2','Planta segundo piso',{h:5.0}],['plan-p3','Planta bajo cubierta',{h:9.0}],['plan-fu','Planta de fundaciones',{h:-0.5}],['plan-e1','Estructura primer piso',{h:1.2,mono:'est'}],['plan-l1','Aguas lluvias cubierta',{h:7.0,mono:'all'}],['plan-l2','Aguas lluvias primer piso',{h:1.2,mono:'all'}],['plan-x1','Extracción segundo piso',{h:5.0,mono:'ext'}],['plan-x2','Extracción cubierta',{h:7.0,mono:'ext'}],['plan-s1','Sanitario primer piso',{h:1.2,mono:'apf,as'}],['plan-s2','Sanitario segundo piso',{h:5.0,mono:'apf,as'}]];
 const clashItems=[...CLASH.filter(c=>c.s==='int'&&!c.ma).slice(0,3).map(c=>['C'+c.id+' · '+MD.est.els[c.e].n+' con '+MD.arq.els[c.a].c.toLowerCase(),c.id]),
  ...CLASH.filter(c=>MEP(c.ma)&&c.s==='int'&&c.mb==='est').filter((c,i,a)=>a.findIndex(x=>x.ma===c.ma)===i||i<4).slice(0,4).map(c=>{const [[da,ia],[db,ib]]=pairOf(c);return ['C'+c.id+' · '+da.els[ia].n.replace('Bajada AA.LL.','Bajada')+' con '+db.els[ib].c.toLowerCase(),c.id];})];
 const nav=[{h:'Vistas 3D',items:v3.map(([t,a])=>({t,a}))},
  {h:'Plantas',items:pl.map(([id,t,o])=>({t,s:fz(o.h),a:{type:'plan',id,title:t,scale:200,...o}}))},
  {h:'Cortes',items:SECS.map(s=>({t:'Corte '+s.n+'-'+s.n,s:s.d,a:{type:'prof',title:'Corte '+s.n+'-'+s.n,a:s.a,b:s.b}}))},
  {h:'Coordinación',items:[{t:'Tablero de coordinación',a:{type:'tab',mod:'coord',id:'coord',title:'Coordinación'}},{t:'Interferencias en planta',a:{type:'plan',id:'plan-coo',title:'Interferencias en planta',scale:200,h:1.2,allClash:true,mono:'xx'}},{t:'Interferencias en 3D',a:coordAct},...clashItems.map(([t,id])=>({t,a:{type:'clash',id},ic:'warn'}))]},
  {h:'Láminas',items:SHEETS.map(s=>({t:s.name,a:{type:'sheet',id:s.id}}))}];
 return {PRJ:{nombre:'Edificio comercial Villarrica Centro',codigo:'VC',ubicacion:'Camilo Henríquez, Villarrica · Región de La Araucanía',mandante:'',etapa:'Etapa 2 · coordinación arquitectura y estructura',sistema:'Local del modelo de arquitectura, metros',E0:0,N0:0,conv:0},
  dom,card:defaultInfo(),TODAY,BB,
  models:MODELS,mepc:MEPC,dsh:DSH,sev:SEV,cstn:CSTN,levels:LEVELS,planH:PLAN_H,
  layers:LAYERS.map(l=>({id:l.id,name:l.name,grp:l.grp,c:l.c,m:l.m,cat:l.cat,noop:l.noop,off:l.off,st:STY(l.id),stg:STY(l.id+'|g'),ord:ORDER(l.id)})),
  grids:C.grids,clash:CLASH.map(c=>{const o={...c};delete o.lbl;return o;}),secs:SECS,storeys:C.storeys,lvA:C.lvA,lvE:C.lvE,
  cutsecs:CUTSECS.map(s=>({n:s.n,a:s.a,b:s.b,label:s.label})),refs:REFS,
  sheets:SHEETS.map(s=>({id:s.id,name:s.name,dl:ser(s.fn())})),nav};
})()
