(()=>{const gx1=G.x0+(G.nx-1)*G.dx,gy1=G.y0+(G.ny-1)*G.dx;let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;LOTE.forEach(p=>{x0=Math.min(x0,p[0]);x1=Math.max(x1,p[0]);y0=Math.min(y0,p[1]);y1=Math.max(y1,p[1]);});
 const s=D.ps[0].p,b=D.ps[1].p;
 return {PRJ:{nombre:'Strip Center Piedra Roja II',codigo:'PR2',ubicacion:'Av. Chicureo, Colina · Región Metropolitana',mandante:'Inmobiliaria Brick',etapa:'Etapa 1 · levantamiento y acceso existente',sistema:'UTM WGS84 huso 19 S',E0,N0,conv:CONV},
 ZR,RNP,CONV,TODAY,BB:{x0:G.x0,x1:gx1,y0:G.y0,y1:gy1},fit:{x0,x1,y0,y1,k:1.6},
 fp:[s[0],s[1],Math.atan2(b[1]-s[1],b[0]-s[0])],
 cruces:[{n:'Deslinde lote',c:'red',P:LOTE.concat([LOTE[0]])},{n:'Límite BNUP',c:'blu',P:BNUP.concat([BNUP[0]]).slice(0,2)},{n:'L.O. CIP',c:'vio',P:LO_ALL},
  ...D.L.solera.map(f=>({n:'Solera',c:'k',P:P2(f)})),...D.L.cerco.map(f=>({n:'Cerco',c:'k',P:P2(f)})),
  ...D.L.muro.filter(f=>f.length>20).map(f=>({n:'Muro canal',c:'blu',P:P2(f)})),
  ...D.GL.calzada_proy.map(f=>({n:'Borde calzada acceso',c:'k',P:P2(f)})),{n:'Eje acceso',c:'tea',P:EJE_ACC},
  ...EJES_AV.map(e=>({n:e.n===29?'Eje bandejón':'Eje calzada',c:'g',P:e.p}))],
 imiv:{S_COM,S_GYMU,p:{...IMIV}},niveles:[],zonas:[],secs:D.secs||[],zmm:[ZMIN,ZMAX],
 instInfo:{trees:D.trees.map((t,i)=>{const z=hz(t[0],t[1]);return {t:'Árbol N° '+(i+1),k:'vegetación existente',r:[['Diámetro de copa',fmt(t[2]*2,1)+' m'],['Cota de terreno',fmt(z)+' m'],['Este',fmt(utmE(t[0]),3)],['Norte',fmt(utmN(t[1]),3)],['Dentro del lote ABCD',pip([t[0],t[1]],LOTE)?'Sí':'No']],ly:'TOP_ARBOLES'};}),
  rev3:REV3.map((p,i)=>({t:'Cota '+fmt(p.z,3)+' m',k:'punto topográfico REV 3',r:[['Punto',String(i+1)],['Este',fmt(utmE(p.x),3)],['Norte',fmt(utmN(p.y),3)],['Dentro del lote ABCD',pip([p.x,p.y],LOTE)?'Sí':'No'],['Terreno modelado',fmt(hz(p.x,p.y),3)+' m']],ly:'TOP_PTS · PLA_TOP REV 3'}))}
 };})()
