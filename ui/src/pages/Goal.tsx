// Goal: am I on track, what can I do to improve, what holds me back, did the plan keep its promises
// (docs/design/FOUR_LENSES_DESIGN.md). Concept: the gap and the levers. Data: /api/ui/goal (the contract line, the
// ranked levers with their computed effects, the limits ahead, vs the original plan); the endurance card and the
// plan's history read their own endpoints. Fitness and Body stay as deeper pages behind doors (the Goal tab stays lit).
import { Link } from "react-router-dom";
import { useGoal, type GoalPage } from "../lib/api";
import { dateLong, dateShort } from "../lib/format";
import { Card, PageHead, State, Strip } from "../components/ui";
import { Endurance } from "./plan/Endurance";
import { DriftView } from "./plan/Drift";
import { Query } from "./Query";
import { Seasons } from "../components/Seasons";

const mmss = (s: number) => { const a = Math.abs(Math.round(s)), m = Math.floor(a / 60), x = a % 60; return m ? `${m}:${String(x).padStart(2, "0")}` : `${x} s`; };

function Contract({ c }: { c: NonNullable<GoalPage["contract"]> }) {
  const lede = `${c.race}, ${dateLong(c.date)}${c.target ? `, goal ${c.target}` : ""}: ` +
    (c.predicted ? `predicted ${c.predicted}${c.lo && c.hi ? ` (${c.lo} to ${c.hi})` : ""}${c.words ? `, ${c.words}` : ""}.` : "no prediction yet.");
  return (
    <Card id="contract" label="The contract" span={12} lede={lede}>
      <Strip items={[
        ...(c.target ? [{ k: "Goal", v: c.target, s: c.type, to: "/road?view=race" }] : []),
        ...(c.predicted ? [{ k: "Predicted", v: c.predicted, s: c.lo && c.hi ? `${c.lo} to ${c.hi}` : undefined, to: "/road?view=race" }] : []),
        ...(c.margin_s != null ? [{ k: "Margin", v: `${c.margin_s >= 0 ? "" : "−"}${mmss(c.margin_s)}`, s: c.margin_s >= 0 ? "under the goal" : "over the goal",
                                    tone: (c.tone ?? undefined), to: "/road?view=race" }] : []),
        { k: "Race day", v: `${c.days} days`, s: dateShort(c.date), to: "/road" },
        ...(c.fitness_race != null ? [{ k: "Fitness on race day", v: `${Math.round(c.fitness_race)}`, s: "CTL the plan builds to", to: "/fitness#fitness-fatigue" }] : []),
      ]} />
    </Card>);
}

function Levers({ g }: { g: GoalPage }) {
  return (
    <Card id="improve" label="What you can do to improve" span={7}
          lede={g.levers.some(l => l.useful) ? "What can still move the race comes first; a computed effect says so, the rest are habits the prediction assumes." : "The plan already covers what the race needs; these hold it there."}>
      {g.levers.length ? <ol className="levers">{g.levers.map(l => (
        <li key={l.key} className={l.useful ? undefined : "lever-off"}>
          <Link to={l.link} aria-label={`${l.rank}. ${l.title}: ${l.effect}. Open`}>
            <span className="lever-n" aria-hidden="true">{l.rank}</span>
            <span><span className="lever-title">{l.title}</span><br /><span className="lever-effect">{l.effect}</span></span>
          </Link></li>))}</ol>
        : <span className="muted">Levers need a race on the plan.</span>}
    </Card>);
}

function Holding({ g }: { g: GoalPage }) {
  return (
    <Card id="holding" label="What holds the next weeks" span={5}>
      {g.holding.length ? <ul className="why-list">{g.holding.map(h => (
        <li key={h.key}><Link to={h.link} title={h.text ?? undefined}>
          <b>{h.name}</b> <span className="muted">sizes {h.weeks} of the next {h.of} weeks</span>
          {h.text ? <><br /><span className="t-small muted">{h.text.split(": ").slice(1).join(": ") || h.text}</span></> : null}
          <span className="muted"> ›</span></Link></li>))}</ul>
        : <span className="muted">No limit binds the weeks ahead.</span>}
    </Card>);
}

export function Goal() {
  return <Query q={useGoal()}>{g => (
    <div className="page">
      <PageHead title="Goal">{g.contract && <span className="aside">{g.contract.race} · {g.contract.days} days</span>}</PageHead>
      <div className="grid">
        {g.contract ? <Contract c={g.contract} />
          : <Card span={12} label="The contract"><State>No race on the plan yet. <Link to="/road?races=1">Add a race</Link> and the goal, the prediction and the levers appear here.</State></Card>}
        {g.contract && <Levers g={g} />}
        {g.contract && <Holding g={g} />}
        {g.seasons && <Seasons t={g.seasons} />}
        <Endurance />
        <div id="history" className="span-12" style={{ scrollMarginTop: 80 }}><DriftView /></div>
        <Card label="Deeper" span={12}>
          <Strip items={[
            { k: "Fitness", v: "Fitness & fatigue", s: "load, durability, efficiency, zones, the track record", to: "/fitness" },
            { k: "Body", v: "Markers", s: "HRV, sleep, weight, labs", to: "/fitness?tab=body" },
            { k: "Race day", v: "Pacing plan", s: "splits, HR guardrails, the morning", to: "/road?view=race" },
          ]} />
        </Card>
      </div>
    </div>)}</Query>;
}
