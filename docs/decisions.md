# Paper Snail Surf: decisions and state (2026-11-17)

Start with docs/roadmap.md for the current state, next steps and open questions. This file is the long-term design record.

Reference model: Trackmania. Effort in weekends (wk). Prototype: index.html (v15) + verifier/.

## Decided (Jeffry)
- Goal: hobby + play with friends + potential revenue. Gameplay is top priority for now.
- Feel test passed: the core loop is fun. Easy to pick up, hard to master.
- Auto-push is ALWAYS ON during ramp contact (was: only while finger held). Lifting on a ramp was never useful: with no push you slide off the face in ~2.4 s. Finger now only matters in the air: hold = strafe toward last swipe, lift = fly straight.
- Ramp height is a player-managed energy budget (no height assist). Riding low converts altitude to speed sooner but cuts margin for the next transfer.
- Stages are several minutes long, built from ~30 s sections. Checkpoints about every 30 s (was every 4 ramps).
- Ramps: base half-width 460 (was 400), H = 1.25 W; finales still narrow to 310. Wide early = forgiving, tight late = mastery.
- Stages are hand-built data: STAGES list in index.html, one entry per ramp. Level 1 "cruise" (wide 700, long runs, The Big One jump: 2200 drop onto a 1000-wide ramp). Level 2 "gauntlet" (Sweep 180, Plunge, Strafe Gap, narrowing slalom, leap of faith finish).
- Strafe Gap (Level 2, ramp 18, gap 1350, drop 320): keep as a hard air-control check until Jeffry playtests it.
- Lean / second input: cut. (It came back briefly as an air pitch control and was retired again on 2026-11-17: now the snail's nose follows its flight path on its own; the unused physics code stays.)
- Art scale: WHOLE HOUSE. Courses span rooms (start on the kitchen island, drop to the floor, finish e.g. in the dog bed). Falling from counter to floor gives the overall downhill speed the physics needs.
- Story: premise C ("Going home": the only creature that carries its house is touring yours, looking for the garden outside) with undertones of A ("Someone made you": the snail is a child's paper craft; fridge drawings and photos age across stages; late stages hint at moving boxes). Wordless, environmental only; never interrupt a run; story lives in backgrounds and between runs. The flower garden becomes the destination/finale, not stage 1.
- Feel (v15): squash/stretch springs on landing/launch; edge zoom blur + tunnel vignette above ~900 u/s (max 7%; Jeffry says it is not what he pictured, see open decisions); wind audio tried and REMOVED (Jeffry disliked it); first person eye height 120; game speed slider (default 107%, lock before leaderboards).
- Engine: Capacitor first; Godot only if the phone test fails. Jeffry is on Windows (no Mac): phone testing via a GitHub Pages HTTPS build in iPhone Safari (same WebKit as Capacitor; also enables tilt testing). Native iOS builds need macOS for any engine: cloud Mac build service (Codemagic / GitHub Actions macOS) or a used Mac mini. Done in Claude Code.

## Open decisions
- Speed visual: current edge zoom blur is not what Jeffry pictured (reference: helicopters going very fast in a game he called "wardogs"). Clarify the target look before iterating; candidates: anime-style soft speed-line ring at screen edges, thicker soft wind ribbons, chromatic/heat-shimmer edges.
- Air accel cap: keep 30 (CS-accurate, air strafing worth ~2-3% of run time) or raise (gain ~ cap^2; 45 -> ~2.25x) at the cost of CS feel?
- Strafe Gap: keep as gate, soften to gap 1100 (no air control needed), or turn into an optional shortcut once forks exist.
- New geometry for v1? Paper-towel-tube tunnels (curved surface, new collision, ~2-4 wk) and bowl-rim banked turns (~1-2 wk) vs prop-ramps only (Toblerone boxes, leaning cutting boards, rulers; no physics work). Recommendation: prop-ramps only for v1.
- Section practice mode + per-section splits for long stages (recommended, ~1-2 wk).
- Each stage ends on a full ~30 s section (no short tail) (recommended).
- Left-handed mirror option (speed readout moved to bottom left for right-thumb play).

## Measurements (verifier)
- Air strafe, perfect sync: +71 u/s per s at 600 u/s, +44 at 1000, +30 at 1500, +22 at 2000 (gain ~ 450/v per tick); needs ~140-270 px/s steady swipe. Turning at 0.5x or 1.5x the ideal rate keeps ~75%; 2x gives ~0. Whole course, perfect strafing every air tick: saves ~3.4% (upper bound). Extra speed raised sloppy-bot falls.
- Level 1: good bot 72.1 s (splits 27.1/25.9/19.1), 300 ms bot 76.6 s, all sloppy bots finish with ~0 falls. Risk: medals bunch up; treat as warm-up.
- Level 2: good bot 71.9 s (splits 26.3/23.4/22.2), 300 ms bot 80.3 s; sloppy 30%-lift bot finishes 17/20; no-air-control bot fails the Strafe Gap 10/10.
- Strafe gap tuning is a knife edge: gap 1100 nobody needs air control; 1250-1450 swings between passable and a wall.

## Architecture: choices to make now (any engine)
1. Physics as a pure deterministic module (inputs in, state out), with golden-replay regression tests.
2. One input command per tick {yawDelta, strafe, fingerDown}; swipe, keyboard, tilt all map to it; ghosts store commands.
3. Stage data + stage hash + physics version stamped on every replay.
4. Determinism across JS engines: Node (V8) vs iPhone (JavaScriptCore) Math.sin/cos/atan2/hypot may differ in the last bit and diverge over a run. Test; if needed ship our own implementations.
5. Backend: defer. Game Center + CloudKit for v1 (CloudKit for ghost blobs is likely but unverified).

## Feature plan (from the deepening brainstorm)
v1 ranked: instant restart + section splits; input-log ghosts with version stamp; dev/medal ghosts + iMessage "beat my time" links (cold start); height readability cue; strafe-sync feedback on the trail; onboarding stage + medals calibrated on new players (gold > ~3% over author so non-strafers can earn it); one shortcut per stage; Game Center friend board with fall badges (single board, no clean board); small set of earned cosmetics (trail > shell > paper texture, camera is far).
Next fun multipliers: sound (wind audio was rejected; try discrete sounds instead: slime squish, landing thunk, checkpoint chime, ~1 wk); split deltas green/red vs PB (~1 wk); more hand-built set pieces.
Tilt mode: tilt sets turn rate with dead zone; tilt direction = air strafe (dead zone = fly straight); "tare" saves current orientation as neutral via relative rotation (play lying on your side). Artifact viewer blocks motion sensors, so build after the native wrap.
Later: server re-sim anti-cheat with the verifier; seasons + cosmetic pass; v2 piece-picker map editor (correct-by-construction snapping, must beat to publish, generated names, friends-only sharing first, App Store UGC report/block/filter).
Monetization lean: premium upfront ($3-5) over F2P at friend scale; cosmetics only.

## Art direction (whole house)
- Core rule: sharp where you steer, dreamy where you don't. Ramps and snail stay clean and high-contrast; enchantment lives in edges, sky and distance.
- References: Madoka witch labyrinths (cut-paper collage, photos mixed with drawings, cryptic script), Psychonauts (levels as mind metaphors), Tearaway / Paper Mario Origami King (paper feel).
- Structure: the house is the outer world, collage labyrinth the inner. Each stage starts stylized-real and turns collage as you go deeper and faster (speed becomes dream; flow is rewarded with enchantment). Cheap version: backdrop + color grade shift only.
- Highest-impact art next: paper ramp textures (ruled/graph paper, washi tape; also add speed cues, ~1 wk); one collage backdrop (~1 wk); snail animated on twos (~12 fps wobble vs 120 fps world, ~0.5 wk); speed-layered adaptive music; per-section palette shifts.
- Illustrator pipeline: hand-drawn work scanned as paper textures and collage cutouts placed as flat cards in 3D.
- Prop-ramps that keep current geometry: Toblerone boxes (literally surf ramps), leaning cutting boards, rulers, cereal boxes.
- Scenery: bowl of oranges, paper towel tubes, dog bed; real-object scans (phone photogrammetry) or CC0 models (Poly Haven, verify), baked lighting, painted backdrop by the illustrator friend, tilt-shift blur to sell the miniature scale.
- Risks: clutter hurts readability at 2000 u/s (keep ramps high-contrast); photoreal is out of reach solo, aim for stylized real; first dressed stage ~3-5 wk.

## 2026-11-16 (later): built
- Speed look v17: soft tapered wind ribbons (fade at the head, end-on ones fade out), cloud wisps, edge heat shimmer + chromatic fringe + light vignette (replaces zoom blur and 1px lines), stretching eye stalks with spring whip, camera lag that catches up; one "Speed effects" slider (0-150%).
- Finish pad can no longer splat (any point over it, above its surface, is safe).
- Level 3 "Descent" (moon -> Earth): tube pieces (loop-the-loop, corkscrew/swirl via `loop {R, phi, phi2, turns, bank, W, pitch, dir, off}`), rings (hoop boost, portal scene change), four scenes, moon mesa, Earth, stars. Verifier: good bot 98 s, 0 falls.
- Level editor v1: index.html#edit (see editor.js). Piece palette, inspector, rings, live 3D with the good bot's path (colour = speed), per-piece entry speeds, Full check (300 ms + sloppy bots), Play / Play from selected piece (section practice), undo/redo, JSON import/export, autosave.
- Adaptive music engine (music.js): bar-quantised section switching on checkpoint/portal triggers, seamless loops with tails, speed layers, generated demo song; synthesised SFX (landing, launch, hoop, portal, checkpoint, splat, finish) quantised to the beat. Your songs: see music/README.md.
- Still open: real songs, camera roll in loops, mobile editing, Capacitor wrap, ghosts/leaderboards.

## 2026-11-17: decisions and changes
- Look: the game now reads as an earth view with painted skies, mountains, clouds and islands; sky colour drifts by course progress (twilight, sunset, golden hour, morning, pink dawn). Levels 3 and 5 are night levels (golden hour into purple dusk), with moon, stars, headlights, a ferris wheel and one sprawling town. This moved away from the "whole house" art scale above; see the open question in roadmap.md.
- Speed look: tiny-to-wide particle cone from 2k u/s, black ink specks, FOV stretch at 3k+. No screen overlays (edge blur, ring, vignette) any more.
- Controls: lean retired (nose follows flight automatically). Camera distance and FOV are settings (defaults 60% and 0).
- Hitbox forgiveness strip past a ramp's outer edge: 160 -> 40 u.
- Music: each level has a song (L1 Salt for Mushroom Field, L2 Fleetwood Mac, L3 and L5 Chicago, L4 bowl). The default policy is "linear (hybrid)": play the song in order, steered by progress; Jeffry likes it. Details and rules in docs/music-notes.md. The sample-music preference rules (never swap immediately, no cuts, finish on the climax, no discordant ending) are logged there.
- Performance: ?perf, ?lite and per-feature URL switches exist to measure on the phone; see docs/performance-notes.md.

## 2026-11-18: art direction and courses
- Art direction (Jeffry): start inside an apartment (perhaps his), courses through different rooms, everything feels huge. Outside views are rare and surprising. Level 5 stays as a later level (an ascent). The green landing pad is to be replaced by something wondrous and whimsical; ideas in docs/roadmap.md.
- Courses: built-in levels are read only; user courses are stored separately (browser storage, JSON files, share links, the levels/ folder). See docs/courses.md.
