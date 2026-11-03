// Today: the day in one card (verdict | session | check-in), then the week and the latest run.
import { useToday, type TodayPage } from "../lib/api";
import { ago, bpm, dateShort, km, minutes, pace, verdictTone } from "../lib/format";
import { Card, ListItem, PageHead, Pill } from "../components/ui";
import { Week } from "../components/Week";
import { Steps } from "../components/Steps";
import { Checkin } from "../components/Checkin";
import { Query } from "./Query";

const VERDICT_WORD = { green: "Good to go", amber: "Go easier", red: "Hold off" } as const;
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

function Session({ d }: { d: TodayPage }) {
  const s = d.session, n = d.next;
  if (s.kind === "rest") return (
    <div>
      <span className="card-label">Today · rest day</span>
      <div className="stat-value sm" style={{ marginTop: 6 }}>Recovery</div>
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
        {s.done && <Pill tone="ok">done</Pill>}
      </div>
      {s.actual && <span>Ran {km(s.actual.km)} at {pace(s.actual.pace)}</span>}
      <Steps steps={s.steps} />
    </div>);
}

export function Today() {
  return <Query q={useToday()}>{d => {
    const r = d.readiness, tone = verdictTone(r.verdict), lr = d.latest_run;
    return (
      <div className="page">
        <PageHead title="Today">
          <Pill>synced {ago(d.sync_minutes)}</Pill>
          {d.race && <Pill>{d.race.label} · {d.race.days} days</Pill>}
        </PageHead>
        <div className="grid">
          <section className={`card hero span-12${tone ? ` tone-${tone}` : ""}`} aria-label="Today">
            <div>
              <span className="card-label">Readiness</span>
              <div className="stat-value toned">{r.headline || (r.verdict ? VERDICT_WORD[r.verdict] : "No read yet")}</div>
              <span>{r.detail}</span>
              {r.reasons.length > 0 && <details className="why"><summary>Why</summary>
                <ul>{r.reasons.map((x, i) => <li key={i}>{x}</li>)}</ul></details>}
            </div>
            <Session d={d} />
            <div><span className="card-label">Check in</span><Checkin initial={r.checkin} /></div>
          </section>
          {d.week && <Card label={`This week · ${km(d.week.km)} · ${d.week.runs} runs`} span={8}>
            <Week days={d.week.days} phase={d.week.phase} />
            {d.week.held && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{d.week.held.text}.</span>}
          </Card>}
          {lr && <Card label={`Latest run · ${dateShort(lr.date)}`} span={4} tone={verdictTone(lr.verdict)}>
            <div className="list">
              <ListItem k="Distance"><span className="num">{km(lr.km)}</span></ListItem>
              <ListItem k="Pace"><span className="num">{pace(lr.pace)}</span></ListItem>
              <ListItem k="Heart rate"><span className="num">{bpm(lr.hr)}</span></ListItem>
            </div>
            {lr.verdict_text && <Pill tone={verdictTone(lr.verdict)} dot>{cap(lr.verdict_text)}</Pill>}
          </Card>}
        </div>
      </div>
    );
  }}</Query>;
}
