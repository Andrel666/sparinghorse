// The source behind a plan limit: what it is, the rule, the studies, how the engine uses it.
// The text is Classic's own (static/app.js → src/data/plan_sources.json at dev/build time).
import data from "../data/plan_sources.json";
import { Pill } from "./ui";

interface Ref { cite: string; finding: string }
interface Source { title: string; basis: string; what?: string; rule?: string; refs?: Ref[]; use?: string; caveat?: string }
const SOURCES = data.sources as Record<string, Source>;
const BASIS = data.basis as Record<string, { label: string; desc: string }>;

export const basisLabel = (b: string | null | undefined) => (b && BASIS[b] ? BASIS[b].label : null);
export const hasSource = (key: string) => key in SOURCES;

export function LimitSource({ k }: { k: string }) {
  const s = SOURCES[k];
  if (!s) return <span className="muted">No source recorded for this limit.</span>;
  const b = BASIS[s.basis];
  return (
    <div className="list" style={{ gap: "var(--sp-3)" }}>
      {b && <div><Pill tone={s.basis === "A" ? "warn" : undefined}>{b.label}</Pill> <span className="muted t-small">{b.desc}</span></div>}
      {s.what && <p>{s.what}</p>}
      {s.rule && <p><b>Rule.</b> {s.rule}</p>}
      {s.use && <p><b>How the plan uses it.</b> {s.use}</p>}
      {s.refs?.length ? <div><b>Evidence</b><ul style={{ paddingLeft: 18, margin: "6px 0 0" }}>{s.refs.map(r => (
        <li key={r.cite} style={{ marginBottom: 8 }}><span>{r.finding}</span><br /><span className="muted t-small">{r.cite}</span></li>))}</ul></div> : null}
      {s.caveat && <p className="muted t-small">Caveat: {s.caveat}</p>}
    </div>
  );
}
