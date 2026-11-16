"""Arma la página de un proyecto Gantt: motor (gantt.js) + datos (project.json).
Uso: python3 build_gantt.py gantt.js proyecto.json salida.html
El resultado es idéntico al que produce «Guardar versión» dentro de la página."""
import json, sys, pathlib, html

SKEL = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}'
        'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>')
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Semi+Condensed:wght@400;500;600&display=swap" rel="stylesheet">')
JSPDF = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>'


def build(engine_src: str, data: dict) -> str:
    assert '</script' not in engine_src, 'el motor no puede contener </script'
    assert isinstance(data.get('tasks'), list), 'project.json debe tener tasks[]'
    js = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    title = html.escape(data.get('title', ''), quote=False)
    return (SKEL + f'<title>Carta Gantt de seguimiento – {title}</title>\n' + FONTS + '\n' + JSPDF + '\n'
            + f'<script type="application/json" id="project-data">{js}</script>\n'
            + f'<script id="g-engine">{engine_src}</script>\n</body></html>')


def extract_data(page_html: str) -> dict:
    """Saca los datos de una página publicada (para actualizar el motor sin perder cambios)."""
    a = page_html.index('<script type="application/json" id="project-data">') + len('<script type="application/json" id="project-data">')
    b = page_html.index('</script>', a)
    return json.loads(page_html[a:b])


if __name__ == '__main__':
    eng, data, out = sys.argv[1:4]
    page = build(pathlib.Path(eng).read_text(), json.loads(pathlib.Path(data).read_text()))
    pathlib.Path(out).write_text(page)
    print(out, len(page))
