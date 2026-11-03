"""Fork §CAL — fit the engine's per-athlete constants from the athlete's own history.

The engine's load and safety numbers were fitted to ONE runner (see the "calibrated on my corpus"
notes beside each constant in sh_engine). This module re-runs those same fits on whoever's history
is in the database and PROPOSES values; nothing changes until the athlete approves the proposal,
and deleting it restores the defaults.

Rules every fit follows:
  • A MEASUREMENT may move both ways (the TRIMP price of an easy minute is a property of this
    athlete's heart-rate response, not a safety call).
  • A SAFETY LIMIT may only TIGHTEN on its own evidence, and may loosen only inside a narrow band
    and only when the athlete has listed their injuries — "no injury on record" is not evidence of
    safety when nobody was asked.
  • Every value is clamped to `sh_engine.CALIBRATION_BOUNDS`, and the report shows the evidence:
    sample counts, the percentile used, and which past weeks/injuries change verdict.

Fits:
  trimp_scale   — median TRIMP per minute of easy runs ÷ the engine's 1.65 easy rung (last 365 days,
                  all history when that has too few runs). Scales every TRIMP rung.
  BIO_EQ_STEP   — the per-session impact step (§PRO17): each run's eq-km against the largest of the
                  trailing 30 days; the quantile the engine's own calibration used (refuse 1.49 %).
                  Tightened so the largest step in the 21 days before a listed injury is refused.
  CTL_RAMP_MAX  — p90 of the athlete's weekly CTL gains outside the 4 weeks before an injury;
                  tighten-only without an injury list.
  ACWR_HARD/SOFT — tighten-only: with ≥ 2 listed injuries whose 21-day pre-injury ACWR peaks sat
                  below the default ceiling, the ceiling moves to just under their median.
"""
import json
import math
import re
import statistics
from datetime import date, datetime, timedelta, timezone

import sh_engine as E

CAL_META_KEY = "calibration"
FIT_VERSION = 1
EASY_MIN_RUNS = 30            # fewer easy runs than this in the last year ⇒ use all history
EASY_MIN_SEC = 20 * 60        # a shorter run's TRIMP/min is dominated by the HR climb at the start
EASY_PACE_MARGIN = 1.04       # "easy" = slower than marathon pace by at least 4 %
SESSION_REFUSE_SHARE = 0.0149  # the share of sessions the engine's own 1.30 refuses on its corpus
SESSION_WINDOW_DAYS = 30
PRE_INJURY_DAYS = 21
RAMP_EXCLUDE_WEEKS = 4
CTL_MIN_READ = 20.0           # ACWR/ramp below this CTL is ratio noise
MIN_SESSIONS = 300            # a 98.5th percentile needs a few hundred samples to mean anything
MIN_RAMP_WEEKS = 26
MIN_INJURIES_FOR_ACWR = 2
GAP_MIN_DAYS = 14             # breaks this long are surfaced for the athlete to label


# ── injuries ────────────────────────────────────────────────────────────────────────────────────
_DATE = r"(\d{4}-\d{2}-\d{2})"


