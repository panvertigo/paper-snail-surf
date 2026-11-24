# Render checks (headless Chrome)

You must SEE a render before tuning visuals (see CLAUDE.md). These scripts load the game in headless Chrome (SwiftShader), teleport the snail and screenshot.

Setup once: `cd tools/shots && npm i puppeteer-core` (needs Chrome at C:/Program Files/Google/Chrome/Application/chrome.exe).
1. `node tools/shots/server.js` (static server on 127.0.0.1:8124, keep running).
2. Shots, from tools/shots:
   - `node suite.js "#file-intro" "out_" "3,9,13" 600 "state='run';"` = teleport to ramps 3, 9, 13 at 600 u/s, writes out_3.png ... (levels: `#file-intro`, `#file-ink`).
   - `node shot.js "#file-ink&hide=stars,clouds" out.png "js before shot" 3000` = one shot; `?hide=` tags: stars, clouds, mist, bokeh, globes, orrery, ghost, trav, aurora, backdrop.
   - `node dbg.js "#file-intro" "pre js" "post js (result printed)" out.png`
   - `node air.js "#file-intro" out.png "state='run'; pos.y += 30000; vel.y = -1500; ''"` = a frame in the air at 2x.
Limits: it does NOT reproduce phone-only artefacts (coloured speckle from iOS canvas/alpha handling, blend rounding). Check those on the phone with `?perf=1` and `?hide=`.
