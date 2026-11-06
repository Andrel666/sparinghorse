// The one calendar: Plan → Month and Runs → Calendar draw the same cells from /api/ui/calendar.
// A cell shows what was planned (muted; struck when missed or moved) and what was run (zone dot + km);
// the eighth column is the week's run / planned km. Pages decide only what a click on a day does.
import { MonthGrid } from "./layout";
import { Query } from "../pages/Query";
import { useCalendar, type CalendarMonth } from "../lib/api";
import { ZONE_COLORS } from "../lib/format";

const dot = (z: number | null) => z != null ? ZONE_COLORS[z] : "var(--line-strong)";

export function Calendar({ month, onMonth, onDay, selected }:
  { month?: string; onMonth: (m: string) => void; onDay: (date: string, c: CalendarMonth) => void; selected?: string | null }) {
  return <Query q={useCalendar(month)}>{c => (
    <div className="cal">
      <MonthGrid month={c.month} weekStart={c.week_start} first={c.first} last={c.last} onMonth={onMonth} today={c.today} selected={selected}
        weekTotal={ws => { const w = c.weeks.find(x => x.start === ws); if (!w || (!w.planned_km && !w.ran_km)) return null;
          if (ws > c.today) return <span className="num cal-ahead">{w.planned_km}</span>;
          return <span className="num"><b>{w.ran_km}</b>{w.planned_km ? <span className="muted"> / {w.planned_km}</span> : null}</span>; }}
        cell={date => {
          const d = c.days[date];
          if (!d) return { body: null, className: "out" };
          const race = c.race?.date === date;
          const label = [...d.planned.map(p => `${p.title} ${p.km ?? ""} km planned, ${p.status}`), ...d.runs.map(r => `ran ${r.km} km`)].join("; ");
          return {
            pickable: d.planned.length > 0 || d.runs.length > 0, label: label || undefined,
            className: [d.in_plan ? "" : "off-plan", race ? "race" : ""].filter(Boolean).join(" "),
            body: <>
              {d.planned.map((p, i) => <span key={`p${i}`} className={`cal-p ${p.status}`}>
                <span className="cal-t">{p.title} </span>{p.km ?? ""}</span>)}
              {d.runs.slice(0, 2).map(r => <span key={r.id} className="cal-r"><span className="zdot" style={{ background: dot(r.z) }} />{r.km}</span>)}
              {d.runs.length > 2 && <span className="cal-r">+{d.runs.length - 2}</span>}
              {d.other && <span className="cal-o" aria-label="another sport">·</span>}
            </>,
          };
        }}
        onPick={date => onDay(date, c)} />
      <div className="cal-key" aria-hidden="true">
        <span><span className="cal-p planned">4.3</span> planned</span>
        <span><span className="zdot" style={{ background: "var(--text)" }} /> run</span>
        {ZONE_COLORS.map((z, i) => <span key={i}><span className="zdot" style={{ background: z }} />Z{i + 1}</span>)}
      </div>
    </div>)}</Query>;
}
