(()=>{const sto=IFC_STO;return {PRJ, ZR, RNP, CONV, BB, TODAY,
 fp:[PRS[7].x,PRS[7].y,Math.atan2(150,-60)],
 cruces:[...LO.map(P=>({n:'L.O. existente',c:'vio',P})),
  ...(D.L.solera||[]).map(f=>({n:'Solera',c:'k',P:P2(f)})),
  ...(D.L.cerco||[]).map(f=>({n:'Cerco',c:'k',P:P2(f)})),
  ...(D.L.pandereta||[]).map(f=>({n:'Pandereta',c:'k',P:P2(f)})),
  ...(D.L.canal_borde||[]).map(f=>({n:'Borde canal',c:'blu',P:P2(f)})),
  ...(IOL.ifc_muros||[]).map(sg=>({n:'Muro IFC',c:'red',P:[sg[0],sg[1]],l:'ifc_muros'})),
  ...(D.L.eje||[]).map(f=>({n:'Eje',c:'tea',P:P2(f)}))],
 niveles:[{z:sto[1][1],s:'NPT '+fmt(sto[1][1])+' (IFC)',l:'ifc_losas'}],
 pr:PRS.map(p=>({n:p.n,E:p.E,N:p.N,z:p.z,x:p.x,y:p.y})),
 secs:SECS, ibb:IBB, zmm:[ZMIN,ZMAX],
 mtz:MTZ, mtsrc:{plano:D.src.plano,fecha:D.src.fecha,ifc:IFC.meta.file}
};})()
