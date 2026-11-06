// The week strip: seven days, each with what was planned and what was run THAT day. Reused by Today and Plan.
// A run done on another day than planned sits on the day it was run ("↷ from Sun"); the planned day reads
// "moved to Mon". On the phone a cell shrinks to the day letter, the date and one number.
import type { Day } from "../lib/api";
import { dayName } from "../lib/format";

const SHORT: Record<string, string> = { long: "Long", long_mp: "Long+", easy: "Easy", recovery: "Recovery", interval: "Intervals",
  tempo: "Tempo", threshold: "Threshold", progression: "Progression", race_pace: "Race pace", fartlek: "Fartlek", hills: "Hills", race: "Race" };
const name = (d: Day) => d.race ? "Race" : SHORT[d.kind] ?? d.title.replace(" run", "");

function describe(d: Day) {
  const ran = d.runs ?? [];
  const runKm = ran.reduce((a, r) => a + (r.km ?? 0), 0);
  const plan = d.kind === "rest" ? null : `${name(d)}${d.km != null ? ` ${d.km} km` : ""}${d.strides ? " + strides" : ""}`;
  return { ran, runKm, plan };
}

function label(d: Day) {
  const { ran, runKm, plan } = describe(d);
  return [`${dayName(d.date)} ${Number(d.date.slice(8))}`,
    d.status === "moved" ? `${plan} planned, moved to ${d.moved_dow ?? "another day"}`
      : plan ? `${plan}${d.status === "done" ? ", done" : d.status === "missed" ? ", missed" : ""}` : ran.length ? "" : "rest",
    ran.length ? `ran ${runKm.toFixed(1)} km${d.moved_from ? `, moved from ${d.moved_from}` : ""}` : ""].filter(Boolean).join(": ");
}

/** `onDay` makes each day a button that opens its detail (Today, Plan). */
export function Week({ days, phase, onDay, selected, today }: { days: Day[]; phase?: string | null; onDay?: (date: string) => void;
  selected?: string | null; today?: string }) {
  return (
    <div className="week" role={onDay ? "group" : "list"} aria-label={onDay ? "The week, pick a day for details" : "The week"}>
      {days.map(d => {
        const Tag = onDay ? "button" : "div";
        const { ran, runKm, plan } = describe(d);
        const legacy = d.runs === undefined;                       // an older server: the actual sits on the planned day
        const moved = d.status === "moved" && !legacy;
        const hasRun = ran.length > 0 || (legacy && !!d.actual);
        const st = moved ? "moved" : hasRun ? (d.status === "extra" || ran.every(r => r.unplanned) ? "extra" : "done") : d.status;
        const mark = st === "done" ? "✓" : st === "extra" ? "+" : st === "missed" ? "✕" : "";
        const big = hasRun ? (legacy ? d.actual!.km : runKm) : d.kind !== "rest" && !moved ? d.km : null;
        return (
          <Tag key={d.date} role={onDay ? undefined : "listitem"} data-phase={phase || undefined}
               {...(onDay ? { type: "button" as const, onClick: () => onDay(d.date), "aria-label": `${label(d)}. Show details` } : {})}
               className={["day", !plan && !hasRun ? "rest" : "", st, today === d.date ? "today" : "", selected === d.date ? "selected" : ""].join(" ")}>
            <span className="dow"><span className="full">{d.dow} </span><span className="short">{d.dow[0]} </span>{Number(d.date.slice(8))}</span>
            {/* desktop: words */}
            <span className="what full">
              {plan ? <span className={moved || d.status === "missed" ? "struck" : undefined}>{mark && !moved && !(hasRun && !legacy && d.status !== "done") ? `${mark} ` : ""}{plan}</span>
                : !hasRun && <span>Rest</span>}
            </span>
            {moved && <span className="muted detail full">moved to {d.moved_dow}</span>}
            {hasRun && !legacy && ran.map((r, i) => <span key={i} className="ran detail full num">
              {(d.kind === "rest" || moved || r.unplanned) && <b>{r.unplanned ? "+ " : "✓ "}{SHORT[r.kind] ?? "Run"} </b>}
              {r.km} km{r.hr ? ` · ${r.hr} bpm` : ""}</span>)}
            {legacy && d.actual && <span className="muted num detail full">{d.actual.km} km{d.actual.hr ? ` · ${d.actual.hr} bpm` : ""}</span>}
            {d.moved_from && <span className="muted detail full">↷ from {d.moved_from}</span>}
            {/* phone: one number and a mark */}
            <span className="what short num">{big != null ? <>{mark ? `${mark} ` : ""}{Math.round(big * 10) / 10}</> : moved ? "↷" : "·"}</span>
          </Tag>);
      })}
    </div>
  );
}
