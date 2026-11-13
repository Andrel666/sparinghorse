# Marathon shape (Runalyze's "basic endurance"): reference and design notes

Status: **shown, not planned against** (fork §ENDU, branch `feat/new-ui-endurance`).
This document is the single reference for anything built on top of it: what Runalyze computes, how this app
reproduces and projects it, where the code lives, what is assumed, and what could come next.

---

## 1. What it is

Runalyze's **marathon shape** is a percentage saying how well your recent training prepares you for a
marathon. 100 % means "fully sufficient training for an optimal marathon". Runalyze itself calls it "not
scientifically based. It's our own attempt to adjust the prognosis for long distances based on your current
endurance." Its only job inside Runalyze is to **slow down the VO₂max race prediction** for long races when
the endurance is missing.

Two inputs, nothing else: **how many km you run per week** and **how long your long runs are**. Pace, heart
rate and TRIMP play no part. VO₂max only sets the targets.

### Sources (Runalyze/Runalyze, `master`, read from a clone on 2026-11-06)

| File | What it holds |
|---|---|
| `inc/core/Calculation/BasicEndurance.php` | the shape formula, its constants and targets |
| `inc/core/Sports/Running/Prognosis/VO2max.php` | the requirement per race distance and the prediction adjustment |
| `tests/inc/core/Calculation/BasicEnduranceTest.php` | Runalyze's expected values (ported into our self-test) |
| `tests/inc/core/Sports/Running/Prognosis/VO2maxTest.php` | expected adjustment factors (ported) |
| `plugin/RunalyzePluginPanel_Rechenspiele/…` (support/4.3.x) | how Runalyze presents it ("Marathon shape" panel) |
| `plugin/RunalyzePluginPanel_Prognose/…` (support/4.3.x) | the prognosis panel, `use_be` = "Use marathon shape" (default on) |

The Runalyze API reports the current value as `marathonShape` in `statistics/current`. The app has stored it
in `shape_snapshots.marathon_shape` every day since it started syncing.

---

## 2. The formula

```
shape % = 100 × ( 0.67 × week_part + 0.33 × long_part )

week_part = km_in_window × 7 / window_days / target_week_km
long_part = Σ points(run) × 7 / 70

points(run) = (2 − 2/70 × days_ago) × ((km − 13) / (target_long_km − 13))²     for runs with km > 13
                                                                                 and days_ago < 70

target_week_km = VO₂max ^ 1.135
target_long_km = 12 × ln(VO₂max / 4)          VO₂max floored at 25 in both
```

### Constants

| Constant (Runalyze name) | Default | Meaning | Configurable in Runalyze |
|---|---|---|---|
| `MIN_KM_FOR_LONGJOG` | 13 km | a run counts as long only **above** this; only the km past it score | yes (account setting, same for every race) |
| `DAYS_FOR_WEEK_KM` | 182 | weekly-km window | yes |
| `DAYS_FOR_WEEK_KM_MIN` | 70 | the window's floor for a young account | yes |
| `DAYS_FOR_LONGJOGS` | 70 | long-run window and fade length | yes |
| `PERCENTAGE_WEEK_KM` / `PERCENTAGE_LONGJOGS` | 0.67 / 0.33 | weights (they always sum to 1) | yes |
| `MINIMAL_EFFECTIVE_VO2MAX` | 25 | floor for the targets | no |

### Details that matter when reproducing it

- **Window edges.** Runalyze's SQL counts runs with `time >= end_of_day − N days`. In dates: a run N − 1 days
  back is in, a run N days back is out. Days-ago for the fade is `floor((end_of_day − time) / 1 day)`, which is
  the plain date difference.
- **Adaptive week window.** `window_days` = days since the account's start, clamped to 70–182.
- **Squared long runs.** One 30 km run scores 17² = 289 against 2 × 7² = 98 for two 20 km runs (≈ 3×); a 14 km
  run scores almost nothing.
- **Fade.** A long run weighs 2 on its day, falling linearly to ~0 at 70 days. A weekly long run held for 10
  weeks sums to weight 11.
- **No cap.** The value can exceed 100 (ultra preparation). Runalyze only clamps the *display* to 0–100.
  Rounding: to a whole percent.
- **Running only.** Runalyze counts its running sport id only.
- **Inconsistency in Runalyze.** The SQL path uses the adaptive window and `>=`; the PHP `dataFor` path uses
  the fixed 182 days and `>`. We follow the SQL path, which is the one behind the displayed value.

---

## 3. What a race needs: the prognosis adjustment

From `Prognosis/VO2max.php`:

```
required shape % = distance_km ^ 1.23
factor = min(1, 0.6 + 0.4 × max(0, 1 − (required − shape) / 100))
predicted time = Daniels/Gilbert time at (VO₂max × factor)
```

