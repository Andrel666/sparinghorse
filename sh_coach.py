"""Fork §COACH — the coach chat.

A conversation about the athlete's own training, answered by the AI layer the app already has
(`llm_json`: the Anthropic API or the local Claude Code CLI on a subscription). The ENGINE stays the
authority on every number: this module only gathers what the engine has already computed — the race
and its prediction, this week and the next two, the limits that sized them, the last fortnight of
runs, readiness, zones — into a compact context, and asks the model to explain and advise inside it.
It never changes the plan; a suggestion to change a setting is phrased as a suggestion.

Privacy: everything here is private. The context carries heart rate, the injury history and the
athlete's own words, so the whole feature sits behind its own AI switch (`ai_coach`, off by default,
the posture of `ai_judgment`), the routes are private-only, and the conversation is stored only in
the athlete's own database (`coach_messages`).

The app module is passed in (`S`) rather than imported: SparingHorse may be running as __main__.
"""
import json
from datetime import datetime, timedelta, timezone

from sh_ui_api import LIMITS          # the plan's limits in plain words — one table for every surface

HISTORY_TURNS = 12          # messages of past conversation sent with each question
MAX_MESSAGE_CHARS = 2000    # one question's length cap
RECENT_RUN_DAYS = 14
REPLY_SCHEMA = {"type": "object", "properties": {"reply": {"type": "string"}},
                "required": ["reply"], "additionalProperties": False}

SYSTEM = (
    "You are the running coach inside Sparing Horse, a training app for one athlete. You talk "
    "with that athlete about their own training.\n\n"
    "The app's engine computes the plan, the limits and the predictions; you do not. Every number "
    "you give must come from the CONTEXT below. Never prescribe more distance, more runs or more "
    "intensity than the plan lays, and never tell the athlete to ignore a limit: explain why the "
    "engine set it, using the limit's own reason. When the athlete wants something the plan does "
    "not allow, say what it would risk and what the safe version is (for example a setting they "
    "could change: max runs per week, long-run day, manual LTHR) — as a suggestion, never as "
    "something you did.\n\n"
    "Safety comes first. Chest pain or pressure, fainting, unusual breathlessness, palpitations "
    "or dizziness during or after a run: tell them to stop running and get medical care now, and "
    "say nothing else about training. Pain that changes how they run, or pain in a spot that was "
    "injured before (the context lists injuries): advise rest from running, an easy alternative, "
    "and a physiotherapist if it does not settle within a few days. You are not a doctor and do "
    "not diagnose.\n\n"
    "Style: plain language, short. Lead with the answer, then the reason in one or two sentences. "
    "Use the athlete's numbers (paces, heart rate, dates). Avoid the engine's jargon (ACWR, CTL, "
    "eq-km); if you must use one, explain it in a few words. Reply in the language the athlete "
    "writes in. If the context does not hold what you need, say so instead of guessing."
)


def _ensure_table(db):
    db.execute("CREATE TABLE IF NOT EXISTS coach_messages (id INTEGER PRIMARY KEY, ts TEXT NOT NULL, "
               "role TEXT NOT NULL, text TEXT NOT NULL)")


def history(db, limit=50):
    _ensure_table(db)
    rows = db.execute("SELECT id, ts, role, text FROM coach_messages ORDER BY id DESC LIMIT ?",
                      (limit,)).fetchall()
    return [{"id": r["id"], "ts": r["ts"], "role": r["role"], "text": r["text"]} for r in reversed(rows)]


def clear(db):
    _ensure_table(db)
    db.execute("DELETE FROM coach_messages")
    db.commit()


def _add(db, role, text):
    _ensure_table(db)
    db.execute("INSERT INTO coach_messages (ts, role, text) VALUES (?,?,?)",
               (datetime.now(timezone.utc).isoformat(timespec="seconds"), role, text))
    db.commit()


def _safe(fn, default=None):
    try:
        return fn()
    except Exception:          # one missing piece must never stop the coach from answering
        return default


