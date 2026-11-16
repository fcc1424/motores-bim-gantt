#!/bin/sh
cd /home/claude/motor/bim/src && cat a_core.js b_mt.js c_scene.js m_models.js d_mt3d.js e_interact.js f_2d.js g_prof_sheets.js h_tabs.js i_dl_dock.js j_nav_init.js > ../bim.js && node --check ../bim.js && wc -c ../bim.js
