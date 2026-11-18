# Map 2: Stairwell (Speed, Tier 2)

Read maps/README.md first (format, shared rules, audio, acceptance).

## Identity
- Archetype: speed / big transfer (CS refs: mesa drops, pre-gained style long transfers).
- Dominant skill: energy budget (ride low = faster now, less margin later) and air strafing.
- Fail mode: too SLOW. Timid high lines fall short of long gaps. Rewards commitment.
- Feel: the fastest map in the game. Big drops, long air, a "money ramp" at top speed.

## Numbers
- 5 sections, author target ~2:30.
- Width: 460, narrowing to 370 in section 5.
- Turns: R 5000-8000 (limit 2240-2830).
- Gaps: section 2 gaps 700-900 with drops 300-400; section 4 gaps 900-1200.
- Speed band: 1200-2200 u/s. Climbs (C 600-1000) before every cp to reset.
- Air share target: ~40% of run time in the air for the good bot (prototype ~30%). This is where the measured 2-3% air-strafe gain becomes visible.

## Sections
| # | Name | Beat | Content |
|---|---|---|---|
| 1 | Top step | intro | Long straights + R 6000 turns, normal gaps. Speed builds to ~1500. Uphill into cp. |
| 2 | Stair cascade | develop | 6 descending ramps, each gap 700-900, drop 300-400 (the stairs). Speed climbs toward ~2000. Climb C ~800 into cp. |
| 3 | Banister | twist | The money ramp: one long straight (L ~6000) right after the biggest drop of the map, then a long sweep (~150deg, R 8000) at near top speed. Uphill into cp. |
| 4 | Long gaps | develop 2 | 3-4 transfers, gap 900-1200. Size drops so a no-air-control bot riding mid-face makes them; a bot riding the top 30% of the face (slow line) should fall short ~50%. Air strafing buys margin, never required. Uphill into cp. |
| 5 | Basement door | resolve | W 460 -> 370, final sweep, launch, leap of faith onto the garage floor (finish). |

Knife edge warning: the Level 2 Strafe Gap showed gaps 1250-1450 swing between trivial and a wall. Stay under ~1200 for required gaps unless drop is increased, and verify with the no-air-control bot.

## Audio
- Track: Jeffry's, faster (~110-120 BPM), driving.
- Stems: 1 = bass pulse, 2 = drums above ~900, 3 = lead above ~1600. At top speed all three play; the climbs before checkpoints pull back to 1-2 stems naturally (speed drops), so the music breathes per section.
- Cross-domain bonus: the stair cascade is a literal drop; if beat-aware timing exists, land the biggest drop on the track's drop.

## Art and story
- Setting: stairwell from the kitchen level down to the garage. Banister = money ramp.
- Props as ramps: stair edges, banister, rulers, a skateboard? (prop only, same geometry).
- Story beat: family photos on the wall age as you descend (the child grows up).
- Palette: afternoon; collage intensifies with speed, strongest on the banister.

## Acceptance (in addition to README)
- Sloppy bots: >= 85% finish, falls ~0.3 per run.
- Section 4: no-air-control bot passes on a mid-face line; slow-line bot fails ~50%.
- Air share for good bot 35-45%. Add metric if missing.
- No arc above 0.9 x limit at p90.

## Risk
- Speed amplifies everything: readability at 2000+ u/s with the far camera, motion sickness, FX intensity (shimmer/vignette above ~900). Watch for "can't see the next ramp" at top speed.
- If aircap is later raised, section 4 must be re-tuned.
