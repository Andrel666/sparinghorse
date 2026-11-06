// Runs: every run on a calendar with totals; a picked run opens with its numbers, read-back, profile,
// map and the data tools (ignore, delete).
import { ZONE_COLORS } from "../lib/format";
import { Icon } from "../components/Icon";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRun, useRunsLog, useRunsMonth } from "../lib/api";
import { useAction } from "../lib/actions";
import { dateLong, dateShort, km, pace, verdictTone } from "../lib/format";
import { Card, PageHead, Pill, Row, Seg, Strip } from "../components/ui";
import { addMonth } from "../components/layout";
import { Calendar } from "../components/Calendar";
import { RunMap } from "../components/RunMap";
import { Profile } from "../components/Profile";
import { Help } from "../components/feedback";
import { Query } from "./Query";

const ZONE = ZONE_COLORS;
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
            {r.ignored ? <><Pill>Ignored</Pill><button className="btn" onClick={() => ignore.mutate(false)}>Undo</button></>
              : <button className="btn" title="Exclude this run from your stats (reversible)" onClick={() => ignore.mutate(true)}><Icon name="hide" /> Ignore</button>}
            <button className="btn" onClick={() => del.mutate()}><Icon name="trash" /> Delete</button></span>}>
      {r.split && <Pill>1+1 · part {r.split.index}/{r.split.parts} — the whole run was {km(r.split.km)} in {r.split.min} min; these numbers are this part only</Pill>}
      <div className="figures run-hero">{r.stats.filter(s => s.v && s.primary).map(s =>
        <div key={s.k} className="figure"><span className="k">{s.k}</span><span className="v">{s.v}</span></div>)}</div>
      <div className="run-secondary">{r.stats.filter(s => s.v && !s.primary).map(s =>
        <div key={s.k}><span className="muted">{s.k}</span> <b className="num">{s.v}</b></div>)}</div>
      {r.readback?.kind && <span><b>Read back:</b> {r.readback.composite ? `1+1 (${r.readback.composite} parts) · ` : ""}{r.readback.kind}
        {r.readback.summary ? ` — ${r.readback.summary}` : ""}{r.readback.rough ? " · rough signal" : ""}
        <Help>Detected from the run's own streams: warm-up, work and recovery segments, and what kind of session that adds up to.</Help></span>}
      {r.readback?.strides && <span className="muted"><b>Strides read:</b> {r.readback.strides}</span>}
      {r.verdict_text && <Pill tone={verdictTone(r.verdict)} dot>{r.verdict_text}</Pill>}
      <Profile id={id} />
      <RunMap id={id} />
    </Card>)}</Query>;
}

/** The run list: grouped by week with a subtotal, one Row per run (the read-back kind, time, km, pace, HR). */
function Log({ month, range, picked, onPick, onMonth }: { month?: string; range: string | null; picked?: number; onPick: (id: number) => void;
  onMonth: (m: string) => void }) {
  return <Query q={useRunsLog(month, range)}>{l => {
    const byId = new Map(l.runs.map(r => [r.id, r]));
    const [y, mo] = l.month.split("-").map(Number);
    const title = range ? `Last ${range.replace("d", " days")}` : new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
    return <div className="list" style={{ gap: "var(--sp-3)" }}>
      <div className="month-nav">
        <button type="button" className="btn" aria-label="Previous month" onClick={() => onMonth(addMonth(l.month, range ? 0 : -1))}>‹</button>
        <b>{title}</b>
        <button type="button" className="btn" aria-label="Next month" disabled={!range && l.month >= new Date().toISOString().slice(0, 7)}
                onClick={() => onMonth(addMonth(l.month, 1))}>›</button>
      </div>
      {!l.runs.length && <span className="muted">No runs {range ? "in these days" : `in ${title}`}.</span>}
      {l.weeks.map(w => <div key={w.start}>
        <div className="week-head"><span>Week of {dateShort(w.start)}</span><span className="num">{km(w.km)} · {w.runs} run{w.runs > 1 ? "s" : ""}</span></div>
        {w.ids.map(id => { const r = byId.get(id)!;
          return <Row key={id} onClick={() => onPick(id)} active={picked === id}
                      label={`${r.dow} ${Number(r.date.slice(8))}: ${r.kind} ${km(r.km)}${r.verdict_text ? `, ${r.verdict_text}` : ""}. Open the run`}
                      lead={`${r.dow} ${Number(r.date.slice(8))}`}
                      main={r.kind} sub={[r.time, r.verdict_text].filter(Boolean).join(" · ")}
                      cols={[{ v: km(r.km), w: 8 }, { v: pace(r.pace), w: 9, muted: true }, { v: r.hr ? `${r.hr} bpm` : "", w: 8, muted: true }]}
                      trail={<span className="zdot" style={{ background: r.z != null ? ZONE[r.z] : "var(--line-strong)" }} aria-hidden="true" />} />; })}
      </div>)}
    </div>;
  }}</Query>;
}

