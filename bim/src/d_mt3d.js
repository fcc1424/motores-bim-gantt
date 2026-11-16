/* ---------- módulo MT: volúmenes 3D y corte del terreno ---------- */
const MTMESH=[];let ZFS=null,GHOST=null;
const CUT_HIDE=(HAS_MT&&MTD.cutHide)||['cercos','verde'];
function applyTerrainCut(){if(!TER||!HAS_MT)return;TER.mesh.material.userData.mask.uMode.value=LV.tcut?1:0;TER.mesh.userData.maskTest=LV.tcut?{R:PR_ALL,inside:false}:null;
  hideCutInstances();syncMTVis();}
function hideCutInstances(){if(!HAS_MT)return;const M=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
  INSTS.forEach(im=>{const b=im.userData.base;for(let i=0;i<im.count;i++){M.fromArray(b,i*16);M.decompose(p,q,s);if(inProj(p.x,-p.z))s.setScalar(0.0001);M.compose(p,q,s);im.setMatrixAt(i,M);}im.instanceMatrix.needsUpdate=true;});
  CUT_HIDE.forEach(gid=>GROUPS[gid]&&GROUPS[gid].children.forEach(o=>{if(!o.geometry)return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;const cx=(b.min.x+b.max.x)/2,cy=-(b.min.z+b.max.z)/2;o.userData.cutHide=inProj(cx,cy);o.visible=!o.userData.cutHide&&!HIDDEN.has(o);}));}
function gval(A,x,y){const fx=x-MT.x0,fy=y-MT.y0,i=Math.floor(fx),j=Math.floor(fy),tx=fx-i,ty=fy-j;let s=0,w=0;
  [[i,j,(1-tx)*(1-ty)],[i+1,j,tx*(1-ty)],[i,j+1,(1-tx)*ty],[i+1,j+1,tx*ty]].forEach(([a,b,k])=>{if(a<0||b<0||a>=MT.nx||b>=MT.ny)return;const q=MTNN[b*MT.nx+a];if(q===0xFFFFFFFF)return;const v=A[q];if(isFinite(v)){s+=v*(k+1e-4);w+=k+1e-4;}});return w?s/w:null;}
function gridSurf(A,lift,ch,colorFn,mat){const nx=MT.nx,ny=MT.ny,pos=new Float32Array(nx*ny*3),col=colorFn?new Float32Array(nx*ny*3):null,ok=new Uint8Array(nx*ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i,q=MTNN[k];if(q===0xFFFFFFFF||!isFinite(A[q]))continue;ok[k]=1;const v=V3(MT.x0+i,MT.y0+j,A[q]+lift);pos[k*3]=v.x;pos[k*3+1]=v.y;pos[k*3+2]=v.z;if(col){const c=colorFn(k,q);col[k*3]=c.r;col[k*3+1]=c.g;col[k*3+2]=c.b;}}
  const idx=[];for(let j=0;j<ny-1;j++)for(let i=0;i<nx-1;i++){const a=j*nx+i,b=a+1,c=a+nx,d=c+1;if(ok[a]&&ok[b]&&ok[c]&&ok[d])idx.push(a,c,b,b,c,d);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));if(col)g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
  return new THREE.Mesh(g,maskMat(mat,ch,-1));}
function skirt(R,zTop,zBot,lift){const out=[];R.forEach(r=>{for(let e=0;e<r.length;e++){const a=r[e],b=r[(e+1)%r.length],L=dist2(a,b),n=Math.max(1,Math.ceil(L/0.5));let prev=null;
    for(let k=0;k<=n;k++){const t=k/n,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;const zt=zTop(x,y),zb=zBot(x,y);const cur=(zt!=null&&zb!=null)?[x,y,zt+lift,zb]:null;
      if(prev&&cur){const lo1=Math.min(prev[2],prev[3]),hi1=Math.max(prev[2],prev[3]),lo2=Math.min(cur[2],cur[3]),hi2=Math.max(cur[2],cur[3]);if(hi1-lo1>0.01||hi2-lo2>0.01){const Q=[[prev[0],prev[1],lo1],[cur[0],cur[1],lo2],[cur[0],cur[1],hi2],[prev[0],prev[1],hi1]].map(p=>V3(p[0],p[1],p[2]));out.push(Q[0],Q[1],Q[2],Q[0],Q[2],Q[3]);}}prev=cur;}}});
  const g=new THREE.BufferGeometry().setFromPoints(out);g.computeVertexNormals();return g;}
