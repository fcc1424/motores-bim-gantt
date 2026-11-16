/* Motor Gantt de seguimiento · v1.0
   Interfaz única para todas las cartas Gantt. Cada proyecto es una página con:
   <script type="application/json" id="project-data">…datos…&lt;/script&gt;
   <script id="g-engine">…este archivo…&lt;/script&gt;
   Guardar versión reconstruye la página desde este mismo código y los datos. */
(function(){
'use strict';
const ENGINE_VERSION = "1.0";
const G_CSS = ":root{\n  box-sizing:border-box;\n  padding-top:env(safe-area-inset-top,0px);\n  padding-bottom:env(safe-area-inset-bottom,0px);\n  --bg:#EEF2F5; --panel:#FFFFFF; --ink:#16202A; --muted:#5D6975; --line:#D5DDE5; --line2:#E9EEF2;\n  --head:#E4EBF2; --hover:#F2F6FA; --sel:#D7E7F8; --weekend:#F3F5F8;\n  --bar:#3E86CF; --prog:#0B3F78; --crit:#D2463A; --crit-d:#7E1E16; --sum:#1B2633; --base:#A7B2BE;\n  --spark:#FFC220; --spark-ink:#6B4D00; --status:#15875A; --link:#4C77A8; --slack:#2A9C8F;\n  --accent:#0A5AB0; --accent-ink:#FFFFFF; --warn:#B7791F; --ok:#15875A; --manual:#1E8C80;\n  --font:\"Barlow\",system-ui,-apple-system,\"Segoe UI\",Roboto,Arial,sans-serif;\n  --font-c:\"Barlow Semi Condensed\",\"Barlow\",system-ui,-apple-system,\"Segoe UI\",Roboto,Arial,sans-serif;\n}\n@media (prefers-color-scheme: dark){\n  :root:not([data-theme=\"light\"]){\n    --bg:#10151B; --panel:#171E26; --ink:#E4EAF0; --muted:#98A5B2; --line:#2B3541; --line2:#212A34;\n    --head:#1E2731; --hover:#1C2530; --sel:#1C3552; --weekend:#141A21;\n    --bar:#4B93DD; --prog:#B9D8FA; --crit:#EE6457; --crit-d:#FFD0CB; --sum:#D9E1E9; --base:#5B6773;\n    --spark:#FFC220; --spark-ink:#FFE7A3; --status:#39B783; --link:#7CA6D6; --slack:#43BFB0;\n    --accent:#3D8FE3; --accent-ink:#06121F; --warn:#E3A948; --ok:#39B783; --manual:#43BFB0;\n  }\n}\n:root[data-theme=\"dark\"]{\n  --bg:#10151B; --panel:#171E26; --ink:#E4EAF0; --muted:#98A5B2; --line:#2B3541; --line2:#212A34;\n  --head:#1E2731; --hover:#1C2530; --sel:#1C3552; --weekend:#141A21;\n  --bar:#4B93DD; --prog:#B9D8FA; --crit:#EE6457; --crit-d:#FFD0CB; --sum:#D9E1E9; --base:#5B6773;\n  --spark:#FFC220; --spark-ink:#FFE7A3; --status:#39B783; --link:#7CA6D6; --slack:#43BFB0;\n  --accent:#3D8FE3; --accent-ink:#06121F; --warn:#E3A948; --ok:#39B783; --manual:#43BFB0;\n}\n*,*::before,*::after{box-sizing:inherit}\nhtml{scroll-padding-top:env(safe-area-inset-top,0px);height:100%}\nbody{margin:0;height:100%;background:var(--bg);color:var(--ink);font-family:var(--font);font-size:14px;-webkit-font-smoothing:antialiased}\nbutton,input,select,textarea{font:inherit;color:inherit}\n.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}\n:focus-visible{outline:2px solid var(--accent);outline-offset:1px}\n\n.app{display:flex;flex-direction:column;height:100%;min-height:0}\n\n/* Header */\n.top{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:14px 18px 10px;background:var(--panel);flex-wrap:wrap}\n.ttl h1{margin:0;font-size:22px;line-height:1.15;font-weight:700;letter-spacing:-.01em}\n.ttl p{margin:3px 0 0;color:var(--muted);font-size:13px;max-width:80ch}\n.actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n.savestate{font-size:12.5px;color:var(--muted);margin-right:4px}\n.savestate.dirty{color:var(--warn)}\n.btn{height:30px;padding:0 11px;border:1px solid var(--line);background:var(--panel);border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:13px}\n.btn:hover{background:var(--hover)}\n.btn:disabled{opacity:.45;cursor:default}\n.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink);font-weight:600}\n.btn.primary:hover{filter:brightness(1.07)}\n.btn svg{width:15px;height:15px;flex:none}\n\n/* Overview */\n.overview{display:grid;grid-template-columns:auto 1fr;gap:6px 22px;align-items:center;padding:4px 18px 10px;background:var(--panel);border-bottom:1px solid var(--line)}\n.stats{display:flex;gap:0;flex-wrap:wrap}\n.stat{padding:2px 14px 2px 0;margin-right:14px;border-right:1px solid var(--line2)}\n.stat:last-child{border-right:0}\n.stat b{display:block;font-weight:600;font-size:14.5px;font-variant-numeric:tabular-nums;white-space:nowrap}\n.stat span{font-size:12px;color:var(--muted)}\n.stat b.late{color:var(--crit)}\n#strip{width:100%;height:46px;display:block;cursor:pointer;min-width:260px}\n\n/* Ribbon */\n.ribbon{display:flex;gap:0;background:var(--panel);border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:thin}\n.grp{display:flex;flex-direction:column;justify-content:space-between;padding:6px 10px 3px;border-right:1px solid var(--line2);flex:none}\n.grp .row{display:flex;gap:3px;align-items:center;flex-wrap:nowrap}\n.grp .cap{font-size:11px;color:var(--muted);text-align:center;margin-top:3px}\n.rb{height:28px;padding:0 8px;border:1px solid transparent;background:transparent;border-radius:3px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-size:12.5px;white-space:nowrap}\n.rb:hover{background:var(--head);border-color:var(--line)}\n.rb:disabled{opacity:.4;cursor:default;background:transparent;border-color:transparent}\n.rb svg{width:16px;height:16px;flex:none}\n.rb.pct{padding:0 5px;font-variant-numeric:tabular-nums;font-family:var(--font-c)}\n.sel{height:28px;border:1px solid var(--line);background:var(--panel);border-radius:3px;padding:0 4px;font-size:12.5px}\n.chk{display:inline-flex;align-items:center;gap:4px;font-size:12.5px;padding:0 5px;white-space:nowrap;cursor:pointer}\n.chk input{margin:0;accent-color:var(--accent)}\n.dropwrap{position:relative}\n.menu{position:fixed;top:0;left:0;z-index:60;max-height:calc(100vh - 16px);overflow-y:auto;box-sizing:border-box;background:var(--panel);border:1px solid var(--line);border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:4px;min-width:230px}\n.menu button{display:block;width:100%;text-align:left;border:0;background:none;padding:7px 10px;border-radius:3px;cursor:pointer;font-size:13px}\n.menu button:hover{background:var(--hover)}\n.menu small{display:block;color:var(--muted);font-size:11.5px}\n\n.banner{display:flex;align-items:center;gap:12px;padding:7px 18px;background:var(--sel);font-size:13px}\n.banner[hidden]{display:none}\n\n.mobtabs{display:none}\n.cbar{display:none;align-items:center;gap:14px;flex-wrap:wrap;padding:6px 18px;background:var(--panel);border-bottom:1px solid var(--line);font-size:12.5px;color:var(--muted)}\nbody.v-cobro .cbar{display:flex}\n.cbar .lg{display:inline-flex;align-items:center;gap:5px}\n.cbar .lg i{display:inline-block;width:18px;height:5px;border-radius:1px}\n.cbar .lg i.tk{width:2px;height:12px;background:var(--ink)}\n.cbar .sp{flex:1}\n.cbar select{height:28px;border:1px solid var(--line);border-radius:3px;background:var(--panel);padding:0 4px;font-size:12.5px}\n.grid td.v-over{color:var(--crit);font-weight:600}\n.grid td.v-none{color:var(--muted)}\n\n\n/* Split */\n.split{flex:1;display:flex;min-height:0;background:var(--panel)}\n.gridpane{flex:none;width:52%;overflow:auto;position:relative;min-width:120px}\n.chartpane{flex:1;overflow:auto;position:relative;min-width:120px}\n.splitter{flex:none;width:6px;cursor:col-resize;background:var(--line2);border-left:1px solid var(--line);border-right:1px solid var(--line)}\n.splitter:hover,.splitter.drag{background:var(--head)}\n\n/* Grid */\n.grid{border-collapse:separate;border-spacing:0;table-layout:fixed;font-family:var(--font-c);font-size:13px;font-variant-numeric:tabular-nums}\n.grid th{position:sticky;top:0;z-index:2;height:44px;box-sizing:border-box;background:var(--head);border-bottom:1px solid var(--line);border-right:1px solid var(--line);font-weight:600;text-align:left;padding:0 6px;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.grid td{height:28px;box-sizing:border-box;padding:0 6px;border-bottom:1px solid var(--line2);border-right:1px solid var(--line2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default;line-height:27px}\n.grid td.r,.grid th.r{text-align:right}\n.grid td.c-id{text-align:right;color:var(--muted);background:var(--head);border-right-color:var(--line);cursor:pointer}\n.grid td.c-ind{padding:0 3px;text-align:center}\n.grid tr:hover td{background:var(--hover)}\n.grid tr:hover td.c-id{background:var(--head)}\n.grid tr.sel td{background:var(--sel)}\n.grid tr.sel td.c-id{background:var(--accent);color:var(--accent-ink)}\n.grid tr.sum td{font-weight:600}\n.grid tr.crit td.c-name span.nt{color:var(--crit)}\n.grid tr.key td.c-name span.nt{text-decoration:underline;text-decoration-color:var(--spark);text-decoration-thickness:3px;text-underline-offset:3px}\n.nm{display:flex;align-items:center;gap:2px;min-width:0}\n.nm span.nt{overflow:hidden;text-overflow:ellipsis}\n.tg{width:18px;height:18px;flex:none;border:0;background:none;padding:0;cursor:pointer;color:var(--muted);display:inline-flex;align-items:center;justify-content:center;border-radius:2px}\n.tg:hover{background:var(--line)}\n.tg svg{width:10px;height:10px}\n.tgs{width:18px;flex:none}\n.cell-ed{width:100%;height:24px;border:1px solid var(--accent);border-radius:2px;padding:0 4px;background:var(--panel);font-family:var(--font-c);font-size:13px}\n.pctc{display:flex;align-items:center;gap:6px;justify-content:flex-end}\n.pctc i{display:block;width:34px;height:5px;background:var(--line);border-radius:3px;overflow:hidden}\n.pctc i b{display:block;height:100%;background:var(--ok)}\n.st{font-size:12px;padding:1px 6px;border-radius:9px;background:var(--line2)}\n.st.late{background:color-mix(in srgb,var(--crit) 18%,transparent);color:var(--crit)}\n.st.done{background:color-mix(in srgb,var(--ok) 18%,transparent);color:var(--ok)}\n.st.prog{background:color-mix(in srgb,var(--bar) 18%,transparent);color:var(--accent)}\n.v-late{color:var(--crit)}\n.v-early{color:var(--ok)}\n.ind{display:inline-flex;gap:1px;align-items:center}\n.ind svg{width:14px;height:14px}\n\n/* Chart */\n.chead{position:sticky;top:0;z-index:2;background:var(--head);border-bottom:1px solid var(--line);height:44px}\n.chead svg,#chartBody svg{display:block}\n#chartBody svg{user-select:none;-webkit-user-select:none;touch-action:pan-x pan-y;-webkit-touch-callout:none}\n.grid tbody tr{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}\n.grid td.c-id{cursor:grab}\n.grid tr.rowdrag td{opacity:.45}\n.grid tr.rowhold td{background:var(--sel);transition:background .15s}\nbody.rowdragging, body.rowdragging *{cursor:grabbing !important}\n.dropline{position:absolute;height:0;border-top:3px solid var(--accent);pointer-events:none;z-index:5;display:none}\n.dropline::before{content:\"\";position:absolute;left:-5px;top:-6px;width:9px;height:9px;border-radius:50%;background:var(--accent)}\n.dragghost{position:fixed;z-index:70;pointer-events:none;background:var(--panel);border:1px solid var(--accent);border-radius:4px;padding:4px 10px;font-size:13px;box-shadow:0 6px 18px rgba(0,0,0,.2);font-family:var(--font-c);max-width:320px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.grabbed{filter:drop-shadow(0 0 3px var(--accent))}\n.tlab{font-family:var(--font-c);font-size:11.5px;fill:var(--ink)}\n.tlab.m{fill:var(--muted)}\n.blab{font-family:var(--font-c);font-size:11.5px;fill:var(--muted)}\n.blab.k{fill:var(--ink);font-weight:600}\n[data-drag]{cursor:grab}\n[data-mode=\"resize\"]{cursor:ew-resize}\n.dragging [data-drag]{cursor:grabbing}\n\n/* Status bar */\n.status{display:flex;gap:18px;align-items:center;justify-content:space-between;padding:4px 14px;background:var(--head);border-top:1px solid var(--line);font-size:12px;color:var(--muted);flex-wrap:wrap}\n.status .zm{display:flex;align-items:center;gap:6px}\n.status input[type=range]{width:120px;accent-color:var(--accent)}\n\n/* Tooltip, toast */\n.tip{position:fixed;z-index:50;pointer-events:none;background:var(--panel);border:1px solid var(--line);box-shadow:0 6px 20px rgba(0,0,0,.18);border-radius:4px;padding:8px 10px;font-size:12.5px;max-width:300px;font-family:var(--font-c)}\n.tip[hidden]{display:none}\n.tip h4{margin:0 0 4px;font-size:13.5px;font-family:var(--font)}\n.tip dl{display:grid;grid-template-columns:auto auto;gap:1px 10px;margin:0}\n.tip dt{color:var(--muted)}\n.tip dd{margin:0;font-variant-numeric:tabular-nums}\n.toast{position:fixed;left:50%;bottom:calc(40px + env(safe-area-inset-bottom,0px));transform:translateX(-50%) translateY(20px);opacity:0;pointer-events:none;background:var(--sum);color:var(--panel);padding:9px 14px;border-radius:4px;font-size:13px;max-width:min(560px,90vw);transition:opacity .18s,transform .18s;z-index:60}\n.toast.on{opacity:1;transform:translateX(-50%) translateY(0)}\n.toast.err{background:var(--crit);color:#fff}\n\n/* Dialogs */\ndialog{border:1px solid var(--line);border-radius:6px;padding:0;background:var(--panel);color:var(--ink);width:min(560px,94vw);box-shadow:0 20px 50px rgba(0,0,0,.3)}\ndialog::backdrop{background:rgba(10,20,30,.35)}\n.dh{padding:14px 18px 6px;font-weight:600;font-size:16px}\n.db{padding:6px 18px 12px;display:grid;grid-template-columns:1fr 1fr;gap:10px 14px}\n.db label{display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--muted)}\n.db label.full{grid-column:1/-1}\n.db input,.db select,.db textarea{height:32px;border:1px solid var(--line);border-radius:4px;padding:0 8px;background:var(--panel);color:var(--ink);font-size:13.5px}\n.db textarea{height:auto;min-height:70px;padding:6px 8px;resize:vertical}\n.db label.inl{flex-direction:row;align-items:center;gap:8px;color:var(--ink)}\n.db label.inl input{height:auto}\n.db .hint{grid-column:1/-1;font-size:12px;color:var(--muted);margin:-4px 0 0}\n.df{display:flex;justify-content:flex-end;gap:8px;padding:10px 18px 14px;border-top:1px solid var(--line2)}\n.derr{grid-column:1/-1;color:var(--crit);font-size:12.5px;min-height:1em}\n\n.grid tr.off td{color:var(--muted)}\n.grid tr.off td.c-name span.nt{text-decoration:line-through}\n#dlgTask{width:min(860px,96vw)}\n.tabs{display:flex;gap:2px;padding:0 18px;border-bottom:1px solid var(--line);overflow-x:auto}\n.tab{border:1px solid transparent;border-bottom:0;background:none;padding:7px 12px;font-size:13px;cursor:pointer;border-radius:4px 4px 0 0;margin-bottom:-1px;color:var(--muted);white-space:nowrap}\n.tab:hover{color:var(--ink)}\n.tab[aria-selected=\"true\"]{background:var(--panel);border-color:var(--line);color:var(--ink);font-weight:600;position:relative}\n.tihead{display:grid;grid-template-columns:1fr 120px auto;gap:12px;align-items:end;padding:12px 18px 4px}\n.tabpanel{padding:10px 18px 6px;height:min(420px,56vh);overflow:auto}\n.tabpanel[hidden]{display:none}\n.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px;align-content:start}\n.fl{display:flex;flex-direction:column;gap:3px;font-size:12.5px;color:var(--muted)}\n.fl.full,.full{grid-column:1/-1}\n.fl input,.fl select,.fl textarea{height:32px;border:1px solid var(--line);border-radius:4px;padding:0 8px;background:var(--panel);color:var(--ink);font-size:13.5px}\n.fl input:disabled,.fl select:disabled{opacity:.6}\n.fl textarea{height:100%;min-height:300px;padding:8px;resize:vertical;line-height:1.45}\n.fc{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink);cursor:pointer}\n.fc input{margin:0;accent-color:var(--accent);width:15px;height:15px}\n.fc.dis{color:var(--muted);cursor:default}\n.sect{grid-column:1/-1;font-size:12.5px;font-weight:600;color:var(--ink);border-bottom:1px solid var(--line2);padding:6px 0 3px;margin-top:2px}\n.radios{border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:6px}\n.radios legend{font-size:12.5px;color:var(--muted);padding:0;margin-bottom:4px}\n.glbl{font-size:12.5px;color:var(--muted);margin:2px 0 6px}\n.gwrap{overflow:auto;border:1px solid var(--line);border-radius:3px;max-height:280px}\n.gtab{width:100%;border-collapse:collapse;font-size:13px;min-width:600px;font-family:var(--font-c)}\n.gtab th{position:sticky;top:0;z-index:1;background:var(--head);text-align:left;font-weight:600;font-size:12.5px;padding:5px 6px;border-right:1px solid var(--line);border-bottom:1px solid var(--line);white-space:nowrap}\n.gtab td{border-right:1px dotted var(--line);border-bottom:1px dotted var(--line);padding:0;height:28px}\n.gtab td:focus-within{outline:2px solid var(--accent);outline-offset:-2px}\n.gtab input,.gtab select{border:0;background:transparent;width:100%;height:27px;padding:0 6px;color:var(--ink);font-size:13px;font-family:var(--font-c)}\n.gtab input:focus,.gtab select:focus{outline:none}\n.gtab .rn{width:26px;background:var(--head);text-align:center;color:var(--muted);font-size:11.5px;border-right:1px solid var(--line)}\n.gtab tr.bad td{background:color-mix(in srgb,var(--crit) 12%,transparent)}\n.gtab tr.nonstd select.ptype{color:var(--warn);font-weight:600}\n.gtab .c-x{width:30px;text-align:center}\n.gtab .c-fld{width:160px;padding:0 8px;color:var(--muted);background:var(--hover)}\n.xbtn{width:26px;height:26px;border:0;background:none;border-radius:3px;cursor:pointer;color:var(--muted);display:inline-flex;align-items:center;justify-content:center}\n.xbtn:hover{background:var(--hover);color:var(--crit)}\n.tlegend{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;font-size:12px;color:var(--muted);margin:10px 0 0}\n.tlegend b{color:var(--ink);font-weight:600}\n.tihint{font-size:12px;color:var(--muted);margin:8px 0 0}\n#tErr{padding:0 18px;min-height:1.2em;color:var(--crit);font-size:12.5px}\n@media (max-width:560px){.fgrid{grid-template-columns:1fr}.tihead{grid-template-columns:1fr 100px}}\n@media (max-width:760px){\n  .overview{grid-template-columns:1fr}\n  .mobtabs{display:flex;gap:0;background:var(--panel);border-bottom:1px solid var(--line)}\n  .mobtabs button{flex:1;height:34px;border:0;background:none;border-bottom:2px solid transparent;cursor:pointer;font-weight:500}\n  .mobtabs button[aria-pressed=\"true\"]{border-bottom-color:var(--accent);color:var(--accent)}\n  .splitter{display:none}\n  .split.m-grid .chartpane{display:none}\n  .split.m-grid .gridpane{width:100% !important;flex:1}\n  .split.m-chart .gridpane{display:none}\n  .top{padding:10px 12px 6px}\n  .overview{padding:4px 12px 8px}\n}\n@media (prefers-reduced-motion: reduce){.toast{transition:none}}\n";
const G_MARKUP = "<div class=\"app\">\n  <header class=\"top\">\n    <div class=\"ttl\">\n      <h1 id=\"pTitle\"></h1>\n      <p id=\"pSub\" hidden=\"\"></p>\n    </div>\n    <div class=\"actions\">\n      <span class=\"savestate\" id=\"saveState\"></span>\n      <button class=\"btn\" id=\"bUndo\" title=\"Deshacer (Ctrl+Z)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><path d=\"M5 3 2 6l3 3\"></path><path d=\"M2 6h7.5a4 4 0 0 1 0 8H7\"></path></svg>Deshacer</button>\n      <button class=\"btn\" id=\"bRedo\" title=\"Rehacer (Ctrl+Y)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\"><path d=\"m11 3 3 3-3 3\"></path><path d=\"M14 6H6.5a4 4 0 0 0 0 8H9\"></path></svg>Rehacer</button>\n      <button class=\"btn primary\" id=\"bSave\" title=\"Publica una nueva versi\u00f3n de esta carta Gantt con los cambios\">Guardar versi\u00f3n</button>\n    </div>\n  </header>\n\n  <section class=\"overview\" aria-label=\"Resumen del proyecto\">\n    <div class=\"stats\" id=\"stats\"></div>\n    <svg id=\"strip\" role=\"img\" aria-label=\"Franja del proyecto con avance, fecha de estado e hitos clave\"></svg>\n  </section>\n\n  <nav class=\"ribbon\" aria-label=\"Herramientas\">\n    <div class=\"grp\"><div class=\"row\">\n      <button class=\"rb\" data-act=\"addTask\" title=\"Insertar tarea (Insert)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><rect x=\"2\" y=\"5\" width=\"9\" height=\"6\" rx=\"1\"></rect><path d=\"M13 3v4M11 5h4\"></path></svg>Tarea</button>\n      <button class=\"rb\" data-act=\"addMilestone\" title=\"Insertar hito\"><svg viewBox=\"0 0 16 16\" fill=\"currentColor\"><path d=\"M7 2.5 11.5 7 7 11.5 2.5 7z\"></path><path d=\"M13 9v5M10.5 11.5h5\" stroke=\"currentColor\" stroke-width=\"1.5\"></path></svg>Hito</button>\n      <button class=\"rb\" data-act=\"del\" title=\"Eliminar tarea (Supr)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 9h5.6l.7-9\"></path></svg>Eliminar</button>\n      <button class=\"rb\" data-act=\"info\" title=\"Informaci\u00f3n de la tarea (doble clic en el Id)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><circle cx=\"8\" cy=\"8\" r=\"6\"></circle><path d=\"M8 7.2V11.5M8 4.6v.2\"></path></svg>Informaci\u00f3n</button>\n      <button class=\"rb\" data-act=\"copy\" title=\"Copiar tareas seleccionadas con sus subtareas (Ctrl+C)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><rect x=\"5\" y=\"5\" width=\"8.5\" height=\"9\" rx=\"1\"></rect><path d=\"M3.5 11V3a1 1 0 0 1 1-1H10\"></path></svg>Copiar</button>\n      <button class=\"rb\" data-act=\"cut\" title=\"Cortar tareas seleccionadas (Ctrl+X)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><circle cx=\"4.5\" cy=\"12\" r=\"2\"></circle><circle cx=\"11.5\" cy=\"12\" r=\"2\"></circle><path d=\"M6 10.5 12 2M10 10.5 4 2\"></path></svg>Cortar</button>\n      <button class=\"rb\" data-act=\"paste\" title=\"Pegar sobre la fila seleccionada (Ctrl+V)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><rect x=\"3\" y=\"3\" width=\"10\" height=\"11.5\" rx=\"1\"></rect><path d=\"M6 3V1.8h4V3M5.5 7.5h5M5.5 10.5h5\"></path></svg>Pegar</button>\n    </div><div class=\"cap\">Tarea</div></div>\n\n    <div class=\"grp\"><div class=\"row\">\n      <button class=\"rb\" data-act=\"outdent\" title=\"Disminuir nivel (Alt+May\u00fas+\u2190)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M7 4h7M7 8h7M7 12h7M5 5.5 2.5 8 5 10.5\"></path></svg>Subir nivel</button>\n      <button class=\"rb\" data-act=\"indent\" title=\"Aumentar nivel (Alt+May\u00fas+\u2192)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M7 4h7M7 8h7M7 12h7M2.5 5.5 5 8l-2.5 2.5\"></path></svg>Bajar nivel</button>\n      <button class=\"rb\" data-act=\"link\" title=\"Vincular las tareas seleccionadas (fin a comienzo)\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M6.5 9.5 9.5 6.5\"></path><path d=\"M7 4.5 8.5 3a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5 7.5 13A2.5 2.5 0 0 1 4 9.5L5.5 8\"></path></svg>Vincular</button>\n      <button class=\"rb\" data-act=\"unlink\" title=\"Quitar v\u00ednculos de las tareas seleccionadas\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M7 4.5 8.5 3a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5 7.5 13A2.5 2.5 0 0 1 4 9.5L5.5 8M2 2l12 12\"></path></svg>Desvincular</button>\n    </div><div class=\"cap\">Esquema y v\u00ednculos</div></div>\n\n    <div class=\"grp\"><div class=\"row\">\n      <select class=\"sel\" id=\"selTable\" aria-label=\"Tabla\"><option value=\"entrada\">Tabla: Entrada</option><option value=\"seguimiento\">Tabla: Seguimiento</option><option value=\"variacion\">Tabla: Variaci\u00f3n</option><option value=\"edt\">Tabla: EDT</option><option value=\"cobro\">Tabla: Cobros por partida (EP)</option></select>\n      <select class=\"sel\" id=\"selFilter\" aria-label=\"Filtro\"><option value=\"all\">Todas las tareas</option><option value=\"crit\">Tareas cr\u00edticas</option><option value=\"mil\">Hitos</option><option value=\"late\">Tareas atrasadas</option><option value=\"prog\">Tareas en curso</option><option value=\"open\">Tareas no completadas</option><option value=\"over\">Partidas con sobrecobro</option></select>\n      <select class=\"sel\" id=\"selDurU\" aria-label=\"Unidad de duraci\u00f3n\" title=\"Mostrar y escribir las duraciones en d\u00edas h\u00e1biles (lunes a viernes sin feriados) o en d\u00edas corridos (calendario). Las fechas no cambian.\"><option value=\"hab\">Duraci\u00f3n: d\u00edas h\u00e1biles</option><option value=\"cor\">Duraci\u00f3n: d\u00edas corridos</option></select>\n      <select class=\"sel\" id=\"selOutline\" aria-label=\"Mostrar esquema\"><option value=\"\">Esquema\u2026</option><option value=\"99\">Todas las subtareas</option><option value=\"1\">Nivel 1</option><option value=\"2\">Nivel 2</option><option value=\"3\">Nivel 3</option></select>\n    </div><div class=\"cap\">Datos</div></div>\n\n    <div class=\"grp\"><div class=\"row\">\n      <select class=\"sel\" id=\"selZoom\" aria-label=\"Escala de tiempo\"><option value=\"dias\">D\u00edas</option><option value=\"semanas\">Semanas</option><option value=\"meses\">Meses</option><option value=\"trimestres\">Trimestres</option><option value=\"anos\">A\u00f1os</option></select>\n      <button class=\"rb\" data-act=\"goTask\" title=\"Desplazar el Gantt a la tarea seleccionada\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><rect x=\"5\" y=\"6\" width=\"9\" height=\"4\" rx=\"1\"></rect><path d=\"M1.5 8H4M3 6.5 4.5 8 3 9.5\"></path></svg>Ir a tarea</button>\n      <button class=\"rb\" data-act=\"goStatus\" title=\"Desplazar el Gantt a la fecha de estado\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M8 1.5v13\"></path><rect x=\"2\" y=\"5\" width=\"4\" height=\"3\" rx=\".5\"></rect><rect x=\"9\" y=\"9\" width=\"5\" height=\"3\" rx=\".5\"></rect></svg>Fecha de estado</button>\n    </div><div class=\"cap\">Escala de tiempo</div></div>\n\n    <div class=\"grp\"><div class=\"row\">\n      <label class=\"chk\"><input type=\"checkbox\" id=\"cbCrit\">Ruta cr\u00edtica</label>\n      <label class=\"chk\"><input type=\"checkbox\" id=\"cbBase\">L\u00ednea base</label>\n      <label class=\"chk\"><input type=\"checkbox\" id=\"cbLinks\">V\u00ednculos</label>\n      <label class=\"chk\"><input type=\"checkbox\" id=\"cbSlack\">Holgura</label>\n    </div><div class=\"cap\">Formato de barras</div></div>\n\n    <div class=\"grp\"><div class=\"row\">\n      <button class=\"rb\" data-act=\"setBaseline\" title=\"Guarda las fechas actuales como l\u00ednea base\">Establecer l\u00ednea base</button>\n      <button class=\"rb\" data-act=\"project\" title=\"Nombre, fecha de comienzo, fecha de estado y feriados\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><rect x=\"2\" y=\"3\" width=\"12\" height=\"11\" rx=\"1\"></rect><path d=\"M2 6.5h12M5 1.5v3M11 1.5v3\"></path></svg>Proyecto y calendario</button>\n      <div class=\"dropwrap\">\n        <button class=\"rb\" id=\"bExport\" aria-haspopup=\"true\" aria-expanded=\"false\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M8 2v8M5 7l3 3 3-3M3 12.5h10\"></path></svg>Exportar</button>\n        <div class=\"menu\" id=\"mExport\" hidden=\"\">\n          <button data-exp=\"pdf\">PDF de la carta Gantt<small>Tabla y barras, listo para imprimir</small></button>\n          <button data-exp=\"xml\">XML de MS Project<small>Se abre en Microsoft Project (Archivo \u203a Abrir)</small></button>\n          <button data-exp=\"csv\">CSV para Excel<small>Tabla con fechas, avance y l\u00ednea base</small></button>\n          <button data-exp=\"json\">Respaldo JSON<small>Se puede volver a importar aqu\u00ed</small></button>\n        </div>\n      </div>\n      <button class=\"rb\" data-act=\"import\" title=\"Cargar un respaldo JSON\"><svg viewBox=\"0 0 16 16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\"><path d=\"M8 10V2M5 5l3-3 3 3M3 12.5h10\"></path></svg>Importar</button>\n    </div><div class=\"cap\">Proyecto</div></div>\n  </nav>\n\n  <div class=\"banner\" id=\"banner\" hidden=\"\"></div>\n  <div class=\"cbar\" id=\"cbar\" aria-label=\"Cobros por partida\">\n    <span class=\"lg\"><i style=\"background:var(--prog)\"></i>Cobrado</span>\n    <span class=\"lg\"><i style=\"background:var(--crit)\"></i>Cobrado sobre el avance (sobrecobro)</span>\n    <span class=\"lg\"><i class=\"tk\"></i>Avance f\u00edsico real</span>\n    <span id=\"cbInfo\"></span>\n    <span class=\"sp\"></span>\n    <select id=\"cbUnit\" aria-label=\"Moneda\"><option value=\"$\">Montos en $</option><option value=\"UF\">Montos en UF</option></select>\n    <button class=\"btn\" type=\"button\" id=\"cbImport\" title=\"Carga el EP por partida desde un CSV (Id o EDT; Monto total; Cobrado acumulado)\">Cargar EP (CSV)</button>\n  </div>\n  <input type=\"file\" id=\"cbFile\" accept=\".csv,.txt,text/csv\" hidden>\n\n  <div class=\"mobtabs\" role=\"group\" aria-label=\"Vista\">\n    <button data-pane=\"grid\" aria-pressed=\"true\">Tabla</button>\n    <button data-pane=\"chart\" aria-pressed=\"false\">Gantt</button>\n  </div>\n\n  <main class=\"split m-grid\" id=\"split\">\n    <section class=\"gridpane\" id=\"gridPane\" aria-label=\"Tabla de tareas\"><table class=\"grid\" id=\"grid\"></table></section>\n    <div class=\"splitter\" id=\"splitter\" role=\"separator\" aria-orientation=\"vertical\" aria-label=\"Ajustar divisi\u00f3n\" tabindex=\"0\"></div>\n    <section class=\"chartpane\" id=\"chartPane\" aria-label=\"Diagrama de Gantt\">\n      <div class=\"chead\" id=\"chartHead\"></div>\n      <div id=\"chartBody\"></div>\n    </section>\n  </main>\n\n  <footer class=\"status\" id=\"statusBar\">\n    <span id=\"sbLeft\"></span>\n    <span id=\"sbMid\"></span>\n    <span class=\"zm\"><span>Escala</span><input type=\"range\" id=\"zoomRange\" min=\"0\" max=\"4\" step=\"1\" aria-label=\"Escala de tiempo\"></span>\n  </footer>\n</div>\n\n<div id=\"tip\" class=\"tip\" hidden=\"\"></div>\n<div id=\"toast\" class=\"toast\" role=\"status\" aria-live=\"polite\"></div>\n\n<dialog id=\"dlgTask\" aria-labelledby=\"dtH\">\n  <form method=\"dialog\" id=\"fTask\" novalidate=\"\">\n    <div class=\"dh\" id=\"dtH\">Informaci\u00f3n de la tarea</div>\n    <div class=\"tabs\" role=\"tablist\" aria-label=\"Secciones\">\n      <button type=\"button\" class=\"tab\" role=\"tab\" data-tab=\"general\">General</button>\n      <button type=\"button\" class=\"tab\" role=\"tab\" data-tab=\"pred\">Predecesoras</button>\n      <button type=\"button\" class=\"tab\" role=\"tab\" data-tab=\"rec\">Recursos</button>\n      <button type=\"button\" class=\"tab\" role=\"tab\" data-tab=\"adv\">Avanzado</button>\n      <button type=\"button\" class=\"tab\" role=\"tab\" data-tab=\"notes\">Notas</button>\n      <button type=\"button\" class=\"tab\" role=\"tab\" data-tab=\"custom\">Campos pers.</button>\n    </div>\n    <div class=\"tihead\">\n      <label class=\"fl\">Nombre<input id=\"tName\"></label>\n      <label class=\"fl\" id=\"tDurLbl\">Duraci\u00f3n<input id=\"tDur\" placeholder=\"20 d\u00edas\"></label>\n      <label class=\"fc\" style=\"height:32px\"><input type=\"checkbox\" id=\"tEst\">Estimada</label>\n    </div>\n\n    <div class=\"tabpanel\" role=\"tabpanel\" data-panel=\"general\">\n      <div class=\"fgrid\">\n        <label class=\"fl\">Porcentaje completado<input id=\"tPct\" type=\"number\" min=\"0\" max=\"100\" step=\"1\"></label>\n        <label class=\"fl\">Prioridad<input id=\"tPrio\" type=\"number\" min=\"0\" max=\"1000\" step=\"1\"></label>\n        <fieldset class=\"radios\"><legend>Modo de programaci\u00f3n</legend>\n          <label class=\"fc\"><input type=\"radio\" name=\"tMode\" value=\"manual\">Programada manualmente</label>\n          <label class=\"fc\"><input type=\"radio\" name=\"tMode\" value=\"auto\">Programada autom\u00e1ticamente</label>\n        </fieldset>\n        <div style=\"align-self:end\"><label class=\"fc\"><input type=\"checkbox\" id=\"tInactive\">Inactiva</label></div>\n        <div class=\"sect\">Fechas</div>\n        <label class=\"fl\">Inicio<input id=\"tStart\" type=\"date\"></label>\n        <label class=\"fl\">Fin<input id=\"tFinish\" type=\"date\"></label>\n        <div class=\"sect\"></div>\n        <label class=\"fc full\"><input type=\"checkbox\" id=\"tKey\">Mostrar en escala de tiempo</label>\n        <label class=\"fc full\"><input type=\"checkbox\" id=\"tHide\">Ocultar barra</label>\n        <label class=\"fc full dis\"><input type=\"checkbox\" id=\"tSum\" disabled=\"\">Resumida</label>\n      </div>\n    </div>\n\n    <div class=\"tabpanel\" role=\"tabpanel\" data-panel=\"pred\" hidden=\"\">\n      <div class=\"glbl\">Predecesoras (puede tener varias; escribe el Id o elige la tarea por su nombre):</div>\n      <div class=\"gwrap\"><table class=\"gtab\">\n        <thead><tr><th class=\"rn\"></th><th style=\"width:70px\">Id</th><th>Nombre de tarea</th><th style=\"width:210px\">Tipo</th><th style=\"width:80px\">Pos</th><th class=\"c-x\"><span class=\"sr\">Quitar</span></th></tr></thead>\n        <tbody id=\"tPredRows\"></tbody>\n      </table></div>\n      <div class=\"tlegend\">\n        <b>FC</b><span>Fin a comienzo: el final de la predecesora marca el comienzo de esta tarea. Es la dependencia normal.</span>\n        <b>CC</b><span>Comienzo a comienzo: ambas tareas comienzan a la vez, el mismo d\u00eda.</span>\n        <b>FF</b><span>Fin a fin: ambas tareas terminan en la misma fecha, a la vez.</span>\n        <b>CF</b><span>Comienzo a fin: el comienzo de la predecesora marca el final de esta tarea. Es el caso menos frecuente.</span>\n      </div>\n      <p class=\"tihint\">Pos es la posposici\u00f3n en d\u00edas laborables: 5d atrasa, -5d adelanta.</p>\n    </div>\n\n    <div class=\"tabpanel\" role=\"tabpanel\" data-panel=\"rec\" hidden=\"\">\n      <div class=\"glbl\">Recursos asignados:</div>\n      <div class=\"gwrap\"><table class=\"gtab\">\n        <thead><tr><th class=\"rn\"></th><th>Nombre del recurso</th><th style=\"width:120px\">Unidades (%)</th><th class=\"c-x\"><span class=\"sr\">Quitar</span></th></tr></thead>\n        <tbody id=\"tResRows\"></tbody>\n      </table></div>\n      <datalist id=\"resList\"></datalist>\n      <p class=\"tihint\">Los nombres aparecen junto a la barra del Gantt y en la columna Nombres de los recursos.</p>\n    </div>\n\n    <div class=\"tabpanel\" role=\"tabpanel\" data-panel=\"adv\" hidden=\"\">\n      <div class=\"fgrid\">\n        <div class=\"sect\">Delimitar tarea</div>\n        <label class=\"fl full\">Fecha l\u00edmite<input id=\"tDeadline\" type=\"date\"></label>\n        <label class=\"fl\">Tipo de restricci\u00f3n<select id=\"tCType\">\n          <option value=\"ASAP\">Lo antes posible</option><option value=\"SNET\">No comenzar antes del</option><option value=\"SNLT\">No comenzar despu\u00e9s del</option>\n          <option value=\"FNET\">No finalizar antes del</option><option value=\"FNLT\">No finalizar despu\u00e9s del</option><option value=\"MSO\">Debe comenzar el</option><option value=\"MFO\">Debe finalizar el</option></select></label>\n        <label class=\"fl\">Fecha de restricci\u00f3n<input id=\"tCDate\" type=\"date\"></label>\n        <div class=\"sect\"></div>\n        <label class=\"fl\">Tipo de tarea<select id=\"tType\"><option value=\"units\">Unidades fijas</option><option value=\"duration\">Duraci\u00f3n fija</option><option value=\"work\">Trabajo fijo</option></select></label>\n        <div style=\"align-self:end\"><label class=\"fc\"><input type=\"checkbox\" id=\"tEffort\">Condicionada por el esfuerzo</label></div>\n        <label class=\"fl\">Calendario<select id=\"tCal\"><option value=\"std\">Calendario del proyecto (L-V)</option></select></label>\n        <div style=\"align-self:end\"><label class=\"fc\"><input type=\"checkbox\" id=\"tIgnRes\">La programaci\u00f3n omite los calendarios de recursos</label></div>\n        <label class=\"fl\">C\u00f3digo EDT<input id=\"tWbs\" readonly=\"\"></label>\n        <label class=\"fl\">M\u00e9todo del valor acumulado<select id=\"tEvm\"><option value=\"pct\">% completado</option><option value=\"phys\">% completado f\u00edsico</option></select></label>\n        <label class=\"fc full\"><input type=\"checkbox\" id=\"tMil\">Marcar la tarea como hito</label>\n      </div>\n    </div>\n\n    <div class=\"tabpanel\" role=\"tabpanel\" data-panel=\"notes\" hidden=\"\">\n      <label class=\"fl full\" style=\"height:100%\">Notas<textarea id=\"tNotes\"></textarea></label>\n    </div>\n\n    <div class=\"tabpanel\" role=\"tabpanel\" data-panel=\"custom\" hidden=\"\">\n      <div class=\"glbl\">Campos personalizados:</div>\n      <div class=\"gwrap\" style=\"max-height:none\"><table class=\"gtab\">\n        <thead><tr><th style=\"width:160px\">Campo</th><th>Valor</th></tr></thead>\n        <tbody id=\"tCustRows\"></tbody>\n      </table></div>\n    </div>\n\n    <div id=\"tErr\" role=\"alert\"></div>\n    <div class=\"df\"><button type=\"button\" class=\"btn\" id=\"tCancel\">Cancelar</button><button class=\"btn primary\" value=\"ok\" id=\"tOk\">Aceptar</button></div>\n  </form>\n</dialog>\n\n<dialog id=\"dlgProj\" aria-labelledby=\"dpH\">\n  <form method=\"dialog\" id=\"fProj\">\n    <div class=\"dh\" id=\"dpH\">Proyecto y calendario</div>\n    <div class=\"db\">\n      <label class=\"full\">T\u00edtulo<input id=\"pTitleIn\"></label>\n      <label class=\"full\">Nombre del archivo del proyecto<input id=\"pNameIn\"></label>\n      <label class=\"full\">Revisi\u00f3n<input id=\"pRevIn\"></label>\n      <label>Fecha de comienzo del proyecto<input id=\"pStartIn\" type=\"date\" required=\"\"></label>\n      <label>Fecha de estado<input id=\"pStatusIn\" type=\"date\" required=\"\"></label>\n      <label class=\"full\">Feriados (uno por l\u00ednea: AAAA-MM-DD Nombre)<textarea id=\"pHolIn\" placeholder=\"2026-12-25 Navidad\"></textarea></label>\n      <p class=\"hint\">Calendario est\u00e1ndar: lunes a viernes, 8 horas por d\u00eda. Los feriados se descuentan de las duraciones y posposiciones.</p>\n      <div class=\"derr\" id=\"pErr\"></div>\n    </div>\n    <div class=\"df\"><button class=\"btn\" value=\"cancel\" formnovalidate=\"\">Cancelar</button><button class=\"btn primary\" value=\"ok\">Aceptar</button></div>\n  </form>\n</dialog>\n\n<dialog id=\"dlgPdf\" aria-labelledby=\"dfH\">\n  <form method=\"dialog\" id=\"fPdf\">\n    <div class=\"dh\" id=\"dfH\">Exportar PDF</div>\n    <div class=\"db\">\n      <label>Tama\u00f1o de hoja (horizontal)<select id=\"pdfSize\"><option value=\"a3\">A3</option><option value=\"a4\">A4</option><option value=\"letter\">Carta</option><option value=\"legal\">Oficio</option></select></label>\n      <label>Tareas<select id=\"pdfScope\"><option value=\"vis\">Las que se ven ahora (filtro y esquema)</option><option value=\"all\">Todas las tareas</option></select></label>\n      <label class=\"inl\"><input type=\"checkbox\" id=\"pdfBase\">L\u00ednea base</label>\n      <label class=\"inl\"><input type=\"checkbox\" id=\"pdfCrit\">Ruta cr\u00edtica en rojo</label>\n      <label class=\"inl\"><input type=\"checkbox\" id=\"pdfLinks\">V\u00ednculos entre tareas</label>\n      <label class=\"inl\"><input type=\"checkbox\" id=\"pdfProg\">Avance (% completado)</label>\n      <p class=\"hint\">La escala de tiempo se ajusta al ancho de la hoja. Si hay m\u00e1s tareas de las que caben, el PDF contin\u00faa en p\u00e1ginas siguientes.</p>\n      <div class=\"derr\" id=\"pdfErr\"></div>\n    </div>\n    <div class=\"df\"><button class=\"btn\" value=\"cancel\" formnovalidate=\"\">Cancelar</button><button class=\"btn primary\" value=\"ok\" id=\"pdfOk\">Descargar PDF</button></div>\n  </form>\n</dialog>\n\n<dialog id=\"dlgAsk\" aria-labelledby=\"daH\">\n  <form method=\"dialog\">\n    <div class=\"dh\" id=\"daH\">Confirmar</div>\n    <div class=\"db\"><p class=\"full\" id=\"askMsg\" style=\"grid-column:1/-1;margin:0;line-height:1.5;white-space:pre-line\"></p></div>\n    <div class=\"df\"><button class=\"btn\" value=\"cancel\" id=\"askCancel\">Cancelar</button><button class=\"btn primary\" value=\"ok\" id=\"askOk\">Aceptar</button></div>\n  </form>\n</dialog>\n\n<input type=\"file\" id=\"fileIn\" accept=\".json,application/json\" hidden=\"\">\n\n";
const SKEL = "<!doctype html><html><head><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#faf9f5;color:#141413}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>";
const FONTS = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Semi+Condensed:wght@400;500;600&display=swap" rel="stylesheet">';
const JSPDF = '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>';
(function inject(){
  const st=document.createElement('style'); st.id='g-css'; st.textContent=G_CSS; document.head.appendChild(st);
  const host=document.createElement('div'); host.innerHTML=G_MARKUP;
  const ref=document.getElementById('project-data');
  while(host.firstChild) document.body.insertBefore(host.firstChild, ref);
})();
function buildPage(json, title){
  const src=document.getElementById('g-engine').textContent;
  const t=String(title||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
  return SKEL+'<title>Carta Gantt de seguimiento – '+t+'</title>\n'+FONTS+'\n'+JSPDF+'\n'
    +'<script type="application/json" id="project-data">'+json+'<\/script>\n'
    +'<script id="g-engine">'+src+'<\/script>\n</body></html>';
}

/* ---------- Fechas y calendario ---------- */
const DAY = 86400000;
const DN0 = Math.floor(Date.UTC(2015,0,1)/DAY), DN1 = Math.floor(Date.UTC(2045,11,31)/DAY);
const MON = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DOWS = ['dom','lun','mar','mié','jue','vie','sáb'];
const RH = 28;
const p2 = n => String(n).padStart(2,'0');
const dny = (y,m,d) => Math.floor(Date.UTC(y,m,d)/DAY);
function toDN(s){ if(!s) return null; const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); return m? dny(+m[1],+m[2]-1,+m[3]) : null; }
function iso(dn){ return new Date(dn*DAY).toISOString().slice(0,10); }
function parts(dn){ const d=new Date(dn*DAY); return {y:d.getUTCFullYear(), m:d.getUTCMonth(), d:d.getUTCDate(), w:d.getUTCDay()}; }
function fD(dn){ if(dn==null) return ''; const p=parts(dn); return `${DOWS[p.w]} ${p2(p.d)}/${p2(p.m+1)}/${String(p.y).slice(2)}`; }
function fL(dn){ if(dn==null) return ''; const p=parts(dn); return `${p2(p.d)}/${p2(p.m+1)}/${p.y}`; }
function todayISO(){ const d=new Date(); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`; }
const esc = s => String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let HOL = new Set(), WORK = [], CUM = null;
function isWork(dn){ const w=(dn+4)%7; /* 0=dom */ return w!==0 && w!==6 && !HOL.has(dn); }
function buildCal(){
  HOL = new Set((P.holidays||[]).map(h=>toDN(h.date)).filter(x=>x!=null));
  WORK = []; CUM = new Int32Array(DN1-DN0+2);
  for(let dn=DN0; dn<=DN1; dn++){ CUM[dn-DN0]=WORK.length; if(isWork(dn)) WORK.push(dn); }
  CUM[DN1-DN0+1] = WORK.length;
}
function idxOf(dn){ dn=Math.max(DN0,Math.min(DN1+1,dn)); return CUM[dn-DN0]; }      // límite al inicio del día (o del siguiente día laborable)
function endB(dn){ return idxOf(dn)+(isWork(dn)?1:0); }                              // límite al final del día
function dnOf(i){ i=Math.max(0,Math.min(WORK.length-1,i)); return WORK[i]; }

/* ---------- Proyecto base (carta Gantt 08/08/2025 + hito nuevo) ---------- */
// [nivel, nombre, duración, predecesoras (Id), LB comienzo, LB fin, restricción, fecha restricción]
const DEFAULT_VIEW = {zoom:'meses', table:'entrada', filter:'all', crit:true, base:true, links:true, slack:false, split:0.52, durUnit:'hab'};
/* Unidad para mostrar y escribir duraciones: 'hab' días hábiles (la programación) o 'cor' días corridos (calendario).
   La programación sigue en días hábiles; en corridos, la duración es el plazo de calendario entre comienzo y fin. */
const isCor = () => P && P.view && P.view.durUnit==='cor';
const calDays = t => t.dur===0 && !t.isSum ? 0 : (t.fDn - t.sDn + 1);
const dispDur = t => isCor()? calDays(t) : t.dur;
const unitTxt = () => isCor()? 'corridos' : 'hábiles';
function parseDurU(v){ const m=/^\s*(-?\d+(?:[.,]\d+)?)\s*(d|días|dias|día|dia|s|sem|semanas?|ms|mes|meses)?\s*$/i.exec(String(v)); if(!m) return null;
  let n=parseFloat(m[1].replace(',','.')); const u=(m[2]||'d').toLowerCase(); if(u.startsWith('s')) n*=isCor()?7:5; else if(u.startsWith('m')) n*=isCor()?30:20; return Math.round(n); }
/* días corridos -> días hábiles, manteniendo el comienzo: el fin cae en comienzo + N − 1 (o el día hábil anterior) */
function corToHab(startIdx, n){ if(n<=0) return 0; const d0=dnOf(startIdx); return Math.max(1, endB(d0+n-1)-startIdx); }
function seedProject(){
  const t0=todayISO();
  const tasks=[{uid:1, level:1, name:'Nuevo proyecto', dur:20, preds:[], cType:'ASAP', cDate:'', pct:0, resp:'', notes:'', deadline:'', key:false, bs:'', bf:'', collapsed:false},
               {uid:2, level:2, name:'Primera tarea', dur:20, preds:[], cType:'SNET', cDate:t0, pct:0, resp:'', notes:'', deadline:'', key:false, bs:'', bf:'', collapsed:false}];
  P = { id:'', title:'Nuevo proyecto', name:'', rev:'', startDate:t0, statusDate:t0, holidays:[], baselineLabel:'', tasks, nextUid:3, savedAt:null, view:{...DEFAULT_VIEW} };
  tasks.forEach(fillDefaults);
}

/* ---------- Estado ---------- */
let P = null, byUid = new Map(), VIS = [], PSTART = 0, PEND = 0;
let selUid = null, selSet = new Set(), anchorUid = null;
let UNDO = [], REDO = [], dirty = false;
let ART = null, DL = null, readOnly = false;
let DRAFT_KEY = 'gantt-draft-v1';

const KEEP = ['uid','level','name','dur','preds','cType','cDate','cAuto','pct','resp','notes','deadline','key','bs','bf','collapsed',
  'est','prio','manual','mStart','inactive','hideBar','taskType','effort','evm','ignoreResCal','resources','custom'];
function cleanP(){
  return { id:P.id||'', title:P.title, name:P.name, rev:P.rev, startDate:P.startDate, statusDate:P.statusDate, holidays:P.holidays,
    baselineLabel:P.baselineLabel, nextUid:P.nextUid, savedAt:P.savedAt, view:P.view, epUnit:P.epUnit||'$',
    tasks:P.tasks.map(t=>{ const o={}; for(const k of KEEP) o[k]=t[k]; o.preds=(t.preds||[]).map(l=>({uid:l.uid,type:l.type,lag:l.lag})); return o; }) };
}
function fillDefaults(t){
  if(t.prio==null) t.prio=500;
  if(!Array.isArray(t.resources)) t.resources = t.resp? parseResTxt(t.resp) : [];
  if(!t.custom || typeof t.custom!=='object') t.custom={};
  if(!t.taskType) t.taskType='units'; if(!t.evm) t.evm='pct';
  if(t.effort==null) t.effort=false;
  return t;
}
function parseResTxt(txt){ return String(txt||'').split(/[,;]/).map(x=>x.trim()).filter(Boolean).map(x=>{ const m=/^(.*?)\s*\[(\d+)\s*%\]$/.exec(x); return m? {name:m[1].trim(), units:+m[2]} : {name:x, units:100}; }); }
function resLabel(list){ return (list||[]).map(r=> r.units!=null && +r.units!==100 ? `${r.name}[${r.units}%]` : r.name).join(', '); }
function normalize(p){
  p.view = Object.assign({...DEFAULT_VIEW}, p.view||{});
  p.holidays = Array.isArray(p.holidays)? p.holidays : []; if(!p.epUnit) p.epUnit='$'; if(p.view.table==='ep') p.view.table='cobro';
  p.tasks.forEach(t=>{ fillDefaults(t); t.preds=Array.isArray(t.preds)?t.preds:[]; t.pct=+t.pct||0; t.dur=+t.dur||0; t.level=Math.max(1,+t.level||1); t.cType=t.cType||'ASAP'; });
  if(!p.nextUid) p.nextUid = Math.max(0,...p.tasks.map(t=>t.uid))+1;
  return p;
}

/* ---------- Estructura (esquema) ---------- */
function structure(){
  const T=P.tasks, stack=[];
  T.forEach((t,i)=>{
    t.i=i; t.row=i+1; t.isSum = i+1<T.length && T[i+1].level>t.level;
    while(stack.length && T[stack[stack.length-1]].level>=t.level) stack.pop();
    t.parent = stack.length? stack[stack.length-1] : -1; stack.push(i);
  });
  T.forEach(t=>t.kids=[]); T.forEach(t=>{ if(t.parent>=0) T[t.parent].kids.push(t.i); });
  T.forEach(t=>{ t.off = !!t.inactive || (t.parent>=0 && T[t.parent].off); });
  const cnt=[]; T.forEach(t=>{ cnt.length=t.level; cnt[t.level-1]=(cnt[t.level-1]||0)+1; t.wbs=Array.from({length:t.level},(_,k)=>cnt[k]||1).join('.'); });
  byUid = new Map(T.map(t=>[t.uid,t]));
}
function subtreeEnd(i){ const T=P.tasks; let j=i; while(j+1<T.length && T[j+1].level>T[i].level) j++; return j; }
function leavesOf(t){ if(!t.isSum) return [t]; const out=[]; for(let j=t.i+1;j<=subtreeEnd(t.i);j++) if(!P.tasks[j].isSum) out.push(P.tasks[j]); return out; }
function isAncestor(a,b){ let p=b.parent; while(p>=0){ if(p===a.i) return true; p=P.tasks[p].parent; } return false; }

/* ---------- Predecesoras ---------- */
const TYPE_IN = {FC:'FS',FI:'FS',FS:'FS',CC:'SS',II:'SS',SS:'SS',FF:'FF',CF:'SF',IF:'SF',SF:'SF'};
const TYPE_OUT = {FS:'FC',SS:'CC',FF:'FF',SF:'CF'};
function parsePreds(txt, self){
  const out=[]; if(!txt || !txt.trim()) return {preds:out};
  for(const raw of txt.split(/[;,]/)){
    const s=raw.trim(); if(!s) continue;
    const m=/^(\d+)\s*(FC|FI|CC|II|FF|CF|IF|FS|SS|SF)?\s*(?:([+-])\s*(\d+)\s*(?:d|días|dias|día|dia|days?)?)?$/i.exec(s);
    if(!m) return {err:`No se entiende «${s}». Usa por ejemplo 14FC+10 días.`};
    const q=P.tasks[+m[1]-1]; if(!q) return {err:`La tarea ${m[1]} no existe.`};
    if(self && q.uid===self.uid) return {err:'Una tarea no puede ser su propia predecesora.'};
    if(self && (isAncestor(q,self)||isAncestor(self,q))) return {err:`No se puede vincular la tarea ${q.row} con una tarea de su mismo resumen jerárquico.`};
    const lag = m[4]? (m[3]==='-'?-1:1)*(+m[4]) : 0;
    if(out.some(l=>l.uid===q.uid)) continue;
    out.push({uid:q.uid, type:TYPE_IN[(m[2]||'FC').toUpperCase()], lag});
  }
  return {preds:out};
}
function predText(t){
  return (t.preds||[]).map(l=>{ const q=byUid.get(l.uid); if(!q) return null;
    const code = (l.type!=='FS'||l.lag)? TYPE_OUT[l.type] : '';
    const lag = l.lag? `${l.lag>0?'+':''}${l.lag} ${Math.abs(l.lag)===1?'día':'días'}` : '';
    return `${q.row}${code}${lag}`; }).filter(Boolean).join('; ');
}
function leafLinks(){
  const L=[];
  for(const t of P.tasks) for(const l of t.preds){ const q=byUid.get(l.uid); if(!q) continue;
    const A=leavesOf(q).filter(x=>!x.off), B=leavesOf(t); for(const a of A) for(const b of B) L.push({a,b,type:l.type,lag:l.lag}); }
  return L;
}
function hasCycle(){
  structure();
  const adj=new Map(); for(const e of leafLinks()){ if(!adj.has(e.a.uid)) adj.set(e.a.uid,[]); adj.get(e.a.uid).push(e.b.uid); }
  const col=new Map();
  const dfs=u=>{ col.set(u,1); for(const v of adj.get(u)||[]){ const c=col.get(v); if(c===1) return true; if(!c && dfs(v)) return true; } col.set(u,2); return false; };
  for(const u of adj.keys()) if(!col.get(u) && dfs(u)) return true;
  return false;
}
function setPreds(t, txt){
  const r=parsePreds(txt,t); if(r.err) return r.err;
  if(t.isSum && r.preds.length && !t.preds.length) {/* permitido: se aplica a sus subtareas */}
  const old=t.preds; t.preds=r.preds;
  if(hasCycle()){ t.preds=old; return 'Ese vínculo crearía una referencia circular.'; }
  return null;
}

/* ---------- Programación (CPM) ---------- */
function schedule(){
  buildCal(); structure();
  const T=P.tasks, ps=idxOf(toDN(P.startDate)); PSTART=ps;
  const leaves=T.filter(t=>!t.isSum), sums=T.filter(t=>t.isSum).sort((a,b)=>b.level-a.level);
  for(const t of leaves){ t.dur=Math.max(0,Math.round(+t.dur||0)); t.es=ps; t.ef=ps+t.dur; t.conflict=false; }
  const actK=s=>{ const k=s.kids.filter(k=>!T[k].off); return k.length? k : s.kids; };
  const rollup=()=>{ for(const s of sums){ let a=Infinity,b=-Infinity; for(const k of actK(s)){ const c=T[k]; if(c.es<a)a=c.es; if(c.ef>b)b=c.ef; } s.es=a; s.ef=b; s.dur=b-a; } };
  rollup();
  const chains=new Map(); for(const t of leaves){ const c=[t]; let p=t.parent; while(p>=0){ c.push(T[p]); p=T[p].parent; } chains.set(t,c); }
  for(let it=0; it<400; it++){
    let ch=false;
    for(const t of leaves){
      let s=ps, conflict=false;
      for(const o of chains.get(t)) for(const l of o.preds){
        const q=byUid.get(l.uid); if(!q||q.off) continue;
        if(o!==t && (l.type==='FF'||l.type==='SF')) continue;
        let v; if(l.type==='FS') v=q.ef+l.lag; else if(l.type==='SS') v=q.es+l.lag; else if(l.type==='FF') v=q.ef+l.lag-t.dur; else v=q.es+l.lag-t.dur;
        if(v>s) s=v;
      }
      if(t.manual && t.mStart){ const md=toDN(t.mStart); const mb = t.dur===0? endB(md) : idxOf(md); conflict = s>mb; s=mb; }
      else if(t.cType!=='ASAP' && t.cDate){ const cd=toDN(t.cDate); const sB = t.dur===0? endB(cd) : idxOf(cd), fB=endB(cd);
        switch(t.cType){
          case 'SNET': s=Math.max(s,sB); break;
          case 'FNET': s=Math.max(s,fB-t.dur); break;
          case 'MSO': conflict = s>sB; s=sB; break;
          case 'MFO': conflict = s>fB-t.dur; s=fB-t.dur; break;
          case 'SNLT': conflict = s>sB; break;
          case 'FNLT': conflict = s+t.dur>fB; break;
        } }
      t.conflict=conflict;
      if(s!==t.es){ t.es=s; t.ef=s+t.dur; ch=true; }
    }
    rollup(); if(!ch) break;
  }
  const pe = leaves.length? Math.max(...leaves.map(t=>t.ef)) : ps; PEND=pe;
  const L=leafLinks();
  for(const t of leaves) t.lf=pe;
  for(let it=0; it<400; it++){
    let ch=false;
    for(const e of L){ const a=e.a,b=e.b, bls=b.lf-b.dur; let v;
      if(e.type==='FS') v=bls-e.lag; else if(e.type==='SS') v=bls-e.lag+a.dur; else if(e.type==='FF') v=b.lf-e.lag; else v=b.lf-e.lag+a.dur;
      if(v<a.lf){ a.lf=v; ch=true; } }
    for(const t of leaves){
      if(((t.manual && t.mStart) || ((t.cType==='MSO'||t.cType==='MFO') && t.cDate)) && t.lf>t.ef){ t.lf=t.ef; ch=true; }
      if(!t.manual && t.cDate && (t.cType==='SNLT'||t.cType==='FNLT')){ const cd=toDN(t.cDate); const v = t.cType==='FNLT'? endB(cd) : (t.dur===0? endB(cd) : idxOf(cd))+t.dur; if(v<t.lf){ t.lf=v; ch=true; } }
    }
    if(!ch) break;
  }
  for(const t of leaves){ t.slack=t.lf-t.ef; t.crit=!t.off && t.slack<=0; }
  for(const s of sums){ let m=Infinity; for(const k of actK(s)) m=Math.min(m,T[k].slack); s.slack=m; s.crit=!s.off && m<=0; s.conflict=false; }
  // fechas
  for(const t of T){
    if(t.dur===0){ const b=t.es; t.sDn=t.fDn=dnOf(b>ps? b-1 : b); t.mil=!t.isSum; }
    else { t.sDn=dnOf(t.es); t.fDn=dnOf(t.ef-1); t.mil=false; }
  }
  for(const s of sums){ let a=Infinity,b=-Infinity; for(const k of actK(s)){ a=Math.min(a,T[k].sDn); b=Math.max(b,T[k].fDn); } s.sDn=a; s.fDn=b; }
  // avance y estado
  const sd=toDN(P.statusDate)||toDN(todayISO()), sb=endB(sd);
  for(const t of leaves){ t.pct=Math.max(0,Math.min(100,+t.pct||0)); t.expected = t.dur>0? Math.max(0,Math.min(1,(sb-t.es)/t.dur))*100 : (sb>=t.es?100:0); }
  for(const s of sums){ const lv=leavesOf(s); let w=0,a=0,e=0; for(const l of lv){ const k=pw(l); w+=k; a+=k*l.pct; e+=k*l.expected; }
    if(w){ s.pct=a/w; s.expected=e/w; } else { s.pct=lv.reduce((x,l)=>x+l.pct,0)/(lv.length||1); s.expected=lv.reduce((x,l)=>x+l.expected,0)/(lv.length||1); } }
  for(const t of T){
    t.state = t.pct>=99.5? 'Completada' : (t.expected-t.pct>0.5? 'Atrasada' : (t.pct>0? 'En curso' : 'Pendiente'));
    t.dlMiss = !!(t.deadline && toDN(t.deadline)!=null && t.fDn>toDN(t.deadline));
    t.vs = t.bs? idxOf(t.sDn)-idxOf(toDN(t.bs)) : null;
    t.vf = t.bf? idxOf(t.fDn)-idxOf(toDN(t.bf)) : null;
  }
  computeCobro();
}
/* ---------- Cobros por partida (EP) ---------- */
const cNum=v=>{ if(v==null||v==='') return null; const n=+v; return isFinite(n)? n : null; };
function computeCobro(){
  const T=P.tasks; let any=false;
  for(const t of T){ if(t.isSum) continue; const c=t.custom||{}; const tot=cNum(c.EP_Total), cob=cNum(c.EP_Cobrado), pc=cNum(c.EP_Pct);
    t.cTot=tot&&tot>0? tot : null; t.cCob=cob; t.cPct = t.cTot&&cob!=null? cob/t.cTot*100 : (pc!=null? pc : (cob===0? 0 : null));
    if(t.cPct!=null && t.cTot && t.cCob==null) t.cCob=t.cTot*t.cPct/100;
    t.cAv = t.cTot? t.cTot*t.pct/100 : null; if(t.cPct!=null) any=true; }
  const sums=T.filter(t=>t.isSum).sort((a,b)=>b.level-a.level);
  for(const s of sums){ const lv=leavesOf(s).filter(l=>!l.off); let tot=0,cob=0,av=0,nAmt=0, w=0,wp=0,wf=0, nP=0;
    for(const l of lv){ if(l.cTot){ tot+=l.cTot; av+=l.cAv; if(l.cCob!=null){ cob+=l.cCob; nAmt++; } }
      if(l.cPct!=null){ const k=l.dur||1; w+=k; wp+=k*l.cPct; wf+=k*l.pct; nP++; } }
    s.cTot=tot||null; s.cCob=nAmt? cob : null; s.cAv=tot? av : null;
    s.cPct = s.cTot&&s.cCob!=null? s.cCob/s.cTot*100 : (nP&&w? wp/w : null); s._wf = s.cTot? av/s.cTot*100 : (nP&&w? wf/w : null); }
  let totS=0, nOver=0;
  for(const t of T){ t.cSob=null; t.cSobPts=null; t.cOver=false; if(t.cPct==null) continue;
    if(t.cTot && t.cCob!=null){ t.cSob=t.cCob-t.cAv; t.cSobPts=t.cPct-(t.isSum&&t._wf!=null? t._wf : t.pct); t.cOver = t.cSob > Math.max(1, t.cTot*0.005); }
    else { const ref = t.isSum&&t._wf!=null? t._wf : t.pct; t.cSobPts=t.cPct-ref; t.cOver = t.cSobPts>0.5; }
    if(!t.isSum && t.cOver){ nOver++; if(t.cSob!=null) totS+=t.cSob; } }
  COBRO={any, nOver, totS};
}
let COBRO={any:false,nOver:0,totS:0};
function cMoney(n){ if(n==null) return ''; return (P.epUnit==='UF')? `UF ${n.toLocaleString('es-CL',{maximumFractionDigits:2})}` : `$ ${Math.round(n).toLocaleString('es-CL')}`; }
function pctTxt1(n){ return n==null? '' : `${(Math.round(n*10)/10).toString().replace('.',',')}%`; }

/* ---------- Mutaciones y deshacer ---------- */
function snapshot(){ return JSON.stringify(cleanP()); }
function restore(s){ const v=P.view; P=normalize(JSON.parse(s)); P.view=v; }
function mutate(fn){
  if(readOnly){ toast('Esta vista es de solo lectura.','err'); return false; }
  const snap=snapshot();
  structure();
  const r=fn();
  if(typeof r==='string'){ restore(snap); schedule(); render(); toast(r,'err'); return false; }
  if(r===false){ restore(snap); schedule(); render(); return false; }
  UNDO.push(snap); if(UNDO.length>80) UNDO.shift(); REDO=[]; dirty=true;
  schedule(); render(); saveDraft(); return true;
}
function undo(){ if(!UNDO.length) return; REDO.push(snapshot()); restore(UNDO.pop()); dirty=true; schedule(); render(); saveDraft(); toast('Cambio deshecho'); }
function redo(){ if(!REDO.length) return; UNDO.push(snapshot()); restore(REDO.pop()); dirty=true; schedule(); render(); saveDraft(); toast('Cambio rehecho'); }
function viewChanged(){ saveDraft(); render(); }

function saveDraft(){ try{ localStorage.setItem(DRAFT_KEY, JSON.stringify({base:P.savedAt||'seed', dirty, p:cleanP()})); }catch(e){} }
function clearDraft(){ try{ localStorage.removeItem(DRAFT_KEY); }catch(e){} }

/* ---------- Operaciones de tareas ---------- */
const selIdx = () => { const t=byUid.get(selUid); return t? t.i : -1; };
function selectedTasks(){ const ts=[...selSet].map(u=>byUid.get(u)).filter(Boolean).sort((a,b)=>a.i-b.i); if(!ts.length){ const t=byUid.get(selUid); if(t) ts.push(t); } return ts; }
function newTask(level, milestone){ return fillDefaults({uid:P.nextUid++, level, name:milestone?'Nuevo hito':'Nueva tarea', dur:milestone?0:5, preds:[], cType:'ASAP', cDate:'', pct:0, resp:'', notes:'', deadline:'', key:false, bs:'', bf:'', collapsed:false}); }
function insertTask(milestone){
  let uid=null;
  const ok = mutate(()=>{
    const T=P.tasks, i=selIdx(); let level, at;
    if(i<0){ level=T.length?2:1; at=T.length; }
    else { const t=T[i]; if(t.isSum && !t.collapsed){ level=t.level+1; at=i+1; } else { level=t.level; at=subtreeEnd(i)+1; } }
    const n=newTask(level, milestone); T.splice(at,0,n); uid=n.uid;
  });
  if(ok){ selUid=uid; selSet=new Set([uid]); render(); const tr=document.querySelector(`#grid tr[data-u="${uid}"] td[data-c="name"]`); if(tr){ tr.scrollIntoView({block:'nearest'}); startEdit(tr); } }
}
async function deleteSel(){
  const ts=selectedTasks(); if(!ts.length) return;
  const n = ts.reduce((a,t)=>a+(subtreeEnd(t.i)-t.i+1),0);
  if(ts.some(t=>t.isSum) || n>1){ if(!(await ask(`Se eliminarán ${n} tareas${ts.some(t=>t.isSum)?', incluidas las subtareas de los resúmenes seleccionados':''}. Puedes deshacerlo.`,'Eliminar'))) return; }
  removeTasks(ts);
}
function removeTasks(ts){
  const ok=mutate(()=>{
    const del=new Set(); for(const t of ts) for(let j=t.i;j<=subtreeEnd(t.i);j++) del.add(P.tasks[j].uid);
    P.tasks=P.tasks.filter(t=>!del.has(t.uid)); P.tasks.forEach(t=>t.preds=t.preds.filter(l=>!del.has(l.uid)));
  });
  selSet.clear(); selUid=null; render(); return ok;
}

/* ---------- Copiar, cortar y pegar tareas (Ctrl+C, Ctrl+X, Ctrl+V) ----------
   Copia las tareas seleccionadas con sus subtareas, campos y vínculos internos.
   El portapapeles lleva además una tabla (se pega en Excel) y los datos de las
   tareas, para pegarlas en otra carta Gantt. */
let CLIP=null, clipPending=null, clipTimer=null;
const projKey = () => P.id || P.title || '';
function buildClip(){
  const ts=selectedTasks(); if(!ts.length) return null;
  const rows=[], seen=new Set();
  for(const t of ts) for(let j=t.i;j<=subtreeEnd(t.i);j++){ const x=P.tasks[j]; if(!seen.has(x.uid)){ seen.add(x.uid); rows.push(x); } }
  rows.sort((a,b)=>a.i-b.i);
  const base=Math.min(...rows.map(r=>r.level));
  const tasks=rows.map(r=>{ const o={}; for(const k of KEEP) if(r[k]!==undefined) o[k]=JSON.parse(JSON.stringify(r[k])); o.preds=(r.preds||[]).map(l=>({uid:l.uid,type:l.type,lag:l.lag})); o.level=r.level-base; return o; });
  const head=['Id','Nombre de tarea','Duración','Comienzo','Fin','% avance físico'];
  const cells=r=>[r.row, r.name, r.dur+' días', fL(r.sDn), fL(r.fDn), Math.round(r.pct)+'%'];
  const text=[head.join('\t')].concat(rows.map(r=>{ const c=cells(r); c[1]='   '.repeat(r.level-base)+c[1]; return c.join('\t'); })).join('\n');
  const data={src:projKey(), roots:ts.filter(t=>!ts.some(o=>o!==t && o.i<t.i && t.i<=subtreeEnd(o.i))).length, tasks};
  const html='<meta charset="utf-8"><table data-gantt-clip="'+esc(JSON.stringify(data))+'"><tr>'+head.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr>'
    +rows.map(r=>'<tr>'+cells(r).map((v,k)=>'<td'+(k===1?' style="padding-left:'+(r.level-base)*14+'px"':'')+'>'+esc(v)+'</td>').join('')+'</tr>').join('')+'</table>';
  return {data, text, html, n:rows.length};
}
function copySel(cut){
  const c=buildClip(); if(!c){ toast('Selecciona una o más tareas para '+(cut?'cortar':'copiar')+'.'); return null; }
  CLIP=c.data;
  if(cut){ if(readOnly){ toast('Esta vista es de solo lectura.','err'); return null; } removeTasks(selectedTasks()); toast(`${c.n} ${c.n===1?'tarea cortada':'tareas cortadas'}. Selecciona dónde pegarlas y usa Ctrl+V.`); }
  else toast(`${c.n} ${c.n===1?'tarea copiada':'tareas copiadas'}. Selecciona una fila y usa Ctrl+V: se insertan sobre ella.`);
  return c;
}
function writeSystemClip(c){ try{ if(navigator.clipboard && window.ClipboardItem) navigator.clipboard.write([new ClipboardItem({'text/plain':new Blob([c.text],{type:'text/plain'}),'text/html':new Blob([c.html],{type:'text/html'})})]).catch(()=>{ navigator.clipboard.writeText(c.text).catch(()=>{}); }); else if(navigator.clipboard) navigator.clipboard.writeText(c.text).catch(()=>{}); }catch(e){} }
function clipFromHtml(h){ if(!h) return null; const m=/data-gantt-clip="([^"]*)"/.exec(h); if(!m) return null;
  try{ const d=new DOMParser().parseFromString('<p title="'+m[1]+'"></p>','text/html').querySelector('p').getAttribute('title'); const o=JSON.parse(d); return o&&Array.isArray(o.tasks)&&o.tasks.length? o : null; }catch(e){ return null; } }
