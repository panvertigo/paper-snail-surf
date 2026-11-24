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
A faint surface sheen where the light touches the water, ring ripples where the snail passes, a wake glow from the contrails, motes drifting in the dark, left and right mirror walls (a corridor of water), a song for it (it borrows 'bowl').