function buildMT(){if(!HAS_MT)return;MTMESH.forEach(m=>{m.parent&&m.parent.remove(m);m.geometry.dispose();});MTMESH.length=0;
  const add=(m,parent,kind,lyr)=>{m.userData.mt=kind;if(lyr)m.userData.lyr=lyr;parent.add(m);PICK.push(m);MTMESH.push(m);return m;};
  const cFill=new THREE.Color('#c47a35'),cCut=new THREE.Color('#9c8b6e');
  const zf=(x,y)=>gval(MT.ZF,x,y),zt=(x,y)=>hz(x,y),zd=(x,y)=>gval(MT.ZD,x,y);
  ZFS=add(gridSurf(MT.ZF,-0.04,0,(k,q)=>isFinite(MT.ZT[k])&&MT.ZF[q]>MT.ZT[k]?cFill:cCut,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2})),scene,'rasante');ZFS.userData.maskTest={R:PR_ALL,inside:true};
  const fillG=skirt(PR_ALL,(x,y)=>{const a=zf(x,y),b=zt(x,y);return a!=null&&b!=null&&a>b?a-0.04:null;},(x,y)=>{const a=zf(x,y),b=zt(x,y);return a!=null&&b!=null&&a>b?b:null;},0);
  add(new THREE.Mesh(fillG,new THREE.MeshLambertMaterial({color:'#c47a35',side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:2,polygonOffsetUnits:2})),grp('mt_relleno'),'relleno');
  const cutG=skirt(PR_ALL,(x,y)=>{const a=zf(x,y),b=zt(x,y);return a!=null&&b!=null&&b>a?b:null;},(x,y)=>{const a=zf(x,y),b=zt(x,y);return a!=null&&b!=null&&b>a?a-0.04:null;},0);
  const cutW=add(new THREE.Mesh(cutG,new THREE.MeshLambertMaterial({color:'#9c8b6e',side:THREE.DoubleSide})),scene,'corte');cutW.userData.tcutOnly=true;
  if(!GHOST){GHOST=new THREE.Mesh(TER.mesh.geometry,maskMat(new THREE.MeshLambertMaterial({color:'#c0392b',transparent:true,opacity:0.35,depthWrite:false,side:THREE.DoubleSide}),0,-1));GHOST.userData.maskTest={R:PR_ALL,inside:true};GHOST.userData.mt='corte';grp('mt_corte').add(GHOST);PICK.push(GHOST);}
  [[1,PR_BLD,'#9a9da1'],[2,PR_PARK,'#5e6164']].forEach(([ch,R,c])=>{const top=gridSurf(MT.ZD,-0.015,ch,null,new THREE.MeshLambertMaterial({color:c,side:THREE.DoubleSide}));top.userData.maskTest={R,inside:true};add(top,grp('mt_plat'),'plataforma');
    const sg=skirt(R,(x,y)=>{const a=zd(x,y);return a!=null?a-0.015:null;},(x,y)=>{const a=zf(x,y);return a!=null?a-0.04:null;},0);add(new THREE.Mesh(sg,new THREE.MeshLambertMaterial({color:c,side:THREE.DoubleSide})),grp('mt_plat'),'plataforma');});
  syncMTVis();
  LAYERS.forEach(l=>{if(l.id.startsWith('mt_')&&LOP[l.id]<1)setLayerOp(l.id,LOP[l.id]);});}
function syncMTVis(){MTMESH.forEach(m=>{if(m===ZFS)m.visible=!!(LV.tcut||LV.mt_relleno);else if(m.userData.tcutOnly)m.visible=!!LV.tcut;});}
function mtInfo(x,y,kind){const r=mtCalc(),q=mtAt(x,y);const rows=[];if(q){rows.push(['Cota terreno',fmt(q.zt)+' m'],['Nivel terminado',fmt(q.zd)+' m'],['Fondo de plataforma',fmt(q.zf)+' m'],['Espesor de plataforma',fmt(q.zd-q.zf)+' m'],[q.zf>=q.zt?'Altura de relleno':'Profundidad de corte',fmt(Math.abs(q.zf-q.zt))+' m'],['Zona',MTZ[q.c]||'—']);}
  rows.push(['Relleno total',fmt(r.R,0)+' m³'],['Corte total',fmt(r.C,0)+' m³'],['Saldo (relleno − corte)',fmt(r.R-r.C,0)+' m³']);
  return {kind:'movimiento de tierras',title:kind==='rasante'?'Fondo de plataformas':kind==='plataforma'?'Plataforma (nivel terminado a fondo)':kind==='corte'?'Volumen de corte':'Volumen de relleno',rows,note:'Corte y relleno medidos hasta el fondo de las plataformas. Detalle en «Movimiento de tierras».'};}