function pasteClip(c){
  c=c||CLIP; if(!c||!c.tasks||!c.tasks.length){ toast('No hay tareas copiadas. Selecciona tareas y usa Ctrl+C.'); return; }
  let roots=[], n=0;
  const ok=mutate(()=>{
    const T=P.tasks, i=selIdx(); let level, at;
    if(i<0){ level=T.length?2:1; at=T.length; }
    else { level=T[i].level; at=i; }   /* como MS Project: se insertan sobre la fila seleccionada, a su mismo nivel */
    const same = c.src===projKey(), map=new Map();
    const nt=c.tasks.map(x=>{ const y=JSON.parse(JSON.stringify(x)); const u=P.nextUid++; map.set(x.uid,u); y.uid=u; y.level=Math.max(1,level+(+x.level||0)); return y; });
    for(const y of nt){ y.preds=(y.preds||[]).map(l=> map.has(l.uid)? {uid:map.get(l.uid),type:l.type,lag:l.lag} : (same && byUid.has(l.uid)? {uid:l.uid,type:l.type,lag:l.lag} : null)).filter(Boolean); fillDefaults(y); }
    T.splice(at,0,...nt); n=nt.length; roots=nt.filter(y=>y.level===level).map(y=>y.uid);
  });
  if(ok){ selSet=new Set(roots); selUid=roots[0]; anchorUid=roots[0]; render();
    const tr=document.querySelector(`#grid tr[data-u="${selUid}"]`); tr&&tr.scrollIntoView({block:'nearest'});
    toast(`${n} ${n===1?'tarea pegada':'tareas pegadas'}. Puedes deshacerlo con Ctrl+Z.`); }
}
const inField = e => e.target && e.target.closest && e.target.closest('input,textarea,select,dialog,[contenteditable]');
document.addEventListener('copy',e=>{ if(!clipPending || inField(e)) return; e.clipboardData.setData('text/plain',clipPending.text); e.clipboardData.setData('text/html',clipPending.html); e.preventDefault(); clipPending=null; clearTimeout(clipTimer); });
document.addEventListener('cut',e=>{ if(!clipPending || inField(e)) return; e.clipboardData.setData('text/plain',clipPending.text); e.clipboardData.setData('text/html',clipPending.html); e.preventDefault(); clipPending=null; clearTimeout(clipTimer); });
document.addEventListener('paste',e=>{ if(inField(e) || clipTimer==null) return; clearTimeout(clipTimer); clipTimer=null; e.preventDefault();
  const d=e.clipboardData? clipFromHtml(e.clipboardData.getData('text/html')) : null; pasteClip(d||CLIP); });
