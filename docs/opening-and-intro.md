# The opening and Track 1 (ideation, 2026-11-23)

Status: proposal for Jeffry. Nothing here is built except the music data (music/windmill.json, tools/cut-windmill.py) and the `fadeIn` / `campaign` engine hooks. Builds on docs/story-and-world.md (the archivist, Central Armature Works, the career frame, the long-dead friend).

## The song, measured
"The Old Windmill in My Palm", 5:01. Piano-led, loose tempo (about 82 BPM in the arpeggios, but it breathes), so there is no bar grid: cuts are by time. Energy map (rms) and the moments that matter:

| Song time | What happens | Use |
|---|---|---|
| 2:32.7 | the loud section ends dead (x0.4 in a blink), tail rings out | the exposition begins inside this tail, at 2:35: it sounds like something just ended |
| 2:35 to 2:37 | tail decays | the 2 s volume fade-in (full by 2:37) |
| 2:41.1 | first piano arpeggio notes (5-note groups) | first image resolves |
| 2:44.0, 2:49.9, 2:52.8, 2:55.7, 2:58.6, 3:01.6 | arpeggio groups, one about every 2.9 s | six phrase beats to hang the exposition on |
| 3:01 to 3:13 | the riser: pulses, rising energy | the machinery / pneumatic tube / hoist beat |
| **3:14.0** | the riser stops dead, quiet piano again (first new notes 3:14.6) | **the drop onto Track 1** (this is where the stamp lands) |
| 3:30.4 | first chord, the piece opens, medium energy | Track 1 changes gear |
| 3:48 | energy and brightness climb | approach |
| 4:01.5, **4:05.4** | a hit, then the big climax | the dive |
| 4:41 | the climax ends | the run-out |
| 4:51.8 to 4:57 | last phrase, fade, silence at 4:57 | arrival, the finish |

Files: `windmill_expo.mp3` = 2:35.0 to 3:14.0 (39.0 s, fades in over 2 s), `windmill_track.mp3` = 3:14.0 to 4:59.0 (105.0 s). They join gaplessly at the drop. Event `campaign` plays expo then the track follows by itself; event `start` (what a run does today, and a restart) plays the track from the drop with no exposition. The Intro level uses this song now, so today a run starts at 3:14 (the piano in, quiet), which is the right place for it.

## Does the plan and mood work?
Yes, and the music is doing most of the work already. Three reasons it fits:
1. **The piece starts as an echo.** Joining at 2:35 puts the listener in the quiet after a loud thing ends. That is exactly "twilight of a career": the loud years are behind you, the piano is what is left. Do not hide it; let the first two seconds be the sound of a hall emptying.
2. **The riser into the quiet drop is a stamp, not a rollercoaster.** The usual game move is a big release on the drop. This song does the opposite: it winds up (3:01 to 3:13), stops dead, and lands on quiet piano. That reads as a decision being made, a door closing, permission granted. Staging it as a stamp (below) makes the music the punchline.
3. **Track 1 then gets the whole arc of the song for free:** quiet glide, opening, build, climax, resolve, in 105 s.

Risks to watch: (a) 39 s is long for something skippable, so it must be tap-to-skip after the first view and never replay on retries; (b) a story beat plus a long music wind-up can feel like a loading screen if nothing moves, so the camera must keep moving for all 39 s; (c) the 2:41 first note arrives 6 s in: the first 6 s are texture and fade only, so the opening image has to hold on its own.

## Exposition without exposition
Rules I propose, since most game exposition is tacky:
- **Nothing is explained to the player.** No narrator, no caption over the action. Any text is a thing in the world: typed on a form, pencilled by the snail, stamped on a tag. Two or three lines of text in the whole opening, each eight words or fewer (the rule already in story-and-world.md).
- **Say it with objects and sound.** Handwriting changing across years, a stack of labels on a shell, a stamp, a pneumatic hiss, a pencil scratch. The music carries the feeling.
- **Dry, not wistful.** The institution is bureaucratic and a little absurd; the snail is understated. The sadness lives in the gap between the form's tone and what it means.
- **Let the form say the unsaid thing once.** One line of official language that quietly means retirement, never named.