export function Runs() {
  // URL state: ?view=log|calendar &month= &range=7d &id=
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "calendar" ? "calendar" : "log";
  const month = params.get("month") || undefined, range = params.get("range");
  const set = (k: Record<string, string | null>) => setParams(p => { const n = new URLSearchParams(p);
    Object.entries(k).forEach(([a, b]) => b == null ? n.delete(a) : n.set(a, b)); return n; }, { replace: true });
  const [choose, setChoose] = useState<string | null>(null);
  const picked = params.get("id") ? Number(params.get("id")) : undefined;
  const pick = (id?: number) => { setChoose(null); set({ id: id ? String(id) : null }); };
  const setMonth = (m: string) => { setChoose(null); set({ month: m, range: null }); };
  return <Query q={useRunsMonth(month)}>{m => {
    const run = picked ?? Object.values(m.days).flat().at(-1)?.id;
    return (
      <div className="page">
        <PageHead title="Runs">
          <Seg label="Runs view" value={view} onChange={v => set({ view: v === "log" ? null : v })}
               options={[{ v: "log", label: "Log" }, { v: "calendar", label: "Calendar" }]} />
        </PageHead>
        <div className={`grid runs-split${picked ? " has-run" : ""}`}>
          <div className="span-5 runs-left list" style={{ gap: "var(--gap-group)" }}>
            <Strip items={[
              { k: range ? `Last ${range.replace("d", " days")}` : new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "long", timeZone: "UTC" }), v: `${m.stats.runs ?? 0} runs`, s: km(m.stats.km as number),
                onClick: () => document.getElementById("totals")?.scrollIntoView({ behavior: "smooth" }) },
              { k: "12 months", v: `${m.stats12.runs ?? 0} runs`, s: km(m.stats12.km as number),
                onClick: () => document.getElementById("totals")?.scrollIntoView({ behavior: "smooth" }) }]} />
            {view === "log" ? <Log month={month} range={range} picked={run} onPick={id => pick(id)} onMonth={setMonth} /> : <>
            <Calendar month={m.month} onMonth={setMonth} selected={choose}
              onDay={(date, c) => { const xs = c.days[date]?.runs ?? []; if (xs.length > 1) setChoose(date); else if (xs[0]) pick(xs[0].id); }} />
            {choose && <div role="group" aria-label="Runs that day">{(m.days[choose] || []).map(x => (
              <Row key={x.id} onClick={() => pick(x.id)} lead={x.t} main={km(x.km)} cols={[{ v: pace(x.pace), w: 9, muted: true }]}
                   trail={<span className="zdot" style={{ background: x.z != null ? ZONE[x.z] : "var(--line-strong)" }} />} />))}</div>}</>}
            <div id="totals" className="table-wrap stack-off"><table className="steps">
              <thead><tr><th /><th className="num">Month</th><th className="num">12 mo</th><th className="num">All time</th></tr></thead>
              <tbody>{TOTALS.map(([k, t, f]) => <tr key={k}><td>{t}</td><td className="num">{f(m.stats[k])}</td><td className="num">{f(m.stats12[k])}</td>
                <td className="num">{f(m.statsAll[k])}</td></tr>)}</tbody></table></div>
            {m.since && <span className="muted" style={{ fontSize: "var(--fs-label)" }}>All time = since {new Date(m.since).toLocaleDateString()}</span>}
          </div>
          <div className="span-7 runs-right">
            {picked && <button type="button" className="linkish phone-only" onClick={() => pick(undefined)}>‹ Runs</button>}
            {run ? <RunDetail id={run} onGone={() => pick(undefined)} /> : <Card span={12}><span className="muted">No runs this month.</span></Card>}
          </div>
        </div>
      </div>);
  }}</Query>;
}