function keyCopy(cut){ const c=copySel(cut); if(!c) return; clipPending=c; clearTimeout(clipTimer); clipTimer=setTimeout(()=>{ if(clipPending){ writeSystemClip(clipPending); clipPending=null; } clipTimer=null; },80); }
function keyPaste(){ clearTimeout(clipTimer); clipTimer=setTimeout(()=>{ clipTimer=null; pasteClip(); },80); }
function indent(dir){
  const ts=selectedTasks(); if(!ts.length) return;
  mutate(()=>{
    const T=P.tasks, rng=[];
    for(const t of ts){ const e=subtreeEnd(t.i); if(rng.some(r=>t.i>=r[0]&&t.i<=r[1])) continue; rng.push([t.i,e]); }
    for(const [a,b] of rng){
      if(dir>0){ if(a===0 || T[a-1].level<T[a].level) return 'No se puede bajar de nivel: la tarea anterior debe estar en el mismo nivel.';
        for(let j=a;j<=b;j++) T[j].level++; }
      else { if(T[a].level<=1) return 'La tarea ya está en el nivel superior.'; for(let j=a;j<=b;j++) T[j].level--; }
    }
    structure();
    for(const t of T) for(const l of t.preds){ const q=byUid.get(l.uid); if(q && (isAncestor(q,t)||isAncestor(t,q))) return 'El cambio de nivel dejaría una tarea vinculada con su propio resumen. Quita ese vínculo primero.'; }
  });
}
function linkSel(){
  const ts=selectedTasks(); if(ts.length<2){ toast('Selecciona dos o más tareas (Ctrl+clic o Mayús+clic) para vincularlas.'); return; }
  mutate(()=>{
    for(let k=1;k<ts.length;k++){ const a=ts[k-1], b=ts[k];
      if(isAncestor(a,b)||isAncestor(b,a)) return 'No se puede vincular una tarea con su propio resumen.';
      if(!b.preds.some(l=>l.uid===a.uid)) b.preds.push({uid:a.uid,type:'FS',lag:0}); }
    if(hasCycle()) return 'Ese vínculo crearía una referencia circular.';
  });
}
function unlinkSel(){
  const ts=selectedTasks(); if(!ts.length) return;
  mutate(()=>{
    if(ts.length===1){ if(!ts[0].preds.length) return 'La tarea seleccionada no tiene predecesoras.'; ts[0].preds=[]; }
    else { const u=new Set(ts.map(t=>t.uid)); ts.forEach(t=>t.preds=t.preds.filter(l=>!u.has(l.uid))); }
  });
}
function setPct(v){
  const ts=selectedTasks(); if(!ts.length){ toast('Selecciona una tarea.'); return; }
  mutate(()=>{ for(const t of ts) for(const l of leavesOf(t)) l.pct=v; });
}
async function updateSched(){
  const ts=selectedTasks(); const all = ts.length<=1;
  const scope = all? P.tasks.filter(t=>!t.isSum) : [...new Set(ts.flatMap(leavesOf))];
  if(!(await ask(`Se asignará a ${all?'todas las tareas':'las tareas seleccionadas'} el % completado que corresponde según programa al ${fL(toDN(P.statusDate))}. Las tareas con más avance que el programado no se modifican.`,'Actualizar'))) return;
  mutate(()=>{ for(const t of scope){ const e=Math.round(t.expected); if(e>t.pct) t.pct=e; } });
}
async function setBaseline(){
  if(!(await ask(`Se reemplazará la línea base actual (${P.baselineLabel.replace(/^Línea base:\s*/,'')}) por las fechas programadas hoy. La columna Variación se medirá contra esta nueva línea base.`,'Establecer línea base'))) return;
  mutate(()=>{ for(const t of P.tasks){ t.bs=iso(t.sDn); t.bf=iso(t.fDn); } P.baselineLabel=`Línea base: ${fL(toDN(todayISO()))}`; });
}

