# Roadmap, progress log and open questions

Last updated 2026-11-17 (v85). Read this first when picking the project up; decisions.md has the long-term design record, music-notes.md and performance-notes.md have the details for those systems.

## Where we are
Playable on iPhone Safari via GitHub Pages (https://panvertigo.github.io/paper-snail-surf/). Five levels: 1 cruise, 2 gauntlet, 3 descent (night), 4 bowl (free-skate park), 5 grand descent (night, 7 checkpoints). Physics untouched all day except one forgiveness change (EDGE 160 -> 40); golden replays L1-L4 pass.

## Done 2026-11-17
Look
- Time-of-day sky by course progress (no scene flips). Night levels (3 and 5): golden hour, sunset, purple dusk, deep violet; moon (slow drift), stars (never over the hills), two headlights that click on in the dark, a ferris wheel landmark, one sprawling lit town (ragged, no outline; warm windows and lamps that switch on in waves).
- Painted art for mountains, clouds and floating islands. Round, cute snail with toon shading. Paper ramp texture (one shared texture). Cuter, calmer eye stalks. Landing sound removed.
- Speed: particles are tiny at the snail and bloom in a widening cone behind as speed rises (from 2k u/s), black ink specks, FOV stretch at 3k+. The edge blur and ring overlay and the screen vignette are gone. Birds join big launches only and drift independently. Commuters, slime trail and the idle style bar are gone. Checkpoints are firefly gates. Portals are invisible and inert; hoop pop-up messages removed.
- Controls and camera: the lean control and its tutorial line are retired; the snail's nose now follows its flight path by itself. Settings gained camera distance (default 60%) and field of view (default 0) sliders.
Hitbox
- Invisible landing strip past each ramp's outer edge cut from 160 to 40 u (bots never used it; goldens unchanged).
Music (docs/music-notes.md)
- Songs per level: L1 Salt for Mushroom Field, L2 Fleetwood Mac, L3 and L5 Chicago, L4 bowl (Fleetwood, flow-driven).
- New hybrid ("linear") policy: the song plays in order and is steered by course progress (replay a phrase when ahead, skip when far behind). Chicago has a short order (L3) and a full order (L5); risers are never replayed. Simulated against new, improving, expert and very fast players (tools/music-sim.py): never worse than straight-through or the old checkpoint journey.
- Fleetwood starts at 2:31.4 (vocal sample cut), ends at 4:00; harsh 2.5-7 kHz band tamed. Salt sits on an exact 90 BPM grid anchored on its drop.
- iOS audio unlock hardened (still unconfirmed on a device).
Performance (docs/performance-notes.md)
- Found and fixed a ramp-texture-per-piece bug (probable crash cause). Added `?perf=1`, `?lite=1` and per-feature URL switches so the phone can tell us what is slow.
Courses and editor (2026-11-18)
- Course library: New, Copy (of any built-in level or your course; the original is never touched), Open, Save, Save as, Delete, Share link, Export and Import file, all in an obvious blue course bar with a Saved / UNSAVED pill. Courses are stored separately from the app (browser storage plus plain JSON files; the levels/ folder for shipped ones), appear in the game menu, and keep their own best times. The Music list comes from music/index.json and you can type your own song id. Details: docs/courses.md.
- Click any ramp to select, drag its body to place it, music/pull/fall fields, Start-from copies carry music, pull, fall and risk hoops.

## Next, in order
1. Tomorrow (Jeffry): level editor session. Build thematic intro courses (teach one idea per course: turning on a ramp, transferring between ramps, air strafe, hoops, loops). Research popular CS surf maps first (see below) so the courses borrow what makes them fun.
2. Phone performance: open the Pages link with `?perf=1`, then `?perf=1&lite=1`, report the box text. Then fix the biggest cost (likely merging ramp meshes, about 100 draw calls fewer).
3. Confirm music on the phone: first-run silence on Safari is still unconfirmed (`?audiodebug=1` shows why), then listen for the seams listed in music-notes.md.
4. Onboarding stage and medal calibration on real new players (needs a few friends; ask them to use `?perf=1` too).
5. Real player timing log (anonymous checkpoint splits) so music-sim.py and the medal curve stop using guessed player groups.
6. Ghosts and Game Center leaderboards (v1 scope), Capacitor wrap, determinism.html on the iPhone (still not run).
7. Music: second climax of Salt for a longer level, bowl on the linear policy, more material so slow players do not hear one phrase five times.

## Research brief: popular CS surf maps (for tomorrow)
Goal: find what makes the best surf maps fun, then translate it into our one-finger model. Questions to answer per map: ramp angle and width, how long a clean line takes, how the map teaches itself, where the skill gap shows, what the shortcuts reward, how checkpoints/stages are paced.
- Start with the maps surfers name most (to verify, not assumed): surf_ski_2, surf_utopia, surf_kitsune, surf_beginner, surf_rookie, surf_mesa, surf_lt_omnific, surf_forbidden_ways. Look at: surfing community tier lists, KSF/Ski2/Surf-timer map rankings, YouTube "best surf maps" and speedrun videos, beginner guides.
- Output: a short table in docs/ (map, what it teaches, notable ramp pattern, how we could reuse it), plus 3 to 5 course sketches for the editor.

## Editor wishlist (for tomorrow)
- Risk hoops are keyed by piece index and break when pieces are reordered.
- Loops and swirls only have move and height handles.
- No per-stage look settings (time of day start and end, town on or off, music is there).
- Section labels for a course (so an intro course can say what each stretch teaches).
- Desktop only for now.

## Open questions for you
1. (Answered 2026-11-18, see Art direction below.)
2. Fleetwood outro: keep the 5-bar ending that plays on finish, or end on the loop like Chicago?
3. Salt: does the drop at 45 s land on the beat you hear (I set the grid from the energy step, not by ear)? Should longer levels use its second climax?
4. Chicago on Level 3: the arrival riser plays through the finish and the arpeggio comes about 10 s after. Fine, or should the short order be trimmed so the arpeggio lands at the finish?
5. Hitbox: is a 40 u strip right, or too tight (80 to 100 would forgive more)?
6. Level 5 has no risk hoops. Add some, or keep it a calm descent?
7. Town: want a lake with reflections, or a clearer ferris wheel? Do the levels 1 and 2 (day palettes) need landmarks too?
8. Camera: is 60% distance the right default, or do you want presets (close / default / wide)?
9. Level 4 (bowl): move its music to the linear policy and give it a proper start and end?
10. Retire the lean physics code for good (it is only unused now), or keep it for a future advanced mode?

## Art direction (decided 2026-11-18)
- Start inside an apartment, maybe Jeffry's own. Stages go through the rooms (bedroom, hallway, kitchen, bathroom, living room, balcony door last) and everything is huge: the snail is tiny, so furniture, appliances and clutter are mountains. Outside views should be rare and surprising (a window you fly past, a balcony at the end), not the default.
- Level 5 (the grand descent: sky, mountains, town, night) is a proof of concept. Keep it as one of the later levels, for example the final climb out of the house ("we ascend") once the apartment stages exist.
- What carries over: the time-of-day light system (golden hour to dusk to night) becomes window light and room lighting across a stage (sunbeams on the floor, lamps and TV glow switching on), the paper ramps, the cute snail, the particle and speed look, the headlights (a dark room!), the town and ferris wheel (seen from the balcony or a window), the music system.
- What is new: interior sets (room shell with floor and wall textures, big furniture silhouettes as set dressing, props that the ramps lean on or sit among), scale cues, window views, per-room palettes. Cheap first version: flat painted cards and simple boxes in the existing renderer, then art from the illustrator friend.
- Open questions: is it literally Jeffry's apartment layout (then a floor plan and photos are the reference) or a generic cozy apartment? How many rooms for v1?

## Landing pad ideas (instead of the green pad)
Goals: wondrous, symbolic, whimsical; easy to see from the air (glow or spiral); a soft, forgiving target; reacts when you land (ripple, chime, petals, light); never green.
- A sunbeam pool on the floor, with a cat or dog bed in it: warm light, the thing every small creature heads for. Natural for the first apartment stages.
- A child's crayon drawing of a house, on the floor or fridge: you land inside the drawn house and the chimney smoke curls. Ties to the "Someone made you" story and "going home".
- A spinning vinyl record: you land on it, it starts turning and the outro of the song plays. Pairs the finish with the music.
- A music box with a turning ballerina platform that plays a few bars when you land.
- A cinnamon roll, a seashell, or a spiral staircase of books: spirals echo the snail's shell; landing winds you into the middle.
- An open storybook: you land on the last page, the words "the end" glow and the page flutters.
- A dewdrop-covered leaf in a pot by the window, or a flower whose petals open when you land (the garden as the very last destination, not stage 1).
- A paper boat on a puddle or in the bathtub: you land and drift out of frame; water rings ripple.
- A pillow fort with a lantern: the cosiest ending, lanterns hang over it.
- A moonlit puddle on the balcony that reflects the sky: the exit from the house for the last stage.
Recommendation: one signature pad per room so each stage ends on a different small wonder: sunbeam and cat bed (bedroom), spinning record (living room), open storybook (study), paper boat (bathroom), crayon house (the final one). Cheap to build as a flat painted card plus a glow and a particle burst on landing.

## The opening and Track 1 (2026-11-23)
See docs/opening-and-intro.md: song timeline, the 39 s exposition options (The Docket recommended), the Track 1 shape mapped to the music (about 103 s, dive at t=51), and six open questions for Jeffry. Music data and the fadeIn / campaign engine hooks are done; the exposition scene, a New campaign menu entry, retiming the Intro to the song, and a trough piece are not.

## Story and world (2026-11-19)
See docs/story-and-world.md: paper snail in a clay world, leylines (ramps) as the house's memory-lines, eyestalks that grow with lifetime distance, echoes at checkpoints, an Attic hub. Open decisions are listed at the bottom of that file. First cheap step: eyestalk growth (about 1 hour).
