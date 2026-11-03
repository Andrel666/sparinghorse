// One planned session in full: title, target, steps, what was run. Used by the Plan drawer and calendar.
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
