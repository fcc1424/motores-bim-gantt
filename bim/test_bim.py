"""Prueba un proyecto BIM en Chromium: carga, recorre el navegador y toma capturas.
Uso: python3 test_bim.py carpeta_proyecto salida_png_prefijo"""
import sys, asyncio, pathlib, threading, http.server, functools, json
sys.path.insert(0, '/home/claude/motor')
from pw import route_libs, MOCK
from playwright.async_api import async_playwright
root = pathlib.Path(sys.argv[1]).resolve(); out = sys.argv[2]
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def guess_type(self, path):
        t = super().guess_type(path)
        return t + '; charset=utf-8' if t.startswith('text/') or t.endswith('javascript') else t
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(root)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{srv.server_port}/index.html'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1500, 'height': 900})
        await route_libs(ctx)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        await pg.add_init_script(MOCK)
        await pg.goto(url, timeout=120000)
        try:
            await pg.wait_for_function("!document.querySelector('#loading')", timeout=180000)
        except Exception as e:
            print('LOAD FAIL', await pg.evaluate("document.querySelector('#loading')&&document.querySelector('#loading').textContent"))
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=out + '_0.png')
        btns = await pg.evaluate("[...document.querySelectorAll('#nv-dyn button[data-nv]')].map(b=>b.dataset.nv+' '+b.textContent.trim())")
        shots = 1
        import os
        if os.environ.get('NONAV'): btns=[]
        for bt in btns:
            k = bt.split(' ')[0]
            await pg.evaluate(f"document.querySelector('#nv-dyn button[data-nv=\"{k}\"]').click()")
            await pg.wait_for_timeout(1200)
            st = await pg.evaluate("({tab:window.__BIM.activeTab, svg:document.querySelectorAll('#v2d svg *').length, txt:document.querySelector('#v2d').innerText.slice(0,80)})")
            print(bt, '→', json.dumps(st, ensure_ascii=False))
            if len(sys.argv) > 3 or shots < 40:
                await pg.screenshot(path=f'{out}_{shots}.png'); shots += 1
        # interacción: selección en el centro del 3D, capas, perfil, descargas
        await pg.evaluate("window.__BIM.runAct({type:'fit',mode:'persp'})"); await pg.wait_for_timeout(800)
        box = await pg.evaluate("(()=>{const r=document.querySelector('#c3d').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()")
        await pg.mouse.click(box[0], box[1]); await pg.wait_for_timeout(600)
        print('SEL', await pg.evaluate("document.querySelector('#st-prop h4')&&document.querySelector('#st-prop h4').textContent"))
        await pg.evaluate("document.querySelector('.stabs [data-st=lyr]').click()")
        n = await pg.evaluate("document.querySelectorAll('#st-lyr input[data-l]').length"); print('LAYERS', n)
        await pg.evaluate("document.querySelector('#st-lyr input[data-l]').click()")
        # perfil con la herramienta: dos clics
        await pg.evaluate("document.querySelector('#seg-tool [data-tool=prof]').click()")
        await pg.mouse.click(box[0]-120, box[1]+60); await pg.wait_for_timeout(300); await pg.mouse.click(box[0]+120, box[1]+40); await pg.wait_for_timeout(800)
        print('PROFPANEL', await pg.evaluate("!document.querySelector('#profp').hidden && document.querySelectorAll('#pr-body svg *').length"))
        await pg.screenshot(path=out + '_prof.png')
        await pg.evaluate("document.querySelector('#seg-tool [data-tool=sel]').click()")
        dls = []
        for tab in await pg.evaluate("window.__BIM.TABS.map(t=>t.id)"):
            await pg.evaluate(f"window.__BIM.setTab('{tab}')"); await pg.wait_for_timeout(400)
            btn = '#btn-dl' if tab == '3d' else '#btn-dl2'
            await pg.evaluate(f"document.querySelector('{btn}').click()")
            ks = await pg.evaluate("[...document.querySelectorAll('#dlmenu [data-dl]')].map(b=>b.dataset.dl)")
            for k in ks:
                if k in dls: continue
                await pg.evaluate(f"document.querySelector('{btn}').click()")
                await pg.evaluate(f"document.querySelector('#dlmenu [data-dl={k}]').click()"); await pg.wait_for_timeout(700)
                dls.append(k)
        print('DL tried', dls, 'saved', await pg.evaluate("window.__dl"))
        print('ERRORS', errs[:20])
        await b.close()
asyncio.run(main())
