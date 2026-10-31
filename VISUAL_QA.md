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


---

# Revision 2: daylight, people, evolving investigations

All design iteration in this revision used the **recorded** investigation. The API was called once, to record a run that validates the new multi-stage backend (`server/src/scripts/prove-concurrency.ts`, with autopilot decisions).

| Shot | What it showed | What changed next |
|---|---|---|
| `10-day-A-*` | Daylight room, people at desks, real OSCE photos on report-style clippings, handwritten leads, the replay stopping at decision 1. **Problems:** illegible HUD wordmark on the light wall, with the clock on top of it. Pendant cords slicing the board. Walking reporters at full size beside the wall. Long "why" text in the memo. | HUD wordmark on a chip; lamps removed; clock moved above the board; walkers shrink with distance; why-text clamped |
| `11-day-B-*` | Journeys failed after decision stops were added. **This was the test, not the app:** recordings now wait at each decision. The test was updated to treat decisions as journey steps, and all steps passed. **Visual problems:** faceless "mannequin" heads, white blocks at the desk fronts, heavy chairs. | Profile faces (brow, eye, nose, mouth); wire in-trays; smaller chairs |
| `12-day-C-*` | 1920: walkers, speech bubbles, typing, an editor at the window; the room feels inhabited. **Problems:** every walker headed for the same wall spot; HUD chips pile up at 390px. | A pin spot per desk; compact mobile HUD |
| `13-day-D-*` | All 11 journey steps pass, 0 console errors. The evidence sheet carries the source's own photo with a credit. **Problem:** in a recording, the memo's "Continue" sat below the fold. | Recorded decision moved to the top of the memo |
| `14-live-memo-layout-1440` | The **live** memo (rendered over the recording via a temporary QA flag that has since been removed, with no API call): two agent leads assigned to different desks, one lead written by the editor. **Problem:** the button said "3 desks" for two desks. | Label now counts leads and desks |

## Scores, revision 2

| Criterion | Score | Why |
|---|---|---|
| Environmental immersion | **4/5** | A bright, specific place: sunlit city, plants, rug, a clock showing the real time, people. Still an illustration, not photography. |
| Architectural depth | **4/5** | Foreground desks and reporters, the table and rug, the wall and window. Walkers scale with distance. |
| Material realism | **3.5/5** | Real photographs from the sources lift the documents considerably. Furniture and people are flat-shaded vector shapes. |
| Visual originality | **4/5** | Editorial illustration plus real press photos and handwritten notes. Not a dashboard. |
| Interaction clarity | **4/5** | The memo makes decisions explicit, and the HUD prompts "Your call, editor". |
| Product relevance | **4.5/5** | Serbia, the US and South Africa dossiers on the map. The flagship run reads the OSCE report and chases its final report as a lead. |
| Functional integrity | **5/5** | Multi-stage backend validated live, and every journey passes on the recording. |
| Overall polish | **3.5/5** | Cohesive and lively. The people are deliberately simple, and there is no sound. |

## Not done

- **No sound.**
- **People are simple vector figures** with a handful of poses, not animated characters.
- **Comparing two outlets side by side** isn't built. Readers compare reporting by objecting with a second source.
- **The live memo's buttons haven't been clicked against a live case in the UI.** The decision logic itself (`decide()`) ran live via autopilot, and the HTTP endpoint is a thin wrapper, checked for input validation.


---

# Revision 3: the 3D newsroom

All iteration used the recording or the empty room. **No API calls were made.** The screenshots come from headless Chrome rendering WebGL in software (SwiftShader), so they show exactly what the code draws, but slowly.

