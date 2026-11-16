# Adding your songs

A stage names its song with `music: "<name>"` (built-in Level 3 uses `music/descent.json`, currently a generated demo). The game loads `music/<name>.json`.

## What to export from your DAW
- One file per **section** (a loop of a whole number of bars, same tempo for the whole song). WAV is safest (gapless everywhere, incl. iPhone). M4A/AAC works on iPhone; MP3 and M4A have encoder padding, so set `startOffset` (seconds, usually 0.025-0.05) to skip it. Avoid OGG (Safari).
- Export **exactly** `bars` bars from the start of bar 1. If you want reverb/delay tails to ring over the loop point, export extra audio AFTER the last bar (up to one loop long): the engine plays that tail over the start of the next iteration (and drops it when a section is cut short).
- Optional **layers**: stems of the same length (e.g. drums, lead). They fade in with speed.

## manifest (music/<name>.json)
```json
{
  "bpm": 128, "beatsPerBar": 4, "quantize": "bar",
  "startOffset": 0,
  "sections": {
    "moon":  { "file": "moon.wav",  "bars": 16, "layers": [ { "file": "moon_drums.wav", "from": 900, "to": 1800 } ] },
    "sky":   { "file": "sky.wav",   "bars": 16 }
  },
  "triggers": [
    { "on": "start", "section": "moon" },
    { "on": "checkpoint", "n": 2, "section": "moon" },
    { "on": "portal", "theme": 2, "section": "sky", "quantize": "section" },
    { "on": "finish", "section": "moon" }
  ]
}
```
- `quantize`: when a trigger switches section: `beat`, `bar` (default), `phrase` (4 bars) or `section` (end of the current loop). Per trigger or global.
- Triggers: `start`, `checkpoint` (n = 1, 2, ...), `portal` (theme 1-3), `finish`. After a fall, the section in force at the checkpoint you respawn at is restored.
- 128 BPM and 16 bars is exactly 30 s, matching the ~30 s stage sections.
- Speed layers: `from`/`to` are u/s (0 -> full volume between them).
- Files go in `music/` (or set `"base"` to another folder).
- Test it: open the game, tap once (browsers need a touch before sound), and watch `Music.section` / `Music.debug` in the console.
