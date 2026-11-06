# UX revamp: Sparing Horse new UI

Status: spec, ready to build. Source of truth for layout and primitives until merged into `DESIGN.md`.
Screens judged: http://localhost:5181 at 1440x1000 and 390x844, full page, light theme, real data
(Thu 5 Nov 2026, rest day, Tel Aviv half in 113 days).

**What the redesign is built around: the road.** Every screen is one point on a single time axis:
the past (runs) ← **today** → the race. Today is "where I am on the road", Plan is "the road ahead",
Runs is "the road behind", Fitness is "is the road getting me there". Each page's layout follows the
athlete's questions, in the order they ask them, and every number opens the data behind it.

Copy rule for all NEW strings in this spec: no em or en dashes (use `·` `,` `:` `(` `)`). Existing
server wording is cleaned in phase 7.

---

## 1. Audit (from the rendered screens)

Severity: **C** critical (wrong or blocking), **M** major (reads cheap or costs a click), **m** minor.

### Global
| # | Sev | Problem | Fix (section) |
|---|---|---|---|
| G1 | C | Phone overflow, no horizontal-scroll rule broken: `/runs` 472px (profile metric tabs), `/fitness` easy-runs table 608px, `/music` 414px, `/settings` calibration table 447px | `Table stack` on phone, profile tabs as a 3x2 `Seg` (3.3, 4.3) |
| G2 | M | Emoji as icons (🗑 Delete, ⊘ Ignore, 📓 reflection, 💬 Tell, ⚠ banners, 🏁, ⟢ ◇ posture). This, more than anything else, is what reads "AI-designed" | Remove all; `Icon` glyphs or plain words (3.4) |
| G3 | M | Summary numbers are not doors to their data: Fitness, Form and Load ratio all go to the top of `/fitness`; "1 of 3 runs done", "+13.2 km on the 7 before", "13.2 km", Plan's "113 d", "70", Runs totals, Body values: dead or vague | Door map per page (§4), `Strip` makes a door mandatory (3.3) |
| G4 | M | Uniform 40px gap between every section: no rhythm, everything weighs the same | Two-tier gaps `--gap-zone` / `--gap-group` (3.1) |
| G5 | M | Live countdown ticks seconds 112 days out ("in 112 days, 15 h 42 min 35 s · finish"): noise, and the trailing "· finish" is an unlabeled verdict | `RaceLine`: days until 48 h, then h/min, seconds only in the last hour (3.3) |
| G6 | M | Drawer is a right-side panel on phone too; no bottom sheet; on phone it hides the context you tapped from | `Drawer` becomes a bottom sheet at ≤760 (3.3) |
| G7 | M | Disabled buttons render as grey fills with white text ("Tell", "Add reading", "No changes", "Approve", "Add"): a third button style, low contrast, look broken | Disabled = outline in `--line`, text `--muted` (3.2) |
| G8 | m | HR zone colours borrow status tokens (Z3 green, Z4 amber, Z5 red): a zone-3 run reads "ok", a zone-4 run reads "warning" | `--z1..--z5` ramp, grey to signal (3.1) |
| G9 | m | Theme control is the word "Auto" underlined next to Sync: reads as a link to nowhere | Icon button "Theme" with a 3-way menu (4.0) |
| G10 | m | Pages with a narrow centered column leave 30 to 40% dead space at 1440 (Coach, Settings) | Main + rail layouts (4.7, 4.9) |

### Today
| # | Sev | Problem |
|---|---|---|
| T1 | C | **Moved run shows on the wrong day.** Week strip: Sun 1 "✓ Long 5.2 km … ↷ Mon", Mon 2 "Rest". The run happened Monday; Monday says Rest. The drawer for Sun says "done on another day (Mon)". The calendar on Runs puts it on the 2nd. Three answers to "what did I run Monday" |
| T2 | C | Phone first fold (844px) is readiness + "Recovery" + the check-in form. No week, no numbers, no next run target above the fold; the strip starts at y≈870 |
| T3 | M | No hero by state. "Good to go" is the loudest thing on the page at 56px green on a **rest day**, while the actual question ("what is next and how hard") sits at 17px in the middle column |
| T4 | M | The check-in form takes a third of the hero band every day, even after it is saved; no saved state other than a transient "Saved" |
| T5 | M | Strip cells: "Tel Aviv prediction" sub wraps to 3 lines ("goal 1:59 · 17 s under the goal · range 1:49:07–2:09:10"); "Last 7 days" wraps; the row has ragged heights |
| T6 | M | Week strip prose under it: "Pick a day for its session, targets and the run. Held by load ratio: this week's load is 1.53× …": instruction text plus a limit explanation that belongs to Plan |
| T7 | M | Coming up rows: km, target and minutes mixed inline in one text run; "~29 min" and "in 2 d ›" float against the far right edge (orphaned from the session they describe); "~47 min" misaligns with "~43 min" (no fixed column) |
| T8 | M | Latest run verdict "A bit hard for an easy run" gives no numbers (156 bpm vs ≤145 ceiling) |
| T9 | m | Recovery: HRV has no sparkline while RHR and Sleep do; values and sparks are not on one baseline |
| T10 | m | Week meter (black bar) is unlabeled and sits apart from the "This week" figure that states the same number |

### Plan
| # | Sev | Problem |
|---|---|---|
| P1 | M | Week tab shows the week twice: the 7-column strip and, directly below, the 7 session lines with the same data |
| P2 | M | Road chart has no y-axis, no km values, no hover readout on screen; current week drawn as an outlined box + orange fill + black bar inside, three treatments on one bar |
| P3 | M | "Generate plan" is the only primary (black) button on the page and sits in the header: the heaviest chrome is the rarest action |
| P4 | M | "Tell the horse" is a full-width section repeated at the bottom of every tab (Week, Month, Race day, History) |
| P5 | M | Month tab: the word "Rest" in 18 of 30 cells; no runs overlaid (the plan calendar and the runs calendar are two different grids for the same days); no week totals |
| P6 | M | Races drawer: the current race is an orange outlined box (card in a drawer) with its remove ✕ overlapping the drawer's close ✕; add-race form wraps into 4 ragged rows; goal placeholder truncated "goal (finish / 3:5" |
| P7 | m | Races tile: a lone "?" icon on its own row under the link (orphan) |
| P8 | m | "Posture and paces" duplicates the Zones table on Fitness and the zone table on Music |
| P9 | m | History: 5 charts with no y values; "Projected race-day fitness" and "The ledger" are full sections that say "Not enough history yet" |