### Option A: "The Docket" (my pick)
One object, one continuous move, 39 s.
- **0:00 to 0:06 (2:35 to 2:41)** Black, then paper grain resolves into a macro of the snail's shell, built up in layers of paper tags and stickers, like old luggage labels. Pencil scratch under the fading-in tail. The tags are in different hands across the years: a child's wobbly crayon "FAST!", a ribbon, "REGIONAL CHAMPION" in a trophy engraver's capitals, "SENIOR SURVEYOR" typed, "ADVISORY" typed smaller, and the newest, half-peeled, "EMERITUS (PENDING)". You slowly become something you never imagined, shown, not said. The camera starts pulling back as the first piano notes land (2:41).
- **0:06 to 0:23 (2:41 to 2:58)** Pulling back through the arpeggio groups (one image change per group, about every 3 s): the shell sits on a worn desk at Central Armature Works, Office of Travel, low gold lamplight and a window with the sun going down (twilight, visibly). A clerk's clay hand slides a docket across. The form is typed. One field is handwritten, in the snail's own pencil, which we watch being written: "some rounds".
- **0:23 to 0:36 (2:58 to 3:12)** The riser. The docket is fed into a brass pneumatic tube; the camera follows it in. Rivets, valves and gears tick with the riser's pulses (this is where sound design pays: air, brass, the pulse). The shell is in the carrier with the docket now, travelling.
- **0:36 to 0:39 (3:12 to 3:14)** The tube ends over a hatch. A stamp rises over the docket, hangs for one held beat, and slams on **3:14.0** exactly: the music cuts to quiet piano, the hatch opens, the snail drops onto the first ramp.
- The one official line, typed under the handwriting: **"Granted. Return not required."** (Four words. Read it as paperwork, or as the end of a career. The form never says which.)

### Option B: "The Tag Stack" (most wordless)
Only the shell, the tags and the pull-back. The snail rolls out of a door; the last tag peels and drifts; the stamp is a thumbprint on the shell. Cheapest to build, least explanatory, risks being too oblique for people who never read the doc.

### Option C: "The Window" (one long take)
The camera never leaves the office window: the view over the Works at dusk, the route you know laid out below like a map, your old ghost trails faintly glowing on the glass. The docket stamp is a reflection. Beautiful and very cheap, but it says less about the career.

### Other text candidates (all eight words or fewer, pick at most two)
Handwritten (the snail): "Thought I'd do some rounds." / "Just to see the old grounds." / "A look around."
Official (the institution): "Granted. Return not required." / "Purpose not recognised. Filed as: leisure." / "Leave of station approved." / "Reason: noted."
On the tags: "FAST!" (crayon) then "COMMITTEE" (the thing you never imagined: the last tag is just a committee name).
My two favourites together: handwritten "A look around." then typed "Granted. Return not required."

### Transitions (in and out)
- **In** from the menu: "New campaign" fades the menu to black over about 0.5 s while the song's first second is already fading in.
- **Skip**: tap (or hold) once the opening has been seen; skipping jumps to the drop (the stamp frame) and starts the track at 3:14.0 with a half-second crossfade. Retries and restarts never replay it (the engine already restarts at the 'start' section).
- **Out** at 3:14.0: hard cut on the stamp, no wipe. The cut is the drama.

## Track 1 ("The Transit"): length and shape
The track is the journey from Central Armature Works to the world the story is set in: graceful, beautiful, almost impossible to fail. The song gives it a length: **about 103 s** (3:14.0 to 4:57). Map the course to the music (t = seconds after the drop):

| t | Song | Music | Course beat |
|---|---|---|---|
| 0 to 16 | 3:14 to 3:30 | quiet piano | the release: fall onto a huge ramp, a long slow glide with wide gentle curves. Speed 600 to about 2000. You cannot get this wrong. |
| 16 | 3:30.4 | the piece opens | first real carving: a long banked sweep, the first checkpoint about t=30 |
| 34 to 47 | 3:48 to 4:01 | build | one pair of gentle transfers (zigzag), the approach to an edge, the horizon opens |
| **51** | **4:05.4** | the big climax | **the dive**: fly off the edge on the hit, land on the 40 degree ramp |
| 51 to 87 | 4:05 to 4:41 | climax, 33 s | the speed build and fast zigzags; the hot speed look kicks in from about 3.3k |
| 87 to 103 | 4:41 to 4:57 | resolve, fade | run-out and arrival: the world comes into view; the finish column of light as the last phrase fades |

The current Intro (the Mains) runs about 75 s for the good bot, with the dive at about 26 s, so it needs retiming: add 16 s of quiet glide in front and move the dive to t=51. **Finish-time variance** is the catch: a slower player finishes after the song ends, a faster one before. Fixes: make Track 1 nearly time-locked (steady grades, huge ramps, small variance), let the music finish at 4:57 and then hold a quiet ambient tail (wind, a last chord) rather than silence, and if someone finishes early the song simply keeps playing over the arrival (the engine already does this).

"Almost impossible to fail": the practical way is widening the safe zone (W 1300 already), keeping speed gentle in the first 50 s, and a new piece type, a **trough** (the two ramp faces rising on both sides, like a gutter) so a rider cannot leave sideways. That is a new editor piece, about a day of work; tell me if you want it.

## What I need from you
1. Option A, B or C for the exposition (or a mix)?
2. Is "Granted. Return not required." the right ambiguity, or too dark? Do you want the tag stack in A?
3. Does Central Armature Works have a face (a clerk), or is it only a hand and a desk?
4. Should the opening be skippable on the very first view, or only on replays?
5. Do you want the trough piece so Track 1 literally cannot be failed?
6. Retime the Intro to the song now (about an hour with the bots), or wait until the opening is built?
