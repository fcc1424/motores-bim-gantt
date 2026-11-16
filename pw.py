"""Utilidades Playwright: sirve las librerías CDN desde /home/claude/vendor."""
import pathlib
V = pathlib.Path('/home/claude/vendor')
MAP = {'three.min.js': 'three.min.js', 'OrbitControls.js': 'OrbitControls.js', 'jspdf.umd.min.js': 'jspdf.umd.min.js'}

async def route_libs(ctx):
    async def handler(route):
        url = route.request.url
        for k, f in MAP.items():
            if url.endswith(k):
                return await route.fulfill(path=str(V / f), content_type='application/javascript')
        if 'fonts.g' in url:
            return await route.abort()
        return await route.continue_()
    await ctx.route('**/*', handler)

MOCK = """
window.__published=null;
window.claude={use:async n=>{ if(n==='artifact') return {publish:async h=>{window.__published=h; return {version:'t'};}};
  if(n==='downloads') return {save:async(o)=>{window.__dl=(window.__dl||[]);window.__dl.push(o.filename);return {status:'saved'};}}; return null; }};
"""