| Race | Required shape | Factor at 0 % shape |
|---|---|---|
| 5 km | 7.2 % | 0.971 |
| 10 km | 17.0 % | 0.932 |
| **Half (21.1 km)** | **42.5 %** | 0.830 |
| 30 km | 65.6 % | 0.738 |
| Marathon (42.195 km) | 99.8 % (≈100) | 0.601 |

Reading: **at or above the requirement, the race prediction carries no endurance penalty.** Below it, each
point missing costs 0.4 % of VO₂max for that race (for example a half at 30 % shape: factor 0.95, a few % slower).
This is why the app shows **endurance as a share of the requirement** ("Half endurance 65 %"): 100 % is the
point where Runalyze stops penalising.

---

## 4. What moves it (VO₂max 54)

Targets: **92.5 km/week**, long run **31.2 km** (scoring divisor 31.2 − 13 = 18.2).

| Lever | Shape points |
|---|---|
| +1 km/week average (held over the window) | +0.72 |
| one long run today: 16 / 18 / 21 / 25 / 30 / 35 km | 0.18 / 0.50 / 1.27 / 2.86 / 5.74 / 9.61 |
| a long run every week for 10 weeks: 16 / 18 / 21 / 25 / 30 km | 1.0 / 2.7 / 7.0 / 15.7 / 31.6 |
| weekly km alone to reach the half's 42.5 % | 58.7 km/week |
| weekly km alone to reach the marathon's 100 % | 138 km/week |

Other VO₂max values: target week km is 75 (45), 85 (50), 92.5 (54), 100 (58). The higher the VO₂max, the more
volume the same percentage asks for.

**For a half, weekly km is the lever.** Long runs add a few points unless they go well past 13 km. For a
marathon, both are needed, and long runs of 25–30 km are what lift the long part.

---

## 5. How the app reproduces it

### Code map

| Piece | Where | Notes |
|---|---|---|
| `ms_targets`, `marathon_shape`, `ms_required`, `ms_adjustment` | `sh_engine.py` (§ENDU, after `RACE_KM`) | pure functions; the port. `marathon_shape(runs, day, vo2, first_day=…)` returns `pct` and its parts |
| `endurance_road(db, today)` | `SparingHorse.py` (before `race_plan`) | today's value, the projection along the plan, the check against Runalyze |
| `today_endurance`, `endurance_page` | `sh_ui_api.py` | the Today figure and the Plan card, worded once on the server |
| `GET /api/ui/endurance` | `sh_ui_api.register` | private (all `/api/ui/*` are) |
| `TodayPage.endurance`, `EndurancePage`, `useEndurance` | `ui/src/lib/api.ts` | types |
| Today figure | `ui/src/pages/Today.tsx` (`WhereYouAre`) | links to `/plan?view=race#endurance` |
| Plan card | `ui/src/pages/plan/Endurance.tsx`, mounted in `RaceView` (`Plan.tsx`) | strip + chart + "why" lines |
| Self-test | `sh_selftest.py` `_stc_marathon_shape` → `det/marathon-shape` | see §7 |

### Inputs

- **Runs:** `activities` matching `RUN_FAMILY_SQL`, minus `dropped_ids` (duplicates and ignored runs), dated up
  to today.
- **VO₂max for past days:** Runalyze's `effective_vo2max` from `shape_snapshots`, on or before each day: the
  value Runalyze's shape itself uses.
- **Future runs:** the latest saved plan's sessions after today (and today's, while nothing is logged today),
  excluding rest and race sessions and race day itself. The value shown for the race is **race morning's**.
- **VO₂max for future days:** today's Runalyze value plus the plan's own projected rise
  (`feasibility.finish_time.today.at_evo2 → at_evo2`), pro-rated by the share of the plan's TRIMP laid up to
  that day. The rise matters: Runalyze's targets grow with VO₂max, so a fitter runner needs more km for the same %.
- **Requirement:** `ms_required(RACE_KM[type])` for the plan's dated race; 100 (marathon) without one.

### Output of `endurance_road`

```
{ ok, label ("Half endurance" | "Marathon shape" | …), need (%), distance_km, race {label, date, type} | null,
  now:          {date, pct, of_need, week, long, km_week, target_week_km, target_long_km, vo2},
  race_morning: {same} | null,
  reaches:      first date the projected shape ≥ need (today when already there) | null,
  series:       [{date, v (shape %), kind: "actual" | "plan"}]   56 days back → race morning,
  check:        {n, mean_abs, date, runalyze} | null,              our value vs Runalyze's stored marathonShape
  long_min_km:  13 }
```

`week` and `long` are each part's contribution in shape points (they add up to `pct`). `of_need` is
`100 × pct / need`. `endurance_page` rescales `series` to that same 100 = need scale for the chart.

