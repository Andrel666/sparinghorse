// Fork §SEASON — this season against the past ones, aligned on race day (sh_seasons.py). The words, the races and
// every number come from /api/ui/goal's `seasons`; this lays out the check, the lines and the table.
// The lines put every season on THIS season's calendar (race day minus the days out), so "today" lines up.
import { type Seasons as T, type SeasonRow, type SeasonPoint } from "../lib/api";
import { Card, Strip, Table } from "./ui";
import { Lines, type Series } from "./charts";

const PAST = ["var(--z4)", "var(--z3)", "var(--z2)"];

/** This season, the two best past seasons by VDOT, and the last one: the lines a reader can tell apart. */
function picked(rows: SeasonRow[]) {
  const best = [...rows].filter(r => r.vdot != null).sort((a, b) => (b.vdot ?? 0) - (a.vdot ?? 0)).slice(0, 2);
  const last = rows.at(-1);
  return [...best, ...(last && !best.includes(last) ? [last] : [])];
}

function lines(t: T, key: "vo2" | "bpk"): Series[] {
  const pts = (s: SeasonPoint[]) => s.filter(p => p[key] != null).map(p => ({ date: p.date, v: p[key] as number }));
  return [
    ...picked(t.seasons).map((r, i) => ({ pts: pts(r.series), color: PAST[i % PAST.length], label: `${r.season} ${r.type} ${r.time}` })),
    ...(t.now ? [{ pts: pts(t.now.series), color: "var(--signal)", label: "This season" }] : []),
  ].filter(s => s.pts.length > 1);
}

export function Seasons({ t }: { t: T }) {
  if (!t.seasons.length) return <Card id="seasons" label="This season against the past ones" span={12}>
    <span className="muted">{t.reason}</span></Card>;
  const c = t.check, n = t.now;
  return (
    <Card id="seasons" label="This season against the past ones" span={12} lede={c?.summary}>
      <Strip items={[
        ...(n?.vo2 != null ? [{ k: "VO₂max now", v: `${n.vo2}`, s: [n.latest_vo2, c?.vo2_for_goal ? `goal needs ≈${c.vo2_for_goal} on race eve` : null].filter(Boolean).join(" · ") || undefined, to: "#seasons" }] : []),
        ...(n?.bpk != null ? [{ k: "Beats per km", v: `${n.bpk}`, s: [n.latest_bpk, "median, last 4 weeks"].filter(Boolean).join(" · "), to: "#seasons" }] : []),
        ...(c?.expected ? [{ k: "Your history says", v: c.expected, s: c.best_case ? `${c.best_case} at best` : undefined, to: "#seasons" }] : []),
        ...(c?.model ? [{ k: "The model says", v: c.model, s: c.ctl_plan ? `at fitness ${c.ctl_plan}` : undefined, to: "/road?view=race" }] : []),
      ]} />
      <div className="seasons-charts">
        <figure><figcaption className="muted t-label">VO₂max, by days to race</figcaption>
          <Lines series={lines(t, "vo2")} height={180} /></figure>
        <figure><figcaption className="muted t-label">Beats per km, by days to race (lower is better)</figcaption>
          <Lines series={lines(t, "bpk")} height={180} fmt={v => v.toFixed(0)} /></figure>
      </div>
      <Table phone="scroll" keyOf={r => `${r.season}`} rows={t.seasons} cols={[
        { head: "Season", cell: r => `${r.season} ${r.type}` },
        { head: "Time", cell: r => r.time, num: true },
        { head: "VDOT", cell: r => r.vdot ?? "—", num: true },
        { head: `As a ${t.race?.type ?? "race"}`, cell: r => r.equivalent ?? "—", num: true },
        { head: `VO₂max ${t.race?.days_out ?? ""} d out`, cell: r => r.same_point.vo2 ?? "—", num: true },
        { head: "VO₂max race eve", cell: r => r.eve.vo2 ?? "—", num: true },
        { head: "Beats/km race eve", cell: r => r.eve.bpk ?? "—", num: true },
        { head: "km/week, 12 wk", cell: r => r.eve.km_week_12, num: true },
        { head: "Longest, 12 wk", cell: r => r.eve.long_12, num: true },
      ]} />
      {n && <p className="t-small muted">This season, {t.race?.days_out} days out: VO₂max {n.vo2 ?? "—"}, beats per km {n.bpk ?? "—"}, {n.km_week} km a week, longest {n.long_12} km.</p>}
      {!!t.tracked?.length && <ul className="bullets t-small">{t.tracked.map(x => <li key={x.key}>{x.text}</li>)}</ul>}
    </Card>);
}
