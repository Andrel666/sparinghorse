# Sparing Horse: brand system and the "extra class" UI

One autonomous pass, written while the founder was away. It builds on `DESIGN.md` (the Swiss system, still the
base), `UX_REVAMP.md` (implemented) and `PARITY.md` (must survive). Decisions marked **[FOUNDER]** need a yes/no
before anyone builds them. Everything else is a recommendation with its reason, ready for an engineer.

Evidence: the sweep screenshots (desktop 1440, phone 390, phone dark) of every page, `tokens.css`, `base.css`,
`ui.tsx`, `Shell.tsx`, `Frame.tsx`, `Icon.tsx`, `charts.tsx`, `Today.tsx`, `index.html`.

---

## 1. Brand vision and strategy

### 1.1 The core idea: the held line
The name already says it twice. *Sparing*: holding back, spending effort carefully (a sparing rider does not
run the horse into the ground). *Sparring*: a partner who pushes back honestly so you get better. The engine
does exactly this. It builds toward the race and rides the load ceiling ("Assertive build · riding the full
load ceiling" is already product copy), but it never crosses that ceiling.

**Core idea: strength, held.** The product is a partner that holds you to the line so you arrive on race day
whole and on time. Every visual decision comes from that: one hard ceiling, restraint everywhere else, and
honesty about what the data does and does not know.

The one image the brand comes back to is **the held line**: a hairline ceiling with the work rising toward it
and never through it. You already see it in the load gauge, the road chart and the prediction band. It becomes
the brand's graphic motif.

### 1.2 Attributes (each one is a test you can apply to a screen)
| Attribute | Means | Test |
|---|---|---|
| Honest | ranges, not false points; says "I don't know" | Does every number show where it comes from (a door) and how uncertain it is? |
| Held | restraint in load, in colour, in words | Could anything on this screen be removed with no loss? |
| Exact | tabular numbers, true axes, real units | Is any number rounded, coloured or scaled in a way that misleads? |
| Quiet | no streaks, badges, confetti or guilt | Would this screen still feel calm after a missed week? |
| On your side | the partner voice: direct, never scolding | Does the copy say what to do next, not what you did wrong? |

### 1.3 Positioning
| | Their centre of gravity | Sparing Horse's answer |
|---|---|---|
| Strava | social proof, segments, kudos; owns *orange* in running | No audience. The only reader is you, so no performance theatre and (recommended) not their colour |
| Runna | friendly prescriptive plans, upbeat, gamified | Same plan, plus the *why*: every week explains itself and shows the limit that shaped it |
| TrainingPeaks | a coach's spreadsheet: TSS, CTL, PMC | Same science, worded: "Fitness 14 → 70", not "CTL/ATL/TSB" |
| Garmin Coach | locked to a device, opaque adaptation | Self-hosted fork, engine versioned, sources visible, the model checked against Runalyze |
| Linear / Apple Notes | one purpose, instant, zero chrome | The standard for craft: one spine per screen, chrome lighter than content |

**Positioning line (internal, never in the UI):** *The training plan that shows its reasoning and holds you to it.*

### 1.4 Trust signals (already in the product; keep them visible, never decorative)
1. A predicted **range** beside the median (1:49:07 to 2:09:10, median 1:58:43).
2. Every number is a door to the place it is decided.
3. The coach says what it can't know ("The engine gives no percentage chance, so I can't put a number on it").
4. The model is checked against Runalyze and the app says so when they differ.
5. Calibration changes nothing until you approve it.
6. Your data stays on your server. No feed, no followers.

### 1.5 Voice and tone
Plain, second person, numbers first. Short declaratives. No exclamation marks, no motivational filler, no
guilt. The horse is the plan's name for itself in exactly one place: **Tell the horse** (the athlete talks to
the plan). The coach in chat speaks as "I". The chrome is impersonal.

Copy budgets (machine-checkable; see 4.6): **lede ≤ 60 characters, sub line ≤ 40, why line ≤ 90, banner ≤ 120.**
Anything longer goes behind a door.

Before → after, taken from the current screens:

| Screen | Before | After | Why |
|---|---|---|---|
| Today, rest day | eyebrow `REST DAY`, hero `Easy run 4.3 km`, then `Tomorrow` | eyebrow `Fri 6 Nov`, hero `Rest`, second line `Tomorrow · Easy 4.3 km` | The eyebrow and the hero contradicted each other; the hero now is today's action |
| Today readiness | `Good to go` / `Ready for tomorrow's easy run.` / `+ Why` | `Good to go ›` (the verdict is the door to why) | The second line repeated the first; "+ Why" was a separate secondary label |
| Today strip | `Fitness 14 → 70` / `now → race day` | `Fitness 14 → 70` with label `Fitness, now → Feb 26` | The label carries what the sub line did |
| Today strip | `Prediction 1:58:43` / `goal 1:59 · 17 s under` | `1:58:43` / `17 s under 1:59` | One clause, no repeated noun |
| Runs strip | `November` / `1 runs` | `November` / `1 run` | Grammar bug |
| Fitness, easy runs | two sentences that say the same thing (`Your easy pace is ahead of your current aerobic fitness…` and `Your pace has outrun your aerobic base after the break…`) | one: `Easy pace is outrunning your aerobic base. Trust heart rate on easy days.` | Said twice |
| Fitness chart | `Model 14.2 / 12.9 vs Runalyze 16 / 31: they differ; a sync or a duplicate may be missing.` under the chart | a warn dot on the Fitness figure; the dot opens `Differs from Runalyze (16 / 31). Check for a missing sync.` | A data-quality note, not chart prose |
| Plan paces | `Easy pace ~6:42/km — if your easy runs are habitually faster than this they're really threshold effort; …(See the Effort-discipline panel…)` | `Easy 6:42/km ›` (the paragraph moves into the Why drawer) | Helper prose under data |
| Coach | `Your next run is tomorrow, Wednesday 2026-11-04` | `Your next run is tomorrow, Wed 4 Nov` | ISO dates are machine words; the server words dates |
| Coach rail | `Change the plan instead: tell the horse ›` | `Tell the horse ›` | The name is the action |
| Music, coming up | `recent line — already above the trained curve` ×3 in the ramp table | the `Set by` cell appears only where it differs from the row above | Repetition |
| Settings | `Week starts on` `saved here` + `mon, sun or sat — the first day of a training week (Runalyze calls it…) More` | `Week starts on` + select + provenance dot; text behind `?` | Every field carried a paragraph |
| Week strip, missed | `✗ Easy 4.3 km` struck **in red** | struck, in `--muted`, no ✗ | A missed run isn't an error. Red is for money-at-risk-grade problems (injury, overload) |
| Top bar | `synced 3 days ago` (amber) · **Sync** (black primary) · `Auto` | a single sync control: `● 3 d` (dot toned when stale); tap syncs | Maintenance was the heaviest object on every page |

