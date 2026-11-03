// Runs: every run on a calendar with totals; a picked run opens with its map, numbers and read-back.
import { useState } from "react";
import { useRun, useRunsMonth } from "../lib/api";
import { dateLong, verdictTone } from "../lib/format";
import { Card, ListItem, PageHead, Pill } from "../components/ui";
import { MonthGrid } from "../components/layout";
import { RunMap } from "../components/RunMap";
import { Query } from "./Query";

const ZONE = ["var(--ph-rebase)", "var(--ph-base)", "var(--ok)", "var(--warn)", "var(--bad)"];
const TOTALS: [string, string][] = [["runs", "Runs"], ["km", "Distance (km)"], ["hms", "Time on feet"], ["pace", "Avg pace"],
  ["hr_avg", "Avg HR"], ["longest_km", "Longest (km)"]];

function RunDetail({ id }: { id: number }) {
  return <Query q={useRun(id)}>{r => (
    <Card span={7} label={`${dateLong(r.date)} · ${r.title || r.sport}`} tone={verdictTone(r.verdict)}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        {r.stats.filter(s => s.v).map(s => <div key={s.k}><div className="muted" style={{ fontSize: "var(--fs-label)" }}>{s.k}</div>
          <div className="num" style={{ fontWeight: 600 }}>{s.v}</div></div>)}
      </div>
      <div className="row">
        {r.readback?.kind && <Pill>Read back: {r.readback.kind}{r.readback.summary ? ` · ${r.readback.summary}` : ""}</Pill>}
        {r.verdict_text && <Pill tone={verdictTone(r.verdict)} dot>{r.verdict_text}</Pill>}
      </div>
      <RunMap id={id} />
    </Card>)}</Query>;
}

export function Runs() {
  const [month, setMonth] = useState<string>();
  const [run, setRun] = useState<number>();
  return <Query q={useRunsMonth(month)}>{m => {
    const firstRun = run ?? Object.values(m.days).flat().at(-1)?.id;
    return (
      <div className="page">
        <PageHead title="Runs" />
        <div className="grid">
          <Card span={5} label="Calendar">
            <MonthGrid month={m.month} weekStart={m.week_start} first={m.first} last={m.last} onMonth={setMonth}
              selected={undefined}
              cell={date => { const xs = m.days[date] || [];
                return { pickable: xs.length > 0, body: xs.map(x => (
                  <span key={x.id} className="lbl row" style={{ gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 4, background: x.z != null ? ZONE[x.z] : "var(--muted)" }} />
                    {x.km}</span>)) }; }}
              onPick={date => setRun((m.days[date] || [])[0]?.id)} />
            <div className="list">{TOTALS.map(([k, t]) => (
              <ListItem key={k} k={t}><span className="num">{String(m.stats[k] ?? "—")}</span>
                <span className="muted num"> · 12 mo {String(m.stats12[k] ?? "—")} · all {String(m.statsAll[k] ?? "—")}</span></ListItem>))}</div>
          </Card>
          {firstRun ? <RunDetail id={firstRun} /> : <Card span={7}><span className="muted">No runs this month.</span></Card>}
        </div>
      </div>);
  }}</Query>;
}
