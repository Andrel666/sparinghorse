"""Fork §LENS — the four lenses of the new UI (docs/design/FOUR_LENSES_DESIGN.md): the run debrief and the Goal page.

A run's debrief answers, in order: did I do what was asked · what did it cost · what did it do to my goal · what
changes next. The Goal page answers: am I on track · what can I do to improve (ranked levers with computed effects) ·
what holds me back. Everything here REUSES the engine and the app's readers (block_log, effort_discipline,
reconstruct_history, endurance_road, the saved plans, diff_plans); nothing is re-derived, and a figure the model
can't compute says so instead of being guessed. New-UI code only: Classic never calls it.
"""
import json
from datetime import timedelta

import sh_ui_api as U

EASY_KINDS = ("easy", "long", "recovery")      # sessions the easy-run check grades
KM_TOL = 0.10                                    # within ±10 % of the asked distance reads "as asked"
LEVER_WEEK_KM = 5.0                              # the weekly-km what-if
LEVER_LONG_KM = 3.0                              # the long-run what-if
AHEAD_WEEKS = 4                                  # how far "holding you back" looks
# — run insights: what to keep, what to change. Each threshold is a reading of the athlete's OWN history —
INS_WINDOW_DAYS = 42                             # the recent runs a run is compared with
INS_MIN_KM = 4.0                                 # shorter runs don't compare (warm-up dominates)
INS_EVEN_PCT = 3.0                               # second half within ±3 % of the first: even pacing
INS_FADE_PCT = 5.0                               # second half ≥5 % slower: the run faded
INS_SURGE_PCT = 3.0                              # last km ≥3 % faster than the average: a fast finish
INS_DECOUPLE_OK, INS_DECOUPLE_HIGH = 5.0, 10.0   # aerobic decoupling (Pa:HR drift), %
INS_EFF_PCT = 2.0                                # beats per km ≥2 % off the recent median is worth saying
INS_CADENCE_SPM = 4                              # cadence ≥4 spm off the recent median
INS_HOT_C, INS_HUMID_C, INS_HUMID_PCT = 26, 22, 75   # warm enough to lift heart rate
INS_HOT_RUNS = 3                                 # easy runs over the ceiling in the effort window: a pattern