/* ---------- Columnas y tablas ---------- */
const ICON = {
  cal:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3.5" width="12" height="10" rx="1"/><path d="M2 7h12M5 2v3M11 2v3"/></svg>',
  pin:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="3.5" width="12" height="10" rx="1"/><path d="M2 7h12M5 2v3M11 2v3"/><circle cx="8" cy="10.2" r="1.6" fill="currentColor"/></svg>',
  ok:'<svg viewBox="0 0 16 16" fill="none" stroke="var(--ok)" stroke-width="2"><path d="m3 8.5 3 3 7-7"/></svg>',
  warn:'<svg viewBox="0 0 16 16"><path d="M8 1.5 15 14H1z" fill="var(--crit)"/><path d="M8 6v4M8 11.6v.4" stroke="#fff" stroke-width="1.6"/></svg>',
  note:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 2h7l3 3v9H3z"/><path d="M5.5 7h5M5.5 9.5h5M5.5 12h3"/></svg>',
  off:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M4 12 12 4"/></svg>',
  manual:'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2h4l-.5 4 2 2H4.5l2-2z"/><path d="M8 8v6"/></svg>',
  chev:'<svg viewBox="0 0 10 10" fill="currentColor"><path d="M2 3h6L5 7z"/></svg>',
  chevR:'<svg viewBox="0 0 10 10" fill="currentColor"><path d="M3 2v6l4-3z"/></svg>'
};
const CT_LABEL = {ASAP:'Lo antes posible', SNET:'No comenzar antes del', SNLT:'No comenzar después del', FNET:'No finalizar antes del', FNLT:'No finalizar después del', MSO:'Debe comenzar el', MFO:'Debe finalizar el'};
const isFixed = t => !!((t.manual && t.mStart) || ((t.cType==='MSO'||t.cType==='MFO') && t.cDate));
const fixedTxt = t => t.manual && t.mStart ? `programada manualmente, inicio ${fL(toDN(t.mStart))}` : `${CT_LABEL[t.cType].toLowerCase()} ${fL(toDN(t.cDate))}`;
function indic(t){
  const a=[];
  if(t.pct>=99.5) a.push(`<span title="Completada">${ICON.ok}</span>`);
  if(t.off) a.push(`<span title="Inactiva: no afecta la programación" style="color:var(--muted)">${ICON.off}</span>`);
  if(t.conflict) a.push(`<span title="Conflicto: las predecesoras no permiten cumplir la fecha (${esc(fixedTxt(t))})">${ICON.warn}</span>`);
  else if(t.dlMiss) a.push(`<span title="El fin supera la fecha límite ${fL(toDN(t.deadline))}">${ICON.warn}</span>`);
  if(t.manual && t.mStart) a.push(`<span title="Programada manualmente: inicio ${fL(toDN(t.mStart))}" style="color:var(--manual)">${ICON.manual}</span>`);
  else if(t.cType!=='ASAP' && t.cDate) a.push(`<span title="${t.cAuto?'Restricción ajustada al mover la cadena FF':'Restricción'}: ${CT_LABEL[t.cType]} ${fL(toDN(t.cDate))}" style="color:${(t.cType==='MSO'||t.cType==='MFO')?'var(--crit)':'var(--muted)'}">${(t.cType==='MSO'||t.cType==='MFO')?ICON.pin:ICON.cal}</span>`);
  if(t.notes) a.push(`<span title="${esc(t.notes)}" style="color:var(--muted)">${ICON.note}</span>`);
  return `<span class="ind">${a.slice(0,2).join('')}</span>`;
}
const durTxt = d => d==null||!isFinite(d)? '' : `${d} ${Math.abs(d)===1?'día':'días'}`;
const varTxt = v => v==null? '' : `<span class="${v>0?'v-late':v<0?'v-early':''}">${v>0?'+':''}${v} ${Math.abs(v)===1?'día':'días'}</span>`;
function nameCell(t){
  const pad=(t.level-1)*15+2;
  const tg = t.isSum? `<button class="tg" data-tg="${t.uid}" aria-label="${t.collapsed?'Expandir':'Contraer'} ${esc(t.name)}" aria-expanded="${!t.collapsed}">${t.collapsed?ICON.chevR:ICON.chev}</button>` : '<span class="tgs"></span>';
  return `<div class="nm" style="padding-left:${pad}px">${tg}<span class="nt">${esc(t.name)}</span></div>`;
}
/* peso del avance físico: duración de línea base (días hábiles); sin línea base, duración actual */
function pw(t){ if(t.bs&&t.bf){ const a=idxOf(toDN(t.bs)), b=endB(toDN(t.bf)); if(b>a) return b-a; } return t.dur||0; }
function pctCell(t){ const v=Math.round(t.pct); return `<span class="pctc">${t.isSum? pctTxt1(t.pct) : v+'%'}<i><b style="width:${v}%"></b></i></span>`; }
function stateCell(t){ const c={Completada:'done',Atrasada:'late','En curso':'prog'}[t.state]||''; return `<span class="st ${c}">${t.state}</span>`; }
const COLS = {
  id:{h:'Id',w:40,cls:'c-id',get:t=>t.row},
  ind:{h:'<span class="sr">Indicadores</span>',w:38,cls:'c-ind',get:indic},
  wbs:{h:'EDT',w:64,get:t=>t.wbs},
  name:{h:'Nombre de tarea',w:280,cls:'c-name',edit:1,get:nameCell},
  dur:{h:'Duración',w:84,cls:'r',edit:1,get:t=>durTxt(dispDur(t))+(t.est?'?':'')},
  start:{h:'Comienzo',w:98,edit:1,get:t=>fD(t.sDn)},
  finish:{h:'Fin',w:98,edit:1,get:t=>fD(t.fDn)},
  preds:{h:'Predecesoras',w:120,edit:1,get:t=>esc(predText(t))},
  pct:{h:'% avance físico',w:104,cls:'r',edit:1,get:pctCell},
  resp:{h:'Nombres de los recursos',w:140,edit:1,get:t=>esc(resLabel(t.resources))},
  slack:{h:'Holgura total',w:92,cls:'r',get:t=>durTxt(t.slack)},
  state:{h:'Estado',w:96,get:stateCell},
  bstart:{h:'Comienzo LB',w:98,get:t=>t.bs?fD(toDN(t.bs)):''},
  bfinish:{h:'Fin LB',w:98,get:t=>t.bf?fD(toDN(t.bf)):''},
  vstart:{h:'Var. comienzo',w:96,cls:'r',get:t=>varTxt(t.vs)},
  vfinish:{h:'Var. fin',w:84,cls:'r',get:t=>varTxt(t.vf)},
  ctot:{h:'Monto total',w:118,cls:'r',edit:1,get:t=>t.cTot? cMoney(t.cTot) : '<span class="v-none">—</span>'},
  ccob:{h:'Cobrado acum.',w:118,cls:'r',edit:1,get:t=>t.cCob!=null? cMoney(t.cCob) : '<span class="v-none">—</span>'},
  cpct:{h:'% cobrado',w:78,cls:'r',edit:1,get:t=>t.cPct!=null? pctTxt1(t.cPct) : '<span class="v-none">—</span>'},
  cfis:{h:'% avance real',w:88,cls:'r',get:t=>pctTxt1(t.isSum&&t._wf!=null? t._wf : t.pct)},
  csob:{h:'Sobrecobro',w:118,cls:'r',get:t=>t.cPct==null? '<span class="v-none">—</span>' : (t.cSob!=null? `<span class="${t.cOver?'v-late':''}">${t.cSob>0?'+':''}${cMoney(t.cSob)}</span>` : `<span class="${t.cOver?'v-late':''}">${t.cSobPts>0?'+':''}${t.cSobPts.toFixed(1).replace('.',',')} pts</span>`)}
};
const TABLES = {
  entrada:['id','ind','name','dur','start','finish','preds','pct'],
  seguimiento:['id','ind','name','pct','state','start','finish','dur','slack'],
  variacion:['id','ind','name','start','finish','bstart','bfinish','vstart','vfinish'],
  edt:['id','wbs','name','dur','start','finish'],
  cobro:['id','ind','name','ctot','ccob','cpct','cfis','csob']
};

/* ---------- Filas visibles ---------- */
function matchFilter(t,f){
  switch(f){ case 'crit': return t.crit; case 'mil': return t.mil; case 'late': return t.state==='Atrasada';
    case 'prog': return t.pct>0 && t.pct<99.5; case 'open': return t.pct<99.5; case 'over': return !!t.cOver; default: return true; }
}
function computeVisible(){
  const T=P.tasks, f=P.view.filter, keep=new Set();
  if(f!=='all'){ for(const t of T) if(!t.isSum && matchFilter(t,f)){ keep.add(t.uid); let p=t.parent; while(p>=0){ keep.add(T[p].uid); p=T[p].parent; } } }
  VIS=[]; let hide=Infinity;
  for(const t of T){
    if(t.level>hide) continue; hide=Infinity;
    if(f==='all' || keep.has(t.uid)) VIS.push(t); else continue;
    if(t.isSum && t.collapsed) hide=t.level;
  }
}

