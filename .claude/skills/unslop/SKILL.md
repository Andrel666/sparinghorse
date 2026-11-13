---
name: unslop
description: Strip the AI look from a screen of this app (the new UI in ui/, or Classic in static/) without changing what it does. Audits the rendered page against the slop signs, proposes a direction and a tone-only copy table, STOPS for approval, then fixes the craft in nine passes (spacing, colour, icons, copy, type, layout, details, visuals, motion), one commit each, and checks the result with Lighthouse, a tab-through and two independent reviewers (a judge on screenshots, a guard on the diff). Use when asked to unslop, polish, clean up or de-AI a page, or when a screen shows purple gradients, glows, emoji labels, uppercase tracked labels, heavy weights, colour on everything or drifting spacing.
---

# Unslop (Sparing Horse)

Adapted from **unslop** by Damir Sokolovsky ([@heydamir](https://x.com/heydamir), [heydamir/unslop](https://github.com/heydamir/unslop)), CC BY 4.0; keep this credit in copies. The signs and starting values are his, unchanged, in `references/`. What is added here is the process this project runs it with (first used on PR #23) and the house rules that keep the result from drifting back.

**Change the craft only.** Features, behaviour, facts and section order stay. No new sections or components.

## 0. Before anything: read-only until the user approves

1. **Read the brand first**: `ui/BRAND.md`, `ui/DESIGN.md` (the system and its primitives), `ui/src/styles/tokens.css`. A real brand (ink and paper, the ultramarine *now* signal, Inter, the held line, the knight) stays. A purple gradient is never brand.
2. **Run the app on test data** (no login, no credentials read): seed a DB (`SH_DB=… python SparingHorse.py seed`), serve it in demo mode (`SH_DEMO=1 SH_PORT=8811 …`), and run the new UI against it (`cd ui && SH_API=http://127.0.0.1:8811 npx vite`).
3. **Before shots, outside the repo**: `node scripts/shots.js <scratch>/before` (every page and plan view, 1440×900 and 390×844, in screen-height pieces; add the Settings Console tab for the export buttons).
4. **Record the baseline**: `cd ui && npm run typecheck && npm run build && npm test`, and `scripts/lh.sh <scratch>/lh-before` (Lighthouse accessibility, desktop and mobile, every page). Save both.

## 1. Plan, then stop

Show the user all three and **wait for an OK**:

1. **Slop list**: number every sign from `references/signs.md` with where it shows (page, element, file:line). Say honestly how heavy it is: heavy slop gets the full process; light slop is **polish mode**, where only the listed items are fixed and the existing brand sets the direction; no slop means say so and suggest at most three refinements.
2. **Direction, three lines**: *World* (its setting or material), *Focus* (one or two spots that get rich colour and detail; everything else stays quiet), *Signature* (one small detail only this product would have). For this app: World = a training diary, ink on paper; Focus = Today's day band and the road; Signature = the ultramarine *now* square (the knight's eye) and the held line.
3. **Copy table**, current vs proposed, **tone only** (exclamation marks, greetings, hype words, trailing periods on labels). Never a claim, number, price, name or legal line.

## 2. Nine passes, after the OK

On a new branch, **one commit per pass across every page**, in this order (a pass with nothing to do gets an empty commit saying so):

1. **Spacing**: the 4px grid (`--sp-*`, `--ctl`, `--indent`); same things same size.
2. **Colour**: one neutral ramp, three text roles (`--text`, `--text-2`, `--muted`), one accent saved for Focus and *now*; no hue gradients, glows or glass. A state is a round `--mark` dot, **only for warn and bad**, never the figure's own colour (Today's day band is the exception, it is the focus).
3. **Icons**: the project's line set (`ui/src/components/Icon.tsx`, one stroke) replaces emoji.
4. **Copy**: the approved rows only.
5. **Type**: weights 400 and 500 (`--w-regular`, `--w-medium`), sentence case, sizes from the scale, negative tracking only via `--track-display` / `--track-hero`; Inter stays.
6. **Layout**: alignment and proportions inside sections only.
7. **Details**: one radius (`--radius`, round only for marks), quiet tags, the Signature where it belongs and nowhere else, a visible focus ring on every control.
8. **Visuals**: remove decorative filler; generate nothing.
9. **Motion**: no loops, no `transition: all`, no hover scale; `--ease-out` with `--dur-1/2/3`, colour, opacity and transform only.

