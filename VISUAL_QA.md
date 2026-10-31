# Visual QA: The Night Shift redesign

Every judgement below was made from a rendered screenshot captured with Playwright (system Chrome), not
from reading code. The screenshots are in `artifacts/visual-qa/`, numbered in the order they were taken.

- `node scripts/shoot.mjs <name> <path> [w] [h] [waitMs]` takes a screenshot and reports console errors and horizontal overflow.
- `node scripts/flows.mjs 1440 900 <tag>` runs the seven required journeys on the recorded case.
- `node scripts/live-flow.mjs` puts a dossier claim on trial live, so it needs a funded model key.

The reference images mentioned in the brief were **not attached** to the conversation, so direction came
from the written brief and the linked projects. Impeccable was **not installed**, so its critique workflow
was not used, and the critique below follows the brief's own rubric.

## Baseline: `00-baseline-1440.png`, `00-baseline-room-1440.png`

A centred masthead, a half-screen serif headline, and three equal columns of agent text on a near-black
canvas, with gold accents throughout. That is exactly the brief's automatic failure: a title, three columns
and a dark background. Nothing suggests a place, nothing invites interaction except form fields, and agent
work is shown as text, not activity.

## Pass 1: `01-pass1-overview-1440.png` (first render of the room)

It immediately reads as a room: back wall, evidence board, window onto a city, table, desks. Problems:

1. **Flat, even lighting.** The wall, floor and desks were all the same mid-brown with no darkness, and the cones were hard-edged triangles.
2. **The map hung off the table's front edge**, and the pin labels overlapped ("United States" collided with "Serbia").
3. **The foreground monitors were cropped mid-word** at 16:10 ("UTION"), and the desks were flat bands with no thickness.

## Pass 2: `02-pass2-overview-1440.png`

- **Fixed:** a world-space lightmap (multiply) so the room is dark except where light falls; softened cones; a smaller map fully on the table, with labels only on hover or table focus; foreground monitors moved inward; desks given a front edge.
- **New problems:** the lightmap also darkened the *screens*, so emitters looked dead. A lamp cord sliced the claim card. The palette was still monochrome brown.

## Pass 3: `03-pass3-overview-1440.png`

- **Fixed:** emitters (pendants, monitors, banker's lamps) render above the lightmap, and desk surfaces shade themselves. The pendants moved so their cords miss the claim card. The night sky and window spill became cooler, so the warm interior now has a cool counterpoint.

## Flow test 1: `04-flow-*.png`

- **Bug caught:** the depth-layer containers were full-stage `<div>`s that swallowed clicks meant for the table and the wall, so steps 2, 3, 5 and 7 failed.
- **Fixed** by making the layer containers ignore pointer events. All journeys then passed with zero console errors.
- **Visual defects found in the station views:**
  1. **Clipping text spilled off the paper.** A `block` class overrode the `display` that `line-clamp` needs.
  2. **A pendant lamp hung over the wall** in wall focus.
  3. **The paper trays showed as white slivers** at the frame edge.

## Pass 4: `05-pass4-*.png`

- **Fixed** all three defects: the clippings clamp, the lamps soften like the other out-of-focus stations, and the trays moved inward.
- **1920×1080** holds its composition.
- **390×844 failed:** cover-cropping left only the centre of the room visible, and the agent desks were unreachable.

## Pass 5: `06-pass5-*.png`

- **Fixed:**
  - Two leather chairs pulled up to the table fill the empty foreground. They were shrunk in a follow-up after they covered the map.
  - The window spill was softened, because it read as a hard slab at 1920.
  - A duplicate label on the case folder was removed.
  - **Narrow screens get a small station strip.** This is a deliberate exception to "no navigation dashboard": the room cannot show every station on a phone, and without the strip the desks are unreachable.

## Live test: `07-live-*.png`

- **Bug caught:** a real live case crashed the room. The model sent `bearing: "contradicts"` instead of the schema's `"undermines"`, because the provider doesn't enforce tool enums.
- **Fixed** at three layers:
  - **Server:** every enum (bearing, stance, verdict) is normalised or rejected with instructions for the agent.
  - **Client:** a tolerant lookup handles any unknown value.
  - **App:** an error boundary shows a paper fallback, never a blank screen.
- **The rerun passed.** All three monitors showed `● WORKING` together, driven by Mozaik events. The exhibits flew to the wall, and the ruling (*Contradicted, 98%*) was pinned with zero console errors.

## Final: `08-final-*.png` and `08-final-flow-*.png`

### Scores

| Criterion | Score | Why |
|---|---|---|
| Environmental immersion | **4/5** | Unmistakably a room at night, before any interaction. Still reads as an illustration, not a photograph. |
| Architectural depth | **4/5** | Chairs and desks in front, table in the middle, wall and window behind, with parallax. The vanishing point isn't strictly consistent between floor and desks. |
| Material realism | **3/5** | Paper, lamplight and the night window convince. The wood is procedural noise and the objects are flat-shaded vector shapes. No photographic or 3D assets were used. |
| Visual originality | **4/5** | Tungsten and walnut chiaroscuro, a cork wall with bearing-coloured string, phosphor monitors. Not a default AI dashboard. |
| Interaction clarity | **4/5** | Pulsing room tags, hover labels on monitors and pins, and a line of context hint text. The pins are small at overview. |
| Product relevance | **4/5** | The election map, the night edition, the dated desk note and the sourced desk research on the wall show the purpose at once. |
| Functional integrity | **5/5** | All seven journeys pass on the recorded case, and the live run passes. Every pinned document, string, screen line and paper count comes from case data. |
| Overall polish | **3/5** | Coherent and intentional, but below the craft of the rendered 3D references. There is no sound. |

### Answers to the brief's questions

- **Could someone physically enter it?** It reads as a place: wall, window, floor, furniture and light sources.
- **Is there convincing perspective?** Yes, broadly, but it is a 2.5D stage, not a modelled space.
- **Is there an obvious focal point?** The lit table in overview, and the claim card on the wall once a case is open.
- **Is it interesting before interaction?** Yes. The wall already carries three sourced quotes, one per election, and the lamps, city and desks give the eye somewhere to go.
- **Could it be mistaken for a generic AI website?** Not in the overview. The paper documents that open over the room are the most conventional part, though they are styled as physical sheets.

### Unmet or partly met

- **Real photographic or 3D assets:** none were used. All materials are procedural (SVG noise, gradients), so no attribution is needed, but realism is capped at "art-directed illustration".
- **A true 3D camera:** the camera is a single 2D transform with depth parallax, not a 3D dolly. There are no camera rotations or real occlusion changes.
- **Sound:** not implemented. It could not be made reliable and unobtrusive in the time available.
- **Narrow screens** use a station strip instead of moving through the room freely.
- **Impeccable critique** wasn't available, and **the reference images** were never received.