/* ---------- Render: encabezado ---------- */
const $ = s => document.querySelector(s);
function renderHeader(){
  $('#pTitle').textContent = P.title;
  $('#pSub').textContent = `${P.name}. ${P.rev}`;
  const root = P.tasks.find(t=>t.level===1) || P.tasks[0];
  const T=P.tasks, ps=Math.min(...T.map(t=>t.sDn)), pe=Math.max(...T.map(t=>t.fDn));
  const bEnd = root && root.bf? toDN(root.bf) : null;
  const vf = root && root.vf!=null ? root.vf : null;
  const critN = T.filter(t=>!t.isSum && t.crit).length;
  const late = T.filter(t=>!t.isSum && t.state==='Atrasada').length;
  // % programado según línea base a la fecha de estado (ponderado por duración de línea base, igual que el % avance físico)
  let prog=null; { const sd=toDN(P.statusDate)||toDN(todayISO()), sb=endB(sd); let w=0,e=0,any=false;
    for(const t of T){ if(t.isSum||t.off) continue; const k=pw(t); if(!k) continue; w+=k;
      if(t.bs&&t.bf){ any=true; const a=idxOf(toDN(t.bs)), b=endB(toDN(t.bf)); e+=k*(b>a? Math.max(0,Math.min(1,(sb-a)/(b-a))) : (sb>=a?1:0))*100; } }
    if(w&&any) prog=e/w; }
  const st = [
    ['Comienzo', fD(ps)],
    ['Fin línea base', bEnd!=null? fD(bEnd) : 'Sin línea base'],
    ['Duración (días corridos)', `${pe-ps+1} días`],
    [root && root.pct>=99.5? 'Fin real' : 'Fin real (proyectado)', fD(pe), bEnd!=null && pe>bEnd],
    ['Variación de fin', vf!=null? `${vf>0?'+':''}${vf} días` : '', vf>0],
    ['% avance físico', pctTxt1(root? root.pct:0)],
    ['Dif. vs programado'+(prog!=null? ` (${Math.round(prog)}%)`:''), prog!=null && root? `${root.pct-prog>=0?'+':''}${(root.pct-prog).toFixed(1).replace('.',',')} pts` : 'Sin línea base', prog!=null && root && root.pct<prog-0.05],
    ['Fecha de estado', fD(toDN(P.statusDate))],
    ['Atrasadas', String(late), late>0],
    ['Críticas', String(critN)]
  ];
  if(P.view.table==='cobro'){ const r=P.tasks.find(t=>t.level===1)||P.tasks[0];
    st.splice(0,st.length,
      ['Monto total', r&&r.cTot? cMoney(r.cTot) : 'Sin montos'],
      ['Cobrado acumulado', r&&r.cCob!=null? cMoney(r.cCob) : (r&&r.cPct!=null? pctTxt1(r.cPct) : 'Sin EP')],
      ['% cobrado', r&&r.cPct!=null? pctTxt1(r.cPct) : '—'],
      ['% avance real', `${pctTxt1(r? (r._wf!=null? r._wf : r.pct):0)}`],
      ['Partidas con sobrecobro', String(COBRO.nOver), COBRO.nOver>0],
      ['Sobrecobro total', COBRO.totS? cMoney(COBRO.totS) : '—', COBRO.totS>0],
      ['Fecha de estado', fD(toDN(P.statusDate))]); }
  $('#stats').innerHTML = st.map(([l,v,bad])=>`<div class="stat"><b class="${bad?'late':''}">${esc(v)}</b><span>${l}</span></div>`).join('');
  renderStrip();
  const ss=$('#saveState');
  if(readOnly){ ss.textContent='Solo lectura'; ss.className='savestate'; }
  else if(dirty){ ss.textContent='Cambios sin guardar (se conservan en este navegador)'; ss.className='savestate dirty'; }
  else { ss.textContent = P.savedAt? `Versión guardada el ${fL(Math.floor(Date.parse(P.savedAt)/DAY))} a las ${new Date(P.savedAt).toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}` : 'Versión inicial'; ss.className='savestate'; }
  $('#bUndo').disabled=!UNDO.length||readOnly; $('#bRedo').disabled=!REDO.length||readOnly;
  $('#bSave').hidden = readOnly || !ART; $('#bSave').disabled=!dirty && !!P.savedAt;
}
function renderStrip(){
  const svg=$('#strip'); const W=Math.max(260, svg.clientWidth||600), H=46;
  const T=P.tasks; if(!T.length){ svg.innerHTML=''; return; }
  const a=Math.min(...T.map(t=>t.sDn)), b=Math.max(...T.map(t=>t.fDn))+1, pad=10;
  const x=dn=>pad+(dn-a)/Math.max(1,b-a)*(W-2*pad);
  const root=T.find(t=>t.level===1)||T[0];
  let s=`<rect x="${pad}" y="18" width="${W-2*pad}" height="8" rx="4" fill="var(--line2)" stroke="var(--line)"/>`;
  const pctX = pad + (W-2*pad)*(Math.min(100,root.pct)/100);
  s+=`<rect x="${pad}" y="18" width="${Math.max(0,pctX-pad)}" height="8" rx="4" fill="var(--bar)"/>`;
  // años
  for(let y=parts(a).y+1; y<=parts(b).y; y++){ const xx=x(dny(y,0,1)); if(xx>pad+10 && xx<W-pad-10) s+=`<line x1="${xx}" x2="${xx}" y1="28" y2="33" stroke="var(--muted)"/><text x="${xx}" y="44" class="tlab m" text-anchor="middle">${y}</text>`; }
  // hitos
  for(const t of T) if(t.mil && !t.key){ const xx=x(t.sDn+1); s+=`<path d="M${xx} 17.5l4 4.5-4 4.5-4-4.5z" fill="var(--sum)" opacity=".55"><title>${esc(t.name)} ${fL(t.sDn)}</title></path>`; }
  const sd=toDN(P.statusDate); if(sd>=a && sd<=b){ const xx=x(sd+1); s+=`<line x1="${xx}" x2="${xx}" y1="12" y2="32" stroke="var(--status)" stroke-width="2"/><text x="${xx}" y="44" class="tlab" text-anchor="middle" fill="var(--status)" style="fill:var(--status);font-weight:600">Estado ${fL(sd).slice(0,5)}</text>`; }
  for(const t of T) if(t.key && !t.mil){ const x0=x(t.sDn), x1=Math.max(x0+3,x(t.fDn+1));
    s+=`<rect x="${x0}" y="16" width="${x1-x0}" height="12" rx="2" fill="var(--spark)" stroke="var(--spark-ink)" stroke-width="1" opacity=".9"><title>${esc(t.name)} ${fL(t.sDn)} – ${fL(t.fDn)}</title></rect>`;
    const right = x0 > W*0.6; s+=`<text x="${right?x1:x0}" y="11" class="tlab" text-anchor="${right?'end':'start'}" style="font-weight:600">${esc(t.name)}</text>`; }
  for(const t of T) if(t.key && t.mil){ const xx=x(t.sDn+1), right = xx > W*0.6;
    s+=`<path d="M${xx} 14l8 8-8 8-8-8z" fill="var(--spark)" stroke="var(--spark-ink)" stroke-width="1"/>`;
    s+=`<text x="${right?xx-12:xx+12}" y="11" class="tlab" text-anchor="${right?'end':'start'}" style="font-weight:600">${esc(t.name)} ${fL(t.sDn)}</text>`; }
  s+=`<text x="${pad}" y="11" class="tlab m">${fL(a)}</text>`;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`); svg.innerHTML=s;
  svg.onclick = e=>{ const r=svg.getBoundingClientRect(); const dn=Math.round(a+(e.clientX-r.left-pad)/(W-2*pad)*(b-a)); scrollChartTo(dn,true); };
}

/* ---------- Render: tabla ---------- */
function renderGrid(){
  const cols=TABLES[P.view.table]||TABLES.entrada;
  let h='<colgroup>'+cols.map(c=>`<col style="width:${COLS[c].w}px">`).join('')+'</colgroup>';
  h+='<thead><tr>'+cols.map(c=>`<th class="${COLS[c].cls&&COLS[c].cls.includes('r')?'r':''}" scope="col"${c==='dur'?` title="Duración en días ${unitTxt()}"`:''}>${c==='dur'? `Duración <span style="font-weight:400;color:var(--muted)">(${isCor()?'corr.':'háb.'})</span>` : COLS[c].h}</th>`).join('')+'</tr></thead><tbody>';
  for(const t of VIS){
    const cl=[t.isSum?'sum':'', (selSet.has(t.uid)||t.uid===selUid)?'sel':'', (P.view.crit&&t.crit&&!t.isSum)?'crit':'', t.key?'key':'', t.off?'off':''].join(' ');
    h+=`<tr data-u="${t.uid}" class="${cl}" aria-selected="${selSet.has(t.uid)}">`+cols.map(c=>`<td data-c="${c}" class="${COLS[c].cls||''}">${COLS[c].get(t)}</td>`).join('')+'</tr>';
  }
  h+='</tbody>';
  const g=$('#grid'); g.innerHTML=h; g.style.width=cols.reduce((a,c)=>a+COLS[c].w,0)+'px';
  if(!VIS.length){ g.insertAdjacentHTML('beforeend',`<tbody><tr><td colspan="${cols.length}" style="color:var(--muted);text-align:center">Ninguna tarea cumple el filtro. Cambia el filtro a «Todas las tareas».</td></tr></tbody>`); }
}

/* ---------- Render: Gantt ---------- */
const ZOOMS = {
  dias:{px:26, top:'week', bot:'day', label:'Días'},
  semanas:{px:7, top:'month', bot:'week', label:'Semanas'},
  meses:{px:2.3, top:'year', bot:'month', label:'Meses'},
  trimestres:{px:0.85, top:'year', bot:'quarter', label:'Trimestres'},
  anos:{px:0.34, top:'year', bot:'half', label:'Años'}
};
const ZKEYS = Object.keys(ZOOMS);
let R0=0, R1=0, PX=2;
const X = dn => (dn-R0)*PX;
function uStart(dn,u){ const p=parts(dn); switch(u){ case 'day': return dn; case 'week': return dn-((p.w+6)%7); case 'month': return dny(p.y,p.m,1);
  case 'quarter': return dny(p.y,p.m-p.m%3,1); case 'half': return dny(p.y,p.m<6?0:6,1); default: return dny(p.y,0,1);} }
function uNext(dn,u){ const p=parts(dn); switch(u){ case 'day': return dn+1; case 'week': return dn+7; case 'month': return dny(p.y,p.m+1,1);
  case 'quarter': return dny(p.y,p.m+3,1); case 'half': return dny(p.y,p.m+6,1); default: return dny(p.y+1,0,1);} }
function uLabel(dn,u,w,tier){ const p=parts(dn);
  switch(u){
    case 'day': return 'DLMMJVS'[p.w];
    case 'week': return tier==='top'? (w>90?`semana del ${p.d} ${MON[p.m]} ${p.y}`:`${p.d} ${MON[p.m]}`) : String(p.d);
    case 'month': return tier==='top'? `${MON[p.m]} ${p.y}` : (w>26? MON[p.m] : MON[p.m][0].toUpperCase());
    case 'quarter': return w>60? `T${Math.floor(p.m/3)+1} ${p.y}` : `T${Math.floor(p.m/3)+1}`;
    case 'half': return w>50? `S${p.m<6?1:2} ${p.y}` : `S${p.m<6?1:2}`;
    default: return String(p.y);
  } }
function barGeo(t){ // devuelve coordenadas horizontales
  if(t.mil || (t.isSum && t.dur===0)){ const xm=X(t.sDn+1); return {x0:xm,x1:xm,xm}; }
  return {x0:X(t.sDn), x1:X(t.fDn+1)};
}
function cobroOverlay(t,x0,x1,y,h){
  if(t.cPct==null) return '';
  const w=x1-x0, pc=Math.max(0,t.cPct), fis=Math.max(0,Math.min(100,t.isSum&&t._wf!=null? t._wf : t.pct));
  const a=Math.min(pc,fis), b=pc; let o='';
  if(a>0) o+=`<rect x="${x0}" y="${y}" width="${w*Math.min(a,100)/100}" height="${h}" fill="var(--prog)" pointer-events="none"/>`;
  if(b>fis+0.05) o+=`<rect x="${x0+w*fis/100}" y="${y}" width="${w*(Math.min(b,110)-fis)/100}" height="${h}" fill="var(--crit)" pointer-events="none"/>`;
  const xf=x0+w*fis/100; o+=`<rect x="${xf-1}" y="${y-3}" width="2" height="${h+6}" fill="var(--ink)" pointer-events="none"/>`;
  return o;
}
function renderChart(){
  const Z=ZOOMS[P.view.zoom]||ZOOMS.meses; PX=Z.px;
  const T=P.tasks;
  let lo=Infinity, hi=-Infinity;
  for(const t of T){ lo=Math.min(lo,t.sDn); hi=Math.max(hi,t.fDn); if(t.bs) lo=Math.min(lo,toDN(t.bs)); if(t.bf) hi=Math.max(hi,toDN(t.bf)); if(t.deadline) hi=Math.max(hi,toDN(t.deadline)); }
  const sd=toDN(P.statusDate); if(sd!=null){ lo=Math.min(lo,sd); hi=Math.max(hi,sd); }
  if(!isFinite(lo)){ lo=toDN(P.startDate); hi=lo+60; }
  R0=uStart(lo-Math.ceil(24/PX), Z.top); R1=uNext(uStart(hi+Math.ceil(160/PX),Z.top),Z.top);
  const W=Math.ceil(X(R1)), H=VIS.length*RH+60;
  // encabezado
  let h=`<svg width="${W}" height="44" aria-hidden="true">`;
  for(let d=R0; d<R1; d=uNext(d,Z.top)){ const n=uNext(d,Z.top), x0=X(d), w=X(n)-x0; h+=`<line x1="${x0}" x2="${x0}" y1="0" y2="22" stroke="var(--line)"/>`; const lb=uLabel(d,Z.top,w,'top'); if(w>lb.length*6.2) h+=`<text x="${x0+5}" y="15" class="tlab">${lb}</text>`; }
  h+=`<line x1="0" x2="${W}" y1="22" y2="22" stroke="var(--line)"/>`;
  for(let d=uStart(R0,Z.bot); d<R1; d=uNext(d,Z.bot)){ const n=uNext(d,Z.bot), x0=X(d), w=X(n)-x0; if(x0<0) continue; h+=`<line x1="${x0}" x2="${x0}" y1="22" y2="44" stroke="var(--line)"/>`; const lb=uLabel(d,Z.bot,w,'bot'); if(w>lb.length*6.2+4) h+=`<text x="${x0+w/2}" y="37" class="tlab m" text-anchor="middle">${lb}</text>`; }
  if(sd!=null){ const xs=X(sd+1); h+=`<path d="M${xs-5} 38 h10 l-5 6z" fill="var(--status)"/>`; }
  h+='</svg>';
  $('#chartHead').innerHTML=h; $('#chartHead').style.width=W+'px';

  // cuerpo
  const base=P.view.base, CM=P.view.table==='cobro', crit=P.view.crit&&!CM;
  let s=`<svg width="${W}" height="${H}" id="gsvg"><defs>
    <marker id="ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="var(--link)"/></marker>
    <marker id="arc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="var(--crit)"/></marker>
    <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="var(--weekend)"/><line x1="0" y1="0" x2="0" y2="5" stroke="var(--line)" stroke-width="1"/></pattern></defs>`;
  // no laborables
  if(PX>=5){ for(let d=R0; d<R1; d++) if(!isWork(d)) s+=`<rect x="${X(d)}" y="0" width="${PX}" height="${H}" fill="${HOL.has(d)?'url(#hatch)':'var(--weekend)'}"/>`; }
  else if(HOL.size){ for(const d of HOL) if(d>=R0&&d<R1) s+=`<rect x="${X(d)}" y="0" width="${Math.max(1,PX)}" height="${H}" fill="var(--line)"/>`; }
  // grilla vertical
  for(let d=uStart(R0,Z.bot); d<R1; d=uNext(d,Z.bot)){ const x0=X(d); if(x0>0) s+=`<line x1="${x0}" x2="${x0}" y1="0" y2="${H}" stroke="var(--line2)"/>`; }
  for(let d=R0; d<R1; d=uNext(d,Z.top)){ const x0=X(d); if(x0>0) s+=`<line x1="${x0}" x2="${x0}" y1="0" y2="${H}" stroke="var(--line)"/>`; }
  // filas
  const pos=new Map(); VIS.forEach((t,k)=>pos.set(t.uid,k));
  VIS.forEach((t,k)=>{ const y=k*RH; const sel=selSet.has(t.uid)||t.uid===selUid;
    s+=`<rect x="0" y="${y}" width="${W}" height="${RH}" fill="${sel?'var(--sel)':'transparent'}" data-row="${t.uid}"/><line x1="0" x2="${W}" y1="${y+RH-.5}" y2="${y+RH-.5}" stroke="var(--line2)"/>`; });
  // línea de fecha de estado
  if(sd!=null){ const xs=X(sd+1); s+=`<line x1="${xs}" x2="${xs}" y1="0" y2="${H}" stroke="var(--status)" stroke-width="1.5" stroke-dasharray="5 3"/>`; }
  // vínculos
  const top=(t)=>{ const k=pos.get(t.uid); return k*RH + (t.mil?6:(base?5:7)); };
  const bot=(t)=>{ const k=pos.get(t.uid); return k*RH + (t.mil?22:(base?17:20)); };
  const mid=(t)=>pos.get(t.uid)*RH+ (base&&!t.mil&&!t.isSum?11:14);
  if(P.view.links){
    for(const t of VIS) for(const l of t.preds){ const q=byUid.get(l.uid); if(!q || !pos.has(q.uid) || q.hideBar || t.hideBar) continue;
      const gq=barGeo(q), gt=barGeo(t), down=pos.get(t.uid)>pos.get(q.uid);
      const qs=gq.x0-(q.mil?7:0), qe=gq.x1+(q.mil?7:0), ts=gt.x0-(t.mil?7:0), te=gt.x1+(t.mil?7:0);
      const y1=mid(q), y2=mid(t), c=crit&&q.crit&&t.crit; let d='';
      if(l.type==='FS'){
        const tx=t.mil? gt.xm : ts+4;
        if(tx>=qe+3){ d=`M${qe} ${y1}H${tx}V${down?top(t):bot(t)}`; }
        else { const ym=down? pos.get(t.uid)*RH+1 : (pos.get(t.uid)+1)*RH-1; d=`M${qe} ${y1}h6V${ym}H${ts-9}V${y2}H${ts}`; }
      } else if(l.type==='SS'){ const xl=Math.min(qs,ts)-9; d=`M${qs} ${y1}H${xl}V${y2}H${ts}`; }
      else if(l.type==='FF'){ const xr=Math.max(qe,te)+9; d=`M${qe} ${y1}H${xr}V${y2}H${te}`; }
      else { const ym=down? pos.get(t.uid)*RH+1 : (pos.get(t.uid)+1)*RH-1; d=`M${qs} ${y1}h-8V${ym}H${te+9}V${y2}H${te}`; }
      s+=`<path d="${d}" fill="none" stroke="${c?'var(--crit)':'var(--link)'}" stroke-width="1.1" marker-end="url(#${c?'arc':'ar'})"/>`;
    }
  }
  // barras
  VIS.forEach((t,k)=>{ if(t.hideBar) return; const y=k*RH, g=barGeo(t), ic=crit&&t.crit, bf=t.off?'var(--base)':(ic?'var(--crit)':(t.manual?'var(--manual)':'var(--bar)'));
    // línea base
    if(base && t.bs && t.bf){ const bsd=toDN(t.bs), bfd=toDN(t.bf);
      if(t.mil || (bsd===bfd && t.dur===0)){ const bx=X(bfd+1); s+=`<path d="M${bx} ${y+17}l4 4-4 4-4-4z" fill="var(--base)"/>`; }
      else { const b0=X(bsd), b1=X(bfd+1); s+=`<rect x="${b0}" y="${y+19}" width="${Math.max(1,b1-b0)}" height="${t.isSum?4:5}" fill="var(--base)" rx="1"/>`; } }
    if(t.isSum && !(t.dur===0)){
      const yy=y+(base?7:9), x0=g.x0, x1=Math.max(g.x1,x0+2);
      s+=`<path d="M${x0} ${yy}H${x1}V${yy+10}L${x1-5} ${yy+5.5}H${x0+5}L${x0} ${yy+10}Z" fill="${ic?'var(--crit)':'var(--sum)'}" data-t="${t.uid}"/>`;
      if(CM){ s+=cobroOverlay(t,x0,x1,yy+1,3.5); }
      else if(t.pct>0){ const pw=(x1-x0)*t.pct/100; s+=`<rect x="${x0}" y="${yy+1.5}" width="${pw}" height="2.5" fill="var(--spark)" pointer-events="none"/>`; }
    } else if(t.mil || t.dur===0){
      const xm=g.xm, cy=y+14, key=t.key;
      const fill = key? 'var(--spark)' : (ic?'var(--crit)':'var(--sum)');
      s+=`<path d="M${xm} ${cy-(key?9:7)}l${key?9:7} ${key?9:7}-${key?9:7} ${key?9:7}-${key?9:7}-${key?9:7}z" fill="${fill}" stroke="${key?'var(--spark-ink)':'none'}" stroke-width="1.2" data-t="${t.uid}" ${t.isSum?'':'data-drag="1" data-mode="move"'}/>`;
      s+=`<text x="${xm+(key?14:11)}" y="${cy+4}" class="blab ${key?'k':''}">${fL(t.sDn)}${key?'  '+esc(t.name):''}</text>`;
    } else {
      const yy=y+(base?5:8), hh=base?11:12, x0=g.x0, w=Math.max(2,g.x1-g.x0);
      s+=`<rect x="${x0}" y="${yy}" width="${w}" height="${hh}" rx="2" fill="${bf}" ${t.off?'opacity=".45" stroke="var(--muted)" stroke-dasharray="3 2"':''} data-t="${t.uid}" data-drag="1" data-mode="move"/>`;
      if(CM) s+=cobroOverlay(t,x0,x0+w,yy+hh/2-2.5,5);
      else if(t.pct>0) s+=`<rect x="${x0}" y="${yy+hh/2-2}" width="${w*t.pct/100}" height="4" fill="${ic?'var(--crit-d)':'var(--prog)'}" pointer-events="none"/>`;
      s+=`<rect x="${x0+w-6}" y="${yy}" width="8" height="${hh}" fill="transparent" data-t="${t.uid}" data-drag="1" data-mode="resize"/>`;
      if(P.view.slack && t.slack>0){ const xe=X(dnOf(t.lf-1)+1); s+=`<line x1="${g.x1}" x2="${xe}" y1="${yy+hh/2}" y2="${yy+hh/2}" stroke="var(--slack)" stroke-width="2"/><line x1="${xe}" x2="${xe}" y1="${yy+2}" y2="${yy+hh-2}" stroke="var(--slack)" stroke-width="2"/>`; }
      const lab= CM? (t.cPct!=null? `cobrado ${pctTxt1(t.cPct)} · avance ${pctTxt1(t.pct)}` : 'sin EP') : [resLabel(t.resources), t.pct>0? Math.round(t.pct)+'%' : ''].filter(Boolean).join('  ');
      if(lab) s+=`<text x="${g.x1+6}" y="${yy+hh-2}" class="blab">${esc(lab)}</text>`;
    }
    if(t.deadline){ const xd=X(toDN(t.deadline)+1); s+=`<path d="M${xd-4} ${y+1}h8l-4 6z" fill="${t.dlMiss?'var(--crit)':'var(--ok)'}"><title>Fecha límite ${fL(toDN(t.deadline))}</title></path>`; }
  });
  s+='</svg>';
  $('#chartBody').innerHTML=s;
}
function render(){
  document.body.classList.toggle('v-cobro', P.view.table==='cobro');
  computeVisible(); renderHeader(); renderGrid(); renderChart(); syncControls(); renderStatus();
  if(P.view.table==='cobro'){ $('#cbUnit').value=P.epUnit||'$'; $('#cbUnit').disabled=readOnly; $('#cbImport').disabled=readOnly;
    $('#cbInfo').textContent = COBRO.any? (COBRO.nOver? `${COBRO.nOver} partidas cobradas por sobre su avance` : 'Sin sobrecobros') : 'Aún no hay EP cargado: escribe los montos en la tabla o carga el CSV del EP.'; }
}
function syncControls(){
  $('#selTable').value=P.view.table; $('#selFilter').value=P.view.filter; $('#selDurU').value=P.view.durUnit||'hab'; $('#selZoom').value=P.view.zoom;
  $('#zoomRange').value=ZKEYS.indexOf(P.view.zoom);
  $('#cbCrit').checked=P.view.crit; $('#cbBase').checked=P.view.base; $('#cbLinks').checked=P.view.links; $('#cbSlack').checked=P.view.slack;
  document.querySelectorAll('.ribbon .rb, .ribbon .sel').forEach(b=>{ if(b.dataset.act&&['addTask','addMilestone','del','cut','paste','outdent','indent','link','unlink','updateSched','setBaseline','import'].includes(b.dataset.act)) b.disabled=readOnly; if(b.dataset.pct!=null) b.disabled=readOnly; });
}
function renderStatus(){
  const n=P.tasks.filter(t=>!t.isSum).length, m=P.tasks.filter(t=>t.mil).length;
  $('#sbLeft').textContent = `${P.tasks.length} filas, ${n} tareas y ${m} hitos. Programación automática, calendario lunes a viernes${HOL.size?` con ${HOL.size} feriados`:''}.`;
  const t=byUid.get(selUid);
  $('#sbMid').textContent = t? `Seleccionada: ${t.row} ${t.name}${selSet.size>1?` (+${selSet.size-1})`:''}` : P.baselineLabel;
}

/* ---------- Edición en celda ---------- */
function startEdit(td){
  if(readOnly) return;
  const tr=td.closest('tr'); const t=byUid.get(+tr.dataset.u); const c=td.dataset.c; if(!t||!COLS[c]||!COLS[c].edit) return;
  if(t.isSum && ['dur','start','finish'].includes(c)){ toast('Las fechas y la duración de un resumen se calculan a partir de sus subtareas.'); return; }
  let val='', type='text';
  if(c==='name') val=t.name; else if(c==='resp') val=t.resp||''; else if(c==='dur') val=String(dispDur(t));
  else if(c==='start'){ type='date'; val=iso(t.sDn); } else if(c==='finish'){ type='date'; val=iso(t.fDn); }
  else if(c==='preds') val=predText(t); else if(c==='pct'){ type='number'; val=String(Math.round(t.pct)); }
  else if(['ctot','ccob','cpct'].includes(c)){ if(t.isSum){ toast('Los montos de un resumen se suman desde sus partidas. Edita las partidas.'); return; }
    val = c==='ctot'? (t.cTot!=null? String(t.cTot) : '') : c==='ccob'? (t.cCob!=null? String(Math.round(t.cCob*100)/100) : '') : (t.cPct!=null? String(Math.round(t.cPct*10)/10) : ''); }
  td.innerHTML=''; const inp=document.createElement('input'); inp.type=type; inp.value=val; inp.className='cell-ed'; inp.setAttribute('aria-label',COLS[c].h);
  if(type==='number'){ inp.min=0; inp.max=100; }
  td.appendChild(inp); inp.focus(); if(type==='text') inp.select();
  let done=false;
  const fin=ok=>{ if(done) return; done=true; if(ok && inp.value!==val) commitCell(t.uid,c,inp.value); else renderGrid(); };
  inp.addEventListener('keydown',e=>{ e.stopPropagation(); if(e.key==='Enter'){ e.preventDefault(); fin(true); } else if(e.key==='Escape'){ e.preventDefault(); fin(false); } });
  inp.addEventListener('blur',()=>fin(true));
}
function parseDur(v){ const m=/^\s*(-?\d+(?:[.,]\d+)?)\s*(d|días|dias|día|dia|s|sem|semanas?|ms|mes|meses)?\s*$/i.exec(v); if(!m) return null;
  let n=parseFloat(m[1].replace(',','.')); const u=(m[2]||'d').toLowerCase(); if(u.startsWith('s')) n*=5; else if(u.startsWith('m')) n*=20; return Math.round(n); }
function commitCell(uid,c,v){
  const ok = mutate(()=>{ const t=byUid.get(uid); if(!t) return false;
    if(c==='start'||c==='finish') t.cAuto=false;
    switch(c){
      case 'name': if(!v.trim()) return 'El nombre no puede quedar vacío.'; t.name=v.trim(); break;
      case 'resp': t.resources=parseResTxt(v); t.resp=resLabel(t.resources); break;
      case 'dur': { const n=parseDurU(v); if(n==null||n<0) return `Escribe la duración en días ${unitTxt()}, por ejemplo 20 o 4 sem.`; t.dur = isCor()? (n===0?0:corToHab(t.es,n)) : n; break; }
      case 'ctot': case 'ccob': case 'cpct': { const n=v.trim()===''? null : cParse(v); if(v.trim()!=='' && n==null) return 'Escribe un número.'; if(n!=null&&n<0) return 'El valor no puede ser negativo.';
        t.custom=t.custom||{};
        if(c==='ctot'){ if(n==null) delete t.custom.EP_Total; else t.custom.EP_Total=n; }
        else if(c==='ccob'){ if(n==null) delete t.custom.EP_Cobrado; else t.custom.EP_Cobrado=n; delete t.custom.EP_Pct; }
        else { if(n!=null&&n>100.0001){ /* permitido: sobrecobro sobre el total */ } if(n==null){ delete t.custom.EP_Pct; delete t.custom.EP_Cobrado; } else if(t.custom.EP_Total){ t.custom.EP_Cobrado=t.custom.EP_Total*n/100; delete t.custom.EP_Pct; } else t.custom.EP_Pct=n; }
        break; }
      case 'pct': { const n=Math.round(+v); if(!isFinite(n)||n<0||n>100) return 'El % completado va de 0 a 100.'; for(const l of leavesOf(t)) l.pct=n; break; }
      case 'preds': return setPreds(t,v)||undefined;
      case 'start': { const d=toDN(v); if(d==null) return 'Fecha no válida.'; if(t.manual){ t.mStart=iso(d); break; } if(t.cType!=='MSO') t.cType='SNET'; t.cDate=iso(d); setTimeout(()=>toast(`Se fijó la restricción «${CT_LABEL[t.cType]}» ${fL(d)}. Cámbiala en Información si no la necesitas.`),30); break; }
      case 'finish': { const d=toDN(v); if(d==null) return 'Fecha no válida.';
        if(t.dur===0){ if(t.manual){ t.mStart=iso(d); break; } if(t.cType!=='MSO') t.cType='SNET'; t.cDate=iso(d); break; }
        const n=endB(d)-t.es; if(n<1) return 'El fin no puede ser anterior al comienzo.'; t.dur=n; break; }
    }
  });
  if(ok && ['start','finish','preds','dur'].includes(c)) setTimeout(()=>checkFFFixed(uid),60);
}

/* ---------- Fecha fija con dependencia FF ---------- */
function chainFor(start){
  const seen=new Map(), st=[...start];
  while(st.length){ const x=st.pop(); if(seen.has(x.uid)) continue; seen.set(x.uid,x);
    const ch=[x]; let p=x.parent; while(p>=0){ ch.push(P.tasks[p]); p=P.tasks[p].parent; }
    for(const o of ch) for(const l of o.preds){ const q=byUid.get(l.uid); if(q) st.push(...leavesOf(q)); } }
  return [...seen.values()].sort((a,b)=>a.i-b.i);
}
function hasPredsEff(x){ let o=x; while(o){ if(o.preds.some(l=>{ const q=byUid.get(l.uid); return q && !q.off; })) return true; o=o.parent>=0?P.tasks[o.parent]:null; } return false; }
let ffBusy=false;
async function checkFFFixed(uid){
  if(ffBusy||readOnly) return; ffBusy=true;
  try{
    const t0=byUid.get(uid); if(!t0||t0.isSum||!isFixed(t0)) return;
    const links=t0.preds.filter(l=>l.type==='FF').map(l=>({...l}));
    for(const l of links){
      const t=byUid.get(uid), q=byUid.get(l.uid); if(!t||!q) continue;
      const target=t.ef-l.lag, delta=target-q.ef; if(delta===0) continue;
      const tgtF=dnOf(target-1);
      const head=`La actividad ${t.row} «${t.name}» tiene fecha fija (${fixedTxt(t)}) y una dependencia FF (fin a fin) con su predecesora ${q.row} «${q.name}»${l.lag?` con posposición de ${l.lag} días`:''}.\n\nPara cumplir la dependencia, la predecesora debe terminar el ${fL(tgtF)}. Hoy termina el ${fL(q.fDn)}.`;
      const chain=chainFor(leavesOf(q));
      const blockers=chain.filter(x=>(x.manual && x.mStart) || (x.cDate && x.cType!=='ASAP' && !(x.cType==='SNET' && x.cAuto)));
      if(blockers.length){
        await ask(`${head}\n\nNo es posible realizar el cambio hasta que se elimine o modifique la fecha definida de ${blockers.length===1?'esta actividad de la cadena':'estas actividades de la cadena'}:\n${blockers.map(x=>`• ${x.row} ${x.name}: ${fixedTxt(x)}`).join('\n')}\n\nCambia la restricción a «Lo antes posible» (o el modo a Programada automáticamente) en Información de la tarea y luego vuelve a guardar la actividad ${t.row}.`,
          'Entendido',{info:true,title:'No es posible mover la cadena'});
        continue;
      }
      const early=chain.filter(x=>!hasPredsEff(x)).find(x=>x.es+delta<PSTART);
      if(early){
        await ask(`${head}\n\nNo es posible realizar el cambio hasta que se adelante la fecha de comienzo del proyecto: la actividad ${early.row} «${early.name}» tendría que comenzar el ${fL(dnOf(early.es+delta))}, antes del inicio del proyecto (${fL(toDN(P.startDate))}). Puedes cambiarla en Proyecto y calendario.`,
          'Entendido',{info:true,title:'No es posible mover la cadena'});
        continue;
      }
      const n=chain.length, dd=Math.abs(delta);
      const okA=await ask(`${head}\n\n¿Deseas modificar la fecha de término de la predecesora y actualizar toda la cadena de actividades que la preceden?\n\nSe ${n===1?'moverá 1 actividad':`moverán ${n} actividades`} ${dd} ${dd===1?'día laborable':'días laborables'} ${delta>0?'hacia adelante':'hacia atrás'}, sin cambiar sus duraciones. Las actividades que dependen de ellas se reprogramarán según sus vínculos.`,
        'Mover cadena',{title:'Dependencia FF con fecha fija',cancel:'No, mantener fechas'});
      if(!okA) continue;
      const uids=chain.map(x=>x.uid);
      const done=mutate(()=>{ for(const u of uids){ const x=byUid.get(u); const ns=x.es+delta;
        if(!hasPredsEff(x) || (x.cType==='SNET' && x.cAuto)){ x.cType='SNET'; x.cAuto=true; x.cDate=iso(x.dur===0? dnOf(ns-1) : dnOf(ns)); } } });
      if(!done) continue;
      const q2=byUid.get(l.uid), t2=byUid.get(uid);
      if(q2 && t2 && q2.ef===t2.ef-l.lag) toast(`Cadena actualizada: ${n} ${n===1?'actividad movida':'actividades movidas'} ${delta>0?'+':'−'}${dd} días. ${q2.row} «${q2.name}» termina el ${fL(q2.fDn)}. Deshacer con Ctrl+Z.`);
      else toast('La cadena se movió, pero la predecesora no quedó alineada con la fecha fija. Revisa las otras dependencias de la cadena.','err');
    }
  } finally { ffBusy=false; }
}

/* ---------- Diálogos ---------- */
function ask(msg, okLabel, o={}){
  return new Promise(res=>{ const d=$('#dlgAsk'); $('#askMsg').textContent=msg; $('#askOk').textContent=okLabel||'Aceptar';
    $('#daH').textContent=o.title||'Confirmar'; $('#askCancel').hidden=!!o.info; $('#askCancel').textContent=o.cancel||'Cancelar';
    d.returnValue=''; d.onclose=()=>res(d.returnValue==='ok'); d.showModal(); });
}
const DEP_TYPES = [
  ['FS','FC','Fin a comienzo','El final de la predecesora marca el comienzo de esta tarea.'],
  ['SS','CC','Comienzo a comienzo','Ambas tareas comienzan a la vez, el mismo día.'],
  ['FF','FF','Fin a fin','Ambas tareas terminan en la misma fecha, a la vez.'],
  ['SF','CF','Comienzo a fin','El comienzo de la predecesora marca el final de esta tarea. Es el caso menos frecuente.']
];
const DEP = Object.fromEntries(DEP_TYPES.map(d=>[d[0],{code:d[1],name:d[2],desc:d[3]}]));
const CUSTOM_FIELDS = [['Texto1','text'],['Texto2','text'],['Texto3','text'],['Texto4','text'],['Texto5','text'],['Número1','number'],['Número2','number'],['Número3','number'],['Fecha1','date'],['Fecha2','date'],['Marca1','check'],['Marca2','check']];
const XSVG='<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m4 4 8 8M12 4l-8 8"/></svg>';
let tiUid=null;
function tiTab(name){
  document.querySelectorAll('#dlgTask .tab').forEach(b=>{ const on=b.dataset.tab===name; b.setAttribute('aria-selected',String(on)); b.tabIndex=on?0:-1; });
  document.querySelectorAll('#dlgTask .tabpanel').forEach(p=>p.hidden=p.dataset.panel!==name);
}
document.querySelector('#dlgTask .tabs').addEventListener('click',e=>{ const b=e.target.closest('.tab'); if(b) tiTab(b.dataset.tab); });
document.querySelector('#dlgTask .tabs').addEventListener('keydown',e=>{
  if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft') return; const tabs=[...document.querySelectorAll('#dlgTask .tab')];
  let i=tabs.findIndex(b=>b.getAttribute('aria-selected')==='true'); i=(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length; tiTab(tabs[i].dataset.tab); tabs[i].focus(); e.preventDefault(); });
$('#tCancel').addEventListener('click',()=>$('#dlgTask').close('cancel'));
function predCandidates(t){ return P.tasks.filter(q=>q.uid!==t.uid && !isAncestor(q,t) && !isAncestor(t,q)); }
const lagTxt = n => `${n||0}d`;
function parseLag(v){ v=String(v||'').trim(); if(!v) return 0; const m=/^([+-]?\s*\d+)\s*(d|días?|dias?)?$/i.exec(v); return m? parseInt(m[1].replace(/\s/g,''),10) : null; }
function renumber(tb){ [...tb.children].forEach((tr,i)=>{ const c=tr.querySelector('.rn'); if(c) c.textContent=i+1; }); }
function gridEnsureBlank(tb, make, filled, min){
  while(tb.children.length<min) tb.appendChild(make());
  if(filled(tb.lastElementChild)) tb.appendChild(make());
  renumber(tb);
}
/* Predecesoras */
function predRowFilled(tr){ return !!tr.querySelector('.pid').value.trim(); }
function makePredRow(t, l){
  const tr=document.createElement('tr'); const q=l? byUid.get(l.uid) : null;
  const opts=predCandidates(t).map(c=>`<option value="${c.uid}" ${q&&c.uid===q.uid?'selected':''}>${esc(c.name)}${c.isSum?' (resumen)':''}</option>`).join('');
  tr.innerHTML=`<td class="rn"></td><td><input class="pid" inputmode="numeric" aria-label="Id de la predecesora" value="${q?q.row:''}"></td>
    <td><select class="pname" aria-label="Nombre de tarea"><option value=""></option>${opts}</select></td>
    <td><select class="ptype" aria-label="Tipo de dependencia">${DEP_TYPES.map(d=>`<option value="${d[0]}" ${(l?l.type:'FS')===d[0]?'selected':''}>${d[2]} (${d[1]})</option>`).join('')}</select></td>
    <td><input class="plag" aria-label="Posposición" value="${l?lagTxt(l.lag):''}" placeholder=""></td>
    <td class="c-x"><button type="button" class="xbtn" aria-label="Quitar predecesora" title="Quitar predecesora">${XSVG}</button></td>`;
  const pid=tr.querySelector('.pid'), pn=tr.querySelector('.pname'), pt=tr.querySelector('.ptype'), pl=tr.querySelector('.plag');
  const tb=()=>$('#tPredRows');
  const syncFromId=()=>{ const v=pid.value.trim(); if(!v){ pn.value=''; tr.classList.remove('bad'); return; }
    const c=P.tasks[+v-1]; const ok = c && [...pn.options].some(o=>o.value==String(c.uid));
    pn.value = ok? String(c.uid) : ''; tr.classList.toggle('bad',!ok); tr.title = ok? '' : (c? 'No se puede vincular con esta tarea (es la misma tarea o pertenece a su mismo resumen).' : `La tarea ${v} no existe.`);
    if(ok && !pl.value) pl.value='0d'; };
  pid.addEventListener('input',()=>{ syncFromId(); gridEnsureBlank(tb(),()=>makePredRow(t,null),predRowFilled,8); });
  pn.addEventListener('change',()=>{ const c=byUid.get(+pn.value); pid.value=c? c.row : ''; tr.classList.remove('bad'); tr.title=''; if(c && !pl.value) pl.value='0d'; gridEnsureBlank(tb(),()=>makePredRow(t,null),predRowFilled,8); });
  const typ=()=>tr.classList.toggle('nonstd', pt.value!=='FS' && !!pid.value.trim());
  pt.addEventListener('change',typ); pid.addEventListener('input',typ); pn.addEventListener('change',typ); typ();
  tr.querySelector('.xbtn').addEventListener('click',()=>{ tr.remove(); gridEnsureBlank(tb(),()=>makePredRow(t,null),predRowFilled,8); });
  return tr;
}
function readPredGrid(){
  const out=[]; let err=null; const seen=new Set();
  [...$('#tPredRows').children].forEach((tr,i)=>{ if(err) return;
    const v=tr.querySelector('.pid').value.trim(); if(!v) return;
    const q=P.tasks[+v-1]; if(!/^\d+$/.test(v) || !q){ err=`Predecesoras, fila ${i+1}: la tarea ${v} no existe.`; return; }
    const lag=parseLag(tr.querySelector('.plag').value); if(lag==null){ err=`Predecesoras, fila ${i+1}: la posposición «${tr.querySelector('.plag').value}» no es válida. Usa por ejemplo 5d o -5d.`; return; }
    if(seen.has(q.uid)){ err=`Predecesoras: la tarea ${q.row} aparece más de una vez.`; return; } seen.add(q.uid);
    out.push({uid:q.uid, type:tr.querySelector('.ptype').value, lag}); });
  return {list:out, err};
}
function predsToText(list){ return list.map(l=>{ const q=byUid.get(l.uid); return q? `${q.row}${DEP[l.type].code}${l.lag?(l.lag>0?'+':'')+l.lag:''}` : ''; }).filter(Boolean).join(';'); }
/* Recursos */
function resRowFilled(tr){ return !!tr.querySelector('.rname').value.trim(); }
function makeResRow(r){
  const tr=document.createElement('tr');
  tr.innerHTML=`<td class="rn"></td><td><input class="rname" list="resList" aria-label="Nombre del recurso" value="${r?esc(r.name):''}"></td>
    <td><input class="runits" type="number" min="0" step="5" aria-label="Unidades" value="${r?r.units:''}"></td>
    <td class="c-x"><button type="button" class="xbtn" aria-label="Quitar recurso" title="Quitar recurso">${XSVG}</button></td>`;
  const tb=()=>$('#tResRows');
  tr.querySelector('.rname').addEventListener('input',e=>{ const u=tr.querySelector('.runits'); if(e.target.value.trim() && !u.value) u.value=100; gridEnsureBlank(tb(),()=>makeResRow(null),resRowFilled,6); });
  tr.querySelector('.xbtn').addEventListener('click',()=>{ tr.remove(); gridEnsureBlank(tb(),()=>makeResRow(null),resRowFilled,6); });
  return tr;
}
function readResGrid(){
  const out=[]; let err=null;
  [...$('#tResRows').children].forEach((tr,i)=>{ if(err) return; const n=tr.querySelector('.rname').value.trim(); if(!n) return;
    const u=tr.querySelector('.runits').value===''?100:+tr.querySelector('.runits').value; if(!isFinite(u)||u<0){ err=`Recursos, fila ${i+1}: las unidades deben ser un número mayor o igual a 0.`; return; }
    out.push({name:n, units:Math.round(u)}); });
  return {list:out, err};
}
/* Campos personalizados */
function buildCustom(t){
  $('#tCustRows').innerHTML=CUSTOM_FIELDS.map(([f,ty])=>{ const v=(t.custom||{})[f];
    const inp = ty==='check' ? `<label class="fc" style="padding:0 8px;height:27px"><input type="checkbox" data-cf="${f}" ${v?'checked':''}>Sí</label>`
      : `<input data-cf="${f}" type="${ty}" value="${v==null?'':esc(v)}" aria-label="${f}">`;
    return `<tr><td class="c-fld">${f}</td><td>${inp}</td></tr>`; }).join('');
}
function readCustom(){
  const o={}; $('#tCustRows').querySelectorAll('[data-cf]').forEach(el=>{ const f=el.dataset.cf;
    if(el.type==='checkbox'){ if(el.checked) o[f]=true; } else if(el.value!=='') o[f]= el.type==='number'? +el.value : el.value; });
  return o;
}
function syncCDate(){ const on=$('#tCType').value!=='ASAP' && !$('#tCType').disabled; $('#tCDate').disabled=!on; }
$('#tCType').addEventListener('change',()=>{ syncCDate(); if($('#tCType').value!=='ASAP' && !$('#tCDate').value){ const t=byUid.get(tiUid); if(t) $('#tCDate').value = iso(/F/.test($('#tCType').value)? t.fDn : t.sDn); } });
$('#tMil').addEventListener('change',()=>{ const d=$('#tDur'); if($('#tMil').checked){ d.dataset.prev=d.value; d.value='0'; d.disabled=true; } else { d.disabled=false; d.value = d.dataset.prev && d.dataset.prev!=='0' ? d.dataset.prev : '1'; } });

function openInfo(){
  const t=byUid.get(selUid); if(!t){ toast('Selecciona una tarea.'); return; }
  tiUid=t.uid; const sum=t.isSum;
  $('#dtH').textContent=`Información de la tarea ${t.row}${sum?' (resumen)':''}`;
  $('#tName').value=t.name; $('#tDur').value=sum? durTxt(dispDur(t)) : (dispDur(t)===1?'1 día':`${dispDur(t)} días`); $('#tDur').dataset.shown=$('#tDur').value; $('#tDurLbl').firstChild.textContent=`Duración (${unitTxt()})`; $('#tDur').disabled=sum||t.mil; $('#tEst').checked=!!t.est; $('#tEst').disabled=sum;
  // General
  $('#tPct').value=Math.round(t.pct); $('#tPrio').value=t.prio==null?500:t.prio;
  document.querySelectorAll('input[name="tMode"]').forEach(r=>{ r.checked = r.value===(t.manual?'manual':'auto'); r.disabled=sum; });
  $('#tInactive').checked=!!t.inactive;
  $('#tStart').value=iso(t.sDn); $('#tFinish').value=iso(t.fDn); $('#tStart').disabled=$('#tFinish').disabled=sum;
  $('#tKey').checked=!!t.key; $('#tHide').checked=!!t.hideBar; $('#tSum').checked=sum;
  // Predecesoras
  const pt=$('#tPredRows'); pt.innerHTML=''; t.preds.forEach(l=>{ if(byUid.get(l.uid)) pt.appendChild(makePredRow(t,l)); }); gridEnsureBlank(pt,()=>makePredRow(t,null),predRowFilled,8);
  // Recursos
  const names=[...new Set(P.tasks.flatMap(x=>(x.resources||[]).map(r=>r.name)))].sort((a,b)=>a.localeCompare(b,'es'));
  $('#resList').innerHTML=names.map(n=>`<option value="${esc(n)}">`).join('');
  const rt=$('#tResRows'); rt.innerHTML=''; (t.resources||[]).forEach(r=>rt.appendChild(makeResRow(r))); gridEnsureBlank(rt,()=>makeResRow(null),resRowFilled,6);
  // Avanzado
  $('#tDeadline').value=t.deadline||''; $('#tCType').value=t.cType||'ASAP'; $('#tCDate').value=t.cDate||''; $('#tCType').disabled=sum; syncCDate();
  $('#tType').value=t.taskType||'units'; $('#tEffort').checked=!!t.effort; $('#tCal').value='std'; $('#tIgnRes').checked=!!t.ignoreResCal;
  $('#tWbs').value=t.wbs; $('#tEvm').value=t.evm||'pct'; $('#tMil').checked=t.mil; $('#tMil').disabled=sum; $('#tDur').dataset.prev='';
  // Notas y campos
  $('#tNotes').value=t.notes||''; buildCustom(t);
  $('#tErr').textContent=''; $('#tOk').disabled=readOnly;
  tiTab('general'); $('#dlgTask').showModal();
}
$('#fTask').addEventListener('submit',e=>{
  e.preventDefault();
  const t=byUid.get(tiUid); if(!t){ $('#dlgTask').close(); return; }
  const fail=(msg,tab,el)=>{ $('#tErr').textContent=msg; if(tab) tiTab(tab); if(el) el.focus(); };
  const sum=t.isSum, mil=!sum && $('#tMil').checked;
  const name=$('#tName').value.trim(); if(!name) return fail('El nombre no puede quedar vacío.','general',$('#tName'));
  const durRaw=$('#tDur').value, durSame = durRaw===$('#tDur').dataset.shown;
  let dur = sum? t.dur : (mil? 0 : (durSame? t.dur : parseDurU(durRaw)));
  if(dur==null||dur<0) return fail(`Escribe la duración en días ${unitTxt()}, por ejemplo 20 días o 4 sem.`,'general',$('#tDur'));
  if(!sum && !mil && !durSame && isCor() && dur>0){ const sIn0=$('#tStart').value; const sb0 = sIn0 && sIn0!==iso(t.sDn) && toDN(sIn0)!=null ? idxOf(toDN(sIn0)) : t.es; dur=corToHab(sb0,dur); }
  if(!sum && !mil && dur===0) dur=0;
  const pct=Math.round(+$('#tPct').value); if(!isFinite(pct)||pct<0||pct>100) return fail('El porcentaje completado va de 0 a 100.','general',$('#tPct'));
  const prio=Math.round(+$('#tPrio').value); if(!isFinite(prio)||prio<0||prio>1000) return fail('La prioridad va de 0 a 1000.','general',$('#tPrio'));
  const mode=(document.querySelector('input[name="tMode"]:checked')||{}).value||'auto';
  const ct=$('#tCType').value, cd=$('#tCDate').value;
  if(!sum && ct!=='ASAP' && !toDN(cd)) return fail('Indica la fecha de restricción.','adv',$('#tCDate'));
  const pr=readPredGrid(); if(pr.err) return fail(pr.err,'pred');
  const predTxt=predsToText(pr.list); const chk=parsePreds(predTxt,t); if(chk.err) return fail(chk.err,'pred');
  const rr=readResGrid(); if(rr.err) return fail(rr.err,'rec');
  // Fechas de la pestaña General
  const sIn=$('#tStart').value, fIn=$('#tFinish').value, oS=iso(t.sDn), oF=iso(t.fDn);
  const sCh=!sum && !!sIn && sIn!==oS, fCh=!sum && !!fIn && fIn!==oF;
  if(!sum && ((sIn && !toDN(sIn)) || (fIn && !toDN(fIn)))) return fail('Revisa las fechas de inicio y fin.','general');
  let newStart = sCh? sIn : null;
  if(fCh){
    if(dur===0){ if(!sCh) newStart=fIn; }
    else { const sb = sCh? idxOf(toDN(sIn)) : t.es; const n=endB(toDN(fIn))-sb; if(n<1) return fail('El fin no puede ser anterior al inicio.','general',$('#tFinish')); dur=n; }
  }
  const ctChanged = ct!==(t.cType||'ASAP') || (ct!=='ASAP' && cd!==t.cDate);
  const uid=t.uid;
  $('#dlgTask').close('ok');
  const ok=mutate(()=>{
    const x=byUid.get(uid);
    x.name=name; x.est=$('#tEst').checked && !sum; x.prio=prio; x.inactive=$('#tInactive').checked;
    x.key=$('#tKey').checked; x.hideBar=$('#tHide').checked;
    for(const l of leavesOf(x)) l.pct=pct;
    x.deadline=$('#tDeadline').value||''; x.taskType=$('#tType').value; x.effort=$('#tEffort').checked; x.ignoreResCal=$('#tIgnRes').checked; x.evm=$('#tEvm').value;
    x.notes=$('#tNotes').value.trim(); x.custom=Object.assign(Object.fromEntries(Object.entries(x.custom||{}).filter(([k])=>!CUSTOM_FIELDS.some(c=>c[0]===k))), readCustom());
    x.resources=rr.list; x.resp=resLabel(rr.list);
    if(!sum){
      x.dur=dur;
      if(ctChanged){ x.cType=ct; x.cDate= ct==='ASAP'? '' : cd; x.cAuto=false; }
      const wasManual=!!x.manual; x.manual = mode==='manual';
      if(x.manual){ x.mStart = newStart || (wasManual && x.mStart) || oS; }
      else if(newStart && !ctChanged){ x.cType='SNET'; x.cDate=newStart; x.cAuto=false; }
    }
    return setPreds(x,predTxt)||undefined;
  });
  if(ok) setTimeout(()=>checkFFFixed(uid),80);
});
function openProject(){
  $('#pTitleIn').value=P.title; $('#pNameIn').value=P.name; $('#pRevIn').value=P.rev; $('#pStartIn').value=P.startDate; $('#pStatusIn').value=P.statusDate;
  $('#pHolIn').value=(P.holidays||[]).map(h=>`${h.date} ${h.name||''}`.trim()).join('\n'); $('#pErr').textContent='';
  $('#dlgProj').showModal();
}
$('#fProj').addEventListener('submit',e=>{
  if(e.submitter && e.submitter.value!=='ok') return;
  const hol=[]; let err=null;
  for(const line of $('#pHolIn').value.split('\n')){ const s=line.trim(); if(!s) continue; const m=/^(\d{4}-\d{2}-\d{2})\s*(.*)$/.exec(s); if(!m||toDN(m[1])==null){ err=`Línea no válida: «${s}». Usa AAAA-MM-DD Nombre.`; break; } hol.push({date:m[1],name:m[2]}); }
  if(!toDN($('#pStartIn').value)||!toDN($('#pStatusIn').value)) err='Revisa las fechas de comienzo y de estado.';
  if(err){ e.preventDefault(); $('#pErr').textContent=err; return; }
  mutate(()=>{ P.title=$('#pTitleIn').value.trim()||P.title; P.name=$('#pNameIn').value.trim(); P.rev=$('#pRevIn').value.trim();
    P.startDate=$('#pStartIn').value; P.statusDate=$('#pStatusIn').value; P.holidays=hol.sort((a,b)=>a.date<b.date?-1:1); });
});

/* ---------- Selección, teclado, eventos ---------- */
function select(uid, e){
  if(e && (e.ctrlKey||e.metaKey)){ if(selSet.has(uid)) selSet.delete(uid); else selSet.add(uid); selUid=uid; anchorUid=uid; }
  else if(e && e.shiftKey && anchorUid!=null && VIS.some(t=>t.uid===anchorUid)){ const a=VIS.findIndex(t=>t.uid===anchorUid), b=VIS.findIndex(t=>t.uid===uid); selSet=new Set(VIS.slice(Math.min(a,b),Math.max(a,b)+1).map(t=>t.uid)); selUid=uid; }
  else { selSet=new Set([uid]); selUid=uid; anchorUid=uid; }
  paintSelection();
}
function paintSelection(){
  const on=u=>selSet.has(u)||u===selUid;
  document.querySelectorAll('#grid tr[data-u]').forEach(tr=>{ const u=+tr.dataset.u; tr.classList.toggle('sel',on(u)); tr.setAttribute('aria-selected',String(on(u))); });
  document.querySelectorAll('#chartBody rect[data-row]').forEach(r=>r.setAttribute('fill', on(+r.dataset.row)?'var(--sel)':'transparent'));
  renderStatus();
}
/* ---------- Desplazar filas manteniendo presionado ---------- */
let rowDrag=null, suppressClick=false;
const HOLD_MS=320;
function dropTargetAt(clientY){
  const rows=[...document.querySelectorAll('#grid tbody tr[data-u]')]; if(!rows.length) return null;
  for(let k=0;k<rows.length;k++){ const r=rows[k].getBoundingClientRect(); if(clientY < r.top + r.height/2) return {k, y:rows[k].offsetTop}; }
  const last=rows[rows.length-1]; return {k:rows.length, y:last.offsetTop+last.offsetHeight};
}
function rowDragStart(){
  const d=rowDrag; d.active=true; suppressClick=true;
  const tr=document.querySelector(`#grid tr[data-u="${d.uid}"]`); if(tr){ tr.classList.remove('rowhold'); tr.classList.add('rowdrag'); }
  const t=byUid.get(d.uid); const n=subtreeEnd(t.i)-t.i;
  d.ghost=document.createElement('div'); d.ghost.className='dragghost'; d.ghost.textContent=`${t.row} ${t.name}${n?` (+${n} subtareas)`:''}`; document.body.appendChild(d.ghost);
  d.line=document.createElement('div'); d.line.className='dropline'; gp.appendChild(d.line);
  document.body.classList.add('rowdragging');
  if(navigator.vibrate) try{ navigator.vibrate(15); }catch(e){}
  rowDragMove(d.lx, d.ly);
}
function rowDragMove(x,y){
  const d=rowDrag; if(!d||!d.active) return;
  d.ghost.style.left=(x+14)+'px'; d.ghost.style.top=(y+10)+'px';
  const r=gp.getBoundingClientRect();
  if(y<r.top+54) gp.scrollTop-=12; else if(y>r.bottom-24) gp.scrollTop+=12;
  const tg=dropTargetAt(y); d.target=tg; if(!tg) return;
  const below=VIS[tg.k], above=VIS[tg.k-1];
  const t=byUid.get(d.uid), inside = (below && (below.uid===t.uid || isAncestor(t,below))) || (above && isAncestor(t,above) && below && isAncestor(t,below));
  const lvl = below? below.level : (above? above.level : 2);
  d.bad = !!inside;
  d.line.style.display='block'; d.line.style.top=(tg.y-1)+'px';
  const nameCol=document.querySelector('#grid th:nth-child(1)'); const left=(nameCol?nameCol.offsetWidth:40)+ ( (TABLES[P.view.table]||[]).includes('ind')?38:0 ) + (lvl-1)*15+4;
  d.line.style.left=left+'px'; d.line.style.width=Math.max(120,$('#grid').offsetWidth-left)+'px';
  d.line.style.borderTopColor = d.bad? 'var(--crit)' : 'var(--accent)';
}
function rowDragEnd(cancel){
  const d=rowDrag; rowDrag=null; if(!d) return; clearTimeout(d.timer);
  document.querySelectorAll('#grid tr.rowhold,#grid tr.rowdrag').forEach(tr=>tr.classList.remove('rowhold','rowdrag'));
  if(!d.active) return;
  d.ghost&&d.ghost.remove(); d.line&&d.line.remove(); document.body.classList.remove('rowdragging');
  setTimeout(()=>{ suppressClick=false; },0);
  if(cancel || !d.target) return;
  if(d.bad){ toast('No se puede mover una tarea dentro de sí misma.','err'); return; }
  moveTaskTo(d.uid, d.target.k);
}
function moveTaskTo(uid, k){
  const below=VIS[k], above=VIS[k-1];
  mutate(()=>{
    const T=P.tasks, t=byUid.get(uid); const a=t.i, b=subtreeEnd(a);
    let at; if(below) at=below.i; else at=above? subtreeEnd(above.i)+1 : T.length;
    if(at>=a && at<=b+1) return false;                  // misma posición
    const lvl = below? below.level : (above? (above.isSum && !above.collapsed ? above.level+1 : above.level) : t.level);
    const block=T.splice(a,b-a+1); const dl=Math.max(1,lvl)-block[0].level; block.forEach(x=>x.level=Math.max(1,x.level+dl));
    if(at>b) at-=block.length;
    T.splice(at,0,...block);
    structure();
    for(const x of T) for(const l of x.preds){ const q=byUid.get(l.uid); if(q && (isAncestor(q,x)||isAncestor(x,q))) return 'No se puede mover ahí: la tarea quedaría vinculada con su propio resumen. Quita ese vínculo primero.'; }
    if(hasCycle()) return 'No se puede mover ahí: se crearía una referencia circular entre resúmenes y vínculos.';
  }) && toast('Tarea desplazada. Los Id se renumeraron y las predecesoras se mantienen. Deshacer con Ctrl+Z.');
}
$('#gridPane').addEventListener('pointerdown',e=>{
  if(readOnly || e.button!==0 || e.target.closest('input,button,select')) return;
  const tr=e.target.closest('#grid tbody tr[data-u]'); if(!tr) return;
  const onId=!!e.target.closest('td.c-id');
  rowDrag={uid:+tr.dataset.u, x:e.clientX, y:e.clientY, lx:e.clientX, ly:e.clientY, id:e.pointerId, active:false, onId, touch:e.pointerType!=='mouse'};
  rowDrag.timer=setTimeout(()=>{ if(rowDrag && !rowDrag.active){ rowDragStart(); } }, HOLD_MS);
  setTimeout(()=>{ if(rowDrag && !rowDrag.active) tr.classList.add('rowhold'); }, 120);
});
window.addEventListener('pointermove',e=>{
  const d=rowDrag; if(!d || e.pointerId!==d.id) return; d.lx=e.clientX; d.ly=e.clientY;
  if(!d.active){ const m=Math.hypot(e.clientX-d.x,e.clientY-d.y);
    if(m>6){ if(d.onId && !d.touch) rowDragStart(); else rowDragEnd(true); } return; }
  e.preventDefault(); rowDragMove(e.clientX,e.clientY);
});
window.addEventListener('pointerup',e=>{ if(rowDrag && e.pointerId===rowDrag.id) rowDragEnd(false); });
window.addEventListener('pointercancel',e=>{ if(rowDrag && e.pointerId===rowDrag.id && !rowDrag.active) rowDragEnd(true); });
$('#gridPane').addEventListener('touchmove',e=>{ if(rowDrag && rowDrag.active){ e.preventDefault(); const t=e.touches[0]; rowDrag.lx=t.clientX; rowDrag.ly=t.clientY; rowDragMove(t.clientX,t.clientY); } },{passive:false});
$('#gridPane').addEventListener('touchend',()=>{ if(rowDrag && rowDrag.active) rowDragEnd(false); });
$('#gridPane').addEventListener('contextmenu',e=>{ if(rowDrag) e.preventDefault(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && rowDrag){ rowDragEnd(true); } },true);
$('#grid').addEventListener('click',e=>{
  if(suppressClick){ e.stopPropagation(); return; }
  const tg=e.target.closest('[data-tg]'); if(tg){ const t=byUid.get(+tg.dataset.tg); t.collapsed=!t.collapsed; viewChanged(); return; }
  const tr=e.target.closest('tr[data-u]'); if(!tr) return; if(e.target.closest('input')) return;
  select(+tr.dataset.u, e);
});
$('#grid').addEventListener('dblclick',e=>{
  const td=e.target.closest('td[data-c]'); if(!td || e.target.closest('input')) return;
  const tr=td.closest('tr'); selUid=+tr.dataset.u;
  if(td.dataset.c==='id'||td.dataset.c==='ind'||td.dataset.c==='state'||td.dataset.c==='wbs') openInfo(); else startEdit(td);
});
document.addEventListener('keydown',e=>{
  if(e.target.closest('input,textarea,select,dialog')) return;
  const k=e.key;
  if((e.ctrlKey||e.metaKey) && k.toLowerCase()==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); return; }
  if((e.ctrlKey||e.metaKey) && k.toLowerCase()==='y'){ e.preventDefault(); redo(); return; }
  if((e.ctrlKey||e.metaKey) && !e.altKey && !e.shiftKey && ['c','x','v'].includes(k.toLowerCase())){
    if(String(window.getSelection&&window.getSelection()||'').trim()) return;
    const kk=k.toLowerCase(); if(kk==='c') keyCopy(false); else if(kk==='x') keyCopy(true); else keyPaste(); return; }
  if(e.altKey && e.shiftKey && k==='ArrowRight'){ e.preventDefault(); indent(1); return; }
  if(e.altKey && e.shiftKey && k==='ArrowLeft'){ e.preventDefault(); indent(-1); return; }
  if(k==='ArrowDown'||k==='ArrowUp'){ e.preventDefault(); let i=VIS.findIndex(t=>t.uid===selUid); i=Math.max(0,Math.min(VIS.length-1,i+(k==='ArrowDown'?1:-1))); if(VIS[i]){ select(VIS[i].uid, e.shiftKey?{shiftKey:true}:null); const tr=document.querySelector(`#grid tr[data-u="${VIS[i].uid}"]`); tr&&tr.scrollIntoView({block:'nearest'}); } return; }
  if(k==='Insert'){ e.preventDefault(); insertTask(false); return; }
  if(k==='Delete'){ e.preventDefault(); deleteSel(); return; }
  if(k==='F2'){ const td=document.querySelector(`#grid tr[data-u="${selUid}"] td[data-c="name"]`); if(td){ e.preventDefault(); startEdit(td); } return; }
  if(k==='Enter' && selUid!=null){ e.preventDefault(); openInfo(); }
});
const ACTS = { copy:()=>{ const c=copySel(false); c&&writeSystemClip(c); }, cut:()=>{ const c=copySel(true); c&&writeSystemClip(c); }, paste:()=>pasteClip(), addTask:()=>insertTask(false), addMilestone:()=>insertTask(true), del:deleteSel, info:openInfo, indent:()=>indent(1), outdent:()=>indent(-1),
  link:linkSel, unlink:unlinkSel, updateSched, setBaseline, project:openProject, pdf:()=>openPdf(), import:()=>$('#fileIn').click(),
  goTask:()=>{ const t=byUid.get(selUid); if(!t){ toast('Selecciona una tarea.'); return; } scrollChartTo(t.sDn,false); },
  goStatus:()=>scrollChartTo(toDN(P.statusDate),true) };
