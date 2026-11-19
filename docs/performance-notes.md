# Performance notes

Goal: 60 fps (ideally 120 on ProMotion) on iPhone Safari. Desktop numbers below are NOT iPhone numbers (a desktop GPU is 10-20x faster); they show proportions only.

## Inventory (Level 5, desktop Chrome, v93)
- Draw calls 121-204, triangles about 94,000, points about 10,700, geometries 78, textures 13, shader programs 22.
- CPU per frame 1.2 ms on desktop, of which about 0.9 ms is submitting the render (draw-call overhead). All per-frame update functions together are about 0.3 ms.
- Whole scene GPU time at iPhone resolution (1170x2532) on the desktop GPU: under 1 ms. Not measurable here; the phone has to tell us.
- Render scale: devicePixelRatio capped at 2 (780x1688 on iPhone), MSAA on.
- Big items: ramp pieces (a mesh plus an ink-outline mesh each, about 100 draw calls), night town (about 74k vertices, 8k glow points), speed sparkles/specks (up to 10k points), two headlight cones, sky dome, 3 mountain cylinders, clouds/islands (sprites), full-screen grain overlay (a DOM layer over the canvas), HUD text updates.
- Music: the Chicago long order decodes about 170 s of audio at load (about 60 MB of buffers plus a copy while slicing). Fleetwood and Salt about 90 s each.

## What was already found and fixed
- v80: one paper texture was being built per ramp piece (a 512 px canvas each): seconds at load and tens of MB of GPU memory. Now one shared texture.
- v93: speed readout updates 11 times a second instead of every frame; paper texture anisotropy 8 -> 4.

## How to measure on the phone
Add parameters to the URL: `?perf=1` shows fps, worst frame gap, CPU ms per frame, draw calls, triangles. Then compare:
1. `?perf=1` (baseline)
2. `?perf=1&lite=1` (render scale 1.25, no MSAA, no grain, no town, no sparkles/birds/wind, no ink outlines)
3. If lite is smooth, switch things back on one at a time: `&pr=2` (render scale), `&aa=0`, `&grain=0`, `&town=0`, `&fx=0`.
Whichever flag restores the frame rate is the cost. Report the box text.

## Candidate fixes, by expected payoff (unmeasured on device)
1. Merge ramp pieces and ink outlines into a few static meshes: about 100 fewer draw calls.
2. Cut fill rate: render scale 1.5, MSAA off, fewer large additive glows (headlights, sparkles, town light pools).
3. Drop the grain overlay (a full-screen composited layer).
4. Fewer, lower-resolution mountain/cloud layers.
5. Music: decode lazily per section and free used buffers.
6. Safety: the sim catch-up loop allows up to 10 physics steps per frame after a slow frame (dt clamp 0.1 s), which can spiral on a slow device; lower the clamp.

## Stutter pass (2026-11-18)
- Fullscreen crash: the canvas and a 4x multisampled speed-effect target were sized from the full monitor resolution. Total pixels are now capped at about 2.6M and the target is made lazily (2 samples when large).
- Adaptive resolution: if the smoothed frame time stays above 22 ms for about 1.6 s the pixel ratio drops by 15 percent (floor 0.6 of normal); with frames under 13 ms for about 10 s it creeps back up. Disable with `?adapt=0`.
- Night towns re-light only when the evening moves 0.006 (was 0.002), a third of the buffer uploads.
- Not measured on a phone yet: open `?perf=1` and report the box if stutters remain; the overlay shows draw calls and frame times.
