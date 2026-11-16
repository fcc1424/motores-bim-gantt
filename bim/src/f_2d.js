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