### The check against Runalyze

For each of the last 60 days with a stored `marathon_shape`, the app recomputes the value with that day's
VO₂max and reports the mean absolute difference. The API's unit is not documented: a stored maximum ≤ 3 is
read as a fraction and scaled by 100. **This is the first thing to look at on real data.** A gap of more than
a couple of points means one of the assumptions in §6 doesn't hold for this account.

---

## 6. Assumptions and known differences

| Assumption | Why it might not hold | How to tell / fix |
|---|---|---|
| Long-run threshold is 13 km | it's a Runalyze account setting | `check.mean_abs` drifts on weeks with long runs near 13 km; make it a Setting |
| Sport filter `LIKE '%run%'` | Runalyze counts its single running sport; trail or treadmill may be separate sports there | compare `check` on weeks with such runs; narrow the filter |
| Window start = the first run in the app | Runalyze uses the account's start date | only matters in the first 182 days of history |
| Runs counted by date | Runalyze uses timestamps and the server's day end | edge cases around midnight and time zones |
| Future VO₂max = today + the plan's projected rise | the plan's projection is on the app's model scale, applied as a delta to Runalyze's value | small; only moves the targets |
| Plan = the latest saved plan, as laid | the week you actually run differs | the measured part re-anchors every day |
| Weights and windows are Runalyze defaults | account settings can change them | the `check` would show a systematic gap |

---

## 7. Tests (`det/marathon-shape`)

1. **Runalyze's own unit tests, ported:** the VO₂max-30 case (runs 15/15/42 km, 7-day windows, 10 km
   threshold) gives km 30, points 0.36, parts 0.63 / 0.36, **54 %**; long runs alone 36 %, over 14 days 240 %;
   the target table for VO₂max 30–80; the prognosis factors; a half needs 42.5 %, a marathon 100 %.
2. **Window edge:** a run N − 1 days back is in, N days back is out.
3. **Projection on a half road:** the measured curve stops today and the plan's ends on race morning;
   `reaches` is the first plan day at the requirement; longer planned long runs raise race-morning shape
   (anti-vacuity); today's value doesn't move with the plan.
4. **Check:** a stored value, as a percent and as a fraction, reads back within 0.2 points.
5. **UI payloads:** Today's figure and the Plan card's 100 = need scale.

Mutation-tested: the week exponent, the fade, the window edge and the requirement exponent each fail the
test. (Counting race day itself can't be caught, and needn't be: it can't move a race-morning value.)

---

## 8. Building on it: ideas and what each would need

Ordered from cheapest to most invasive.

1. **Validate on real data.** Read `check` for the athlete's own history and pin the assumptions in §6.
   *Needs:* nothing new; possibly a long-run-threshold setting.
2. **What-if on the card.** "Add a 21 km long run this Sunday: +1.3 points", or "+5 km/week: +3.6 points by
   race day". *Needs:* a `runs_extra` argument to `endurance_road`; pure, no plan change.
3. **The plan's shortfall, worded.** When `reaches` is null, say what closes the gap at today's plan shape,
   e.g. "≈ 6 km/week more, or a 25 km long run every week from January". *Needs:* invert §4 (the parts are
   linear in weekly km and quadratic in long-run km).
4. **Runalyze's own prediction, side by side.** Daniels/Gilbert at `VO₂max × ms_adjustment(distance, shape)`
   next to the app's finish projection (§PRO7), on today and on race morning. *Needs:* a Daniels/Gilbert time
   solver (the app has VDOT tables; check first for an existing one).
5. **Coach chat context.** Add `now`, `race_morning` and `reaches` to the coach's context (`sh_coach.py`), so
   "am I on track for the half?" is answered with the same number. *Needs:* a few lines in the context builder.
6. **Classic UI.** Classic has no card. *Needs:* a tile reading `/api/ui/endurance` (or a Classic endpoint).
7. **A chain of races.** Show each A race's own requirement on the same curve (a 10k in March needs 17 %, the
   marathon in May 100 %). *Needs:* the chain from the plan; one requirement line per race.
8. **Plan towards it (engine).** Let the engine treat "reach the requirement by race morning" as a goal, by
   raising weekly km or long-run length. *Needs:* a design decision first. It competes with the safety
   governors (long-run step, ACWR, eq-km ceilings), which must keep priority, and Runalyze's own authors call
   the metric unscientific. If done: a soft objective inside the existing limits, never a new limit, with
   goldens updated and quoted.

### Questions to settle before building more

- Does our number match Runalyze's on the athlete's history (`check.mean_abs`)?
- Should the long-run threshold become a Setting, read from or mirroring Runalyze's account setting?
- Is "share of the requirement" the right headline for every distance, or should the marathon keep raw shape?
- For idea 8: is it ever worth adding load *only* to move this number?
