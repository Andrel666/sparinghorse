// Today, top to bottom: what to do today and whether to do it, where you are on the road to the race,
// this week and why it looks like that, the latest run, the overnight signals. Every number is a door.
// The check-in and each day's detail open in a drawer (?checkin=1, ?day=), so back closes them.
import { useSearchParams, Link } from "react-router-dom";
import { useToday, type TodayPage, type Where } from "../lib/api";
import { bpm, dateLong, dateShort, km, minutes, pace, verdictTone } from "../lib/format";
import { Card, PageHead, Pill, Strip } from "../components/ui";
import { Week } from "../components/Week";
import { Steps } from "../components/Steps";
import { Checkin, checkinLine } from "../components/Checkin";
import { Query } from "./Query";
import { ComponentChip } from "../components/Component";
import { Banner } from "../components/feedback";
import { Drawer } from "../components/layout";
import { DayDetail, type DaySession } from "../components/Session";
import { Spark } from "../components/charts";

const VERDICT_WORD = { green: "Good to go", amber: "Go easier", red: "Hold off" } as const;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
const MARKER_TONE = { ok: "ok", watch: "warn" } as const;
const DOW_LONG: Record<string, string> = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };

/** The left of the day band: whatever decides today's action, at hero size. */
function Hero({ d, onDay }: { d: TodayPage; onDay: (date: string) => void }) {
  const s = d.session, n = d.next, r = d.readiness;
  const caution = r.halt || r.verdict === "amber" || r.verdict === "red";
  if (s.kind === "pre" || s.kind === "post" || s.kind === "none") {
    const t = s.kind === "pre" ? { h: `Training starts ${s.start ? dateShort(s.start) : "soon"}`, to: "/plan", a: "See the plan" }
      : s.kind === "post" ? { h: "Road complete", to: "/plan", a: "Build the next plan" }
      : { h: "No plan yet", to: "/plan?races=1", a: "Add a race" };
    return <div><div className="hero-v">{t.h}</div>
      <Link to={t.to} className="btn primary" style={{ alignSelf: "flex-start" }}>{t.a}</Link></div>;
  }
  if (s.kind === "rest") return (
    <div>
      <span className="eyebrow">Rest day</span>
      {n ? <>
        <button type="button" className="hero-link" onClick={() => onDay(n.date)} aria-label={`${n.title} ${km(n.km)}: show the session`}>
          <span className="hero-v">{n.race ? "Race" : n.title} {km(n.km)}</span></button>
        <div className="meta">
          <span>{n.days === 1 ? "Tomorrow" : `${DOW_LONG[n.dow] ?? n.dow} ${dateShort(n.date)}`}</span>
          {n.target && <span className="target" title={n.target.hint}>{n.target.text}</span>}
          {n.minutes ? <span className="muted">~{minutes(n.minutes)}</span> : null}
          {n.strides ? <span className="muted">+ {n.strides}× strides</span> : null}
        </div>
      </> : <div className="hero-v">Recovery</div>}
    </div>);
  const title = `${s.race ? "Race" : s.title} ${s.km != null ? km(s.km) : ""}`;
  return (
    <div>
      <span className="eyebrow">Today</span>
      {caution
        ? <span className={`second${r.verdict === "red" || r.halt ? " struck-hero" : ""}`}>{title}</span>
        : <button type="button" className="hero-link" onClick={() => onDay(d.today)} aria-label={`${title}: show the session`}>
            <span className="hero-v">{title}</span></button>}
      <div className="meta">
        {s.target && <Link to="/fitness#zones" className="target" title={s.target.hint} style={{ textDecoration: "none" }}>{s.target.text}</Link>}
        {s.minutes ? <span className="muted">~{minutes(s.minutes)}</span> : null}
        <ComponentChip k={s.component} />
      </div>
      {s.done && s.actual && <span><span className="mk-ok">✓</span> Ran {km(s.actual.km)}{s.actual.pace ? ` at ${pace(s.actual.pace)}` : ""}{" "}
        {s.activity_id ? <Link to={`/runs?id=${s.activity_id}`} className="linkish">Open ›</Link> : null}</span>}
      <Steps steps={s.steps} />
    </div>);
}

