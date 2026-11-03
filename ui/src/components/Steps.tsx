// A structured session's steps (built server-side by sh_ui_api.workout_steps).
import type { Step } from "../lib/api";
import { km, minutes, pace } from "../lib/format";

export function Steps({ steps }: { steps: Step[] }) {
  if (!steps.length) return null;
  return (
    <div className="table-wrap">
      <table className="steps">
        <thead><tr><th>Step</th><th>Time</th><th>Distance</th><th>Pace</th></tr></thead>
        <tbody>{steps.map((s, i) => (
          <tr key={i}><td>{s.label}</td><td className="num">{minutes(s.minutes)}</td>
            <td className="num">{s.km != null ? km(s.km) : "—"}</td><td className="num">{pace(s.pace)}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}
