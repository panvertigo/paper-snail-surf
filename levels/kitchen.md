# Map 1: Kitchen (Flow, Tier 1)

Read maps/README.md first (format, shared rules, audio, acceptance).

## Identity
- Archetype: linear flow (CS refs: utopia, mesa, surf_me). The "first successful run" map.
- Dominant skill: reading the course and rhythm. Secondary: height line (energy budget).
- Fail mode: almost none. Mistakes cost time, not falls.
- Feel: wide, sweeping, musical. Speed builds steadily, never scary.

## Numbers
- 4 sections, author target ~2:00 (good bot ~1:55).
- Width: 600 in section 1, 460 after. Never below 460.
- Turns: R 6000-7000 only (limit 2450-2650). Turns should never be the reason you fall.
- Gaps: default 480 / drop 190, except the one set piece.
- Speed band: 900-1600 u/s (p90 under 1800).
- Cadence: one ramp ~ one bar. Target ramp period (good bot, ramp start to next ramp start) 2.8 s +/-15% (one bar at 86 BPM). Size each L from the bot's expected speed: L ~ v x 2.8 s - gap. Break cadence only at the twist.
- Transfers: strict L/R alternation with `zig` in sections 2-4 (metronome feel).

## Sections
| # | Name | Beat | Content |
|---|---|---|---|
| 1 | Island drop | intro | Start on the kitchen island. Long straights + gentle turns, W 600 -> 460. No zigzags yet. Ends with uphill into cp. |
| 2 | Counter run | develop | Introduce `zig` transfers, alternating. One "vista" 90deg arc at R 6500 around the table: the room opens up. Uphill into cp. |
| 3 | Fridge | twist | Cadence break: one big drop (like cruise's "The Big One", drop ~1500-1800 onto a W ~800 landing ramp), then a long climb (C ~800) pays the speed back. Uphill into cp. |
| 4 | Dog bed | resolve | Back to the metronome. Final 120deg sweep at R 7000, launch ramp, leap of faith into the dog bed (finish pad). |

## Audio
- Track: Jeffry's, ~86 BPM (cadence is derived from this; if the track's BPM differs, re-derive the 2.8 s target as 4 beats).
- Mood: warm, unhurried. Stems: 1 = keys/bass, 2 = drums, 3 = lead melody.
- Twist (section 3 drop): music holds one beat on the takeoff, lands with the downbeat on the landing ramp (nice to have; requires beat-aware timing, defer if costly).

## Art and story
- Setting: kitchen island, countertops, table, fridge, floor, dog bed.
- Props as ramps: cutting boards, Toblerone boxes, rulers.
- Story beat: the fridge is covered in a child's drawings; one is a paper snail. Earliest, happiest version of the house.
- Palette: morning light, warm. Collage creeps in at the edges by section 4.

## Acceptance (in addition to README)
- Sloppy bots: all finish, falls < 0.1 per run.
- Cadence: >= 80% of ramps (excluding section 3) within 2.8 s +/-15% for the good bot. Add this metric to the verifier if missing.
- First-time human: finishes by try ~5 (playtest, not verifier).

## Risk
- Overlaps Level 1 "cruise" heavily. If cruise survives, Kitchen should replace it rather than duplicate it.
- Skilled players may find it trivial. Author time must require an aggressive low line.
