// Plan: the road to the race and why each week looks the way it does. Week, Month, Race day, History;
// generate, races, adjustments. The server decides and words everything; this page lays it out.
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePlan, usePlanCalendar, useRacePlan, useShell, type PlanPage, type SessionDetail } from "../lib/api";
import { useAction } from "../lib/actions";
import { dateLong, dateShort, km, pace } from "../lib/format";
import { Card, Figures, ListItem, PageHead, Pill } from "../components/ui";
import { Drawer, MonthGrid, Tabs } from "../components/layout";
import { Road } from "../components/Road";
import { Week } from "../components/Week";
import { DayDetail } from "../components/Session";
import { ComponentChip } from "../components/Component";
import { Banner, Help } from "../components/feedback";
import { LimitSource, basisLabel, hasSource } from "../components/LimitSource";
import { RacesDrawer, RacesTile, type Diff } from "./plan/Races";
import { AdjustmentBanner, TellTheHorse } from "./plan/Adjust";
import { DriftView } from "./plan/Drift";
import { Query } from "./Query";

type View = "week" | "month" | "race" | "history";
const VIEWS: [View, string][] = [["week", "Week"], ["month", "Month"], ["race", "Race day"], ["history", "History"]];
const MARK = { extra: "+", done: "✓", missed: "✕", today: "•", ahead: "○" } as const;
const RACE_KEY = "sh-ui-race";
// calendar dates in UTC arithmetic, so no local time zone can shift a day
const DAYS = (start: string) => Array.from({ length: 7 }, (_, i) => new Date(Date.parse(start + "T00:00:00Z") + i * 864e5).toISOString().slice(0, 10));

function SessionLine({ s, onDay, onRun }: { s: SessionDetail; onDay: (d: string) => void; onRun: (id: number) => void }) {
  const runId = (s.mark === "done" || s.mark === "extra") ? s.activity_id : null;
  return (
    <button type="button" className={`sline${s.mark === "today" ? " today" : ""}`} onClick={() => (runId ? onRun(runId) : onDay(s.date))}
            title={runId ? "Open this run" : "Show the session"}>
      <span className={`mk ${s.mark}`} aria-label={s.mark}>{MARK[s.mark]}</span>
      <span className="muted">{dateShort(s.date)}</span>
      <span className="list" style={{ gap: 2 }}>
        <span><b>{s.mark === "extra" ? "Unplanned run" : s.race ? "Race" : s.title}</b> {s.mark !== "extra" && km(s.km)}{s.strides ? ` + ${s.strides}× strides` : ""}
          {s.target && s.mark !== "done" && s.mark !== "extra" && <span className="muted"> · {s.target.text}</span>} <ComponentChip k={s.component} /></span>
        {s.actual && <span className="muted num">{km(s.actual.km)}{s.actual.pace ? ` @ ${pace(s.actual.pace)}` : ""}{s.actual.hr ? ` · ${s.actual.hr} bpm` : ""}
          {s.moved_dow ? ` · ↷ run ${s.moved_dow}` : ""}</span>}
        {s.runs.length > 1 && <span className="muted">↳ {s.runs.map((r, i) => <span key={i}>{i ? " · " : ""}
          {r.activity_id ? <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); onRun(r.activity_id!); }}>{km(r.km)}{r.pace ? ` @ ${pace(r.pace)}` : ""}</a> : km(r.km)}</span>)}</span>}
        {s.reflection && <span>📓 {s.reflection}</span>}
      </span>
      <span className="muted">›</span>
    </button>);
}

