"""Genera el QR de realidad aumentada de un proyecto y lo guarda en proyecto.json (clave `ar`)
y en ar/<id>/info.json. Uso: python3 ar_qr.py carpeta_proyecto id_ar url_base"""
import sys, json, io, pathlib, segno
proj, pid, base = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3].rstrip('/')
url = f'{base}/ar/?p={pid}'
buf = io.BytesIO()
segno.make(url, error='m').save(buf, kind='svg', scale=1, border=2, xmldecl=False, svgns=True, dark='#000', light='#fff', nl=False)
svg = buf.getvalue().decode().replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ', 1)
# ancho/alto fijos fuera: el CSS decide el tamaño
import re
svg = re.sub(r'\s(width|height)="\d+"', '', svg, count=2)
vb = segno.make(url, error='m').symbol_size(scale=1, border=2)
svg = svg.replace('<svg ', f'<svg viewBox="0 0 {vb[0]} {vb[1]}" ', 1) if 'viewBox' not in svg else svg
pf = proj / 'data/proyecto.json'
P = json.load(open(pf)); P['ar'] = {'url': url, 'qr': svg}
json.dump(P, open(pf, 'w'), ensure_ascii=False, separators=(',', ':'))
inf = pathlib.Path(__file__).resolve().parents[2] / 'ar' / pid / 'info.json'
I = json.load(open(inf)); I.pop('bim', None); I['qr'] = svg
json.dump(I, open(inf, 'w'), ensure_ascii=False, indent=1)
print(url, len(svg))