| Shot | What it showed | What changed next |
|---|---|---|
| `20-3d-A-overview` | WebGL works: Poly Haven furniture, PBR floor and walls, shadows. **Problems:** the "table" model was a round stool and, scaled to 2.5 m, became a giant; chairs faced away from their desks; the window wall was out of shot. | A custom oak-veneer table on steel legs; chair orientation fixed; a diagonal overview |
| `21-3d-B-overview` | The room reads properly: table, lamps, a city through steel windows. **Problems:** the agent desks weren't in the overview; muddy beige walls; flat light; cartoonish rug bands. | Desks re-planned to face the room, with camera shots derived from each desk; light plaster; stronger sun; a finer rug |
| `22-3d-C-overview` | Sun and mullion shadows across the floor and board; all three desks visible. **Problems:** grey wall albedo; front desks cropped; a dark tower outside. | Normal-map-only plaster in warm white; desks moved in; four HDRI rotations compared (`23-hdri-*`) and the brightest chosen |
| `24-3d-*` journeys | **Two real bugs found:** clicking a map-pin label also triggered a 3D raycast (it opened the Investigator's desk instead of the dossier); and 3D speech bubbles could stack over the dock. **One test-ordering issue:** the replay reached decision 2 before the desk step. | Pointer events stopped on labels; the 3D container isolates its stacking context; steps reordered. **All 10 steps pass, 0 console errors** |
| `24-3d-07`, `25-3d-E` | Desk close-up: the camera sat low behind the chair, the arm lamp floated off the desk, and the strings were hard V-shapes. | Higher desk shot; lamp seated on the desk; strings sag along a curve |
| `25` (console) | A React warning: images loaded during render. | Image loading moved into effects, with a listener per image |
| `27-3d-G-overview` | An empty board looked bare. | Three sourced desk-research quotes pinned; election posters (atlas outline, election, date) on the side wall |
| `28-2d-fallback-*` | The 2D fallback: **all 11 steps pass** on `?view=2d`. | — |
| `29-3d-mobile-390` | Narrow screens: the 3D room and the station strip, no overflow. | — |

## Scores, revision 3

| Criterion | Score | Why |
|---|---|---|
| Environmental immersion | **4/5** | A real 3D room you can look around in, with sunlight, shadows and a city outside. |
| Architectural depth | **4.5/5** | True perspective and occlusion. Camera moves between stations reveal the space. |
| Material realism | **4/5** | PBR parquet, plaster and oak, scanned furniture and plants, HDRI reflections. The rug and posters are canvas-drawn. |
| Visual originality | **3.5/5** | Believable and bright, but closer to a clean architectural visualisation than a distinctive art direction. |
| Interaction clarity | **4/5** | Clickable pins, monitors and documents, plus a station dock and exhibit chips. |
| Product relevance | **4.5/5** | Election map, posters and desk research for all three countries, and the flagship Serbia case on the wall. |
| Functional integrity | **5/5** | Every journey passes in 3D and in the 2D fallback. The backend and extension are untouched. |
| Overall polish | **3.5/5** | Coherent and working. Software-rendered screenshots understate it, and there are no people and no post-processing. |

## Not done

- **No 3D journalists.** No suitable licensed realistic character assets were available without an account. Agents are present through their desks.
- **No post-processing** (ambient occlusion, bloom). This was left out to keep it reliable on modest GPUs and in software rendering.
- **The room is sparse in places**, with large wall areas left empty.
- **The 3D bundle is about 290 KB gzipped**, lazy-loaded, plus about 44 MB of assets fetched on demand.


---

# Revision 4: people, identity, opening, readability

Every shot used the recording or the empty room. **No API calls were made.**

| Shot | Check | Finding → change |
|---|---|---|
| `30-intro-1440` | Opening moment | A breaking-news ticker, the title, the Election Desk line, the three elections and two ways in. The body text sat over a busy part of the room → the overlay gradient now darkens the left side. |
| `31-room-1440` | Does it feel empty? Is it an election desk? | People are present (three reporters, the editor, a researcher), with desk signs and the election screen. **Problems:** the pendant lamps hid the wall sign; the sign's title and "ELECTION DESK" overlapped (the width was estimated, not measured); the outer desk signs were cropped. → Lamps removed, text measured, signs pulled inward. |
| `32-room-1440` | Readability | The sign reads cleanly. The Investigation sign hid behind the Prosecution sign → raised and offset. |
| `34-working-1440` (`?speed=1`) | Desks while working | All three hanging signs read "● Working now", the monitors stream real activity, clippings and strings fill the wall, and the election screen shows the case on the desk. The election screen's rows were small from across the room → enlarged, with fewer words. |
| `35-3d-*` journeys | Function | **11/11 steps pass** (including the opening screen), 0 console errors. |
| `35-3d-07`, `35-3d-08` | Close-ups | The desk reads at a glance. Clipping quotes on the wall were still small → fewer words at a larger size (`37-wall-1440`). |
| `36-2d-fallback-*` | Fallback | **11/11 steps pass.** |

**Answers to the four questions:**

- **Does the room still feel empty?** No: five people, three live screens, a live election board, a ticker and a populated wall.
- **Can you instantly tell it's an election desk?** Yes: the opening screen, the wall sign, the election screen and the ticker, before any interaction.
- **Is the text readable?** The HUD, dock, desk signs and monitors are, at overview distance. Clipping bodies are legible at the wall, with full text in the document sheets.
- **Are the agent desks prominent?** Yes: large monitors and named hanging signs with live status.

**Still true:** the people are stylised, faceless figures, not realistic characters, and there is no post-processing.


---

# Revision 5: cinematic opening, clean-up, final live run

**Impeccable** (`npx impeccable detect`, v4.8.0, 62 rules) was used as the critic. Its skill pack wasn't installed, so the detector was the tool.

| Step | Findings | Change |
|---|---|---|
| Baseline scan of the old opening | 4 findings: overused font (Instrument Sans), a marquee (auto-scrolling HTML ticker), low-contrast "2D view" link, low-contrast hint pill | — |
| Redesign | — | The hero is now the room itself: a broadcast cold open on the live election board, with letterbox, LIVE bug, real time and a lower third, then a slow camera dolly into the room. The HTML marquee, the "Court in session" chip, the floating "2D view" and "Text view" links (moved into the dock), the 3D hint pill and the redundant desk nameplates were removed. The interface font is now IBM Plex Sans Condensed. |
| `40-coldopen` | The lower third collided with the board text | Reframed so the board sits high and right; compact lower third (`41`) |
| `41-coldopen` | A gold date line wrapped into the board and duplicated it | Removed (`43-coldopen-final`) |
| Rescan, opening | **0 findings (exit 0)** | — |
| Rescan, `?demo` | 9 findings in the editor's memo: tight handwritten leading, long lines, 11px labels, low-contrast disabled buttons, a stripe gradient (advisory) | Leading 1.25+, max line widths, labels at least 12.5px, assignment controls hidden in recordings, plain paper |
| Rescan, `?demo` | **0 findings (exit 0)** | — |
| Regression | 3D journeys **11/11**, 2D fallback **11/11**, 0 console errors | — |

## The final run used the live API

`node scripts/live-final.mjs` drove a **live** case through the cold open and the 3D room, with the editor's decisions made in the memo by the test, standing in for a person (not by the server autopilot). Screenshots use Chrome DevTools Protocol capture, because Playwright's screenshot waits for fonts to settle, which never happens while live updates redraw canvas textures under software WebGL. The first attempt stopped there, and the same live case was resumed, so no credits were wasted.

- **Stages:** investigation, decision, leads, cross-examination, rebuttal, decision, deliberation, verdict
- **Decision 1:** L1 assigned to the Investigator and L2 to the Prosecutor, researched concurrently; both reported
- **Rebuttal:** 5 challenges, 3 conceded and 2 rebutted
- **Verdict:** **Misleading (76%)**, "Observers praised turnout but assessment was deliberately mixed, not positive", from 9 verified exhibits
- **Concurrency:** peak of 3 agent turns at once; 0 browser errors
- **Frames:** `50-live-*`


---

# Revision 6: live only

Recorded runs are removed from the product: the replay mode, `web/public/sample-case.json`, every "recorded" button and banner, and the replay-based tests. The cold open's second action now opens the Serbia case **live**, and old `?demo` links land in the live newsroom.

**A live-only bug found:** the model sent the verdict's `uncertainties` as a string (`'["…"], ["…"]'`) instead of a list, which crashed the ruling sheet. This was fixed at both ends: the server normalises every list-valued tool argument, and the client tolerates either form. The recording had never exercised this path.

**Validation (live, 1 Nov 2026), case `df29028d`:** cold open → "Open the Serbia investigation now" → all stages → decision 1 (L1 to the Investigator and L2 to the Prosecutor, concurrent) → decision 2 (send to the judge) → **Misleading (84%)**, 8 exhibits, 6 challenges (5 conceded, 1 rebutted), peak of 3 concurrent agent turns, ruling stamped, **0 browser errors**. Frames: `50-live-*`.
