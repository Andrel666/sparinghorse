"""Fork §SEASON — this season against the athlete's past seasons, aligned on race day.

The athlete races the same event every year (a 10k or a half at the same time of year). A season is the run-up to
one of those races. Every season is read at the same distance from its race: on race eve, and at as many days out
as today is from this season's race. What is read is what the athlete's own races say tracks the result:
  · VO₂max — the 30-day mean of the runs' own VO₂max estimates (Runalyze's effective VO₂max is built from the same
    per-run values; today's reading uses Runalyze's own figure when a snapshot has it);
  · beats per km — average heart rate × minutes per km, the median over the last 28 days of runs of 4 km or more
    (fewer beats for the same km: more running per heartbeat);
  · weekly km, the longest run, fitness (CTL).
Races come from the engine's own race corpus (Runalyze race tags, marathons by distance, resolved objectives), so a
race is what the athlete called a race, never a guess from a distance. Each race is put on one scale with Daniels'
VDOT (the engine's own construction), so a 10k and a half compare.

The personal-history check: on race eve a race's VDOT sits a fairly constant gap below the VO₂max of the 30 days
before it (the endurance the distance costs). That gap, measured on the athlete's own races of the goal's distance,
turned onto today's VO₂max, says what the athlete's history predicts — beside the engine's model, which projects the
plan's fitness and can reach past any fitness the athlete has raced at.
"""
import json
import math
import statistics as st
from datetime import date, datetime, timedelta

import sh_engine as E

SEASON_TYPES = ("10k", "half")      # the distances a season can end on
SEASON_WINDOW_DAYS = 21             # a race within this of the goal race's day of the year starts a season
SEASON_SPAN_DAYS = 182              # how far back each season's lines go
SEASON_STEP_DAYS = 7                # one point a week on the lines
VO2_WINDOW_DAYS = 30                # the VO₂max mean (Runalyze's effective VO₂max window)
BPK_WINDOW_DAYS = 28                # the beats-per-km median
BPK_MIN_KM = 4.0                    # shorter runs are mostly warm-up
GAP_MIN_RACES = 2                   # races of the goal's distance needed before its own gap is used
SIGNAL_DAYS = 120                   # Today's sparklines


def race_vdot(km, seconds):
    """Daniels' VDOT of a race: the VO₂ cost of its speed over the fraction of VO₂max that duration holds."""
    if not km or not seconds:
        return None
    t = seconds / 60.0
    v = km * 1000.0 / t
    p = 0.8 + 0.1894393 * math.exp(-0.012778 * t) + 0.2989558 * math.exp(-0.1932605 * t)
    return E._vo2_at_v(v) / p


def hms(sec):
    if sec is None:
        return None
    s = int(round(sec))
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def _runs(S, db):
    drop = S.dropped_ids(db)
    out = []
    for r in db.execute("SELECT id, date, distance, duration, hr_avg, raw FROM activities WHERE " + E.RUN_FAMILY_SQL +
                        " AND distance > 0 AND duration > 0 AND date IS NOT NULL ORDER BY date").fetchall():
        if r["id"] in drop:
            continue
        try:
            j = json.loads(r["raw"] or "{}")
        except (ValueError, TypeError):
            j = {}
        vo2 = j.get("vo2max") if j.get("use_vo2max", True) else None
        bpk = (r["hr_avg"] * r["duration"] / 60.0 / r["distance"]) if r["hr_avg"] and r["distance"] >= BPK_MIN_KM else None
        out.append({"id": r["id"], "date": r["date"], "km": r["distance"], "vo2": vo2, "bpk": bpk})
    return out


def state_at(runs, hist, day):
    """The season signals on `day` (end of day), from the runs before it and the fitness curve."""
    d = day.isoformat()
    win = lambda n: [r for r in runs if (day - timedelta(days=n - 1)).isoformat() <= r["date"] <= d]
    vo = [r["vo2"] for r in win(VO2_WINDOW_DAYS) if r["vo2"]]
    bp = [r["bpk"] for r in win(BPK_WINDOW_DAYS) if r["bpk"]]
    r28, r84 = win(28), win(84)
    h = hist.get(d) or {}
    return {"vo2": round(st.mean(vo), 1) if vo else None,
            "bpk": round(st.median(bp)) if bp else None,
            "km_week": round(sum(r["km"] for r in r28) / 4, 1),
            "km_week_12": round(sum(r["km"] for r in r84) / 12, 1),
            "long_12": round(max([r["km"] for r in r84] or [0.0]), 1),
            "ctl": round(h["ctl"], 1) if h.get("ctl") is not None else None}


