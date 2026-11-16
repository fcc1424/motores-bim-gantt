"""Exporta una escena BIM empaquetada a GLB para realidad aumentada.
Uso: python3 to_glb.py carpeta_proyecto config_ar.json carpeta_salida

La configuración define el origen (punto que se apoya en el suelo) y las variantes:
  {"origen": [x, y],            # coordenadas locales del proyecto (m)
   "variantes": {"obra": {"capas": [...], "escala": 1, "terreno": false},
                 "maqueta": {"capas": [...], "escala": 0.005, "terreno": true,
                             "recorte": [x0, y0, x1, y1], "paso": 2}}}
Las coordenadas glTF siguen al visor: X = Este, Y = cota, -Z = Norte.
El modelo se traslada para que el origen quede en (0, zmin, 0): así la base del modelo
coincide con el suelo cuando el visor AR lo apoya sobre el piso."""
import sys, json, struct, pathlib
import numpy as np
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from packio import read_pack


def hex2rgb(c):
    c = c.lstrip('#')
    return [int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def srgb2lin(v):
    v = np.asarray(v, float)
    return np.where(v <= 0.04045, v / 12.92, ((v + 0.055) / 1.055) ** 2.4)


class GLB:
    def __init__(self):
        self.bin = bytearray(); self.views = []; self.acc = []; self.mats = {}; self.matl = []; self.prims = []

    def _view(self, b, target):
        while len(self.bin) % 4: self.bin += b'\0'
        self.views.append({'buffer': 0, 'byteOffset': len(self.bin), 'byteLength': len(b), 'target': target})
        self.bin += b
        return len(self.views) - 1

    def mat(self, color, op):
        key = (color, round(op, 2))
        if key not in self.mats:
            rgb = [float(x) for x in srgb2lin(hex2rgb(color))]
            m = {'name': f'{color}_{op}', 'doubleSided': True,
                 'pbrMetallicRoughness': {'baseColorFactor': rgb + [float(op)], 'metallicFactor': 0, 'roughnessFactor': 0.9}}
            if op < 0.999: m['alphaMode'] = 'BLEND'
            self.mats[key] = len(self.matl); self.matl.append(m)
        return self.mats[key]

    def add(self, name, tri, color, op):
        """tri: (n*3, 3) float32 de triángulos no indexados."""
        tri = np.asarray(tri, np.float32).reshape(-1, 3)
        if len(tri) < 3: return
        t = tri.reshape(-1, 3, 3)
        nrm = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0])
        ln = np.linalg.norm(nrm, axis=1)
        ok = ln > 1e-9
        t, nrm, ln = t[ok], nrm[ok], ln[ok]
        if not len(t): return
        nrm = (nrm / ln[:, None]).astype(np.float32)
        pos = t.reshape(-1, 3)
        nr = np.repeat(nrm, 3, axis=0)
        # índices u32 sobre vértices deduplicados por posición+normal
        key = np.round(np.hstack([pos, nr]) * 1000).astype(np.int64)
        _, first, inv = np.unique(key, axis=0, return_index=True, return_inverse=True)
        P, N, I = pos[first], nr[first], inv.astype(np.uint32).ravel()
        vp = self._view(P.astype(np.float32).tobytes(), 34962)
        vn = self._view(N.astype(np.float32).tobytes(), 34962)
        vi = self._view(I.tobytes(), 34963)
        ap = len(self.acc); self.acc.append({'bufferView': vp, 'componentType': 5126, 'count': len(P), 'type': 'VEC3',
                                             'min': P.min(0).tolist(), 'max': P.max(0).tolist()})
        an = len(self.acc); self.acc.append({'bufferView': vn, 'componentType': 5126, 'count': len(N), 'type': 'VEC3'})
        ai = len(self.acc); self.acc.append({'bufferView': vi, 'componentType': 5125, 'count': len(I), 'type': 'SCALAR'})
        self.prims.append((name, {'attributes': {'POSITION': ap, 'NORMAL': an}, 'indices': ai, 'material': self.mat(color, op)}))

    def write(self, path, scale=1.0):
        meshes = [{'name': n, 'primitives': [p]} for n, p in self.prims]
        nodes = [{'name': n, 'mesh': i} for i, (n, _) in enumerate(self.prims)]
        root = {'name': 'modelo', 'children': list(range(len(nodes)))}
        if scale != 1: root['scale'] = [scale] * 3
        nodes.append(root)
        while len(self.bin) % 4: self.bin += b'\0'
        js = {'asset': {'version': '2.0', 'generator': 'motor BIM · to_glb.py'}, 'scene': 0,
              'scenes': [{'nodes': [len(nodes) - 1]}], 'nodes': nodes, 'meshes': meshes,
              'materials': self.matl, 'accessors': self.acc, 'bufferViews': self.views,
              'buffers': [{'byteLength': len(self.bin)}]}
        j = json.dumps(js, separators=(',', ':')).encode()
        j += b' ' * ((-len(j)) % 4)
        out = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(j) + 8 + len(self.bin))
        out += struct.pack('<II', len(j), 0x4E4F534A) + j + struct.pack('<II', len(self.bin), 0x004E4942) + bytes(self.bin)
        pathlib.Path(path).write_bytes(out)
        return len(out)


