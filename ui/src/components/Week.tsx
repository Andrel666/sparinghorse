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

/** `onDay` makes each day a button that opens its detail (Today, Plan). */
export function Week({ days, phase, onDay, selected, today }: { days: Day[]; phase?: string | null; onDay?: (date: string) => void;
  selected?: string | null; today?: string }) {
  return (
    <div className="week" role={onDay ? "group" : "list"} aria-label={onDay ? "The week — pick a day for details" : undefined}>
      {days.map(d => {
        const Tag = onDay ? "button" : "div";
        return (
        <Tag key={d.date} role={onDay ? undefined : "listitem"} data-phase={phase || undefined} {...(onDay ? { type: "button" as const, onClick: () => onDay(d.date),
               "aria-label": `${d.dow} ${Number(d.date.slice(8))}: ${what(d)}${d.status === "done" ? ", done" : d.status === "missed" ? ", missed" : ""}. Show details` } : {})}
             className={["day", d.kind === "rest" && !d.actual ? "rest" : "", d.status, today === d.date ? "today" : "", selected === d.date ? "selected" : ""].join(" ")}
             title={d.moved_to ? `Run on ${dayName(d.moved_to)}` : undefined}>
          <span className="dow"><span className="full">{d.dow} </span><span className="short">{d.dow[0]} </span>{Number(d.date.slice(8))}</span>
          <span className="what"><span className="full">{MARK[d.status] || ""}{what(d)}</span>
            <span className="short">{MARK[d.status] || ""}{what(d, true)}</span></span>
          {d.actual && <span className="muted num detail">{d.actual.km} km{d.actual.hr ? ` · ${d.actual.hr} bpm` : ""}</span>}
          {d.moved_to && <span className="muted detail">↷ {dayName(d.moved_to)}</span>}
        </Tag>);
      })}
    </div>
  );
}
