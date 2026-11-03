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

## Components
| Component | Spec |
|---|---|
| Section (`Card`) | 1px `--rule` on top, label row (uppercase 12/13 label left, aside right), content below; no box |
| Stat | value in Inter Tight 700, tabular; sub in muted small |
| Tag (`Pill`) | text 13px; tone = coloured text with a 6px square before it |
| Button | primary: black fill, white text; default: 1px `--text` outline; link: underlined text; 34px tall, radius 2 |
| Tabs | text with a 2px underline on the active tab |
| Segmented choice | square cells, active cell black fill |
| Table | mono-free; header muted label, hairline rows, numbers right-aligned |
| Week strip | seven columns divided by hairlines; today has a signal rule on top; done ✓ in ok |
| Month grid | hairline grid (no gaps), date top-left, today's date in signal |
| Road | grey-ramp bars by phase, current week signal, run inside as a black bar; race marked by a signal tick and its name |
| Banner | 3px left rule in the tone, no fill |
| Toast | floating surface, 3px left rule |
| Drawer / dialog | white surface, 1px rule, no radius |

## Layout
- Desktop: a top bar (wordmark, page links, sync state, Sync, theme) and full-width content, max 1440.
- Phone: page title row, content, bottom tab bar (Today, Plan, Runs, Fitness, More).
- Every page opens with its headline numbers in one row, then the detail sections.