def build_context(S, db):
    """The compact, engine-computed picture the coach answers inside. Plain text, ~1–3k tokens."""
    E = S.E if hasattr(S, "E") else __import__("sh_engine")
    today = datetime.now().date()
    out = [f"TODAY: {today.isoformat()} ({today.strftime('%A')})"]

    # athlete settings
    st = {}
    for key in ("athlete_context", "max_runs_per_week", "long_run_day", "week_start", "manual_lthr",
                "injury_history", "units"):
        spec = S.SETTINGS_BY_KEY.get(key)
        if spec:
            v = _safe(lambda: S._resolve_setting(db, spec)[0], "")
            if (v or "").strip():
                st[key] = v.strip()
    if st:
        out.append("ATHLETE SETTINGS: " + "; ".join(f"{k}={v}" for k, v in st.items()))
    lt = _safe(lambda: S.derive_lthr(db), {}) or {}
    if lt.get("lthr"):
        out.append(f"THRESHOLD HR (LTHR): {lt['lthr']} bpm (source {lt.get('source')}, confidence "
                   f"{lt.get('confidence')}); easy ceiling about {round(lt['lthr'] * 0.85)} bpm")

    # race and prediction
    rp = _safe(lambda: S.race_plan(db), {}) or {}
    if rp.get("ok"):
        r, t, p = rp["race"], rp["target"], rp.get("prediction") or {}
        out.append(f"GOAL RACE: {r.get('label')} — {r['type']} on {r.get('date')}"
                   + (f", start {r['start_time']}" if r.get("start_time") else "")
                   + f". Target {t['hms']} ({t['pace']}/km, from {t['source']}). Engine prediction "
                   f"{p.get('hms')} (range {p.get('lo')}–{p.get('hi')}); target is {p.get('verdict')}."
                   + (f" Best at this distance: {rp['best']['hms']} ({rp['best']['date']})." if rp.get("best") else ""))
        out.append("RACE-DAY PACING: " + "; ".join(
            f"{sg['label']} km {sg['from_km']}–{sg['to_km']} at {sg['pace']}/km"
            + (f" HR {sg['hr'].get('lo', '')}{'–' if sg['hr'].get('lo') else '≤'}{sg['hr']['hi']}" if sg.get("hr") else "")
            for sg in rp["segments"]))

    # readiness today
    rd = _safe(lambda: S.today_readiness(db), {}) or {}
    a = rd.get("assessment") or {}
    if a:
        out.append(f"READINESS TODAY: {a.get('verdict')} — {a.get('action')} "
                   f"Reasons: {'; '.join(a.get('reasons') or [])}")
    sess = rd.get("session") or {}
    if sess:
        out.append("TODAY'S SESSION: " + (sess.get("note") or "") + (
            f" {sess.get('kind')} {sess.get('km')} km, ~{sess.get('minutes')} min, pace {sess.get('pace_zone')}"
            if sess.get("km") else ""))

    # this week and the next two, with what limits them
    log = _safe(lambda: S.block_log(db), None)
    if log:
        cur = [w for w in log["weeks"] if w["start"] <= today.isoformat() <= (S._date(w["start"]) + timedelta(days=6)).isoformat()]
        idx = log["weeks"].index(cur[0]) if cur else 0
        for w in log["weeks"][idx: idx + 3]:
            lines = []
            for x in w["sessions"]:
                if x.get("unplanned"):
                    lines.append(f"{x['date']} extra run {x['actual']['km']} km")
                    continue
                d = f"{x['date']} {x.get('kind')} {x.get('km')} km"
                if x.get("strides"):
                    d += f" + {x['strides']}x strides"
                if x.get("race"):
                    d += " RACE"
                if x.get("actual"):
                    ac = x["actual"]
                    d += f" — ran {ac['km']} km @ {ac.get('pace')}/km" + (f", {ac['hr']} bpm" if ac.get("hr") else "")
                    if x.get("moved_to"):
                        d += f" (on {x['moved_to']})"
                elif x.get("missed"):
                    d += " — missed"
                lines.append(d)
            L = w.get("limits") or {}
            lim = []
            for k, v in L.items():
                if isinstance(v, dict) and "laid" in v and "ceiling" in v:
                    tag = " ← HOLDS THE WEEK (this limit sized it)" if (L.get("binding") == k or v.get("binds")) else ""
                    over = " (ran over)" if v["laid"] > v["ceiling"] else ""
                    lim.append(f"{LIMITS.get(k, {}).get('name', k)} {v['laid']} of {v['ceiling']} {v.get('unit', '')}{over}{tag}")
            out.append(f"WEEK of {w['start']} ({w.get('pk')}, {w.get('km')} km planned, {len(w['sessions'])} sessions"
                       + (f"; intent: {w['intent']}" if w.get("intent") else "") + "): " + " | ".join(lines)
                       + (f"\n  limits: {'; '.join(lim)}" if lim else ""))

    # recent runs
    since = (today - timedelta(days=RECENT_RUN_DAYS)).isoformat()
    rows = _safe(lambda: db.execute(
        "SELECT date, distance, duration, hr_avg FROM activities WHERE " + S.RUN_FAMILY_SQL +
        " AND date>=? ORDER BY date", (since,)).fetchall(), []) or []
    if rows:
        rr = []
        for r in rows:
            pace = r["duration"] / r["distance"] if r["distance"] else 0
            rr.append(f"{r['date']} {r['distance']:.1f} km @ {int(pace // 60)}:{int(pace % 60):02d}/km"
                      + (f" {r['hr_avg']} bpm" if r["hr_avg"] else ""))
        out.append(f"RUNS, LAST {RECENT_RUN_DAYS} DAYS: " + "; ".join(rr))

    # effort discipline
    ed = _safe(lambda: S.effort_discipline(db), {}) or {}
    if ed.get("easy_counts"):
        c = ed["easy_counts"]
        out.append(f"EASY-RUN CHECK (last {ed.get('window_days')} days, judged by {ed.get('anchor')}): "
                   f"{c.get('on')}/{c.get('judged')} on target, {c.get('hot')} a bit hard, "
                   f"{c.get('too_hard')} at threshold effort; "
                   f"easy HR ceiling {ed.get('easy_hr_ceiling')} bpm, easy pace ceiling {ed.get('easy_pace_ceiling')}")
    cal = _safe(lambda: E.calibration_in_force(), {}) or {}
    if cal:
        out.append("CALIBRATION IN FORCE: " + ", ".join(f"{k}={v}" for k, v in cal.items()))
    return "\n".join(out)


