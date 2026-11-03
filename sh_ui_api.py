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


def today_page(S, db):
    today = datetime.now().date()
    tiso = today.isoformat()
    rd = S.today_readiness(db) or {}
    a = rd.get("assessment") or {}
    sess = rd.get("session") or {}
    zones = S.training_zones(db)
    kind = sess.get("kind") or "rest"
    session = {"kind": kind, "title": KIND_TITLE.get(kind, kind), "km": sess.get("km"),
               "minutes": sess.get("minutes"), "note": sess.get("note"), "done": bool(sess.get("done")),
               "actual": sess.get("actual"), "race": bool(sess.get("race")),
               "target": session_target(S, db, kind, zones), "steps": workout_steps(sess),
               "phase": sess.get("pk"), "week": sess.get("week")}
    # the current week, from the log (planned + what was run, already merged there)
    week = None
    log = S.block_log(db)
    if log:
        cur = [w for w in log["weeks"] if w["start"] <= tiso <= (S._date(w["start"]) + timedelta(days=6)).isoformat()]
        if cur:
            w = cur[0]
            days = _week_days(S, w, tiso)
            week = {"start": w["start"], "phase": w.get("pk"), "km": w.get("km"),
                    "runs": sum(1 for d in days if d["kind"] != "rest" and d["status"] != "extra"),
                    "days": days, "held": limit_held(w.get("limits"))}
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
        race = {"label": obj.get("label"), "date": obj["date"], "type": obj.get("type"),
                "days": (S._date(obj["date"]) - today).days, "target": obj.get("target")}
    return {"ok": True, "today": tiso, "sync_minutes": sync_min, "race": race,
            "readiness": {"verdict": a.get("verdict"), "halt": bool(a.get("halt")), "action": a.get("action"),
                          "headline": split_action(a.get("action"))[0], "detail": split_action(a.get("action"))[1],
                          "reasons": a.get("reasons") or [], "hrv": (a.get("hrv") or {}).get("state"),
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
         "delta": _delta(ctl), "series": ctl, "hint": "the 6-week training load your body is used to"},
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
    weekly = [{"week": w["week"], "km": w["km"]} for w in (S.db_weekly_running() or [])][-26:]
    zones = S.training_zones(db)
    ed = S.effort_discipline(db) or {}
    c = ed.get("easy_counts") or {}
    easy = {"score": ed.get("easy_score"), "window_days": ed.get("window_days"), "judged": c.get("judged"),
            "on": c.get("on"), "hot": c.get("hot"), "too_hard": c.get("too_hard"),
            "by": "heart rate" if ed.get("anchor") == "lthr" else "pace",
            "ceiling": (f"≤ {ed['easy_hr_ceiling']} bpm" if ed.get("anchor") == "lthr" and ed.get("easy_hr_ceiling")
                        else f"slower than {ed.get('easy_pace_ceiling')}/km" if ed.get("easy_pace_ceiling") else None),
            "runs": [{"date": r["date"], "kind": KIND_TITLE.get(r.get("kind"), r.get("kind")), "km": r.get("km"),
                      "pace": _pace(r.get("gap_pace")), "hr": r.get("hr_avg"), "verdict": r.get("verdict"),
                      "verdict_text": VERDICT_TEXT.get(r.get("verdict") or "", r.get("verdict"))}
                     for r in (ed.get("runs") or [])[:8]]}
    du = S.durability_signal(db) or {}
    ef = S.efficiency_signal(db, window_days=S.EFFICIENCY_WINDOW_D) or {}
    tr = S.track_record(db) or {}
    side = {
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
            "chart": {"ctl": ctl, "atl": atl}, "weekly": weekly,
            "zones": [{"label": r["label"], "pace": ((r.get("pace_slower_than") or {}).get("fmt") and f"slower than {r['pace_slower_than']['fmt']}")
                       or (r.get("pace_target") or {}).get("fmt"),
                       "hr": r.get("hr")} for r in zones.get("rows", [])],
            "easy": easy, **side}


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
                        "unit": v.get("unit", ""), "holds": limits.get("binding") == k,
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


def plan_page(S, db, week=None, day=None):
    log = S.block_log(db)
    if not log:
        return {"ok": False, "error": "No plan yet — generate one in Classic first."}
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
    return {"ok": True, "today": tiso,
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
                     "sessions": [_session_detail(S, db, x, zones) for x in sel["sessions"]],
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
                      {"k": "Climb", "v": f"{a['elevation_up']} m" if a.get("elevation_up") else None},
                      {"k": "Load", "v": f"{a['trimp']} TRIMP" if a.get("trimp") else None}],
            "readback": {"kind": (st or {}).get("kind_label"), "summary": (st or {}).get("summary")} if st else None,
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
    stale = (S.health_staleness({k: [{"date": p["date"], "value": p["v"]} for p in v] for k, v in series.items()})
             or {}).get("markers", {})
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
                    "series": [p for p in pts if p["date"] >= cut][-120:]})
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
    return {"ok": True, "markers": [{**x, "group": group(x["key"])} for x in out],
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
                  ("Display", ["units"]),
                  ("AI features", ["ai_narration", "ai_parsing", "ai_judgment", "ai_coach"])]


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
    return {"ok": True, "groups": [g for g in groups if g["fields"]]}


def register(app, S):
    from flask import jsonify

    def private():
        if S.READONLY:
            return jsonify(ok=False, error="not available on the public view"), 403
        return None

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