document.querySelector('.ribbon').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.act && ACTS[b.dataset.act]) ACTS[b.dataset.act]();
  else if(b.dataset.pct!=null) setPct(+b.dataset.pct);
});
$('#selTable').onchange=e=>{ P.view.table=e.target.value; viewChanged(); };
$('#selFilter').onchange=e=>{ P.view.filter=e.target.value; viewChanged(); };
$('#selDurU').onchange=e=>{ P.view.durUnit=e.target.value; viewChanged(); toast(e.target.value==='cor'? 'Duraciones en días corridos (calendario). Las fechas no cambian; al escribir una duración, el fin se calcula en días corridos.' : 'Duraciones en días hábiles (lunes a viernes, sin feriados).'); };
$('#selOutline').onchange=e=>{ const v=+e.target.value; e.target.value=''; if(!v) return; P.tasks.forEach(t=>{ if(t.isSum) t.collapsed = t.level>=v; }); viewChanged(); };
$('#selZoom').onchange=e=>setZoom(e.target.value);
$('#zoomRange').oninput=e=>setZoom(ZKEYS[+e.target.value]);
function setZoom(z){ const cp=$('#chartPane'); const centerDn=R0+(cp.scrollLeft+cp.clientWidth/2)/PX; P.view.zoom=z; viewChanged(); cp.scrollLeft=Math.max(0,X(centerDn)-cp.clientWidth/2); }
for(const [id,key] of [['#cbCrit','crit'],['#cbBase','base'],['#cbLinks','links'],['#cbSlack','slack']]) $(id).onchange=e=>{ P.view[key]=e.target.checked; viewChanged(); };
$('#bUndo').onclick=undo; $('#bRedo').onclick=redo; $('#bSave').onclick=saveVersion;
function placeExport(){ const m=$('#mExport'), r=$('#bExport').getBoundingClientRect(); const w=m.offsetWidth, vw=document.documentElement.clientWidth; m.style.left=Math.max(8,Math.min(r.left, vw-w-8))+'px'; m.style.top=(r.bottom+2)+'px'; }
function closeExport(){ const m=$('#mExport'); if(!m.hidden){ m.hidden=true; $('#bExport').setAttribute('aria-expanded','false'); } }
$('#bExport').onclick=e=>{ const m=$('#mExport'); m.hidden=!m.hidden; if(!m.hidden) placeExport(); e.currentTarget.setAttribute('aria-expanded',String(!m.hidden)); };
window.addEventListener('resize',closeExport); document.querySelector('.ribbon').addEventListener('scroll',closeExport,{passive:true});
document.addEventListener('click',e=>{ if(!e.target.closest('.dropwrap')) { $('#mExport').hidden=true; $('#bExport').setAttribute('aria-expanded','false'); } });
$('#mExport').addEventListener('click',e=>{ const b=e.target.closest('[data-exp]'); if(!b) return; $('#mExport').hidden=true; if(b.dataset.exp==='pdf') openPdf(); else exportAs(b.dataset.exp); });
document.querySelectorAll('.mobtabs button').forEach(b=>b.onclick=()=>{ const sp=$('#split'); sp.classList.toggle('m-grid',b.dataset.pane==='grid'); sp.classList.toggle('m-chart',b.dataset.pane==='chart'); document.querySelectorAll('.mobtabs button').forEach(x=>x.setAttribute('aria-pressed',String(x===b))); });

