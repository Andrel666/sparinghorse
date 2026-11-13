# Design system — Swiss / data-dense

The app is a training instrument, read daily. The design gets out of the way of the numbers.

## Principles
1. **Grid, not cards.** Sections sit on a 12-column grid and are separated by hairline rules. No boxes,
   shadows or rounded panels on a page. Surfaces exist only for things that float (drawer, dialog,
   toast, menu).
2. **One signal colour.** Ink and paper do the work. `--signal` (ultramarine) means *now* or *look here*:
   today, the current week, the race, the selected item, the primary data line. Status colours
   (ok / warn / bad) are a round 8px dot before the value, which stays ink; never a fill, never the
   figure's own colour. Today's day band is the one place a state colours the words.
3. **Type is the hierarchy.** One family (Inter, optical sizes for display), tabular figures everywhere.
   Two weights, 400 and 500. Big numbers, small labels, all sentence case: no uppercase, no tracking
   except the display tokens on 24px and up.
4. **Tables over chips.** Lists of facts are tables or key–value rows. Tags are plain text with a 6px
   square marker, not pills. Buttons are for actions only.
5. **Quiet prose.** Explanations sit after the data, in the muted colour, at small size, or behind "?".

## Tokens (`src/styles/tokens.css`)
| Token | Light | Use |
|---|---|---|
| `--bg` | `#fafaf9` | page |
| `--surface` | `#ffffff` | floating surfaces only |
| `--surface-2` | `#f1f1ee` | meters, tracks, hover |
| `--line` | `#e2e2de` | hairlines |
| `--rule` | `#0b0b0b` | section rule (1px), strong separators |
| `--text` | `#0b0b0b` | text, primary buttons |
| `--muted` | `#6a6a66` | labels, secondary text |
| `--text-2` | `#3d3d3a` | secondary prose, tone labels |
| `--signal` | `#2b3cff` | now / selected / primary data |
| `--ok` `--warn` `--bad` | `#0d7a3d` `#9a5b00` `#cf1f1f` | state marks (the round dot) |
| phases | grey ramp, peak darkest | road, calendars (the current week is signal) |

Type scale: hero 64 · figure 32 · figure-sm 28 · title 24 · heading 17 · body 15 · small 14 · label 13 (floor).
Weights: `--w-regular` 400, `--w-medium` 500. Space: the 4px grid (`--sp-1`…`--sp-7`, `--ctl` 36 for controls,
`--indent` for lists). Radius: 2px on controls and tracks, 0 on sections, round only for marks (`--mark` 8px).
Text roles: `--text`, `--text-2`, `--muted`. Motion: `--ease-out` with `--dur-1/2/3`, colour, opacity and
transform only.

## Simplicity rule
A screen should make sense without taglines, helper text or secondary labels. If it needs them, fix the
layout. Long explanations go behind a door (a `Why` disclosure, a `More`, a source drawer), never under
every field. Every number on a page is a door to where it is decided.

## Components
| Component | Spec |
|---|---|
| Section (`Card`) | 1px `--rule` on top, label row (sentence-case 13 label left, aside right), optional `lede` (the section's headline), content below; no box. `id` makes it an anchor that scrolls and flashes |
| Strip | the headline numbers: label, figure, one sub line, optional sparkline; **every cell is a door** (`to` or `onClick`, enforced by the type) |
| Row | the one list row: lead (date / mark) · title + sub · fixed-width number columns · trail; the whole row is the hit area |
| Tag (`Pill`) | text 13px in `--text-2`; tone = a round 8px dot before it, the words stay neutral |
| Button | `--ctl` tall; primary: black fill (one per screen, never in the top bar); default: 1px `--text` outline; link: underlined text; disabled = outline only |
| Tabs / Seg | tabs: text with a 2px underline; Seg: square cells, active black fill, wraps to a grid on the phone |
| Table | header muted label, hairline rows, numbers right-aligned; stacks into rows on the phone (`phone="scroll"` for wide grids) |
| Week strip | seven columns, today has a signal rule on top and the now square; a run sits on the day it was run, its planned day struck and "moved to" |
| Calendar | the one month grid for Plan and Runs: planned muted (struck when missed or moved), runs solid with the zone dot, a week column `run / planned` |
| Journey | the whole road as one bar of week cells grouped by phase: past filled, this week signal, each cell opens its week |
| Charts | headline as the section lede; y values at the left edge; today as a dashed rule; hover readout under the chart |
| Banner | 3px left rule in the tone, no fill; bold "what", then the action |
| Drawer | right panel on desktop, bottom sheet on the phone; focus trapped, Escape closes, URL state so back closes it |
| Back bar | sticky `‹ Page` at the top of a page reached through a door; a tab or sidebar click starts over |

## Primitives (use these; never restyle them on a page)
| Primitive | Where | Rule |
|---|---|---|
| Tone mark | `.toned` under `.tone-*` | an ink value with a round `--mark` dot in the state colour |
| Trend | `.trend` | ▲ above / ▼ below a reference; it is the mark, in the tone, no dot added |
| Now square | `.now-sq`, today in the week and month | the signature: an 8px `--signal` square; only *now* gets it |
| Bullets | `.bullets` (`.flush`) | a list's indent and top gap; no inline list styles |
| Source heading | `.src-head` | a heading on its own line above its text (no run-in "Rule.") |
| Bar gutter | `.bars-chart` | a bar chart's y values sit in a left gutter, never on the bars |
| Short mark | `.short-mark`, a day in the week strip | a run shorter than asked (outside ±10 %) gets the warm dot in place of the tick: the debrief's distance verdict, never a second rule |
| Debrief | `components/Debrief.tsx` (Now, Log) | the four questions after a run, numbered, in order: did I do what was asked · what it cost · what it did to the goal (ending in the goal as it stands) · what's next. Stacked on the phone, 2×2 on desktop; a section without data says when it settles |
| Contract | `pages/Goal.tsx` `Contract`, the debrief's "The goal now" | goal · predicted (band) · margin · days left; the margin is the one toned figure |
| Levers | `ol.levers` (Goal) | what to change · its computed effect · a door to where you'd change it; what can still move the race first, then the computed, then habits |
| Icons | `Icon.tsx` | one line set, one stroke (1.5), 16px inline / 20px tabs; never an emoji |

**The guard.** `src/lib/slop.test.ts` (run by `npm test`) fails on off-grid spacing, weights other than the
two tokens, uppercase or tracked labels, sizes off the scale, raw colours outside `tokens.css`, gradients,
glows, glass, catch-all or looping motion, and emoji. An exception goes in its `ALLOW` list with the reason.

## Layout
- Desktop: a top bar (wordmark, page links, Ask, sync state, Sync, theme) and full-width content, max 1440.
- Phone: page title row, content, bottom tab bar (Today, Plan, Runs, Fitness, More).
- Today: the day band (what to do · readiness), where you are, this week beside why it looks like that, latest run, recovery.
- Every drawer and tab is in the URL (`?day=`, `?checkin=1`, `?ask=1`, `?tell=1`, `?races=1`, `?view=`, `?week=`, `?month=`, `?tab=body`).