---

## 2. Identity system

### 2.1 Logo system
**The mark: a constructed knight. [FOUNDER]** The chess knight is the one horse everyone reads at 16px, and it
carries the whole story. Chess is sparring with a partner. The knight never moves in a straight line, and
neither does a periodised plan (re-base, build, peak, taper). It is a strategy piece, not a mascot. It is drawn
on a 16-unit grid with only vertical, horizontal and 45° edges, so it sits in the Swiss system and renders
crisply at 16px. The eye is a single 2×2 square in `--signal`: the product's existing "now" square (today's cell,
the 6px tag marker) becomes the horse's eye. *It watches your data.*

v0 geometry (a starting point; the image prompts in section 3 explore it, and a type designer finalises it):
```svg
<svg viewBox="0 0 16 16"><path d="M3 16V9L5 4L6 1L8 3H10L14 8V11H11L9 9L11 16Z" fill="currentColor"/>
  <rect x="9" y="5" width="2" height="2" fill="var(--signal)"/></svg>
```

| Lockup | Use | Spec |
|---|---|---|
| Primary | splash, README, OG card, share card | knight + `Sparing Horse`, side by side; knight height = cap height × 1.5; gap = 0.5 × knight width |
| Wordmark | anywhere a mark would repeat itself | `Sparing Horse`, Inter Display 700, tracking −0.03em, sentence case, ink |
| Mark | app icon, favicon, desktop top bar, phone header, empty states | the knight alone |
| Compact (16px) | favicon, tab | knight with the eye forced to 2×2 device px; below 16px, drop the eye |
| Monochrome | print, embossing, one-colour contexts | knight with the eye knocked out (a hole), no signal |

Top bar: mark 18px + wordmark 15px/700 on desktop. On the phone, mark 20px only, at the left of the page header.
This replaces the current orange square + text, which reads as a placeholder.

### 2.2 Colour universe
The rule stays: **ink and paper do the work, one signal means *now*.** What changes is *which* signal.

**Recommendation [FOUNDER]: swap international orange for ultramarine ("Rein blue").** Three reasons:
1. *Semantics.* Today the signal (orange), warn (amber) and bad (red) are all warm. On Today, `≤ 145 bpm` in
   signal-ink reads as a warning, and the amber `synced 3 days ago` reads as signal. With a cool signal the split
   becomes one rule: **blue is where you are; warm is what to watch.**
2. *Positioning.* Orange is Strava's colour in running (#FC4C02 sits next to #FF4F00). Ultramarine is unclaimed in
   the category, and in the Swiss tradition (Klein, the Neue Grafik covers) it reads exact and premium.
3. *DX.* `#2B3CFF` passes AA as text on both paper and white (6.3:1) and carries white text (6.6:1). That removes
   `--signal-ink`: one token instead of two.

Fallback if the founder keeps orange: keep `#ff4f00`, but move `--warn` to `#9a5b00` (needed anyway, see below) and
never use signal on text below 17px.

Light:
| Token | Now | New | Contrast on `--bg` | Use |
|---|---|---|---|---|
| `--bg` | `#fafaf9` | `#fafaf9` | | paper |
| `--surface` | `#ffffff` | `#ffffff` | | floating only |
| `--surface-2` | `#f1f1ee` | `#f1f1ee` | | tracks, hover |
| `--line` | `#e2e2de` | `#e2e2de` | | hairlines |
| `--line-strong` | `#c9c9c4` | `#c9c9c4` | | the held line (ceilings, targets) |
| `--rule` / `--text` | `#0b0b0b` | `#0b0b0b` | 18.6 | ink |
| `--muted` | `#6a6a66` | `#6a6a66` | 5.2 | labels |
| `--signal` | `#ff4f00` | **`#2b3cff`** | 6.3 | now, selected, primary data |
| `--signal-soft` | `#ffe7dc` | **`#e8eaff`** | | planned-but-not-done fill of "now" |
| `--signal-ink` | `#c93a00` | **removed** (alias `var(--signal)` for one release) | | |
| `--on-accent` | `#ffffff` | `#ffffff` | 6.6 on signal | |
| `--ok` | `#0d7a3d` | `#0d7a3d` | 5.2 | |
| `--warn` | `#a86400` | **`#9a5b00`** | 5.2 (was 4.49, fails AA) | |
| `--bad` | `#cf1f1f` | `#cf1f1f` | 5.2 | |
| `--z1..z5` | grey → orange | **`#e2e2de #b3b3ad #85857f #4a4a46 #0b0b0b`** | | HR zones: a grey ramp into ink. Intensity is weight, not hue; the target zone gets a signal outline |