### Runs
| # | Sev | Problem |
|---|---|---|
| R1 | M | The only way to find a run is a month calendar; November has one run, so the page is 30 empty cells. No list of runs anywhere in the app |
| R2 | M | Run stats: 6 cells then 4 (ragged), all at one weight; distance and a vertical oscillation value read equally important |
| R3 | M | Pace profile is the raw stream: spikes to the floor every few hundred metres, no y ticks, floor not pinned |
| R4 | m | Map tiles in full OSM colour with Hebrew labels compete with the route; the route is the only thing that matters |
| R5 | m | Runs week starts on Sunday here, Plan too; fine, but the calendar header says "Sun Mon …" while the strip says "Sun 1": keep one format |

### Fitness
| # | Sev | Problem |
|---|---|---|
| F1 | M | The occasional question is "am I on track for the race", and the predicted finish is not on this page |
| F2 | M | Charts are defaults: no y values on Fitness & fatigue, Weekly distance, Durability, Efficiency; no headline number; legends float centered between two dates |
| F3 | M | Easy runs (the after-run question "was the easy run easy") is buried at y≈1050 |
| F4 | m | Durability "Compare with" chips 2020 / 2025 (best) / 2026 plus two legend lines plus two footnotes: 5 lines of chrome for 8 dots |
| F5 | m | Track record: a full-width section of prose that says nothing has settled |

### Body
| # | Sev | Problem |
|---|---|---|
| B1 | M | "Heart" group holds one marker: one card on the left, 2/3 of the row empty (dead L-shaped void) |
| B2 | M | HRV, the marker Today uses for readiness, is not on Body |
| B3 | m | Reference band and ok/watch state are not visible on the current markers; "6.7 h" here vs "6h 40m" on Today (two formats for one number) |

### Coach, Music, Settings
| # | Sev | Problem |
|---|---|---|
| C1 | M | Coach: chat in a 860px centered column, nothing beside it; the coach's context (today, prediction, last run) is invisible |
| M1 | M | Music: the reference table (the ramp, 5 zones) comes before the action (next run playlist); "Spotify not connected" is grey text, not a call to act |
| M2 | m | Music coming up: two outlined buttons per row floating mid-table, target column orphaned from session |
| S1 | M | Settings: 650px centered column, help paragraphs of 4 to 6 lines under every field, the page is 3036px tall on desktop and 4264px on phone; no way to jump to a section |

---

## 2. Information architecture

### Navigation
| Desktop top bar (left → right) | Phone bottom tab bar |
|---|---|
| Wordmark · **Today · Plan · Runs · Fitness** · (hairline) · Coach · Music · Settings · spacer · sync state · Sync · Theme | Today · Plan · Runs · Fitness · More (Coach, Music, Settings) |

- Secondary links (Coach, Music, Settings) render in `--muted` after a 1px vertical `--line` divider: the four daily pages carry the weight.
- **Body moves into Fitness** as the tab "Body" (`/fitness?tab=body`). `/body` redirects there. Reason: Body is read rarely, it is about recovery and fitness, and on its own page it is a single sparse column (B1). Today's Recovery section links to it.
- Phone "More" sheet loses Body (3 items). Order: Coach, Music, Settings.

### What lives where (moves and merges)
| Content | Was | Now |
|---|---|---|
| Calendar of planned + run days | two grids: Plan → Month (planned only), Runs (runs only) | **one `CalendarCell` renderer**, used by Plan → Month (planned + runs) and Runs → Calendar (runs, with planned ghosted) |
| List of runs | none | Runs → **Log** (default tab) |
| Body markers, add a reading, injury history | `/body` | Fitness → Body tab |
| Predicted finish vs goal | Plan, Today strip | also Fitness strip, first cell (door to Plan → Race day) |
| Pace / HR zones | Plan "Posture and paces", Fitness "Zones", Music zone table | **one** Zones section on Fitness (`#zones`). Plan rail keeps a one-line paces readout that opens the same source drawer. Music keeps its cadence table (different numbers) |
| Tell the horse | full section at the bottom of every Plan tab | `HorseDrawer` (Tell mode), opened from Plan head, from the Today day drawer, and from Coach |
| Coach chat | `/coach` only | `/coach` (full page, unchanged route) + `HorseDrawer` (Ask mode) from the top bar on desktop |
| Generate plan | primary button in Plan head | in the Plan meta line ("Rebuilt Nov 3, 17:42 · Rebuild now"); promoted to primary only inside the stale-plan banner |
| Load ratio gauge | own section on Fitness | rail beside Fitness & fatigue chart; strip cell is the door |
| Week strip + session lines (Plan) | both | Plan uses `Week variant="list"` only; Today uses `variant="strip"` |

### Deep links (all URL state, so every door is linkable and back works)
| URL | Opens |
|---|---|
| `/?day=YYYY-MM-DD` | Today with the day drawer open |
| `/plan?view=week&week=YYYY-MM-DD` · `view=month&month=YYYY-MM` · `view=race` · `view=history` | Plan tab + state (replaces local state) |
| `/plan?races=1` · `/plan?tell=1` | Races drawer · Horse drawer (Tell) |
| `/runs?view=log&month=YYYY-MM` · `view=calendar` · `id=N` · `range=7d` | Runs |
| `/fitness#prediction` `#fitness-fatigue` `#load` `#easy` `#weekly` `#zones` `#durability` `#efficiency` `#track` · `/fitness?tab=body#<marker>` | Fitness section scrolled into view and flashed (see `Section` anchor) |
| `/settings?tab=athlete#week` | Settings section |

---

## 3. Design-system changes (diff against `ui/DESIGN.md`)

### 3.1 Tokens (`tokens.css`)
```diff
 Principles
-1. Grid, not cards. ...
+1. Grid, not cards. (unchanged) Plus: a page has ZONES (sized by importance, separated by --gap-zone and a
+   1px --rule) and GROUPS inside a zone (separated by --gap-group and a --line hairline). Nothing else.
 2. One signal colour. ...
+   --signal (not --signal-ink) is allowed as TEXT only at >= 24px (it is 3.1:1 on --bg). Smaller signal
+   text uses --signal-ink. Graphics (bars, ticks, lines) may use --signal at any size.
 3. Type is the hierarchy. ...
+   Hierarchy follows state: the one thing that decides today's action is the hero (see Today).
 4. Tables over chips. ...
+   No emoji anywhere. Marks are typographic (✓ ✕ + · › ↷ ○ •) or Icon glyphs.
 5. Quiet prose. ...
+6. Every number is a door. A figure, total or count opens the data it summarises (a drawer, a tab, or an
+   anchored section). A number with nothing behind it is shown as plain text, never as a figure.
```

