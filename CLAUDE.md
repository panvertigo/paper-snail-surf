# Paper Snail Surf

iPhone game capturing the joy of CS:GO surfing. Owner: Jeffry (knows CS surf well; don't over-explain basics). Jeffry develops on Windows (no Mac): test on iPhone via a hosted HTTPS build in Safari; native iOS builds need a cloud Mac build service or a Mac.

## How to work
- Extremely concise and direct. No em dashes. Quantify (hours, probabilities, tradeoffs).
- Ask before assuming intent. Simplest solution first; no unrequested abstractions.
- Don't touch unrelated code. Flag uncertainty explicitly.
- Point out second-order effects and long-term risks. Challenge assumptions.
- Commit after each completed step.

## Files
- index.html: the whole game (three.js r128 from cdnjs). Physics lives between `// ==PHYSICS START==` and `// ==PHYSICS END==` and is shared verbatim with the verifier. Stages are the STAGES list inside buildCourse().
- verifier/: headless Node course checker (no deps). harness.js loads the physics block; input goes through `cmd {turn, touch, key}` once per tick. README.md logs every version's results; append a line for each physics or stage change.
  - `node verifier/sim.js index.html` and `node verifier/extra.js index.html`
  - Pick a level: `LVL=2 node -r ./verifier/lvl.js verifier/sim.js index.html` (default level 1)
- verifier/golden.js: golden replay regression (`check` must pass before committing refactors, input or stage changes. For an INTENTIONAL physics change, `check` will fail by design: re-run `record`, regenerate racers, and log it in verifier/README.md. A playtest build may be pushed with goldens stale if README says so; re-record before the next normal commit).
- tools/: one-off analysis scripts (air-strafe-gain.js, fall-map.js = where bots fall + no-air-control test, checkpoint-splits.js). Same usage as the verifier.
- docs/roadmap.md: current state, next steps, open questions. Read it first.
- docs/decisions.md: decisions, measurements, feature plan, art direction. Read it before proposing design changes.
- docs/courses.md: where levels live (built-in vs your courses vs files vs links) and the editor's New / Copy / Save flow.
- docs/music-notes.md: the music system (engine, linear/hybrid policy, Jeffry's splicing rules, how to add a song). docs/performance-notes.md: measurements and the ?perf / ?lite switches.
- music.js (engine), music/*.json (manifests), tools/cut-music.py (cuts loops, tames harsh bands: `python tools/cut-music.py <song>`), tools/music-sim.py (policy simulation with guessed player groups), editor.js (level editor at #edit).

## Locked decisions (change only with Jeffry's OK)
- Controls: one finger. Auto-push into the ramp face is always on during ramp contact. Swipe left/right = turn (0.011 rad/px). Settings: swipe acceleration slider 0-300 percent (extra turn per pixel at full flick speed; default 150 = fast flicks turn 2.5x; 0 = off). The joystick mode was removed from the menu (code left dormant). Double tap (two short still taps within 350 ms) or B/space = rocket (4.5 s burn, one use per 20 s, flame behind the snail, no sound). In the air, finger down = strafe toward last swipe direction; lift = fly straight. The lean (pitch) control is retired; the snail's nose follows its flight path by itself.
- Physics: Source-style air accel (sv_airaccelerate 400 default; 150/800 options), gravity 800, air wishspeed cap 30, fixed 100 Hz tick, deterministic. Frictionless; speed comes from altitude lost plus strafe gains.
- Ramps: ~51 deg faces (H = 1.25 W). Base half-width 460, finales narrow to 310 (Level 1 uses 700, landing 1000).
- Course rules: turns are analytic arcs, always banked toward the face being ridden. Zigzag transfers shift 0.75 W so you land on the face that faces you. Uphill ramp just before each checkpoint; never an uphill within 3 ramps after a checkpoint (respawn at 600 u/s soft-locks). Checkpoints about every 30 s; falls respawn there, clock keeps running.
- Camera: third person, high and far (back 700, up 850, scaled by the camera-distance setting, default 60%). Avatar: cute paper snail. Speed FX: slime trail, wind streaks, FOV kick, eye stalks blow back.
- Art scale: start inside an apartment, courses through its rooms, everything huge; outside views are rare. Level 5 (sky descent) is a later level. See docs/roadmap.md (Art direction).
- Business: Trackmania model (timed stages, medals, ghosts, user maps, seasons). Cosmetics only, never pay-to-win.

## Hard-won learnings
- Inside the PHYSICS block never use Math.sin/cos/atan2/hypot/pow/exp (engines differ in the last bit, so replays diverge across devices). Use dsin/dcos/datan2/dhypot (+ - * / sqrt only). Open determinism.html on the iPhone after physics changes.
- "Strafe follows swipe" on ramps was mathematically broken (couldn't correct oversteer). Fixed by auto-push.
- Chained straight segments as curves made seams that pushed riders over the ridge. Use true arcs.
- Banked turns hold only up to v ~ sqrt(1000 R) at this bank. Long downhill runs need climbs to bleed speed.
- Transfers that require drifting outward (away from the ridge you're on) are impossible at speed.
- Third person needs a contact shadow, anticipatory lean, and render interpolation (120 Hz) or landings feel snappy.
- Falls are detected 900 below the lower of the last-touched and next ramp bases (so big drops aren't falls).
- Never build a per-piece texture or geometry inside a loop that runs for every ramp piece: one paper texture per piece caused slow loads and probable crashes on phones. Share them.
- three.js draws opaque objects before transparent ones whatever the renderOrder: the sky layers (stars, moon, hills) must all be opaque or they draw in front of each other. Mountains are opaque with an alpha cutout so ramps draw over them.
- A `//` comment in the middle of a one-line statement swallows the rest of the line (this broke the build three times). Put comments on their own line or use /* */ in generated code.
- A desktop GPU is 10-20x faster than an iPhone: desktop timings only show proportions. Use `?perf=1` on the phone.
- Music: every change of section lands on a phrase line, never immediately; see docs/music-notes.md before touching music.js.

## v1 scope
3 stages, friend ghosts, friend leaderboards (Game Center). User-made maps in v2.