Dark (same names; `prefers-color-scheme` and `[data-theme="dark"]` from one shared block, see 4.2):
| Token | Now | New | Contrast on `--bg` |
|---|---|---|---|
| `--bg` | `#0b0b0b` | `#0b0b0b` | |
| `--signal` | `#ff6a2b` | **`#7f8cff`** | 6.6; `--on-accent #0b0b0b` on it 6.6 |
| `--signal-soft` | `#3a1a0c` | **`#191d45`** | |
| `--z1..z5` | | **`#2a2a28 #55554f #7e7e77 #b8b8b1 #f2f2ef`** | |
| others | | unchanged | |

Colour rules (enforced in review):
- Signal colours **only** now / selected / the primary series. It never colours a value because the value is
  good. The predicted finish is currently green on Today and Fitness, **orange** on Plan, and black on Coach. That's
  the same number in three colours. The tone comes from the server once (`ok` when under goal) and every page uses it.
- Status colour sits on the value that carries the state, never as a fill or a whole line of prose.
- Green is earned: a completed session is ink with a check. Only an off-target value gets a tone.

### 2.3 Typography
**One family.** Inter 4 with its optical-size axis replaces Inter + Inter Tight + JetBrains Mono. `opsz` 32 is
Inter Display (tight, for figures and the hero), `opsz` 14 is text. That's one font request, two fewer families,
and the display and body type finally share skeletons. Mono is used once (`pre.report` in Console) and falls
back to `ui-monospace`.

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..800&display=swap">
```

| Role | Size / line | Weight | Tracking | `opsz` | Where |
|---|---|---|---|---|---|
| hero | 64 / 1.0 (phone 44) | 700 | −0.04em | 32 | at most one per page: Today's action, a run's distance |
| figure | 32 / 1.05 (phone 28) | 650 | −0.03em | 32 | Strip values |
| title | 24 / 1.15 | 650 | −0.02em | 28 | drawer titles, phone page header |
| heading | 17 / 1.35 | 600 | −0.01em | 20 | section lede |
| body | 15 / 1.5 | 400 | 0 | 14 | text |
| small | 14 / 1.45 | 400 | 0 | 14 | row subs, table cells |
| label | 13 / 1.3 | 600 | +0.04em, uppercase | 14 | section label only (was 12px, below the system's own 13px floor) |

Every figure uses `font-variant-numeric: tabular-nums` and `font-feature-settings: "tnum","cv11","ss01"` (keep).
Units next to big numbers are set at 45% of the figure size in `--muted` (`164` big, `spm` small), already right
on Music; make it the rule everywhere (`6.16 km`, `0:40:49`, `156 bpm` on the run header).

### 2.4 Shape and texture
- Radius 0 on surfaces, **2px on controls**. Keep it: square is the brand (the knight grid, the now square, the week cells).
- Hairlines carry structure: `--rule` 1px marks a zone, `--line` 1px marks a group. No shadows on the page.
  Floating surfaces keep `--float-shadow`.
- **The held line** is the only ornament: a 1px `--line-strong` ceiling (load band top, goal line, target HR) that
  data approaches. Use it wherever a limit exists. Never decorate with it.
- Texture: none. No gradients, grain or glass. Restraint is the texture.

### 2.5 Motion
| Token | Value | Used by |
|---|---|---|
| `--dur-1` | 120ms | hover, press, focus ring, `›` door reveal |
| `--dur-2` | 180ms | drawer, sheet, menu, toast in |
| `--dur-3` | 240ms | the Seg/tab underline sliding to the new item; the anchor flash (keep at 1.2s total) |
| `--ease-out` | `cubic-bezier(.2,0,0,1)` | anything entering |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | anything leaving (exit = 0.75 × enter) |

What moves: floating surfaces, the selection indicator, the flash on an anchored section, the chart's hover rule.
**What never moves:** numbers (no count-ups), page content on navigation (no page transitions), the hero, charts
on load (no draw-in), and skeleton shimmer (show cached data, or a static `--surface-2` block). No bounce, no
parallax. `prefers-reduced-motion` turns everything off (already true).

### 2.6 The horse: mascot or not
**No mascot character.** A friendly horse with a face would push the product toward Runna and Duolingo:
cheerful, a little guilt-driven. That's the opposite of *held* and *honest*. The horse lives in three places only:
1. **The knight mark** (identity).
2. **The verb**: "Tell the horse" (the one place the plan has a name). Keep it, and don't add more horse puns.
3. **Race day**: the share card is the one surface where the knight appears large (see 5.5). It's a reward
   reached once per cycle, which is why it carries weight.

Empty states: the mark at 32px in `--line-strong`, one sentence, one button. No illustrations.

### 2.7 Iconography
Keep the single line set (24px grid). Change the stroke to **1.5 at 24px and 1.75 inline** (1.8/2.0 reads heavy
next to Inter 400). Keep the round caps: they're softer than the square system on purpose, so icons read as
controls, not data. Icons appear only in the phone tab bar, the More sheet and inside buttons; never as section
decoration. Add `knight` (the mark, filled) to `Icon.tsx` so the mark has one source.

---

## 3. Image-generation prompts

Use them in the order logo sheet → brand world → mockup, and feed the chosen mark from the first into the others.

### 3.1 Logo sheet (1:1)
Human-readable: A brand identity sheet for "Sparing Horse", a self-hosted running-coach app. The centre is a
geometric chess-knight head facing right, built on a visible 16×16 grid using only vertical, horizontal and 45°
edges, solid near-black (#0B0B0B). The eye is a single small square in ultramarine (#2B3CFF). Around it: the
wordmark "Sparing Horse" in a tight neo-grotesk (Inter Display Bold, sentence case); the horizontal lockup;
favicon tests at 16, 32 and 64 px; an app icon (black rounded square with a white knight and a blue eye); a
monochrome version with the eye knocked out; a clear-space diagram; and a colour strip of paper #FAFAF9, ink
#0B0B0B, grey #6A6A66, hairline #E2E2DE and one ultramarine accent. Swiss editorial layout, thin hairline
rules, lots of white space, no gradients, no mascot, no 3D.

```json
{
  "prompt": "Brand identity design sheet. Professional branding mockup. Award-winning visual identity. Modern branding system 2025. Brand: Sparing Horse, a precise self-hosted running coach. Central mark: a constructed chess-knight head facing right, drawn on a visible 16x16 construction grid with only vertical, horizontal and 45-degree edges, solid ink #0B0B0B, the eye a single small square in ultramarine #2B3CFF. Show: horizontal lockup with wordmark 'Sparing Horse' in a tight neo-grotesk bold sans, sentence case; standalone mark; favicon tests at 16px, 32px, 64px; app icon as a black rounded square with white knight and ultramarine eye; monochrome version with the eye knocked out; clear-space diagram; colour strip: paper #FAFAF9, ink #0B0B0B, grey #6A6A66, hairline #E2E2DE, accent #2B3CFF. Swiss International Style layout, hairline rules, generous white space, flat vector.",
  "aspect_ratio": "1:1",
  "style": "Swiss International Typographic Style, flat vector, editorial",
  "palette": ["#FAFAF9", "#0B0B0B", "#6A6A66", "#E2E2DE", "#2B3CFF"],
  "typography": "neo-grotesk sans (Inter Display), bold, tight tracking, sentence case",
  "composition": "centred mark on grid, lockups and tests arranged on a modular 12-column sheet",
  "negative_prompt": "gradients, 3D, glossy, mascot face, cartoon horse, horseshoe, galloping horse, orange, neon, drop shadows, script fonts, clutter, text errors"
}
```

### 3.2 Brand world (3:2)
Human-readable: The "held line" as a visual world. A pre-dawn coastal promenade in Tel Aviv, nearly
monochrome, a lone runner small in the frame running toward the horizon line. Over the photo, a Swiss
typographic system: a periodised bar chart of 17 thin bars rising toward a single hairline ceiling and never
crossing it, one bar in ultramarine marking "now", the knight mark small in a corner, a large finish time
"1:58:43" in a tight grotesk, and a race date. Calm, exact, expensive, quiet.

```json
{
  "prompt": "Brand identity design sheet. Professional branding mockup. Award-winning visual identity. Modern branding system 2025. Brand world for Sparing Horse, a running coach built on the idea 'strength, held'. Scene: pre-dawn Tel Aviv seafront promenade, near-monochrome desaturated photograph, a lone runner small in frame heading toward the horizon. Overlay in Swiss typographic style: a periodised bar chart of 17 thin grey bars rising toward one thin hairline ceiling and never crossing it, a single bar in ultramarine #2B3CFF marking the current week; large tabular figure '1:58:43' in a tight bold neo-grotesk; small caption 'Tel Aviv · 26 Feb 2027'; a small geometric chess-knight mark with an ultramarine square eye in the lower left. Off-white paper margins #FAFAF9, ink #0B0B0B, hairline rules.",
  "aspect_ratio": "3:2",
  "style": "editorial photography with Swiss grid overlay, restrained, premium",
  "palette": ["#FAFAF9", "#0B0B0B", "#6A6A66", "#2B3CFF"],
  "mood": "calm, exact, honest, early morning, held energy",
  "negative_prompt": "motivational slogans, sweat close-ups, neon, orange, lens flare, crowds, medals, confetti, gradients, stock-photo smile, text errors"
}
```

### 3.3 App mockup (9:16)
Human-readable: An iPhone screen of the Today page, light mode. A small knight mark top left, the page
name "Today" and a quiet sync dot top right. An eyebrow "Fri 6 Nov", a huge hero "Rest" with "Tomorrow · Easy
4.3 km · ≤145 bpm" under it, the readiness "Good to go" in green, then a horizontal road of 17 small square week
cells grouped Base / Build / Peak / Taper with the first cell in ultramarine and the label "Week 1 of 17", three
figures (1:58:43, 14 → 70, 1.94×), a seven-day week strip, and a bottom tab bar. Black and white, hairlines, no
cards, no shadows.

```json
{
  "prompt": "Brand identity design sheet. Professional branding mockup. Award-winning visual identity. Modern branding system 2025. Mobile app UI mockup for Sparing Horse running coach, iPhone portrait, light mode, Swiss data-dense design. Top: small geometric chess-knight mark at left, title 'Today', a small grey sync dot at right. Eyebrow 'Fri 6 Nov'; giant bold tight grotesk hero 'Rest'; line below 'Tomorrow · Easy 4.3 km · ≤145 bpm'; readiness 'Good to go' in green #0D7A3D. A road of 17 small square week cells in a grey ramp grouped Base, Build, Peak, Taper, first cell ultramarine #2B3CFF, label 'Week 1 of 17'. Three tabular figures in a row separated by hairlines: '1:58:43', '14 → 70', '1.94×'. A seven-column week strip with hairline dividers. Bottom tab bar with thin line icons: Today, Plan, Runs, Fitness, More. Off-white #FAFAF9 background, ink #0B0B0B, hairlines #E2E2DE, no cards, no shadows, no rounded panels.",
  "aspect_ratio": "9:16",
  "device": "iPhone, 390pt width",
  "style": "Swiss International Style product UI, Linear-grade restraint",
  "palette": ["#FAFAF9", "#0B0B0B", "#6A6A66", "#E2E2DE", "#2B3CFF", "#0D7A3D"],
  "negative_prompt": "cards, drop shadows, gradients, glassmorphism, emoji, orange, badges, streak flames, confetti, illustrations, rounded bubbly UI, lorem ipsum, text errors"
}
```

---

## 4. The "extra class" UI

### 4.1 Verdict
**Yes, it's reachable, and it's a subtraction job, not a rebuild.** The base is already better than most
shipping fitness apps: one primitive set (`Card`/`Strip`/`Row`/`Seg`/`Table`), every number a door, everything
in the URL, hairline Swiss structure, light and dark from one token file. That's the hard part of Linear-grade,
and it's done.

What still separates it from elite, in order of damage:
1. **Chrome outweighs content.** A black **Sync** button is the heaviest object on every desktop page. On the
   phone, a sync row and a 30px `Today` title push the hero down ~110px. Every page repeats its own name (nav tab +
   h1), and Fitness adds a third copy in its Seg.
2. **Semantic colour drifts.** The same prediction comes in three colours; signal and warn are both warm; missed
   runs are red; `--warn` fails AA.
3. **Prose stacks.** Fitness says the same thing twice; Plan carries a paragraph under the paces; Settings puts a
   paragraph under all 11 fields; Music repeats "already above the trained curve" three times. The thin-UI rule
   means this is a **server** problem: the engine's words must get shorter, and that's the real work.
4. **Charts look like the defaults.** Y ticks at range thirds (`77 / 36 / −5.6`, `15 / 8.6 / 2.4`), ISO date
   axes (`2026-05-11`), raw daily noise (sleep, pace profile), legends in captions instead of on the lines.
5. **No identity.** An orange square plus text, and **no favicon at all**: `index.html` references `/favicon.svg`
   and `/apple-touch-icon.png`, and neither exists in `public/`.
6. **Structural leftovers.** The Plan tabs sit halfway down the page, below the road. The Settings column starts
   at x=222 while everything else starts at x=40 (a dead L-shaped void). Run actions (Ignore/Delete) sit next to
   the run's headline.

Elite also needs things no screenshot shows: zero layout shift on navigation (render from cache, refetch
silently), instant tab switches (prefetch the four tab queries on idle), and hit targets ≥ 44px on the phone.
These go into "done when".

**UX/DX/AX lens.** Every change below either deletes something (UX), cuts a token, family or prop (DX), or makes
the contract more machine-checkable (AX: copy budgets as tests, tone owned by the server, URL state the coach
and agents can link to).

### 4.2 Token diff (`ui/src/styles/tokens.css`)
```diff
- --signal: #ff4f00; --signal-soft: #ffe7dc; --signal-ink: #c93a00;
+ --signal: #2b3cff; --signal-soft: #e8eaff; --signal-ink: var(--signal); /* alias, remove next release */
- --warn: #a86400;
+ --warn: #9a5b00;
- --z1: #d4d4cf; --z2: #a3a39d; --z3: #6a6a66; --z4: #ff9a6b; --z5: var(--signal);
+ --z1: #e2e2de; --z2: #b3b3ad; --z3: #85857f; --z4: #4a4a46; --z5: #0b0b0b;
- --display: "Inter Tight", "Inter", …;  --mono: "JetBrains Mono", …;
+ --display: "Inter", ui-sans-serif, system-ui, sans-serif;   /* + font-variation-settings: "opsz" 32 */
+ --mono: ui-monospace, "SF Mono", Menlo, monospace;
- --fs-display: 56px; --fs-title: 30px; --fs-figure: 32px;
+ --fs-title: 24px; --fs-figure: 32px;   /* display retired: hero (64) or figure (32), nothing between */
+ --fs-label: 13px;                       /* .card-label and .eyebrow read it; no 12px left anywhere */
+ --dur-1: 120ms; --dur-2: 180ms; --dur-3: 240ms;
+ --ease-out: cubic-bezier(.2,0,0,1); --ease-in: cubic-bezier(.4,0,1,1);
+ --hit: 44px;                            /* minimum touch target on the phone */
  dark:
