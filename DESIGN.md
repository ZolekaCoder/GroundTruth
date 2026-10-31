# The Night Shift: visual direction

The Ground Truth is a place, not a page. The user is an investigative editor walking into a newsroom at
night during the October–November 2026 election period. Everything the product does happens somewhere
in this single room, and the camera travels between those places without page changes.

## The room (one continuous scene, 1600 × 900 logical units)

| Zone | Depth | What it is | What it does |
|---|---|---|---|
| Night city through tall steel windows | background | Rain-dark skyline, lit windows, haze, lamp reflection on glass | Atmosphere. Tells you it's late |
| The evidence wall | background-centre | A cork-and-linen board with two angled wings, so it reads as curved | **Centrepiece.** Real exhibits pinned as they're verified; strings coloured by bearing; disagreements drawn between advocate tags; the ruling pinned at the end |
| Investigator's station | mid-left | Desk under the archive shelves, monitor, paper tray | Agent C |
| The election table | middle | Walnut table under two pendant lamps; a world map laid flat with three brass pins; the case folder; the night edition | Stations A and B: country dossiers, then the case file |
| Prosecutor and Defender desks | foreground left/right, cropped by the frame | Large and dark, with banker's lamps | Agents A and B |

## The camera

`overview → table (map) → dossier → case desk → agents → wall → verdict`. A single transform drives
the world (translate + scale), eased over 1.4s. Layers shift with the pointer at different depths
(parallax). Stations that aren't in focus dim and soften, the way a lens would. `Esc` or "Back to the
room" always returns to the overview, and case state lives above the camera, so nothing is lost.
Reduced-motion users get instant cuts and no parallax.

## Material palette (light makes the colour; flat fills are a fallback)

| Token | Hex | Material |
|---|---|---|
| walnut | `#3a2619` | tables, wainscot, desks |
| walnut-lit | `#6b452a` | wood under lamplight |
| graphite | `#24221f` | room shadow, monitor bezels |
| bronze | `#8c6b43` | brass pins, lamp shades, nameplates |
| limestone | `#c9bfa9` | wall plaster under light |
| olive | `#6d7046` | "supports" strings, Defender screen |
| tobacco | `#5a3d27` | cork board, folders' shadow side |
| paper | `#ece2c8` | every document |
| red | `#a3302a` | **only** contradictions and urgent evidence |

There is no pure black canvas. Darkness is graphite and walnut with light falling off.

## Type (subordinate to the world)

- **Instrument Sans** for interface text in the room: hints, labels, buttons.
- **IBM Plex Mono** for case metadata, monitor readouts and typewritten notes.
- **Newsreader** only where print would use a serif: newspaper headlines and document titles.

There are no giant hero headings and no rows of letter-spaced capitals. The largest text in the
opening frame is a newspaper masthead lying on the table.

## Documents

Documents are paper: warm, faintly fibred and slightly rotated, with a contact shadow and thickness on
folders. Verified evidence, agent reasoning and reader input are visibly different objects:

- **Verified evidence:** a clipping with a brass pin and a source line, labelled *Verified quotation*.
- **Agent reasoning:** typed on the agent's own notepaper, labelled *Agent reasoning, not evidence*.
- **Reader objection:** a handwritten-style index card.
- **The ruling:** a court document with a stamp the editor applies themselves.

## Honesty rules carried into the art

Nothing decorative pretends to be data. Every pinned document, string, screen line and paper count is
drawn from the live or recorded case. Recorded runs say so on the HUD at all times. Dossier claims carry
their *Synthetic test claim* label on the paper itself.