def season_races(db, goal_date, goal_type=None):
    """One race per past season: a 10k or half from the race corpus within SEASON_WINDOW_DAYS of the goal race's day
    of the year, the closest one when a season has several. Oldest first."""
    if not goal_date:
        return []
    g = E._date(goal_date)
    by_season = {}
    for r in E._ft_race_corpus(db):
        if r["type"] not in SEASON_TYPES or r["date"] >= goal_date:
            continue
        d = E._date(r["date"])
        # the goal race's nearest anniversary: its year names the season
        ann = min((_anniversary(g, y) for y in (d.year - 1, d.year, d.year + 1)), key=lambda a: abs((d - a).days))
        off = abs((d - ann).days)
        if off > SEASON_WINDOW_DAYS:
            continue
        season = ann.year
        cur = by_season.get(season)
        if cur is None or off < cur[0]:
            by_season[season] = (off, r)
    return [dict(r, season=s) for s, (_, r) in sorted(by_season.items())]


def _anniversary(g, year):
    try:
        return g.replace(year=year)
    except ValueError:                       # 29 Feb in a common year
        return g.replace(year=year, day=28)


def _corr(a, b):
    pairs = [(x, y) for x, y in zip(a, b) if x is not None and y is not None]
    if len(pairs) < 3:
        return None
    xs, ys = zip(*pairs)
    mx, my = st.mean(xs), st.mean(ys)
    den = math.sqrt(sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys))
    return round(sum((x - mx) * (y - my) for x, y in pairs) / den, 2) if den else None


def current_vo2(db, runs, today):
    """Today's VO₂max: Runalyze's own effective VO₂max when a recent snapshot has it, else the runs' 30-day mean."""
    try:
        row = db.execute("SELECT snapshot_date, effective_vo2max FROM shape_snapshots WHERE effective_vo2max IS NOT NULL "
                         "ORDER BY snapshot_date DESC LIMIT 1").fetchone()
    except Exception:
        row = None
    if row and (today - E._date(row["snapshot_date"])).days <= 3:
        return round(float(row["effective_vo2max"]), 1), "runalyze"
    return state_at(runs, {}, today)["vo2"], "runs"


