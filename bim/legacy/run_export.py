"""Ejecuta un visor antiguo con el gancho de exportación y guarda su escena como JSON.
Uso: python3 run_export.py entrada.html salida.json"""
import sys, json, asyncio, pathlib
sys.path.insert(0, '/home/claude/motor')
from pw import route_libs, MOCK
from playwright.async_api import async_playwright

HOOK = pathlib.Path(__file__).with_name('export_hook.js').read_text()

DOM_JS = r"""()=>{
 const q=s=>document.querySelector(s);
 const items=sel=>[...document.querySelectorAll(sel)].map(b=>b.textContent.trim());
 return {
  title:document.title,
  brand:q('.brand b')?.textContent||'', brandSub:q('.brand span')?.textContent||'',
  chip:q('.stage-chip span')?.innerHTML||'',
  help:q('#help .box')?.innerHTML||'',
  qa:[...document.querySelectorAll('#qa li')].map(li=>({s:li.className,t:li.querySelector('b')?.textContent||'',d:li.childNodes.length>1?[...li.childNodes].slice(1).map(n=>n.textContent).join(''):''})),
  stages:[...document.querySelectorAll('#stages li')].map(li=>({t:li.textContent,now:li.classList.contains('now')})),
  card:q('#st-prop')?.innerHTML||'',
  navSections:[...document.querySelectorAll('.nav h2')].map(h=>({h:h.textContent,ul:h.nextElementSibling?.id||''})),
  nav:Object.fromEntries([...document.querySelectorAll('.nav ul')].map(u=>[u.id,[...u.querySelectorAll('button')].map(b=>({t:b.childNodes.length?[...b.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim():b.textContent.trim(),small:b.querySelector('small')?.textContent||'',dis:b.disabled}))]))
 };}"""

STATE_JS = r"""()=>{const A=window.__EXPAPI();const id=A.activeTab;const t=A.TABS.find(x=>x.id===id);
 if(!t||t.type==='3d') return {type:'3d',cam:A.camState(),lv:{...A.LV}};
 const o={type:t.type,id:t.id,title:t.title};['scale','north','focus','fw','force','fitPoly','h','mono','secMarks','src'].forEach(k=>{if(t[k]!=null)o[k]=t[k];});
 if(t.pd)o.pd={a:t.pd.a,b:t.pd.b,L:t.pd.L}; if(t.sheet)o.sheet=t.sheet.id;
 if(['norm','mt','img','coord'].includes(t.type)||!document.querySelector('#v2d svg'))o.html=document.querySelector('#v2d').innerHTML;
 return o;}"""


async def main(src, dst):
    html = pathlib.Path(src).read_text()
    i = html.index('function init(){')
    html = html[:i] + HOOK + '\n' + html[i:]
    tmp = pathlib.Path('/tmp/_exp.html'); tmp.write_text(html)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'])
        ctx = await b.new_context(viewport={'width': 1500, 'height': 900})
        await route_libs(ctx)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script(MOCK)
        await pg.goto('file://' + str(tmp), timeout=120000)
        await pg.wait_for_function("!document.querySelector('#loading')", timeout=180000)
        await pg.wait_for_timeout(1500)
        dom = await pg.evaluate(DOM_JS)
        await pg.evaluate("()=>{const A=window.__EXPAPI();if('tcut' in A.LV)A.setLayer('tcut',false);}")
        data = await pg.evaluate('window.__EXPORT()')
        if len(sys.argv) > 3:
            data['extra'] = await pg.evaluate('(s)=>JSON.parse(JSON.stringify(window.__EVAL(s)))', pathlib.Path(sys.argv[3]).read_text())
        # navigation: click each nav button and record resulting state
        navs = {}
        for ul, entries in dom['nav'].items():
            out = []
            for k, e in enumerate(entries):
                if e['dis']:
                    out.append({**e, 'state': None}); continue
                try:
                    await pg.evaluate("(a)=>{const A=window.__EXPAPI();A.setTab('3d');}", None)
                    await pg.evaluate(f"()=>document.querySelectorAll('#{ul} button')[{k}].click()")
                    await pg.wait_for_timeout(500)
                    st = await pg.evaluate(STATE_JS)
                except Exception as ex:
                    st = {'error': str(ex)}
                out.append({**e, 'state': st})
            navs[ul] = out
        dom['navStates'] = navs
        data['dom'] = dom
        data['pageErrors'] = errs
        pathlib.Path(dst).write_text(json.dumps(data, ensure_ascii=False))
        print('ok', dst, 'meshes', len(data['meshes']), 'lines', len(data['lines']), 'inst', len(data['inst']), 'labels', len(data['labels']), 'sheets', len(data['sheets']), 'errors', data['errors'][:5], 'pageErrors', errs[:5])
        await b.close()

asyncio.run(main(sys.argv[1], sys.argv[2]))