| Token | Change | Light | Dark | Use |
|---|---|---|---|---|
| `--gap-zone` | new | `56px` | same | between page zones (replaces the uniform 40) |
| `--gap-group` | new | `24px` | same | between groups inside a zone |
| `--sp-7` | new | `56px` | same | alias of `--gap-zone` for padding |
| `--fs-hero` | new | `64px` | same | the one hero value per page (Today session or verdict). Phone: `44px` |
| `--fs-figure` | new | `32px` | same | `Strip` values (was ad hoc 34/28). Phone: `26px` |
| `--fs-display` | keep 56 | | | page-level display (Race day goal time) |
| `--z1`…`--z5` | new | `#d4d4cf` `#a3a39d` `#6a6a66` `#ff9a6b` `--signal` | `#3a3a37` `#66665f` `#9a9a94` `#c2521f` `--signal` | HR zones: grey ramp, effort heats into signal. Replaces ZONE array in `Runs.tsx` and the Profile zone strip |
| `--planned` | new | `--line` | `--line` | ghost of a planned session behind a run (bars, calendar) |
| `--focus` | new | `--signal-ink` | `--signal-ink` | 2px focus ring, offset 2px, on every interactive element |
| `--line-strong` | new | `#c9c9c4` | `#3a3a37` | meter tracks, chart axes (more than `--line`, less than `--rule`) |
| `--map-filter` | new | `grayscale(1) contrast(.92) brightness(1.04)` | `grayscale(1) invert(.92) contrast(.9)` | Leaflet tile pane; route stays `--signal` |

Contrast checks (AA): `--muted #6a6a66` on `--bg` 5.4:1 ✓; on `--surface-2` 4.9:1 ✓. `--signal-ink` 4.9:1 ✓. `--warn #a86400` 4.6:1 ✓. Dark `--muted #9a9a94` on `#0b0b0b` 7.2:1 ✓. `--z4 #ff9a6b` is never text.

### 3.2 Type and components
```diff
-Type scale: display 56 · title 30 · heading 17 · body 15 · small 14 · label 13 (floor).
+Type scale: hero 64 · display 56 · figure 32 · title 30 · heading 17 · body 15 · small 14 · label 13 (floor).
+Phone: hero 44 · figure 26 · title 24. Inter Tight for hero/figure/title and every number; Inter for text.
-Space: 4-pt steps, section gap 40, row padding 10.
+Space: 4-pt steps; zone gap 56, group gap 24, row padding 12 (rows are 44px min: touch target).
 | Button | primary ... 34px tall
+| Button | 36px desktop, 44px phone. disabled: 1px --line outline, --muted text, no fill, cursor not-allowed
+|        | One primary per view, and only for the action the page exists for (Save check-in, Send, Build).
```

### 3.3 Primitives: new, changed, removed (all in `components/`)
| Primitive | Status | File | Spec |
|---|---|---|---|
| `Section` (was `Card`) | **changed**, keep `Card` as alias until phase 7 | `ui.tsx` | Props add `id` (anchor; on hash match scroll into view and flash the top rule `--signal` for 1.2s), `lede` (one-line takeaway under the label, `--fs-heading` 600: the headline of a chart or table), `tier: "zone" \| "group"` (zone: 1px `--rule` top + `--gap-zone` before; group: 1px `--line` + `--gap-group`). `aside` stays right-aligned on the label baseline |
| `Strip` (was `Figures`) | **changed** | `ui.tsx` | `items: {k, v, s?, tone?, signal?, to?: string, onClick?: () => void, active?: boolean, label: string}`. **Every item must have `to` or `onClick`** (TS: union type; a figure without one fails type check). Renders as `<Link>`/`<button>`, hover `--surface-2`, trailing `›` in `--muted` on hover/focus. `s` clamps to 2 lines (`-webkit-line-clamp: 2`), full text in `title`. Cell count must fill rows: desktop one row; phone 2 columns, so counts are 2, 4 or 6 (lint: dev warning on odd count ≥3). `aria-label` = `${k}: ${v}. ${s}. Open` |
| `Row` | **new**, the one row | `ui.tsx` | Grid: `lead` (date or mark, 7ch) · `main` (title + sub, 1fr) · `cols[]` (right-aligned tabular cells, each a fixed `ch` width given by the caller so columns align down the list) · `trail` (`›` or actions). Clickable when `onClick`/`to` (whole row is the hit area, 44px min). Phone: `cols` wrap under `main` as a muted `·` run, `trail` stays right. Replaces `.sline`, `SessionLine`, `Coming`, Music coming-up rows, Runs log rows, easy-run rows on phone |
| `Table` | **changed** | `ui.tsx` | Add `phone?: "stack" \| "scroll"` (default `"stack"`). Stack at ≤760: each row renders as a `Row` (first column = `main`, `num` columns = `cols`, the rest as `k v` sub-lines). `"scroll"` only for the Durability table and Calibration table, with a visible fade edge and the first column sticky. Add `emph?: string` (column head) for the one column that matters: 600 weight |
| `KV` (was `ListItem`) | **changed** | `ui.tsx` | Label column `minmax(9ch, 14ch)`, value starts 12px after, never pushed to the container edge. Optional `to`. Hairline between rows |
| `Week` | **changed** | `Week.tsx` | `variant: "strip" \| "list"`. Strip (Today): 7 columns; cell = dow + date, planned title + km, target (`--fs-label`, signal-ink), then actual `km · pace · bpm` with easy mark (`✓` ok / `!` warn). Phone strip: dow letter + date, then a single value (`5.2` with ✓/✕/○), no words. List (Plan): 7 `Row`s. Uses new day fields (§4.1 data). Moved runs: on the day it ran, actual + `↷ from Sun`; on the planned day, title struck in `--muted` + `moved to Mon` |
| `CalendarCell` | **new** | `layout.tsx` | One cell renderer for `MonthGrid`, used by Plan → Month and Runs → Calendar. Top-left date; planned line (`Easy 4.3`, 600, or struck when missed; nothing on rest days); runs: zone dot `--z{n}` + km, `+N` past 2; other-sport `·`. `MonthGrid` gains an optional 8th column `weekTotal(weekStart) → {planned, ran}` shown as `ran / planned km` |
| `ChartFrame` | **new** | `charts.tsx` | Wraps every chart: `headline` (figure size value + label, top-left), `legend` (inline row: swatch · label · current value, left-aligned under headline, never centered between axis dates), y-axis min/max + 1 mid tick at left in `--fs-label` `--muted`, x labels at ends formatted `Nov 2026` / `Feb 26`, `today` rule (1px `--text`, dashed, label "today"), `yFloor` prop (pinned, never auto), hover readout row under the chart (`date · v1 · v2 …`, tabular) so the readout never covers data. Gridlines `--line`, data `--text` / `--signal` |
| `RaceLine` | **new** (replaces `Countdown` in heads) | `Countdown.tsx` | `Tel Aviv half · Fri 26 Feb · 113 days · predicted 1:58:43, goal 1:59` as one line; the prediction toned by `race_call`. Whole line is a door → `/plan?view=race`. Time text: ≥ 48 h `113 days`; < 48 h `31 h 12 min`; < 1 h `42 min 10 s`; past gun `Race day`. Gun-zone suffix kept when it differs |
| `Drawer` | **changed** | `layout.tsx` | ≤760: bottom sheet, `max-height: 88dvh`, 4×36px grab bar, sticky header, body scrolls, swipe down or Escape closes. Desktop: right panel 480px (was full height variable). Focus trap, return focus to opener, `aria-labelledby` the header. Close button uses `Icon name="close"` with label "Close" |
| `HorseDrawer` | **new** | `components/Horse.tsx` | A `Drawer` with `Tabs` Ask / Tell. Ask = the Coach chat component (moved from `Coach.tsx` into `components/Chat.tsx`). Tell = `TellTheHorse` (moved from `plan/Adjust.tsx`). Opened by `?tell=1` / `?ask=1` |
| `Seg` | **changed** (was `.seg` class) | `ui.tsx` | Component: `options`, `value`, `onChange`, `label`. `wrap` prop: at ≤760 lays out as a grid of `cols` (profile metrics: 3x2) instead of overflowing |
| `Mark` | **new** | `ui.tsx` | The typographic state marks (✓ done ok, ✕ missed bad, ○ ahead muted, • today signal-ink, + extra, ↷ moved, ! easy-run too hard warn) with `aria-label`. Replaces `MARK` maps in `Week.tsx` and `Plan.tsx` |
| `Icon` | **changed** | `Icon.tsx` | Add `close`, `trash`, `hide` (ignore), `note`, `chat`, `theme`, `alert`, `chevron`. 16px, 1.5px stroke, `currentColor` |
| `Pill` | keep | | Square marker 6px. Not for buttons |
| `Banner` | keep | | Copy rule: first a bold "what", then the action button right |
| `.hero` grid | **removed** | `base.css` | Replaced by the Today `DayBand` zone (§4.1) |
| `Figures`, `ListItem`, `.sline`, `.coming`, `MARK` maps, `ZONE` array, inline `style={{ fontSize … }}` in pages | **removed** after migration | | Pages may not set font sizes, colours or spacing inline; use primitive props or a class from `base.css` |

