// The week strip: seven days, each with what was planned and what happened. Reused by Today and Plan.
import type { Day } from "../lib/api";
import { dayName } from "../lib/format";

const MARK: Partial<Record<Day["status"], string>> = { done: "✓ ", moved: "✓ ", missed: "✕ ", extra: "+ " };

function what(d: Day, short = false) {
  if (d.kind === "rest" && !d.actual) return "Rest";
  const name = d.race ? "Race" : d.title.replace(" run", "").replace(" with a fast finish", "+");
  const dist = d.km == null ? "" : short ? ` ${Math.round(d.km)}` : ` ${d.km} km`;
  return `${name}${dist}${d.strides ? (short ? "+" : " + strides") : ""}`;
}

export function Week({ days, phase }: { days: Day[]; phase?: string | null }) {
  return (
    <div className="week" role="list">
      {days.map(d => (
        <div key={d.date} role="listitem" data-phase={phase || undefined}
             className={["day", d.kind === "rest" && !d.actual ? "rest" : "", d.status].join(" ")}
             title={d.moved_to ? `Run on ${dayName(d.moved_to)}` : undefined}>
          <span className="dow"><span className="full">{d.dow} </span><span className="short">{d.dow[0]} </span>{Number(d.date.slice(8))}</span>
          <span className="what"><span className="full">{MARK[d.status] || ""}{what(d)}</span>
            <span className="short">{MARK[d.status] || ""}{what(d, true)}</span></span>
          {d.actual && <span className="muted num detail">{d.actual.km} km{d.actual.hr ? ` · ${d.actual.hr} bpm` : ""}</span>}
          {d.moved_to && <span className="muted detail">↷ {dayName(d.moved_to)}</span>}
        </div>
      ))}
    </div>
  );
}
