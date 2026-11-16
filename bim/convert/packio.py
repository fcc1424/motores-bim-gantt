"""Formato «pack» del motor BIM: gzip(u32 largo JSON + JSON + relleno a 4 + búferes) en base64.
El JSON lleva la clave `_a` con la descripción de cada arreglo: {nombre: [tipo, offset, n]}."""
import json, gzip, base64, struct
import numpy as np

TYPES = {np.dtype('float32'): 'f32', np.dtype('uint16'): 'u16', np.dtype('int16'): 'i16',
         np.dtype('uint8'): 'u8', np.dtype('uint32'): 'u32', np.dtype('int32'): 'i32'}


def write_pack(path, meta, arrays=None):
    arrays = arrays or {}
    desc, bufs, off = {}, [], 0
    for k, a in arrays.items():
        a = np.ascontiguousarray(a)
        b = a.tobytes()
        desc[k] = [TYPES[a.dtype], off, int(a.size)]
        pad = (-len(b)) % 4
        bufs.append(b + b'\0' * pad)
        off += len(b) + pad
    meta = dict(meta)
    meta['_a'] = desc
    j = json.dumps(meta, ensure_ascii=False, separators=(',', ':')).encode()
    head = struct.pack('<I', len(j)) + j
    head += b'\0' * ((-len(head)) % 4)
    raw = head + b''.join(bufs)
    gz = gzip.compress(raw, 9)
    txt = base64.b64encode(gz).decode()
    open(path, 'w').write(txt)
    return len(raw), len(txt)


def read_pack(path):
    raw = gzip.decompress(base64.b64decode(open(path).read()))
    n = struct.unpack('<I', raw[:4])[0]
    meta = json.loads(raw[4:4 + n])
    base = 4 + n
    base += (-base) % 4
    inv = {v: k for k, v in TYPES.items()}
    arrs = {k: np.frombuffer(raw, dtype=inv[t], count=c, offset=base + o) for k, (t, o, c) in meta['_a'].items()}
    return meta, arrs
