"""Fork §UI — the page endpoints for the new UI (ui/).

One endpoint per page returns exactly what that page shows, already decided and worded, so the
front end only lays it out. Everything here REUSES the engine and the app's own readers
(today_readiness, block_log, training_zones, effort_discipline, race_plan); nothing is re-derived.
Wording that more than one surface needs (the plain names of the plan's limits) lives here once and
is imported by the coach.

The app module is passed in (`register(app, S)`): SparingHorse may be running as __main__.
"""
import json
import re
from datetime import datetime, timedelta, timezone

# The plan's limits in plain words: `name` for a list, `held` for "this limit sized the week".
# One table, read by the UI and by the coach (sh_coach imports LIMITS).
LIMITS = {
    "acwr": {"name": "Load ratio",
             "held": "this week's load is {laid}× the base of the last ~6 weeks; the plan keeps it at or under {ceiling}×"},
    "chronic": {"name": "Fitness gain per week",
                "held": "fitness may rise {ceiling} points a week; this week uses {laid}"},
    "long_step": {"name": "Long-run step",
                  "held": "the long run may be at most 10% over the longest of the last 4 weeks ({ceiling} km)"},
    "long_max": {"name": "Long-run limit",
                 "held": "the long run is capped for the race distance ({ceiling} min)"},
    "eq_week": {"name": "Impact load, week",
                "held": "the week's speed-weighted load is at its ceiling ({laid} of {ceiling})"},
    "eq_session": {"name": "Impact load, single run",
                   "held": "the biggest single run is at its ceiling ({laid} of {ceiling})"},
    "tissue": {"name": "Weeks near the ceiling",
               "held": "several weeks in a row near the load ceiling force a lighter week"},
}
KIND_TITLE = {"easy": "Easy run", "long": "Long run", "long_mp": "Long run with a fast finish",
              "interval": "Intervals", "tempo": "Tempo", "threshold": "Threshold", "progression": "Progression run",
              "race_pace": "Race-pace run", "fartlek": "Fartlek", "hills": "Hills", "recovery": "Recovery run",
              "race": "Race", "rest": "Rest day"}
VERDICT_TEXT = {"on": "easy, on target", "hot": "a bit hard for an easy run", "too_hard": "threshold effort",
                "easy": "easy"}


def _pace(sec_per_km):
    if not sec_per_km:
        return None
    s = int(round(sec_per_km))
    return f"{s // 60}:{s % 60:02d}"


def strides_of(session):
    """How many strides a session carries: the engine's flag, or (plans laid before it) its note."""
    n = (session or {}).get("strides")
    if n:
        return int(n)
    m = re.search(r"(\d+)×4–6 strides", (session or {}).get("note") or "")
    return int(m.group(1)) if m else 0


def limit_held(limits):
    """The sentence for the limit that sized a week, or None."""
    key = (limits or {}).get("binding")
    v = (limits or {}).get(key) if key else None
    meta = LIMITS.get(key or "")
    if not (isinstance(v, dict) and meta):
        return None
    return {"key": key, "name": meta["name"],
            "text": "Held by " + meta["name"].lower() + ": " + meta["held"].format(laid=v.get("laid"), ceiling=v.get("ceiling"))}


def session_target(S, db, kind, zones=None):
    """An easy/long run's target: the HR ceiling when the threshold is trusted, else the easy pace bar."""
    if kind not in ("easy", "long", "recovery"):
        return None
    z = zones or S.training_zones(db)
    row = next((r for r in z.get("rows", []) if r["key"] == "easy"), {})
    if (z.get("hr_anchor") or {}).get("anchor") == "lthr" and (row.get("hr") or {}).get("hi"):
        return {"kind": "hr", "text": f"≤ {row['hr']['hi']} bpm", "hint": "keep the average heart rate at or under this"}
    p = (row.get("pace_slower_than") or {}).get("fmt")
    return {"kind": "pace", "text": f"slower than {p}/km", "hint": "no trusted threshold heart rate yet"} if p else None


def workout_steps(session):
    """A structured session's steps, grouped the way a runner reads them (warm-up, the reps as one
    line when they repeat, recovery, cool-down). Strides on an easy run become their own step."""
    reps = session.get("reps") or []
    steps = []

    def add(label, rs, zone):
        if rs:
            steps.append({"label": label, "minutes": round(sum(r.get("minutes") or 0 for r in rs)),
                          "km": round(sum(r.get("km") or 0 for r in rs), 1), "zone": zone,
                          "pace": (rs[0].get("pace_zone") or "").split(" ")[0] or None})
    by = lambda e: [r for r in reps if r.get("effort") == e]
    add("Warm-up, easy", by("warmup"), "easy")
    add("Easy base", by("easy_base"), "easy")
    work, rec = by("work"), by("recovery")
    same = len(work) > 1 and all(r.get("zone") == work[0].get("zone") and r.get("minutes") == work[0].get("minutes") for r in work)
    if same:
        add(f"{len(work)} × {work[0].get('minutes')} min at {work[0].get('zone')} pace", work, work[0].get("zone"))
        if rec:
            add(f"{len(rec)} × {rec[0].get('minutes')} min easy jog between", rec, "easy")
    else:
        for r in work:
            add(f"{r.get('minutes')} min {r.get('detail') or 'at ' + str(r.get('zone'))}", [r], r.get("zone"))
    add("Cool-down, easy", by("cooldown"), "easy")
    st = strides_of(session)
    if st:
        steps.append({"label": f"{st} × 4–6 strides of ~20 s, walk back between", "minutes": st * 3, "km": None,
                      "zone": "interval", "pace": None})
    return steps


def _week_days(S, w, today_iso):
    start = S._date(w["start"])
    by = {}
    for x in w["sessions"]:
        by.setdefault(x["date"], []).append(x)
    days = []
    for i in range(7):
        d = (start + timedelta(days=i)).isoformat()
        xs = by.get(d, [])
        main = next((x for x in xs if not x.get("unplanned")), xs[0] if xs else None)
        status = ("rest" if not main else "extra" if main.get("unplanned") else "moved" if main.get("moved_to")
                  else "done" if main.get("done") else "missed" if main.get("missed") else
                  "today" if d == today_iso else "planned")
        days.append({"date": d, "dow": (start + timedelta(days=i)).strftime("%a"),
                     "kind": (main or {}).get("kind") or "rest",
                     "title": KIND_TITLE.get((main or {}).get("kind") or "rest", (main or {}).get("kind")),
                     "km": (main or {}).get("km"), "status": status, "race": bool((main or {}).get("race")),
                     "strides": strides_of(main), "actual": (main or {}).get("actual"),
                     "moved_to": (main or {}).get("moved_to")})
    return days


def split_action(action):
    """The readiness line as headline + detail: 'Good to go — run …' → ('Good to go', 'Run …')."""
    a = (action or "").strip()
    head, sep, rest = a.partition(" — ")
    if sep and len(head) <= 24:
        rest = re.sub(r"^(and|but|so)\s+", "", rest)       # "— and today's a rest day" → "Today's a rest day"
        return head, rest[:1].upper() + rest[1:]
    return None, a


def _checkin(c):
    """Today's check-in as the form shows it (blank fields stay blank — never a pre-filled 'ok')."""
    if not c:
        return None
    return {"energy": c.get("energy") or "", "sleep": c.get("sleep") or "", "note": c.get("note") or "",
            "stop_symptom": bool(c.get("stop_symptom"))}


