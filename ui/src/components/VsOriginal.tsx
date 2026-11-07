// You against the race's original plan (the pinned first plan): your number, the plan's, the gap in units and percent.
// Lives on Goal (one home per fact); the data comes with the Goal page (and Today's payload keeps a door to it).
import { Link } from "react-router-dom";
import type { VsPlan } from "../lib/api";
import { km, reading } from "../lib/format";
import { Card, Strip } from "./ui";

/** You against the race's original plan: your number, the plan's, the gap in units and in percent. */
export function VsOriginal({ v }: { v: VsPlan }) {
  type It = VsPlan["items"][number];
  const num = (x: number | null, u: It["unit"]) => (x == null ? "—" : u === "km" ? km(x) : reading(x));
  // the glance cue: ▲ above the plan's number, ▼ below it (the figure's tone says whether that matters)
  const arrow = (m: It) => m.diff == null || m.diff === 0 ? null
    : <span aria-hidden="true" className="trend">{m.diff > 0 ? "▲" : "▼"}</span>;
  const gap = (m: It) => {
    if (m.diff == null) return m.note ?? m.word ?? undefined;
    const sign = m.diff > 0 ? "+" : m.diff < 0 ? "−" : "±";
    const pct = m.pct != null ? ` (${sign}${Math.abs(m.pct).toFixed(1)}%)` : "";
    return `${sign}${num(Math.abs(m.diff), m.unit)}${pct} · ${m.word}`;
  };
  return (
    <Card label="Vs. the original plan" span={12} lede={v.lede}
          aside={<Link to="/goal#history" className="linkish t-small">History ›</Link>}>
      <Strip items={v.items.map(m => ({
        k: m.when && m.when !== "this week" ? `${m.label} · ${m.when}` : m.label,
        v: <><span style={{ whiteSpace: "nowrap" }}>{arrow(m)}{num(m.actual, m.unit)}</span><small className="muted" style={{ whiteSpace: "nowrap" }}> vs {num(m.planned, m.unit)}</small></>,
        s: gap(m), hint: m.note, tone: m.tone ?? undefined, to: m.link,
      }))} />
    </Card>);
}