// Sincronía de desplazamiento vertical
let syncing=false;
const gp=$('#gridPane'), cp=$('#chartPane');
gp.addEventListener('scroll',()=>{ if(syncing){ syncing=false; return; } if(cp.scrollTop!==gp.scrollTop){ syncing=true; cp.scrollTop=gp.scrollTop; } });
cp.addEventListener('scroll',()=>{ if(syncing){ syncing=false; return; } if(gp.scrollTop!==cp.scrollTop){ syncing=true; gp.scrollTop=cp.scrollTop; } });
function scrollChartTo(dn, center){ const cp=$('#chartPane'); if(window.matchMedia('(max-width:760px)').matches){ document.querySelector('.mobtabs [data-pane="chart"]').click(); } cp.scrollTo({left:Math.max(0, X(dn) - (center? cp.clientWidth/2 : 80)), behavior:'smooth'}); }

// Divisor
(function(){ const sp=$('#splitter'); let st=null;
  sp.addEventListener('pointerdown',e=>{ st={x:e.clientX,w:gp.getBoundingClientRect().width}; sp.setPointerCapture(e.pointerId); sp.classList.add('drag'); });
  sp.addEventListener('pointermove',e=>{ if(!st) return; const tot=$('#split').clientWidth; const w=Math.max(120,Math.min(tot-140,st.w+e.clientX-st.x)); gp.style.width=w+'px'; P.view.split=w/tot; });
  sp.addEventListener('pointerup',()=>{ if(st){ st=null; sp.classList.remove('drag'); saveDraft(); } });
  sp.addEventListener('keydown',e=>{ if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return; const tot=$('#split').clientWidth; const w=Math.max(120,Math.min(tot-140,gp.getBoundingClientRect().width+(e.key==='ArrowRight'?30:-30))); gp.style.width=w+'px'; P.view.split=w/tot; saveDraft(); });
})();

// Gantt: selección, tooltip y arrastre
const tip=$('#tip');
function showTip(t, x, y, extra){
  const cst = (t.manual&&t.mStart? `<dt>Modo</dt><dd>Programada manualmente</dd>` : (t.cType!=='ASAP'&&t.cDate? `<dt>Restricción</dt><dd>${CT_LABEL[t.cType]} ${fL(toDN(t.cDate))}</dd>` : ''))
    + ((t.resources||[]).length? `<dt>Recursos</dt><dd>${esc(resLabel(t.resources))}</dd>` : '') + (t.off? `<dt>Estado</dt><dd>Inactiva</dd>` : '');
  if(P.view.table==='cobro'){ const nd='<span style="color:var(--muted)">sin dato</span>';
    extra=(extra||'')+`<dt>Cobrado</dt><dd>${t.cCob!=null&&t.cTot? `<b>${cMoney(t.cCob)}</b> de ${cMoney(t.cTot)}` : (t.cPct!=null? 'monto pendiente' : nd)}</dd>`
      +(t.custom&&t.custom.EP_Items? `<dt>Ítems EP</dt><dd>${esc(t.custom.EP_Items)}</dd>` : '')+`<dt>% cobrado</dt><dd>${t.cPct!=null? pctTxt1(t.cPct) : nd}</dd><dt>Avance físico real</dt><dd>${pctTxt1(t.isSum&&t._wf!=null? t._wf : t.pct)}${t.cAv!=null? ` (${cMoney(t.cAv)})` : ''}${t.isSum&&t._wf!=null? ' · partidas con EP' : ''}</dd>`
      +(t.cPct!=null? `<dt>${t.cOver?'Sobrecobro':'Diferencia'}</dt><dd style="${t.cOver?'color:var(--crit);font-weight:600':''}">${t.cSob!=null? `${t.cSob>0?'+':''}${cMoney(t.cSob)} · `:''}${t.cSobPts>0?'+':''}${t.cSobPts.toFixed(1).replace('.',',')} pts</dd>` : ''); }
  tip.innerHTML=`<h4>${t.row}. ${esc(t.name)}</h4><dl>
   ${extra||''}<dt>Comienzo</dt><dd>${fD(t.sDn)}</dd><dt>Fin</dt><dd>${fD(t.fDn)}</dd><dt>Duración</dt><dd>${durTxt(t.dur)} hábiles · ${durTxt(calDays(t))} corridos</dd>
   <dt>% completado</dt><dd>${Math.round(t.pct)}% (programado ${Math.round(t.expected)}%)</dd><dt>Holgura total</dt><dd>${durTxt(t.slack)}</dd>
   ${t.preds.length?`<dt>Predecesoras</dt><dd>${t.preds.map(l=>{const q=byUid.get(l.uid); return q?`${q.row} ${DEP[l.type].code}${l.lag?` ${l.lag>0?'+':''}${l.lag} d`:''}`:'';}).filter(Boolean).join(', ')}</dd>`:''}
   ${t.bf?`<dt>Fin línea base</dt><dd>${fD(toDN(t.bf))} (${t.vf>0?'+':''}${t.vf} d)</dd>`:''}${cst}</dl>`;
  tip.hidden=false; const r=tip.getBoundingClientRect();
  tip.style.left=Math.min(window.innerWidth-r.width-8, x+14)+'px'; tip.style.top=Math.min(window.innerHeight-r.height-8, y+14)+'px';
}
const cb=$('#chartBody');
cb.addEventListener('pointermove',e=>{ if(drag) return; const el=e.target.closest('[data-t]'); if(!el){ tip.hidden=true; return; } showTip(byUid.get(+el.dataset.t), e.clientX, e.clientY); });
cb.addEventListener('pointerleave',()=>{ if(!drag) tip.hidden=true; });
cb.addEventListener('dblclick',e=>{ const el=e.target.closest('[data-t],[data-row]'); if(!el) return; selUid=+(el.dataset.t||el.dataset.row); openInfo(); });
let drag=null;
cb.addEventListener('pointerdown',e=>{
  const el=e.target.closest('[data-t],[data-row]'); if(!el) return;
  const uid=+(el.dataset.t||el.dataset.row);
  if(!el.dataset.drag || readOnly || e.button!==0){ select(uid,e); return; }
  const t=byUid.get(uid); drag={t, el, mode:el.dataset.mode, x:e.clientX, y:e.clientY, moved:false, id:e.pointerId, touch:e.pointerType!=='mouse', armed:e.pointerType==='mouse', ev:{ctrlKey:e.ctrlKey,metaKey:e.metaKey,shiftKey:e.shiftKey}};
  const dd=drag; dd.timer=setTimeout(()=>{ if(drag===dd){ dd.armed=true; dd.el.classList.add('grabbed'); if(navigator.vibrate) try{ navigator.vibrate(15); }catch(e){} } }, HOLD_MS);
});
cb.addEventListener('touchmove',e=>{ if(drag && drag.armed){ e.preventDefault(); } },{passive:false});
window.addEventListener('pointercancel',e=>{ if(drag && e.pointerId===drag.id){ clearTimeout(drag.timer); drag.el.classList.remove('grabbed'); if(drag.g) drag.g.remove(); drag=null; document.body.classList.remove('dragging'); tip.hidden=true; } });
window.addEventListener('pointermove',e=>{
  if(!drag || e.pointerId!==drag.id) return; const dx=e.clientX-drag.x;
  if(!drag.armed){ if(Math.hypot(dx,e.clientY-drag.y)>8){ clearTimeout(drag.timer); drag=null; } return; }
  if(!drag.moved && Math.abs(dx)<4) return;
  if(!drag.moved){ drag.moved=true; document.body.classList.add('dragging'); const svg=$('#gsvg'); const g=document.createElementNS('http://www.w3.org/2000/svg','rect'); g.setAttribute('fill','none'); g.setAttribute('stroke','var(--ink)'); g.setAttribute('stroke-dasharray','3 2'); g.setAttribute('pointer-events','none'); svg.appendChild(g); drag.g=g; }
  const t=drag.t, k=VIS.findIndex(v=>v.uid===t.uid), y=k*RH+5, geo=barGeo(t), dd=Math.round(dx/PX);
  let s=t.sDn, f=t.fDn;
  if(drag.mode==='move'){ s=t.sDn+dd; if(t.mil){ f=s; } else { const ns=dnOf(idxOf(s)); s=ns; f=dnOf(idxOf(ns)+t.dur-1); } }
  else { f=Math.max(t.sDn, t.fDn+dd); }
  drag.ns=s; drag.nf=f;
  const x0 = t.mil? X(s+1)-8 : X(s), x1 = t.mil? X(s+1)+8 : X(f+1);
  drag.g.setAttribute('x',x0); drag.g.setAttribute('y',y); drag.g.setAttribute('width',Math.max(2,x1-x0)); drag.g.setAttribute('height',RH-10);
  const nd = drag.mode==='move'? '' : `<dt>Nueva duración</dt><dd>${durTxt(isCor()? f-t.sDn+1 : Math.max(1,endB(f)-t.es))} ${unitTxt()}</dd>`;
  showTip(t,e.clientX,e.clientY,`<dt>${drag.mode==='move'?'Nuevo comienzo':'Nuevo fin'}</dt><dd><b>${fD(drag.mode==='move'?s:f)}</b></dd>${nd}`);
});
window.addEventListener('pointerup',e=>{
  if(!drag || e.pointerId!==drag.id) return; const d=drag; drag=null; clearTimeout(d.timer); d.el.classList.remove('grabbed'); document.body.classList.remove('dragging'); tip.hidden=true;
  if(!d.moved){ select(d.t.uid, d.ev); return; }
  const uid=d.t.uid;
  const okD = mutate(()=>{ const t=byUid.get(uid);
    if(d.mode==='move'){ if(t.manual){ t.mStart=iso(d.ns); } else { if(t.cType!=='MSO') t.cType='SNET'; t.cDate=iso(d.ns); t.cAuto=false; } }
    else { t.dur=Math.max(1,endB(d.nf)-t.es); } });
  if(okD && d.mode==='move') toast(byUid.get(uid).manual? `Inicio manual ${fL(d.ns)}. Deshacer con Ctrl+Z.` : `Restricción «${CT_LABEL[byUid.get(uid).cType]}» ${fL(d.ns)}. Deshacer con Ctrl+Z.`);
  if(okD) setTimeout(()=>checkFFFixed(uid),60);
});
window.addEventListener('resize',()=>{ renderStrip(); });

