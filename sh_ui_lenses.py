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
    before = next((r for r in reversed(plans) if r["for_date"] <= act["date"]), None)
    after = next((r for r in plans if r["for_date"] > act["date"]), None)
    pb = json.loads(before["plan"]) if before else {}
    pa = json.loads(after["plan"]) if after else {}
    cur = json.loads(plans[-1]["plan"]) if plans else {}
    obj = cur.get("objective") or {}
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
    elif sb:
        goal["settles"] = "The prediction settles with the next plan (tonight's run of the engine)."
    # — next: the next session, and what the plan changed after this run —
    ahead = sorted((x for x in sessions if x["date"] > act["date"] and not x.get("unplanned") and x.get("km")
                    and not x.get("done")), key=lambda x: x["date"])
    nxt = ahead[0] if ahead else None
    changed = []
    if pb and pa:
        d = S.diff_plans(pb, pa) or {}
        changed = [c for c in d.get("changes") or [] if not c.startswith("The plan already matched")][:3]
    return {"ok": True, "id": aid, "date": act["date"], "headline": headline, "tone": tone, "asked": asked, "did": did,
            "checks": checks, "cost": cost, "goal": goal,
            "next": ({"date": nxt["date"], "dow": U._dow(S, nxt["date"]), "title": U.KIND_TITLE.get(nxt.get("kind"), nxt.get("kind")),
                      "km": nxt.get("km"), "target": U.session_target(S, db, nxt.get("kind"), zones)} if nxt else None),
            "changed": changed, "plan_reacted": bool(changed)}


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
                        "useful": rm < 100, "link": "/goal#endurance"})
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
        out.append({"key": "consistency", "title": "run every planned session",
                    "effect": f"{ad.get('done', 0)} of {ad['scheduled']} so far this block; the prediction assumes the laid build completes",
                    "gain": None, "modelled": False, "useful": ad.get("done", 0) < ad["scheduled"], "link": "/road"})
    return rank_levers(out)


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
