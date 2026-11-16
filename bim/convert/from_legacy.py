"""Convierte la exportación de un visor antiguo (linaje Walmart / Piedra Roja) en los datos del motor BIM.
Uso: python3 from_legacy.py export.json visor.html carpeta_salida id_proyecto
Salida: proyecto.json, escena.b64.txt, plan.b64.txt, laminas.b64.txt (+ mt.json, img/*)"""
import sys, json, re, os, base64, pathlib
import numpy as np
from packio import write_pack

R2 = lambda v: round(v, 2)


def quant(P, bb):
    """Cuantiza posiciones Nx3 a u16 sobre bbox."""
    x0, y0, z0, x1, y1, z1 = bb
    s = np.array([x1 - x0, y1 - y0, z1 - z0], dtype=np.float64)
    s[s == 0] = 1
    q = np.round((P - np.array([x0, y0, z0])) / s * 65535)
    return np.clip(q, 0, 65535).astype(np.uint16).ravel()


def raw_js_value(html, name):
    i = html.find('window.' + name + '=')
    if i < 0:
        return None
    i += len('window.' + name + '=')
    v, _ = json.JSONDecoder().raw_decode(html, i)
    return v


def lv_diff(prev, cur):
    return {k: v for k, v in cur.items() if prev.get(k) != v}


def round_dl(o):
    if isinstance(o, float):
        return round(o, 2)
    if isinstance(o, list):
        return [round_dl(x) for x in o]
    if isinstance(o, dict):
        return {k: round_dl(v) for k, v in o.items()}
    return o