def north_arrow(L=4.0, w=0.9, h=0.06):
    """Flecha plana apuntando al norte (-Z), centrada en el origen."""
    p = [(-w / 3, 0), (w / 3, 0), (w / 3, L * .65), (w, L * .65), (0, L), (-w, L * .65), (-w / 3, L * .65)]
    out = []
    for a, b, c in [(0, 1, 2), (0, 2, 6), (6, 2, 3), (6, 3, 4), (6, 4, 5)]:
        for k in (a, b, c):
            out.append((p[k][0], h, -p[k][1]))
    return np.array(out, np.float32)


def export(proj, cfg, outdir):
    proj, outdir = pathlib.Path(proj), pathlib.Path(outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    P = json.load(open(proj / 'data/proyecto.json'))
    meta, A = read_pack(proj / P['files']['escena'])
    ZR = meta.get('zr', float(P.get('zr', 0)))
    bb = np.array(meta['bb'], float)
    mp = A['mp'].reshape(-1, 3).astype(np.float64) / 65535 * (bb[3:] - bb[:3]) + bb[:3]
    ox, oy = cfg['origen']
    res = {}
    for vname, v in cfg['variantes'].items():
        capas = set(v['capas'])
        rc = v.get('recorte')
        items = []  # (nombre, tri en coords proyecto x,y,z, color, op)
        groups = {}
        for m in meta['meshes']:
            if m['l'] not in capas or m.get('hid') or (m.get('op', 1) or 0) < 0.05: continue
            p = mp[m['v0']:m['v0'] + m['n']]
            if rc:
                t = p.reshape(-1, 3, 3); c = t.mean(1)
                keep = (c[:, 0] >= rc[0]) & (c[:, 0] <= rc[2]) & (c[:, 1] >= rc[1]) & (c[:, 1] <= rc[3])
                p = t[keep].reshape(-1, 3)
            k = (m['l'], m['c'], round(m.get('op', 1), 2) if m.get('tr') or m.get('op', 1) < 1 else 1.0)
            groups.setdefault(k, []).append(p)
        for (l, c, op), ps in groups.items():
            p = np.vstack(ps)
            if len(p): items.append((l, p, c, op))
        # instancias (árboles, señales): geometría ya en coordenadas del visor
        for m in meta.get('inst', []):
            if m['l'] not in capas: continue
            g = A['ig'][m['g0'] * 3:(m['g0'] + m['ng']) * 3].reshape(-1, 3).astype(np.float64)
            g4 = np.hstack([g, np.ones((len(g), 1))])
            acc = []
            for i in range(m['n']):
                M = A['im'][(m['m0'] + i) * 16:(m['m0'] + i + 1) * 16].reshape(4, 4).T
                w = (M @ g4.T).T[:, :3]
                x, y, z = w[:, 0], -w[:, 2], w[:, 1] + ZR
                if rc and not (rc[0] <= x.mean() <= rc[2] and rc[1] <= y.mean() <= rc[3]): continue
                acc.append(np.stack([x, y, z], 1))
            if acc: items.append((m['l'], np.vstack(acc), m['c'], m.get('op', 1)))
        # terreno recortado, coloreado por bandas de cota (sin colores por vértice)
        if v.get('terreno') and meta.get('terrain'):
            T = meta['terrain']; nx, ny = T['nx'], T['ny']
            Z = np.where(A['tz'] == -32768, np.nan, T['zb'] + A['tz'] / 100.0).reshape(ny, nx)
            st = max(1, int(round(v.get('paso', 2) / T['dx'])))
            xs = T['x0'] + np.arange(nx) * T['dx']; ys = T['y0'] + np.arange(ny) * T['dx']
            ii = np.arange(0, nx, st); jj = np.arange(0, ny, st)
            if rc:
                ii = ii[(xs[ii] >= rc[0]) & (xs[ii] <= rc[2])]; jj = jj[(ys[jj] >= rc[1]) & (ys[jj] <= rc[3])]
            X, Y = np.meshgrid(xs[ii], ys[jj]); ZZ = Z[np.ix_(jj, ii)] - 0.03  # bajo pavimentos
            q = [np.stack([X[:-1, :-1], Y[:-1, :-1], ZZ[:-1, :-1]], -1), np.stack([X[:-1, 1:], Y[:-1, 1:], ZZ[:-1, 1:]], -1),
                 np.stack([X[1:, :-1], Y[1:, :-1], ZZ[1:, :-1]], -1), np.stack([X[1:, 1:], Y[1:, 1:], ZZ[1:, 1:]], -1)]
            a, b, c, d = [x.reshape(-1, 3) for x in q]
            ok = ~np.isnan(a[:, 2] + b[:, 2] + c[:, 2] + d[:, 2])
            a, b, c, d = a[ok], b[ok], c[ok], d[ok]
            tri = np.concatenate([np.stack([a, b, c], 1), np.stack([b, d, c], 1)])
            zc = tri[:, :, 2].mean(1)
            zmin, zmax = np.nanmin(Z), np.nanmax(Z)
            cols = ['#9fae8c', '#aeb38e', '#bdb68f', '#c9b98f', '#c1ab86', '#b69a7a']
            bins = np.clip(((zc - zmin) / max(.01, zmax - zmin) * len(cols)).astype(int), 0, len(cols) - 1)
            for k, col in enumerate(cols):
                s = tri[bins == k]
                if len(s): items.append(('terreno', s.reshape(-1, 3), col, 1.0))
        # base: cota mínima de la variante (lo que se apoya en el suelo)
        z0 = v.get('z0') or min(float(np.nanmin(it[1][:, 2])) for it in items)
        glb = GLB()
        for l, p, c, op in items:
            t = np.stack([p[:, 0] - ox, p[:, 2] - z0, -(p[:, 1] - oy)], 1)
            glb.add(l, t, c, op)
        if v.get('norte', True):
            glb.add('norte', north_arrow(L=v.get('flecha', 4.0)), '#c0392b', 1.0)
        n = glb.write(outdir / f'{vname}.glb', v.get('escala', 1))
        res[vname] = {'bytes': n, 'z0': round(z0, 3), 'tris': sum(len(it[1]) // 3 for it in items)}
    return res


if __name__ == '__main__':
    cfg = json.load(open(sys.argv[2]))
    print(json.dumps(export(sys.argv[1], cfg, sys.argv[3]), indent=1))
