// Inserted right before `function init(){` in a legacy viewer (Walmart / Piedra Roja lineage).
// Exposes a function that serializes the built scene into plain data.
window.__EXPORT = async function(){
  const out={layers:LAYERS.map(l=>({id:l.id,name:l.name,grp:l.grp,c:l.c,off:!!l.off})),meshes:[],lines:[],inst:[],labels:[],snap:[],plan:{},sheets:[],errors:[]};
  const W=v=>[v.x,-v.z,v.y+ZR];
  const colHex=m=>m&&m.color?'#'+m.color.getHexString():'#888888';
  const infoOf=o=>{const i=o.userData&&o.userData.info;if(!i)return null;return {t:i.title||'',k:i.kind||'',r:(i.rows||[]).map(r=>[String(r[0]),String(r[1])]),n:i.note||'',ly:i.layer||''};};
  const geoArrays=(g,mw)=>{g=g.index?g.toNonIndexed():g;const p=g.attributes.position;const n=p.count;const a=new Float32Array(n*3);const v=new THREE.Vector3();
    for(let i=0;i<n;i++){v.fromBufferAttribute(p,i);if(mw)v.applyMatrix4(mw);const w=W(v);a[i*3]=w[0];a[i*3+1]=w[1];a[i*3+2]=w[2];}
    let c=null;if(g.attributes.color){const ca=g.attributes.color;c=new Float32Array(n*3);for(let i=0;i<n;i++){c[i*3]=ca.getX(i);c[i*3+1]=ca.getY(i);c[i*3+2]=ca.getZ(i);}}
    return {p:Array.from(a,x=>Math.round(x*1000)/1000),c:c?Array.from(c,x=>Math.round(x*255)):null};};
  const lid=o=>{let q=o;while(q&&!(q.parent&&q.parent===scene))q=q.parent;return q?q.name:null;};
  scene.updateMatrixWorld(true);
  const seen=new Set();
  Object.keys(GROUPS).forEach(id=>{const g=GROUPS[id];g.updateMatrixWorld(true);
    g.traverse(o=>{if(o===g||seen.has(o))return;seen.add(o);
      try{
      if(o.isInstancedMesh){const base=geoArrays(o.geometry,null);const n=o.count,M=[];const m=new THREE.Matrix4();
        for(let i=0;i<n;i++){o.getMatrixAt(i,m);M.push(...m.elements.map(x=>Math.round(x*1000)/1000));}
        out.inst.push({l:id,geo:base.p,c:colHex(o.material),op:o.material.opacity,tr:!!o.material.transparent,m:M,flags:Object.keys(o.userData||{})});return;}
      if(o.isMesh){if(o.userData.terrain||o.userData.ifc||o.userData.mt)return;const a=geoArrays(o.geometry,o.matrixWorld);
        out.meshes.push({l:id,p:a.p,vc:a.c,c:colHex(o.material),op:o.material.opacity,tr:!!o.material.transparent,info:infoOf(o),lv:o.userData.level??null,vis:o.visible});return;}
      if(o.isLine||o.isLineSegments){const p=o.geometry.attributes.position;const v=new THREE.Vector3();const pts=[];for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);const w=W(v);pts.push(Math.round(w[0]*1000)/1000,Math.round(w[1]*1000)/1000,Math.round(w[2]*1000)/1000);}
        out.lines.push({l:id,p:pts,seg:!!o.isLineSegments,c:colHex(o.material),op:o.material.opacity,dash:!!o.material.isLineDashedMaterial,info:infoOf(o)});return;}
      }catch(e){out.errors.push(id+': '+e.message);}
    });});
  LBL.forEach(l=>{const w=W(l.v);out.labels.push({x:w[0],y:w[1],z:w[2],s:l.d.textContent,cls:(l.d.className||'').replace(/\blbl\b/,'').trim(),l:l.lyr||null});});
  SNAPV.forEach(s=>out.snap.push([s.x,s.y,s.z,s.lyr]));
  // plan display lists per layer at three scales
  for(const s of [250,500,1000,2000]){out.plan[s]={};LAYERS.forEach(l=>{try{const o={scale:s,layers:{}};o.layers[l.id]=true;out.plan[s][l.id]=planDL(o);}catch(e){out.errors.push('plan '+l.id+': '+e.message);}});}
  SHEETS.forEach(sh=>{try{out.sheets.push({id:sh.id,name:sh.name,dl:sh.fn()});}catch(e){out.errors.push('sheet '+sh.id+': '+e.message);}});
  out.terrain={x0:G.x0,y0:G.y0,dx:G.dx,nx:G.nx,ny:G.ny,z:Array.from(GZ,v=>isFinite(v)?Math.round(v*1000)/1000:null)};
  try{const PP=(typeof PTS!=='undefined')?PTS:((typeof SURV!=='undefined')?SURV:[]);out.puntos=PP.map(p=>[p.x,p.y,p.z,String(p.n)]);}catch(e){out.puntos=[];}
  try{if(typeof IMESH!=='undefined'&&IMESH.length){out.ifc={meshes:IMESH.map(me=>{const a=geoArrays(me.geometry,me.matrixWorld);return {l:me.parent.name,p:a.p,ei:Array.from(me.userData.ifc),lv:me.userData.level,cI:me.userData.cI,mk:me.userData.mk};}),
     els:IEL.map((e,i)=>{const f=ifcInfo(i);return {t:f.title,k:f.kind,r:f.rows.map(r=>[String(r[0]),String(r[1])]),bb:e.b||null,lv:e.s,g:e.g};}),pal:(typeof PAL!=='undefined')?PAL:null,sto:IFC_STO};}}catch(e){out.errors.push('ifc: '+e.message);}
  out.cam={mode:camMode,state:camState()};
  return out;
};
window.__EXPAPI = ()=>({setCam,fit3d,focusWorld,camState,setLayer:(id,v)=>setLayer(id,v),LV,TABS,openTab,setTab,get cur2(){return cur2;},get activeTab(){return activeTab;}});

window.__EVAL = function(src){return eval(src);};
