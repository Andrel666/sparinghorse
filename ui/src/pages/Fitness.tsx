// Fitness: the dashboard's analysis — shape, fitness and fatigue with the plan's projection, load,
// the full weekly history, zones, the easy-run check, durability, efficiency, track record.
// Every number, sentence and verdict arrives from /api/ui/fitness.
import { useFitness, type FitnessPage } from "../lib/api";
import { bpm, dateShort, dayNum, km, numDay, pace, verdictTone } from "../lib/format";
import { Card, ListItem, PageHead, Pill, Seg, Strip, Table } from "../components/ui";
import { Banner } from "../components/feedback";
import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { BodyView } from "./Body";
import { Bars, Gauge, Lines, Scatter, Spark, type Dot } from "../components/charts";
import { Query } from "./Query";

const day = dayNum;

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

/** Fitness and Body share one page: the tab is URL state (?tab=body), so /body and Today's markers link into it. */
export function Fitness() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "body" ? "body" : "fitness";
  const head = <PageHead title="Fitness">
    <Seg label="Fitness view" value={tab} onChange={v => setParams(v === "body" ? { tab: "body" } : {})}
         options={[{ v: "fitness", label: "Fitness" }, { v: "body", label: "Body" }]} /></PageHead>;
  return tab === "body" ? <div className="page">{head}<BodyView /></div> : <FitnessView head={head} />;
}

