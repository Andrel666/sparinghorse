// Today: the day in one card (verdict | session | check-in), then the week and the latest run.
import { useToday, type TodayPage } from "../lib/api";
import { bpm, dateLong, dateShort, km, minutes, pace, verdictTone } from "../lib/format";
import { Card, ListItem, PageHead, Pill } from "../components/ui";
import { Week } from "../components/Week";
import { Steps } from "../components/Steps";
import { Checkin } from "../components/Checkin";
import { Query } from "./Query";
import { Countdown } from "../components/Countdown";
import { ComponentChip, componentFirst } from "../components/Component";
import { Banner } from "../components/feedback";
import { Link } from "react-router-dom";

const VERDICT_WORD = { green: "Good to go", amber: "Go easier", red: "Hold off" } as const;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Session({ d }: { d: TodayPage }) {
  const s = d.session, n = d.next;
  if (s.kind === "pre") return (<div><span className="card-label">Training plan active</span>
    <div className="stat-value sm" style={{ marginTop: 6 }}>Training starts {s.start ? dateLong(s.start) : "soon"}</div>
    <span className="muted">Keep it easy until then — check-ins still count.</span></div>);
  if (s.kind === "post") return (<div><span className="card-label">Today</span>
    <div className="stat-value sm" style={{ marginTop: 6 }}>Road complete</div>
    <span className="muted">Generate a new plan on the <Link to="/plan">Plan</Link> page to periodize the next phase.</span></div>);
  if (s.kind === "none") return (<div><span className="card-label">Today</span>
    <div className="stat-value sm" style={{ marginTop: 6 }}>No active plan</div>
    <span className="muted">Add a race and generate a plan on the <Link to="/plan">Plan</Link> page.</span></div>);
  if (s.kind === "rest") return (
    <div>
      <span className="card-label">Today · rest day</span>
      <div className="stat-value sm" style={{ marginTop: 6 }}>{s.optional ? "Optional — week complete" : "Recovery"}</div>
      {s.note && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{s.note}</span>}
      {n && <div className="list" style={{ marginTop: "var(--sp-3)", gap: 6 }}>
        <span className="muted" style={{ fontSize: "var(--fs-small)" }}>
          Next · {n.dow} {dateShort(n.date)}{n.days > 1 ? `, in ${n.days} days` : ", tomorrow"}</span>
        <span style={{ fontSize: "var(--fs-heading)", fontWeight: 600 }}>{n.title} {km(n.km)}{n.strides ? " + strides" : ""}</span>
        {n.target && <span className="target" title={n.target.hint}>{n.target.text}</span>}
      </div>}
    </div>);
  return (
    <div className="list" style={{ gap: "var(--sp-3)" }}>
      <span className="card-label">{["Today", s.phase && `${cap(s.phase)}${s.week ? ` week ${s.week}` : ""}`].filter(Boolean).join(" · ")}</span>
      <div className="stat-value sm">{s.title} {s.km != null ? km(s.km) : ""}</div>
      <div className="row">
        {s.target && <span className="target" title={s.target.hint}>{s.target.text}</span>}
        {s.minutes && <span className="muted">about {minutes(s.minutes)}</span>}
        {s.trimp && <span className="muted">target load {s.trimp} TRIMP</span>}
        <ComponentChip k={s.component} />
        {s.done && <Pill tone="ok">done</Pill>}
      </div>
      {s.done && s.actual && <span style={{ color: "var(--ok)" }}>✓ Ran {km(s.actual.km)}{s.actual.pace ? ` at ${pace(s.actual.pace)}` : ""} today — session complete.</span>}
      {s.note && s.note.toLowerCase() !== s.title.toLowerCase() && !s.steps.length && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{s.note}</span>}
      <Steps steps={s.steps} />
      {s.why && <span className="muted" style={{ fontSize: "var(--fs-small)" }}><b>Why this session:</b> {s.why} {componentFirst(s.component) ?? ""}</span>}
    </div>);
}

export function Today() {
  return <Query q={useToday()}>{d => {
    const r = d.readiness, tone = verdictTone(r.verdict), lr = d.latest_run;
    return (
      <div className="page">
        <PageHead title="Today">
          {d.race && <Pill>{d.race.priority ? `${d.race.priority}-race · ` : ""}{d.race.label} · <Countdown date={d.race.date} time={d.race.start_time} tz={d.race.start_tz} />
            {d.race.verdict ? ` · ${d.race.verdict}` : ""}</Pill>}
        </PageHead>
        {r.halt && <Banner tone="bad"><b>⚠ Plan halted</b> — clear it with your doctor before resuming.</Banner>}
        <div className="grid">
          <section className={`card hero span-12${tone ? ` tone-${tone}` : ""}`} aria-label="Today">
            <div>
              <span className="card-label">Readiness</span>
              <div className="stat-value toned">{r.headline || (r.verdict ? VERDICT_WORD[r.verdict] : "No read yet")}</div>
              <span>{r.detail}</span>
              <details className="why"><summary>Why</summary>
                <ul>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}<li>{r.hrv_line}</li>{r.ai_line && <li>{r.ai_line}</li>}</ul></details>
            </div>
            <Session d={d} />
            <div><span className="card-label">Check in</span><Checkin initial={r.checkin} /></div>
          </section>
          {d.week && <Card label={`This week · ${km(d.week.km)} · ${d.week.runs} runs`} span={8}>
            <Week days={d.week.days} phase={d.week.phase} />
            <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{d.week.held ? `${d.week.held.text}.` : "No limit binds this week."}
              {d.week.deload ? ` ${d.week.deload}` : ""}</span>
          </Card>}
          {lr && <Card label={`Latest run · ${dateShort(lr.date)}`} span={4} tone={verdictTone(lr.verdict)}>
            <div className="list">
              <ListItem k="Distance"><span className="num">{km(lr.km)}</span></ListItem>
              <ListItem k="Pace"><span className="num">{pace(lr.pace)}</span></ListItem>
              <ListItem k="Heart rate"><span className="num">{bpm(lr.hr)}</span></ListItem>
            </div>
            {lr.verdict_text && <Pill tone={verdictTone(lr.verdict)} dot>{cap(lr.verdict_text)}</Pill>}
            {lr.cross_training && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{lr.cross_training}</span>}
            <Link to={`/runs?id=${lr.id}`} className="linkish">Open the run →</Link>
          </Card>}
        </div>
      </div>
    );
  }}</Query>;
}