- --signal: #ff6a2b; --signal-soft: #3a1a0c; --signal-ink: #ff7a3d;
+ --signal: #7f8cff; --signal-soft: #191d45;
+ --z1: #2a2a28; --z2: #55554f; --z3: #7e7e77; --z4: #b8b8b1; --z5: #f2f2ef;
```
DX: the dark block is written out twice today (media query and `[data-theme="dark"]`). Keep one block of custom
properties under `:root[data-theme="dark"]` and have the media query set `data-theme` from `Frame.tsx` before
first paint (an inline script in `index.html`). That gives one source and no drift.

### 4.3 Component diffs
| Component | Now | After | Reason |
|---|---|---|---|
| **TopBar** (desktop) | `Sparing Horse` · 7 links · bordered `Ask` · amber `synced 3 days ago` · black `Sync` · `Auto` | knight + wordmark · `Today Plan Runs Fitness Coach Music` · spacer · `Ask` (text + icon, no border, shortcut `/`) · sync control `●` + `3 d` (dot `--muted`, `--warn` when stale; click syncs, spinner replaces the dot, the tooltip has the exact time) · settings gear | Chrome lighter than content; theme leaves the bar (it lives in Settings › Display, default Auto) |
| **Phone header** | sync row above an h1 + date line | one 44px row: knight 20px · page name 17/600 · sync dot at right | ~110px back for the hero |
| **PageHead** | h1 30px on every page + controls | **removed on desktop** (visually hidden h1 for a11y); page controls (Seg, Races, Tell the horse) move into the right of the first zone's label row. Phone: the name lives in the header row | The nav already names the page |
| **Strip** | label, 34px value, sub (2 lines), spark | value 32 (phone 28); sub clamps to **1** line; a warn dot after the label when the server flags data quality | Budget enforcement |
| **Card/Section** | label 12px uppercase `--text` + optional lede | label 13px uppercase `--muted`; when a lede exists the label may be omitted (`label` optional already) | One header per section, not two |
| **Row** | ok | unchanged; trailing destructive actions are banned (they go in a `⋯` menu) | |
| **Seg** | bordered cells, black active | unchanged visually; the active fill animates over `--dur-3` | |
| **Week strip** | ✓ green completed, ✗ red missed, `Rest` text | completed: ink + check; off-target values toned; missed: struck `--muted`, no ✗; rest: `Rest` in `--muted` at 13px; today: 2px signal top rule (keep) | Green and red are earned |
| **Road** (Today) | phase labels + cells; separate Week/Race figures below | the road **absorbs** them: `Week 1 of 17 · Base` above the current cell, `Tel Aviv · 112 d` at the end cell; each cell links `/plan?week=` | One spine: "where am I" is a place on the road |
| **Charts** | see 4.4 | | |
| **Empty state** (`State`) | text | knight 32px `--line-strong` · one sentence (≤ 60) · one button | |
| **Icon** | 1.8 / 2.0 stroke | 1.5 / 1.75; add `knight` | |
| **Favicon / touch icon** | missing (404) | `public/favicon.svg` (knight + blue eye; `prefers-color-scheme` swaps the ink) and `apple-touch-icon.png` 180px (see 5.4) | |

### 4.4 Chart spec (`charts.tsx`; one implementation, every chart)
1. **Nice ticks.** Replace `YTicks` (top/middle/bottom of the range) with 1-2-5 steps: 3 to 5 ticks at round
   values (0, 25, 50, 75), gridlines only at ticks. Load and fitness have a floor of 0; HR and pace get a
   floor at the round tick below the data.
2. **Month axis.** X labels are month initials at month starts (`Jun Jul Aug …`), with the year only at a
   January crossing. No ISO dates anywhere in the chrome.
3. **Direct labels.** Each series name sits at its line's right end in the series colour. The caption legend goes.
4. **Weights.** Primary series: 2px, ink (or signal when it's "now"/the plan). Secondary (fatigue): 1.5px
   `--line-strong`. Projection: 2px dashed signal. A **today** rule (1px dashed `--muted`, keep) labelled `Today`
   at its top.
5. **Noise.** Daily body series (sleep, RHR, HRV) draw the 7-day mean as the line and the days as 2px dots in
   `--line-strong`. The pace profile is smoothed server-side (30 s rolling), with pace ticks in real `min/km`
   and the axis inverted so faster is up; the `pace profile (faster = higher)` caption goes.
6. **The held line.** Every limit (load band, goal finish, HR ceiling) is a 1px `--line-strong` line with its
   value at the right edge. The `--ok` band fill drops to `--surface-2`.
7. **Headline.** The section lede is the chart's takeaway number (already the pattern; enforce it).
8. **Road chart (Plan).** The current week is a `--signal-soft` bar for planned volume with a `--signal` fill
   for the km already done (today: a black inner bar on orange). `▲ today` becomes a `Today` label on the bar.

### 4.5 Page by page

**Today.** The question it answers: "What do I do, where am I, why is the plan like that?"
| Zone | Before | After |
|---|---|---|
| Head | sync row, `Today` h1, `Fri 6 Nov` | phone header row only; the date becomes the hero eyebrow |
| Day band | `REST DAY` / `Easy run 4.3 km` / `Tomorrow ≤145 bpm ~29 min + 2× strides` · Readiness `Good to go` / repeat line / `+ Why` / `Check in` | left: eyebrow `Fri 6 Nov`, hero = today's action (`Rest`, or `Easy 4.3 km`), line 2 at 24px = the next session on rest days, a meta row (target · minutes · strides). Right (phone: below a hairline): `Good to go ›` at 24px, toned; it opens why. `Check in` stays a quiet link |
| Where you are | road + a 4-figure strip (Week, Fitness, Prediction, Days) | the road with `Week 1 of 17 · Base` and `Tel Aviv · 112 d` placed on it; below, a **3-figure** strip: `1:58:43` (17 s under 1:59), `14 → 70` (Fitness, now → Feb 26), `1.94×` (Load; the limit holding this week). Load moves here because it is *why the plan is like that* |
| This week | progress line, 7 cells, `Why this week` as 3 prose lines | 7 cells (component diff above). Why turns into key/value rows bound to the week: `Phase` Base: easy volume, a little speed · `Volume` 14.8 km, held by load 1.53× · `Posture` Assertive build. Key 13 `--muted`, value 15, each a door |
| Latest run, Recovery | unchanged | unchanged (already doors) |

**Plan.** The question: "What is the whole road, and what's this week's plan?"
- The head row: `Week · Month · Race day · History` (Seg) on the left; `Races` and **`Tell the horse`** (primary) on
  the right. The tabs move from mid-page to the top, so every view has the same control in the same place.
- The **road chart becomes the persistent header** of every Plan view. Clicking a bar sets `?week=`, and the view
  below switches to Week for that week. "Clicking a week anywhere shows its plan" holds from every surface: road,
  calendar week column, Today road cell, Fitness chart (click a date → `?week=`).
- The strip drops `Predicted finish` in signal (it takes the server tone) and drops `16 weeks to go` (the road
  shows it). It keeps 3 cells: `112 days`, `1:58:43`, `70` (fitness on race day).
- The right rail, Races: the range bar stays (it's the held line); `Why this range, and the source →` and the
  stray `?` merge into one `Why ›`.
- Posture and paces: one line `Assertive build ›`, then paces as a key/value row set. The paragraph goes into the drawer.

**Runs.** The question: "What did I run, and how did it go?"
- Strip: `1 run` (fix the plural). The month nav arrows share one style; a disabled arrow uses outline only.
- Run header: `Ignore` / `Delete` leave the header for a `⋯` menu at the right of the label row. Destructive
  actions don't sit beside the headline.
- The 4 big figures stay (distance, time, pace, HR). Units drop to 45% muted.
- `Read back: Easy run: 41min @6:37/km` + `a bit hard for an easy run` merge into one line: `Easy 41 min @ 6:37/km · a bit hard for easy` (the tone on the verdict only).
- Chart tabs (`Pace / Heart rate / …`, 6 cells) wrap into a 3×2 grid at 390 (Seg `wrap`).
- Map: keep it greyscale; the route is the signal colour.

**Fitness tab.** The question: "Am I getting fitter, and am I overdoing it?"
- Strip of 6 with sparks: keep. Sparks are 1.5px ink, the last point signal (keep).
- Fitness & fatigue: chart spec 4.4; the Runalyze-differs note becomes a warn dot on the Fitness figure.
- Load: `1.94×` + gauge + one line (`Above the 0.8 to 1.3 band. Next weeks bring it back.`). The rest goes behind `Why`.
- Easy runs: `0/3 easy enough` + **one** sentence + the table. The second sentence is deleted server-side.

**Body tab.** The question: "Is my body recovering?"
- No ragged rows: Heart is HRV + Resting HR at 6+6 columns. When a series has fewer than 3 readings it's a figure
  with no chart (`34.8 ms · 1 reading`), and its neighbour takes the width.
- Sleep: 3 charts with 7-day mean lines (4.4.5), ticks at whole hours/minutes.
- Add a reading: stays a single inline row; the button is primary only when the value is filled.

**Coach.** The question: "Ask the plan anything."
- `Clear` moves from floating top right into the composer row (left of `Send`).
- Messages: the user's question is 15/600 ink, right-aligned, with no rule. The answer is body text, left-aligned,
  and keeps the 2px ink rule. 32px between exchanges. Line length is fine as is (~70ch).
- The server words dates (`Wed 4 Nov`, never `2026-11-04`) in the coach prompt.
- Rail: `What the coach sees` stays; `Tell the horse ›` as the last line.
- Empty: knight · `Ask about your plan, a run or race day.` · three suggestion buttons from the server.

**Music.** The question: "What plays on my next run?"
- Spotify not connected: the banner stays, but every `Build` is disabled with the tooltip `Connect Spotify first`
  (today they look live and fail).
- Coming up: today each row has 2 bordered buttons, 10 buttons in total. After: each row is a `Row` door that opens
  the run's drawer (`?run=`), with Preview/Build in the drawer. The row's trail shows `Built ✓` or `›`.
- Ramp table: `Set by` shows only where it changes. The `Comfort ceiling … window ±2 %` line goes behind `How the targets are set`.

**Settings.** The question: "Change a setting fast."
- Align to the page's left edge. One grid: label column 240px | control | provenance dot (filled = you set it,
  hollow = default; the tooltip says which). `default` / `saved here` text goes.
- Help: one line (≤ 90 characters) under a field only when the field is unreadable without it (`Athlete context`,
  `Injury history` format). Everything else goes behind `?`.
- Two navigation layers (top tabs `Athlete / Connections / Console` + sub-anchors `Athlete / Week / Display`) become
  one: the top tabs only. Sections stay as anchored `Card`s.
- Autosave on blur with a `Saved` check (`--dur-1` in, 1.2s, out); no save button.
- Calibrate: table `Number · Default · Fitted · Status`; each row's `Why` is an expandable row. The breaks list
  folds into `14 breaks not in your injury list ›`.
- Display gains `Theme: Auto / Light / Dark` (from the top bar).

### 4.6 Implementation plan (each phase ships alone)
Every phase is done when: the sweep (desktop 1440, phone 390, phone dark) has been re-shot and compared by eye;
there's no horizontal scroll at 390; axe reports no AA contrast failures; the `PARITY.md` checklist passes; and no
new client-side strings are added (wording lives in the server payload).

| Phase | Scope | Done when |
|---|---|---|
| **0. Correctness** (half a day) | favicon.svg + apple-touch-icon; `--warn #9a5b00`; `.card-label`/`.eyebrow` 12→13px; `1 run` plural; prediction tone from the server on every page; missed sessions `--muted` not red | the favicon shows in the tab; grep finds no `font-size: 12px`; the prediction is the same colour on Today/Plan/Fitness/Coach |
| **1. Tokens + type** | token diff 4.2 (signal per the **[FOUNDER]** decision); Inter opsz single family; mono → system; motion tokens; one dark block | one font request in the network tab; `--signal-ink` unused; screenshots match in light and dark |
| **2. Shell** | knight in `Icon.tsx`; TopBar per 4.3; phone header row; PageHead removed (visually hidden h1); theme into Settings | Today's hero top edge ≤ 120px from the top at 390 (now ~230); one h1 per page in the a11y tree |
| **3. Copy budgets** (server) | a test over every page payload: lede ≤ 60, sub ≤ 40, why ≤ 90, banner ≤ 120; ISO dates banned in prose; fix the offenders (Fitness repeat, Plan paces, Music set-by, Settings help) | the test is green in CI; no ISO date in any rendered string outside tables |
| **4. Today** | day band, road absorbs Week/Days, 3-figure strip with Load, Why as key/value | at 390 the hero, readiness and road fit above the tab bar; every figure and road cell is a door |
| **5. Plan** | tabs to the head, persistent road, bar click → `?week=`, rail cleanup | clicking any week in any surface lands on `/plan?view=week&week=…` showing that week |
| **6. Charts** | spec 4.4 in `charts.tsx` (ticks, month axis, direct labels, smoothing, held line) | no tick has more than 2 significant figures unless it's the data; no ISO date in any chart; legends on the lines |
| **7. Pages** | Runs ⋯ menu, Body no ragged rows, Coach composer, Music rows → drawer, Settings grid + autosave | Music has ≤ 2 buttons visible without Spotify; Settings has no paragraph under a field |
| **8. Applications** | OG card, race-day share card (server-rendered SVG → PNG), app icon set in the manifest | the share card renders from real data in both themes |

