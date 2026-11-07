// A run's debrief: the four questions after a run, in the order the mind asks them (docs/design/FOUR_LENSES_DESIGN.md):
// did I do what was asked · what did it cost · what did it do to my goal · what changes next. Stacked on the phone,
// a 2×2 grid on desktop. Numbers, words and verdicts come from /api/ui/debrief/<id>; this only lays them out.
import { Link } from "react-router-dom";
import { useDebrief, type Debrief as D } from "../lib/api";
import { dateLong, dateShort, km } from "../lib/format";
import { Card, ListItem, Pill } from "./ui";
import { Query } from "../pages/Query";

const mmss = (s: number) => { const a = Math.abs(Math.round(s)), h = Math.floor(a / 3600), m = Math.floor(a % 3600 / 60), x = a % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
const sign = (v: number, digits = 1) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(digits)}`;

function Did({ d }: { d: D }) {
  if (!d.asked) return <><p className="muted t-small">No session was planned for this run, so there is nothing to hold it to; it still counts below.</p>
    {d.note && <div className="list"><ListItem k="Your note"><span className="muted">“{d.note}”</span></ListItem></div>}</>;
  return <div className="list">
    <ListItem k="Asked">{d.asked.title} {km(d.asked.km)}{d.asked.target ? ` · ${d.asked.target.text}` : ""}{d.asked.moved ? ` · moved from ${dateShort(d.asked.date)}` : ""}</ListItem>
    {d.checks.map(c => <ListItem key={c.key} k={c.label}>
      <span className="num">{c.did}</span>{" "}
      <Pill tone={c.state === "ok" ? undefined : c.state}>{c.word}{c.detail ? `: ${c.detail}` : ""}</Pill>
    </ListItem>)}
    {d.note && <ListItem k="Your note"><span className="muted">“{d.note}”</span></ListItem>}
  </div>;
}

function Cost({ d }: { d: D }) {
  const c = d.cost;
  if (!c) return <p className="muted t-small">The load settles once the history is rebuilt.</p>;
  return <div className="list">
    <ListItem k="Load">{c.trimp != null ? `${c.trimp} TRIMP` : "—"}{c.fatigue_up != null ? <span className="muted"> · fatigue {sign(c.fatigue_up)}</span> : null}</ListItem>
    <ListItem k="Form after">{c.tsb > 0 ? "+" : ""}{c.tsb}</ListItem>
    <ListItem k="Rest days"><Link to="/#recovery" className="kv-link">{c.rest_days === 0 ? "none: form is balanced" : `${c.rest_days} to balanced form`}</Link></ListItem>
  </div>;
}

function Goal({ d }: { d: D }) {
  const g = d.goal;
  return <div className="list">
    {g.fitness && <ListItem k="Fitness that day"><Link to="/fitness#fitness-fatigue" className="kv-link"><span className="num">{g.fitness.before} → {g.fitness.after}</span> <span className="muted">({sign(g.fitness.delta)})</span></Link></ListItem>}
    {g.endurance && <ListItem k="Endurance that day"><Link to="/goal#endurance" className="kv-link"><span className="num">{g.endurance.before} → {g.endurance.after} %</span> <span className="muted">of what the race needs</span></Link></ListItem>}
    {g.prediction
      ? <ListItem k="Prediction"><Link to="/goal" className="kv-link"><span className="num">{g.prediction.before ? `${g.prediction.before} → ` : ""}{g.prediction.after}</span> <span className="muted">({g.prediction.delta})</span></Link></ListItem>
      : g.settles && <ListItem k="Prediction"><span className="muted">{g.settles}</span></ListItem>}
    {g.contract && <ListItem k="The goal now"><Link to="/goal#contract" className="kv-link">
      {g.target ? <>goal <span className="num">{g.target}</span>, </> : null}predicted <span className="num">{g.contract.predicted}</span>
      {g.contract.margin_s != null && <>{" "}<Pill tone={g.contract.tone && g.contract.tone !== "ok" ? g.contract.tone : undefined}>
        {mmss(g.contract.margin_s)} {g.contract.margin_s >= 0 ? "under" : "over"}</Pill></>}
      <span className="muted"> · {g.contract.days} days</span></Link></ListItem>}
    {g.race && <span className="muted t-small">Against {g.race}{g.contract?.words ? `: ${g.contract.words}` : ""}.</span>}
  </div>;
}

function Next({ d }: { d: D }) {
  return <div className="list">
    {d.next ? <ListItem k={`${d.next.dow} ${Number(d.next.date.slice(8))}`}>
      <Link to="/road" className="kv-link">{d.next.title} {d.next.km != null ? km(d.next.km) : ""}{d.next.target ? ` · ${d.next.target.text}` : ""}</Link></ListItem>
      : <span className="muted t-small">Nothing planned after this run.</span>}
    {d.plan_reacted
      ? <ul className="bullets t-small">{d.changed.map((c, i) => <li key={i}>{c}</li>)}</ul>
      : <span className="muted t-small">The plan held: nothing changed after this run.</span>}
  </div>;
}

/** The debrief of one run. `label` names where it sits ("Debrief · latest run" on Now, the run on Log). */
export function Debrief({ id, label, span = 12 }: { id: number; label?: string; span?: 6 | 8 | 12 }) {
  return <Query q={useDebrief(id)}>{d => (
    <Card id="debrief" label={label ?? `Debrief · ${dateLong(d.date)}`} span={span} lede={d.headline} tone={d.tone ?? undefined}
          aside={<span className="row" style={{ gap: "var(--sp-4)" }}>
            <Link to={`?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(location.search)), ask: "1",
              q: `About my run on ${dateLong(d.date)}, ${d.headline[0].toLowerCase()}${d.headline.slice(1)}: ` })}`} className="linkish t-small">Ask about this run ›</Link>
            <Link to={`/log?id=${d.id}`} className="linkish t-small">The run ›</Link></span>}>
      <div className="debrief">
        <section aria-label="Did I do what was asked"><h3 className="debrief-q">1 Did I do what was asked</h3><Did d={d} /></section>
        <section aria-label="What it cost"><h3 className="debrief-q">2 What it cost</h3><Cost d={d} /></section>
        <section aria-label="What it did to the goal"><h3 className="debrief-q">3 What it did to the goal</h3><Goal d={d} /></section>
        <section aria-label="What changes next"><h3 className="debrief-q">4 What's next</h3><Next d={d} /></section>
      </div>
    </Card>)}</Query>;
}
