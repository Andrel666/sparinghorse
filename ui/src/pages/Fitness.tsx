// Fitness: the dashboard's analysis — shape, fitness and fatigue with the plan's projection, load,
// the full weekly history, zones, the easy-run check, durability, efficiency, track record.
// Every number, sentence and verdict arrives from /api/ui/fitness.
import { useFitness, type FitnessPage } from "../lib/api";
import { bpm, dateShort, km, pace, verdictTone } from "../lib/format";
import { Card, ListItem, PageHead, Pill, Table } from "../components/ui";
import { Bars, Gauge, Lines, Scatter, Spark, type Dot } from "../components/charts";
import { Query } from "./Query";

const signed = (v: number | null) => (v == null ? "" : `${v > 0 ? "+" : ""}${v.toFixed(1)} in 4 weeks`);
const day = (iso: string) => new Date(iso + "T00:00:00").getTime() / 86400000;
const BUILD_COLOR = (b: { pb: boolean; current: boolean }) => (b.current ? "var(--accent)" : b.pb ? "var(--ok)" : "var(--ph-rebase)");

type Run = FitnessPage["easy"]["runs"][number];
const EASY_COLS = [
  { head: "Date", cell: (r: Run) => dateShort(r.date) },
  { head: "Session", cell: (r: Run) => r.kind },
  { head: "Distance", cell: (r: Run) => km(r.km), num: true },
  { head: "Pace (GAP)", cell: (r: Run) => pace(r.pace), num: true },
  { head: "Avg HR", cell: (r: Run) => `${bpm(r.hr)}${r.hr_pct ? ` · ${r.hr_pct}%` : ""}`, num: true },
  { head: "Drift", cell: (r: Run) => (r.decoupling != null ? `${r.decoupling}%` : "—"), num: true },
  { head: "TE", cell: (r: Run) => r.te ?? "—", num: true },
  { head: "Feel", cell: (r: Run) => r.feel ?? "—" },
  { head: "Verdict", cell: (r: Run) => <Pill tone={verdictTone(r.verdict)}>{r.verdict_text}</Pill> },
];