---

## 5. Brand-book foundations

### 5.1 Logo usage
- Clear space = the knight's eye width × 4 on every side (on a 16-unit mark: 8 units).
- Minimum size: mark 16px (with eye) / 12px (eye dropped); wordmark 12px cap height.
- Colours: ink on paper, paper on ink. The eye is the only signal. Monochrome: the eye is a hole.
- Placement: top-left in the product, bottom-left on cards. Never centred over data.

### 5.2 Misuse
Don't recolour the knight in signal; add a second accent; outline, rotate, flip it to face left (it always faces
forward), add a face, mane detail or rider; set the wordmark in all caps or a different typeface; put the mark on
a photo without a paper or ink plate; or animate the mark (the eye may blink once on first install, and that's
the only exception **[FOUNDER]**).

### 5.3 Colour and type rules
- Ink:signal ratio ≥ 95:5 on any screen. If a screenshot looks blue, there's too much signal.
- Signal = now / selected / primary series. Status colours sit on values only. Green and red are earned.
- One family (Inter, opsz). Six roles (2.3). At most one hero per screen. Labels are the only uppercase.
- Numbers are tabular, always with units at 45% muted next to big figures.

### 5.4 Applications
| Asset | Spec |
|---|---|
| App icon (iOS/PWA, 1024 master → 180/192/512) | ink `#0b0b0b` square (the OS rounds it), paper knight at 62% height, optically centred 4% right, signal eye. A maskable 512 variant with a 20% safe zone in the manifest |
| Favicon | SVG, knight in ink with a signal eye; `@media (prefers-color-scheme: dark)` inside the SVG switches the ink to paper |
| Social / OG card (1200×630) | paper; the knight at top-left 64px; `Sparing Horse` 56px; the road bar of 17 cells across the lower third with one signal cell; no tagline |
| Theme colour meta | unchanged (`#fafaf9` / `#0b0b0b`) |

