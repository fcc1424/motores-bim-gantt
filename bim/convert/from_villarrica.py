"""Convierte la extracción del visor antiguo de Villarrica (modelos federados) en proyecto.json del motor BIM.
Los archivos de modelo (*.b64.txt) y las imágenes (ref*.jpg) se mantienen tal cual en la raíz del artefacto.
Uso: python3 from_villarrica.py vill_exp.json carpeta_proyecto"""
import sys, json, os, re, shutil

X = json.load(open(sys.argv[1]))
out = sys.argv[2]
os.makedirs(out + '/data', exist_ok=True)
BB = X['BB']
dom = X['dom']
SHORT = {'arq': 'arq.', 'est': 'est.', 'all': 'AA.LL.', 'ext': 'extr.', 'apf': 'APF', 'as': 'AS'}
KIND = {'arq': 'skp', 'est': 'ifc'}
models = [{**m, 'kind': KIND.get(m['key'], 'mep'), 'short': SHORT.get(m['key'], m['key'])} for m in X['models']]

# tarjeta inicial: botones a acciones del navegador e imágenes a pestañas
card = X['card'].replace('id="pp-coord"', 'data-nav="Tablero de coordinación"')
def ref(m):
    i = int(m.group(1)); r = X['refs'][i]
    return f'data-img="{r[0]}" data-title="{r[1]}"'
card = re.sub(r'data-ref="(\d+)"', ref, card)

INK = {'k': '#1b1b1b', 'g1': '#7d847f', 'g2': '#a9aea9', 'red': '#b3261e', 'ora': '#b7791f'}
AQD, CYD, NVD, BRD = X['mepc']['all']['d'], X['mepc']['ext']['d'], X['mepc']['apf']['d'], X['mepc']['as']['d']
DASH = [6, 1.2, 0.8, 1.2]
LEG_ARQ = [['Muros, losas y fachadas', 'L', INK['k']], ['Vanos, puertas y ventanas', 'L', '#8fb3c4'], ['Vidrio', 'L', '#5f8fa6'], ['Letreros', 'L', '#d9a441'], ['Barandas', 'L', '#3c3a36'], ['Estructura (referencia)', 'L', INK['g2']], ['Aguas lluvias', 'L', AQD], ['Extracción baños', 'L', CYD], ['Agua potable fría', 'L', NVD], ['Aguas servidas', 'L', BRD], ['Eje estructural', 'L', INK['g1'], DASH], ['Interferencia', 'C', INK['red']]]
LEG_SAN = [['Agua potable fría (PPR Ø32)', 'L', NVD], ['Aguas servidas (PVC Ø110 y Ø75)', 'L', BRD], ['Arquitectura y estructura (referencia)', 'L', INK['g2']], ['Eje estructural', 'L', INK['g1'], DASH], ['Interferencia', 'C', INK['red']]]
LEG_EXT = [['Ductos y pasadas de extracción', 'L', CYD], ['Arquitectura, estructura y AA.LL. (referencia)', 'L', INK['g2']], ['Eje estructural', 'L', INK['g1'], DASH], ['Interferencia', 'C', INK['red']]]
LEG_ALL = [['Aguas lluvias (canales, bajadas, tuberías)', 'L', AQD], ['Arquitectura y estructura (referencia)', 'L', INK['g2']], ['Eje estructural', 'L', INK['g1'], DASH], ['Interferencia', 'C', INK['red']]]
LEG_EST = [['Columnas', 'L', '#b84533'], ['Vigas y viguetas', 'L', '#d98030'], ['Perfiles Metalcon', 'L', '#9ea8b3'], ['Losas y radier', 'L', '#5e5a53'], ['Fundaciones', 'L', '#4e4a44'], ['Muros', 'L', '#6d685f'], ['Armaduras', 'L', '#4085c7'], ['Arquitectura (referencia)', 'L', INK['g2']], ['Aguas lluvias', 'L', AQD], ['Extracción baños', 'L', CYD], ['Agua potable fría', 'L', NVD], ['Aguas servidas', 'L', BRD], ['Eje estructural', 'L', INK['g1'], DASH]]
FULL = [22, 12, 306, 273]; TOP = [22, 12, 306, 136]; BOT = [22, 149, 306, 136]
LAY = {'except': ['arq|Entorno']}
def fz(z):
    s = '+' if z > 0.004 else '−' if z < -0.004 else '±'
    return s + f'{abs(z):.2f}'.replace('.', ',')
