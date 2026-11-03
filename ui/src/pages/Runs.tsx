// Runs: every run on a calendar with totals; a picked run opens with its numbers, read-back, profile,
// map and the data tools (ignore, delete).
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRun, useRunsMonth } from "../lib/api";
import { useAction } from "../lib/actions";
import { dateLong, km, pace, verdictTone } from "../lib/format";
import { Card, PageHead, Pill } from "../components/ui";
import { MonthGrid } from "../components/layout";
import { RunMap } from "../components/RunMap";
import { Profile } from "../components/Profile";
import { Help } from "../components/feedback";
import { Query } from "./Query";

const ZONE = ["var(--ph-rebase)", "var(--ph-base)", "var(--ok)", "var(--warn)", "var(--bad)"];
const TOTALS: [string, string, (v: unknown) => string][] = [["runs", "Runs", v => String(v ?? "—")], ["km", "Distance", v => km(v as number)],
  ["hms", "Time on feet", v => String(v ?? "—")], ["pace", "Avg pace", v => pace(v as string)], ["hr_avg", "Avg HR", v => v ? `${v} bpm` : "—"],
  ["trimp", "Load", v => v ? `${Number(v).toLocaleString().replace(/,/g, " ")} TRIMP` : "—"], ["longest_km", "Longest run", v => km(v as number)]];

function RunDetail({ id, onGone }: { id: number; onGone: () => void }) {
  const ignore = useAction<{ ok: boolean }, boolean>(on => `/api/activity/${id}/${on ? "ignore" : "unignore"}`, () => ({ reason: "manual" }),
    { done: () => "Saved — your stats are recomputed" });
  const del = useAction<{ ok: boolean }>(`/api/activity/${id}/delete`, undefined, {
    confirm: { title: "Delete this activity?", ok: "Delete locally",
      lines: ["It is removed from this app's copy only — Runalyze keeps it.", "Fitness, fatigue and the plan are recomputed without it.",
              "A full backfill would bring it back if Runalyze still has it."], alt: "Use Ignore instead to exclude it reversibly." },
    done: () => { onGone(); return "Activity deleted"; } });
  return <Query q={useRun(id)}>{r => (
    <Card span={7} label={`${dateLong(r.date)}${r.time ? ` · ${r.time}` : ""} · ${r.sport}${r.title ? ` — ${r.title}` : ""}`} tone={verdictTone(r.verdict)}
          aside={<span className="row">
            {r.ignored ? <><Pill>⊘ ignored</Pill><button className="btn" onClick={() => ignore.mutate(false)}>Undo</button></>
              : <button className="btn" title="Exclude this run from your stats (reversible)" onClick={() => ignore.mutate(true)}>⊘ Ignore</button>}
            <button className="btn" onClick={() => del.mutate()}>🗑 Delete</button></span>}>
      {r.split && <Pill>1+1 · part {r.split.index}/{r.split.parts} — the whole run was {km(r.split.km)} in {r.split.min} min; these numbers are this part only</Pill>}
      <div className="row" style={{ gap: "var(--sp-3) var(--sp-5)" }}>
        {r.stats.filter(s => s.v).map(s => <div key={s.k} style={{ minWidth: 96 }}><div className="muted" style={{ fontSize: "var(--fs-label)" }}>{s.k}</div>
          <div className="num" style={{ fontWeight: 600 }}>{s.v}</div></div>)}
      </div>
      {r.readback?.kind && <span><b>Read back:</b> {r.readback.composite ? `1+1 (${r.readback.composite} parts) · ` : ""}{r.readback.kind}
        {r.readback.summary ? ` — ${r.readback.summary}` : ""}{r.readback.rough ? " · rough signal" : ""}
        <Help>Detected from the run's own streams: warm-up, work and recovery segments, and what kind of session that adds up to.</Help></span>}
      {r.readback?.strides && <span className="muted"><b>Strides read:</b> {r.readback.strides}</span>}
      {r.verdict_text && <Pill tone={verdictTone(r.verdict)} dot>{r.verdict_text}</Pill>}
      <Profile id={id} />
      <RunMap id={id} />
    </Card>)}</Query>;
}

export function Runs() {
  const [params, setParams] = useSearchParams();
  const [month, setMonth] = useState<string>();
  const [choose, setChoose] = useState<string | null>(null);
  const picked = params.get("id") ? Number(params.get("id")) : undefined;
  const pick = (id?: number) => { setChoose(null); setParams(id ? { id: String(id) } : {}, { replace: true }); };
  return <Query q={useRunsMonth(month)}>{m => {
    const run = picked ?? Object.values(m.days).flat().at(-1)?.id;
    const other = new Set(m.other || []);
    return (
      <div className="page">
        <PageHead title="Runs" />
        <div className="grid">
          <Card span={5} label="Calendar">
            <MonthGrid month={m.month} weekStart={m.week_start} first={m.first} last={m.last} onMonth={mm => { setChoose(null); setMonth(mm); }}
              selected={choose || undefined}
              cell={date => { const xs = m.days[date] || [];
                return { pickable: xs.length > 0, body: <>
                  {xs.slice(0, 3).map(x => (
                    <span key={x.id} className="lbl row" style={{ gap: 4 }} title={`${km(x.km)} @ ${pace(x.pace)}${x.sj ? " (split recording)" : ""}`}>
                      <span style={{ width: 8, height: 8, borderRadius: 4, background: x.z != null ? ZONE[x.z] : "var(--muted)" }} />{x.km}</span>))}
                  {xs.length > 3 && <span className="lbl">+{xs.length - 3}</span>}
                  {other.has(date) && <span className="lbl muted" title="Another sport that day">·</span>}</> }; }}
              onPick={date => { const xs = m.days[date] || []; if (xs.length > 1) setChoose(date); else pick(xs[0]?.id); }} />
            {choose && <div className="row" role="group" aria-label="Runs that day">{(m.days[choose] || []).map(x => (
              <button key={x.id} type="button" className="btn" onClick={() => pick(x.id)}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: x.z != null ? ZONE[x.z] : "var(--muted)", display: "inline-block" }} /> {x.t} · {km(x.km)} @ {pace(x.pace)}</button>))}</div>}
            <span className="row muted" style={{ fontSize: "var(--fs-label)", gap: 8 }}>{ZONE.map((c, i) => <span key={i} className="row" style={{ gap: 3 }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: c, display: "inline-block" }} />Z{i + 1}</span>)}<span>· grey no HR · dot = other sport</span>
              <Help>The dot colour is the run's average-heart-rate zone.</Help></span>
            <div className="table-wrap"><table className="steps">
              <thead><tr><th /><th>Month</th><th>12 mo</th><th>All time</th></tr></thead>
              <tbody>{TOTALS.map(([k, t, f]) => <tr key={k}><td>{t}</td><td className="num">{f(m.stats[k])}</td><td className="num">{f(m.stats12[k])}</td>
                <td className="num">{f(m.statsAll[k])}</td></tr>)}</tbody></table></div>
            {m.since && <span className="muted" style={{ fontSize: "var(--fs-label)" }}>All time = since {new Date(m.since).toLocaleDateString()}</span>}
          </Card>
          {run ? <RunDetail id={run} onGone={() => pick(undefined)} /> : <Card span={7}><span className="muted">No runs this month.</span></Card>}
        </div>
      </div>);
  }}</Query>;
}
