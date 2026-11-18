# Music system notes

Living notes on how the music works and what Jeffry wants from it. Update the "Rules" and "Open questions" sections whenever a preference is confirmed or a rule changes. Code: `music.js` (engine), `index.html` (`musicAhead`, triggers), `tools/cut-music.py` (cuts loops), `music/*.json` (manifests), `editor.js` (music picker).

## What the player should feel
- Calm, flow state, never jarring. The music follows progress along the course, not time.
- Sections change early enough that the next one is already playing when the checkpoint is reached, and the last one is in place when the stage finishes.
- No cuts. A transition should sound like the song's own continuation (a riser into the next section), not a splice from the start of one section to the start of the next.

## Rules (from Jeffry's feedback, newest first)
1. Never swap immediately. Let the old section finish its loop (or play a measure or two) before the new one starts. Quantize to the phrase (the section's loop length) by default.
2. Anticipate. If the rider is approaching the next checkpoint and looks like they will make it, start the change early. Judge by real pace (measured over the last 8 s, with a floor of 1800 u/s, 8 percent margin), not only current speed, so 3-4k runs are handled.
3. Transitions use the song's own risers. A bridge is a stretch of the original that plays once and runs straight into the target section. Short bridges (last 4 bars of the riser) are used when the checkpoint is too close for the full one.
4. Crossfade 0.6 s under the new section so the old one never stops dead.
5. Do not end on a discordant outro. Cut the track's own ending if it is jarring; end the journey on a climax that just loops (Chicago: the 2:31-2:51 arpeggio).
6. Music must start on time (first section plays at stage start, before the first checkpoint) and must work on iPhone Safari.
7. Fast runs: when the rider outruns the song (4k u/s), sections should still land before the checkpoints; use the long journey (more sections) on stages with 5 or more checkpoints.
8. A crash in a trigger must never reach the player: triggers are wrapped in try/catch.

## Engine model (`music.js`)
- A song is a manifest `music/<name>.json`: `bpm`, `beatsPerBar`, `quantize` (`phrase` default), `startOffset` (MP3 encoder padding, seconds), `sections`, `triggers`, optional `journey`, `journeyLong`, `bridges`, `fallback`.
- Section: `{file, bars, once?, next?}`. `once` plays a single time then goes to `next` (used for intros, bridges, outros). Loops are an exact number of bars.
- `journey` is the ordered list of sections used as checkpoints are reached; `journeyLong` is used when a stage has 5 or more checkpoints.
- `bridges`: `[{from, to, via, short}]`. Entering `to` from `from` plays `via` once, then `to`.
- `Music.trigger(event, arg, eta)`: events `start`, `checkpoint`, `approach` (anticipated checkpoint), `finish`, `finishNear` (anticipated finish), `portal`. `eta` is seconds to the real event so the engine can pick a short or full bridge.
- Helpers: `waitFor(q)` (time to next bar or phrase line), `phrase()`, `bridgeLen(n, eta)`, `leadFor`, `lenFor('finish')` (outro length, 0 if none), `status` (shown by `?audiodebug`).
- `goto` ignores a request if a bridge is already heading there or the same id is already pending.
- Fixed tick-based physics is untouched by music; music only reads state.

## Linear (hybrid) policy (music.js `linearNext`, v81)
Manifest `linear: [ids in song order]`; the last entry loops, earlier ones are `once`. The song plays in order, one phrase at a time. At each phrase end the engine compares the entry about to play with `target = round(progress * (N-1))` (progress = distance fraction of the course, from `Music.setProgress`): if it is more than `hold` (default 1) entries ahead of the course, replay the current phrase; if it is more than `skip` (default 2) behind, jump to the target; otherwise continue. Checkpoint and portal triggers are ignored. A splat does not restart the song; a new run does. `finish` plays the `outro` at the next phrase line (`Music.finishQ()` is `phrase` for linear songs so `finishNear` accounts for it).
Behaviour (node check): very fast run 0 replays, expert 1, improving 11, new 27 (each phrase 5 times); no jumps in any of them. New players still hear a lot of repetition: that needs more material, not a rule.

## Anticipation (`musicAhead` in index.html)
- Keeps 8 s of course-position history; `v = max(speed, measured pace, 1800) * 1.08`.
- Fires `approach` when `eta < waitFor('phrase') + bridgeLen + 0.6 * phrase`, only if `lastTouched >= checkpoint - 30`.
- Fires `finishNear` when `eta <= waitFor('bar') + outroLen + 1.7`. With no outro `lenFor('finish')` is 0.
- `finish()` only triggers the music itself if `finishNear` has not already fired.

## Adding a song
1. Put the full track in `music/` (the `.wav` and source files are gitignored; only the cut MP3 loops and the manifest are tracked).
2. Find the beat grid: bar 1 time (`grid`), BPM. Analyze energy and spectral centroid per bar (see the librosa snippet in the transcript of v73, or `tools/cut-music.py`) to find where the sound opens up.
3. Add an entry to `SONGS` in `tools/cut-music.py`: `src`, `grid`, `sections {id: (first bar, bars, extra)}`, `journey`, optional `journeyLong`, `bridges`, `triggers`. Run `python tools/cut-music.py <name>`.
4. Point a stage at it: `STAGE_META[n].music = '<name>'` (or the music picker in the editor).
5. Sections that follow each other in the original are already seamless; only jumps need a bridge.
6. Bump the cache-busting `?v=` in `music.js` and `index.html` if you re-cut an existing file under the same name.

## Songs
- **Chicago** (`5 Chicago Meditation (radio edit)`, 140 BPM, F# minor, bar 1 at about 0.514 s). Journey: intro, moon, atmos, (drive1, drive2), sky, earth. Bridges moon -> atmos via moon_b (moon_c short), sky -> earth via sky_b (sky_c short). Last section `earth` is the 2:31-2:51 arpeggio loop. No outro. Used by Levels 3 and 5.
- **Bowl** (Fleetwood Mac track, sections calm / groove / peak from bars 49, 25, 105). Used by Level 4 (park). Not yet given the bridge and anticipation treatment.
- **Fleetwood** (track 6, same file, 140 BPM, bar 1 at about 0.567 s). First song on the **linear (hybrid) policy** (manifest key `linear`, see below). Start is bar 89 (2:31.4); the bar before it holds a short vocal sample that is cut out (the mid band is high from 2:29.7 to 2:30.9, drops at 2:31.0-2:31.2, and bar 89 begins on the strongest onset). End is 4:00. Entries in order: `start` (bars 89-95, once, finishes the original's phrase), `c0`..`c7` (4-bar phrases from bar 96 to 127, each once), `peak` (128-135, loops). `outro` (136-140, 5 bars) plays once on finish at the next phrase line. Used by Level 2. Bar lines checked against the kick: within about 10 ms of the downbeat.
- **Salt for Mushroom Field** (track 7, `7 Salt for Mushroom Field.mp3`, 3:04). Exactly 90 BPM. The grid is anchored on the drop at 45.35 s (bar 18); the second climax at 130.69 s is 32.004 bars later and the song starts 17 bars before the drop, so one grid covers the whole song (bar 1 at 0.017 s). Structure: 17-bar quiet build, drop at bar 18, main groove to bar 49, second climax bars 50-64, fade to 2:50.7. Level 1 uses a short linear order: `start` (bars 1-5), `i0`, `i1`, `i2` (4 bars each, the build), `m0` (18-21, the drop), `m1`, `peak` (26-33, loops). Outro is bars 62-64 (the song's own fade). At 63 s an expert reaches the drop at about 71 percent progress, which is where the song puts it. Bar phase was set by the energy step, not by ear. Level 1 only; second climax not used yet.

## Mastering (cut-music.py `tame`)
Measured loudness: every cut loop sits near -9 dBFS RMS, so Fleetwood was not louder than Chicago. What differed was the 2.5-7 kHz band (the distorted, harsh parts): 6-7 percent of Fleetwood's energy versus 0.4-2.8 percent for Chicago. `tame` (per-song option) turns that band down 3 dB and compresses it 4:1 when loud, trims 1.5 dB, and soft-limits at 0.89. Fleetwood result: harsh share 6.0 -> 3.3 percent (c3), 7.3 -> 4.0 (peak), peak level 0.96 -> 0.66, about 2.4 dB quieter. This is a mix-level fix (we only have the stereo mix, no stems); a synth rebuild would be a cover, not the song.


## iPhone Safari audio
- Unlock on pointerdown/up, touchstart/end, click, keydown until the context runs. Play a silent buffer, set `navigator.audioSession.type = 'playback'` (plays through the silent switch), loop a silent `<audio>`.
- Use WAV or MP3 with `startOffset`; avoid OGG.
- `?audiodebug=1` shows status text on screen; ask the player for that text if there is silence.

## Known limitations
- At 4k u/s the song progresses faster than its sections; options: map music to progress distance, or skip sections on very fast runs.
- Bar-exact start of Chicago's arpeggio was picked by timestamp and never confirmed by ear.
- Risk of seams where a section's loop tail (reverb) is cut; the cutter does not export tails.
- Chicago still uses the adaptive journey with riser bridges (Levels 3 and 5); only Fleetwood (Level 2) and Salt (Level 1) use the linear policy.
- Bowl song has no bridges, no anticipation, and could move to the linear policy too.
- Not verified on a real iPhone: the latest audio unlock hardening (user still heard silence at last report).

## Open questions
- Should Fleetwood get hand-picked bridges instead of straight continuation?
- Should Level 1 also get a track?
- Fleetwood: is the 5-bar outro right, or should it end on the peak loop like Chicago?
- Same transition treatment for the bowl song?

## Policy simulation (tools/music-sim.py, v80)
Question: is adaptive music better than playing the track straight through? Simulated 400 runs per player group on the real expert splits of Levels 2 and 3 (bots: L2 72 s with 2 checkpoints, L3 86 s with 3). Player groups are GUESSES (new 1.9-3.2x the expert time with a 50 percent fall chance per segment, improving 1.35-1.9x, expert 1.0-1.15x, very fast 0.78-0.95x); replace them with logged runs when we have real ones. Song: Fleetwood from bar 88 (about 91 s of content, then the last 8 bars loop).

Policies: straight (play in order, loop the plateau at the end), adaptive journey (what the engine does now: a section per checkpoint, loops until the next), hybrid (play in order, but steer by course progress: replay a phrase when ahead of the course, skip forward when far behind).

Findings (L3, means over runs):
- Energy at the finish is the same for all (the second half of the track is a uniform plateau, about 0.9 of max), so the climax is not what separates them.
- Repeated audio: straight 14 percent for experts and 73 percent for new players; adaptive 43 and 82 percent; hybrid 15 and 73 percent. Adaptive repeats the most because each 13.7 s section loops until the next checkpoint.
- Build-up tracks progress (correlation of intensity with course progress): straight 0.70 expert, 0.41 new; adaptive 0.78 and 0.77; hybrid 0.73 and 0.70.
- Seams (non-continuations per minute): straight 0.55, adaptive 0.63, hybrid 0.46 for experts; hybrid is lowest or tied everywhere.
- No policy fixes repetition for new players: a 300 s run needs more than 91 s of music. Fix is more material (a longer track, a calm stem layer, or a rest section after falls), not a smarter policy.
Verdict: hybrid is never worse than the best of the other two for any group (matches straight for experts, adaptive for newcomers). Adaptive-as-built loses mainly on repetition and seams; its anticipation and riser bridges are still worth keeping for songs that have risers (Chicago).
Caveats: the model of the current journey is simplified (sections spread evenly across checkpoints); it measures structure, not how a transition sounds; riser bridges make adaptive jumps sound better than a hard skip.
