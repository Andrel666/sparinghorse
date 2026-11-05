// One planned session in full: title, target, steps, what was run. Used by the Plan drawer and calendar.
import { Link } from "react-router-dom";
import type { SessionDetail, Target } from "../lib/api";
import { dayName, km, minutes, pace } from "../lib/format";
import { Pill } from "./ui";
import { Steps } from "./Steps";

export function TargetChip({ t }: { t: Target | null }) {
  return t ? <span className="target" title={t.hint}>{t.text}</span> : null;
}

const STATUS: Record<string, [string, "ok" | "warn" | "bad" | undefined]> = {
  done: ["done", "ok"], moved: ["done on another day", "ok"], missed: ["missed", "bad"], extra: ["extra run", undefined]};

export function SessionBlock({ s }: { s: SessionDetail }) {
  const st = STATUS[s.status];
  return (
    <div className="list" style={{ gap: "var(--sp-2)" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <b style={{ fontSize: "var(--fs-heading)" }}>{s.race ? "Race" : s.title} {s.km != null ? km(s.km) : ""}{s.strides ? " + strides" : ""}</b>
        {st && <Pill tone={st[1]} dot>{st[0]}{s.moved_to ? ` (${dayName(s.moved_to)})` : ""}</Pill>}
      </div>
      <div className="row"><TargetChip t={s.target} />{s.minutes ? <span className="muted">about {minutes(s.minutes)}</span> : null}</div>
      {s.actual && <span>Ran <span className="num">{km(s.actual.km)}</span> at <span className="num">{pace(s.actual.pace)}</span>
        {s.actual.hr ? <> · <span className="num">{s.actual.hr} bpm</span></> : null}</span>}
      <Steps steps={s.steps} />
    </div>
  );
}

/** Everything about one day, for the day drawer (Today, Plan): each session in full, how it went, and the run(s). */
export type DaySession = Pick<SessionDetail, "date" | "kind" | "title" | "km" | "minutes" | "note" | "race" | "strides" | "target" |
  "steps" | "actual" | "moved_to" | "status"> & Partial<Pick<SessionDetail, "activity_id" | "reflection" | "runs">>;
export function DayDetail({ sessions, onRun }: { sessions: DaySession[]; onRun?: () => void }) {
  if (!sessions.length) return <p className="muted">Rest day — nothing planned. Recovery is part of the plan.</p>;
  return (
    <div className="list" style={{ gap: "var(--sp-5)" }}>
      {sessions.map((s, i) => {
        const runs = s.runs?.length ? s.runs : s.activity_id ? [{ km: s.actual?.km ?? null, pace: s.actual?.pace ?? null, activity_id: s.activity_id }] : [];
        return (
          <div key={`${s.kind}${i}`} className="list" style={{ gap: "var(--sp-3)" }}>
            <SessionBlock s={s as SessionDetail} />
            {s.note && s.note.toLowerCase() !== s.title.toLowerCase() && !s.steps.length && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{s.note}</span>}
            {s.reflection && <p style={{ fontSize: "var(--fs-small)" }}><b>How it went:</b> {s.reflection}</p>}
            {runs.length > 0 && <div className="list" style={{ gap: 4 }}>{runs.map((r, j) => r.activity_id &&
              <Link key={j} to={`/runs?id=${r.activity_id}`} className="linkish" onClick={onRun}>
                Open the run{runs.length > 1 ? ` ${j + 1}` : ""}{r.km != null ? ` · ${km(r.km)}` : ""}{r.pace ? ` at ${pace(r.pace)}` : ""} →</Link>)}</div>}
          </div>);
      })}
    </div>);
}
