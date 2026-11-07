// The road to the race: weekly km bars coloured by phase, the phase band, race flags, the today marker.
import type { PlanPage } from "../lib/api";
import { dateShort, km } from "../lib/format";

const num = (v: number) => v.toFixed(1);

export function Road({ road, phases, today, tuneUps = [], onPick }: { road: PlanPage["road"]; phases: PlanPage["phases"]; today: string;
  tuneUps?: { label: string; date: string }[]; onPick: (start: string) => void }) {
  const max = Math.max(...road.map(w => w.km || 0), 1);
  const ti = road.findIndex(w => w.current);
  const tday = ti >= 0 ? (new Date(today + "T00:00:00").getTime() - new Date(road[ti].start + "T00:00:00").getTime()) / 864e5 : 0;
  return (
    <div className="road-wrap">
      <div className="road-flags" aria-hidden="true">
        {road.map((w, i) => [...w.flags.map(f => ({ ...f, tune: false })),
                             ...tuneUps.filter(t => t.date >= w.start && t.date < (road[i + 1]?.start ?? "9999")).map(t => ({ label: t.label, date: t.date, day: 3, tune: true }))]
          .map(f => <span key={f.date + f.label} className={`flagpin${f.tune ? " tune" : ""}`} title={`${f.label} · ${dateShort(f.date)}${f.tune ? " (tune-up)" : ""}`}
                          style={{ left: `${((i + (f.day + 0.5) / 7) / road.length) * 100}%` }}>{f.label}</span>))}
      </div>
      <div className="chart" style={{ position: "relative" }}>
      <div className="yticks bars" aria-hidden="true" style={{ height: "100%" }}><span style={{ top: 0 }}>{Math.round(max)} km</span></div>
      <div className="road" role="list" aria-label="Weekly distance through the plan">
        {road.map(w => (
          <button key={w.start} type="button" role="listitem" data-phase={w.phase || undefined}
                  className={["road-bar", w.current ? "current" : "", w.selected ? "sel" : "", w.race ? "race" : "", w.frozen ? "frozen" : ""].join(" ")}
                  title={[`Week of ${dateShort(w.start)}`, `${km(w.km)} planned`, w.long ? `long run ${km(w.long)}` : "",
                          w.race_km ? `race ${km(w.race_km)}` : "", w.ran ? `${km(w.ran)} run` : ""].filter(Boolean).join(" · ")}
                  aria-label={`Week of ${dateShort(w.start)}, ${km(w.km)}${w.long ? `, long run ${km(w.long)}` : ""}${w.race_km ? `, race ${km(w.race_km)}` : ""}${w.ran ? `, ${km(w.ran)} run` : ""}`}
                  onClick={() => onPick(w.start)}>
            <span className="planned" style={{ height: `${(w.km / max) * 100}%` }}>
              {/* the week's long run (and its race) as the bottom of the bar: the build's own number, inside the week */}
              {w.race_km ? <span className="part race" style={{ height: `${(Math.min(w.race_km, w.km) / (w.km || 1)) * 100}%` }}>
                <span className="lab">{num(w.race_km)}</span></span> : null}
              {w.long ? <span className="part long" style={{ height: `${(Math.min(w.long, w.km) / (w.km || 1)) * 100}%` }}>
                <span className="lab">{num(w.long)}</span></span> : null}
              {w.km ? <span className="lab top" aria-hidden="true">{num(w.km)}</span> : null}
            </span>
            {w.ran > 0 && <span className="ran" style={{ height: `${(Math.min(w.ran, w.km || w.ran) / max) * 100}%` }} />}
          </button>
        ))}
      </div>
      </div>
      <div className="road-phases">
        {phases.map(p => <span key={p.start} data-phase={p.key || undefined} style={{ flex: p.weeks }}>{p.name}</span>)}
      </div>
      {ti >= 0 && <div className="road-today" style={{ left: `${((ti + (tday + 0.5) / 7) / road.length) * 100}%` }}>▲ today</div>}
      {(() => { const s = road.find(w => w.selected) ?? road[ti]; return s ? <div className="road-readout" aria-live="polite">
        <b>Week of {dateShort(s.start)}</b> · {km(s.km)}{s.long ? ` · long run ${km(s.long)}` : ""}{s.race_km ? ` · race ${km(s.race_km)}` : ""}{s.ran ? ` · ${km(s.ran)} run` : ""}</div> : null; })()}
      {road.some(w => w.long) && <div className="road-key" aria-hidden="true"><span><i />week km (on top)</span><span><i className="long" />long run km (inside)</span>
        {road.some(w => w.race_km) && <span><i className="race" />race</span>}</div>}
    </div>
  );
}