export function Fitness() {
  return <Query q={useFitness()}>{d => {
    const dd = d.durability_detail, ed = d.efficiency_detail;
    // every long run is a dot; a build's race is a ring in that build's colour
    const raceKey = new Set(dd.builds.flatMap(b => b.runs.filter(r => r.race).map(r => `${r.km}|${r.pct}`)));
    const durDots: Dot[] = [
      ...dd.points.filter(p => !raceKey.has(`${p.km}|${p.pct}`)).map(p => ({ x: p.km, y: p.pct, color: "var(--muted)",
        label: `${p.date}: ${p.km} km, fade ${p.pct}%${p.hr ? ` at ${p.hr} bpm` : ""}` })),
      ...dd.builds.flatMap(b => b.runs.filter(r => r.pct != null).map(r => ({ x: r.km, y: r.pct as number, color: BUILD_COLOR(b),
        ring: r.race, label: `${b.label}${r.race ? " race" : ""}: ${r.km} km, fade ${r.pct}%` })))];
    const t0 = ed.points[0] ? day(ed.points[0].date) : 0;
    const efDots: Dot[] = ed.points.map(p => ({ x: day(p.date) - t0, y: p.v, color: "var(--accent)",
      label: `${p.date}: ${p.v} · ${p.km} km at ${p.pace}/km, ${p.hr} bpm${p.temp != null ? `, ${p.temp} °C` : ""}` }));
    return (
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
          <Card label="Fitness & fatigue · 6 months and the plan to race day" span={8}>
            <Lines series={[{ pts: d.chart.ctl, color: "var(--accent)", label: "Fitness" },
                            { pts: d.chart.atl, color: "var(--ph-build)", label: "Fatigue" },
                            { pts: d.chart.plan, color: "var(--accent)", label: "Planned fitness", dashed: true }]} />
            {d.chart.check && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>
              Model {d.chart.check.model.fitness} / {d.chart.check.model.fatigue} vs Runalyze {d.chart.check.runalyze.fitness} / {d.chart.check.runalyze.fatigue}
              {d.chart.check.close ? " — they agree." : " — they differ; a sync or a duplicate may be missing."}</span>}
          </Card>
          <Card label="Load" span={4} tone={d.load.state === "high" ? "warn" : undefined}>
            {d.load.acwr != null && <>
              <div className="stat-value sm num">{d.load.acwr.toFixed(2)}×</div>
              <Gauge value={d.load.acwr} band={d.load.band} />
              <span style={{ fontSize: "var(--fs-small)" }}>{d.load.text}</span>
            </>}
            {d.load.ramp != null && <ListItem k="Last 7 days">Fitness {d.load.ramp > 0 ? "+" : ""}{d.load.ramp} — {d.load.ramp_word}</ListItem>}
          </Card>
          <Card label={`Weekly distance · all ${d.weekly.length} weeks (scroll back)`} span={8}>
            <Bars scroll items={d.weekly.map(w => ({ label: w.week, v: w.km }))} unit="km" />
            <span className="muted" style={{ fontSize: "var(--fs-small)" }}>Last week {km(d.weekly.at(-1)?.km)} · hover a bar for its week</span>
          </Card>
          <Card label="Zones" span={4}>
            <div className="list">{d.zones.map(z => (
              <ListItem key={z.label} k={z.label.split(" /")[0]}>
                <span className="num">{z.pace ? `${z.pace}/km` : "—"}</span>
                <span className="muted num"> · {z.hr ? (z.hr.lo && z.hr.hi ? `${z.hr.lo}–${z.hr.hi}` : z.hr.hi ? `≤ ${z.hr.hi}` : `≥ ${z.hr.lo}`) + " bpm" : "—"}</span>
              </ListItem>))}</div>
          </Card>
          <Card label={`Easy runs · last ${d.easy.window_days} days`} span={12}
                tone={verdictTone(d.easy.too_hard ? "too_hard" : d.easy.hot ? "hot" : d.easy.judged ? "on" : null)}>
            <div className="row" style={{ alignItems: "baseline" }}>
              <span className="stat-value sm num toned">{d.easy.on ?? 0}/{d.easy.judged ?? 0}</span>
              <span className="muted">easy enough, judged by {d.easy.by} {d.easy.ceiling ? `(${d.easy.ceiling})` : ""}</span>
            </div>
            {d.easy.agreement && <span style={{ fontSize: "var(--fs-small)" }}>{d.easy.agreement}</span>}
            {d.easy.lt1 && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{d.easy.lt1}</span>}
            <Table cols={EASY_COLS} rows={d.easy.runs} keyOf={r => r.date + r.km} />
          </Card>
          <Card label="Durability · fade on long runs" span={6}>
            <span>{d.durability.text}</span>
            <Scatter dots={durDots} xLabel="distance (km)" yLabel="fade %" refs={dd.lines} />
            <span className="muted" style={{ fontSize: "var(--fs-label)" }}>Grey: long runs · rings: race day, in its build's colour · lower is better</span>
            <div className="row">{dd.builds.map(b => (
              <Pill key={b.label}><span className="dot" style={{ background: BUILD_COLOR(b) }} />{b.label}{b.pb ? " · best" : ""}
                {b.race_pct != null ? ` · race ${b.race_pct}%` : ""}</Pill>))}</div>
            {d.durability.note && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{d.durability.note}</span>}
          </Card>
          <Card label="Aerobic efficiency · speed per heartbeat" span={6} tone={d.efficiency.verdict === "improving" ? "ok" : undefined}>
            <span>{d.efficiency.text}</span>
            <Scatter dots={efDots} xLabel="date" yLabel="efficiency" xFmt={v => new Date((t0 + v) * 86400000).toISOString().slice(0, 10)}
                     fit={ed.fit ? ed.fit.map(p => [day(p.date) - t0, p.v] as [number, number]) : undefined} />
            {ed.points.some(p => p.temp != null) && <Bars items={ed.points.map(p => ({ label: `${p.date} · ${p.temp ?? "?"} °C`, v: p.temp ?? 0 }))} height={40} unit="°C" />}
            {ed.temp_note && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{ed.temp_note}</span>}
          </Card>
          <Card label="Prediction track record" span={12}>
            <span className="muted">{d.track.text}</span>
            <Table cols={[{ head: "Forecast made", cell: (r: FitnessPage["track_detail"][number]) => `${r.lead_days} days ahead` },
                          { head: "Scored", cell: r => r.n, num: true },
                          { head: "Typical error", cell: r => (r.median_err_pct != null ? `${r.median_err_pct}%` : "—"), num: true },
                          { head: "Leaning", cell: r => (r.direction && r.direction !== "unknown" ? r.direction : "—") }]}
                   rows={d.track_detail} keyOf={r => String(r.lead_days)} />
          </Card>
        </div>
      </div>
    );
  }}</Query>;
}
