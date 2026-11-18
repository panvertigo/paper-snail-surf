# Maps: shared spec (v1 set of 3)

Status: spec for Claude Code. Draft 2026-11-18. Builds on design/decisions.md (2026-11-16) and design/three-maps.md (research).

Files:
- maps/kitchen.md: Map 1, Flow, Tier 1
- maps/stairwell.md: Map 2, Speed, Tier 2
- maps/box-fort.md: Map 3, Tech, Tier 3, ENCLOSED
- claude-code/maps-prompt.md: paste-in prompt

Story order (whole house, "going home"): kitchen -> down the stairwell to the garage -> through the moving-box fort -> out the garage door into the garden (finale).

## Format (match the prototype exactly)
Each map is one data file in the prototype's STAGES format, one entry per ramp:
- `L` straight length | `turn` degrees + `R` radius (banking direction is automatic) | `gap` [480], `drop` [190] transfer from previous ramp | `zig` zigzag transfer (shift 0.75 W, swap faces) | `W` half-width, carries over [460] | `C` net climb (uphill ramp) | `cp` checkpoint on this ramp.
- Repo layout: `stages/<name>.js` (exports the array) + `docs/maps/<name>.md` (copy of this spec). Add a level button per map. Do not edit levels 1 and 2 or physics.

## Shared rules (from decisions.md)
- Base half-width 460, H = 1.25 W. Narrow toward 310 only for mastery.
- Sections ~30 s (good bot). Checkpoint (`cp: true`) on the first ramp of each section after the first.
- Uphill (`C`) on the ramp(s) just before each checkpoint to control speed. Never an uphill within 3 ramps after a checkpoint (respawn at 600 u/s soft-locks).
- Turn speed limit: v < sqrt(1000 R). R 1500 = 1225, R 2000 = 1415, R 2500 = 1580, R 3800 = 1950, R 4500 = 2120, R 6000 = 2450, R 8000 = 2830 u/s.
- Climb/drop budget (frictionless): v^2 = v0^2 + 1600 * dh. 1000 -> 2000 u/s costs ~1875 units of drop.
- Stage ends on a full ~30 s section, then the existing leap-of-faith finish (FIN_DROP 800).
- Geometry: prop-ramps only (Toblerone boxes, cutting boards, rulers, cereal boxes). No new collision types in v1.
- Section beat structure: intro / develop / twist / resolve. One new idea per section, never two.
- Every transfer: next ramp visible from takeoff at the default camera. No blind drops.

## Audio (all maps; not built yet, spec only)
- Jeffry's original music. One track per map, speed-layered stems (adaptive music from decisions.md): stem 1 always, stem 2 above ~900 u/s, stem 3 above ~1600 u/s, crossfade ~0.5 s.
- No wind audio (rejected). Discrete SFX only: slime squish (ramp contact), landing thunk (scaled by impact), checkpoint chime (in the track's key), splat on fall.
- Per-map data to add alongside the stage file: `{ track, bpm, key, stemThresholds }`. Values per map file.

## Art (all maps)
- Sharp where you steer, dreamy where you don't. Ramps and snail stay high contrast.
- Each stage starts stylized-real and turns more collage section by section (cheap version: backdrop + color grade shift per section).
- Story is wordless and environmental only. Never interrupt a run.

## Acceptance (verifier, every map)
- Good bot: each section 25-35 s; total within the map's target.
- Report: good bot, 300 ms bot, sloppy bots (finish rate, falls), per-arc p90 speed vs limit, per-section splits.
- Arc safety: p90 entry speed <= 0.9 x limit, except ramps marked as intentional traps.
- Medals from author time: gold +5%, silver +15%, bronze +40% (to tune).

## Open questions (Jeffry)
1. Do these 3 replace "cruise" and "gauntlet" for v1, or sit alongside? Kitchen overlaps cruise a lot.
2. Shortcuts need forks; STAGES is a linear list today. Defer shortcuts or build fork support (~1.5 wk)?
3. Box Fort enclosure is visual only (no ceiling/wall collision). OK?
4. Box Fort turns (R 1800-2500) are much tighter than anything playtested (prototype min R 3800). Needs a feel test early.
