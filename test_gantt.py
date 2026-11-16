"""Prueba del motor Gantt: carga cada página, revisa errores, simula Guardar versión
y vuelve a cargar la página guardada (ida y vuelta)."""
import sys, json, pathlib, asyncio
from playwright.async_api import async_playwright

MOCK = """
window.__published=null;
window.claude={use:async n=>{ if(n==='artifact') return {publish:async h=>{window.__published=h; return {version:'t'};}};
  if(n==='downloads') return {save:async()=>({})}; return null; }};
"""

async def run(pages, shots):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ok = True
        for f in pages:
            ctx = await b.new_context(viewport={'width': 1500, 'height': 900})
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' else None)
            await pg.add_init_script(MOCK)
            # block network fonts / cdn except jspdf (cached locally if possible)
            await pg.goto('file://' + str(pathlib.Path(f).resolve()))
            await pg.wait_for_timeout(1500)
            info = await pg.evaluate("""()=>({title:document.title, h1:document.querySelector('#pTitle')?.textContent,
               rows:document.querySelectorAll('#grid tbody tr').length, seg:!!document.querySelector('[data-act=updateSched]'),
               stats:document.querySelector('#stats')?.innerText.replace(/\\n/g,' | ')})""")
            await pg.screenshot(path=f'{shots}/{pathlib.Path(f).stem}.png')
            # edit + save round-trip
            await pg.click('#grid tbody tr:nth-child(2) td.c-id')
            await pg.keyboard.press('Insert')
            await pg.wait_for_timeout(300)
            await pg.click('#bSave'); await pg.wait_for_timeout(800)
            saved = await pg.evaluate('window.__published')
            rt = None
            if saved:
                p2 = pathlib.Path(shots) / (pathlib.Path(f).stem + '_saved.html'); p2.write_text(saved)
                pg2 = await ctx.new_page(); e2 = []
                pg2.on('pageerror', lambda e: e2.append(str(e)))
                await pg2.goto('file://' + str(p2.resolve())); await pg2.wait_for_timeout(1200)
                rt = await pg2.evaluate("()=>({rows:document.querySelectorAll('#grid tbody tr').length, h1:document.querySelector('#pTitle').textContent, styles:document.querySelectorAll('#g-css').length, apps:document.querySelectorAll('.app').length})")
                rt['errors'] = e2
            print(pathlib.Path(f).name, json.dumps(info, ensure_ascii=False))
            print('   saved:', bool(saved), 'roundtrip:', rt, 'errors:', errs[:5])
            ok = ok and not errs and saved and not rt['errors'] and rt['apps'] == 1
            await ctx.close()
        await b.close()
        print('OK' if ok else 'FALLÓ')

asyncio.run(run(sys.argv[2:], sys.argv[1]))