def seasons(S, db, today=None, objective=None, plan=None):
    """The Seasons view: every past season read like this one, the lines on this season's calendar, what tracked the
    results, and the personal-history check of the prediction."""
    today = today or datetime.now().date()
    obj = objective or {}
    goal_date, goal_type = obj.get("date"), (obj.get("type") or "").lower()
    races = season_races(db, goal_date, goal_type)
    if not goal_date or not races:
        return {"ok": True, "seasons": [], "reason": ("No race on the plan." if not goal_date else
                                                      "No past race near this time of year to compare with.")}
    g = E._date(goal_date)
    days_out = (g - today).days
    runs = _runs(S, db)
    hist = {p["date"]: p for p in S.reconstruct_history(db, end=today.isoformat()) or []}
    out = []
    for r in races:
        rd = E._date(r["date"])
        vd = race_vdot(E.RACE_KM[r["type"]], r["seconds"])
        eve, now = state_at(runs, hist, rd - timedelta(days=1)), state_at(runs, hist, rd - timedelta(days=days_out))
        series = []
        for k in range(SEASON_SPAN_DAYS // SEASON_STEP_DAYS, -1, -1):
            off = k * SEASON_STEP_DAYS + 1
            s_ = state_at(runs, hist, rd - timedelta(days=off))
            series.append({"date": (g - timedelta(days=off)).isoformat(), **{x: s_[x] for x in ("vo2", "bpk", "km_week", "ctl")}})
        out.append({"season": r["season"], "date": r["date"], "type": r["type"], "time": hms(r["seconds"]),
                    "seconds": r["seconds"], "vdot": round(vd, 1) if vd else None,
                    "equivalent": hms(E._ft_daniels_time(vd, goal_type)) if vd and goal_type in E.RACE_KM else None,
                    "gap": round(vd - eve["vo2"], 1) if vd and eve["vo2"] else None,
                    "eve": eve, "same_point": now, "series": series})
    # this season: the same lines up to today
    cur_series = []
    for k in range(SEASON_SPAN_DAYS // SEASON_STEP_DAYS, -1, -1):
        dd = g - timedelta(days=k * SEASON_STEP_DAYS + 1)
        if dd > today:
            continue
        s_ = state_at(runs, hist, dd)
        cur_series.append({"date": dd.isoformat(), **{x: s_[x] for x in ("vo2", "bpk", "km_week", "ctl")}})
    cur = state_at(runs, hist, today)
    vo2_now, vo2_src = current_vo2(db, runs, today)
    cur["vo2"] = vo2_now if vo2_now is not None else cur["vo2"]
    # what tracked the results: each race-eve signal against the race's VDOT
    vds = [x["vdot"] for x in out]
    tracked = [{"key": k, "label": lab, "r": _corr(vds, [x["eve"][k] for x in out]), "better": better}
               for k, lab, better in (("vo2", "VO₂max", "higher"), ("bpk", "Beats per km", "lower"),
                                      ("km_week_12", "Weekly km (12 weeks)", "higher"),
                                      ("long_12", "Longest run (12 weeks)", "higher"), ("ctl", "Fitness (CTL)", "higher"))]
    tracked = [dict(t, text=_tracked_words(t["label"], t["r"], t["better"])) for t in tracked if t["r"] is not None]
    return {"ok": True, "race": {"date": goal_date, "type": goal_type, "label": obj.get("label"), "days_out": days_out},
            "now": {**cur, "vo2_source": vo2_src, "series": cur_series},
            "seasons": out, "tracked": tracked, "n_with_data": sum(1 for x in out if x["eve"]["vo2"]),
            "check": history_check(out, goal_type, vo2_now, obj.get("target"), plan)}


def _time_at(vo2, gap, typ):
    return E._ft_daniels_time(vo2 + gap, typ) if vo2 and gap is not None else None


def history_check(rows, goal_type, vo2_now, target=None, plan=None):
    """What the athlete's own races predict at today's VO₂max, beside the model. The gap of the goal's distance
    (its own races, GAP_MIN_RACES or more) is the expected case; the gap of the other distance, when it is smaller,
    is the case where the race holds its VO₂max as well as the shorter races did. Also the VO₂max the goal needs
    on race eve at the expected gap, and whether the plan's race-day fitness lies past every fitness raced at."""
    gaps = {}
    for x in rows:
        if x["gap"] is not None:
            gaps.setdefault(x["type"], []).append(x["gap"])
    if goal_type not in E.RACE_KM or not vo2_now or not gaps:
        return None
    own = gaps.get(goal_type) or []
    all_g = [v for vs in gaps.values() for v in vs]
    expected = st.mean(own) if len(own) >= GAP_MIN_RACES else st.mean(all_g)
    best_gap = max(st.mean(vs) for vs in gaps.values())          # the smallest cost any distance showed
    out = {"vo2": vo2_now, "gap": round(expected, 1), "gap_n": len(own) if len(own) >= GAP_MIN_RACES else len(all_g),
           "gap_basis": goal_type if len(own) >= GAP_MIN_RACES else "all",
           "expected": hms(_time_at(vo2_now, expected, goal_type)),
           "best_case": hms(_time_at(vo2_now, best_gap, goal_type)) if best_gap > expected + 0.05 else None,
           "best_gap": round(best_gap, 1), "gaps": {k: round(st.mean(v), 1) for k, v in gaps.items()}}
    gs = _parse_hms(target)
    if gs:
        lo, hi = 20.0, 80.0                      # the race-eve VO₂max whose expected time meets the goal
        for _ in range(60):
            m = (lo + hi) / 2
            t = _time_at(m, expected, goal_type)
            lo, hi = (m, hi) if t and t > gs else (lo, m)
        out["goal"] = target
        out["vo2_for_goal"] = round(hi, 1)
    ft = ((plan or {}).get("feasibility") or {}).get("finish_time") or {}
    if ft.get("hms"):
        out["model"] = ft.get("hms")
    eves = [(x.get("eve") or {}).get("ctl") for x in rows]
    eves = [c for c in eves if c is not None]
    fr = ((plan or {}).get("feasibility") or {}).get("projected_ctl")
    if eves:
        out["ctl_raced"] = [round(min(eves)), round(max(eves))]
    if fr:
        out["ctl_plan"] = round(fr)
    out["summary"] = _check_words(out, goal_type, gaps)
    return out


TYPE_PLURAL = {"10k": "10ks", "half": "halves", "5k": "5ks", "marathon": "marathons"}


def _check_words(c, goal_type, gaps):
    best_type = max(gaps, key=lambda k: st.mean(gaps[k]))
    head = (f"At your VO₂max today ({c['vo2']:g}), your past "
            f"{TYPE_PLURAL.get(goal_type, 'races') if c['gap_basis'] == goal_type else 'races'} say {c['expected']}")
    if c.get("best_case"):
        head += f", {c['best_case']} if this race holds your VO₂max as well as your {TYPE_PLURAL.get(best_type, best_type)} did"
    out = [head + "."]
    if c.get("vo2_for_goal"):
        out.append(f"The goal {c['goal']} needs about {c['vo2_for_goal']:g} on race eve.")
    lo_hi = c.get("ctl_raced")
    if c.get("model") and c.get("ctl_plan") and lo_hi and c["ctl_plan"] > lo_hi[1]:
        out.append(f"The model's {c['model']} counts on fitness {c['ctl_plan']} on race day; your races were run at "
                   f"{lo_hi[0]}–{lo_hi[1]}.")
    return " ".join(out)


def _tracked_words(label, r, better):
    word = "strong" if abs(r) >= 0.7 else "some" if abs(r) >= 0.4 else "none"
    good = (r > 0) == (better == "higher")
    if word == "none":
        return f"{label}: no link to your race results (r {r:+.2f})"
    return f"{label}: {word} link (r {r:+.2f}), {'the ' + better + ', the faster you raced' if good else 'the opposite way to what you would expect'}"


def _parse_hms(t):
    if not t:
        return None
    try:
        p = [int(x) for x in str(t).strip().split(":")]
    except ValueError:
        return None
    if len(p) == 2:                          # H:MM for the long races
        return p[0] * 3600 + p[1] * 60
    if len(p) == 3:
        return p[0] * 3600 + p[1] * 60 + p[2]
    return None


def today_signals(S, db, today=None, objective=None):
    """Today's two training signals, as Recovery-style rows: VO₂max and beats per km, each with its last
    SIGNAL_DAYS and the athlete's own reference (the best race eves; the VO₂max the goal needs)."""
    today = today or datetime.now().date()
    runs = _runs(S, db)
    if not runs:
        return []
    obj = objective or {}
    races = season_races(db, obj.get("date"), (obj.get("type") or "").lower())
    hist = {}
    eves = []
    for r in races:
        e = state_at(runs, hist, E._date(r["date"]) - timedelta(days=1))
        vd = race_vdot(E.RACE_KM[r["type"]], r["seconds"])
        if vd:
            eves.append((vd, r, e))
    best = sorted(eves, key=lambda x: -x[0])[:2]
    vo_series, bp_series = [], []
    days = sorted({today - timedelta(days=k) for k in range(0, SIGNAL_DAYS + 1, SEASON_STEP_DAYS // 2 or 1)})
    for d in days:                           # a point every few days, the last one today
        s_ = state_at(runs, hist, d)
        if s_["vo2"] is not None:
            vo_series.append({"date": d.isoformat(), "v": s_["vo2"]})
        if s_["bpk"] is not None:
            bp_series.append({"date": d.isoformat(), "v": s_["bpk"]})
    now = state_at(runs, hist, today)
    vo2, src = current_vo2(db, runs, today)
    if vo_series and vo2 is not None:
        vo_series[-1] = {"date": today.isoformat(), "v": vo2}
    chk = history_check([{"type": r["type"], "gap": round(vd - e["vo2"], 1) if e["vo2"] else None}
                         for vd, r, e in eves], (obj.get("type") or "").lower(), vo2, obj.get("target")) if eves else None
    out = []
    if vo2 is not None:
        ref = [f"{e['vo2']:g} on the eve of your {r['season']} race" for vd, r, e in best if e["vo2"]]
        sub = " · ".join(x for x in [
            ("Runalyze's effective VO₂max" if src == "runalyze" else "30-day mean of your runs"),
            f"goal needs ≈{chk['vo2_for_goal']:g} on race eve" if chk and chk.get("vo2_for_goal") else None,
            f"best: {ref[0]}" if ref else None] if x)
        out.append({"key": "vo2max", "label": "VO₂max", "value": f"{vo2:g}", "unit": "", "sub": sub,
                    "state": ("ok" if chk and chk.get("vo2_for_goal") and vo2 >= chk["vo2_for_goal"] else None),
                    "series": vo_series, "link": "/goal#seasons"})
    if now["bpk"] is not None:
        bb = [e["bpk"] for vd, r, e in best if e["bpk"]]
        sub = " · ".join(x for x in ["median of the last 4 weeks, runs of 4 km+",
                                     f"your best races came at {min(bb)}–{max(bb)}" if len(bb) >= 2 else
                                     (f"your best race came at {bb[0]}" if bb else None)] if x)
        out.append({"key": "beats_per_km", "label": "Beats per km", "value": f"{now['bpk']}", "unit": "beats",
                    "sub": sub, "state": ("ok" if bb and now["bpk"] <= max(bb) else None),
                    "series": bp_series, "link": "/goal#seasons"})
    return out