/* ---------- Importar / exportar ---------- */
$('#fileIn').addEventListener('change',async e=>{
  const f=e.target.files[0]; e.target.value=''; if(!f) return;
  try{ const data=JSON.parse(await f.text()); const p=data.tasks? data : (data.p||data.project);
    if(!p || !Array.isArray(p.tasks) || !p.tasks.every(t=>t && t.uid!=null && t.name!=null)) throw new Error('formato');
    if(!(await ask(`Se reemplazará el proyecto actual por «${p.title||p.name||f.name}» (${p.tasks.length} filas). Puedes deshacerlo.`,'Importar'))) return;
    mutate(()=>{ const v=P.view, sa=P.savedAt; P=normalize(p); P.view=Object.assign({...DEFAULT_VIEW},p.view||v); P.savedAt=sa; structure(); if(hasCycle()) return 'El archivo tiene vínculos circulares y no se puede cargar.'; });
  }catch(err){ toast('El archivo no es un respaldo JSON de esta carta Gantt.','err'); }
});
function mspTime(dn, t){ return `${iso(dn)}T${t}:00`; }
function buildXML(){
  const T=P.tasks, x=s=>esc(s);
  const days=[1,2,3,4,5,6,7].map(d=> d===1||d===7 ? `<WeekDay><DayType>${d}</DayType><DayWorking>0</DayWorking></WeekDay>` :
    `<WeekDay><DayType>${d}</DayType><DayWorking>1</DayWorking><WorkingTimes><WorkingTime><FromTime>08:00:00</FromTime><ToTime>12:00:00</ToTime></WorkingTime><WorkingTime><FromTime>13:00:00</FromTime><ToTime>17:00:00</ToTime></WorkingTime></WorkingTimes></WeekDay>`).join('');
  const exc=(P.holidays||[]).map(h=>`<Exception><EnteredByOccurrences>0</EnteredByOccurrences><TimePeriod><FromDate>${h.date}T00:00:00</FromDate><ToDate>${h.date}T23:59:00</ToDate></TimePeriod><Occurrences>1</Occurrences><Name>${x(h.name||'Feriado')}</Name><Type>1</Type><DayWorking>0</DayWorking></Exception>`).join('');
  const ct={ASAP:0,ALAP:1,MSO:2,MFO:3,SNET:4,SNLT:5,FNET:6,FNLT:7}, lt={FF:0,FS:1,SF:2,SS:3}, tt={units:0,duration:1,work:2};
  const tasks=T.map(t=>{
    const s=t.mil? mspTime(t.sDn,'17:00') : mspTime(t.sDn,'08:00'), f=mspTime(t.fDn,'17:00');
    const preds=t.preds.map(l=>`<PredecessorLink><PredecessorUID>${l.uid}</PredecessorUID><Type>${lt[l.type]}</Type><CrossProject>0</CrossProject><LinkLag>${l.lag*4800}</LinkLag><LagFormat>7</LagFormat></PredecessorLink>`).join('');
    const cons = t.cType!=='ASAP' && t.cDate? `<ConstraintType>${ct[t.cType]}</ConstraintType><ConstraintDate>${t.cDate}T${/^F/.test(t.cType)||t.cType==='MFO'||(t.mil&&t.cType!=='MSO')?'17':'08'}:00:00</ConstraintDate>` : '<ConstraintType>0</ConstraintType>';
    const bl = t.bs&&t.bf? `<Baseline><Number>0</Number><Start>${t.bs}T08:00:00</Start><Finish>${t.bf}T17:00:00</Finish><Duration>PT${(idxOf(toDN(t.bf))-idxOf(toDN(t.bs))+(t.dur===0&&t.bs===t.bf?0:1))*8}H0M0S</Duration></Baseline>` : '';
    return `<Task><UID>${t.uid}</UID><ID>${t.row}</ID><Name>${x(t.name)}</Name><Type>${tt[t.taskType]??0}</Type><Priority>${t.prio??500}</Priority><Active>${t.inactive?0:1}</Active><Estimated>${t.est?1:0}</Estimated><HideBar>${t.hideBar?1:0}</HideBar><EffortDriven>${t.effort?1:0}</EffortDriven><IgnoreResourceCalendar>${t.ignoreResCal?1:0}</IgnoreResourceCalendar><EarnedValueMethod>${t.evm==='phys'?1:0}</EarnedValueMethod>${t.key?'<IsPublished>1</IsPublished>':''}<IsNull>0</IsNull><WBS>${t.wbs}</WBS><OutlineNumber>${t.wbs}</OutlineNumber><OutlineLevel>${t.level}</OutlineLevel><Start>${s}</Start><Finish>${f}</Finish><Duration>PT${t.dur*8}H0M0S</Duration><DurationFormat>7</DurationFormat><Milestone>${t.mil?1:0}</Milestone><Summary>${t.isSum?1:0}</Summary><Critical>${t.crit?1:0}</Critical><PercentComplete>${Math.round(t.pct)}</PercentComplete><Manual>${t.manual?1:0}</Manual>${t.manual?`<ManualStart>${s}</ManualStart><ManualFinish>${f}</ManualFinish>`:''}${cons}${t.deadline?`<Deadline>${t.deadline}T17:00:00</Deadline>`:''}${t.resp?`<Contact>${x(t.resp)}</Contact>`:''}${t.notes?`<Notes>${x(t.notes)}</Notes>`:''}${preds}${bl}</Task>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Project xmlns="http://schemas.microsoft.com/project"><Name>${x(P.name)}.xml</Name><Title>${x(P.title)}</Title><ScheduleFromStart>1</ScheduleFromStart><StartDate>${P.startDate}T08:00:00</StartDate><FinishDate>${mspTime(dnOf(PEND-1),'17:00')}</FinishDate><StatusDate>${P.statusDate}T17:00:00</StatusDate><CurrentDate>${todayISO()}T08:00:00</CurrentDate><CalendarUID>1</CalendarUID><DefaultStartTime>08:00:00</DefaultStartTime><DefaultFinishTime>17:00:00</DefaultFinishTime><MinutesPerDay>480</MinutesPerDay><MinutesPerWeek>2400</MinutesPerWeek><DaysPerMonth>20</DaysPerMonth><DurationFormat>7</DurationFormat><NewTasksAreManual>0</NewTasksAreManual>
<Calendars><Calendar><UID>1</UID><Name>Estándar</Name><IsBaseCalendar>1</IsBaseCalendar><WeekDays>${days}</WeekDays>${exc?`<Exceptions>${exc}</Exceptions>`:''}</Calendar></Calendars>
<Tasks>
${tasks}
</Tasks></Project>`;
}
function buildCSV(){
  const q=v=>{ v=String(v==null?'':v); return /[;"\n]/.test(v)? `"${v.replace(/"/g,'""')}"` : v; };
  const rows=[['Id','EDT','Nivel','Nombre','Duración (días hábiles)','Duración (días corridos)','Comienzo','Fin','Predecesoras','% avance físico','Estado','Holgura total (días)','Crítica','Nombres de los recursos','Comienzo LB','Fin LB','Var. fin (días)','Restricción','Fecha restricción','Modo','Prioridad','Inactiva','Notas',...CUSTOM_FIELDS.map(c=>c[0])]];
  for(const t of P.tasks) rows.push([t.row,t.wbs,t.level,t.name,t.dur,calDays(t),fL(t.sDn),fL(t.fDn),predText(t),Math.round(t.pct),t.state,t.slack,t.crit?'Sí':'No',resLabel(t.resources),t.bs?fL(toDN(t.bs)):'',t.bf?fL(toDN(t.bf)):'',t.vf==null?'':t.vf,CT_LABEL[t.cType||'ASAP'],t.cDate?fL(toDN(t.cDate)):'',t.manual?'Manual':'Automática',t.prio??500,t.inactive?'Sí':'No',t.notes,...CUSTOM_FIELDS.map(c=>{ const v=(t.custom||{})[c[0]]; return v===true?'Sí':(v??''); })]);
  return '\ufeff'+rows.map(r=>r.map(q).join(';')).join('\r\n');
}
function fileBase(){ return String(P.title||'Proyecto').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'')||'Proyecto'; }
async function exportAs(kind){
  if(!DL){ toast('Las descargas no están disponibles en esta vista.','err'); return; }
  const stamp=P.statusDate.replace(/-/g,'');
  const fb=fileBase(); const map={ xml:[`${fb}_${stamp}.xml`, buildXML()], csv:[`${fb}_${stamp}.csv`, buildCSV()], json:[`${fb}_${stamp}.json`, JSON.stringify(cleanP(),null,1)] };
  const [filename,data]=map[kind];
  try{ const r=await DL.save({filename,data}); if(r && r.status==='saved') toast(`Archivo ${filename} descargado.`); }
  catch(err){ const c=err&&err.code; if(c==='cancelled'||c==='declined'||c==='user_cancelled') return; toast('No se pudo descargar el archivo. Inténtalo de nuevo.','err'); }
}

/* ---------- PDF ---------- */
const PC={ink:[22,32,42],muted:[93,105,117],line:[200,209,218],line2:[229,234,239],head:[228,235,242],bar:[62,134,207],prog:[11,63,120],crit:[210,70,58],critd:[126,30,22],sum:[27,38,51],base:[167,178,190],spark:[255,194,32],sparkInk:[107,77,0],status:[21,135,90],link:[76,119,168],white:[255,255,255]};
function openPdf(){
  if(!DL){ toast('Las descargas no están disponibles en esta vista.','err'); return; }
  $('#pdfBase').checked=P.view.base; $('#pdfCrit').checked=P.view.crit; $('#pdfLinks').checked=P.view.links; $('#pdfProg').checked=true;
  $('#pdfScope').value = P.view.filter==='all' && !P.tasks.some(t=>t.collapsed) ? 'all' : 'vis';
  $('#pdfErr').textContent=''; $('#pdfOk').disabled=false; $('#pdfOk').textContent='Descargar PDF';
  $('#dlgPdf').showModal();
}
$('#fPdf').addEventListener('submit',async e=>{
  if(e.submitter && e.submitter.value!=='ok') return;
  e.preventDefault();
  if(!window.jspdf || !window.jspdf.jsPDF){ $('#pdfErr').textContent='No se pudo cargar el generador de PDF. Recarga la página e inténtalo de nuevo.'; return; }
  const o={size:$('#pdfSize').value, scope:$('#pdfScope').value, base:$('#pdfBase').checked, crit:$('#pdfCrit').checked, links:$('#pdfLinks').checked, prog:$('#pdfProg').checked};
  const btn=$('#pdfOk'); btn.disabled=true; btn.textContent='Generando…';
  let data;
  try{ data=buildPDF(o); }catch(err){ console.error(err); $('#pdfErr').textContent='No se pudo generar el PDF.'; btn.disabled=false; btn.textContent='Descargar PDF'; return; }
  $('#dlgPdf').close();
  const filename=`Carta_Gantt_${fileBase()}_${P.statusDate.replace(/-/g,'')}.pdf`;
  try{ const r=await DL.save({filename, data:new Blob([data],{type:'application/pdf'})}); if(r && r.status==='saved') toast(`PDF ${filename} descargado.`); }
  catch(err){ const c=err&&err.code; if(c==='cancelled'||c==='declined'||c==='user_cancelled') return; toast('No se pudo descargar el PDF. Inténtalo de nuevo.','err'); }
});
function buildPDF(o){
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape', unit:'mm', format:o.size});
  const PW=doc.internal.pageSize.getWidth(), PH=doc.internal.pageSize.getHeight(), M=9;
  const fill=c=>doc.setFillColor(c[0],c[1],c[2]), stroke=c=>doc.setDrawColor(c[0],c[1],c[2]), ink=c=>doc.setTextColor(c[0],c[1],c[2]);
  const fit=(str,w)=>{ str=String(str==null?'':str); if(doc.getTextWidth(str)<=w) return str; while(str.length>1 && doc.getTextWidth(str+'…')>w) str=str.slice(0,-1); return str+'…'; };
  const rows = o.scope==='all'? P.tasks.slice() : VIS.slice();
  const wide = PW>=400;
  const cols=[
    ['Id',7,'r',t=>String(t.row)],
    ['Nombre de tarea',wide?74:56,'l',null],
    [isCor()?'Duración (corr.)':'Duración (háb.)',isCor()?17:15,'r',t=>durTxt(dispDur(t))],
    ['Comienzo',15.5,'l',t=>fL(t.sDn)],
    ['Fin',15.5,'l',t=>fL(t.fDn)],
    ['Predecesoras',wide?24:18,'l',t=>predText(t).replace(/ días?/g,'d')]
  ];
  if(o.prog) cols.push(['% compl.',11,'r',t=>Math.round(t.pct)+'%']);
  if(o.base && wide) cols.push(['Fin LB',15.5,'l',t=>t.bf?fL(toDN(t.bf)):'']);
  const TW=cols.reduce((a,c)=>a+c[1],0), CX=M+TW, CR=PW-M, CW=CR-CX;
  const TOP=M+19, TH=8, RHm=4.7, FOOT=10, bodyTop=TOP+TH;
  const per=Math.max(1,Math.floor((PH-M-FOOT-bodyTop)/RHm));
  const pages=Math.max(1,Math.ceil(rows.length/per));
  // rango de tiempo
  let lo=Infinity, hi=-Infinity;
  for(const t of rows){ lo=Math.min(lo,t.sDn); hi=Math.max(hi,t.fDn); if(o.base&&t.bs){ lo=Math.min(lo,toDN(t.bs)); hi=Math.max(hi,toDN(t.bf)); } }
  const sd=toDN(P.statusDate); if(sd!=null){ lo=Math.min(lo,sd); hi=Math.max(hi,sd); }
  if(!isFinite(lo)){ lo=toDN(P.startDate); hi=lo+30; }
  const lp=parts(lo), a=dny(lp.y,lp.m,1);
  const k=Math.min(0.45, 44/CW); let b=Math.ceil((hi+1-k*a)/(1-k)); const bp=parts(b); b=dny(bp.y,bp.m+1,1);
  const sc=CW/(b-a), xd=dn=>CX+(dn-a)*sc;
  const wm=30.4*sc, bot = wm>=6.5? 'month' : (wm*3>=6.5? 'quarter' : 'half');
  const root=P.tasks.find(t=>t.level===1)||P.tasks[0];
  const allS=Math.min(...P.tasks.map(t=>t.sDn)), allF=Math.max(...P.tasks.map(t=>t.fDn));
  const now=new Date(), gen=`${p2(now.getDate())}/${p2(now.getMonth()+1)}/${now.getFullYear()} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
  const arrow=(x,y,dir,c)=>{ fill(c); const s=0.75; if(dir==='d') doc.triangle(x-s,y-1.3,x+s,y-1.3,x,y,'F'); else if(dir==='u') doc.triangle(x-s,y+1.3,x+s,y+1.3,x,y,'F'); else if(dir==='r') doc.triangle(x-1.3,y-s,x-1.3,y+s,x,y,'F'); else doc.triangle(x+1.3,y-s,x+1.3,y+s,x,y,'F'); };
  const poly=(pts,c)=>{ stroke(c); doc.setLineWidth(0.18); for(let i=1;i<pts.length;i++) doc.line(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]); };
  const diamond=(x,y,r,fc,sc2)=>{ fill(fc); if(sc2){ stroke(sc2); doc.setLineWidth(0.2); } doc.lines([[r,r],[-r,r],[-r,-r],[r,-r]], x, y-r, [1,1], sc2?'FD':'F', true); };

  for(let pg=0; pg<pages; pg++){
    if(pg) doc.addPage();
    // Encabezado
    doc.setFont('helvetica','bold'); doc.setFontSize(14); ink(PC.ink); doc.text(P.title, M, M+5);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); ink(PC.muted); doc.text(fit(`${P.name}. ${P.rev}`, PW-2*M), M, M+9.5);
    const st=[['Comienzo',fL(allS)],['Fin',fL(allF)],['Duración (días corridos)',`${allF-allS+1} días`],['Fin línea base',root&&root.bf?fL(toDN(root.bf)):'—'],['Variación de fin',root&&root.vf!=null?`${root.vf>0?'+':''}${root.vf} días`:'—'],['% avance físico',pctTxt1(root?root.pct:0)],['Fecha de estado',fL(sd)]];
    let sx=M; doc.setFontSize(8);
    for(const [l,v] of st){ doc.setFont('helvetica','normal'); ink(PC.muted); doc.text(l, sx, M+14.5); const lw=doc.getTextWidth(l)+1.2; doc.setFont('helvetica','bold'); ink(l==='Variación de fin'&&root&&root.vf>0?PC.crit:PC.ink); doc.text(v, sx+lw, M+14.5); sx+=lw+doc.getTextWidth(v)+6; }
    // Encabezados de tabla y escala
    fill(PC.head); doc.rect(M,TOP,CR-M,TH,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(6.8); ink(PC.ink);
    let cx=M; for(const c of cols){ const tx = c[2]==='r'? cx+c[1]-1.2 : cx+1.2; doc.text(fit(c[0],c[1]-2), tx, TOP+TH/2+1.2, {align:c[2]==='r'?'right':'left'}); cx+=c[1]; }
    doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
    for(let d=dny(parts(a).y,0,1); d<b; d=uNext(d,'year')){ const x0=Math.max(CX,xd(d)), x1=Math.min(CR,xd(uNext(d,'year'))); if(x1<=x0) continue; stroke(PC.line); doc.setLineWidth(0.15); doc.line(x0,TOP,x0,TOP+TH/2); const lb=String(parts(d).y); if(x1-x0>doc.getTextWidth(lb)+1) doc.text(lb,(x0+x1)/2,TOP+3,{align:'center'}); }
    stroke(PC.line); doc.line(CX,TOP+TH/2,CR,TOP+TH/2);
    const ticks=[];
    for(let d=uStart(a,bot); d<b; d=uNext(d,bot)){ const x0=Math.max(CX,xd(d)), x1=Math.min(CR,xd(uNext(d,bot))); if(x1<=x0) continue; ticks.push(x0); const p=parts(d);
      const lb= bot==='month'? (x1-x0>7? MON[p.m] : MON[p.m][0].toUpperCase()) : bot==='quarter'? `T${Math.floor(p.m/3)+1}` : `S${p.m<6?1:2}`;
      ink(PC.muted); if(x1-x0>doc.getTextWidth(lb)+0.6) doc.text(lb,(x0+x1)/2,TOP+TH-1.2,{align:'center'}); }
    ink(PC.ink);
    // Cuerpo
    const pr=rows.slice(pg*per,(pg+1)*per), bh=pr.length*RHm, yB=bodyTop;
    doc.setLineWidth(0.1); stroke(PC.line2);
    for(const x of ticks) doc.line(x,TOP+TH/2,x,yB+bh);
    for(let d=dny(parts(a).y,0,1); d<b; d=uNext(d,'year')){ const x=xd(d); if(x>CX){ stroke(PC.line); doc.line(x,TOP,x,yB+bh); } }
    pr.forEach((t,i)=>{ const y=yB+i*RHm; stroke(PC.line2); doc.setLineWidth(0.1); doc.line(M,y+RHm,CR,y+RHm);
      if(t.key){ doc.setFillColor(255,244,204); doc.rect(M,y,TW,RHm,'F'); } });
    // Texto de tabla
    doc.setFontSize(6.8);
    pr.forEach((t,i)=>{ const y=yB+i*RHm+RHm/2+1.15; let cx=M;
      const bold=t.isSum||t.key; doc.setFont('helvetica',bold?'bold':'normal');
      for(const c of cols){
        if(c[3]===null){ const ind=(t.level-1)*2.4+1.2; ink(o.crit&&t.crit&&!t.isSum?PC.crit:PC.ink); doc.text(fit(t.name,c[1]-ind-1), cx+ind, y); }
        else { ink(c[0]==='Id'?PC.muted:PC.ink); const v=c[3](t); if(v) doc.text(fit(v,c[1]-2), c[2]==='r'?cx+c[1]-1.2:cx+1.2, y, {align:c[2]==='r'?'right':'left'}); }
        cx+=c[1]; }
    });
    // Separadores de columnas
    stroke(PC.line2); doc.setLineWidth(0.1); let vx=M; for(const c of cols){ vx+=c[1]; if(vx<CX) doc.line(vx,TOP,vx,yB+bh); }
    stroke(PC.line); doc.setLineWidth(0.25); doc.line(CX,TOP,CX,yB+bh); doc.rect(M,TOP,CR-M,TH+bh,'S');
    // Fecha de estado
    if(sd!=null && sd>=a && sd<b){ const xs=xd(sd+1); stroke(PC.status); doc.setLineWidth(0.3); doc.setLineDashPattern([1.2,0.8],0); doc.line(xs,TOP+TH,xs,yB+bh); doc.setLineDashPattern([],0);
      fill(PC.status); doc.triangle(xs-1,TOP+TH-1.6,xs+1,TOP+TH-1.6,xs,TOP+TH,'F'); }
    // Vínculos
    const pos=new Map(); pr.forEach((t,i)=>pos.set(t.uid,i));
    const geo=t=>{ if(t.mil||(t.isSum&&t.dur===0)){ const xm=xd(t.sDn+1); return {x0:xm,x1:xm,xm,m:true}; } return {x0:xd(t.sDn), x1:xd(t.fDn+1)}; };
    const yM=t=>yB+pos.get(t.uid)*RHm+(o.base&&!t.mil&&!t.isSum?1.8:RHm/2);
    if(o.links){
      for(const t of pr) for(const l of t.preds){ const q=byUid.get(l.uid); if(!q||!pos.has(q.uid)||q.hideBar||t.hideBar) continue;
        const gq=geo(q), gt=geo(t), c=(o.crit&&q.crit&&t.crit)?PC.crit:PC.link, down=pos.get(t.uid)>pos.get(q.uid);
        const qe=gq.x1+(gq.m?1.5:0), qs=gq.x0-(gq.m?1.5:0), ts=gt.x0-(gt.m?1.5:0), te=gt.x1+(gt.m?1.5:0), y1=yM(q), y2=yM(t);
        const tTop=yB+pos.get(t.uid)*RHm+(gt.m?0.6:(o.base?0.6:1.1)), tBot=yB+pos.get(t.uid)*RHm+(gt.m?RHm-0.6:(o.base?2.9:3.6));
        const rowEdge = down? yB+pos.get(t.uid)*RHm+0.2 : yB+(pos.get(t.uid)+1)*RHm-0.2;
        if(l.type==='FS'){ const tx=gt.m? gt.xm : ts+1;
          if(tx>=qe+0.8){ const ye=down?tTop:tBot; poly([[qe,y1],[tx,y1],[tx,ye]],c); arrow(tx,ye,down?'d':'u',c); }
          else { poly([[qe,y1],[qe+1.2,y1],[qe+1.2,rowEdge],[ts-1.8,rowEdge],[ts-1.8,y2],[ts,y2]],c); arrow(ts,y2,'r',c); } }
        else if(l.type==='SS'){ const xl=Math.min(qs,ts)-1.8; poly([[qs,y1],[xl,y1],[xl,y2],[ts,y2]],c); arrow(ts,y2,'r',c); }
        else if(l.type==='FF'){ const xr=Math.max(qe,te)+1.8; poly([[qe,y1],[xr,y1],[xr,y2],[te,y2]],c); arrow(te,y2,'l',c); }
        else { poly([[qs,y1],[qs-1.6,y1],[qs-1.6,rowEdge],[te+1.8,rowEdge],[te+1.8,y2],[te,y2]],c); arrow(te,y2,'l',c); }
      }
    }
    // Barras
    doc.setFontSize(6.3);
    pr.forEach((t,i)=>{ if(t.hideBar) return; const y=yB+i*RHm, g=geo(t), ic=o.crit&&t.crit;
      if(o.base && t.bs && t.bf){ const bs=toDN(t.bs), bf=toDN(t.bf);
        if(t.mil||(bs===bf&&t.dur===0)) diamond(xd(bf+1), y+RHm-1.1, 0.9, PC.base);
        else { fill(PC.base); doc.rect(xd(bs), y+3.1, Math.max(0.3,xd(bf+1)-xd(bs)), 0.9, 'F'); } }
      if(t.isSum && t.dur>0){ const yb=y+(o.base?0.8:1.2), x0=g.x0, x1=Math.max(g.x1,x0+0.6), c=ic?PC.crit:PC.sum; fill(c);
        doc.rect(x0,yb,x1-x0,1.2,'F'); doc.triangle(x0,yb+1.2,x0+1.3,yb+1.2,x0,yb+2.5,'F'); doc.triangle(x1,yb+1.2,x1-1.3,yb+1.2,x1,yb+2.5,'F');
        if(o.prog && t.pct>0){ fill(PC.spark); doc.rect(x0,yb+0.35,(x1-x0)*t.pct/100,0.5,'F'); } }
      else if(t.mil||t.dur===0){ const cy=y+RHm/2, r=t.key?1.9:1.4;
        diamond(g.xm, cy, r, t.key?PC.spark:(ic?PC.crit:PC.sum), t.key?PC.sparkInk:null);
        doc.setFont('helvetica',t.key?'bold':'normal'); ink(t.key?PC.ink:PC.muted);
        const lb=fL(t.sDn)+(t.key?'  '+t.name:''); const lw=doc.getTextWidth(lb);
        if(g.xm+r+1+lw<=CR) doc.text(lb, g.xm+r+1, cy+1.1); else doc.text(lb, g.xm-r-1, cy+1.1, {align:'right'}); }
      else { const yb=y+(o.base?0.6:1.1), h=o.base?2.3:2.5, w=Math.max(0.4,g.x1-g.x0); fill(t.off?PC.base:(ic?PC.crit:(t.manual?[30,140,128]:PC.bar))); doc.rect(g.x0,yb,w,h,'F');
        if(o.prog && t.pct>0){ fill(ic?PC.critd:PC.prog); doc.rect(g.x0,yb+h/2-0.4,w*t.pct/100,0.8,'F'); }
        if(o.prog && t.pct>0){ doc.setFont('helvetica','normal'); ink(PC.muted); const lb=Math.round(t.pct)+'%'; if(g.x1+1+doc.getTextWidth(lb)<=CR) doc.text(lb,g.x1+1,yb+h-0.3); } }
    });
    // Pie: leyenda, fecha y página
    const fy=PH-M-2.5; doc.setFont('helvetica','normal'); doc.setFontSize(6.8);
    let lx=M; const item=(draw,label)=>{ draw(lx,fy-1.3); lx+=7; ink(PC.muted); doc.text(label,lx,fy); lx+=doc.getTextWidth(label)+5; };
    item((x,y)=>{ fill(PC.bar); doc.rect(x,y-1,6,2.2,'F'); },'Tarea');
    if(o.crit) item((x,y)=>{ fill(PC.crit); doc.rect(x,y-1,6,2.2,'F'); },'Tarea crítica');
    if(o.prog) item((x,y)=>{ fill(PC.bar); doc.rect(x,y-1,6,2.2,'F'); fill(PC.prog); doc.rect(x,y-0.3,3.5,0.8,'F'); },'Progreso');
    item((x,y)=>{ fill(PC.sum); doc.rect(x,y-0.6,6,1.2,'F'); doc.triangle(x,y+0.6,x+1.2,y+0.6,x,y+1.8,'F'); doc.triangle(x+6,y+0.6,x+4.8,y+0.6,x+6,y+1.8,'F'); },'Resumen');
    item((x,y)=>diamond(x+3,y,1.4,PC.sum),'Hito');
    item((x,y)=>diamond(x+3,y,1.8,PC.spark,PC.sparkInk),'Hito clave');
    if(o.base) item((x,y)=>{ fill(PC.base); doc.rect(x,y-0.45,6,0.9,'F'); },P.baselineLabel.replace(/^Línea base:\s*/,'Línea base '));
    item((x,y)=>{ stroke(PC.status); doc.setLineWidth(0.3); doc.setLineDashPattern([1.2,0.8],0); doc.line(x+3,y-1.6,x+3,y+1.6); doc.setLineDashPattern([],0); },`Fecha de estado ${fL(sd)}`);
    ink(PC.muted); doc.text(`Generado el ${gen}    Página ${pg+1} de ${pages}`, CR, fy, {align:'right'});
  }
  doc.setProperties({title:`${P.title} – Carta Gantt`, subject:P.rev, creator:'Carta Gantt de seguimiento'});
  return doc.output('arraybuffer');
}

/* ---------- Guardar versión ---------- */
async function saveVersion(){
  if(!ART){ toast('Guardar versión no está disponible en esta vista. Tus cambios quedan guardados en este navegador.'); return; }
  const prev=P.savedAt; P.savedAt=new Date().toISOString();
  const json=JSON.stringify(cleanP()).replace(/</g,'\\u003c');
  const html=buildPage(json, P.title);
  const btn=$('#bSave'); btn.disabled=true; btn.textContent='Guardando…';
  try{ await ART.publish(html); clearDraft(); dirty=false; toast('Versión guardada. La página se recargará con los cambios.'); }
  catch(err){
    P.savedAt=prev; btn.textContent='Guardar versión'; btn.disabled=false; const c=err&&err.code;
    if(c==='conflict') toast('Otra persona guardó una versión más reciente. La página se recargará con ella; tus cambios siguen en este navegador.','err');
    else if(c==='not_writer'||c==='not_granted'||c==='consent_required'||c==='capability_disabled'||c==='not_declared'){ readOnly=true; render(); toast('Esta vista es de solo lectura: no puedes guardar versiones.','err'); }
    else if(c==='rate_limited') toast('Demasiados guardados seguidos. Espera un momento y vuelve a guardar.','err');
    else if(c==='too_large') toast('El proyecto es demasiado grande para guardarse como versión. Exporta un respaldo JSON.','err');
    else toast('No se pudo guardar la versión. Vuelve a intentarlo.','err');
  }
}


/* ---------- Importar EP por partida (CSV) ---------- */
function cParse(v){ v=String(v).trim().replace(/[^\d,.\-]/g,''); if(!v) return null;
  if(/,\d{1,2}$/.test(v) || (/,/.test(v)&&/\.\d{3}/.test(v))) v=v.replace(/\./g,'').replace(',','.');
  else if(/^-?\d{1,3}(\.\d{3})+$/.test(v)) v=v.replace(/\./g,''); else if(/^-?\d{1,3}(,\d{3})+$/.test(v)) v=v.replace(/,/g,''); else v=v.replace(',','.');
  const n=parseFloat(v); return isFinite(n)? n : null; }
function csvRows(txt){ const L=txt.replace(/^﻿/,'').split(/\r?\n/).filter(l=>l.trim()); if(!L.length) return [];
  const sep=[';','\t',','].map(c=>[c,(L[0].match(new RegExp(c==='\t'?'\t':'\\'+c,'g'))||[]).length]).sort((a,b)=>b[1]-a[1])[0][0];
  return L.map(l=>{ const out=[]; let cur='', q=false; for(let i=0;i<l.length;i++){ const ch=l[i]; if(q){ if(ch==='"'){ if(l[i+1]==='"'){cur+='"';i++;} else q=false; } else cur+=ch; } else if(ch==='"') q=true; else if(ch===sep){ out.push(cur); cur=''; } else cur+=ch; } out.push(cur); return out.map(x=>x.trim()); }); }
async function importEP(txt){
  const R=csvRows(txt); if(R.length<2){ toast('El archivo no tiene filas.','err'); return; }
  const H=R[0].map(h=>h.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,''));
  const f=re=>H.findIndex(h=>re.test(h));
  const iE=f(/^edt|wbs/), iI=f(/^(id|n°|nro|item|fila)$/), iN=f(/nombre|partida|descrip/), iT=f(/total|presupuesto|contrato|monto partida/), iC=f(/cobrad|acumulad|ep/), iP=f(/%|porc/);
  if(iC<0&&iP<0){ toast('No encontré la columna de cobrado acumulado (o % cobrado) en el encabezado.','err'); return; }
  if(iE<0&&iI<0&&iN<0){ toast('No encontré una columna para identificar la partida (EDT, Id o Nombre).','err'); return; }
  const byW=new Map(), byN=new Map(); P.tasks.forEach(t=>{ if(t.wbs) byW.set(String(t.wbs),t); const k=t.name.trim().toLowerCase(); byN.set(k, byN.has(k)? null : t); });
  let ok=0, sumSkip=0; const miss=[];
  const plan=[];
  for(const r of R.slice(1)){
    let t=null; if(iE>=0&&r[iE]) t=byW.get(r[iE]); if(!t&&iI>=0&&r[iI]){ const n=parseInt(r[iI]); if(n>=1&&n<=P.tasks.length) t=P.tasks[n-1]; } if(!t&&iN>=0&&r[iN]) t=byN.get(r[iN].trim().toLowerCase())||null;
    if(!t){ miss.push(r[iN>=0?iN:(iE>=0?iE:iI)]||'(fila vacía)'); continue; }
    if(t.isSum){ sumSkip++; continue; }
    plan.push({uid:t.uid, tot:iT>=0? cParse(r[iT]) : undefined, cob:iC>=0? cParse(r[iC]) : undefined, pct:iP>=0? cParse(r[iP]) : undefined}); ok++;
  }
  if(!ok){ toast('Ninguna fila coincidió con una partida de la carta Gantt.','err'); return; }
  const go=await ask(`Se cargarán ${ok} partidas del EP.${sumSkip?`\n${sumSkip} filas de resumen se omiten (se suman solas).`:''}${miss.length?`\n${miss.length} filas no coincidieron: ${miss.slice(0,5).join('; ')}${miss.length>5?'…':''}`:''}`,'Cargar EP',{title:'Cargar EP por partida'});
  if(!go) return;
  mutate(()=>{ for(const x of plan){ const t=byUid.get(x.uid); t.custom=t.custom||{};
    if(x.tot!=null) t.custom.EP_Total=x.tot;
    if(x.cob!=null){ t.custom.EP_Cobrado=x.cob; delete t.custom.EP_Pct; }
    else if(x.pct!=null){ if(t.custom.EP_Total){ t.custom.EP_Cobrado=t.custom.EP_Total*x.pct/100; delete t.custom.EP_Pct; } else t.custom.EP_Pct=x.pct; } } });
  toast(`EP cargado en ${ok} partidas. Presiona Guardar versión para conservarlo.`);
}
$('#cbImport').onclick=()=>$('#cbFile').click();
$('#cbFile').onchange=async e=>{ const f=e.target.files[0]; e.target.value=''; if(!f) return; const buf=await f.arrayBuffer(); let txt=new TextDecoder('utf-8').decode(buf); if(txt.includes('\uFFFD')) txt=new TextDecoder('windows-1252').decode(buf); importEP(txt); };
$('#cbUnit').onchange=e=>mutate(()=>{ P.epUnit=e.target.value; });

/* ---------- Mensajes ---------- */
let toastT=null;
function toast(msg, kind){ const el=$('#toast'); el.textContent=msg; el.className='toast on'+(kind==='err'?' err':''); clearTimeout(toastT); toastT=setTimeout(()=>el.className='toast',kind==='err'?5200:3400); }
function banner(html, onAct){ const b=$('#banner'); b.innerHTML=html; b.hidden=false; b.querySelectorAll('button').forEach(x=>x.onclick=()=>{ onAct(x.dataset.b); b.hidden=true; }); }

/* ---------- Inicio ---------- */
let EMB=null; try{ EMB=JSON.parse(document.getElementById('project-data').textContent||'null'); }catch(e){ EMB=null; }
if(EMB && Array.isArray(EMB.tasks)) P=normalize(EMB); else seedProject();
DRAFT_KEY = 'gantt-draft-v1-' + (P.id || String(P.title||'').toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g,'-'));
const baseKey = P.savedAt||'seed';
let restored=false;
try{ const d=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
  if(d && d.base===baseKey && d.p && Array.isArray(d.p.tasks)){ const embSnap=JSON.stringify(cleanP()); P=normalize(d.p); dirty=!!d.dirty; restored = dirty; if(restored) UNDO.push(embSnap); }
  else if(d) clearDraft();
}catch(e){}
schedule();
if(!byUid.has(selUid)){ const w=P.tasks.find(t=>t.key); if(w){ selUid=w.uid; selSet=new Set([w.uid]); anchorUid=w.uid; } }
if(window.matchMedia('(min-width:761px)').matches) gp.style.width=Math.round(P.view.split*$('#split').clientWidth)+'px';
render();
requestAnimationFrame(()=>{ const t=byUid.get(selUid); const target=toDN(P.statusDate); const cpn=$('#chartPane'); cpn.scrollLeft=Math.max(0,X(target)-cpn.clientWidth*0.35);
  const tr=t&&document.querySelector(`#grid tr[data-u="${t.uid}"]`); if(tr){ const top=tr.offsetTop-gp.clientHeight/2; gp.scrollTop=Math.max(0,top); cpn.scrollTop=gp.scrollTop; } });
if(restored) banner('Se recuperaron cambios sin guardar de tu última sesión en este navegador. <button class="btn" data-b="keep">Conservar</button> <button class="btn" data-b="discard">Descartar cambios</button>', a=>{ if(a==='discard'){ restore(UNDO.pop()); UNDO=[]; REDO=[]; dirty=false; clearDraft(); schedule(); render(); } });

(async()=>{
  const C = window.claude && typeof window.claude.use==='function' ? window.claude : null;
  if(!C){ renderHeader(); return; }
  try{ ART = await C.use('artifact'); }catch(e){ ART=null; }
  try{ DL = await C.use('downloads'); }catch(e){ DL=null; }
  renderHeader();
})();
})();