def _hms(sec):
    if sec is None:
        return None
    sec = int(round(sec))
    h, r = divmod(sec, 3600)
    m, s = divmod(r, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def _signed_time(d):
    """A prediction change in words: '−12 s' (faster) / '+1:04' (slower)."""
    if d is None:
        return None
    sign = "−" if d < 0 else "+" if d > 0 else "±"
    m, s = divmod(abs(int(round(d))), 60)
    return f"{sign}{m}:{s:02d}" if m else f"{sign}{s} s"


def _plans(db):
    return db.execute("SELECT id, for_date, plan FROM plans ORDER BY id").fetchall()


def _pred(plan):
    ft = (plan.get("feasibility") or {}).get("finish_time") or {}
    return ft.get("seconds")


def _shape_of_need(S, db, day, need):
    """Runalyze's marathon shape at the end of `day`, as a share of the race's need (the endurance figure)."""
    import sh_engine as E
    drop = S.dropped_ids(db)
    runs = [(S._date(r["date"]), r["distance"] or 0.0) for r in db.execute(
        "SELECT id, date, distance FROM activities WHERE " + S.RUN_FAMILY_SQL + " AND date IS NOT NULL AND date != ''"
    ).fetchall() if r["id"] not in drop and r["date"] <= day.isoformat()]
    if not runs:
        return None
    vo2_at, vo2_now = S._endu_vo2_reader(db)
    vo2 = vo2_at(day.isoformat()) or vo2_now
    if vo2 is None:
        return None
    pct = E.marathon_shape(runs, day, vo2, first_day=min(d for d, _ in runs))["pct"]
    return round(100.0 * pct / need)


def run_debrief(S, db, aid):
    """The debrief of one run: asked vs did, what it cost, what it did to the goal, what's next."""
    act = db.execute("SELECT id, date, distance, duration, hr_avg, hr_max, trimp, sport FROM activities WHERE id=?",
                     (aid,)).fetchone()
    if not act or not act["date"]:
        return {"ok": False, "error": "No such run."}
    day = S._date(act["date"])
    zones = S.training_zones(db)
    # — asked: the plan's session this run completed (the block log pairs them) —
    log = S.block_log(db) or {}
    sessions = [x for w in log.get("weeks") or [] for x in w.get("sessions") or []]
    sess = next((x for x in sessions if x.get("activity_id") == aid), None)
    asked = None
    if sess and not sess.get("unplanned") and sess.get("km"):
        kind = sess.get("kind")
        asked = {"kind": kind, "title": U.KIND_TITLE.get(kind, kind), "km": sess.get("km"), "minutes": sess.get("minutes"),
                 "date": sess.get("date"), "target": U.session_target(S, db, kind, zones), "strides": U.strides_of(sess),
                 "moved": sess.get("date") != act["date"]}
    km = round(act["distance"] or 0.0, 1)
    did = {"km": km, "minutes": round(act["duration"] / 60) if act["duration"] else None,
           "pace": U._pace(act["duration"] / act["distance"]) if act["distance"] and act["duration"] else None,
           "hr": act["hr_avg"], "hr_max": act["hr_max"], "trimp": round(act["trimp"]) if act["trimp"] else None}
    ed = S.effort_discipline(db) or {}
    er = next((x for x in ed.get("runs") or [] if x.get("date") == act["date"]), {})
    verdict = er.get("verdict")
    checks = []
    if asked:
        ratio = km / asked["km"] if asked["km"] else None
        state = "ok" if ratio is not None and abs(ratio - 1) <= KM_TOL else "warn"
        checks.append({"key": "distance", "label": "Distance", "asked": f"{asked['km']:g} km", "did": f"{km:g} km",
                       "state": state, "word": "as asked" if state == "ok" else ("shorter than asked" if ratio < 1 else "longer than asked"),
                       "detail": None if state == "ok" else f"{km:g} of {asked['km']:g} km"})
        if asked["kind"] in EASY_KINDS and verdict:
            ok = verdict in ("on", "easy")
            ceil = ed.get("easy_hr_ceiling")
            by_pace = (asked["target"] or {}).get("kind") == "pace"
            checks.append({"key": "effort", "label": "Effort", "asked": asked["target"]["text"] if asked["target"] else "easy",
                           "did": (f"{did['pace']}/km" if by_pace and did["pace"] else f"{did['hr']} bpm" if did["hr"]
                                   else U.VERDICT_TEXT.get(verdict, verdict)),
                           "state": "ok" if ok else ("bad" if verdict == "too_hard" else "warn"),
                           "word": "easy, as asked" if ok else "harder than asked",
                           "detail": None if ok else (f"{did['hr']} bpm, ceiling {ceil}" if ceil and did["hr"] else U.VERDICT_TEXT.get(verdict, verdict))})
    worst = "bad" if any(c["state"] == "bad" for c in checks) else "warn" if any(c["state"] == "warn" for c in checks) else "ok"
    if not asked:
        headline, tone = "Unplanned run", None
    elif worst == "ok":
        headline, tone = "As asked", "ok"
    else:
        miss = [c for c in checks if c["state"] != "ok"]
        parts = [c["word"] + (f" ({c['detail']})" if c.get("detail") else "") for c in miss]
        headline, tone = " · ".join(parts)[:1].upper() + " · ".join(parts)[1:], worst
    # — cost: load, form after, rest days to a balanced form —
    hist = {p["date"]: p for p in S.reconstruct_history(db, end=day.isoformat()) or []}
    end, prev = hist.get(day.isoformat()), hist.get((day - timedelta(days=1)).isoformat())
    cost = None
    if end:
        tsb = end["ctl"] - end["atl"]
        cost = {"trimp": did["trimp"], "tsb": round(tsb), "rest_days": U.rest_days(S, end["ctl"], end["atl"], day + timedelta(days=1)),
                "fatigue_up": round(end["atl"] - prev["atl"], 1) if prev else None}
    # — goal: before → after, for fitness, endurance and the prediction —
    plans = _plans(db)
    cur = json.loads(plans[-1]["plan"]) if plans else {}
    obj = cur.get("objective") or {}
    # only plans for the race the goal is now: a prediction for another race settles nothing against this one
    race_key = (obj.get("date"), (obj.get("type") or "").lower())
    same = [(r, p) for r, p in ((r, json.loads(r["plan"])) for r in plans)
            if ((p.get("objective") or {}).get("date"), ((p.get("objective") or {}).get("type") or "").lower()) == race_key]
    pb = next((p for r, p in reversed(same) if r["for_date"] <= act["date"]), {})
    pa = next((p for r, p in same if r["for_date"] > act["date"]), {})
    import sh_engine as E
    dist = E.RACE_KM.get((obj.get("type") or "").lower())
    need = E.ms_required(dist) if dist else 100.0
    goal = {"race": obj.get("label"), "target": obj.get("target"),
            "fitness": ({"before": round(prev["ctl"], 1), "after": round(end["ctl"], 1), "delta": round(end["ctl"] - prev["ctl"], 1)}
                        if end and prev else None),
            "endurance": None, "prediction": None, "settles": None}
    eb, ea = _shape_of_need(S, db, day - timedelta(days=1), need), _shape_of_need(S, db, day, need)
    if eb is not None and ea is not None:
        goal["endurance"] = {"before": eb, "after": ea, "delta": ea - eb,
                             "label": "Marathon shape" if not dist or dist >= 42 else "Endurance for the race"}
    sb, sa = _pred(pb) if pb else None, _pred(pa) if pa else None
    if sb and sa:
        goal["prediction"] = {"before": _hms(sb), "after": _hms(sa), "delta_s": round(sa - sb), "delta": _signed_time(sa - sb)}
    elif sa:
        goal["prediction"] = {"before": None, "after": _hms(sa), "delta_s": None, "delta": "no plan before this run to compare"}
    else:
        goal["settles"] = "The prediction settles with the next plan (tonight's run of the engine)."
    # the contract as it stands now: the line every screen settles against
    ft = (cur.get("feasibility") or {}).get("finish_time") or {}
    goal_s = U._hms_s(obj.get("target"))
    if obj.get("date") and ft.get("seconds"):
        from datetime import datetime
        tone, words, _short = U.race_call(ft["seconds"], (ft.get("band") or {}).get("lo_seconds"),
                                          (ft.get("band") or {}).get("hi_seconds"), goal_s)
        goal["contract"] = {"predicted": ft.get("hms"), "margin_s": (goal_s - ft["seconds"]) if goal_s else None,
                            "tone": tone, "words": words, "days": (S._date(obj["date"]) - datetime.now().date()).days}
    note = db.execute("SELECT note FROM session_log WHERE date=?", (act["date"],)).fetchone()
    # — next: the next session, and what the plan changed after this run —
    ahead = sorted((x for x in sessions if x["date"] > act["date"] and not x.get("unplanned") and x.get("km")
                    and not x.get("done")), key=lambda x: x["date"])
    nxt = ahead[0] if ahead else None
    changed = []
    if pb and pa:
        d = S.diff_plans(pb, pa) or {}
        changed = [c for c in d.get("changes") or [] if not c.startswith("The plan already matched")][:3]
    insights = run_insights(S, db, act, asked, did, ed, verdict)
    return {"ok": True, "id": aid, "date": act["date"], "headline": headline, "tone": tone, "asked": asked, "did": did,
            "checks": checks, "cost": cost, "insights": insights, "goal": goal, "note": (note["note"] if note else None) or None,
            "next": ({"date": nxt["date"], "dow": U._dow(S, nxt["date"]), "title": U.KIND_TITLE.get(nxt.get("kind"), nxt.get("kind")),
                      "km": nxt.get("km"), "target": U.session_target(S, db, nxt.get("kind"), zones)} if nxt else None),
            "changed": changed, "plan_reacted": bool(changed)}


def _pace_s(sec_per_km):
    m, x = divmod(int(round(sec_per_km)), 60)
    return f"{m}:{x:02d}"


def run_insights(S, db, act, asked, did, ed, verdict):
    """What to keep and what to change after a run, each read against the athlete's own recent runs.
    Returns {keep, change, next, context}: keep, change and context are {key, text} (context is what the run met,
    such as heat, not something to change); next is the advice for the next run. A signal with no data stays
    silent: nothing here is guessed."""
    keep, change, nxt, context = [], [], [], []
    try:
        raw = json.loads(db.execute("SELECT raw FROM activities WHERE id=?", (act["id"],)).fetchone()["raw"] or "{}")
    except Exception:
        raw = {}
    km, dur, hr = act["distance"] or 0.0, act["duration"] or 0.0, act["hr_avg"]
    long_run = (asked or {}).get("kind") == "long"
    easy = (asked or {}).get("kind") in EASY_KINDS or verdict is not None
    # — the recent runs this one is compared with —
    day = S._date(act["date"])
    drop = S.dropped_ids(db)
    recent = [r for r in db.execute(
        "SELECT id, date, distance, duration, hr_avg, raw FROM activities WHERE sport='Running' AND date<? AND date>=? "
        "AND distance>=? AND duration>0 ORDER BY date", (act["date"], (day - timedelta(days=INS_WINDOW_DAYS)).isoformat(),
                                                         INS_MIN_KM)).fetchall() if r["id"] not in drop]
    med = lambda xs: sorted(xs)[len(xs) // 2] if xs else None

    # 1 distance: the longest run in a while
    if km >= INS_MIN_KM:
        longer = db.execute("SELECT date, distance FROM activities WHERE sport='Running' AND date<? AND distance>=? "
                            "ORDER BY date DESC LIMIT 1", (act["date"], km + 0.05)).fetchone()
        if longer and (day - S._date(longer["date"])).days >= 21:
            keep.append({"key": "distance", "text": f"Your longest run since {S._date(longer['date']).strftime('%b %-d')} "
                                                    f"({longer['distance']:.1f} km). The long run is growing."})

    # 2 pacing: halves and the last km, from the 1 km splits
    sp = [x for x in raw.get("splits") or [] if x.get("distance") and x.get("duration")]
    if len(sp) >= 4 and km >= INS_MIN_KM:
        tot = sum(x["distance"] for x in sp)
        half, acc, first, second = tot / 2, 0.0, [0.0, 0.0], [0.0, 0.0]
        for x in sp:
            side = first if acc + x["distance"] / 2 < half else second
            side[0] += x["distance"]; side[1] += x["duration"]; acc += x["distance"]
        p1, p2 = first[1] / first[0], second[1] / second[0]
        delta = 100 * (p2 - p1) / p1
        full = [x for x in sp if x["distance"] >= 0.95]
        lo, hi = min(x["duration"] / x["distance"] for x in full), max(x["duration"] / x["distance"] for x in full)
        if abs(delta) <= INS_EVEN_PCT:
            keep.append({"key": "pacing", "text": f"Even pacing: every full km between {_pace_s(lo)} and {_pace_s(hi)}, "
                                                  f"the second half {'+' if delta >= 0 else '−'}{abs(delta):.0f} % on the first."})
        elif delta < 0:
            keep.append({"key": "pacing", "text": f"Negative split: the second half {abs(delta):.0f} % faster "
                                                  f"({_pace_s(p1)} → {_pace_s(p2)}/km)."})
        elif delta >= INS_FADE_PCT:
            change.append({"key": "pacing", "text": f"The run faded: the second half {delta:.0f} % slower "
                                                    f"({_pace_s(p1)} → {_pace_s(p2)}/km)."})
            nxt.append("Start slower: the first two km should feel too easy.")
        avg = dur / km if km else None
        last = sp[-1] if sp[-1]["distance"] >= 0.5 else sp[-2]
        lp = last["duration"] / last["distance"]
        if avg and long_run:
            if 100 * (avg - lp) / avg >= INS_SURGE_PCT:
                change.append({"key": "finish", "text": f"A fast finish: the last km at {_pace_s(lp)} against "
                                                        f"{_pace_s(avg)}/km on average."})
                nxt.append("Keep the end of the long run at the same easy pace: no push in the last km.")
            elif _has_injuries(S, db):
                keep.append({"key": "finish", "text": f"No push at the end: the last km at {_pace_s(lp)}, the run's own "
                                                      f"pace. Fast running late in a long run is what your injury "
                                                      f"history warns about."})

    # 3 aerobic decoupling (heart rate drifting up against pace), against the recent median
    dc = raw.get("aerobic_decoupling_pace")
    if dc is not None and km >= INS_MIN_KM:
        rdc = [json.loads(r["raw"] or "{}").get("aerobic_decoupling_pace") for r in recent]
        m = med([x for x in rdc if x is not None])
        than = f" (your recent median is {m:g} %)" if m is not None else ""
        if dc < INS_DECOUPLE_OK:
            keep.append({"key": "decoupling", "text": f"Heart rate held steady against pace: {dc:g} % drift{than}. "
                                                      f"Under 5 % means the aerobic base covered this distance."})
        elif dc >= INS_DECOUPLE_HIGH:
            change.append({"key": "decoupling", "text": f"Heart rate drifted {dc:g} % against pace{than}: "
                                                        f"the distance was at the edge of the current base."})
            nxt.append("Hold this distance until the drift falls under 5 %, before the long run grows.")

    # 4 effort: heart rate against the easy ceiling, and whether it is a pattern
    ceil = ed.get("easy_hr_ceiling")
    counts = ed.get("easy_counts") or {}
    # the pattern counts are today's window: they speak for a run inside it, not for an old one
    from datetime import datetime
    recent_run = (datetime.now().date() - day).days <= (ed.get("window_days") or 0)
    if easy and hr and ceil:
        if hr > ceil:
            over = hr - ceil
            change.append({"key": "effort", "text": f"Average heart rate {hr} bpm, {over} over the easy ceiling of {ceil}."
                                                    + (f" That's {counts.get('hot', 0) + counts.get('too_hard', 0)} of your "
                                                       f"last {counts['judged']} easy runs above it: the easy days are "
                                                       f"running as moderate days."
                                                       if counts.get("judged") and recent_run
                                                       and counts.get("hot", 0) + counts.get("too_hard", 0) >= INS_HOT_RUNS else "")})
            nxt.append(f"Run by heart rate, not pace: keep the watch under {ceil} from the first km, even if that "
                       f"means slower than {did.get('pace') or 'today'}/km or a short walk on a climb.")
        else:
            keep.append({"key": "effort", "text": f"Easy, as asked: {hr} bpm against a ceiling of {ceil}."})

    # 5 efficiency: heartbeats per km against the recent median (lower = more running per beat)
    if hr and km >= INS_MIN_KM and dur:
        bpk = hr * dur / 60 / km
        rb = [r["hr_avg"] * r["duration"] / 60 / r["distance"] for r in recent if r["hr_avg"]]
        m = med(rb) if len(rb) >= 3 else None
        if m:
            d = 100 * (bpk - m) / m
            if d <= -INS_EFF_PCT:
                keep.append({"key": "efficiency", "text": f"More running per heartbeat: {bpk:.0f} beats a km, {abs(d):.0f} % "
                                                          f"under your median of the last {INS_WINDOW_DAYS // 7} weeks ({m:.0f})."})
            elif d >= INS_EFF_PCT:
                change.append({"key": "efficiency", "text": f"Each km cost more heartbeats than usual: {bpk:.0f} a km, "
                                                            f"{d:.0f} % over your recent median ({m:.0f}). Heat, sleep or "
                                                            f"tiredness show up here first."})

    # 6 cadence against the recent median
    cad = raw.get("cadence")
    if cad:
        f = raw.get("cadence_display_factor") or 1
        rc = [json.loads(r["raw"] or "{}").get("cadence") for r in recent]
        m = med([x for x in rc if x])
        if m and abs(cad - m) * f >= INS_CADENCE_SPM:
            word = "higher" if cad > m else "lower"
            (keep if cad > m else change).append({"key": "cadence", "text": f"Cadence {cad * f} spm, {word} than your "
                                                                             f"usual {m * f}."})

    # 7 conditions: warm air lifts heart rate, so a high reading on a hot day reads differently
    t, h = raw.get("temperature"), raw.get("humidity")
    if t is not None and (t >= INS_HOT_C or (t >= INS_HUMID_C and (h or 0) >= INS_HUMID_PCT)):
        context.append({"key": "heat", "text": f"{t}°C{f' and {h} % humidity' if h else ''}: warm enough to lift heart "
                                               f"rate several beats at the same pace."})
        nxt.append("On warm days run earlier or cooler, and judge the effort by heart rate.")
    return {"keep": keep, "change": change, "next": nxt, "context": context}


def _has_injuries(S, db):
    spec = S.SETTINGS_BY_KEY.get("injury_history")
    if not spec:
        return False
    try:
        import sh_calibrate
        inj, _bad = sh_calibrate.parse_injuries(S._resolve_setting(db, spec)[0])
        return bool(inj)
    except Exception:
        return False


def _levers(S, db, plan):
    """The ranked levers: what to change, its computed effect, where it would change. Modelled first, by effect."""
    out = []
    base = S.endurance_road(db)
    if base.get("ok") and base.get("race"):
        rm = (base.get("race_morning") or {}).get("of_need")
        for key, kw, what in (("week_km", {"extra_week_km": LEVER_WEEK_KM}, f"+{LEVER_WEEK_KM:g} km a week from now"),
                              ("long", {"long_extra_km": LEVER_LONG_KM}, f"every long run {LEVER_LONG_KM:g} km longer")):
            r = S.endurance_road(db, **kw)
            nrm = (r.get("race_morning") or {}).get("of_need")
            if rm is None or nrm is None:
                continue
            gain = nrm - rm
            days = None
            if base.get("reaches") and r.get("reaches"):
                days = (S._date(base["reaches"]) - S._date(r["reaches"])).days
            if rm >= 100:
                effect = f"endurance on race morning {rm} → {nrm} %, already past what the race needs"
            elif r.get("reaches") and not base.get("reaches"):
                effect = f"reaches 100 % of the race's endurance (by {r['reaches']}); the plan as laid stops at {rm} %"
            else:
                effect = f"endurance on race morning {rm} → {nrm} %" + (f", 100 % {days} days sooner" if days else "")
            out.append({"key": key, "title": what, "effect": effect, "gain": gain, "modelled": True,
                        "useful": rm < 100, "link": "/road?tell=1"})
    ed = S.effort_discipline(db) or {}
    easy = ed.get("easy") if isinstance(ed.get("easy"), dict) else None
    on, judged = (easy or {}).get("on"), (easy or {}).get("judged")
    if on is None:
        runs = [x for x in ed.get("runs") or [] if x.get("verdict")]
        judged = len(runs)
        on = sum(1 for x in runs if x.get("verdict") in ("on", "easy"))
    if judged:
        out.append({"key": "easy", "title": "keep easy runs easy", "effect": f"{on} of {judged} easy runs were easy enough; "
                    "running them harder adds fatigue the plan didn't lay (not modelled as time)", "gain": None,
                    "modelled": False, "useful": on < judged, "link": "/fitness#easy"})
    log = S.block_log(db) or {}
    ad = log.get("adherence") or {}
    if ad.get("scheduled"):
        short = len(short_sessions(S, db, log))
        done = ad.get("done", 0)
        effect = f"{done} of {ad['scheduled']} so far this block" + (f", {short} shorter than asked" if short else "") + \
                 "; the prediction assumes the laid build completes"
        out.append({"key": "consistency", "title": "run every planned session, at its distance", "effect": effect,
                    "gain": None, "modelled": False, "useful": done < ad["scheduled"] or short > 0, "link": "/road"})
    return rank_levers(out)


def short_sessions(S, db, log=None):
    """The block's done sessions whose run fell short of the distance asked (outside KM_TOL): the debrief's
    distance verdict, applied to every session, so the lever and the debrief count the same thing."""
    log = log if log is not None else (S.block_log(db) or {})
    out = []
    for w in log.get("weeks") or []:
        for x in w.get("sessions") or []:
            aid, asked = x.get("activity_id"), x.get("km")
            if not aid or not asked or x.get("unplanned"):
                continue
            r = db.execute("SELECT distance FROM activities WHERE id=?", (aid,)).fetchone()
            if r and r["distance"] is not None and r["distance"] / asked < 1 - KM_TOL:
                out.append({"date": x.get("date"), "activity_id": aid, "asked": asked, "did": round(r["distance"], 1)})
    return out


def rank_levers(levers):
    """Levers that can move the goal first; among them, the modelled ones by their computed gain, then the rest."""
    out = sorted(levers, key=lambda x: (not x["useful"], not x["modelled"], -(x["gain"] or 0)))
    for i, x in enumerate(out, 1):
        x["rank"] = i
    return out


def _holding(S, plan, today):
    """The limits that bind the weeks ahead, most frequent first, in plain words."""
    weeks = [w for w in S._plan_weeks(plan) if S._date(w["start"]) + timedelta(days=6) >= today][:AHEAD_WEEKS]
    count = {}
    for w in weeks:
        b = (w.get("limits") or {}).get("binding")
        if b:
            count.setdefault(b, []).append(w)
    out = []
    for key, ws in sorted(count.items(), key=lambda kv: -len(kv[1])):
        held = U.limit_held(ws[0].get("limits")) or {}
        out.append({"key": key, "name": (U.LIMITS.get(key) or {}).get("name", key), "weeks": len(ws), "of": len(weeks),
                    "text": held.get("text"), "first": ws[0]["start"], "link": f"/road?week={ws[0]['start']}#limits"})
    return out


def goal_page(S, db, today=None):
    """Goal: the contract line, the ranked levers, what holds you back, and the doors to the rest."""
    from datetime import datetime
    today = today or datetime.now().date()
    row = db.execute("SELECT plan FROM plans ORDER BY id DESC LIMIT 1").fetchone()
    if not row:
        return {"ok": False, "error": "No plan yet: add a race and build the plan."}
    plan = json.loads(row["plan"])
    obj = plan.get("objective") or {}
    ft = (plan.get("feasibility") or {}).get("finish_time") or {}
    band = ft.get("band") or {}
    contract = None
    if obj.get("date"):
        goal_s = U._hms_s(obj.get("target"))
        tone, words, short = U.race_call(ft.get("seconds"), band.get("lo_seconds"), band.get("hi_seconds"), goal_s)
        contract = {"race": obj.get("label"), "date": obj.get("date"), "type": obj.get("type"), "target": obj.get("target"),
                    "days": (S._date(obj["date"]) - today).days, "predicted": ft.get("hms"),
                    "lo": band.get("lo_hms"), "hi": band.get("hi_hms"), "tone": tone, "words": words, "short": short,
                    "margin_s": (goal_s - ft["seconds"]) if goal_s and ft.get("seconds") else None,
                    "fitness_race": (plan.get("feasibility") or {}).get("projected_ctl")}
    return {"ok": True, "contract": contract, "levers": _levers(S, db, plan) if contract else [],
            "holding": _holding(S, plan, today), "vs_plan": U.today_vs_plan(S, db, today)}


def register(app, S, private):
    from flask import jsonify

    @app.get("/api/ui/debrief/<int:aid>")
    def api_ui_debrief(aid):
        return private() or jsonify(run_debrief(S, S.get_db(), aid))

    @app.get("/api/ui/goal")
    def api_ui_goal():
        return private() or jsonify(goal_page(S, S.get_db()))
