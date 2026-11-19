# Story and world (draft, 2026-11-19)

Status: proposal from Jeffry's brief (super sad story, slightly mystical, Bloodborne-like but readable, ramps are leylines, snail eyestalks grow longer the farther they travel in the wind, cutesy like The Neverhood). Nothing here is built yet except where marked. Decisions needed are at the bottom.

## One sentence
A paper snail a child folded rides the old memory-lines of an emptied house, one last time, to bring the family's memories home before the house is sold.

## The sad core (plain, not obtuse)
- The child, Wren, folded the paper snail. Wren is gone (illness; never shown, never named as a death on screen). The family is moving out because they cannot stay in the house.
- The snail is alive because the house remembers. Everything the family did there left a faint warm line in the air: **leylines**. The snail's job is simple and it knows it: ride them, collect what is still warm, and carry it to the garden before the movers lock the door.
- The wind is the move itself, time passing. It blows the snail along, and it pulls at the snail: **the farther it travels, the longer its eyestalks get**. A snail sees more the farther it goes, and more is not always better: by the end the stalks trail behind like ribbons. (Cute first, then it lands.)
- Rule for the writing: every line a player reads is one plain sentence, eight words or fewer. Mystery comes from what is shown (a drawing, a coat, a tiny chair), never from riddles or item-description lore dumps.

## Bloodborne-lite, made friendly
- A hub, like the Hunter's Dream: the **Attic**, warm, quiet, lit by a window. A small clay **Mender** (a patient, wide-eyed figure made of clay and thread) sits there. Between runs it patches the snail's shell. It speaks in short plain lines about the house, never about rules.
- **Echoes** are the checkpoints: little lanterns that hold one clay scene (Wren drawing, a birthday, a dog asleep). Touch one and you see it for two seconds, then the run goes on. No text needed, one caption at most.
- **The Wind** is the unseen antagonist: not evil, just leaving. Faint huge shapes in the clouds and in the curtains. It never attacks; it makes the course harder (see Mechanics).
- Odd and a little eldritch, never scary: a moon that is a large clay thumbprint, moths made of old wallpaper, a staircase that has too many steps because the child counted them differently each night.

## Look: clay world, paper snail
- The Neverhood feel: sculpted clay, visible thumbprints, hand-painted backdrops, stop-motion stutter (scenery animates at about 12 frames per second while the snail stays smooth, so it reads as a diorama you are riding through), jazzy foley-heavy sound.
- The snail stays **paper**. It is the only paper thing in a clay house, because Wren made it. That contrast is the emotional centre of every screenshot.
- Leylines are the ramps. Visually they stay the high-contrast ramps the game needs (readability comes first), dressed as faint glowing seams of old thread and chalk lines running through the clay. In the editor and UI "ramp" becomes "leyline".

## Mechanics tied to the story
| Idea | What the player sees | Cost |
|---|---|---|
| Eyestalks grow with distance | A lifetime distance counter (saved on the device). Stalk length scales with it, up to long trailing ribbons. Wind already blows the stalks back at speed. Pure cosmetic, but it is a quiet "this journey is aging me" meter. | Small: one number saved, one scale factor in the snail model. About 1 hour. |
| Echoes at checkpoints | Lantern with a two second clay scene and at most one plain caption. | Medium: a handful of small clay props and captions per level. |
| The Attic hub | Between levels: a calm room, the Mender, a shelf where collected echoes sit as small figures. | Medium: one scene, a menu rework. |
| Wind gusts | Level modifiers (side gusts) tied to the story beat, added only if they can stay fair. | Physics risk, later. |

## Level map (matches the current art direction)
1. Kitchen: the happiest memories. Morning light, the drawing on the fridge of a paper snail.
2. Stairwell: down through the photos; Wren grows up in the frames, then the frames go empty.
3. Box Fort: moving boxes. The family is leaving; the fort is where Wren hid.
4. Garage then Garden: the exit. The snail arrives. Ending is one quiet beat (see decisions).
Later: the sky descent (Level 5) as the Wind's own place, one of the last levels.

## Open decisions (Jeffry)
1. How sad: implied (never say Wren is gone, let the empty house say it) or stated once, plainly, near the end?
2. Ending: bittersweet (the snail stays in the empty garden, the stalks long, the house waking for a new family), or fully sad (the snail simply stops where the line ends)?
3. Clay everywhere, or clay world with paper snail as above (recommended)? Clay assets are far more art work than paper cutouts.
4. Should eyestalk growth ever reset (no, recommended) or have a maximum length that is reached around the end?
5. Where does the story appear in the game: Attic hub with the Mender, or only environmental echoes first (cheaper, recommended first)?