Use the primitives instead of restyling on a page (`ui/DESIGN.md` → Primitives): the tone mark (`.toned` under `.tone-*`), `.trend`, the now square, `.bullets`, `.src-head`, `.bars-chart`, `.nw`. If a primitive is missing, add it to `base.css` once and use it everywhere.

## 3. Rules

- Only styling and approved copy change. Anything else (logic, data, config, a new package or font) goes on an **approval list**, unbuilt. Theme files count as styling; name the other pages a change reaches.
- Keep every id, `data-` and `aria-` attribute. Never edit a test to make it pass; copy-only breaks go on the approval list.
- Visible text stays byte-identical outside the approved rows, whitespace included. To keep "12.5 km" together, wrap the existing text in a `.nw` span; never insert a no-break space.
- Text stays at WCAG AA (4.5:1, 3:1 for large text). Every control keeps a visible focus state.
- **The guard test must pass**: `ui/src/lib/slop.test.ts` (runs in `npm test`) fails on off-grid spacing, other weights, uppercase or tracked labels, sizes off the scale, raw colours outside `tokens.css`, gradients, glows, glass, catch-all or looping motion, and emoji. A real exception goes in its `ALLOW` list with the reason; never weaken a check to pass it.
- Never push or merge without the user saying so.

## 4. Check

After the last commit:

1. Retake the same shots (`scripts/shots.js <scratch>/after`).
2. **Build and tests**: no new failures (`npm run typecheck && npm run build && npm test`; the Python battery and `test/run_local_test.sh` too if any Python or Classic file changed).
3. **Lighthouse**: `scripts/lh.sh <scratch>/lh-after`, diffed against the baseline: no new failures. It can't score text over images or gradients: list those as unchecked.
4. **Focus**: `node scripts/focus.js <scratch>/focus` tabs through the pages; every focused control must show a ring. **Grep the built CSS** (`ui/dist/assets/*.css`) for motion stills can't show.
5. **Two independent reviewers**, fresh agents (not forks), editing nothing, in parallel:
   - **Judge**: gets only the before and after shots and the slop list. Marks each item gone / still there / can't tell, citing the screenshot; flags anything broken at phone width; runs the **swap test** (would the page still make sense with another company's name?).
   - **Guard**: gets only the rules above, the approved copy rows and the full branch diff. Lists every change that isn't styling or approved copy, every id/data-/aria- change, every test edit, every colour pair below AA.

## 5. Stop

Fix what both reports find, retake the shots and rerun the check with a **new** judge and guard: **two rounds at most**, then stop even if items remain. A failed swap test means pushing World and Signature, styling only; if frozen copy causes it, report it rather than rewriting copy.

## 6. Output

The final slop marks, the test and Lighthouse results, and the approval list. End with what you need from the user: merge, revert, or a call on each approval.

## Lessons from the first run (PR #23)

- Under Vitest a `?raw` stylesheet imports as an **empty string**, so a guard that reads CSS that way passes vacuously. Read from disk, and fail if too little was read.
- A dot on every number is decoration in a new shape. A good state is unmarked; a mark means *look here*.
- Moving all weights to 400/500 flattens hierarchy: section titles go to ink so they read above grey field labels.
- Snapping only heights to the grid turns squares into rectangles: size width and height together.
- Week cells and other narrow columns break "12.5 / km": keep number and unit in one `.nw` span.