def reply(S, db, message):
    """Answer one message. Returns {"ok", "reply"} or {"ok": False, "error"}; stores both turns."""
    text = (message or "").strip()
    if not text:
        return {"ok": False, "error": "Type a question first."}
    if len(text) > MAX_MESSAGE_CHARS:
        return {"ok": False, "error": f"Keep it under {MAX_MESSAGE_CHARS} characters."}
    past = history(db, HISTORY_TURNS)
    ctx = build_context(S, db)
    convo = "\n".join(f"{'ATHLETE' if m['role'] == 'user' else 'COACH'}: {m['text']}" for m in past)
    user = (f"CONTEXT (computed by the engine, current as of now):\n{ctx}\n\n"
            + (f"CONVERSATION SO FAR:\n{convo}\n\n" if convo else "")
            + f"ATHLETE'S NEW MESSAGE:\n{text}\n\nAnswer as the coach.")
    r = S.llm_json(SYSTEM, user, REPLY_SCHEMA, effort="low", max_tokens=1500)
    if not r.get("ok") or not (r.get("reply") or "").strip():
        return {"ok": False, "error": r.get("error") or "The coach could not answer just now."}
    _add(db, "user", text)
    _add(db, "coach", r["reply"].strip())
    return {"ok": True, "reply": r["reply"].strip()}