function WeekView({ p, onWeek, onDay, onLimit, onDiff }: { p: PlanPage; onWeek: (s: string) => void; onDay: (date: string) => void;
                                                         onLimit: (key: string) => void; onDiff: (d?: Diff) => void }) {
  const w = p.week, nav = useNavigate();
  const deload = useAction<{ ok: boolean; diff?: Diff }, boolean>("/api/plan/deload", retire => ({ week: w.deload?.week, retire }),
    { done: r => { onDiff(r.diff); return "Answer recorded — the plan re-laid the week"; }, fail: "Could not record the answer" });
  const have = new Set(w.sessions.map(s => s.date));
  const lines = [...w.sessions.map(s => ({ d: s.date, s })), ...DAYS(w.start).filter(d => !have.has(d)).map(d => ({ d, s: null }))]
    .sort((a, b) => a.d.localeCompare(b.d));
  return (
    <div className="grid">
      <Card span={8} label={`${w.status} · ${w.phase_name ?? ""} week ${w.n ?? ""}${w.frozen ? " 🔒" : ""}`}
            aside={<span className="row">
              <button className="btn" disabled={!w.prev} onClick={() => w.prev && onWeek(w.prev)} aria-label="Previous week">‹</button>
              <button className="btn" disabled={!w.next} onClick={() => w.next && onWeek(w.next)} aria-label="Next week">›</button></span>}>
        <span className="muted">{dateShort(w.start)} – {dateShort(w.end)} · {km(w.km)}{w.eq_km ? ` (${km(w.eq_km)} impact-weighted)` : ""} · {w.runs ?? w.sessions.length} runs
          {w.km_done != null ? ` · ${km(w.km_done)} run + ${km(w.km_ahead)} ahead` : ""}
          {w.proj_ctl != null ? ` · fitness at week end CTL ${w.proj_ctl}` : ""}
          {w.proj_acwr != null && <> · load ratio → {w.proj_acwr.toFixed(2)}<Help>The projected load ratio (7-day over 42-day load) at the end of this week. The plan governs a shape-neutral reading to 1.25; the raw reading after a long-run day can print higher.</Help></>}</span>
        {(w.flags.length > 0 || w.deload) && <div className="row">
          {w.deload && (w.deload.state === "offer"
            ? <span className="flag tone-warn" title={w.deload.why || undefined}>{w.deload.text} ·
                <button type="button" className="linkish" disabled={deload.isPending} onClick={() => deload.mutate(true)}>retire it</button> ·
                <button type="button" className="linkish" disabled={deload.isPending} onClick={() => deload.mutate(false)}>keep it</button></span>
            : <span className="flag" title={w.deload.why || undefined}>{w.deload.text}</span>)}
          {w.flags.map(f => <span key={f.text} className={`flag${f.tone ? ` tone-${f.tone}` : ""}`} title={f.hint || undefined}>{f.text}</span>)}
        </div>}
        <Week days={w.days} phase={w.phase} onDay={onDay} today={p.today} />
        <div className="list" style={{ gap: 0 }}>{lines.map(l => l.s
          ? <SessionLine key={l.d + l.s.kind} s={l.s} onDay={onDay} onRun={id => nav(`/runs?id=${id}`)} />
          : <div key={l.d} className="sline rest"><span /><span>{dateShort(l.d)}</span><span>Rest</span><span /></div>)}</div>
        {w.intent && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{w.intent}</span>}
      </Card>
      <Card span={4} label="Why this week looks like this">
        <span>{w.held ? `${w.held.text}.` : "No limit binds this week."}</span>
        <div className="list">{w.limits.map(l => (
          <button key={l.key} type="button" disabled={!hasSource(l.key)} onClick={() => onLimit(l.key)}
                  className={["limit", l.holds ? "holds" : "", l.over ? "over" : ""].join(" ")}
                  style={{ background: "none", border: 0, padding: 0, textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}
                  aria-label={`${l.name}: ${l.laid} of ${l.ceiling} ${l.unit}. Show the source`}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>{l.name}{l.holds && <Pill tone="warn">holds the week</Pill>}{l.over && !l.holds && <Pill tone="bad">ran over</Pill>}</span>
              <span className="muted num">{l.laid} of {l.ceiling} {l.unit}</span></div>
            <div className="meter"><span style={{ width: `${(l.fill ?? 0) * 100}%` }} /></div>
            <span className="muted" style={{ fontSize: "var(--fs-label)" }}>
              {l.over ? `over by ${Math.abs(l.headroom ?? l.laid - l.ceiling).toFixed(2)}` : l.headroom != null ? `${l.headroom.toFixed(2)} to spare` : ""}
              {basisLabel(l.basis) ? ` · ${basisLabel(l.basis)}` : ""}{hasSource(l.key) ? " · why ›" : ""}</span>
          </button>))}</div>
      </Card>
      <PlanStrip p={p} onSource={onLimit} />
    </div>
  );
}

function PlanStrip({ p, onSource }: { p: PlanPage; onSource: (k: string) => void }) {
  const h = p.header;
  return (
    <Card span={12} label="Posture and paces">
      <div className="row" style={{ gap: "var(--sp-4)" }}>
        <button type="button" className="btn" onClick={() => onSource("posture")}>{h.posture.mode === "assertive" ? "⟢" : "◇"} {h.posture.label}</button>
        <span className="muted">{h.posture.ride}{h.posture.reason ? ` · ${h.posture.reason}` : ""}</span>
      </div>
      <div className="row" style={{ gap: "var(--sp-4)" }}>{p.paces.map(z => (
        <span key={z.key}><span className="muted">{z.label}</span> <b className="num">{pace(z.pace)}</b></span>))}
        <button type="button" className="linkish" onClick={() => onSource("paces")}>Where these come from →</button></div>
      {h.pace_note && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{h.pace_note}</span>}
      {h.generated_at && <span className="muted" style={{ fontSize: "var(--fs-label)" }}>↻ Plan rebuilt {new Date(h.generated_at).toLocaleString()}</span>}
    </Card>);
}

function MonthView({ onDay }: { onDay: (date: string) => void }) {
  const [month, setMonth] = useState<string>();
  return <Query q={usePlanCalendar(month)}>{c => (
    <Card label="Plan calendar">
      <MonthGrid month={c.month} weekStart={c.week_start} first={c.first} last={c.last} onMonth={setMonth} today={c.today}
        cell={date => {
          const xs = (c.days[date] || []).filter(x => x.kind !== "moved_in"), inPlan = date >= c.start && date <= c.end;
          return { pickable: xs.length > 0, className: [inPlan ? "" : "out", c.race?.date === date ? "race" : ""].join(" "),
                   style: undefined,
                   body: xs.length ? xs.map((x, i) => (
                     <span key={i} className={`lbl ${x.status === "done" || x.status === "moved" ? "done" : x.status === "missed" ? "missed" : ""}`}>
                       {x.race ? "Race" : x.kind === "unplanned" ? `+${x.actual?.km ?? ""}` : `${x.kind[0].toUpperCase()}${x.kind.slice(1).replace("_mp", "+")} ${x.km ?? ""}`}</span>))
                     : inPlan ? <span className="lbl rest">Rest</span> : null };
        }}
        onPick={onDay} />
    </Card>)}</Query>;
}

function RaceView() {
  const [target, setTarget] = useState<string>();
  const [draft, setDraft] = useState("");
  return <Query q={useRacePlan(target)}>{r => (
    <div className="grid">
      <Card span={8} label={`${r.race.label} · ${dateLong(r.race.date)}${r.race.start_time ? ` · start ${r.race.start_time}` : ""}`}>
        <div className="row" style={{ alignItems: "baseline", gap: "var(--sp-4)" }}>
          <span className="stat-value">{r.target.hms}</span>
          <span className="muted">{r.target.pace}/km average · from {r.target.source === "goal" ? "your goal" : r.target.source === "override" ? "the target you entered" : "the prediction"}</span>
        </div>
        <div className="table-wrap"><table className="steps">
          <thead><tr><th>Segment</th><th>Distance</th><th>Pace</th><th>Heart rate</th><th>How</th></tr></thead>
          <tbody>{r.segments.map(sg => (
            <tr key={sg.label}><td><b>{sg.label}</b></td><td className="num">{sg.from_km}–{sg.to_km} km</td><td className="num">{sg.pace}/km</td>
              <td className="num">{sg.hr ? (sg.hr.lo ? `${sg.hr.lo}–${sg.hr.hi}` : `≤ ${sg.hr.hi}`) + " bpm" : "—"}</td>
              <td className="muted" style={{ minWidth: 220 }}>{sg.cue}</td></tr>))}</tbody></table></div>
        <div className="row">{r.splits.filter(x => x.checkpoint).map(x => <Pill key={x.km}><b>{x.km} km</b> {x.clock}</Pill>)}</div>
      </Card>
      <Card span={4} label="Against your history">
        <div className="list">
          {r.prediction && <ListItem k="Prediction">{r.prediction.hms} <span className="muted">({r.prediction.lo}–{r.prediction.hi})</span></ListItem>}
          {r.best && <ListItem k="Your best">{r.best.hms} <span className="muted">({r.best.date.slice(0, 4)})</span></ListItem>}
          {r.prediction?.verdict && <ListItem k="Target">{r.prediction.verdict}</ListItem>}
        </div>
        <form className="row" onSubmit={e => { e.preventDefault(); if (draft.trim()) setTarget(draft.trim()); }}>
          <input className="input" style={{ width: "10ch" }} value={draft} onChange={e => setDraft(e.target.value)} placeholder="e.g. 2:05" aria-label="Another target" />
          <button className="btn" type="submit">Try</button>
          {target && <button className="btn" type="button" onClick={() => { setTarget(undefined); setDraft(""); }}>Back to goal</button>}
        </form>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: "var(--fs-small)" }}>{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
      </Card>
    </div>)}</Query>;
}

