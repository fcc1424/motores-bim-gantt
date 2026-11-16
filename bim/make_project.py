"""Arma la carpeta publicable de un proyecto BIM: index.html (cascarón) + motor/bim.js + data/.
Uso: python3 make_project.py carpeta_proyecto"""
import sys, json, pathlib, shutil, html
d = pathlib.Path(sys.argv[1])
P = json.load(open(d / 'data/proyecto.json'))
tpl = pathlib.Path('/home/claude/motor/bim/src/shell.html').read_text()
(d / 'index.html').write_text(tpl.replace('{{TITLE}}', html.escape(P.get('title') or P['nombre'] + ' · Modelo BIM')))
(d / 'motor').mkdir(exist_ok=True)
shutil.copy('/home/claude/motor/bim/bim.js', d / 'motor/bim.js')
print('ok', d)
