# Level editor v2 plan (2026-11-18)

Goal: the game is only as good as its levels, so the editor must make flowing, cinematic, hard routes fast. Decisions (Jeffry): both a path-first model and the piece list, kept in sync; separate editor.html; priorities are live speed/fall feedback, scenery and set dressing, music and sections, test-ride in the editor, careful route curation, and rotating ramps imaginatively (sometimes into walls).

## Phases (each ends with a commit and a demo)
1. Shell: editor.html (full-screen layout, opens the same engine), top-down path view, piece list as the advanced panel. Drag-to-extend, snapping, multi-select, copy/paste of sections, undo/redo, autosave.
2. Path-first: control points on a spline; the tool cuts it into ramps and arcs, picks turn radius and slope, and keeps both views in sync.
3. Live feedback: speed and height profile strip, red/green markers for falls and speeds over the turn limit (sqrt(1000 R)), bots re-run as you drag.
4. Sections and music: mark sections and checkpoints on the path, attach a song, preview it while editing; checkpoint rules enforced (no uphill within 3 ramps after a checkpoint).
5. Test-ride: play from here, ghost of the last run, per-section splits.
6. Set dressing: props, room themes, the visual hole/pit for narrow landings.
7. Rotated ramps and walls (needs physics work, see below).

## Risks and open items
- Rotating ramps (roll) and wall ramps are a PHYSICS change. Today a ramp is an upright prism (about 51 deg faces, ridge on top) and the physics assumes it. A rolled ramp needs a general plane-contact model and new golden replays; levels 1-4 must stay bit-identical. Plan: add a `roll` piece option that only affects new pieces, keep old code paths untouched, add verifier README lines. The existing `loop` tube (banked up to 80 deg) already gives corkscrew walls; try that first as the "wall" feel test.
- editor.html as a truly separate codebase would need index.html split into modules (large refactor). Cheaper route: editor.html is a launcher plus layout that boots the same engine in editor mode. Decide before phase 1.
- Desktop first. Touch editing is out of scope.

## Progress
- Phase 1 (done, 2026-11-18): editor.html launcher; top view (T); extend handle (cyan: drag out a new ramp, or an arc through the dragged point with auto radius and turn angle, auto zig so it bends the way you drag); shift-click range select, Ctrl+C / Ctrl+V, range delete; slope and radius handles; autosave and undo already existed. Not done from phase 1: snapping grid, true separate editor codebase (decided against: needs a module split).
