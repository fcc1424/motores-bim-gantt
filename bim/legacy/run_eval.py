"""Ejecuta un visor antiguo (sin gancho de escena), espera a que cargue y evalúa un script dentro de su clausura.
Uso: python3 run_eval.py visor.html script.js salida.json [carpeta_con_archivos]"""
import sys, json, asyncio, pathlib, threading, http.server, functools, shutil
sys.path.insert(0, '/home/claude/motor')
from pw import route_libs, MOCK
from playwright.async_api import async_playwright
src, scr, dst = sys.argv[1:4]
root = pathlib.Path(sys.argv[4] if len(sys.argv) > 4 else pathlib.Path(src).parent).resolve()
html = pathlib.Path(src).read_text()
i = html.index('function init(){')
html = html[:i] + 'window.__EVAL=function(s){return eval(s);};\n' + html[i:]
(root / '_eval.html').write_text(html)
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(root)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1500, 'height': 900})
        await route_libs(ctx)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(MOCK)
        await pg.goto(f'http://127.0.0.1:{srv.server_port}/_eval.html', timeout=120000)
        await pg.wait_for_function("!document.querySelector('#loading')", timeout=300000)
        await pg.wait_for_timeout(1500)
        r = await pg.evaluate('(s)=>JSON.stringify(window.__EVAL(s))', pathlib.Path(scr).read_text())
        pathlib.Path(dst).write_text(r)
        print('ok', dst, len(r), 'errors', errs[:5])
        await b.close()
asyncio.run(main())
