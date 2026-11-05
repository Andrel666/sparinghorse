// Today: the day in one band (verdict | session | check-in), the headline numbers, then the week (each day opens),
// the latest run, what's coming and the overnight signals — the first page, so most questions end here.
import { useState } from "react";
import { useToday, type TodayPage } from "../lib/api";
import { bpm, dateLong, dateShort, km, minutes, pace, verdictTone } from "../lib/format";
import { Card, Figures, ListItem, PageHead, Pill } from "../components/ui";
import { Drawer } from "../components/layout";
import { DayDetail, type DaySession } from "../components/Session";
import { Spark } from "../components/charts";
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

const MARKER_TONE = { ok: "ok", watch: "warn" } as const;

function Coming({ items, onDay }: { items: NonNullable<TodayPage["coming"]>; onDay: (d: string) => void }) {
  if (!items.length) return <span className="muted">Nothing planned ahead.</span>;
  return <div className="list" style={{ gap: 0 }}>{items.map(c => (
    <button key={c.date + c.kind} type="button" className="sline coming" onClick={() => onDay(c.date)} title="Show the session">
      <span className="muted">{c.dow} {Number(c.date.slice(8))}</span>
      <span><b>{c.race ? "Race" : c.title}</b> {km(c.km)}{c.strides ? ` + ${c.strides}× strides` : ""}
        {c.target && <span className="muted"> · {c.target.text}</span>}</span>
      <span className="muted num">{c.minutes ? `~${minutes(c.minutes)}` : ""}</span>
      <span className="muted">{c.days === 1 ? "tomorrow" : `in ${c.days} d`} ›</span>
    </button>))}</div>;
}

function Recovery({ items }: { items: NonNullable<TodayPage["recovery"]> }) {
  if (!items.length) return <span className="muted">No overnight data yet — HRV, resting HR and sleep arrive with the watch sync.</span>;
  return <div className="list" style={{ gap: 0 }}>{items.map(m => (
    <div key={m.key} className="marker-row">
      <div className="list" style={{ gap: 2 }}>
        <span className="muted" style={{ fontSize: "var(--fs-label)" }}>{m.label}</span>
        <span className={`num marker-v${m.state ? ` tone-${MARKER_TONE[m.state]} toned` : ""}`}>{m.value}<small> {m.unit}</small></span>
        <span className="muted" style={{ fontSize: "var(--fs-label)" }}>{m.sub}</span>
      </div>
      <div className="marker-spark">{m.series.length > 1 && <Spark pts={m.series} />}</div>
    </div>))}
    <Link to="/body" className="linkish" style={{ marginTop: "var(--sp-2)" }}>All body markers →</Link>
  </div>;
}

export function Today() {
  const [day, setDay] = useState<string | null>(null);
  return <Query q={useToday()}>{d => {
    const r = d.readiness, tone = verdictTone(r.verdict), lr = d.latest_run, w = d.week;
    // the day drawer reads this week's sessions, or a coming one further out
    const daySessions: DaySession[] = !day ? [] : w && day >= w.start && day <= w.days[6].date
      ? (w.sessions ?? []).filter(x => x.date === day) : (d.coming ?? []).filter(x => x.date === day);
    const glance = d.glance ?? [];
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
          {glance.length > 0 && <div className="span-12"><Figures items={glance.map(g => ({
            k: g.label, v: g.value, s: g.sub, tone: g.tone ?? undefined, to: g.link }))} /></div>}
          {w && <Card label="This week" span={8}
                      aside={<Link to="/plan" className="linkish" style={{ fontSize: "var(--fs-small)" }}>Plan this week →</Link>}>
            {w.km_done != null && <div className="meter" role="img" aria-label={`${w.km_done} of ${w.km} km run`}>
              <span style={{ width: `${Math.min(100, w.km ? (100 * w.km_done) / w.km : 0)}%`, background: "var(--text)" }} /></div>}
            <Week days={w.days} phase={w.phase} onDay={w.sessions ? setDay : undefined} selected={day} today={d.today} />
            <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{w.sessions ? "Pick a day for its session, targets and the run. " : ""}
              {w.held ? `${w.held.text}.` : "No limit binds this week."}{w.deload ? ` ${w.deload}` : ""}</span>
          </Card>}
          {lr && <Card label={`Latest run · ${dateShort(lr.date)}`} span={4} tone={verdictTone(lr.verdict)}>
            <div className="list">
              <ListItem k="Distance"><span className="num">{km(lr.km)}</span></ListItem>
              {lr.minutes != null && <ListItem k="Time"><span className="num">{minutes(lr.minutes)}</span></ListItem>}
              <ListItem k="Pace"><span className="num">{pace(lr.pace)}</span></ListItem>
              <ListItem k="Heart rate"><span className="num">{bpm(lr.hr)}{lr.hr_max ? ` · max ${lr.hr_max}` : ""}</span></ListItem>
              {lr.trimp != null && <ListItem k="Load"><span className="num">{lr.trimp} TRIMP</span></ListItem>}
              {lr.te != null && <ListItem k="Training effect"><span className="num">{lr.te}</span></ListItem>}
              {lr.recovery_h != null && <ListItem k="Recovery"><span className="num">{lr.recovery_h} h</span></ListItem>}
            </div>
            {lr.verdict_text && <Pill tone={verdictTone(lr.verdict)} dot>{cap(lr.verdict_text)}</Pill>}
            {lr.cross_training && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{lr.cross_training}</span>}
            <Link to={`/runs?id=${lr.id}`} className="linkish">Open the run →</Link>
          </Card>}
          {d.coming && <Card label="Coming up" span={8}><Coming items={d.coming} onDay={setDay} /></Card>}
          {d.recovery && <Card label="Recovery" span={4}><Recovery items={d.recovery} /></Card>}
        </div>
        <Drawer title={day ? dateLong(day) : ""} open={!!day} onClose={() => setDay(null)}>
          <DayDetail sessions={daySessions} onRun={() => setDay(null)} />
          <Link to="/plan" className="linkish" onClick={() => setDay(null)}>See the week on the Plan page →</Link>
        </Drawer>
      </div>
    );
  }}</Query>;
}
