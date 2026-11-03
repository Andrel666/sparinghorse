// Today: should I run, what exactly, and log it — all on the first screen.
import { useToday } from "../lib/api";
import { ago, bpm, dateShort, km, minutes, pace, verdictTone } from "../lib/format";
import { Card, PageHead, Pill, Stat } from "../components/ui";
import { Week } from "../components/Week";
import { Steps } from "../components/Steps";
import { Checkin } from "../components/Checkin";
import { Query } from "./Query";

const VERDICT_WORD = { green: "Good to go", amber: "Go easier", red: "Hold off" } as const;

export function Today() {
  return <Query q={useToday()}>{d => {
    const r = d.readiness, s = d.session, tone = verdictTone(r.verdict);
    return (
      <div className="page">
        <PageHead title="Today">
          <Pill>synced {ago(d.sync_minutes)}</Pill>
          {d.race && <Pill>{d.race.label} · {d.race.days} days</Pill>}
          {r.verdict && <Pill tone={tone} dot>{VERDICT_WORD[r.verdict]}</Pill>}
        </PageHead>
        <div className="grid">
          <Card label="Readiness" span={4} tone={tone}>
            <Stat value={r.headline || (r.verdict ? VERDICT_WORD[r.verdict] : "No read yet")} sub={r.detail} />
            {r.reasons.length > 0 && <ul className="muted" style={{ margin: 0, paddingLeft: 18, fontSize: "var(--fs-small)" }}>
              {r.reasons.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}</ul>}
          </Card>
          <Card label={["Today's session", s.phase && `${s.phase}${s.week ? ` week ${s.week}` : ""}`].filter(Boolean).join(" · ")} span={8}>
            <Stat value={s.kind === "rest" ? "Rest day" : `${s.title} ${s.km != null ? km(s.km) : ""}`}
                  sub={s.kind === "rest" ? s.note : [s.target?.text, s.minutes ? `about ${minutes(s.minutes)}` : null,
                       s.done ? "done" : null].filter(Boolean).join(" · ")} />
            {s.actual && <span>Ran {km(s.actual.km)} at {pace(s.actual.pace)}</span>}
            <Steps steps={s.steps} />
            {s.kind !== "rest" && <Checkin initial={r.checkin} />}
          </Card>
          {d.week && <Card label={`This week · ${km(d.week.km)} · ${d.week.runs} runs`} span={8}>
            <Week days={d.week.days} phase={d.week.phase} />
            {d.week.held && <span className="muted">{d.week.held.text}.</span>}
          </Card>}
          {d.latest_run && <Card label={`Latest run · ${dateShort(d.latest_run.date)}`} span={4}
                                 tone={verdictTone(d.latest_run.verdict)}>
            <Stat small value={km(d.latest_run.km)}
                  sub={`${pace(d.latest_run.pace)} · ${bpm(d.latest_run.hr)}`} />
            {d.latest_run.verdict_text && <span>{d.latest_run.verdict_text[0].toUpperCase() + d.latest_run.verdict_text.slice(1)}</span>}
          </Card>}
          {s.kind === "rest" && <Card label="Check in" span={8}><Checkin initial={r.checkin} /></Card>}
        </div>
      </div>
    );
  }}</Query>;
}