def _hrv_line(h):
    h = h or {}
    if h.get("baseline") is None or not h.get("band"):
        return "HRV: no data"
    return f"HRV {h['baseline']:.0f} against a band of {h['band'][0]:.0f}–{h['band'][1]:.0f} — {h.get('state') or 'unread'}"


def _ai_line(a):
    src = str(a.get("source") or "")
    if src.startswith("llm"):
        floor = a.get("engine_floor")
        return "AI judgment" + (f" · the engine's floor was {floor}" if floor and floor != a.get("verdict") else "")
    if src.startswith("engine (") and a.get("ai_verdict"):
        return f"The engine's floor held — the AI suggested {a['ai_verdict']}"
    return None


def today_page(S, db):
    today = datetime.now().date()
    tiso = today.isoformat()
    rd = S.today_readiness(db) or {}
    a = rd.get("assessment") or {}
    sess = rd.get("session") or {}
    zones = S.training_zones(db)
    kind = sess.get("kind") or ("rest" if sess else "none")      # none: no plan covers today
    session = {"kind": kind, "title": KIND_TITLE.get(kind, kind), "km": sess.get("km"),
               "minutes": sess.get("minutes"), "note": sess.get("note"), "done": bool(sess.get("done")),
               "actual": sess.get("actual"), "race": bool(sess.get("race")),
               "target": session_target(S, db, kind, zones), "steps": workout_steps(sess),
               "phase": sess.get("pk"), "week": sess.get("week"), "trimp": sess.get("trimp"),
               "optional": bool(sess.get("optional")), "start": sess.get("start"), "component": sess.get("component"),
               "pace_zone": sess.get("pace_zone"),
               "why": (f"{phase_name(sess.get('pk'))}{', week ' + str(sess['week']) if sess.get('week') else ''} — "
                       f"{'a rest day' if kind == 'rest' else KIND_TITLE.get(kind, kind).lower()}"
                       f"{' at ' + sess['pace_zone'] if sess.get('pace_zone') else ''}." if sess.get("pk") else None)}
    # the current week, from the log (planned + what was run, already merged there)
    week = None
    log = S.block_log(db)
    if log:
        cur = [w for w in log["weeks"] if w["start"] <= tiso <= (S._date(w["start"]) + timedelta(days=6)).isoformat()]
        if cur:
            w = cur[0]
            days = _week_days(S, w, tiso)
            dl = w.get("deload") or {}
            week = {"start": w["start"], "phase": w.get("pk"), "km": w.get("km"),
                    "runs": sum(1 for d in days if d["kind"] != "rest" and d["status"] != "extra"),
                    "days": days, "held": limit_held(w.get("limits")),
                    "deload": (("Deload retired — the block was absorbed." if dl.get("retired") else
                                "This down week is not owed by the numbers — answer it on the Plan page."
                                if dl.get("offer") else "Deload kept.") + (f" {dl['why']}" if dl.get("why") else ""))
                              if dl.get("judged") else None}
    # the next session still to run (what a rest day looks forward to)
    nxt = None
    if log:
        ahead = [x for w in log["weeks"] for x in w["sessions"]
                 if x["date"] > tiso and not x.get("unplanned") and not x.get("done") and x.get("km")]
        if ahead:
            x = min(ahead, key=lambda y: y["date"])
            nxt = {"date": x["date"], "dow": S._date(x["date"]).strftime("%a"), "kind": x.get("kind"),
                   "title": KIND_TITLE.get(x.get("kind"), x.get("kind")), "km": x.get("km"),
                   "minutes": x.get("minutes"), "strides": strides_of(x), "race": bool(x.get("race")),
                   "target": session_target(S, db, x.get("kind"), zones),
                   "days": (S._date(x["date"]) - today).days}
    # the latest run and how the easy check read it
    latest = None
    r = db.execute("SELECT id, date, distance, duration, hr_avg FROM activities WHERE " + S.RUN_FAMILY_SQL +
                   " AND distance>0 ORDER BY date_time DESC LIMIT 1").fetchone()
    if r:
        ed = S.effort_discipline(db) or {}
        er = next((x for x in ed.get("runs") or [] if x.get("date") == r["date"]), {})
        latest = {"id": r["id"], "date": r["date"], "km": round(r["distance"], 1),
                  "pace": _pace(r["duration"] / r["distance"]) if r["distance"] else None, "hr": r["hr_avg"],
                  "verdict": er.get("verdict"), "verdict_text": VERDICT_TEXT.get(er.get("verdict") or "")}
    _run, cross = S.latest_running_activity(db)
    if latest is not None and cross:
        latest["cross_training"] = (f"Your latest activity was {cross.get('sport')} on {cross.get('date')} — not a run. "
                                    "Its training load still counts toward fitness and fatigue.")
    # header chips
    ls = S.get_meta(db, "last_sync")
    sync_min = None
    if ls:
        try:
            sync_min = int((datetime.now(timezone.utc) - datetime.fromisoformat(ls)).total_seconds() // 60)
        except ValueError:
            sync_min = None
    plan_row = db.execute("SELECT plan FROM plans ORDER BY id DESC LIMIT 1").fetchone()
    obj = (json.loads(plan_row["plan"]).get("objective") or {}) if plan_row else {}
    race = None
    if obj.get("date"):
        orow = db.execute("SELECT start_time, start_tz, priority FROM objectives WHERE date=? AND status='upcoming' "
                          "ORDER BY id DESC LIMIT 1", (obj["date"],)).fetchone()
        race = {"label": obj.get("label"), "date": obj["date"], "type": obj.get("type"),
                "days": (S._date(obj["date"]) - today).days, "target": obj.get("target"),
                "start_time": orow["start_time"] if orow else None,
                "start_tz": (orow["start_tz"] if orow and orow["start_tz"] else None) or S.config().sync_tz.key,
                "priority": orow["priority"] if orow else None,
                "verdict": (json.loads(plan_row["plan"]).get("feasibility") or {}).get("verdict")}
    return {"ok": True, "today": tiso, "sync_minutes": sync_min, "race": race,
            "readiness": {"verdict": a.get("verdict"), "halt": bool(a.get("halt")), "action": a.get("action"),
                          "headline": split_action(a.get("action"))[0], "detail": split_action(a.get("action"))[1],
                          "reasons": a.get("reasons") or [], "hrv": (a.get("hrv") or {}).get("state"),
                          "hrv_line": _hrv_line(a.get("hrv")), "ai_line": _ai_line(a),
                          "checkin": _checkin(rd.get("checkin"))},
            "session": session, "next": nxt, "week": week, "latest_run": latest}


# ── Fitness ───────────────────────────────────────────────────────────────────────────────────
# The verdicts Classic's browser used to compute (gauge band, ramp wording) are decided here, once.
ACWR_BAND = (0.8, 1.3)          # the steady-training band Classic's gauge shades
RAMP_STEADY = 1.0               # CTL points/week within which fitness reads "steady"
FORM_WORDS = ((10, "Fresh — well rested"), (0, "Fresh"), (-10, "Training load is showing"),
              (-20, "Tired"), (float("-inf"), "Very tired"))


def load_state(acwr):
    """Where a load ratio sits against the steady band: 'high', 'low', 'in' (or None)."""
    lo, hi = ACWR_BAND
    return None if acwr is None else ("high" if acwr > hi else "low" if acwr < lo else "in")


def ramp_word(ramp):
    return None if ramp is None else ("building" if ramp > RAMP_STEADY else "easing" if ramp < -RAMP_STEADY else "steady")


def linear_fit(xs, ys):
    """Least-squares line through (x, y) → (slope, intercept), or None under two points."""
    n = len(xs)
    if n < 2:
        return None
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    if not sxx:
        return None
    b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    return b, my - b * mx


LT1_AGREEMENT = {
    "pace_ahead_of_hr": "Your easy pace is ahead of your current aerobic fitness: easy-paced runs land above the "
                        "easy heart-rate ceiling. Trust heart rate on easy days.",
    "agree": "Easy pace and easy heart rate agree.",
    "hr_ahead_of_pace": "Heart rate stays low at easy pace: you could run easy a touch faster.",
}


def _series(points, key, date_key="date"):
    return [{"date": p[date_key][:10], "v": round(p[key], 2)} for p in points if p.get(key) is not None]


def _delta(series, days=28):
    """Change over the last `days` (value now vs the closest point at or before then)."""
    if len(series) < 2:
        return None
    cut = (S_date(series[-1]["date"]) - timedelta(days=days)).isoformat()
    past = [p for p in series if p["date"] <= cut]
    return round(series[-1]["v"] - (past[-1]["v"] if past else series[0]["v"]), 1)


def S_date(iso):
    return datetime.strptime(iso[:10], "%Y-%m-%d").date()


def weeks_ago(days):
    return "this week" if days < 7 else f"{days // 7} week{'s' if days >= 14 else ''} ago"


def _sign(v):
    return f"+{v}" if v and v > 0 else f"{v}"


def track_lines(tr, races):
    """The track record, worded once: settled sentences plus one row per scored race."""
    c, sm = tr.get("ctl") or {}, tr.get("summary") or {}
    out = []
    if c.get("n"):
        bias = c.get("bias") or 0
        out.append(f"{c['n']} weekly fitness checkpoint{'s' if c['n'] != 1 else ''} · average miss {c.get('mae')} CTL · bias {_sign(bias)} "
                   f"({'came out fitter than projected' if bias > 0 else 'came out short of projection' if bias < 0 else 'even'})"
                   + (f" · {round(c['close_rate'] * 100)}% landed within {c.get('close_within')}" if c.get("close_rate") is not None else ""))
    L = tr.get("leads") or {}
    if any((L.get(h) or {}).get("n") for h in L):
        out.append("Forecast bias by horizon: " + " · ".join(
            f"{h} d {_sign(L[h].get('median_err_pct'))}% (n={L[h]['n']})" if (L.get(h) or {}).get("n") else f"{h} d —" for h in ("7", "14", "28")))
    pr = tr.get("prescription_rows") or {}
    if pr.get("n"):
        out.append(f"{pr['n']} week{'s' if pr['n'] != 1 else ''} of prescription scored · median ran {round((pr.get('median_ratio') or 0) * 100)}% "
                   f"of the sheet · {pr.get('over_run')} over-run, {pr.get('under_run')} under-run")
    rc = tr.get("readiness") or {}
    if rc.get("n"):
        pct = lambda b: f"{round(b['completed_rate'] * 100)}%" if (b or {}).get("completed_rate") is not None else "—"
        out.append(f"{rc['n']} readiness calls scored · green days completed {pct(rc.get('green'))} (n={(rc.get('green') or {}).get('n', 0)}) · "
                   f"amber/red completed {pct(rc.get('amber_or_red'))} (n={(rc.get('amber_or_red') or {}).get('n', 0)})")
    ov = tr.get("overrides") or {}
    if ov.get("n"):
        out.append(f"{ov['n']} override week{'s' if ov['n'] != 1 else ''} banked (run at ≥1.5× the intent, no race): "
                   + ", ".join(f"{r['week']} ×{r['ratio']}{' ⚠' if r.get('any_heavy_or_poor') else ''}" for r in ov.get("rows") or []))
    if sm.get("banded"):
        out.append(f"{sm.get('in_band')} of {sm['banded']} finish band{'s' if sm['banded'] != 1 else ''} contained the race")
    rows = [{"label": r.get("label") or r.get("type") or "race", "date": r.get("date"),
             "at": f"T−{round((r.get('horizon_days') or 0) / 7)} weeks" if r.get("kind") == "race_t8" else "final call",
             "band": None if r.get("in_band") is None else ("inside" if r["in_band"] else "outside"), "err_pct": r.get("err_pct")}
            for r in races or []]
    empty = None if out or rows else (f"Nothing has settled yet. A weekly fitness forecast is scored once it is {sm.get('lead_days') or 28} days "
                                      "old — old enough that scoring it isn't hindsight — and a race band is scored when the race is run.")
    return {"lines": out, "races": rows, "empty": empty}


def fitness_page(S, db):
    hist = (S.reconstruct_history(db) or [])[-180:]          # the same daily model Classic's charts draw
    ctl, atl, tsb = _series(hist, "ctl"), _series(hist, "atl"), _series(hist, "tsb")
    vo2 = [{"date": p["date"], "v": p["vo2max"]} for p in (S.vo2max_trend(db, 6) or {}).get("points", [])
           if p.get("vo2max") is not None]
    snap = dict(S.latest_snapshot(db) or {})
    form = tsb[-1]["v"] if tsb else None
    tiles = [
        {"key": "vo2max", "label": "VO₂max", "value": snap.get("effective_vo2max"), "unit": "",
         "delta": _delta(vo2), "series": vo2[-60:], "hint": "Runalyze's effective VO₂max"},
        {"key": "fitness", "label": "Fitness", "value": ctl[-1]["v"] if ctl else None, "unit": "CTL",
         "delta": _delta(ctl), "series": ctl, "hint": "the 6-week training load your body is used to",
         "word": f"{snap['fitness_pct']:.0f}% of your all-time max" if snap.get("fitness_pct") is not None else None},
        {"key": "fatigue", "label": "Fatigue", "value": atl[-1]["v"] if atl else None, "unit": "ATL",
         "delta": _delta(atl), "series": atl, "hint": "the last week's load"},
        {"key": "form", "label": "Form", "value": form, "unit": "TSB", "delta": _delta(tsb), "series": tsb,
         "hint": "fitness minus fatigue", "word": next(w for t, w in FORM_WORDS if form is not None and form > t) if form is not None else None},
    ]
    # load ratio (Runalyze's reading, as the gauge always showed) and the 7-day ramp
    acwr = snap.get("acwr")
    lo, hi = ACWR_BAND
    acwr_state = load_state(acwr)
    acwr_text = None if acwr is None else {
        "high": f"This week's load is {acwr:.2f}× your base — above the steady band ({lo}–{hi}). Expected after a "
                "restart or a big week; the plan sizes the next weeks to bring it back.",
        "low": f"This week's load is {acwr:.2f}× your base — below the steady band ({lo}–{hi}): resting, tapering or "
               "returning.",
        "in": f"This week's load is {acwr:.2f}× your base — inside the steady band ({lo}–{hi})."}[acwr_state]
    ramp = round(ctl[-1]["v"] - ctl[-8]["v"], 1) if len(ctl) >= 8 else None
    rword = ramp_word(ramp)
    weekly = [{"week": w["week"], "km": w["km"]} for w in (S.db_weekly_running() or [])]
    # the plan's projected fitness, week by week to race day (from the current week on)
    tiso = datetime.now().date().isoformat()
    log = S.block_log(db)
    proj = []
    if log:
        for w in log["weeks"]:
            wend = (S._date(w["start"]) + timedelta(days=6)).isoformat()
            if wend >= tiso and w.get("proj_ctl") is not None:
                proj.append({"date": wend, "v": round(w["proj_ctl"], 1)})
    modeled, snap2 = S.current_model(db)
    check = None
    if modeled and snap2:
        check = {"model": {"fitness": round(modeled["ctl"], 1), "fatigue": round(modeled["atl"], 1)},
                 "runalyze": {"fitness": snap2["fitness"], "fatigue": snap2["fatigue"]},
                 "close": abs(modeled["ctl"] - (snap2["fitness"] or 0)) <= 3 and abs(modeled["atl"] - (snap2["fatigue"] or 0)) <= 8}
    zones = S.training_zones(db)
    ed = S.effort_discipline(db) or {}
    c = ed.get("easy_counts") or {}
    lt1 = ed.get("lt1") or {}
    coh = S.pace_hr_coherence(db) or {}
    easy = {"score": ed.get("easy_score"), "window_days": ed.get("window_days"), "judged": c.get("judged"),
            "lt1": (f"Easy-pace ceiling (LT1) about {lt1['lt1_pace_fmt']}/km, from VO₂max {lt1.get('vo2max')}."
                    if lt1.get("lt1_pace_fmt") else None),
            "agreement": LT1_AGREEMENT.get(lt1.get("agreement") or "") or (coh or {}).get("note"),
            "lthr_note": (lambda h: f"Manual LTHR {h.get('lthr')} set {weeks_ago(h['age_days'])}." if h.get("source") == "manual" and h.get("age_days") is not None
                          else None)((lt1.get("hr") or {})),
            "detrained": ("Your pace has outrun your aerobic base after the break: easy pace reads faster than your heart says it is." if lt1.get("detrained") else None),
            "field_test": ((ed.get("tt_offer") or {}).get("text") or "A 30-minute field test would sharpen the heart-rate zones."
                           if (ed.get("tt_offer") or {}).get("offer") else None),
            "on": c.get("on"), "hot": c.get("hot"), "too_hard": c.get("too_hard"),
            "by": "heart rate" if ed.get("anchor") == "lthr" else "pace",
            "ceiling": (f"≤ {ed['easy_hr_ceiling']} bpm" if ed.get("anchor") == "lthr" and ed.get("easy_hr_ceiling")
                        else f"slower than {ed.get('easy_pace_ceiling')}/km" if ed.get("easy_pace_ceiling") else None),
            "runs": [{"date": r["date"], "kind": KIND_TITLE.get(r.get("kind"), r.get("kind")), "km": r.get("km"),
                      "pace": _pace(r.get("gap_pace")), "hr": r.get("hr_avg"), "hr_pct": r.get("hr_pct"),
                      "te": r.get("te"), "feel": r.get("feeling"), "decoupling": r.get("decoupling"),
                      "verdict": r.get("verdict"),
                      "verdict_text": VERDICT_TEXT.get(r.get("verdict") or "", r.get("verdict"))}
                     for r in (ed.get("runs") or [])]}
    du = S.durability_signal(db) or {}
    ef = S.efficiency_signal(db, window_days=S.EFFICIENCY_WINDOW_D) or {}
    tr = S.track_record(db) or {}
    bd = du.get("builds") or {}
    builds = [b for b in (bd.get("past") or []) + ([bd["current"]] if bd.get("current") else []) if b.get("runs")]
    efs = [p for p in (ef.get("series") or []) if p.get("ef") is not None]
    t0 = S_date(efs[0]["date"]) if efs else None
    fit = linear_fit([(S_date(p["date"]) - t0).days for p in efs], [p["ef"] for p in efs]) if efs else None
    lead = tr.get("leads") or {}
    side = {
        "durability_detail": {
            "points": [{"date": p["date"], "km": p["km"], "pct": p.get("decoupling_pct"), "hr": p.get("hr")}
                       for p in du.get("series") or [] if p.get("decoupling_pct") is not None],
            "builds": [{"label": b.get("label"), "pb": bool(b.get("pb")), "current": bool(b.get("is_current")),
                        "race_pct": b.get("race_pct"), "longest_km": b.get("longest_km"),
                        "runs": [{"km": r["km"], "pct": r.get("pct"), "race": bool(r.get("race"))} for r in b["runs"]]}
                       for b in builds],
            "lines": [5, 10]},
        "efficiency_detail": {
            "points": [{"date": p["date"], "v": p["ef"], "temp": p.get("temp_c"), "km": p.get("km"), "pace": p.get("pace"),
                        "hr": p.get("hr")} for p in efs],
            "fit": ([{"date": efs[0]["date"], "v": round(fit[1], 3)},
                     {"date": efs[-1]["date"], "v": round(fit[1] + fit[0] * (S_date(efs[-1]["date"]) - t0).days, 3)}]
                    if fit else None),
            "temp_note": (f"Warmer runs read lower here (r = {ef['temp']['r_with_ef']:.2f} over {ef['temp']['n']} runs, "
                          f"{ef['temp']['lo']}–{ef['temp']['hi']} °C): read the two together."
                          if (ef.get("temp") or {}).get("r_with_ef") is not None else None)},
        "track_full": track_lines(tr, tr.get("races") if isinstance(tr.get("races"), list) else []),
        "durability_more": _durability_more(du),
        "track_detail": [{"lead_days": int(k), "n": v.get("n") or 0, "median_err_pct": v.get("median_err_pct"),
                          "direction": v.get("direction")} for k, v in sorted(lead.items(), key=lambda kv: int(kv[0]))],
        "durability": {"ok": bool(du.get("ok") and du.get("n_long")), "n": du.get("n_long"),
                       "text": (f"{du['n_long']} long runs of {du['min_km']:.0f} km or more; recent fade "
                                f"{du['recent_median_pct']}% at about {du['recent_median_km']} km."
                                if du.get("n_long") and du.get("recent_median_pct") is not None else
                                "Not enough long runs yet."),
                       "note": du.get("trend") if isinstance(du.get("trend"), str) else None},
        "efficiency": {"ok": bool(ef.get("ok")), "verdict": ef.get("verdict"),
                       "text": (f"{(ef.get('verdict') or '').capitalize()}: {ef['trend']['pct_per_30d']:+.0f}% a month "
                                f"over {ef.get('n')} aerobic runs (speed per heartbeat)."
                                if ef.get("ok") and (ef.get("trend") or {}).get("pct_per_30d") is not None else
                                "Not enough aerobic runs yet.")},
        "track": {"scored": (tr.get("summary") or {}).get("races_scored") or 0,
                  "text": ("No predictions scored against a race yet." if not (tr.get("summary") or {}).get("races_scored")
                           else f"{tr['summary']['races_scored']} races scored; "
                                f"{tr['summary'].get('in_band', 0)} finished inside the predicted range.")},
    }
    return {"ok": True, "tiles": tiles,
            "load": {"acwr": acwr, "band": list(ACWR_BAND), "state": acwr_state, "text": acwr_text,
                     "ramp": ramp, "ramp_word": rword},
            "chart": {"ctl": ctl, "atl": atl, "tsb": tsb, "acwr": _series(hist, "acwr"), "plan": proj, "check": check,
                      "duplicates": len(S.find_duplicates(db) or [])}, "weekly": weekly,
            "zones_note": _zones_note(zones),
            "zones": [{"label": r["label"], "pace": ((r.get("pace_slower_than") or {}).get("fmt") and f"slower than {r['pace_slower_than']['fmt']}")
                       or (r.get("pace_target") or {}).get("fmt"),
                       "hr": r.get("hr")} for r in zones.get("rows", [])],
            "easy": easy, **side}


def _zones_note(z):
    pa, ha = z.get("pace_anchor") or {}, z.get("hr_anchor") or {}
    pace = f"Pace from VO₂max {pa['vo2max']:.1f} (5k-equivalent {pa.get('p5k_fmt')}/km)" if pa.get("vo2max") else "Pace: no VO₂max yet"
    if ha.get("anchor") == "lthr":
        how = (f"manual, set {weeks_ago(ha['age_days'])}" if ha.get("source") == "manual" and ha.get("age_days") is not None
               else f"derived, {ha.get('confidence')} confidence")
        hr = f"HR from LTHR {ha.get('ref')} ({how})"
    elif ha.get("anchor") == "hrmax":
        hr = f"HR as % of HRmax {ha.get('hrmax')}"
    else:
        hr = "no HR model yet"
    return f"{pace} · {hr}. The two are independent estimates; when they disagree, the easy-run check says which to trust."


def _durability_more(du):
    """Compare-with builds, each build's horizon, the band table and the footnote."""
    b = du.get("builds") or {}
    allb = [x for x in (b.get("past") or []) + ([b["current"]] if b.get("current") else [])]
    past = b.get("past") or []
    default = next((x["key"] for x in past if x.get("pb")), past[-1]["key"] if past else None)
    mk = b.get("min_km") or 18
    def horizon(x):
        if x.get("horizon_km") is None:
            return "—"
        if x["horizon_km"] < mk:
            return f"before {mk:.0f} km"
        return f"beyond {x['horizon_km']:.0f} km" if x.get("extrapolated") else f"{x['horizon_km']:.0f} km"
    return {"bands": b.get("bands") or [], "min_km": mk, "default_compare": default,
            "builds": [{"key": x["key"], "label": x.get("label"), "current": bool(x.get("is_current")), "pb": bool(x.get("pb")),
                        "horizon": horizon(x), "fit": x.get("fit"), "n": len(x.get("runs") or []),
                        "cells": [({"median": c["median"], "n": c["n"]} if c else None) for c in x.get("bands") or []],
                        "race_pct": x.get("race_pct"),
                        "runs": [{"km": r["km"], "pct": r.get("pct"), "race": bool(r.get("race"))} for r in x.get("runs") or []]}
                       for x in allb],
            "headline": (lambda c: None if not c else
                         f"{c.get('label')}: {len(c.get('runs') or [])} long runs this build — the line needs 4" if not c.get("fit") else
                         f"This build passes 5 % before {mk:.0f} km" if (c.get("horizon_km") or 0) < mk else
                         f"This build holds under 5 % to about {c['horizon_km']:.0f} km")(b.get("current")),
            "footnote": f"Runs of {mk:.0f} km or more in the 20 weeks before each race."}


# ── Plan ──────────────────────────────────────────────────────────────────────────────────────
PHASE_NAMES = {"rebase": "Re-base", "base": "Base", "build": "Build", "peak": "Peak", "taper": "Taper",
               "bridge": "Bridge", "recovery": "Recovery"}


def phase_name(pk):
    """'build2' → 'Build' (chain segments share their phase's name)."""
    base = re.sub(r"\d+$", "", pk or "")
    return PHASE_NAMES.get(base, base.capitalize() if base else None)


def phase_key(pk):
    return re.sub(r"\d+$", "", pk or "") or None


def _limits_list(limits):
    out = []
    for k, v in (limits or {}).items():
        if isinstance(v, dict) and "laid" in v and "ceiling" in v and k in LIMITS:
            out.append({"key": k, "name": LIMITS[k]["name"], "laid": v["laid"], "ceiling": v["ceiling"],
                        "unit": v.get("unit", ""), "holds": limits.get("binding") == k, "basis": v.get("basis"),
                        "headroom": v.get("headroom"),
                        "over": v["laid"] > v["ceiling"] + 1e-9,
                        "fill": round(min(1.0, v["laid"] / v["ceiling"]), 3) if v["ceiling"] else None})
    return sorted(out, key=lambda x: (not x["holds"], x["name"]))


def _session_detail(S, db, x, zones):
    return {"date": x["date"], "kind": x.get("kind"), "title": KIND_TITLE.get(x.get("kind"), x.get("kind")),
            "km": x.get("km"), "minutes": x.get("minutes"), "note": x.get("note"), "race": bool(x.get("race")),
            "strides": strides_of(x), "target": session_target(S, db, x.get("kind"), zones),
            "steps": workout_steps(x), "actual": x.get("actual"), "moved_to": x.get("moved_to"),
            "status": ("extra" if x.get("unplanned") else "moved" if x.get("moved_to") else "done" if x.get("done")
                       else "missed" if x.get("missed") else "planned")}


def _dow(S, iso):
    return S._date(iso).strftime("%a")


def week_flags(S, w):
    """The week card's flags, worded once: [{text, tone, hint}]. Classic's weekHtml rules."""
    f = []
    add = lambda text, hint=None, tone=None: f.append({"text": text, "hint": hint, "tone": tone})
    if w.get("frequency_met"):
        add("✓ frequency met — today optional", "This week's prescribed count and volume are already run; the remaining run is optional.", "ok")
    elif w.get("volume_met"):
        add("✓ volume run — today optional", "This week's planned km are already run; the remaining days aren't re-prescribed just to hit a run count.", "ok")
    if w.get("fatigue_capped"):
        add("⚠ build intent capped by recent fatigue", "A building week, but recent fatigue left no load-ratio headroom — the long run was held back.", "warn")
    elif w.get("clipped"):
        add("clipped to fit the load ratio", None, "warn")
    if w.get("long_step_capped"):
        add("long run held (+10 %)", "This week's long run was held to +10 % over your longest of the last 4 weeks; the freed volume went to easy runs.")
    if w.get("long_max_capped"):
        add("long run at its limit", "Held to 35 km or 3 h 30 min at its planned pace, whichever comes first.")
    if w.get("long_held"):
        add("long run kept", f"Kept at its ladder rung ({w['long_held'].get('rung_km')} km): your easy days ran over the sheet.")
    if w.get("run_moved"):
        add("run moved", "Moved from " + " and ".join(_dow(S, m["from"]) for m in w["run_moved"] if m.get("from")) +
            " to keep that day's load under the ceiling. Distance and session unchanged.")
    if w.get("rest_gated"):
        shed = w.get("rest_shed_km")
        add("held to rest days — spacing kept" + (f" · −{shed} km" if shed else ""),
            "Every open day would have chained too many running days in a row; the volume that won't fit is held back.")
    if w.get("bio_capped"):
        add("fast load eased", "The pace-weighted impact load jumped too far above recent weeks, so fast work was eased to easy.")
    if w.get("av_dates"):
        shed = w.get("av_shed")
        add("✈ away " + ", ".join(_dow(S, d) for d in w["av_dates"]) + (f" · −{shed} run{'s' if shed > 1 else ''}" if shed else ""),
            "The week is laid around the days you declared away.")
    if w.get("adjusted"):
        add("eased", "An active adjustment eased this week.")
    if w.get("frozen"):
        add("✓ done", None, "ok")
    return f


def deload_state(w):
    dl = w.get("deload") or {}
    if not dl.get("judged"):
        return None
    return {"week": dl.get("week") or w["start"], "why": dl.get("why"),
            "state": "retired" if dl.get("retired") else "offer" if dl.get("offer") else "kept",
            "text": (f"deload retired · block {round(dl['absorbed_frac'] * 100)} % absorbed" if dl.get("retired") and dl.get("absorbed_frac") is not None
                     else "deload retired" if dl.get("retired") else "deload not owed by the numbers" if dl.get("offer")
                     else "deload kept (your call)" if dl.get("source") == "athlete" else "deload kept")}


def adjustment_effect(a):
    if a.get("medical") or a.get("medical_flag"):
        return "Plan halted — full rest until you've seen your doctor"
    vm = a.get("volume_multiplier")
    if vm == 0:
        return "Full rest over the window"
    if vm is None or vm >= 1:
        return "Easy effort only over the window" if a.get("easy_only") else "On plan — no load change"
    return f"Load eased to {round(vm * 100)}% of plan" + (", easy effort only" if a.get("easy_only") else "")


def _adjustment(a):
    if not a:
        return None
    return {"medical": bool(a.get("medical") or a.get("medical_flag")), "effect": adjustment_effect(a), "note": a.get("note"),
            "from": a.get("applies_from"), "until": a.get("applies_until"), "summary": a.get("summary"), "clamp": a.get("clamp")}


def _race_row(S, db, label, date, rtype, target, proj_ctl, verdict, note, ft, today):
    ft = ft or {}
    band = ft.get("band") or {}
    tdy = ft.get("today") or {}
    later = [c for c in ft.get("curve") or [] if c.get("plus_weeks")]
    if later and len({c["hms"] for c in ft.get("curve") or []}) <= 1:
        later = []
    return {"label": label, "date": date, "type": rtype, "target": target, "weeks": max(0, (S._date(date) - today).days // 7),
            "proj_ctl": proj_ctl, "verdict": verdict, "note": note,
            "finish": {"hms": ft.get("hms"), "s": ft.get("seconds"), "lo": band.get("lo_hms"), "hi": band.get("hi_hms"),
                       "lo_s": band.get("lo_seconds"), "hi_s": band.get("hi_seconds"), "level": band.get("level")} if ft.get("hms") else None,
            "later": [{"weeks": c["plus_weeks"], "hms": c["hms"]} for c in later],
            "now": ({"hms": tdy.get("hms"), "gain_s": tdy.get("gain_seconds")} if tdy.get("hms") else None),
            "anchor_stale_days": (ft.get("anchor_stale") or {}).get("age_days"), "ft_note": ft.get("note")}


def _plan_header(S, plan):
    sn = plan.get("seed_now") or {}
    rg = plan.get("regime") or {}
    sr = plan.get("shape_response") or {}
    stale = plan.get("engine_running") and plan.get("engine_version") and plan["engine_running"] != plan["engine_version"]
    seed = None
    if sn.get("moved"):
        was = sn.get("was") or {}
        seed = (f"Built from an older reading of your shape ({sn.get('was_from')}: fitness {was.get('ctl')}, fatigue {was.get('atl')}); "
                f"now fitness {sn.get('ctl')}, fatigue {sn.get('atl')} from {sn.get('from')}.")
    ride = (f"riding the full load ceiling" if (sr.get("factor") or 1) >= 1
            else f"easing the push — measured fitness {round((sr.get('factor') or 0) * 100)} % of projection")
    return {"generated_at": plan.get("generated_at"),
            "stale": (f"Built by an earlier version of the engine (v{plan.get('engine_version')}); generate the plan to re-read it on "
                      f"v{plan.get('engine_running')}.") if stale else None,
            "seed": seed,
            "posture": {"mode": rg.get("mode"), "label": "Assertive build" if rg.get("mode") == "assertive" else "Conservative",
                        "reason": rg.get("reason"), "ride": ride},
            "pace_note": plan.get("note"), "mode": plan.get("mode")}


def _session_line(S, x, tiso):
    """A log session's mark and actual, for the week list (Classic's logLine)."""
    mark = "extra" if x.get("unplanned") else "done" if x.get("done") else "missed" if x.get("missed") else \
        "today" if x["date"] == tiso else "ahead"
    return {"mark": mark, "activity_id": x.get("activity_id"), "reflection": x.get("reflection"),
            "component": x.get("component"),
            "moved_dow": _dow(S, x["moved_to"]) if x.get("moved_to") else None,
            "runs": [{"km": r.get("km"), "pace": r.get("pace"), "activity_id": r.get("activity_id")} for r in x.get("runs") or []]
                    if len(x.get("runs") or []) > 1 else []}


def plan_page(S, db, week=None, day=None):
    log = S.block_log(db)
    if not log:
        return {"ok": True, "empty": True, "today": datetime.now().date().isoformat()}
    row = db.execute("SELECT plan FROM plans ORDER BY id DESC LIMIT 1").fetchone()
    plan = json.loads(row["plan"])
    tiso = datetime.now().date().isoformat()
    zones = S.training_zones(db)
    weeks = log["weeks"]
    end = lambda w: (S._date(w["start"]) + timedelta(days=6)).isoformat()
    cur = next((w for w in weeks if w["start"] <= tiso <= end(w)), weeks[0])
    sel = next((w for w in weeks if w["start"] == week), None) or \
        next((w for w in weeks if day and w["start"] <= day <= end(w)), cur)
    road = []
    for w in weeks:
        ran = sum((x.get("actual") or {}).get("km") or 0 for x in w["sessions"])
        road.append({"start": w["start"], "phase": phase_key(w.get("pk")), "km": w.get("km"), "ran": round(ran, 1),
                     "current": w is cur, "selected": w is sel,
                     "race": any(x.get("race") for x in w["sessions"])})
    phases = []
    for r in road:
        if phases and phases[-1]["key"] == r["phase"]:
            phases[-1]["weeks"] += 1
        else:
            phases.append({"key": r["phase"], "name": phase_name(r["phase"]), "start": r["start"], "weeks": 1})
    obj = plan.get("objective") or {}
    ft = (plan.get("feasibility") or {}).get("finish_time") or {}
    i = weeks.index(sel)
    today_d = datetime.now().date()
    feas = plan.get("feasibility") or {}
    chain = plan.get("chain") or []
    if len(chain) > 1:
        races = [_race_row(S, db, c.get("label"), c["date"], c.get("type"), ((db.execute("SELECT target FROM objectives WHERE date=? AND status='upcoming' LIMIT 1", (c["date"],)).fetchone()
                             or {"target": None})["target"]),
                           c.get("proj_ctl"), c.get("feasibility"), c.get("feasibility_note"), c.get("finish_time"), today_d)
                 for c in chain if c.get("date")]
    elif obj.get("date"):
        races = [_race_row(S, db, obj.get("label"), obj["date"], obj.get("type"), obj.get("target"), feas.get("projected_ctl"),
                           feas.get("verdict"), feas.get("note"), ft, today_d)]
    else:
        races = []
    for r in road:
        r["flags"] = [{"label": next((c.get("label") for c in races if c["date"] == x["date"]), obj.get("label")),
                       "date": x["date"], "day": (S._date(x["date"]) - S._date(r["start"])).days}
                      for x in next(w for w in weeks if w["start"] == r["start"])["sessions"] if x.get("race")]
        r["frozen"] = bool(next(w for w in weeks if w["start"] == r["start"]).get("frozen"))
    tune = [{"label": t.get("label"), "date": t.get("date")} for t in plan.get("tune_ups") or []]
    return {"ok": True, "today": tiso, "header": _plan_header(S, plan), "adjustment": _adjustment(plan.get("adjustment")),
            "races": races, "tune_ups": tune,
            "race": {"label": obj.get("label"), "date": obj.get("date"), "type": obj.get("type"),
                     "target": obj.get("target"), "prediction": ft.get("hms"),
                     "lo": (ft.get("band") or {}).get("lo_hms"), "hi": (ft.get("band") or {}).get("hi_hms"),
                     "verdict": (plan.get("feasibility") or {}).get("verdict")} if obj else None,
            "road": road, "phases": phases,
            "week": {"start": sel["start"], "end": end(sel), "phase": phase_key(sel.get("pk")),
                     "phase_name": phase_name(sel.get("pk")), "n": sel.get("wk"), "km": sel.get("km"),
                     "intent": sel.get("intent"), "current": sel is cur,
                     "days": _week_days(S, sel, tiso), "held": limit_held(sel.get("limits")),
                     "limits": _limits_list(sel.get("limits")),
                     "sessions": [{**_session_detail(S, db, x, zones), **_session_line(S, x, tiso)} for x in sel["sessions"]],
                     "flags": week_flags(S, sel), "deload": deload_state(sel),
                     "proj_ctl": sel.get("proj_ctl"), "proj_acwr": sel.get("proj_acwr"),
                     "km_done": sel.get("km_done") if sel.get("partial") else None,
                     "km_ahead": sel.get("km_ahead") if sel.get("partial") else None,
                     "eq_km": sel.get("eq_km") if (sel.get("eq_km") or 0) > (sel.get("km") or 0) + 0.5 else None,
                     "frozen": bool(sel.get("frozen")), "runs": sel.get("runs"),
                     "status": "This week" if sel is cur else "Lived week" if end(sel) < tiso else "Planned week",
                     "prev": weeks[i - 1]["start"] if i > 0 else None,
                     "next": weeks[i + 1]["start"] if i + 1 < len(weeks) else None},
            "paces": [{"key": k, "label": {"easy": "Easy", "marathon": "Marathon", "threshold": "Threshold",
                                           "interval": "Interval", "lt1": "LT1 (easy ceiling)", "p5k": "5k"}.get(k, k),
                       "pace": (v or "").split("/")[0]}
                      for k, v in (plan.get("pace_zones") or {}).items() if k != "easy_top"]}


# ── Runs ──────────────────────────────────────────────────────────────────────────────────────
def activity_dict(db, aid):
    """The stored activity as the REST shape (its raw copy, or its columns when there is none)."""
    r = db.execute("SELECT id, date_time, date, sport, distance, duration, elapsed_time, hr_avg, hr_max, trimp, raw "
                   "FROM activities WHERE id=?", (aid,)).fetchone()
    if not r:
        return None
    try:
        a = json.loads(r["raw"] or "{}")
    except ValueError:
        a = {}
    return a or {"id": r["id"], "date_time": r["date_time"] or r["date"], "sport": {"name": r["sport"]},
                 "distance": r["distance"], "duration": r["duration"], "elapsed_time": r["elapsed_time"],
                 "hr_avg": r["hr_avg"], "hr_max": r["hr_max"], "trimp": r["trimp"]}


def run_page(S, db, aid):
    raw = activity_dict(db, aid)
    if not raw:
        return {"ok": False, "error": "No such run."}
    a = S._activity_payload(db, raw)
    st, _err = S._structure_cached(db, aid, date_iso=a.get("date"), fetch=not S.READONLY)
    ed = S.effort_discipline(db, window_days=3650) or {}
    er = next((x for x in ed.get("runs") or [] if x.get("date") == a.get("date")), {})
    dur = a.get("duration") or 0
    return {"ok": True, "id": aid, "date": a.get("date"), "title": a.get("title"), "sport": a.get("sport"),
            "stats": [{"k": "Distance", "v": f"{a['distance']:.2f} km" if a.get("distance") else None},
                      {"k": "Time", "v": f"{int(dur // 3600)}:{int(dur % 3600 // 60):02d}:{int(dur % 60):02d}" if dur else None},
                      {"k": "Pace", "v": f"{_pace((a.get('pace_min_km') or 0) * 60)}/km" if a.get("pace_min_km") else None},
                      {"k": "Avg HR", "v": f"{a['hr_avg']} bpm" if a.get("hr_avg") else None},
                      {"k": "Max HR", "v": f"{a['hr_max']} bpm" if a.get("hr_max") else None},
                      {"k": "Cadence", "v": f"{a['cadence']} spm" if a.get("cadence") else None},
                      {"k": "Ground contact", "v": f"{a['gct_ms']} ms" if a.get("gct_ms") else None},
                      {"k": "Vert. oscillation", "v": f"{a['vo_cm']} cm" if a.get("vo_cm") else None},
                      {"k": "Climb", "v": f"{a['elevation_up']} m" if a.get("elevation_up") else None},
                      {"k": "Load", "v": f"{a['trimp']} TRIMP" if a.get("trimp") else None}],
            "time": (a.get("date_time") or "")[11:16] or None, "ignored": bool(a.get("ignored")),
            "split": ({"index": a["sj"].get("index"), "parts": a["sj"].get("parts"), "km": a["sj"].get("km"), "min": a["sj"].get("min")}
                      if a.get("sj") else None),
            "readback": {"kind": (st or {}).get("kind_label"), "summary": (st or {}).get("summary"),
                         "rough": (st or {}).get("confidence") == "rough", "composite": (st or {}).get("n_parts") if (st or {}).get("composite") else None,
                         "strides": ((st or {}).get("sq") or {}).get("line")} if st and st.get("ok", True) else None,
            "verdict": er.get("verdict"), "verdict_text": VERDICT_TEXT.get(er.get("verdict") or "")}


# ── Body ──────────────────────────────────────────────────────────────────────────────────────
def marker_state(value, ref, good):
    """'ok' | 'watch' | None for a reading against its reference band ('band' / 'high' / 'low' good)."""
    lo, hi = (ref or [None, None])
    if value is None or (lo is None and hi is None):
        return None
    if lo is not None and value < lo:
        return "ok" if good == "low" else "watch"
    if hi is not None and value > hi:
        return "ok" if good == "high" else "watch"
    return "ok"


def body_page(S, db):
    rows = db.execute("SELECT marker, date, value FROM health_markers ORDER BY date ASC").fetchall()
    series = {}
    for r in rows:
        series.setdefault(r["marker"], []).append({"date": r["date"], "v": r["value"]})
    staleness = S.health_staleness({k: [{"date": p["date"], "value": p["v"]} for p in v] for k, v in series.items()}) or {}
    stale = staleness.get("markers", {})
    sm = staleness.get("summary") or {}
    cut = (datetime.now().date() - timedelta(days=365)).isoformat()
    out = []
    for key, m in S.MARKERS.items():
        pts = series.get(key) or []
        if not pts:
            continue
        last = pts[-1]
        out.append({"key": key, "label": m["label"], "unit": m.get("unit", ""), "value": last["v"],
                    "date": last["date"], "ref": m.get("ref"), "good": m.get("good"),
                    "state": marker_state(last["v"], m.get("ref"), m.get("good")),
                    "stale": bool((stale.get(key) or {}).get("stale")), "delta": _delta(pts, 30),
                    "stale_days": (stale.get(key) or {}).get("days"), "n": len(pts), "first": pts[0]["date"],
                    "series": pts, "recent": [p for p in pts if p["date"] >= cut][-120:]})
    group = lambda k: "sleep" if k.startswith("sleep") else "heart" if k in ("hrv", "resting_hr", "night_hr", "systolic") \
        else "weight" if k == "weight" else "labs"
    inj = []
    spec = S.SETTINGS_BY_KEY.get("injury_history")
    if spec:
        try:
            import sh_calibrate
            inj, _bad = sh_calibrate.parse_injuries(S._resolve_setting(db, spec)[0])
        except Exception:
            inj = []
    labels = {k: m["label"] for k, m in S.MARKERS.items()}
    banner = (f"⚠ Nightly data has stopped. Nothing since {sm.get('last')} — {sm.get('days')} days ago — for: "
              + ", ".join(labels.get(k, k) for k in sm.get("markers") or [])
              + ". The lab values below are unaffected. Check that the watch has synced to Runalyze.") if sm.get("markers") else None
    return {"ok": True, "markers": [{**x, "group": group(x["key"])} for x in out], "stopped": banner,
            "add": [{"key": k, "label": f"{m['label']} ({m.get('unit', '')})"} for k, m in S.MARKERS.items()],
            "injuries": [{"start": i["start"], "end": i.get("end"), "label": i.get("label")} for i in inj]}


# ── Settings ──────────────────────────────────────────────────────────────────────────────────
# Typed inputs for the settings that have a fixed set of answers (Classic shows free-text boxes).
CHOICES = {
    "units": [("km", "Kilometres"), ("mi", "Miles")],
    "week_start": [("", "Monday (default)"), ("sun", "Sunday"), ("sat", "Saturday")],
    "long_run_day": [("", "Default (last day of the week)")] + [(d, d.capitalize()) for d in
                     ("mon", "tue", "wed", "thu", "fri", "sat", "sun")],
    "max_runs_per_week": [("", "No cap")] + [(str(n), str(n)) for n in (3, 4, 5, 6)],
}
SETTING_GROUPS = [("Athlete", ["athlete_context", "athlete_age", "manual_lthr", "injury_history"]),
                  ("Week", ["week_start", "long_run_day", "rest_day_rank", "max_runs_per_week", "taper_weeks"]),
                  ("Display", ["units", "tz"]),
                  ("AI features", ["ai_narration", "ai_parsing", "ai_judgment", "ai_coach"]),
                  ("Links", ["house_url", "house_name", "private_url"])]


def settings_page(S, db):
    by = {}
    for spec in S.SETTINGS_SPEC:
        v, src = S._resolve_setting(db, spec)
        by[spec["key"]] = {"key": spec["key"], "label": spec["label"], "help": spec.get("help", ""),
                           "kind": "choice" if spec["key"] in CHOICES else spec.get("kind", "line"),
                           "choices": [{"v": a, "t": b} for a, b in CHOICES.get(spec["key"], [])],
                           "value": v or "", "source": src}
    for k, f in by.items():                          # a stored "Sunday" selects the "sun" choice
        vals = [c["v"] for c in f["choices"]]
        if vals and f["value"] not in vals:
            f["value"] = next((v for v in vals if v and f["value"].strip().lower().startswith(v)), f["value"])
    groups = [{"name": n, "fields": [by[k] for k in ks if k in by]} for n, ks in SETTING_GROUPS]
    known = {k for _, ks in SETTING_GROUPS for k in ks}
    groups.append({"name": "Other", "fields": [f for k, f in by.items() if k not in known]})   # any key added later
    return {"ok": True, "groups": [g for g in groups if g["fields"]]}


# ── The app frame: sync state, version, units, first-run steps, data-quality warnings ───────────
FIRST_RUN = [("token", "Connect Runalyze", "Paste your Runalyze API token in Settings → Connections."),
             ("history", "Pull your training history", "Sync once: the engine reads your runs and your current shape."),
             ("race", "Add your first race", "Add a race on the Plan page; the plan is built around it.")]


def shell_page(S, db):
    last = S.get_meta(db, "last_sync")
    age_h = None
    if last:
        try:
            age_h = (datetime.now(timezone.utc) - datetime.fromisoformat(last.replace("Z", "+00:00"))).total_seconds() / 3600
        except ValueError:
            age_h = None
    has_shape = S.latest_snapshot(db) is not None
    has_race = db.execute("SELECT 1 FROM objectives WHERE status IN ('upcoming','done','lapsed') LIMIT 1").fetchone() is not None
    done = {"token": bool(S.config().runalyze_token) or has_shape, "history": has_shape, "race": has_race}
    dups = S.find_duplicates(db) or []
    dup_rows = []
    if dups:
        qs = ",".join("?" * len(dups))
        dup_rows = [dict(r) for r in db.execute(f"SELECT id, date, distance FROM activities WHERE id IN ({qs}) ORDER BY date DESC", dups)]
    ignored = [dict(r) for r in db.execute("SELECT i.id, a.date, a.distance, i.reason FROM ignored_activities i "
                                           "LEFT JOIN activities a ON a.id = i.id ORDER BY a.date DESC")]
    return {"ok": True, "version": S.ENGINE_VERSION, "units": S._units_pref(db), "last_sync": last,
            "sync_hours": round(age_h, 1) if age_h is not None else None,
            "stale": age_h is None or age_h > S.SCHED_STALE_HOURS, "stale_hours": S.SCHED_STALE_HOURS,
            "llm": S.llm_available(), "ai": {k: S.ai_enabled(db, k) for k in ("narration", "parsing", "judgment")},
            "first_run": None if all(done.values()) else
                [{"key": k, "title": t, "text": x, "done": done[k]} for k, t, x in FIRST_RUN],
            "duplicates": dup_rows, "ignored": ignored}


def register(app, S):
    from flask import jsonify

    def private():
        if S.READONLY:
            return jsonify(ok=False, error="not available on the public view"), 403
        return None

    @app.post("/api/ui/adjust/propose")
    def api_ui_adjust_propose():
        """Classic's propose, plus the effect worded once (the same words the active banner uses)."""
        if private():
            return private()
        r = app.view_functions["api_adjustment_propose"]()
        resp, code = (r if isinstance(r, tuple) else (r, 200))
        d = resp.get_json() or {}
        a = d.get("directive") or {}
        if d.get("ok") and d.get("kind") != "log" and a:
            d.update(effect=adjustment_effect(a), medical_flag=bool(a.get("medical_flag")), applies_from=a.get("applies_from"),
                     applies_until=a.get("applies_until"), summary=a.get("summary"))
        return jsonify(d), code

    @app.get("/api/ui/shell")
    def api_ui_shell():
        return private() or jsonify(shell_page(S, S.get_db()))

    @app.get("/api/ui/today")
    def api_ui_today():
        return private() or jsonify(today_page(S, S.get_db()))

    @app.get("/api/ui/fitness")
    def api_ui_fitness():
        return private() or jsonify(fitness_page(S, S.get_db()))

    @app.get("/api/ui/plan")
    def api_ui_plan():
        from flask import request
        return private() or jsonify(plan_page(S, S.get_db(), request.args.get("week"), request.args.get("day")))

    @app.get("/api/ui/run/<int:aid>")
    def api_ui_run(aid):
        return private() or jsonify(run_page(S, S.get_db(), aid))

    @app.get("/api/ui/body")
    def api_ui_body():
        return private() or jsonify(body_page(S, S.get_db()))

    @app.get("/api/ui/settings")
    def api_ui_settings():
        return private() or jsonify(settings_page(S, S.get_db()))