/** The right of the day band: the verdict (hero-sized when it asks for caution), and the check-in as one quiet line. */
function Verdict({ d, onCheckin }: { d: TodayPage; onCheckin: () => void }) {
  const r = d.readiness, s = d.session;
  const caution = r.halt || r.verdict === "amber" || r.verdict === "red";
  const word = r.headline || (r.verdict ? VERDICT_WORD[r.verdict] : "No read yet");
  const line = checkinLine(r.checkin, r.saved_at);
  return (
    <div>
      <span className="eyebrow">Readiness</span>
      <span className={`${caution && !["rest", "pre", "post", "none"].includes(s.kind) ? "hero-v" : "second"} toned`}>{word}</span>
      <span>{r.for_label || r.detail}</span>
      <details className="why"><summary>Why</summary>
        <ul>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}<li>{r.hrv_line}</li>{r.ai_line && <li>{r.ai_line}</li>}</ul></details>
      <button type="button" className="checkin-open" onClick={onCheckin}>
        {line ? <><span className="mk-ok" aria-hidden="true">✓</span> {line}</> : "Check in"}</button>
    </div>);
}

/** The whole road as one bar of weeks, grouped by phase: past weeks filled, this week in signal. Each week opens its plan. */
function Journey({ w }: { w: Where }) {
  let i = 0;
  return (
    <div className="journey" role="group" aria-label={`Week ${w.n} of ${w.of}: ${w.phase} week ${w.phase_n} of ${w.phase_of}`}>
      {w.phases.map((p, k) => {
        const cells = w.weeks.slice(i, i + p.weeks); i += p.weeks;
        return <div key={k} className={`jp${p.current ? " now" : ""}`} style={{ flexGrow: p.weeks }}>
          <span className="jp-name">{p.name}</span>
          <div className="jp-cells">{cells.map(c => (
            <Link key={c.start} to={`/plan?week=${c.start}`} aria-label={`Week of ${dateShort(c.start)}${c.km != null ? `, ${km(c.km)}` : ""}. Open the week`}
                  className={`jc${c.past ? " past" : ""}${c.current ? " now" : ""}${c.race ? " race" : ""}`} />))}</div>
        </div>;
      })}
    </div>);
}

function WhereYouAre({ w }: { w: Where }) {
  const f = w.fitness;
  return (
    <Card label="Where you are" span={12}>
      <Journey w={w} />
      <Strip items={[
        ...(w.n ? [{ k: "Week", v: `${w.n} of ${w.of}`, s: w.phase ? `${w.phase} ${w.phase_n} of ${w.phase_of}` : undefined, to: "/plan#road" }] : []),
        ...(f.now != null ? [{ k: "Fitness", v: f.race != null ? `${f.now} → ${f.race}` : `${f.now}`, s: f.race != null ? "now → race day" : "CTL", to: "/fitness#fitness-fatigue" }] : []),
        ...(w.pred ? [{ k: "Prediction", v: w.pred.hms, s: [w.pred.goal && `goal ${w.pred.goal}`, w.pred.short].filter(Boolean).join(" · "),
                        tone: w.pred.tone ?? undefined, to: "/plan?view=race" }] : []),
        ...(w.race?.days != null ? [{ k: w.race.label ?? "Race", v: `${w.race.days} days`, s: dateShort(w.race.date), to: "/plan?view=race" }] : []),
      ]} />
    </Card>);
}

function Why({ items }: { items: NonNullable<TodayPage["why"]> }) {
  return <ul className="why-list">{items.map(x => (
    <li key={x.key}><Link to={x.link} title={x.detail}>{x.text}<span className="muted"> ›</span></Link></li>))}</ul>;
}

function Recovery({ items }: { items: NonNullable<TodayPage["recovery"]> }) {
  if (!items.length) return <span className="muted">No overnight data yet.</span>;
  return <div>{items.map(m => (
    <Link key={m.key} to={m.link ?? `/fitness?tab=body#${m.key}`} className="marker-row" aria-label={`${m.label} ${m.value} ${m.unit}. ${m.sub}. Open the marker`}>
      <div className="list" style={{ gap: 2 }}>
        <span className="muted t-label">{m.label}</span>
        <span className={`num marker-v${m.state ? ` tone-${MARKER_TONE[m.state]} toned` : ""}`}>{m.value}<small> {m.unit}</small></span>
        <span className="muted t-label">{m.sub}</span>
      </div>
      <div className="marker-spark">{m.series.length > 1 ? <Spark pts={m.series} /> : null}</div>
    </Link>))}
  </div>;
}