def parse_injuries(text):
    """Lines like '2023-03-10 to 2023-04-20 calf strain', '2021-06-01..2021-06-30 knee',
    '2019-09-15 6w achilles' or '2019-09-15 achilles'. Returns (injuries, errors): each injury is
    {start, end|None, label}; `errors` names lines that carry no ISO start date."""
    out, errs = [], []
    for i, raw in enumerate((text or "").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(_DATE + r"\s*(?:(?:to|–|—|-|\.\.)\s*" + _DATE + r")?\s*[:,]?\s*(.*)$", line)
        if not m:
            errs.append(f"line {i}: no YYYY-MM-DD start date — {line[:60]!r}")
            continue
        start, end, rest = m.group(1), m.group(2), (m.group(3) or "").strip()
        try:
            d0 = date.fromisoformat(start)
            d1 = date.fromisoformat(end) if end else None
        except ValueError:
            errs.append(f"line {i}: not a real date — {line[:60]!r}")
            continue
        w = re.match(r"(\d+)\s*(w|wk|wks|weeks?|d|days?)\b\s*(.*)$", rest, re.I)
        if w and not d1:
            n = int(w.group(1))
            d1 = d0 + timedelta(days=n * (7 if w.group(2).lower().startswith("w") else 1))
            rest = w.group(3).strip()
        if d1 and d1 < d0:
            errs.append(f"line {i}: ends before it starts")
            continue
        out.append({"start": d0.isoformat(), "end": d1.isoformat() if d1 else None,
                    "label": rest[:80] or "injury"})
    out.sort(key=lambda x: x["start"])
    return out, errs


# ── history reads ───────────────────────────────────────────────────────────────────────────────
def _runs(db):
    """Every owned run, oldest first: {id, date, km, sec, trimp, gap_pace}."""
    drop = E.dropped_ids(db)
    rows = db.execute("SELECT id, date, distance, duration, trimp, raw FROM activities "
                      "WHERE date IS NOT NULL AND date != '' AND " + E.RUN_FAMILY_SQL +
                      " ORDER BY date, id").fetchall()
    out = []
    for r in rows:
        if r["id"] in drop or not r["distance"]:
            continue
        try:
            raw = json.loads(r["raw"] or "{}")
        except ValueError:
            raw = {}
        gap = raw.get("gap")
        gap_pace = (round(3600.0 / gap) if gap else
                    (round(r["duration"] / r["distance"]) if r["duration"] else None))
        out.append({"id": r["id"], "date": r["date"][:10], "km": float(r["distance"]),
                    "sec": float(r["duration"] or 0), "trimp": r["trimp"], "gap_pace": gap_pace})
    return out


class _ZonesByMonth:
    """`_zones_asof` is one query per call; history replays read it per run. Month grain is finer
    than the snapshot cadence that moves it."""

    def __init__(self, db):
        self.db, self.cache = db, {}

    def __call__(self, d):
        k = d[:7]
        if k not in self.cache:
            self.cache[k] = E._zones_asof(self.db, d) or {}
        return self.cache[k]


def _quantile(xs, q):
    xs = sorted(xs)
    if not xs:
        return None
    pos = q * (len(xs) - 1)
    lo, hi = math.floor(pos), math.ceil(pos)
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def _clamp(key, v):
    lo, hi = E.CALIBRATION_BOUNDS[key]
    return round(min(hi, max(lo, v)), 3)


def _in_pre_injury(d, injuries, days):
    dd = date.fromisoformat(d)
    for inj in injuries:
        s = date.fromisoformat(inj["start"])
        if s - timedelta(days=days) <= dd < s:
            return True
    return False


def _in_injury(d, injuries):
    dd = date.fromisoformat(d)
    for inj in injuries:
        s = date.fromisoformat(inj["start"])
        e = date.fromisoformat(inj["end"]) if inj.get("end") else s + timedelta(days=28)
        if s <= dd <= e:
            return True
    return False


# ── fits ────────────────────────────────────────────────────────────────────────────────────────
def fit_trimp_scale(runs, zones_at, today):
    default = E.CALIBRATION_DEFAULTS["TRIMP_PER_MIN"]["easy"]
    def easy(rs):
        out = []
        for r in rs:
            z = zones_at(r["date"])
            if (not r["trimp"] or r["sec"] < EASY_MIN_SEC or not r["gap_pace"] or not z.get("marathon")
                    or r["gap_pace"] < z["marathon"] * EASY_PACE_MARGIN):
                continue
            out.append(r["trimp"] / (r["sec"] / 60.0))
        return out
    cut = (today - timedelta(days=365)).isoformat()
    recent = easy([r for r in runs if r["date"] >= cut])
    sample, window = (recent, "last 365 days") if len(recent) >= EASY_MIN_RUNS else (easy(runs), "all history")
    if len(sample) < EASY_MIN_RUNS:
        return {"key": "trimp_scale", "default": 1.0, "fitted": None, "value": 1.0, "kind": "measurement",
                "status": "insufficient", "basis": f"{len(sample)} easy runs with TRIMP (need {EASY_MIN_RUNS})"}
    med = statistics.median(sample)
    raw = med / default
    val = _clamp("trimp_scale", raw)
    if abs(val - 1.0) < 0.02:                     # inside the measurement's own noise ⇒ keep the default
        val = 1.0
    return {"key": "trimp_scale", "default": 1.0, "fitted": round(raw, 3), "value": val,
            "kind": "measurement", "status": "fitted" if val != 1.0 else "unchanged",
            "basis": (f"median {med:.2f} TRIMP/min over {len(sample)} easy runs ({window}) vs the "
                      f"engine's {default}; p25–p75 {_quantile(sample, .25):.2f}–{_quantile(sample, .75):.2f}"),
            "effect": (f"the plan's minutes cost {val:.2f}× the default load: at the same weekly load the "
                       f"plan lays {1 / val:.0%} of the default kilometres" if val != 1.0 else None)}


def fit_session_step(runs, zones_at, injuries):
    default = E.CALIBRATION_DEFAULTS["BIO_EQ_STEP"]
    eqs = [(r["date"], E._run_eq_km(r["km"], r["gap_pace"], zones_at(r["date"]))) for r in runs]
    ratios, pre = [], []
    for i, (d, eq) in enumerate(eqs):
        dd = date.fromisoformat(d)
        lo = (dd - timedelta(days=SESSION_WINDOW_DAYS)).isoformat()
        prior = [e for (pd, e) in eqs[:i] if lo <= pd < d]
        if not prior or max(prior) <= 0 or _in_injury(d, injuries):
            continue
        r = eq / max(prior)
        ratios.append(r)
        if _in_pre_injury(d, injuries, PRE_INJURY_DAYS):
            pre.append((d, r))
    if len(ratios) < MIN_SESSIONS:
        return {"key": "BIO_EQ_STEP", "default": default, "fitted": None, "value": default,
                "kind": "safety", "status": "insufficient",
                "basis": f"{len(ratios)} sessions with a 30-day baseline (need {MIN_SESSIONS})"}
    q = _quantile(ratios, 1.0 - SESSION_REFUSE_SHARE)
    val, why = q, f"the {100 * (1 - SESSION_REFUSE_SHARE):.2f}th percentile of {len(ratios)} session steps"
    caught = []
    if injuries:
        # every listed injury's largest pre-injury step must be refused by the value
        by_inj = {}
        for d, r in pre:
            k = next(inj["start"] for inj in injuries
                     if date.fromisoformat(inj["start"]) - timedelta(days=PRE_INJURY_DAYS)
                     <= date.fromisoformat(d) < date.fromisoformat(inj["start"]))
            by_inj[k] = max(by_inj.get(k, 0.0), r)
        for k, r in sorted(by_inj.items()):
            caught.append({"injury": k, "largest_step": round(r, 3)})
        lows = [r for r in by_inj.values() if r > 1.0]
        if lows and min(lows) - 0.02 < val:
            val, why = min(lows) - 0.02, why + f", tightened to refuse the {min(lows):.2f} step before an injury"
    else:
        val = min(val, default)                      # no injury list ⇒ tighten-only
        why += " (no injury list — tighten-only)"
    val = _clamp("BIO_EQ_STEP", val)
    floor = E.CALIBRATION_BOUNDS["BIO_EQ_STEP"][0]
    small = [c for c in caught if c["largest_step"] <= floor]
    if small:
        why += (f"; the step before {', '.join(c['injury'] for c in small)} "
                f"({', '.join(str(c['largest_step']) for c in small)}) is under the lowest allowed limit "
                f"{floor} — this limit cannot catch it, look at weekly load instead")
    if abs(val - default) < 0.01:
        val = default
    why += f" — raw {q:.3f}"
    refused = lambda lim: sum(1 for r in ratios if r > lim)
    for c in caught:
        c["refused_default"] = c["largest_step"] > default
        c["refused_fitted"] = c["largest_step"] > val
    return {"key": "BIO_EQ_STEP", "default": default, "fitted": round(q, 3), "value": val, "kind": "safety",
            "status": "fitted" if val != default else "unchanged", "basis": why,
            "replay": {"sessions": len(ratios), "refused_default": refused(default),
                       "refused_fitted": refused(val), "pre_injury": caught}}


def _daily(db, today):
    hist = E.reconstruct_history(db, end=today.isoformat())
    return {h["date"]: h for h in hist}


def fit_ramp(daily, injuries, history_days):
    default = E.CALIBRATION_DEFAULTS["CTL_RAMP_MAX"]
    days = sorted(daily)
    if not days:
        return {"key": "CTL_RAMP_MAX", "default": default, "fitted": None, "value": default,
                "kind": "safety", "status": "insufficient", "basis": "no load history"}
    gains, pre = [], []
    d = date.fromisoformat(days[0])
    d += timedelta(days=(7 - d.weekday()) % 7)
    last = date.fromisoformat(days[-1])
    while d + timedelta(days=7) <= last:
        a, b = daily.get(d.isoformat()), daily.get((d + timedelta(days=7)).isoformat())
        if a and b and a["ctl"] >= CTL_MIN_READ and not _in_injury(b["date"], injuries):
            g = b["ctl"] - a["ctl"]
            if _in_pre_injury(b["date"], injuries, 7 * RAMP_EXCLUDE_WEEKS):
                pre.append((b["date"], g))
            elif g > 0:
                gains.append(g)
        d += timedelta(days=7)
    if len(gains) < MIN_RAMP_WEEKS:
        return {"key": "CTL_RAMP_MAX", "default": default, "fitted": None, "value": default,
                "kind": "safety", "status": "insufficient",
                "basis": f"{len(gains)} building weeks at CTL ≥ {CTL_MIN_READ:g} (need {MIN_RAMP_WEEKS})"}
    p90 = _quantile(gains, 0.90)
    val, why = p90, f"p90 of {len(gains)} building weeks' CTL gain"
    if not injuries or history_days < 730:
        val = min(val, default)
        why += " (tighten-only: " + ("no injury list" if not injuries else "under 2 years of history") + ")"
    pre_peaks = {}
    for dd, g in pre:
        k = next(inj["start"] for inj in injuries
                 if date.fromisoformat(inj["start"]) - timedelta(days=7 * RAMP_EXCLUDE_WEEKS)
                 <= date.fromisoformat(dd) < date.fromisoformat(inj["start"]))
        pre_peaks[k] = max(pre_peaks.get(k, -99.0), g)
    risky = [g for g in pre_peaks.values() if g > 0]
    if risky and min(risky) - 0.5 < val:
        val, why = min(risky) - 0.5, why + f", tightened under the {min(risky):.1f}/wk ramp before an injury"
    val = _clamp("CTL_RAMP_MAX", val)
    if abs(val - default) < 0.1:
        val = default
    why += f" — raw {p90:.2f}/wk"
    return {"key": "CTL_RAMP_MAX", "default": default, "fitted": round(p90, 2), "value": val, "kind": "safety",
            "status": "fitted" if val != default else "unchanged", "basis": why,
            "replay": {"weeks": len(gains), "over_default": sum(1 for g in gains if g > default),
                       "over_fitted": sum(1 for g in gains if g > val),
                       "pre_injury": [{"injury": k, "peak_gain": round(g, 2)} for k, g in sorted(pre_peaks.items())]}}


def fit_acwr(daily, injuries):
    hard = E.CALIBRATION_DEFAULTS["ACWR_HARD"]
    soft = E.CALIBRATION_DEFAULTS["ACWR_SOFT"]
    peaks = []
    for inj in injuries:
        s = date.fromisoformat(inj["start"])
        vals = [daily[k]["acwr"] for k in ((s - timedelta(days=i)).isoformat() for i in range(1, PRE_INJURY_DAYS + 1))
                if k in daily and daily[k]["acwr"] and daily[k]["ctl"] >= CTL_MIN_READ]
        if vals:
            peaks.append({"injury": inj["start"], "peak_acwr": round(max(vals), 3)})
    below = [p["peak_acwr"] for p in peaks if p["peak_acwr"] < hard]
    out = {"key": "ACWR_HARD", "default": hard, "kind": "safety", "replay": {"pre_injury": peaks}}
    if len(below) < MIN_INJURIES_FOR_ACWR:
        out.update(fitted=None, value=hard, status="unchanged" if injuries else "insufficient",
                   basis=(f"{len(below)} listed injur{'y' if len(below) == 1 else 'ies'} preceded by an ACWR "
                          f"peak under {hard} (need {MIN_INJURIES_FOR_ACWR} to tighten; never loosened)"
                          if injuries else "no injury list — the ceiling is never loosened and needs "
                                           f"{MIN_INJURIES_FOR_ACWR} injuries to tighten"))
    else:
        m = statistics.median(below) - 0.02
        val = _clamp("ACWR_HARD", min(m, hard))
        out.update(fitted=round(m, 3), value=val, status="fitted" if val < hard else "unchanged",
                   basis=f"just under the median pre-injury ACWR peak ({statistics.median(below):.2f}) of "
                         f"{len(below)} injuries")
    out["soft"] = round(min(soft, out["value"] - (hard - soft)), 3)
    return out


def detect_breaks(runs, injuries):
    """Gaps of ≥ GAP_MIN_DAYS between runs that no listed injury covers — the athlete may want to
    label them (an unlisted injury is invisible to every safety fit)."""
    out = []
    for a, b in zip(runs, runs[1:]):
        da, db_ = date.fromisoformat(a["date"]), date.fromisoformat(b["date"])
        gap = (db_ - da).days
        if gap >= GAP_MIN_DAYS:
            covered = any(date.fromisoformat(i["start"]) - timedelta(days=7) <= da + timedelta(days=1)
                          <= date.fromisoformat(i["end"] or i["start"]) + timedelta(days=28) for i in injuries)
            if not covered:
                out.append({"from": (da + timedelta(days=1)).isoformat(), "to": (db_ - timedelta(days=1)).isoformat(),
                            "days": gap - 1})
    return out


def fit(db, injuries_text=None, today=None):
    """Run every fit; returns the proposal (not applied, not saved)."""
    today = today or datetime.now().date()
    injuries, inj_errors = parse_injuries(injuries_text if injuries_text is not None
                                          else (E.get_meta(db, "set:injury_history") or ""))
    runs = _runs(db)
    zones_at = _ZonesByMonth(db)
    daily = _daily(db, today) if runs else {}
    history_days = (date.fromisoformat(runs[-1]["date"]) - date.fromisoformat(runs[0]["date"])).days if runs else 0
    params = [fit_trimp_scale(runs, zones_at, today), fit_session_step(runs, zones_at, injuries),
              fit_ramp(daily, injuries, history_days), fit_acwr(daily, injuries)]
    values = {p["key"]: p["value"] for p in params}
    values["ACWR_SOFT"] = params[3]["soft"]
    return {"version": FIT_VERSION, "created_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "approved": False, "history": {"runs": len(runs), "from": runs[0]["date"] if runs else None,
                                           "to": runs[-1]["date"] if runs else None},
            "injuries": injuries, "injury_errors": inj_errors, "breaks": detect_breaks(runs, injuries),
            "params": params, "values": {k: v for k, v in values.items()
                                         if v != E.CALIBRATION_DEFAULTS.get(k, 1.0 if k == "trimp_scale" else None)}}


