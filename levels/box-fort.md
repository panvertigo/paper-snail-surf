# Map 3: Box Fort (Tech, Tier 3, ENCLOSED)

Read maps/README.md first (format, shared rules, audio, acceptance).

## Identity
- Archetype: tech (CS refs: later kitsune stages, T3+ tech). Enclosed, like indoor/tunnel surf maps.
- Dominant skill: precision and restraint.
- Fail mode: too FAST. Overspeed into a tight banked turn flies you over the ridge. Rewards control, not commitment (inverse of Stairwell).
- Feel: claustrophobic, rhythmic, dense. Then the finale bursts out into daylight.

## Numbers
- 4 sections, author target ~2:00.
- Width: 400 -> 340 -> 310 (final section at 310).
- Ramps: short, L 900-1400 (~1 s each). Gaps 400-480, drops 150-190 (air 0.3-0.5 s).
- Turns: R 1800-2500 (limit 1340-1580). FLAG: far tighter than anything playtested (prototype min R 3800). Feel-test section 2 before building the rest.
- Speed band: 800-1400 u/s. Small uphills (C 150-250) every ~5 ramps as speed governors, plus the usual uphill before each cp. Still respect: no uphill within 3 ramps after a cp.

## Sections
| # | Name | Beat | Content |
|---|---|---|---|
| 1 | The flap | intro | Enter through a cut cardboard flap. W 400, R 2500 turns, short ramps. Teaches tight turns at low speed. Uphill into cp. |
| 2 | Zipper | develop | 6 rapid `zig` ramps, L ~1000, turn 30deg R 2500, W 370 -> 340. Rhythm game at high frequency. Uphill into cp. |
| 3 | Hairpin | twist | Climb C ~400 to bleed speed, then one ~170deg turn at R 1800 (limit ~1340): the overspeed trap. Mark as intentional trap in the verifier. Then zipper in reverse direction. Uphill into cp. |
| 4 | Garden light | resolve | W 310 slalom (4 quick zigs), daylight growing through the exit flap ahead, final launch out of the fort into the garden (leap of faith finish in sunlight). |

## Enclosure spec (visual only, no physics change)
- Walls and ceiling are scenery meshes. No collision. Fail rule unchanged (900 below last ramps).
- Ceiling clearance: >= ridge top + 850 (CAM_UP) + 300 everywhere along the path, including where the camera sits 700 behind the snail.
- Side clearance: >= W + 400 from the ridge line (in an R 1800 arc the camera drifts ~140 off the path).
- Below the ramps: darkness between stacked boxes, so falls read as falling into a gap.
- Occlusion: any scenery between camera and snail fades (dither or alpha). ~0.5 wk. Required.
- Flyover intro: the ceiling blocks the whole-course overview. Render the flyover as a cutaway (ceiling hidden), fade it in during the swoop.
- Fog: shorter inside (dim interior), but the next ramp must stay clearly visible.
- Performance: low-poly box walls, baked lighting; watch overdraw on iPhone.
- Openings: 1-2 cut windows with garden glimpses (story payoff); the exit flap at the end.

## Audio
- Track: Jeffry's, tight and percussive (~100-110 BPM).
- Interior: whole mix low-passed (muffled, "inside cardboard"). On the final launch out the flap, open the filter to full mix: the finale of the game.
- Stems as README; speed rarely passes 1600, so stem 3 can be tied to section 4 instead of speed.

## Art and story
- Setting: moving boxes in the garage, built into a fort by the child. Cut-paper interior, light through cut windows (dreamy where you don't steer).
- Props as ramps: folded cardboard ridges, rulers, tape rolls as set dressing.
- Story beat: moving boxes (the family is leaving); the garden through the windows; the exit is the snail's arrival home. Most collage-heavy map.
- Ramps stay high contrast against the brown interior (e.g. white ruled paper on top of cardboard).

## Acceptance (in addition to README)
- Sloppy bots: ~0.6 falls per run; 300 ms bot finishes.
- Hairpin: a bot entering at > limit falls; at 0.85 x limit passes.
- Camera: no frame where scenery hides the snail (automated check: ray from camera to snail per tick, count hits on non-faded meshes = 0).

## Risks
- Readability: W 310 short ramps under a far camera. If unreadable, options are a closer camera for this map only (changes a locked decision; ask Jeffry) or wider ramps.
- Enclosure work (~1-2 wk: fade, cutaway flyover, clearance check) is the biggest non-data cost in the set.
