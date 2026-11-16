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
