# The four lenses: Now, Road, Goal, Log

Status: built in `feat/four-lenses` (the app-designer skill, phases 1–6). The owner approved the direction (Phase 2)
and asked for the whole design to be implemented in one go; the choices marked *(recommended)* in Phase 2 are the
ones built. The new UI only; Classic (`static/`) is kept as the fork started (#25).

## 1. Core

**Purpose.** The app exists so the athlete **finishes the plan and meets the goal**. Two moments matter most:
**plan and improve** (web, weekly) and **review the run just finished** (phone, minutes after the sync).

**Core experience idea: a race contract with a ledger.** The goal is the contract; the plan is the road to it;
every run is a step that gets settled against the goal (on track, ahead, behind) and ends in what to do next.
Every screen answers first: *am I on track to my goal, and what is the next thing I do about it?*

**Principles (each a test on the rendered screen).**
1. **Goal-anchored**: the race, its date and target, and the distance to it, are visible or one tap away.
2. **Settled**: after a run, the screen says what it did to the goal, not only what it was.
3. **Next step**: a screen ends in one action, not a dashboard.
4. **Honest**: a number shows its range or its source, and says what the data does not know.
5. **Held**: nothing on the screen could go with no loss.

Plus the system's standing rules (`ui/DESIGN.md`): every number is a door, one accent means *now*, grid not cards,
two weights, a state is a mark only when it needs attention.

**Voice.** Plain, second person, numbers first; no exclamation marks, greetings or guilt. A run that missed what was
asked says so without blame and says what it changes.

## 2. Architecture

### The shape: one spine (the road), four lenses on it

| Lens | Route | Its one job | Absorbs |
|---|---|---|---|
| **Now** | `/` | today's session, should I, how hard; the **debrief** of the last run (at the top on the day it lands) | Today, check-in |
| **Road** | `/road` | the plan as a line to race day: weeks, a month, race day; open any day | Plan (Week, Month, Race day) |
| **Goal** | `/goal` | am I on track, what can I improve (ranked levers), what holds me back, the plan vs its original road | Plan → History, vs-original, endurance, the deep Fitness and Body pages behind doors |
| **Log** | `/log` | every run, each opened as a **debrief** | Runs |

*Ask* (the coach) is a button on every page. Coach, Music and Settings sit under **You** (the phone's fifth tab,
the right end of the desktop bar). Old addresses redirect (`/plan` → `/road`, `/runs` → `/log`,
`/plan?view=history` → `/goal#history`), so every existing door keeps working. Fitness and Body stay as deeper
pages behind Goal (the Goal tab stays lit on them).

### The questions, per moment, in the order the mind asks them

| Moment | Questions |
|---|---|
| Morning (phone) | what do I run, should I · how hard · why this · am I on track |
| **Run just finished** (phone) | did I do what was asked · what did it cost · what did it do to my goal · what changes next |
| **Plan and improve** (web) | am I on track · what can I do to improve · what holds me back · what's ahead · did the plan keep its promises |
| Off track | how much damage · the new road · is the goal still realistic |
| Race week | am I ready · the race-day plan · this week |

### One home per fact

| Fact | Home | Elsewhere it is a door |
|---|---|---|
| goal, prediction, band, margin | Goal (contract line) | Now's strip, Road's race day |
| a session's target | its day on the Road | Now's hero, the debrief's "asked" |
| a run's facts and its settlement | its debrief (Log) | Now's latest debrief |
| the limits | Goal → holding you back (a week shows the one that bound it) | Road's week |
| endurance (marathon shape) | Goal → endurance | Now's strip |
| the plan vs its original road | Goal → history | Now's strip (vs plan) |

## 3. System (extends `ui/DESIGN.md`; no new tokens)

New primitives (compose existing ones; pages never re-roll them):

| Primitive | Where | Rule |
|---|---|---|
| **Contract line** (`ContractLine`) | Goal head, and the debrief's goal section | goal · predicted (band) · margin · days left; the margin is the one toned figure (state dot only when behind) |
| **Debrief** (`Debrief`) | Now (latest run), Log (every run) | four numbered sections in the order of the questions: *Did I do it* (asked vs did, each check with its verdict), *What it cost* (load, form, rest days), *What it did to the goal* (fitness, endurance, prediction before → after), *What's next* (the next session, and what the plan changed). Phone: stacked; desktop: the 2×2 grid. A section without data says when it settles ("with tonight's plan") instead of a blank |
| **Lever list** (`Levers`) | Goal | ranked by computed effect; each lever = what to change · its computed effect · a door to where it would change. A lever whose effect the model can't compute says "not modelled" and ranks after the computed ones |
| **Holding-you-back list** | Goal | the limits that bind the weeks ahead, most frequent first, each with its plain-words rule |

States: no plan → Now and Road say how to start (unchanged); no race → Goal shows the marathon-shape and fitness
without a contract line and says the levers need a race; a run with no planned session → the debrief says
"unplanned" and still settles cost and goal.

## 4. Screens

**Now** — concept: *today, settled.* The day band (session · readiness), then the latest run's debrief (moved above
the day band on the day the run lands, when today's session is already done or a rest day), where you are, this
week, recovery.

**Debrief** — concept: *asked vs did, and what it bought.* Data: `GET /api/ui/debrief/<id>` (`sh_ui_lenses.run_debrief`):
`asked` from the block log's session paired with this activity, `did` from the activity, the effort verdict from the
easy-run check; `cost` from the reconstruction (TRIMP, form after, rest days to TSB 0); `goal` before → after:
fitness (CTL day before vs end of day), endurance (marathon shape, as a share of the race's need) and the prediction
(the plan in force that morning vs the first plan built after it); `next` from the block log, `changed` from
`diff_plans` between those two plans.

**Goal** — concept: *the gap and the levers.* Contract line → Improve (ranked levers) → Holding you back →
Endurance → The road vs the original plan → History (the founding road and the ledger) → doors to Fitness and
Body. Data: `GET /api/ui/goal` (`sh_ui_lenses.goal_page`); levers are computed with `endurance_road(extra_week_km=…,
long_extra_km=…)` what-ifs, the easy-run check and the block's adherence.

**Road** — the Plan page as it is, minus History (moved to Goal) and minus Endurance (moved to Goal).

**Log** — the Runs page; a picked run opens as its debrief above its numbers, profile and map.

## 5. Acceptance (checked on the rendered screen, 1440×900 and 390×844, demo data)

- Navigation: four lenses + You on the phone; four lenses, Ask and You on desktop; old URLs land on their new home.
- Now: the debrief of the latest run shows the four sections; on the day of a run it sits above the day band.
- Log: every run opens as a debrief; an unplanned run says so.
- Goal: the contract line, at least two computed levers with effects, the limits ahead, endurance, history.
- The slop guard passes; no new Lighthouse failures; every control keeps a focus ring.

## 6. Decisions left to the owner

1. Moving "vs the original plan" off Now (it now lives on Goal; Now keeps the door in its strip). *Built: moved.*
2. A "% likely inside the goal" figure: not built; the band is shown instead, because the model's band is not a
   calibrated probability.
3. Splits/laps in "asked vs did" for interval sessions: not built (the data the app stores has no laps).
