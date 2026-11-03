// Plan: the road to the race and why each week looks the way it does. Week, Month, Race day, History.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, usePlan, usePlanCalendar, useRacePlan, type PlanPage } from "../lib/api";
import { dateLong, dateShort, km } from "../lib/format";
import { Card, ListItem, PageHead, Pill } from "../components/ui";
import { Drawer, MonthGrid, Tabs } from "../components/layout";
import { Road } from "../components/Road";
import { Week } from "../components/Week";
import { SessionBlock } from "../components/Session";
import { LimitSource, basisLabel, hasSource } from "../components/LimitSource";
import { Query } from "./Query";

type View = "week" | "month" | "race" | "history";
const VIEWS: [View, string][] = [["week", "Week"], ["month", "Month"], ["race", "Race day"], ["history", "History"]];

function WeekView({ p, onWeek, onDay, onLimit }: { p: PlanPage; onWeek: (s: string) => void; onDay: (date: string) => void;
                                                   onLimit: (key: string) => void }) {
  const w = p.week;
  return (
    <div className="grid">
      <Card span={8} label={`${w.phase_name ?? ""} week ${w.n ?? ""} · ${dateShort(w.start)} – ${dateShort(w.end)} · ${km(w.km)}`}
            aside={<span className="row">
              <button className="btn" disabled={!w.prev} onClick={() => w.prev && onWeek(w.prev)} aria-label="Previous week">‹</button>
              <button className="btn" disabled={!w.next} onClick={() => w.next && onWeek(w.next)} aria-label="Next week">›</button></span>}>
        <Week days={w.days} phase={w.phase} />
        <div className="list">{w.sessions.map(s => (
          <button key={s.date + s.kind} type="button" className="list-item" style={{ background: "none", border: 0, borderBottom: "1px solid var(--line)", textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}
                  onClick={() => onDay(s.date)}>
            <span className="k">{dateShort(s.date)}</span>
            <span className="v"><b>{s.race ? "Race" : s.title}</b> {km(s.km)}{s.strides ? " + strides" : ""}
              {s.target && <span className="muted"> · {s.target.text}</span>}</span>
            <span className="muted">›</span>
          </button>))}</div>
        {w.intent && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{w.intent}</span>}
      </Card>
      <Card span={4} label="Why this week looks like this">
        {w.held && <span>{w.held.text}.</span>}
        <div className="list">{w.limits.map(l => (
          <button key={l.key} type="button" disabled={!hasSource(l.key)} onClick={() => onLimit(l.key)}
                  className={["limit", l.holds ? "holds" : "", l.over ? "over" : ""].join(" ")}
                  style={{ background: "none", border: 0, padding: 0, textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}
                  aria-label={`${l.name}: ${l.laid} of ${l.ceiling} ${l.unit}. Show the source`}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span>{l.name}{l.holds && <Pill tone="warn">holds the week</Pill>}</span>
              <span className="muted num">{l.laid} of {l.ceiling} {l.unit}</span></div>
            <div className="meter"><span style={{ width: `${(l.fill ?? 0) * 100}%` }} /></div>
            <span className="muted" style={{ fontSize: "var(--fs-label)" }}>
              {l.over ? `over by ${Math.abs(l.headroom ?? l.laid - l.ceiling).toFixed(2)}` : l.headroom != null ? `${l.headroom.toFixed(2)} to spare` : ""}
              {basisLabel(l.basis) ? ` · ${basisLabel(l.basis)}` : ""}{hasSource(l.key) ? " · why ›" : ""}</span>
          </button>))}</div>
      </Card>
      <Card span={12} label="Paces">
        <div className="row" style={{ gap: "var(--sp-4)" }}>{p.paces.map(z => (
          <span key={z.key}><span className="muted">{z.label}</span> <b className="num">{z.pace}/km</b></span>))}</div>
      </Card>
    </div>
  );
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

interface Drift { ok: boolean; scorecard?: { headline?: string; fitness?: { founding: number; now: number; state: string };
  race?: { founding: number; now: number; trend: string; verdict: string }; volume?: { now: number | null; state: string }; weeks_to_go?: number };
  finish_drift?: { date: string; hms: string }[] }
function HistoryView() {
  const q = useQuery({ queryKey: ["ui", "drift"], queryFn: () => api<Drift>("/api/plandrift") });
  return <Query q={q}>{d => (
    <Card label="How the plan has moved since it was founded">
      <span>{d.scorecard?.headline}</span>
      <div className="list">
        {d.scorecard?.fitness && <ListItem k="Fitness">{d.scorecard.fitness.founding} → {d.scorecard.fitness.now} <span className="muted">({d.scorecard.fitness.state})</span></ListItem>}
        {d.scorecard?.race && <ListItem k="Race-day fitness">{d.scorecard.race.founding} → {d.scorecard.race.now} <span className="muted">({d.scorecard.race.trend})</span></ListItem>}
        {d.scorecard?.weeks_to_go != null && <ListItem k="Weeks to go">{d.scorecard.weeks_to_go}</ListItem>}
        {d.finish_drift?.length ? <ListItem k="Prediction">{d.finish_drift.map(f => `${dateShort(f.date)} ${f.hms}`).join(" → ")}</ListItem> : null}
      </div>
    </Card>)}</Query>;
}

export function Plan() {
  const [view, setView] = useState<View>("week");
  const [sel, setSel] = useState<{ week?: string; day?: string }>({});
  const [day, setDay] = useState<string | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const openDay = (date: string) => { setSel({ day: date }); setDay(date); };   // the server picks the week holding that day
  return <Query q={usePlan(sel)}>{p => (
    <div className="page">
      <PageHead title="Plan">
        {p.race && <Pill>Goal {p.race.target ?? "—"} · predicted {p.race.prediction ?? "—"}</Pill>}
        <Tabs label="Plan views" value={view} options={VIEWS} onChange={setView} />
      </PageHead>
      <Card label={p.race ? `The road to ${p.race.label} · ${dateShort(p.race.date)}` : "The road"}>
        <Road road={p.road} phases={p.phases} onPick={s => { setSel({ week: s }); setView("week"); }} />
      </Card>
      {view === "week" && <WeekView p={p} onWeek={w => setSel({ week: w })} onDay={openDay} onLimit={setLimit} />}
      {view === "month" && <MonthView onDay={openDay} />}
      {view === "race" && <RaceView />}
      {view === "history" && <HistoryView />}
      <Drawer title={limit ? p.week.limits.find(l => l.key === limit)?.name ?? "" : ""} open={!!limit} onClose={() => setLimit(null)}>
        {limit && <LimitSource k={limit} />}
      </Drawer>
      <Drawer title={day ? dateLong(day) : ""} open={!!day} onClose={() => setDay(null)}>
        {(() => { const xs = day ? p.week.sessions.filter(x => x.date === day) : [];
                  return xs.length ? xs.map(s => <SessionBlock key={s.kind} s={s} />) : <span className="muted">Rest day.</span>; })()}
      </Drawer>
    </div>
  )}</Query>;
}
