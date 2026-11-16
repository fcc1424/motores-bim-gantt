
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
