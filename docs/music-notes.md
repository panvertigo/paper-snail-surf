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
- **Fleetwood** (track 6, same file, 140 BPM, bar 1 at about 0.567 s). Start is bar 88 (2:29.7, "2:30"), end is 4:00. Earlier a 2:02 start was tried and replaced. Short journey: start (88), build (96), lift (104, 16 bars), peak (120, 16 bars, loops). Long journey (5+ checkpoints): start, build, liftA (104), liftB (112), peakA (120), peakB (128, loops). Every step moves to the next bar range of the original, so transitions are the song's own continuation (crossfade only, no bridges). Outro is bars 136-140 (5 bars), plays once on `finish`, ends at 4:00. Used by Level 2.

## iPhone Safari audio
- Unlock on pointerdown/up, touchstart/end, click, keydown until the context runs. Play a silent buffer, set `navigator.audioSession.type = 'playback'` (plays through the silent switch), loop a silent `<audio>`.
- Use WAV or MP3 with `startOffset`; avoid OGG.
- `?audiodebug=1` shows status text on screen; ask the player for that text if there is silence.

## Known limitations
- At 4k u/s the song progresses faster than its sections; options: map music to progress distance, or skip sections on very fast runs.
- Bar-exact start of Chicago's arpeggio was picked by timestamp and never confirmed by ear.
- Risk of seams where a section's loop tail (reverb) is cut; the cutter does not export tails.
- Bowl song has no bridges, no anticipation.
- Not verified on a real iPhone: the latest audio unlock hardening (user still heard silence at last report).

## Open questions
- Should Fleetwood get hand-picked bridges instead of straight continuation?
- Should Level 1 also get a track?
- Fleetwood: is the 5-bar outro right, or should it end on the peak loop like Chicago?
- Same transition treatment for the bowl song?
