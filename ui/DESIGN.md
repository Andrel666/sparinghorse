# Design system — Swiss / data-dense

The app is a training instrument, read daily. The design gets out of the way of the numbers.

## Principles
1. **Grid, not cards.** Sections sit on a 12-column grid and are separated by hairline rules. No boxes,
   shadows or rounded panels on a page. Surfaces exist only for things that float (drawer, dialog,
   toast, menu).
2. **One signal colour.** Black and white do the work. `--signal` (international orange) means *now* or
   *look here*: today, the current week, the race, the selected item, the primary data line. Status
   colours (ok / warn / bad) appear only on the value that carries the state, never as fills.
3. **Type is the hierarchy.** One grotesk (Inter Tight for display and numbers, Inter for text), tabular
   figures everywhere. Big numbers, small labels. Labels are sentence case; the section label is the only
   small uppercase text.
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
| `--signal` | `#ff4f00` | now / selected / primary data |
| `--ok` `--warn` `--bad` | `#0d7a3d` `#a86400` `#cf1f1f` | state values |
| phases | grey ramp, peak darkest | road, calendars (the current week is signal) |

Type scale: display 56 · title 30 · heading 17 · body 15 · small 14 · label 13 (floor). Space: 4-pt steps,
section gap 40, row padding 10. Radius: 2px on controls, 0 elsewhere.

## Simplicity rule
A screen should make sense without taglines, helper text or secondary labels. If it needs them, fix the
layout. Long explanations go behind a door (a `Why` disclosure, a `More`, a source drawer), never under
every field. Every number on a page is a door to where it is decided.

## Components
| Component | Spec |
|---|---|
| Section (`Card`) | 1px `--rule` on top, label row (uppercase 12/13 label left, aside right), optional `lede` (the section's headline), content below; no box. `id` makes it an anchor that scrolls and flashes |
| Strip | the headline numbers: label, figure, one sub line, optional sparkline; **every cell is a door** (`to` or `onClick`, enforced by the type) |
| Row | the one list row: lead (date / mark) · title + sub · fixed-width number columns · trail; the whole row is the hit area |
| Tag (`Pill`) | text 13px; tone = coloured text with a 6px square before it |
| Button | primary: black fill, white text; default: 1px `--text` outline; link: underlined text; disabled = outline only |
| Tabs / Seg | tabs: text with a 2px underline; Seg: square cells, active black fill, wraps to a grid on the phone |
| Table | header muted label, hairline rows, numbers right-aligned; stacks into rows on the phone (`phone="scroll"` for wide grids) |
| Week strip | seven columns, today has a signal rule on top; a run sits on the day it was run, its planned day struck and "moved to" |
| Calendar | the one month grid for Plan and Runs: planned muted (struck when missed or moved), runs solid with the zone dot, a week column `run / planned` |
| Journey | the whole road as one bar of week cells grouped by phase: past filled, this week signal, each cell opens its week |
| Charts | headline as the section lede; y values at the left edge; today as a dashed rule; hover readout under the chart |
| Banner | 3px left rule in the tone, no fill; bold "what", then the action |
| Drawer | right panel on desktop, bottom sheet on the phone; focus trapped, Escape closes, URL state so back closes it |
| Back bar | sticky `‹ Page` at the top of a page reached through a door; a tab or sidebar click starts over |

## Layout
- Desktop: a top bar (wordmark, page links, Ask, sync state, Sync, theme) and full-width content, max 1440.
- Phone: page title row, content, bottom tab bar (Today, Plan, Runs, Fitness, More).
- Today: the day band (what to do · readiness), where you are, this week beside why it looks like that, latest run, recovery.
- Every drawer and tab is in the URL (`?day=`, `?checkin=1`, `?ask=1`, `?tell=1`, `?races=1`, `?view=`, `?week=`, `?month=`, `?tab=body`).
