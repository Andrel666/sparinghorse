# Classic → new UI parity checklist

Every user-facing feature of Classic (`static/app.js`, `chat.js`, `music.js`, `index.html`), checked
one by one against the new UI. ✅ in the new UI · — deliberately not carried over (reason given).

## Global
| Feature | New UI |
|---|---|
| Sync now, error toast, all pages refresh | ✅ top bar |
| Backfill all, with confirm | ✅ Settings → Console → Backup & export |
| Silent auto-sync on open, refresh + toast when runs land | ✅ Frame |
| Freshness chip "synced N ago", amber when stale, last-sync tooltip | ✅ top bar |
| Theme auto / dark / light, saved | ✅ top bar |
| Units km / mi | ✅ `format.ts` (distance and pace follow the setting) |
| First-run guide (connect → sync → add race) | ✅ Frame banner |
| Data-quality banner: duplicates (delete leftovers, confirm), ignored runs (restore) | ✅ Frame banner |
| Confirm dialog with consequences + alternative | ✅ `feedback.tsx` |
| Notices for action results | ✅ toasts |
| Offline / error state with Retry | ✅ `Query.tsx` |
| Footer: version, Runalyze and GetSongBPM credits | ✅ |
| "?" help bubbles | ✅ `Help` |
| Installable, offline shell | ✅ manifest + `sw.js` |
| Keyboard: Enter/Space on buttons, Escape closes bubbles / drawers / dialogs | ✅ |
| Public read-only box, demo mode | — the new UI is the private console; the public box and the demo stay Classic |
| Section rail, collapsible sections, `?tab=` deep links | — replaced by pages and routes |

## Today
| Readiness: verdict, action, halt banner, reasons, HRV vs band, AI-judgment line | ✅ |
| Check-in: legs, sleep, note, stop symptom | ✅ |
| Session: kind, phase/week, km, ~min, target load, target, done line, note, workout / strides card, component | ✅ |
| Pre-plan / road complete / no plan / rest / optional-week states | ✅ |
| Why this session, binding-limit and deload lines | ✅ |
| Race countdown to the gun time in the race's zone, priority, verdict | ✅ |
| Latest run, cross-training note, open the run | ✅ |

## Plan
| Generate plan, "Re-planned — changes" banner | ✅ |
| Stale-plan / stale-seed banners with Generate | ✅ |
| Races drawer: priority, move date, gun time + zone, remove (confirm) / put back 24 h, add, past results | ✅ |
| Chain of races: pick the race in view (drift follows it) | ✅ |
| Active adjustment + clear; Tell the horse → apply / dismiss, or log a note | ✅ Tell the horse drawer (`/plan?tell=1`) |
| Road: phases, race flags, tune-ups, today marker, run vs planned | ✅ |
| Week: status, dates, km, eq-km, km run + ahead, runs, CTL at week end, load ratio, intent, lock | ✅ |
| Week flags (all 13) and deload retire / keep | ✅ worded in `sh_ui_api.week_flags` |
| Session lines: ✓ ✕ + • ○, actual, moved, doubles, reflection, rest fill, click → run | ✅ |
| Component chip with its explanation | ✅ |
| Limits: every limit, holds / ran over, headroom, basis, source drawer | ✅ |
| Races tile: finish band bar, median and goal ticks, CTL on race day, verdict, later-race curve, now vs race day, source | ✅ |
| Posture + source, pace zones + source, pace note, rebuilt at | ✅ |
| Month calendar, race-day plan, try another target | ✅ Month uses the one calendar (planned + run, week totals) |
| Drift: scorecard, after-race reckoning, A-race chain, 5 charts, Original → Now / Conservative vs Assertive | ✅ History tab |
| AI goal parsing, A-race adjudication, plan explain | — Classic no longer renders these either (SH-86 / SH-88) |

## Runs
| Calendar: zone dots, +N, other-sport mark, multi-run picker, month nav, legend | ✅ the one calendar, shared with Plan → Month (planned days ghosted) |
| Totals: month / 12 mo / all time incl. load, since | ✅ |
| Run: every metric incl. ground contact and vertical oscillation, time of day, split-recording chip | ✅ |
| Read back: kind, summary, rough signal, 1+1, strides | ✅ |
| Profile: pace / HR / cadence / elevation / GCT / VO, hover preview, click lock, HR-zone strip + legend, avg HR line, readout | ✅ |
| Ignore / undo, delete with confirm | ✅ |
| Route map | ✅ |

## Fitness
| Shape tiles with trends, % of all-time max, form word | ✅ |
| Load gauge, CTL ramp | ✅ |
| Fitness & fatigue: planned fitness to race day, hover (fitness, fatigue, form, load ratio), model check, duplicate heads-up | ✅ |
| Weekly distance, full history, scroll back | ✅ |
| Easy runs: score, table (GAP, HR %, drift, TE, feel, verdict), LT1, pace ↔ HR, manual-LTHR age, detrained, field-test offer | ✅ |
| Zones table + anchors | ✅ |
| Durability: chart / table switch, compare-with builds, horizons, bands, footnote | ✅ |
| Efficiency: chart, fitted line, temperature panel, note | ✅ |
| Track record: checkpoints, horizons, prescription, readiness calls, override weeks, bands, race table | ✅ |

## Body
| Marker cards: latest, ok / watch vs range, readings, first → last, stale age | ✅ Fitness → Body tab (`/body` redirects); HRV added |
| Chart with the reference band, hover, 6m / 1y / All (saved per marker) | ✅ |
| Nightly-data-stopped banner | ✅ |
| Add a reading | ✅ |
| Injury history | ✅ |

## Settings
| Every setting, typed, its source, per-field errors | ✅ |
| Away days: list, add, clear (confirm), put back | ✅ |
| Calibration: fit / approve / revert, parameters, injury lines not read, unlisted breaks | ✅ |
| Keys: set, clear, validate, fingerprint | ✅ |
| Suunto: connect, push week, rebuild, disconnect | ✅ |
| COROS: connect, sign in, push, disconnect, last error | ✅ |
| Console access: mode, change passphrase, log out | ✅ |
| System status | ✅ |
| Backup (.db), export (.json), backfill | ✅ |

## Coach
| Chat, suggestions, off / no-AI states, clear, Enter to send | ✅ Coach page + Ask drawer (`?ask=1`) on every page |

## Music
| Spotify connect / reconnect / disconnect, pull plays, return message | ✅ Music → Music settings |
| last.fm / ListenBrainz, comfort ceiling, step, lift, half-time, discovery | ✅ |
| Music keys | ✅ |
| Library: counts, tempo bands, sources table, refresh with progress | ✅ |
| Cadence ramp / ladder, targets, how the targets are set | ✅ Music → Playlists |
| Next run hero, coming up, preview / build / rebuild, result with tracks | ✅ |
| Run read-back: stats, songs table, keep / leave it out | ✅ |
