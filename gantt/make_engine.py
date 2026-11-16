"""Builds motor/gantt/gantt.js from the pieces extracted from the Miraflores page.
One-time refactor script: CSS + markup become string constants, the engine reads
its data from <script id="project-data"> and saves by rebuilding the page from
its own source (no DOM serialization)."""
import json, re, pathlib
D = pathlib.Path(__file__).parent
css = (D/'_css.css').read_text()
markup = (D/'_markup.html').read_text()
eng = (D/'_engine.js').read_text()

SEG = '''    <div class="grp"><div class="row">
      <button class="rb pct" data-pct="0" title="Marcar 0% completado">0%</button>
      <button class="rb pct" data-pct="25" title="Marcar 25% completado">25%</button>
      <button class="rb pct" data-pct="50" title="Marcar 50% completado">50%</button>
      <button class="rb pct" data-pct="75" title="Marcar 75% completado">75%</button>
      <button class="rb pct" data-pct="100" title="Marcar 100% completado">100%</button>
      <button class="rb" data-act="updateSched" title="Fija el % completado que corresponde según programa a la fecha de estado">Actualizar según programa</button>
    </div><div class="cap">Seguimiento</div></div>

'''
anchor = '    <div class="grp"><div class="row">\n      <select class="sel" id="selTable"'
assert markup.count(anchor) == 1
markup = markup.replace(anchor, SEG + anchor)
markup = re.sub(r'<h1 id="pTitle">[^<]*</h1>', '<h1 id="pTitle"></h1>', markup)
assert '</script' not in markup and '</script' not in css

SKEL = ('<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
        'html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}'
        'img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>')

head = '''/* Motor Gantt de seguimiento · v%s
   Interfaz única para todas las cartas Gantt. Cada proyecto es una página con:
   <script type="application/json" id="project-data">…datos…&lt;/script&gt;
   <script id="g-engine">…este archivo…&lt;/script&gt;
   Guardar versión reconstruye la página desde este mismo código y los datos. */
(function(){
'use strict';
const ENGINE_VERSION = %s;
const G_CSS = %s;
const G_MARKUP = %s;
const SKEL = %s;
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Semi+Condensed:wght@400;500;600&display=swap" rel="stylesheet">';
const JSPDF = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\\/script>';
(function inject(){
  const st=document.createElement('style'); st.id='g-css'; st.textContent=G_CSS; document.head.appendChild(st);
  const host=document.createElement('div'); host.innerHTML=G_MARKUP;
  const ref=document.getElementById('project-data');
  while(host.firstChild) document.body.insertBefore(host.firstChild, ref);
})();
function buildPage(json, title){
  const src=document.getElementById('g-engine').textContent;
  const t=String(title||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  return SKEL+'<title>Carta Gantt de seguimiento – '+t+'</title>\\n'+FONTS+'\\n'+JSPDF+'\\n'
    +'<script type="application/json" id="project-data">'+json+'<\\/script>\\n'
    +'<script id="g-engine">'+src+'<\\/script>\\n</body></html>';
}
'''
VERSION = '1.0'
eng_lines = eng.split('\n')
assert eng_lines[0] == '(function(){' and eng_lines[1] == "'use strict';" and eng_lines[2].startswith('const TEMPLATE')
eng = '\n'.join(eng_lines[3:])

# generic empty seed instead of the Lantaño seed
seed_start = eng.index('const SEED = [')
seed_end = eng.index('const DEFAULT_VIEW')
eng = eng[:seed_start] + eng[seed_end:]
s0 = eng.index('function seedProject(){')
s1 = eng.index('\n}\n', s0) + 3
eng = eng[:s0] + '''function seedProject(){
  const t0=todayISO();
  const tasks=[{uid:1, level:1, name:'Nuevo proyecto', dur:20, preds:[], cType:'ASAP', cDate:'', pct:0, resp:'', notes:'', deadline:'', key:false, bs:'', bf:'', collapsed:false},
               {uid:2, level:2, name:'Primera tarea', dur:20, preds:[], cType:'SNET', cDate:t0, pct:0, resp:'', notes:'', deadline:'', key:false, bs:'', bf:'', collapsed:false}];
  P = { id:'', title:'Nuevo proyecto', name:'', rev:'', startDate:t0, statusDate:t0, holidays:[], baselineLabel:'', tasks, nextUid:3, savedAt:null, view:{...DEFAULT_VIEW} };
  tasks.forEach(fillDefaults);
}
''' + eng[s1:]

# draft key per project
old = re.search(r"const DRAFT_KEY = '[^']*';", eng).group(0)
eng = eng.replace(old, "let DRAFT_KEY = 'gantt-draft-v1';")
eng = eng.replace("  return { title:P.title,", "  return { id:P.id||'', title:P.title,", 1)
boot = "if(EMB && Array.isArray(EMB.tasks)) P=normalize(EMB); else seedProject();\n"
assert boot in eng
eng = eng.replace(boot, boot + "DRAFT_KEY = 'gantt-draft-v1-' + (P.id || String(P.title||'').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-'));\n")

# save: rebuild page from own source
old_save = '''  const html=TEMPLATE.replace(/(<script type="application\\/json" id="project-data">)[\\s\\S]*?(<\\/script>)/, (m,a,b)=>a+json+b);'''
assert old_save in eng, 'save line'
eng = eng.replace(old_save, '  const html=buildPage(json, P.title);')

# export file names from the project title (the originals had a hardcoded name)
eng = eng.replace("const map={ xml:[`Piedra_Roja_II_${stamp}.xml`, buildXML()], csv:[`Piedra_Roja_II_${stamp}.csv`, buildCSV()], json:[`Piedra_Roja_II_${stamp}.json`, JSON.stringify(cleanP(),null,1)] };",
  "const fb=fileBase(); const map={ xml:[`${fb}_${stamp}.xml`, buildXML()], csv:[`${fb}_${stamp}.csv`, buildCSV()], json:[`${fb}_${stamp}.json`, JSON.stringify(cleanP(),null,1)] };")
eng = eng.replace("const filename=`Carta_Gantt_Piedra_Roja_II_${P.statusDate.replace(/-/g,'')}.pdf`;", "const filename=`Carta_Gantt_${fileBase()}_${P.statusDate.replace(/-/g,'')}.pdf`;")
eng = eng.replace("async function exportAs(kind){", "function fileBase(){ return String(P.title||'Proyecto').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')||'Proyecto'; }\nasync function exportAs(kind){")
assert 'Piedra_Roja' not in eng

assert 'TEMPLATE' not in eng
assert '</script' not in eng, [m.start() for m in re.finditer('</script', eng)]

out = head % (VERSION, json.dumps(VERSION), json.dumps(css), json.dumps(markup), json.dumps(SKEL)) + eng + '\n'
(D/'gantt.js').write_text(out)
(D/'skel.txt').write_text(SKEL)
print('gantt.js', len(out))