### 5.5 Race-day share card (1080×1350, 4:5)
The one moment the brand goes large, so it's the thing people screenshot.
```
┌───────────────────────────────────────┐
│ Tel Aviv Half · 26 Feb 2027           │  13/600 uppercase muted
│                                       │
│ 1:58:43                               │  hero, 220px, tabular, ink
│ goal 1:59 · 17 s under                │  title 40px, toned ok (or muted)
│ ───────────────────────────────────── │  --rule
│ 5:46  5:38  5:38  5:37  5:33          │  splits per 4 km, figure 44px
│                                       │
│ ▮▮▮▮▮▮ ▮▮▮▮▮▮ ▮▮ ▮▮▮■                 │  the 17-week road, all filled grey, race cell signal
│ 17 weeks · 312 km                     │  small muted
│                                       │
│ ♞ Sparing Horse                       │  primary lockup, bottom-left, 48px mark
└───────────────────────────────────────┘
```
Rendered server-side from the race result (the thin-UI rule: the client only shows and shares it). Light and dark
variants. There's a non-race variant for a completed block only; never one per run (no feed, by design).

---

## Founder decisions
1. **Signal colour**: ultramarine `#2B3CFF` / `#7F8CFF` (recommended) or keep orange with the warn fix.
2. **The mark**: the constructed knight with a signal eye (recommended), or wordmark-only.
3. **No mascot**: confirm the horse stays a mark plus one verb ("Tell the horse").
4. **Page titles removed on desktop**, theme toggle moved to Settings.
5. **The share card**: build it (phase 8), and whether a once-only eye blink on install is allowed.

*Self-review. Strongest: the Today restructure, where the road becomes the spine that answers "where am I" and
Load joins the strip to answer "why". Weakest: the v0 knight geometry is a sketch on a 16 grid and needs a
type designer's pass before it ships.*