function FitnessView({ head }: { head: ReactNode }) {
  return <Query q={useFitness()}>{d => {
    const ed = d.efficiency_detail;
    const t0 = ed.points[0] ? day(ed.points[0].date) : 0;
    const efDots: Dot[] = ed.points.map((p, i) => ({ x: day(p.date) - t0, y: p.v, color: i === ed.points.length - 1 ? "var(--signal)" : "var(--text)",
      label: `${p.date}: ${p.v} · ${p.km} km at ${p.pace}/km, ${p.hr} bpm${p.temp != null ? `, ${p.temp} °C` : ""}` }));
    return (
      <div className="page">
        {head}
        <div className="grid">
          <div className="span-12"><Strip items={d.strip.map(t => ({ k: t.label, v: t.value ?? "—", s: t.sub, tone: t.tone ?? undefined, to: t.link,
            spark: t.series.length > 1 ? <Spark pts={t.series} /> : undefined }))} /></div>
          <Card id="fitness-fatigue" label="Fitness & fatigue" lede={d.ff_headline ?? undefined} span={8}>
            <Lines series={[{ pts: d.chart.ctl, color: "var(--text)", label: "Fitness" },
                            { pts: d.chart.atl, color: "var(--ph-base)", label: "Fatigue" },
                            { pts: d.chart.plan, color: "var(--signal)", label: "Planned fitness", dashed: true },
                            { pts: d.chart.tsb, color: "", label: "Form", hidden: true },
                            { pts: d.chart.acwr, color: "", label: "Load ratio", hidden: true }]} />
            {d.chart.check && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>
              Model {d.chart.check.model.fitness} / {d.chart.check.model.fatigue} vs Runalyze {d.chart.check.runalyze.fitness} / {d.chart.check.runalyze.fatigue}
              {d.chart.check.close ? " — they agree." : " — they differ; a sync or a duplicate may be missing."}</span>}
            {d.chart.duplicates > 0 && !d.chart.check?.close && <Banner tone="warn">Heads-up: {d.chart.duplicates} duplicate
              activities inflate Runalyze's numbers. Delete them on Runalyze, or delete the leftover copy here (banner at the top).</Banner>}
          </Card>
          <Card id="load" label="Load" span={4} tone={d.load.state === "high" ? "warn" : undefined}>
            {d.load.acwr != null && <>
              <div className="stat-value sm num">{d.load.acwr.toFixed(2)}×</div>
              <Gauge value={d.load.acwr} band={d.load.band} />
              <span style={{ fontSize: "var(--fs-small)" }}>{d.load.text}</span>
            </>}
            {d.load.ramp != null && <ListItem k="Last 7 days">Fitness {d.load.ramp > 0 ? "+" : ""}{d.load.ramp} — {d.load.ramp_word}</ListItem>}
          </Card>
          <Card id="easy" label={`Easy runs · last ${d.easy.window_days} days`} span={12}
                tone={verdictTone(d.easy.too_hard ? "too_hard" : d.easy.hot ? "hot" : d.easy.judged ? "on" : null)}>
            <div className="row" style={{ alignItems: "baseline" }}>
              <span className="stat-value sm num toned">{d.easy.on ?? 0}/{d.easy.judged ?? 0}</span>
              <span className="muted">easy enough, judged by {d.easy.by} {d.easy.ceiling ? `(${d.easy.ceiling})` : ""}</span>
            </div>
            {d.easy.agreement && <span style={{ fontSize: "var(--fs-small)" }}>{d.easy.agreement}</span>}
            {d.easy.lt1 && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{d.easy.lt1} {d.easy.lthr_note ?? ""}</span>}
            {d.easy.detrained && <span style={{ fontSize: "var(--fs-small)" }}>{d.easy.detrained}</span>}
            {d.easy.field_test && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{d.easy.field_test}</span>}
            <Table cols={EASY_COLS} rows={d.easy.runs} keyOf={r => r.date + r.km} />
          </Card>
          <Card id="weekly" label="Weekly distance" lede={d.weekly_headline ?? undefined} span={8}>
            <Bars scroll items={d.weekly.map(w => ({ label: w.week, v: w.km }))} unit="km" />
          </Card>
          <Card id="zones" label="Zones" span={4}>
            <div className="list">{d.zones.map(z => (
              <ListItem key={z.label} k={z.label.split(" /")[0]}>
                <span className="num">{z.pace ? `${z.pace}/km` : "—"}</span>
                <span className="muted num"> · {z.hr ? (z.hr.lo && z.hr.hi ? `${z.hr.lo}–${z.hr.hi}` : z.hr.hi ? `≤ ${z.hr.hi}` : `≥ ${z.hr.lo}`) + " bpm" : "—"}</span>
              </ListItem>))}</div>
            <span className="muted" style={{ fontSize: "var(--fs-label)" }}>{d.zones_note}</span>
          </Card>
          <Durability d={d} />
          <Card id="efficiency" label="Aerobic efficiency · speed per heartbeat" span={6} tone={d.efficiency.verdict === "improving" ? "ok" : undefined}>
            <span>{d.efficiency.text}</span>
            <Scatter dots={efDots} xLabel="date" yLabel="efficiency" xFmt={v => numDay(t0 + v)}
                     fit={ed.fit ? ed.fit.map(p => [day(p.date) - t0, p.v] as [number, number]) : undefined} />
            {ed.points.some(p => p.temp != null) && <Bars items={ed.points.map(p => ({ label: `${p.date} · ${p.temp ?? "?"} °C`, v: p.temp ?? 0 }))} height={40} unit="°C" />}
            {ed.temp_note && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{ed.temp_note}</span>}
          </Card>
          {d.track_full.races.length === 0 && !d.track_full.lines.length
            ? <Card id="track" label="Prediction track record" span={12}><span className="muted">{d.track_full.empty ?? "Nothing scored yet."}</span></Card>
            : <Card id="track" label="Prediction track record" span={12}>
            {d.track_full.lines.map(l => <span key={l}>{l}</span>)}
            {d.track_full.races.length > 0 && <Table cols={[{ head: "Race", cell: (r: FitnessPage["track_full"]["races"][number]) => r.label },
              { head: "Date", cell: r => dateShort(r.date) }, { head: "Scored at", cell: r => r.at },
              { head: "Band", cell: r => r.band ? <Pill tone={r.band === "inside" ? "ok" : "bad"}>{r.band}</Pill> : "—" },
              { head: "Error", cell: r => (r.err_pct != null ? `${r.err_pct > 0 ? "+" : ""}${r.err_pct}%` : ""), num: true }]}
              rows={d.track_full.races} keyOf={r => r.date + r.at} />}
          </Card>}
        </div>
      </div>
    );
  }}</Query>;
}

const DUR_KEY = "sh-ui-dur-view";
function Durability({ d }: { d: FitnessPage }) {
  const m = d.durability_more, dd = d.durability_detail;
  const [view, setView] = useState<"chart" | "table">(() => { try { return (localStorage.getItem(DUR_KEY) as "chart" | "table") || (window.innerWidth < 640 ? "table" : "chart"); } catch { return "chart"; } });
  const [cmp, setCmp] = useState<string | null>(m.default_compare);
  const set = (v: "chart" | "table") => { setView(v); try { localStorage.setItem(DUR_KEY, v); } catch { /* private window */ } };
  const cur = m.builds.find(b => b.current), other = m.builds.find(b => b.key === cmp);
  const color = (b: { current: boolean; key: string }) => b.current ? "var(--signal)" : b.key === cmp ? "var(--text)" : "var(--ph-base)";
  const raceKey = new Set(m.builds.flatMap(b => b.runs.filter(r => r.race).map(r => `${r.km}|${r.pct}`)));
  const dots: Dot[] = [
    ...dd.points.filter(p => !raceKey.has(`${p.km}|${p.pct}`)).map(p => ({ x: p.km, y: p.pct, color: "var(--ph-base)", label: `${p.date}: ${p.km} km, fade ${p.pct}%` })),
    ...m.builds.filter(b => b.current || b.key === cmp).flatMap(b => b.runs.filter(r => r.pct != null).map(r => ({ x: r.km, y: r.pct as number,
      color: color(b), ring: r.race, label: `${b.label}${r.race ? " race" : ""}: ${r.km} km, fade ${r.pct}%` })))];
  const fitLine = (b?: typeof cur) => b?.fit ? [[m.min_km, b.fit.intercept + b.fit.slope * m.min_km], [42, b.fit.intercept + b.fit.slope * 42]] as [number, number][] : undefined;
  const tint = (v: number) => v < 5 ? "ok" : v <= 10 ? "warn" : "bad";
  return (
    <Card id="durability" label="Durability · fade on long runs" span={6} aside={<span className="seg" role="group" aria-label="View">
      <button type="button" aria-pressed={view === "chart"} onClick={() => set("chart")}>Chart</button>
      <button type="button" aria-pressed={view === "table"} onClick={() => set("table")}>Table</button></span>}>
      <span>{m.headline || d.durability.text}</span>
      {view === "chart" ? <>
        <Scatter dots={dots} xLabel="distance (km)" yLabel="fade %" refs={dd.lines} fit={fitLine(cur) || fitLine(other)} />
        <div className="row"><span className="muted" style={{ fontSize: "var(--fs-label)" }}>Compare with</span>
          {m.builds.filter(b => !b.current).map(b => <button key={b.key} type="button" className={`btn${b.key === cmp ? " primary" : ""}`} aria-pressed={b.key === cmp}
            onClick={() => setCmp(b.key)}>{b.label}{b.pb ? " (best)" : ""}</button>)}</div>
        <div className="row">{[cur, other].filter(Boolean).map(b => <Pill key={b!.key}><span className="dot" style={{ background: color(b!) }} />
          {b!.label}: {b!.horizon} · {b!.current ? `${b!.n} runs so far` : b!.pb ? "best build" : `${b!.n} runs`}</Pill>)}</div>
        <span className="muted" style={{ fontSize: "var(--fs-label)" }}>Grey: long runs · rings: race day · lower is better</span>
      </> : <Table phone="scroll" cols={[{ head: "Build", cell: (b: FitnessPage["durability_more"]["builds"][number]) => `${b.label}${b.pb ? " · best" : ""}` },
          ...m.bands.map((band, i) => ({ head: band, num: true, cell: (b: FitnessPage["durability_more"]["builds"][number]) => b.cells[i]
            ? <span className={`tone-${tint(b.cells[i]!.median)} toned`}>{b.cells[i]!.median}% <span className="muted">({b.cells[i]!.n})</span></span> : <span className="muted">—</span> })),
          { head: "Race", num: true, cell: b => b.race_pct != null ? <span className={`tone-${tint(b.race_pct)} toned`}>{b.race_pct}%</span> : b.current ? "race day" : "—" }]}
          rows={m.builds} keyOf={b => b.key} />}
      <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{m.footnote}{d.durability.note ? ` · ${d.durability.note}` : ""}</span>
    </Card>);
}
