// The road to the race: weekly km bars coloured by phase, the phase band, today and the race marked.
import type { PlanPage } from "../lib/api";
import { dateShort } from "../lib/format";

export function Road({ road, phases, onPick }: { road: PlanPage["road"]; phases: PlanPage["phases"]; onPick: (start: string) => void }) {
  const max = Math.max(...road.map(w => w.km || 0), 1);
  return (
    <div className="road-wrap">
      <div className="road" role="list" aria-label="Weekly distance through the plan">
        {road.map(w => (
          <button key={w.start} type="button" role="listitem" data-phase={w.phase || undefined}
                  className={["road-bar", w.current ? "current" : "", w.selected ? "sel" : "", w.race ? "race" : ""].join(" ")}
                  title={`${dateShort(w.start)} · ${w.km} km planned${w.ran ? ` · ${w.ran} km run` : ""}`}
                  aria-label={`Week of ${dateShort(w.start)}, ${w.km} km`} onClick={() => onPick(w.start)}>
            <span className="planned" style={{ height: `${(w.km / max) * 100}%` }} />
            {w.ran > 0 && <span className="ran" style={{ height: `${(Math.min(w.ran, w.km || w.ran) / max) * 100}%` }} />}
          </button>
        ))}
      </div>
      <div className="road-phases">
        {phases.map(p => <span key={p.start} data-phase={p.key || undefined} style={{ flex: p.weeks }}>{p.name}</span>)}
      </div>
    </div>
  );
}
