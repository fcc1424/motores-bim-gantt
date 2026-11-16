# Motores BIM y Gantt

Un solo visor BIM y una sola carta Gantt para todos los proyectos. Cada proyecto aporta solo datos.

- `bim/src/`: motor BIM por partes. `bim/build_engine.sh` arma `bim/bim.js`.
- `bim/convert/`: conversores (formato pack, visores antiguos, Villarrica).
- `bim/make_project.py`: arma la carpeta publicable de un proyecto (index.html + motor + data).
- `bim/test_bim.py`: prueba en Chromium (Playwright).
- `gantt/`: motor Gantt (`make_engine.py`, `build_gantt.py`, `plantilla.json`, datos de cada carta).
- `ar/`: página pública de realidad aumentada (`ar/?p=<proyecto>`), con un GLB a tamaño real (`obra.glb`) y una maqueta (`maqueta.glb`) por proyecto. Se publica con GitHub Pages (rama main, carpeta raíz). `bim/convert/to_glb.py` exporta los GLB y `bim/convert/ar_qr.py` guarda el enlace y el QR en `proyecto.json` (botón AR del visor).
- `proyectos/`: datos de Walmart Chillán, Piedra Roja II y Villarrica Centro.

Artefactos publicados: Motor BIM, Motor Gantt y un artefacto por proyecto (ver skill actualizar-motores).
