// Body: recovery and health markers over time, grouped, with each reading's state against its range.
import { useBody } from "../lib/api";
import { dateShort, reading } from "../lib/format";
import { Card, ListItem, PageHead, Pill } from "../components/ui";
import { Spark } from "../components/charts";
import { CLASSIC } from "../lib/pages";
import { Query } from "./Query";

const GROUPS: [string, string][] = [["heart", "Heart"], ["sleep", "Sleep"], ["weight", "Weight"], ["labs", "Lab values"]];

export function Body() {
  return <Query q={useBody()}>{d => (
    <div className="page">
      <PageHead title="Body"><a className="btn" href={`${CLASSIC}/#sec-health`}>Add a reading (Classic)</a></PageHead>
      {!d.markers.length && <Card><span className="muted">No health readings yet. Runalyze sync brings resting HR and sleep; lab values are added by hand.</span></Card>}
      {GROUPS.map(([g, title]) => {
        const ms = d.markers.filter(m => m.group === g);
        return ms.length ? (
          <section key={g} className="list" style={{ gap: "var(--sp-3)" }}>
            <h2 style={{ fontSize: "var(--fs-heading)" }}>{title}</h2>
            <div className="grid">{ms.map(m => (
              <Card key={m.key} span={3} label={m.label} tone={m.state === "watch" ? "warn" : undefined}
                    aside={m.stale ? <Pill>old</Pill> : undefined}>
                <div className="row" style={{ alignItems: "baseline" }}>
                  <span className="stat-value sm num">{reading(m.value)}</span><span className="muted">{m.unit}</span></div>
                <span className="stat-sub">{dateShort(m.date)}{m.delta != null ? ` · ${m.delta > 0 ? "+" : ""}${m.delta} in 30 days` : ""}</span>
                <Spark pts={m.series} color={m.state === "watch" ? "var(--warn)" : "var(--accent)"} />
              </Card>))}</div>
          </section>) : null;
      })}
      <Card label="Injury history">
        {d.injuries.length ? <div className="list">{d.injuries.map(i => (
          <ListItem key={i.start} k={dateShort(i.start)}>{i.label || "injury"}{i.end ? ` · until ${dateShort(i.end)}` : ""}</ListItem>))}</div>
          : <span className="muted">None listed. Add past injuries in Settings → Athlete; calibration and the coach use them.</span>}
      </Card>
    </div>
  )}</Query>;
}
