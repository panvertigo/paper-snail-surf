# Stage 3: The Ink (prototype, 2026-11-23)

Inky black water. Menu: Ink / black water. Course: levels/ink.json from tools/gen-ink.js (16 pieces, W 1000, about 66 s for the bot, no cliff). Scenery 'ink' (index.html: inkRamps, updateInk).

## What the prototype does
- The ramp is a pearl: a shader, off-white with a thin iridescent shift at glancing angles (colour cycles slowly with position and time).
- The ramp is the only light. Everything beyond a light range fades to black, so you only see the course a short way ahead. The range is 16000 u at rest and grows with speed (16000 + 3.2 x speed, max 60000); the full-bright part is the first 22 percent of it.
- Water below: a dim blue-white reflection of every ramp, mirrored about a plane 3000 u under the snail (the plane follows the snail's height). Ripple bands run through it, and it fades with depth under the surface. Only ramp parts above the plane are reflected.
- A second, dimmer reflection above (a dark ceiling mirror 7000 u over the snail). Left and right mirrors are not built.
- Sky and fog are near black; no scenery objects.

## To judge on the phone
How far ahead the light reaches (the speed term), whether the ceiling reflection helps or clutters, whether the plane following the snail reads as water or as a ghost. No water surface is drawn yet, only the reflections.

## Ideas not built
A faint surface sheen where the light touches the water, ring ripples where the snail passes, a wake glow from the contrails, motes drifting in the dark, left and right mirror walls (a corridor of water), a song for it (it uses 'salt').

## Update
Water surface added (additive only: thin glints, soft sheen, glancing-angle fresnel, pearl tint, strongest near the snail, faded by the light range; a dimmer copy on the ceiling plane). Music set to Salt for Mushroom Field (89 BPM, quiet start, drop at 45 s, already has a grid and manifest). Inevitable Worm was measured: 117 BPM and flat at -9 dB for the whole song (3 dB range), no arc, no manifest; Salt has a 12 dB arc and fits a stage that lights up ahead of you.

## Style reset (2026-11-23, build 158)
The first look (strong rainbow wash, dull grey, spotlights and glints) read as cheap. Direction now: sumi-e restraint. Flat two-tone cel shading in mother-of-pearl white (pale cool tone in shadow, crisp step), a faint wash toward the ridge, a pearl hairline trim on the ridge and base edges, only a few percent of rainbow (more at glancing angles). The light dissolves into the dark through an uneven drifting mist (inkLit), never a cutoff. Water: pale mist patches and a quiet reflection (0.38 bottom, 0.14 top); no glints. The speed look in the Ink uses a pearl rim and almost no chromatic fringe.

Build 160: ramp a little under full white (0.83 light tone, trim 0.9); iridescence raised to about 7 percent plus 20 percent at glancing angles plus slow drifting pearl bands. The mirror now uses a dense copy of the ramps (600 u slices, 4 strips per face) so vertices ripple (displacement grows with depth under the surface), and its ripple bands are tight across the course and long along it (streaks), stronger with speed.

Build 161 (research: Reflector with a custom shader is the standard way to get a ripple-distorted planar mirror in three.js; fog is layered low-opacity drifting sprites plus additive glow around lights). The Ink mirror is now THREE.Reflector (examples/js/objects/Reflector.js from jsdelivr, r128) following the snail 3000 u below: a true mirror of the whole scene (ramps, snail), half-resolution render target, ripples applied as a distortion of the reflection lookup (stretched along travel, stronger with speed), faded by distance. The old dense-mesh mirror stays as a fallback if the script fails to load. Ramp tint is blue / lavender / pink / cyan only (no yellow or green), chosen by viewing angle plus organic variation. Music: the early-outro trigger (finishNear) is disabled in the Ink, so Salt keeps playing until the finish line.

Build 165: the Ink now has four mirrors (floor, a tilting ceiling pane, a left diagonal, a right overhang; Reflector, soft-edged panes that drift at impossible angles; the three extras are skipped with ?lite) and a faint pearl ghost of the snail mirrored in the ramp surface while it touches (the floor mirror hides the snail's reflection behind the ramp itself). All songs now play straight through: the early outro (finishNear) is disabled everywhere.

Build 169 (first build checked against real renders: headless Chrome via puppeteer-core, scratchpad scripts server.js / suite.js / dbg.js teleport the snail with spawnOn(i) and screenshot). Found and fixed by looking: the water surface disc had never been rotated flat (it stood on end), the level water plane lay far above the descending ramp so nothing was reflected, and the arch lights were too far (the arches are 28000 out) for the distance fades I had set. The Ink water is now a plane parallel to the descent 4500 under the snail with a pool of pearl light and drifting mist; the mirrored course shows below. Transit: arches less washed out, lights visible as soft warm glows, ghost paths and aurora smoothed (no kinks), aurora dimmer.

## Builds 170 to 182 (2026-11-24)
- Mirrors cut to ONE: the water Reflector parallel to the descent, 4500 under the snail (the three drifting panes and the ceiling mirror were removed: they moved with the player and confused). Snail ghost reflected across that plane.
- Fog: pearl banks hung along the course (uneven size, spacing, side), additive, fade out within about 6000 to 20000 of the camera (near-camera sprites turned into speckle) and thick ahead. glowTexA is now a DataTexture (iOS canvas alpha bug).
- Backdrop: the Violet Orrery (img/bd_orrery.jpg) stands far off in the water, world-fixed heading turned 0.5 rad, about 42 percent submerged: upper part additive violet glow, below the waterline a rippled mirrored copy fading with depth. On layer 1 so the Reflector pass does not draw it again (camera.layers.enable(1)).
- Open: iridescence tuning, speed sensation, whether the orrery gain (1.5) is right on the phone, perf with one Reflector.