def main(exp_path, html_path, out, pid, fix_path=None):
    FX = json.load(open(fix_path)) if fix_path else {}
    E = json.load(open(exp_path))
    html = open(html_path).read()
    X = E.get('extra', {})
    dom = E['dom']
    os.makedirs(out, exist_ok=True)
    os.makedirs(out + '/img', exist_ok=True)
    PRJ = X['PRJ']
    ZR = X['ZR']

    # ---------- escena ----------
    allP = []
    for m in E['meshes']: allP.append(np.array(m['p']).reshape(-1, 3))
    for m in E['lines']: allP.append(np.array(m['p']).reshape(-1, 3))
    ifc = E.get('ifc')
    if ifc:
        for m in ifc['meshes']: allP.append(np.array(m['p']).reshape(-1, 3))
    A = np.concatenate(allP)
    bb = [float(A[:, 0].min()) - 1, float(A[:, 1].min()) - 1, float(A[:, 2].min()) - 1,
          float(A[:, 0].max()) + 1, float(A[:, 1].max()) + 1, float(A[:, 2].max()) + 1]
    infos, imap = [], {}

    def info_idx(i):
        if not i: return -1
        k = json.dumps(i, ensure_ascii=False, sort_keys=True)
        if k not in imap:
            imap[k] = len(infos)
            infos.append({kk: vv for kk, vv in i.items() if vv not in ('', None, [])})
        return imap[k]

    meshes, mp, mc, v0, c0 = [], [], [], 0, 0
    for m in E['meshes']:
        P = np.array(m['p']).reshape(-1, 3)
        n = len(P)
        h = {'l': m['l'], 'v0': v0, 'n': n, 'c': m['c'], 'op': R2(m['op']), 'i': info_idx(m['info'])}
        if m['tr']: h['tr'] = 1
        if m.get('lv') is not None: h['lv'] = m['lv']
        if not m.get('vis', True): h['hid'] = 1
        if m.get('vc'):
            h['vc'] = c0
            mc.append(np.array(m['vc'], dtype=np.uint8))
            c0 += n * 3
        mp.append(P); v0 += n
        meshes.append(h)
    lines, lp, v0 = [], [], 0
    for m in E['lines']:
        P = np.array(m['p']).reshape(-1, 3)
        h = {'l': m['l'], 'v0': v0, 'n': len(P), 'c': m['c'], 'i': info_idx(m['info'])}
        if m['op'] < 1: h['op'] = R2(m['op'])
        if m['seg']: h['seg'] = 1
        if m['dash']: h['dash'] = 1
        lp.append(P); v0 += len(P)
        lines.append(h)
    inst, ig, im, g0, m0 = [], [], [], 0, 0
    for m in E['inst']:
        G = np.array(m['geo'], dtype=np.float32)
        M = np.array(m['m'], dtype=np.float32)
        h = {'l': m['l'], 'g0': g0, 'ng': len(G) // 3, 'm0': m0, 'n': len(M) // 16, 'c': m['c'], 'f': m['flags']}
        if m['op'] < 1: h['op'] = R2(m['op'])
        ig.append(G); im.append(M); g0 += len(G) // 3; m0 += len(M) // 16
        inst.append(h)
    arrays = {
        'mp': quant(np.concatenate(mp), bb) if mp else np.zeros(0, np.uint16),
        'lp': quant(np.concatenate(lp), bb) if lp else np.zeros(0, np.uint16),
        'ig': np.concatenate(ig) if ig else np.zeros(0, np.float32),
        'im': np.concatenate(im) if im else np.zeros(0, np.float32),
    }
    if mc: arrays['mc'] = np.concatenate(mc)
    # terreno
    T = E['terrain']
    z = np.array([np.nan if v is None else v for v in T['z']], dtype=np.float64)
    zb = float(np.floor(np.nanmin(z)))
    tz = np.where(np.isnan(z), -32768, np.round((z - zb) * 100)).astype(np.int16)
    arrays['tz'] = tz
    scene = {'v': 1, 'bb': bb, 'zr': ZR, 'meshes': meshes, 'lines': lines, 'inst': inst, 'infos': infos,
             'terrain': {'x0': T['x0'], 'y0': T['y0'], 'dx': T['dx'], 'nx': T['nx'], 'ny': T['ny'], 'zb': zb}}
    if ifc:
        xm, xp, xe, v0 = [], [], [], 0
        for m in ifc['meshes']:
            P = np.array(m['p']).reshape(-1, 3)
            xm.append({'l': m['l'], 'v0': v0, 'n': len(P), 'lv': m['lv'], 'cI': [R2(c) for c in m['cI']], 'mk': m['mk']})
            xp.append(P); xe.append(np.array(m['ei'], dtype=np.uint32)); v0 += len(P)
        arrays['xp'] = quant(np.concatenate(xp), bb)
        e = np.concatenate(xe)
        arrays['xe'] = e.astype(np.uint16) if e.max() < 65535 else e
        els = [{'t': x['t'], 'k': x['k'], 'r': x['r'], 'bb': x['bb'], 'lv': x['lv'], 'g': x['g']} for x in ifc['els']]
        scene['ifc'] = {'meshes': xm, 'els': els, 'sto': ifc['sto']}
    rs, ts = write_pack(out + '/escena.b64.txt', scene, arrays)
    print('escena', rs, ts)

    # ---------- planta (listas de dibujo por capa, con máscara de escalas) ----------
    scales = ['250', '500', '1000', '2000']
    plan = {}
    for lid in {k for s in scales for k in E['plan'][s]}:
        seen, items = {}, []
        for bi, s in enumerate(scales):
            for it in E['plan'][s].get(lid, []):
                it = round_dl(it)
                k = json.dumps(it, sort_keys=True, ensure_ascii=False)
                if k in seen:
                    items[seen[k]][0] |= 1 << bi
                else:
                    seen[k] = len(items); items.append([1 << bi, it])
        if items: plan[lid] = items
    rs, ts = write_pack(out + '/plan.b64.txt', {'scales': [int(s) for s in scales], 'layers': plan})
    print('plan', rs, ts)
    sheets = [{'id': s['id'], 'name': s['name'], 'dl': round_dl(s['dl'])} for s in E['sheets']]
    rs, ts = write_pack(out + '/laminas.b64.txt', {'date': X.get('TODAY'), 'sheets': sheets})
    print('laminas', rs, ts)

    # ---------- navegación ----------
    LV0 = {l['id']: not l['off'] for l in E['layers']}
    if 'tcut' in LV0: LV0['tcut'] = False
    docs, nav = {}, []
    prev = dict(LV0)
    for sec in dom['navSections']:
        items = []
        for it in dom['navStates'].get(sec['ul'], []):
            st = it.get('state')
            if not st or it.get('dis') or 'error' in st:
                if it.get('dis'): items.append({'t': it['t'], 'dis': 1})
                continue
            a = None
            t = it['t']
            if st['type'] == '3d':
                d = lv_diff(prev, st['lv']); prev = st['lv']
                cam = st['cam']
                if re.search(r'primera persona|Recorrido', t, re.I): a = {'type': 'fp'}
                elif re.match(r'Modelo completo', t): a = {'type': 'fit', 'mode': 'persp'}
                elif re.match(r'Isom', t): a = {'type': 'fit', 'mode': 'iso'}
                elif re.search(r'Planta 3D|en planta', t): a = {'type': 'fit', 'mode': 'plan'}
                else: a = {'type': 'cam', 'cam': cam}
                if d: a['lv'] = d
            elif st['type'] == 'plan':
                a = {'type': 'plan', 'id': st['id'], 'title': st['title'], 'scale': st['scale']}
                for k in ('focus', 'fw', 'force', 'fitPoly', 'north'):
                    if k in st: a[k] = st[k]
            elif st['type'] == 'prof':
                a = {'type': 'prof', 'title': st['title'], 'a': st['pd']['a'], 'b': st['pd']['b']}
            elif st['type'] == 'sheet':
                a = {'type': 'sheet', 'id': st['sheet']}
            elif st['type'] == 'mt':
                a = {'type': 'tab', 'id': 'mt', 'title': st['title'], 'mod': 'mt'}
            else:
                docs[st['id']] = {'title': st['title'], 'html': st.get('html', '')}
                a = {'type': 'doc', 'id': st['id']}
            o = {'t': t, 'a': a}
            if it.get('small'): o['s'] = it['small']
            items.append(o)
        nav.append({'h': sec['h'], 'items': items})
    # imágenes incrustadas en documentos → archivos
    nimg = 0
    for k, d in docs.items():
        def rep(m):
            nonlocal nimg
            mime, data = m.group(1), m.group(2)
            ext = 'jpg' if 'jpeg' in mime else mime.split('/')[1]
            nimg += 1
            fn = f'img/{k}_{nimg}.{ext}'
            open(out + '/' + fn, 'wb').write(base64.b64decode(data))
            return 'src="data/' + fn + '"'
        d['html'] = re.sub(r'src="data:(image/[a-z]+);base64,([^"]+)"', rep, d['html'])

    P = {
        'id': pid, 'title': dom['title'], 'nombre': PRJ['nombre'], 'codigo': PRJ['codigo'],
        'ubicacion': PRJ.get('ubicacion', ''), 'mandante': PRJ.get('mandante', ''), 'etapa': PRJ.get('etapa', ''),
        'sistema': PRJ.get('sistema', ''), 'E0': PRJ['E0'], 'N0': PRJ['N0'], 'conv': PRJ['conv'], 'rnp': X.get('RNP', 0),
        'zr': ZR, 'bbox': X['BB'], 'zmm': X.get('zmm'),
        'ui': {'brand': dom['brand'], 'brandSub': dom['brandSub'], 'chip': dom['chip'], 'help': dom['help'],
               'card': dom['card'], 'stages': dom['stages'], 'qa': dom['qa']},
        'layers': E['layers'], 'nav': nav, 'docs': docs,
        'sheets': [{'id': s['id'], 'name': s['name']} for s in E['sheets']],
        'puntos': E.get('puntos', []), 'pr': X.get('pr', []), 'fp': X.get('fp'),
        'perfil': {'cruces': [{'n': c['n'], 'c': c['c'], 'P': [[R2(p[0]), R2(p[1])] for p in c['P']], **({'l': c['l']} if c.get('l') else {})} for c in X.get('cruces', [])],
                   'niveles': X.get('niveles', []), 'zonas': X.get('zonas', [])},
        'secs': X.get('secs', []), 'labels': E['labels'],
        'snap': [[R2(s[0]), R2(s[1]), R2(s[2]), s[3]] for s in E['snap']],
        'focus': {'ifc': X['ibb']} if X.get('ibb') else {},
        'files': {'escena': 'data/escena.b64.txt', 'plan': 'data/plan.b64.txt', 'laminas': 'data/laminas.b64.txt'},
        'modules': {},
    }
    if ifc and ifc.get('pal'):
        P['materiales'] = {'pal': ifc['pal'], 'modo': 'render'}
    mt = raw_js_value(html, '__MT')
    if mt:
        mt['zonas'] = X.get('mtz'); mt['src'] = X.get('mtsrc')
        json.dump(mt, open(out + '/mt.json', 'w'), ensure_ascii=False, separators=(',', ':'))
        P['modules']['mt'] = {'file': 'data/mt.json'}
        P['files']['mt'] = 'data/mt.json'
    for k in ('fit', 'instInfo', 'imiv'):
        if X.get(k): P[k] = X[k]
    for k in ('planOrder', 'fp', 'focus', 'lsKey'):
        if k in FX: P[k] = FX[k]
    for k, reps in FX.get('docs', {}).items():
        for a, b in reps:
            assert a in P['docs'][k]['html'], (k, a[:60])
            P['docs'][k]['html'] = P['docs'][k]['html'].replace(a, b)
    for k, js in FX.get('docjs', {}).items():
        P['docs'][k]['js'] = js
    json.dump(P, open(out + '/proyecto.json', 'w'), ensure_ascii=False, separators=(',', ':'))
    print('proyecto', os.path.getsize(out + '/proyecto.json'), 'docs', list(docs), 'imgs', nimg)


if __name__ == '__main__':
    main(*sys.argv[1:6])
