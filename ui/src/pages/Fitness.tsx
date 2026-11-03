// Fitness: the dashboard's numbers — shape, fitness and fatigue, load, volume, zones, easy-run check,
// durability, efficiency, track record. Every sentence and verdict arrives from /api/ui/fitness.
import { useFitness } from "../lib/api";
import { bpm, dateShort, km, pace, verdictTone } from "../lib/format";
import { Card, ListItem, PageHead, Pill } from "../components/ui";
import { Bars, Gauge, Lines, Spark } from "../components/charts";
import { Query } from "./Query";

const signed = (v: number | null) => (v == null ? "" : `${v > 0 ? "+" : ""}${v.toFixed(1)} in 4 weeks`);

export function Fitness() {
  return <Query q={useFitness()}>{d => (
    <div className="page">
      <PageHead title="Fitness" />
      <div className="grid">
        {d.tiles.map(t => (
          <Card key={t.key} label={t.label} span={3} aside={<span className="muted" title={t.hint} style={{ fontSize: "var(--fs-label)" }}>{t.unit}</span>}>
            <div className="stat-value num">{t.value == null ? "—" : t.value.toFixed(1)}</div>
            <span className="stat-sub">{t.word || signed(t.delta)}</span>
            <Spark pts={t.series} />
          </Card>
        ))}
        <Card label="Fitness & fatigue · 6 months" span={8}>
          <Lines series={[{ pts: d.chart.ctl, color: "var(--accent)", label: "Fitness" },
                          { pts: d.chart.atl, color: "var(--ph-build)", label: "Fatigue" }]} />
        </Card>
        <Card label="Load" span={4} tone={d.load.state === "high" ? "warn" : undefined}>
          {d.load.acwr != null && <>
            <div className="stat-value sm num">{d.load.acwr.toFixed(2)}×</div>
            <Gauge value={d.load.acwr} band={d.load.band} />
            <span style={{ fontSize: "var(--fs-small)" }}>{d.load.text}</span>
          </>}
          {d.load.ramp != null && <ListItem k="Last 7 days">Fitness {d.load.ramp > 0 ? "+" : ""}{d.load.ramp} — {d.load.ramp_word}</ListItem>}
        </Card>
        <Card label="Weekly distance · 26 weeks" span={8}>
          <Bars items={d.weekly.map(w => ({ label: w.week, v: w.km }))} unit="km" />
          <span className="muted" style={{ fontSize: "var(--fs-small)" }}>Last week {km(d.weekly.at(-1)?.km)}</span>
        </Card>
        <Card label="Zones" span={4}>
          <div className="list">{d.zones.map(z => (
            <ListItem key={z.label} k={z.label.split(" /")[0]}>
              <span className="num">{z.pace ? `${z.pace}/km` : "—"}</span>
              <span className="muted num"> · {z.hr ? (z.hr.lo && z.hr.hi ? `${z.hr.lo}–${z.hr.hi}` : z.hr.hi ? `≤ ${z.hr.hi}` : `≥ ${z.hr.lo}`) + " bpm" : "—"}</span>
            </ListItem>))}</div>
        </Card>
        <Card label={`Easy runs · last ${d.easy.window_days} days`} span={6}
              tone={verdictTone(d.easy.too_hard ? "too_hard" : d.easy.hot ? "hot" : d.easy.judged ? "on" : null)}>
          <div className="row" style={{ alignItems: "baseline" }}>
            <span className="stat-value sm num toned">{d.easy.on ?? 0}/{d.easy.judged ?? 0}</span>
            <span className="muted">easy enough, judged by {d.easy.by} {d.easy.ceiling ? `(${d.easy.ceiling})` : ""}</span>
          </div>
          <div className="list">{d.easy.runs.map(r => (
            <ListItem key={r.date} k={dateShort(r.date)}>
              <span className="num">{km(r.km)} · {pace(r.pace)} · {bpm(r.hr)}</span>{" "}
              <Pill tone={verdictTone(r.verdict)}>{r.verdict_text}</Pill>
            </ListItem>))}</div>
        </Card>
        <Card label="Durability" span={3}><span>{d.durability.text}</span>
          {d.durability.note && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{d.durability.note}</span>}</Card>
        <Card label="Aerobic efficiency" span={3} tone={d.efficiency.verdict === "improving" ? "ok" : undefined}>
          <span>{d.efficiency.text}</span></Card>
        <Card label="Prediction track record" span={12}><span className="muted">{d.track.text}</span></Card>
      </div>
    </div>
  )}</Query>;
}