function LatestRun({ lr }: { lr: NonNullable<TodayPage["latest_run"]> }) {
  return (
    <Card label={`Latest run · ${dateShort(lr.date)}`} span={6} tone={verdictTone(lr.verdict)}>
      <Strip items={[
        { k: "Distance", v: km(lr.km), to: `/runs?id=${lr.id}` },
        ...(lr.minutes != null ? [{ k: "Time", v: minutes(lr.minutes), to: `/runs?id=${lr.id}` }] : []),
        { k: "Pace", v: pace(lr.pace), to: `/runs?id=${lr.id}` },
        { k: "Heart rate", v: bpm(lr.hr), to: `/runs?id=${lr.id}` },
      ]} />
      {(lr.verdict_line || lr.verdict_text) && <Link to="/fitness#easy" style={{ textDecoration: "none", color: "inherit", alignSelf: "flex-start" }}>
        <Pill tone={verdictTone(lr.verdict)} dot>{lr.verdict_line ?? cap(lr.verdict_text!)}</Pill></Link>}
      {lr.cross_training && <span className="muted t-small">{lr.cross_training}</span>}
    </Card>);
}

export function Today() {
  const [params, setParams] = useSearchParams();
  const day = params.get("day"), checkin = params.get("checkin") === "1";
  const setParam = (k: string, v: string | null) => setParams(p => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; });
  const setDay = (d: string | null) => setParam("day", d);
  return <Query q={useToday()}>{d => {
    const r = d.readiness, lr = d.latest_run, w = d.week;
    const verdictTn = verdictTone(r.verdict);
    const inWeek = !!(w && day && day >= w.start && day <= w.days[6].date);
    const daySessions: DaySession[] = !day ? [] : inWeek ? (w!.sessions ?? []).filter(x => x.date === day) : (d.coming ?? []).filter(x => x.date === day);
    const dayInfo = inWeek ? w!.days.find(x => x.date === day) : undefined;
    const ranHere = (dayInfo?.runs ?? []).filter(run => !daySessions.some(s => s.activity_id === run.activity_id && !s.moved_to));
    return (
      <div className="page">
        <PageHead title="Today">
          <span className="aside">{(d.dateline ?? dateLong(d.today)).split(" · ")[0]}</span>
        </PageHead>
        {r.halt && <Banner tone="bad"><b>Plan halted.</b> Clear it with your doctor before resuming.</Banner>}
        <section className={`dayband${verdictTn ? ` tone-${verdictTn}` : ""}`} aria-label="Today">
          <Hero d={d} onDay={setDay} />
          <Verdict d={d} onCheckin={() => setParam("checkin", "1")} />
        </section>
        <div className="grid">
          {d.where && <WhereYouAre w={d.where} />}
          {w && <Card label="This week" span={8}
                      aside={<Link to="/plan" className="linkish t-small">Plan ›</Link>}>
            {w.km_done != null && <>
              <span className="num">{w.km_done} of {w.km} km · {w.runs_done} of {w.runs_planned} runs</span>
              <div className="meter" role="img" aria-label={`${w.km_done} of ${w.km} km run`}>
                <span style={{ width: `${Math.min(100, w.km ? (100 * w.km_done) / w.km : 0)}%`, background: "var(--text)" }} /></div></>}
            <Week days={w.days} phase={w.phase} onDay={w.sessions ? setDay : undefined} selected={day} today={d.today} />
          </Card>}
          {!!d.why?.length && <Card label="Why this week" span={4}><Why items={d.why} /></Card>}
          {lr && <LatestRun lr={lr} />}
          {d.recovery && <Card label="Recovery" span={6}><Recovery items={d.recovery} /></Card>}
        </div>
        <Drawer title={day ? dateLong(day) : ""} open={!!day} onClose={() => setDay(null)}>
          <DayDetail sessions={daySessions} ranHere={ranHere} movedFrom={dayInfo?.moved_from} onRun={() => setDay(null)} />
        </Drawer>
        <Drawer title="Check in" open={checkin} onClose={() => setParam("checkin", null)}>
          <Checkin initial={r.checkin} onSaved={() => setParam("checkin", null)} />
        </Drawer>
      </div>
    );
  }}</Query>;
}