### 3.4 Copy and glyph replacements
| Was | Now |
|---|---|
| `🗑 Delete` | `Icon trash` + "Delete" |
| `⊘ Ignore` / `⊘ ignored` | "Ignore" / `Pill` "Ignored" |
| `📓 {reflection}` | `Icon note` + reflection, `--muted` |
| `💬 Tell` | "Tell" |
| `⚠ Plan halted` | `Banner tone="bad"` bold "Plan halted." |
| `⟢ Assertive build` / `◇` | "Assertive build" / "Conservative build" |
| `race day 🏁` | "Race day" |
| "+ Why" | "Why ›" (disclosure, `aria-expanded`) |

---

## 4. Pages

Data source notation: `today.x` = existing field of `/api/ui/today` (`sh_ui_api.today_page`); **NEW** = add to
`sh_ui_api.py` (the server decides and words; the client draws).

### 4.0 Shell (all pages)
| Zone | Element | Primitive | Data | Click |
|---|---|---|---|---|
| Top bar (desktop) | Wordmark | text | | `/` |
| | Primary links Today Plan Runs Fitness | `NavLink` | `PAGES` (add `group: "primary" \| "secondary"`) | route |
| | Secondary links Coach Music Settings, muted, after divider | `NavLink` | `PAGES` | route |
| | Sync state "synced 43 h ago" (warn when stale) | text | `shell.sync_hours`, `stale` | opens Settings → Console `#status` |
| | Sync | `Button` default (not primary: it is not the page's action) | | POST `/api/sync`, toast |
| | Ask the horse | `Button` link + `Icon chat` | | `HorseDrawer` Ask |
| | Theme | icon button, menu Auto / Light / Dark | localStorage | |
| Phone top | page title (24px) left, sync state + Sync icon button right on one row | | | |
| Phone tab bar | 5 tabs, 56px + safe area, active = `--text` + 2px top rule `--signal` | `NavLink` | | |
| Footer | unchanged | | | |

### 4.1 Today: "what do I run, how hard, am I OK"
Questions in order: (1) what is today, how hard; (2) am I OK to; (3) check in; (4) how is the week; (5) how did the last run go; (6) what is next; (7) how did I recover.

**State-driven hero** (`DayBand`, a page zone, not a card):
| State (from server) | Hero (left, `--fs-hero`) | Second (verdict) |
|---|---|---|
| run day, verdict green | the session: `Easy run 4.3 km` + target `≤ 145 bpm` at title size, signal-ink | verdict word at title size, toned, one line |
| run day, verdict amber/red, or `halt` | the verdict: `Go easier` / `Hold off` at hero size, toned, + action sentence | the session at heading size, struck when red |
| rest day | small-caps `Rest day` then the NEXT run as hero: `Saturday · Easy run 4.3 km + strides`, target | verdict worded for the next run (NEW `readiness.for_label`: "Ready for Saturday's easy run") |
| pre / post / none | the state title (`Training starts Nov 9` / `Road complete` / `No plan yet`) | action button (`Add a race` → `/plan?races=1`; `Build the next plan` → `/plan`) |

Desktop layout (12 col, `--content-max` 1440):
```
PageHead  Today                                   Thu 5 Nov · Base week 1 of 16 · [RaceLine ............]
──────────────────────────────────────────────────────────────────────────────────────────── (2px rule)
ZONE A  DayBand
 span 7: HERO                                   | span 5: VERDICT (top) + CHECK-IN (below, hairline)
   REST DAY                                     |   Good to go                    (title 30, ok)
   Saturday · in 2 days                         |   Ready for Saturday's easy run. Why ›
   Easy run 4.3 km + strides   (hero 64)        |   ─────────────────────────
   ≤ 145 bpm · about 29 min · 6:45/km easy      |   Legs  [Fresh|OK|Heavy]  Sleep [Well|OK|Poorly]
   Why this session ›                           |   + Note    [ ] Had to stop, chest pain, dizziness or faintness
                                                |   [Save check-in]
ZONE B  Strip (6): This week | Last 7 days | Fitness | Form | Load ratio | Tel Aviv prediction
ZONE C  span 8: THIS WEEK (Week strip)          | span 4: LATEST RUN
ZONE D  span 8: COMING UP (Rows)                | span 4: RECOVERY
```
Phone order (390): PageHead (title + RaceLine wraps to 1 line under title: `Tel Aviv · 113 days · 1:58:43`), DayBand hero, verdict line, check-in (compact), Week strip, Strip (2x3), Latest run, Coming up, Recovery. **First fold must show hero + verdict + check-in row 1** (verify on render; check-in compact rows are 44px).

| Zone | Element | Primitive | Data | Click opens |
|---|---|---|---|---|
| Head | Dateline `Thu 5 Nov · Base week 1 of 16` | `PageHead.aside` | NEW `today.dateline` (server words phase + week of total) | `/plan?view=week` |
| | RaceLine | `RaceLine` | `today.race` + NEW `today.race.pred` `{hms, tone, words}` (reuse `race_call`) | `/plan?view=race` |
| | Halt banner | `Banner bad` | `readiness.halt` | "What to do" → Why disclosure |
| A hero | session title + km + strides | text `--fs-hero` | `session.title/km`, `next.*` on rest | the day drawer (`?day=`) |
| | target | `.target` title size | `session.target.text`, `hint` as `title` | Fitness `#zones` |
| | minutes · pace | muted | `session.minutes`, NEW `session.pace_text` ("6:45/km easy") | |
| | steps | `Steps` | `session.steps` | |
| | done line | `Mark ✓` + text | `session.done/actual` | the run `/runs?id=` (NEW `session.activity_id`) |
| | Why this session › | disclosure | `session.why`, component | |
| A verdict | verdict word | text title, toned | `readiness.headline`, `verdict` | Why disclosure |
| | for line | muted | NEW `readiness.for_label` | |
| | Why list | `ul` | `reasons`, `hrv_line`, `ai_line` | |
| A check-in | Legs / Sleep | `Seg` ×2 on one row desktop, two rows phone | `readiness.checkin` | |
| | Note, stop symptom | `linkish`, checkbox (always visible: safety) | | |
| | Save | `Button primary` | POST `/api/checkin` | |
| | **Saved state** | one line: `Checked in 07:12 · legs fresh · slept well · Edit` | NEW `readiness.checkin.saved_at` | Edit re-opens the form |
| B | Strip 6 cells | `Strip` | `today.glance[]` with NEW per-item `to` (below) and shortened `s` (server: max ~40 chars, e.g. `goal 1:59 · 17 s under`) | see door map |
| C | This week label + lede `6.2 of 14.8 km · 1 of 3 runs` | `Section lede` | `week.km_done/km/runs_*` | `/plan?view=week` |
| | meter, under the lede, full width of the strip | `.meter` labeled | same | |
| | Week strip | `Week variant="strip"` | `week.days[]` + NEW fields (below) | day drawer |
| | Held line: `Held by the load ratio · why ›` (one line) | muted | `week.held.text` shortened: NEW `week.held.short` | `/plan?view=week#limits` |
| C rail | Latest run label `Latest run · Mon 2 Nov` | `Section` | `latest_run` | |
| | verdict lead `A bit hard for an easy run: 156 bpm against ≤ 145` | `Pill warn` + text | NEW `latest_run.verdict_line` | Fitness `#easy` |
| | KV: Distance, Time, Pace, Heart rate, Load (, TE, Recovery) | `KV` | `latest_run.*` | each `KV` row → `/runs?id=` |
| | Open the run › | `linkish` | | `/runs?id=` |
| D | Coming up | `Row` ×5: lead `Sat 7` · main `Easy run` + sub `+ 2 strides` · cols `4.3 km` (7ch) · `≤ 145 bpm` (10ch) · `~29 min` (7ch) · `in 2 d` (6ch) · `›` | `today.coming[]` | day drawer (`?day=`) |
| | footer link `The whole road ›` | `linkish` | | `/plan?view=month` |
| D rail | Recovery rows HRV, Resting HR, Sleep: label · value (figure 26) · sub · spark, value and spark share a baseline; HRV gets a spark | `Row` with spark col | `today.recovery[]` + NEW HRV `series` | `/fitness?tab=body#<key>` |

Day drawer (`?day=`): title `Sunday 1 November`; `DayDetail` per session; then for today only the check-in summary; then `Something off? Tell the horse ›` (`HorseDrawer` Tell, prefilled date); `See the week on Plan ›`.

**Strip door map (`glance[].to`, NEW values from `today_glance`)**
| Cell | to |
|---|---|
| This week | `/plan?view=week` |
| Last 7 days | `/runs?view=log&range=7d` |
| Fitness | `/fitness#fitness-fatigue` |
| Form | `/fitness#fitness-fatigue` (readout pinned to today) |
| Load ratio | `/fitness#load` |
| Race prediction | `/plan?view=race` |

**NEW day fields in `_week_days`** (fixes T1): per day `runs: [{activity_id, km, pace, hr, z, verdict}]` = runs **dated that day** (planned or not); `moved_from: "Sun"` on the day a moved run landed; keep `moved_to` on the origin day with `status: "moved"`; `target_short: "≤ 145"`. The client never infers a date: the strip renders `runs` where they ran.

States
| State | Render |
|---|---|
| loading | skeleton: DayBand with 3 grey bars (`--surface-2`, 64/30/17px tall), Strip 6 empty cells, no spinners |
| error | `Query` error: "Couldn't load today. The server didn't answer." + `Retry` |
| no week (no plan) | Zone C shows `Section` lede "No plan covers this week." + `Add a race` |
| no runs ever | Latest run: "No runs yet. Sync brings them from Runalyze." + `Sync` |
| no recovery data | "No overnight data yet. HRV, resting HR and sleep arrive with the watch sync." |
| check-in save error | inline under Save, `--bad`: "Not saved: {message}. Try again." |

Microcopy
```
Rest day
Ready for Saturday's easy run.
Checked in 07:12 · legs fresh · slept well · Edit
Held by the load ratio · why ›
A bit hard for an easy run: 156 bpm against ≤ 145
The whole road ›
Something off? Tell the horse ›
```

### 4.2 Plan: "the road ahead, and why it looks this way"
Desktop:
```
PageHead  Plan        Tel Aviv half · Fri 26 Feb 2027 · 16 weeks        [Races] [Tell the horse]
Banners (stale plan, re-planned changes, active adjustment)
ZONE A  Strip (4): Race in 113 days | Predicted 1:58:43 | Race-day fitness 70 | This week 14.8 km
ZONE B  span 8: THE ROAD (ChartFrame)                    | span 4: RACES rail (tile) + Posture + Paces
ZONE C  Tabs: Week · Month · Race day · History  (tabs sit on the zone rule, left)
        tab content
Meta line: Rebuilt Tue 3 Nov, 17:42 · Rebuild now
```
| Zone | Element | Primitive | Data | Click |
|---|---|---|---|---|
| Head | Races | `Button` | | `?races=1` |
| | Tell the horse | `Button primary` | | `HorseDrawer` Tell (`?tell=1`) |
| A | Race in 113 days · `16 weeks to go` | `Strip` | `plan.header` | `?races=1` |
| | Predicted 1:58:43 · `goal 1:59 · 17 s under` (toned) | `Strip` signal | existing | `?view=race` |
| | Race-day fitness 70 · `CTL · verdict: finish` | `Strip` | existing | `?view=history` |
| | This week 14.8 km · `6.2 km run so far` | `Strip` | existing | `?view=week` (scroll `#week`) |
| B | Road | `ChartFrame` + `Road` | `plan.road`, `phases` | bar → selects week, switches to Week tab |
| | headline: `Peak 31 km · week of Jan 24` | ChartFrame headline | NEW `plan.road_headline` | |
| | y ticks 0 / max km; current week = signal fill only (drop the outline box); run = `--text` inner bar; planned beyond today = phase grey; hover readout `Week of Nov 1 · 14.8 km planned · 6.2 run · Base 1` | | | |
| B rail | Races tile | `RacesTile` (fix: "?" moves inline after "Why this range ›") | existing | tile → `?races=1`; "Why this range" → source drawer |
| | Posture: `Assertive build · riding the full load ceiling` | `KV`, no button chrome | `header.posture` | source drawer `posture` |
| | Paces one line: `Easy 6:53 · LT1 6:21 · HM 5:38 · T 5:29 · I 4:58 /km` | text tabular | `plan.paces` | source drawer `paces` |
| Meta | `Rebuilt Tue 3 Nov, 17:42 · Rebuild now` | muted + `linkish` | `header.generated_at` | POST generate (confirm only if the plan changed in the last hour) |

**Week tab** (`#week`): span 8 main, span 4 rail.
| Element | Primitive | Data | Click |
|---|---|---|---|
| Label `This week · Base week 1` + `‹ ›` | `Section` aside | `week.status/phase_name/n/prev/next` | week nav (`?week=`) |
| Lede `Nov 1 to 7 · 14.8 km · 3 runs · 6.2 run, 8.6 ahead` | `Section lede` | existing | |
| Sub: `Fitness at week end CTL 18.3 · load ratio → 1.67 ?` | muted | existing | `?` Help |
| Flags + deload offer (retire it · keep it) | `Pill` + `linkish` | `week.flags`, `deload` | |
| 7 day rows | `Week variant="list"` (`Row`: lead `Mark` + `Sun 1` · main title + km, sub actual `6.2 km · 6:37/km · 156 bpm` + `↷ ran Mon` + reflection with `Icon note` · cols target, component chip · trail `›`) | `week.sessions` + days | done row → `/runs?id=`; else day drawer |
| Intent line | muted | `week.intent` | |
| Rail: Why this week looks like this (`#limits`) | `Section` + limit rows (existing `.limit` meters, now `--line-strong` track, over = `--bad` fill) | `week.limits` | row → `LimitSource` drawer |

**Month tab**: `MonthGrid` + `CalendarCell` + week-total column. Data: `usePlanCalendar` + NEW per date `runs: [{id, km, z}]` and NEW `weeks: [{start, planned_km, ran_km}]` from the plan calendar endpoint. Cell click → day drawer. Phone: cells show date + km number only (`4.3`, ✓/✕ marks), week column hidden, a `Row` list of the selected week appears under the grid.

**Race day tab**: unchanged content; fixes: segment table uses `Table emph="Pace"`, no wrapping in "Goal pace" (min col 12ch), split times as a `Row` of 5 cols; rail "Against your history" `KV`; "Try another target" input + `Try` button.

**History tab**: every chart through `ChartFrame` with y ticks and a headline (`Original → now: 14 km behind`, NEW `drift.headlines[chart]`); sections with no data collapse to one `KV` line in a final group "Waiting for data": `Projected race-day fitness · after the next re-plan`, `The ledger · after the next re-plan`.

**Races drawer** (fix P6): each race is a group (no box): name + `current` `Pill`, then a 2-col form grid: Priority `Seg` A/B/C · Date · Gun time · Zone. Remove = `linkish` "Remove race" at the group foot (confirm with consequences), never an ✕ next to the drawer close. Add a race: Name (full) / Distance `select` + Date / Gun time + Zone / Priority + Goal (placeholder `e.g. 1:59`) / `Add race` primary. Past results list below.

States: no plan → Strip hidden, Road replaced with Banner "No plan yet. Add a race and build the road." + `Add a race`; generating → `Rebuild now` reads "Rebuilding…", Road dims to 40%; error → toast + meta line "Rebuild failed: {msg}".

Microcopy
```
Rebuilt Tue 3 Nov, 17:42 · Rebuild now
Peak 31 km · week of Jan 24
Remove race
Waiting for data
```

### 4.3 Runs: "how did it go"
Desktop: span 5 left (Log or Calendar) + span 7 right (the run, `position: sticky; top: 72px`).
```
PageHead  Runs                                            [Log | Calendar]
span 5: Strip (2): November 1 run · 6.2 km  | 12 months 62 runs · 420 km
        Week groups: "Week of Nov 1 · 6.2 km"  Rows...            | span 7: THE RUN
        Totals table (Month / 12 mo / All time)                    |
```
| Zone | Element | Primitive | Data | Click |
|---|---|---|---|---|
| Head | Log / Calendar | `Seg` | `?view=` | |
| Left | Month nav `‹ November 2026 ›` | `MonthGrid` header (shared) | `m.month/first/last` | month |
| | Strip 2 cells (month, 12 months) | `Strip` | `m.stats`, `m.stats12` | scroll to Totals table |
| | Log rows grouped by week (group header `Week of Nov 1 · 6.2 km · 1 run`) | `Row`: lead `Mon 2` · main read-back kind `Easy run` + sub `18:01 · Tel Aviv` · cols `6.2 km` `6:38` `156 bpm` · trail zone dot `--z` | NEW in runs month endpoint per run: `kind`, `hr`, `min`, `verdict`, `time`; NEW `weeks[]` subtotals | selects run (`?id=`); phone: navigates to run view |
| | Calendar view | `MonthGrid` + `CalendarCell` (planned ghosted) + legend `Z1…Z5 · · other sport` | existing + NEW planned per date | day: 1 run → select; >1 → picker `Row`s |
| | Totals table | `Table` (Month, 12 mo, All time), `emph="Month"` | existing | |
| Right | Label `Monday 2 Nov · 18:01 · Running · Tel Aviv-Yafo` + aside `Ignore` `Delete` (`Icon`) | `Section` | `run.*` | Ignore toggles; Delete confirms |
| | Split-recording `Pill` | | `run.split` | |
| | Hero stats (4): Distance 6.16 km · Time 40:49 · Pace 6:38/km · Avg HR 156 | `Strip` (doors: Pace/HR → profile tab of that metric) | `run.stats` (NEW `primary: true` flag on 4 stats) | sets profile metric |
| | Secondary stats (6, `KV` grid 3x2): Max HR, Cadence, Climb, Load, Ground contact, Vert. oscillation | `KV` | `run.stats` | Cadence/GCT/VO → profile tab |
| | Read back + verdict: `Easy run · 41 min at 6:37/km` + `Pill warn` `A bit hard for an easy run: 156 bpm against ≤ 145` | text + `Pill` | `readback`, NEW `verdict_line` | `Fitness #easy` |
| | Profile | `Seg wrap cols=3` + `ChartFrame` (y ticks, pace inverted, `yFloor` pinned at slowest p95, HR-zone strip in `--z*`, avg HR line, readout row) | `/api/activity/<id>/profile`, NEW `smooth` series (30 s rolling median, server-side) | hover preview, click lock (existing) |
| | Map | `RunMap`, tiles `filter: var(--map-filter)`, route `--signal` 3px, start/end dots | existing | |

Phone: Log is the page; tapping a row pushes `/runs?id=` which renders the run full-width with a `‹ Runs` back link at top (the list is not shown). Profile `Seg` 3x2.
States: no runs in month → "No runs in November. ‹ October had 4." (NEW `m.prev_count`); loading run → skeleton strip; run 404 (deleted) → "This run is gone. Pick another." Ignored → `Pill` "Ignored" + `Undo`.

### 4.4 Fitness: "am I on track"
Tabs in head: `Fitness · Body`.
```
Strip (6): Predicted 1:58:43 | VO2max 37.7 | Fitness 14.9 | Fatigue 17.2 | Form -2.3 | Load ratio 1.94
span 8: FITNESS & FATIGUE (ChartFrame)               | span 4: LOAD (gauge, words, model check)
span 12: EASY RUNS (lede 0 of 3 easy enough)
span 8: WEEKLY DISTANCE (ChartFrame)                 | span 4: ZONES (#zones)
span 6: DURABILITY                                   | span 6: EFFICIENCY
span 12: TRACK RECORD (collapses to one line when empty)
```
| Element | Primitive | Data | Click |
|---|---|---|---|
| Strip cells with sparklines (existing tile sparks move inside the cell, 28px tall, under `s`) | `Strip` + `Spark` | `fitness.tiles` + NEW tile `prediction` (from plan feasibility) and `load` | Predicted → `/plan?view=race`; VO2max, Fitness, Fatigue, Form → `#fitness-fatigue` with that series emphasised; Load → `#load` |
| Fitness & fatigue (`#fitness-fatigue`) headline `Fitness 15 now → 70 planned on race day` | `ChartFrame` | existing series + NEW `ff_headline` | hover readout: date · fitness · fatigue · form · load ratio |
| | model check line, duplicate heads-up | muted | existing | duplicate → Today banner action |
| Load (`#load`) | `Section group` + meter | existing | |
| Easy runs (`#easy`) lede `0 of 3 easy enough · judged by heart rate ≤ 145 bpm` (warn) | `Section lede` + `Table emph="Avg HR"` (phone stack) | `fitness.easy` | row → `/runs?id=` (NEW `runs[].id`) |
| | LT1 line, detrained line, field-test offer | muted `KV` | existing | field test → Settings `#lthr` |
| Weekly distance (`#weekly`) headline `This week 6.2 km · peak 52 km (Mar 2024)` | `ChartFrame` (scroll back kept, y ticks) | `weekly` + NEW `weekly_headline` | bar → `/runs?view=log&month=` |
| Zones (`#zones`) | `Table` Zone · Pace · HR | existing | anchors line → source drawer |
| Durability (`#durability`) lede = existing `2027 · now: 0 long runs this build, the line needs 4` | `ChartFrame` + Chart/Table `Seg` + compare `Seg` | existing | point → run |
| | legend + footnotes merged into ONE muted line | | | |
| Efficiency (`#efficiency`) headline `+11% a month · 10 aerobic runs` | `ChartFrame` + temp panel | existing | point → run |
| Track record (`#track`) | when `track.empty`: one `KV` line `Track record · first forecast scores on 1 Dec` (NEW `track.next_settle`); else existing | | |

**Body tab** (was `/body`): one 3-column grid of marker sections, ordered HRV, Resting HR, Sleep, Deep sleep, REM sleep, Weight, then labs; group names become a small-caps label at the top of the first marker of each group (no group header rows, so no ragged rows). Each marker: label, value figure 32 + unit + `Pill ok/watch · range`, `ChartFrame` 120px with reference band, `6m / 1y / All` `Seg` (saved), sub line. Values use one format per marker from the server (NEW `marker.display`, e.g. sleep `6h 40m` everywhere, Today included). Then span 12 group: Add a reading (one row form) and Injury history (`KV`, link to Settings `#injuries`). Stopped-data banner on top. NEW: HRV marker in `body_page` (series from the HRV table Today already reads).
States: no readings → "No health readings yet. Sync brings resting HR and sleep; add lab values below."

### 4.5 Coach (`/coach`) and HorseDrawer
Desktop: span 8 chat + span 4 rail. Phone: chat only, composer fixed above the tab bar.
| Element | Primitive | Data | Click |
|---|---|---|---|
| Messages: user = right-aligned, `--signal` 3px right rule; coach = left 3px `--rule` rule; full span-8 width (no max-w) | `Chat` | existing | |
| Suggestions (empty chat) | `Row` list | existing | fills composer |
| Composer: textarea + `Send` primary, Enter sends, Shift+Enter newline | `Chat` | | |
| Head aside: `Clear` (`linkish`, confirm) | | | |
| Rail: "What the coach sees" = `Strip` vertical (Today session, Readiness, Prediction, Latest run) | `Strip` 1-col | reuse `useToday()` | each → its page |
| Rail: `Tell the horse instead ›` (changes the plan, not a chat) | `linkish` | | `HorseDrawer` Tell |
States: AI off → "The coach is off. Turn it on in Settings, AI." + link; no key → "Add an AI key in Settings to chat." ; sending → "Thinking…" row; error → message row in `--bad` + Retry.

### 4.6 Music
Order by action: Next run → Coming up → Last run read back → The ramp (reference) → (tab) Music settings.
| Element | Primitive | Data | Click |
|---|---|---|---|
| Not connected banner `Spotify isn't connected. Playlists need it.` + `Connect Spotify` | `Banner` | existing status | Music settings tab |
| Next run: span 7 `Sat 7 Nov · Easy run 4.3 km` (title) + `29 min · 6:45/km`; span 5 target `164 spm` (hero) + basis; actions `Preview the songs` (default) `Build the playlist` (primary) | zone | existing | |
| Coming up | `Row`: lead day · main session · cols `165 spm` · trail `Preview` (`linkish`) `Build` (`Button`) | existing | |
| Last run read back | `Section` + `select` + `Read back` | existing | |
| The ramp | `Section` + `Table phone="stack"` | existing | |

### 4.7 Settings
Desktop: span 3 sticky section index (Athlete, Week, Display, Away, Calibrate, Keys, Suunto, COROS, Access, Status, Backup) + span 9 content. Tabs Athlete / Connections / Console stay in head (index lists the current tab's sections). Phone: no index; tabs only.
| Element | Primitive | Data |
|---|---|---|
| Field row: span 4 label + source tag (`saved here` / `default`) · span 8 input then `help_short` (one sentence), `More ›` disclosure for the full help | `KV`-style row | NEW `fields[].help_short` (server: first sentence) |
| Per-field error under input, `--bad`, `aria-describedby` | | existing |
| Save bar: sticky at the bottom of the content column when dirty: `3 changes · Save` primary / `Discard` | | |
| Calibration table | `Table phone="scroll"` with sticky first column | existing |
| Away days | `Row`s + one-row add form | existing |

### 4.8 Accessibility (all pages)
- Focus ring `2px var(--focus)`, offset 2px, on links, buttons, `Row`, `Strip` cells, day cells, road bars.
- Tab order follows the zone order above; `DayBand` order: hero → verdict → check-in.
- `Week` strip: `role="group"`, each day a button labelled `Sunday 1: long run 5.2 km planned, moved to Monday. Open`.
- Charts: `role="img"` with `aria-label` = the `ChartFrame` headline; the readout row is `aria-live="polite"`.
- Touch targets 44px on phone; `Seg` cells 44px tall on phone.
- Light and dark: every new token defined in both; verify Road, `--z*` and map filter in dark.

---

## 5. Implementation order
Each phase ships alone; check it on the rendered page at 1440 and 390, light and dark, before the next.

| Phase | Scope | Why this order | Done when |
|---|---|---|---|
| **1. Foundations** | tokens (§3.1); disabled button style; `Icon` additions + remove all emoji (§3.4); `Table phone="stack"`; `Seg` component with `wrap`; `Drawer` bottom sheet + focus trap; `Section` `id`/flash + `lede` + `tier` | unblocks everything; fixes G1, G2, G6, G7 at once (low risk, high perceived quality) | `scrollWidth == 390` on all 8 routes; no emoji in `ui/src` (`grep -P "[\x{1F300}-\x{1FAFF}]"` empty) |
| **2. Server truth for days** | `_week_days` `runs`/`moved_from`/`target_short`; `today.dateline`, `race.pred`, `readiness.for_label`, `checkin.saved_at`, `latest_run.verdict_line`, `glance[].to` + short `s`, `week.held.short`, recovery HRV series | the riskiest change (T1 is wrong data) and Today depends on it; server-only, testable with `sh_ui_api` tests | a moved run shows on the day it ran in API output; tests pass |
| **3. Today** | `DayBand` state-driven hero; check-in saved state; `Strip` (doors mandatory); `Week variant="strip"` incl. phone single-value cells; `Row` + Coming up columns; Latest run lead; Recovery baseline; `RaceLine`; `?day=` URL | most-used page; biggest felt change | phone first fold shows hero + verdict + check-in; every number clicks somewhere |
| **4. Plan** | head actions; Tell the horse → `HorseDrawer` (Tell); Generate → meta line; Week tab `variant="list"` (drop the strip); `ChartFrame` + Road axes; Races drawer form; URL state | second most used; removes duplication P1, P3, P4 | Week shown once; `?view=&week=` back/forward works |
| **5. One calendar + Runs** | `CalendarCell` + week-total column; plan calendar NEW `runs`/`weeks`; runs month NEW per-run `kind/hr/min/verdict/time` + `weeks`; Runs Log tab; run detail hero/secondary stats; profile smoothing + ChartFrame; map filter | merges two grids; adds the missing run list | Plan Month shows runs; Runs Log lists every run of the month grouped by week |
| **6. Fitness + Body tab** | Strip with prediction + load; `ChartFrame` on all charts; reorder; Easy runs up; track-record collapse; Body as tab, HRV marker, `marker.display`; `/body` redirect | occasional page; chart craft | every chart has a headline and y ticks |
| **7. Coach, Music, Settings, cleanup** | Coach rail + `Chat` extraction + Ask in `HorseDrawer` + top-bar button; Music reorder + banner; Settings index + `help_short` + sticky save bar; remove `Card`/`Figures`/`ListItem` aliases, `.sline`, `.hero`, inline styles; em-dash cleanup in `sh_ui_api.py` wording; update `DESIGN.md` and `PARITY.md` rows that moved (Body → Fitness tab, Tell → drawer, calendars merged) | rare pages and debt last | `PARITY.md` every row still ✅ with its new location |

Self-review: strongest part is the state-driven Today hero plus the server fix for moved runs (correct data, one glance answers "what, how hard, am I OK"). Weakest part is the phone Week strip reduced to single numbers: dense and honest, but needs a check on the rendered 390 screen that it still reads as a week and not a row of digits; if it doesn't, add the dow letter in signal for today and a planned/ran two-line cell.