export function Plan() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>("week");
  const [sel, setSel] = useState<{ week?: string; day?: string }>({});
  const [day, setDay] = useState<string | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const [races, setRaces] = useState(params.get("races") === "1");
  const [diff, setDiff] = useState<Diff | undefined>();
  const [race, setRace] = useState<string | undefined>(() => { try { return localStorage.getItem(RACE_KEY) || undefined; } catch { return undefined; } });
  useEffect(() => { if (params.get("races")) { params.delete("races"); setParams(params, { replace: true }); } }, [params, setParams]);
  const shell = useShell();
  const gen = useAction<{ ok: boolean; diff?: Diff; error?: string }>("/api/plan/generate", undefined,
    { done: r => { setDiff(r.diff); return "Plan generated"; }, fail: "Plan failed" });
  const openDay = (date: string) => { setSel({ day: date }); setDay(date); };   // the server picks the week holding that day
  const pickRace = (d: string) => { setRace(d); try { localStorage.setItem(RACE_KEY, d); } catch { /* private window */ } };
  return <Query q={usePlan(sel)}>{p => {
    const genBtn = <button className="btn primary" disabled={gen.isPending} onClick={() => gen.mutate()}>{gen.isPending ? "Generating…" : "Generate plan"}</button>;
    const racesDrawer = <Drawer title="Races" open={races} onClose={() => setRaces(false)}>
      <RacesDrawer current={race || p.races?.[0]?.date} onDiff={d => { setDiff(d); }} /></Drawer>;
    if (p.empty) return <div className="page"><PageHead title="Plan">{genBtn}<button className="btn" onClick={() => setRaces(true)}>Edit races</button></PageHead>
      <Card><b>No plan yet.</b><span>Add a race, then generate a plan — it's built around the race and bounded by your fitness.</span></Card>{racesDrawer}</div>;
    const viewRace = p.races.length > 1 ? (p.races.find(r => r.date === race) || p.races.find(r => r.date >= p.today))?.date : undefined;
    return (
    <div className="page">
      <PageHead title="Plan">
        <button className="btn" aria-expanded={races} onClick={() => setRaces(true)}>Edit races</button>
        {genBtn}
        <Tabs label="Plan views" value={view} options={VIEWS} onChange={setView} />
      </PageHead>
      {p.header.stale && <Banner tone="warn" action={genBtn}>{p.header.stale}</Banner>}
      {p.header.seed && <Banner tone="warn" action={genBtn}>{p.header.seed}</Banner>}
      {diff && !diff.first && diff.summary && <Banner tone="ok" action={<button className="btn" onClick={() => setDiff(undefined)}>✕</button>}>
        <b>Re-planned — {diff.summary}</b>{diff.changes?.length ? <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{diff.changes.map((c, i) => <li key={i}>{c}</li>)}</ul> : null}</Banner>}
      {p.adjustment && <AdjustmentBanner a={p.adjustment} onDiff={setDiff} />}
      <Figures items={[
        ...(p.race ? [{ k: `${p.race.label} · ${dateShort(p.race.date)}`, v: `${Math.max(0, Math.round((Date.parse(p.race.date) - Date.parse(p.today)) / 864e5))} d`,
                        s: `${p.races[0]?.weeks ?? "—"} weeks to go` }] : []),
        ...(p.race ? [{ k: "Predicted finish", v: p.race.prediction ?? "—", signal: true, s: `${p.race.lo}–${p.race.hi} · goal ${p.race.target ?? "—"}` }] : []),
        { k: "Fitness on race day", v: p.races[0]?.proj_ctl != null ? `${Math.round(p.races[0].proj_ctl)}` : "—", s: `CTL · verdict ${p.race?.verdict ?? "—"}` },
        { k: `This week · ${p.week.phase_name ?? ""} ${p.week.n ?? ""}`, v: km(p.week.km, 1), s: p.week.km_done != null ? `${km(p.week.km_done)} run so far` : `${p.week.runs ?? p.week.sessions.length} runs` },
      ]} />
      <div className="grid">
        <Card span={8} label={p.race ? `The road to ${p.race.label} · ${dateShort(p.race.date)}` : "The road"}>
          <Road road={p.road} phases={p.phases} today={p.today} tuneUps={p.tune_ups} onPick={s => { setSel({ week: s }); setView("week"); }} />
        </Card>
        <RacesTile rows={p.races} selected={viewRace} onSelect={pickRace} onEdit={() => setRaces(true)} />
      </div>
      {view === "week" && <WeekView p={p} onWeek={w => setSel({ week: w })} onDay={openDay} onLimit={setLimit} onDiff={setDiff} />}
      {view === "month" && <MonthView onDay={openDay} />}
      {view === "race" && <RaceView />}
      {view === "history" && <DriftView race={viewRace} />}
      <TellTheHorse enabled={!!shell.data?.llm && !!shell.data?.ai.judgment} onDiff={setDiff} />
      {racesDrawer}
      <Drawer title={limit ? p.week.limits.find(l => l.key === limit)?.name ?? (limit === "posture" ? "Posture" : limit === "paces" ? "Paces" : "") : ""}
              open={!!limit} onClose={() => setLimit(null)}>
        {limit && <LimitSource k={limit} />}
      </Drawer>
      <Drawer title={day ? dateLong(day) : ""} open={!!day} onClose={() => setDay(null)}>
        <DayDetail sessions={day ? p.week.sessions.filter(x => x.date === day) : []} onRun={() => setDay(null)} />
      </Drawer>
    </div>);
  }}</Query>;
}