# ── storage ─────────────────────────────────────────────────────────────────────────────────────
def load(db):
    try:
        raw = E.get_meta(db, CAL_META_KEY)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def save(db, proposal):
    E.set_meta(db, CAL_META_KEY, json.dumps(proposal))
    db.commit()


def approve(db):
    cur = load(db)
    if not cur:
        return None
    cur["approved"] = True
    cur["approved_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    save(db, cur)
    return cur


def revert(db):
    db.execute("DELETE FROM meta WHERE key = ?", (CAL_META_KEY,))
    db.commit()
    E.reset_calibration()


def apply_saved(db):
    """Apply the saved calibration when approved, else the defaults. Returns the values applied."""
    cur = load(db)
    if cur and cur.get("approved"):
        return E.apply_calibration(cur.get("values") or {})
    E.reset_calibration()
    return {}


def report_text(p):
    lines = [f"Calibration from {p['history']['runs']} runs ({p['history']['from']} → {p['history']['to']})",
             f"Injuries listed: {len(p['injuries'])}" + (f"  ({'; '.join(p['injury_errors'])})" if p["injury_errors"] else ""),
             ""]
    for q in p["params"]:
        tag = {"fitted": "CHANGE", "unchanged": "keep", "insufficient": "no data"}[q["status"]]
        lines.append(f"  [{tag:7}] {q['key']:13} default {q['default']!s:6} → {q['value']!s:6}  ({q['kind']})")
        lines.append(f"            {q['basis']}")
        if q.get("effect"):
            lines.append(f"            {q['effect']}")
        rp = q.get("replay") or {}
        if "refused_default" in rp:
            lines.append(f"            replay: refuses {rp['refused_fitted']} of {rp['sessions']} past sessions "
                         f"(default refuses {rp['refused_default']})")
        if "over_default" in rp:
            lines.append(f"            replay: {rp['over_fitted']} of {rp['weeks']} past building weeks over the "
                         f"limit (default: {rp['over_default']})")
        for x in rp.get("pre_injury") or []:
            lines.append(f"            before injury {x['injury']}: " +
                         ", ".join(f"{k} {v}" for k, v in x.items() if k != "injury"))
    if p["breaks"]:
        lines += ["", f"Breaks of {GAP_MIN_DAYS}+ days not covered by a listed injury (label them if they were):"]
        lines += [f"  {b['from']} → {b['to']} ({b['days']} days)" for b in p["breaks"][:20]]
    lines += ["", "Approved — the engine uses these values." if p.get("approved")
              else "Not applied. Approve with:  python SparingHorse.py calibrate --approve"]
    return "\n".join(lines)