def plan_sheet(id_, code, content, h, mono, name):
    return {'id': id_, 'name': name, 'code': code, 'content': content, 'scale': '1:200', 'lay': LAY,
            'views': [{'t': 'plan', 'r': FULL, 's': 200, 'h': h, 'mono': mono}], 'legend': LEG_EST if mono == 'est' else LEG_ARQ, 'north': True, 'bar': 200,
            'notes': [[30, 'Plano de corte a ' + fz(h) + ' m sobre NPT', 2, 1, 0], [34, 'Coordenadas locales del modelo de arquitectura (m)', 1.8, 0, 1], [37.5, 'Generado desde los IFC federados; no reemplaza los planos firmados', 1.6, 0, 1]]}
def notes4(lines):
    return [[30 + i * 3.4, t, 1.7, 1 if i == 0 else 0, 0 if i == 0 else 1] for i, t in enumerate(lines)]
S = X['secs']
laminas = [
    plan_sheet('A1', 'VC-ARQ-101', ['PLANTA PRIMER PISO', 'ARQUITECTURA Y EJES'], 1.2, 'arq', 'VC-ARQ-101 · Planta primer piso'),
    plan_sheet('A2', 'VC-ARQ-102', ['PLANTA SEGUNDO PISO', 'ARQUITECTURA Y EJES'], 5.0, 'arq', 'VC-ARQ-102 · Planta segundo piso'),
    plan_sheet('A3', 'VC-ARQ-103', ['PLANTA BAJO CUBIERTA', 'ARQUITECTURA Y EJES'], 9.0, 'arq', 'VC-ARQ-103 · Planta bajo cubierta'),
    {'id': 'E1', 'name': 'VC-EST-101 · Estructura y ejes', 'code': 'VC-EST-101', 'content': ['ESTRUCTURA Y EJES', 'FUNDACIONES Y SEGUNDO PISO'], 'scale': '1:250', 'lay': LAY,
     'views': [{'t': 'plan', 'r': TOP, 's': 250, 'h': -0.5, 'mono': 'est', 'title': 'FUNDACIONES · corte a −0,50'}, {'t': 'plan', 'r': BOT, 's': 250, 'h': 5.0, 'mono': 'est', 'title': 'SEGUNDO PISO · corte a +5,00'}],
     'legend': LEG_EST, 'north': True, 'bar': 250},
    {'id': 'S1', 'name': 'VC-COR-101 · Cortes A-A y B-B', 'code': 'VC-COR-101', 'content': ['CORTES A-A Y B-B', 'ARQUITECTURA Y ESTRUCTURA'], 'scale': '1:250', 'lay': LAY,
     'views': [{'t': 'sec', 'r': TOP, 's': 250, 'sec': 0, 'title': 'CORTE A-A · ' + S[0]['d']}, {'t': 'sec', 'r': BOT, 's': 250, 'sec': 1, 'title': 'CORTE B-B · ' + S[1]['d']}],
     'legend': [['Arquitectura', 'L', INK['k']], ['Estructura', 'L', '#b84533'], ['Vidrio', 'L', '#5f8fa6'], ['Nivel Revit', 'L', INK['g1'], [3, 1.2]], ['Losa de arquitectura', 'L', INK['ora'], [3, 1.2]], ['Interferencia', 'C', INK['red']]],
     'bar': 250, 'notes': [[22, 'Cotas referidas a NPT ±0,00 del primer piso', 1.8, 0, 1]]},
    {'id': 'L1', 'name': 'VC-ALL-101 · Aguas lluvias', 'code': 'VC-ALL-101', 'content': ['AGUAS LLUVIAS', 'CUBIERTA Y PRIMER PISO'], 'scale': '1:250', 'lay': LAY,
     'views': [{'t': 'plan', 'r': TOP, 's': 250, 'h': 7.0, 'mono': 'all', 'title': 'CUBIERTA · canales, bajadas y áreas tributarias'}, {'t': 'plan', 'r': BOT, 's': 250, 'h': 1.2, 'mono': 'all', 'title': 'PRIMER PISO · bajadas, tuberías, cámara y zanja de infiltración'}],
     'legend': LEG_ALL, 'north': True, 'bar': 250, 'notes': notes4(['Fuente: ALL Camilo Henríquez V2 (DXF).', 'Cotas de canales y bajadas supuestas desde', 'la cubierta de arquitectura: el plano no las da.', 'Sección de canales «a= b=» sin dato.'])},
    {'id': 'X1', 'name': 'VC-EXT-101 · Extracción de baños', 'code': 'VC-EXT-101', 'content': ['EXTRACCIÓN DE BAÑOS', 'CUBIERTA Y SEGUNDO PISO'], 'scale': '1:250', 'lay': LAY,
     'views': [{'t': 'plan', 'r': TOP, 's': 250, 'h': 7.0, 'mono': 'ext', 'title': 'CUBIERTA · pasadas de extracción en cubierta'}, {'t': 'plan', 'r': BOT, 's': 250, 'h': 5.0, 'mono': 'ext', 'title': 'SEGUNDO PISO · ductos, pasadas en losa y shafts solicitados'}],
     'legend': LEG_EXT, 'north': True, 'bar': 250, 'notes': notes4(['Fuente: 01-CLM C. Comercial Villarrica RA (DXF).', 'El plano dibuja pasadas y shafts, no ductos:', 'cada ducto se modela vertical, desde el cielo', 'hasta 40 cm sobre la cubierta.'])},
    {'id': 'W1', 'name': 'VC-SAN-101 · Sanitario', 'code': 'VC-SAN-101', 'content': ['SANITARIO', 'AGUA POTABLE FRÍA Y AGUAS SERVIDAS'], 'scale': '1:250', 'lay': LAY,
     'views': [{'t': 'plan', 'r': TOP, 's': 250, 'h': 5.0, 'mono': 'apf,as', 'title': 'SEGUNDO PISO · agua fría sobre cielo, ramales de alcantarillado bajo losa'}, {'t': 'plan', 'r': BOT, 's': 250, 'h': 1.2, 'mono': 'apf,as', 'title': 'PRIMER PISO · agua fría sobre cielo, colectores enterrados y cámaras'}],
     'legend': LEG_SAN, 'north': True, 'bar': 250, 'notes': notes4(['Fuente: proyecto APO y ALC Paseo Comercial', 'Camilo Henríquez V7 (DWG).', 'El plano no da cotas: agua fría sobre cielo,', 'colectores al 3 % desde −2,40 m en la salida.'])},
    {'id': 'C1', 'name': 'VC-COO-101 · Planta de interferencias', 'code': 'VC-COO-101', 'content': ['PLANTA DE INTERFERENCIAS', 'EST., ARQ., AA.LL. Y EXTRACCIÓN'], 'scale': '1:200', 'lay': LAY,
     'views': [{'t': 'plan', 'r': FULL, 's': 200, 'h': 1.2, 'mono': 'xx', 'allClash': True}], 'clashTable': True, 'north': True, 'northDy': 16, 'bar': 200, 'barDy': 12},
]
nclash_base = len([c for c in X['clash'] if not c.get('ma')])
P = {
    'id': 'villarrica-centro', 'title': dom['title'], 'nombre': X['PRJ']['nombre'], 'codigo': 'VC', 'ubicacion': X['PRJ']['ubicacion'], 'mandante': '',
    'etapa': X['PRJ']['etapa'], 'sistema': X['PRJ']['sistema'], 'E0': 0, 'N0': 0, 'conv': 0, 'rnp': 0, 'zr': 0,
    'bbox': {'x0': BB['x0'], 'x1': BB['x1'], 'y0': BB['y0'], 'y1': BB['y1']}, 'zmm': [BB['z0'], BB['z1']],
    'fit': {'x0': BB['x0'], 'x1': BB['x1'], 'y0': BB['y0'], 'y1': BB['y1'], 'k': 1.15, 'z': 3}, 'fitOnStart': True,
    'lsKey': 'vc-', 'ejes': ['X', 'Y'], 'norte': 'np', 'norteDef': 'np', 'sinNorteReal': True, 'escalas': [50, 100, 200, 500],
    'ui': {'brand': dom['brand'], 'brandSub': dom['brandSub'], 'chip': dom['chip'], 'help': dom['help'], 'card': card, 'stages': dom['stages'], 'qa': dom['qa'],
           'layerBtns': [{'t': 'Solo estructura', 'nav': 'Estructura sola'}, {'t': 'Vista de coordinación', 'nav': 'Vista de coordinación'}],
           'layerNote': 'Las capas con opacidad bajo 35 % no se seleccionan: así puedes atravesar la arquitectura y tomar la estructura.'},
    'layers': X['layers'], 'nav': X['nav'], 'docs': {}, 'secs': X['cutsecs'],
    'rotulo': {'rows': [['Proyecto', ['EDIFICIO COMERCIAL VILLARRICA CENTRO'], 15, 1, 2.9], ['Ubicación', ['Camilo Henríquez, Villarrica · Región de La Araucanía'], 12, 0, 2.2], ['Arquitectura', ['DMD Arquitectos'], 11, 0, 2.6]],
               'pie': ['Etapa 2 · coordinación arquitectura y estructura · Rev. A', 'Fuentes: Arquitectura REV28 2026.08 (IFC) · Cálculo 2556 V3 (IFC)'], 'codeH': 2.3},
    'laminas': laminas,
    'files': {},
    'modelos': {
        'list': models, 'mep': X['mepc'], 'dsh': X['dsh'], 'levels': X['levels'], 'lvCuts': [3.675, 7.5],
        'grids': X['grids'], 'clash': X['clash'], 'sev': X['sev'], 'cstn': X['cstn'], 'secs': X['secs'], 'planH': X['planH'],
        'storeys': X['storeys'], 'losas': [{'z': 3.80, 'n': 'Losa arq. +3,80'}], 'lvA': X['lvA'], 'lvE': X['lvE'], 'secZ': [-1.5, 12.5],
        'floorCap': {'z': 8.5, 'm': 'arq', 'keep': 'General'},
        'aci': {'#b84533': 1, '#d98030': 30, '#e6b34d': 40, '#9ea8b3': 8, '#4085c7': 5, '#66a1b8': 4},
        'coord': {'title': 'Tablero de coordinación · arquitectura, estructura, aguas lluvias, extracción y sanitario',
                  'intro': f'Arquitectura REV28 (agosto 2026) contra cálculo 2556 V3 (agosto 2026), alineados en coordenadas locales. Choques calculados entre mallas: estructura contra vanos, letreros, barandas y fachadas (C1 a C{nclash_base}); aguas lluvias (plano V2, en verde agua) contra estructura y arquitectura, sin contar canales porque su sección y cota no están definidas; extracción de baños (en cian) contra estructura, sin contar tabiques Metalcon ni los shafts solicitados; agua potable fría (azul marino) y aguas servidas (café) contra estructura.',
                  'tiles': [['Losa piso 2 arq. vs. est.', '2 cm']]},
        'clashNotes': {'all': ' Las cotas de aguas lluvias son supuestas donde el plano no las da.', 'apf': ' El plano sanitario no da cotas: la red de agua fría se modela sobre el cielo de cada piso.',
                       'as': ' El cuadro de cámaras está en blanco: los radieres se calculan al 3 % desde la salida a la calle.', 'ext': ' El plano de extracción no dibuja los ductos: se modelan verticales con la sección de cada pasada.'},
    },
}
json.dump(P, open(out + '/data/proyecto.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('proyecto', os.path.getsize(out + '/data/proyecto.json'))
