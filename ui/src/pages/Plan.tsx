// Plan: the road to the race and why each week looks the way it does. Week, Month, Race day, History;
// generate, races, adjustments. The server decides and words everything; this page lays it out.
import { Icon } from "../components/Icon";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePlan, usePlanCalendar, useRacePlan, useShell, type PlanPage, type SessionDetail } from "../lib/api";
import { useAction } from "../lib/actions";
import { dateLong, dateShort, dayName, km, pace } from "../lib/format";
import { Card, ListItem, PageHead, Pill, Row, Strip } from "../components/ui";
import { Drawer, MonthGrid, Tabs } from "../components/layout";
import { Road } from "../components/Road";
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

const MARK_LABEL = { extra: "extra run", done: "done", missed: "missed", today: "today", ahead: "ahead" } as const;

/** One day of the week as the shared Row: mark + date · the session and what was run · its target. */
function SessionLine({ s, onDay, onRun }: { s: SessionDetail; onDay: (d: string) => void; onRun: (id: number) => void }) {
  const runId = (s.mark === "done" || s.mark === "extra") && !s.moved_dow ? s.activity_id : null;
  const sub = [
    s.actual ? `${km(s.actual.km)}${s.actual.pace ? ` at ${pace(s.actual.pace)}` : ""}${s.actual.hr ? ` · ${s.actual.hr} bpm` : ""}${s.moved_dow ? ` · run ${s.moved_dow}` : ""}` : null,
    s.runs.length > 1 ? `in ${s.runs.length} runs: ${s.runs.map(r => km(r.km)).join(" + ")}` : null,
  ].filter(Boolean).join(" · ");
  return (
    <Row onClick={() => (runId ? onRun(runId) : onDay(s.date))} active={s.mark === "today"}
         label={`${dateShort(s.date)}: ${s.title} ${km(s.km)}, ${MARK_LABEL[s.mark]}. ${runId ? "Open the run" : "Show the session"}`}
         lead={<><span className={`mk ${s.mark}`} aria-hidden="true">{MARK[s.mark]}</span> {dayName(s.date).slice(0, 3)} {s.date.slice(8).replace(/^0/, "")}</>}
         main={<>{s.mark === "extra" ? "Unplanned run" : s.race ? "Race" : s.title}{s.mark !== "extra" ? ` ${km(s.km)}` : ""}{s.strides ? ` + ${s.strides}× strides` : ""} <ComponentChip k={s.component} /></>}
         sub={<>{sub}{s.reflection && <span className="reflection"><Icon name="note" /> {s.reflection}</span>}</>}
         cols={[{ v: s.target && s.mark !== "done" && s.mark !== "extra" ? s.target.text : "", w: 12, muted: true }]} />);
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
      <Card span={8} label={`${w.status} · ${w.phase_name ?? ""} week ${w.n ?? ""}${w.frozen ? " · locked" : ""}`}
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
        <div>{lines.map(l => {
          if (l.s) return <SessionLine key={l.d + l.s.kind} s={l.s} onDay={onDay} onRun={id => nav(`/runs?id=${id}`)} />;
          const ran = w.days.find(x => x.date === l.d)?.runs ?? [];     // a rest day can hold a run moved onto it
          const lead = <><span className="mk" aria-hidden="true">{ran.length ? "↷" : ""}</span> {dayName(l.d).slice(0, 3)} {l.d.slice(8).replace(/^0/, "")}</>;
          return ran.length
            ? <Row key={l.d} lead={lead} main={<span className="muted">Rest · ran {ran.map(r => km(r.km)).join(" + ")} here</span>}
                   onClick={() => onDay(l.d)} label={`${dateShort(l.d)}: rest day, a run moved here. Show it`} />
            : <Row key={l.d} lead={lead} main={<span className="muted" style={{ fontWeight: 400 }}>Rest</span>} />;
        })}</div>
        {w.intent && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{w.intent}</span>}
      </Card>
      <Card span={4} label="Why this week looks like this" id="limits">
        <span>{w.held ? `${w.held.text}.` : "No limit binds this week."}</span>
        <div className="list">{w.limits.map(l => (
          <button key={l.key} type="button" disabled={!hasSource(l.key)} onClick={() => onLimit(l.key)}
                  className={["limit", l.holds ? "holds" : "", l.over ? "over" : ""].join(" ")}
                  style={{ background: "none", borderTop: 0, borderLeft: 0, borderRight: 0, textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer", width: "100%" }}
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
    </div>
  );
}

function PostureAndPaces({ p, onSource }: { p: PlanPage; onSource: (k: string) => void }) {
  const h = p.header;
  return (
    <Card span={4} label="Posture and paces" tier="group" id="posture">
      <button type="button" className="kv-btn" onClick={() => onSource("posture")} aria-label={`${h.posture.label}: where this comes from`}>
        <b>{h.posture.label}</b> <span className="muted">· {h.posture.ride} ›</span></button>
      {h.posture.reason && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{h.posture.reason}</span>}
      <button type="button" className="kv-btn paces" onClick={() => onSource("paces")} aria-label="The paces: where these come from">
        {p.paces.map(z => <span key={z.key}><span className="muted">{z.label.replace(" (easy ceiling)", "")}</span> <b className="num">{z.pace}</b></span>)}
        <span className="muted">/km ›</span></button>
      {h.pace_note && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>{h.pace_note}</span>}
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
  // every view and drawer is URL state, so each door is linkable and back works: ?view= &week= &races=1 &tell=1
  const [params, setParams] = useSearchParams();
  const view = (VIEWS.some(([v]) => v === params.get("view")) ? params.get("view") : "week") as View;
  const setParam = (k: string, v: string | null) => setParams(p => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n; });
  const setView = (v: View) => setParam("view", v === "week" ? null : v);
  const races = params.get("races") === "1", tell = params.get("tell") === "1";
  const [daySel, setDaySel] = useState<string | undefined>();
  const sel = { week: params.get("week") || undefined, day: daySel };
  const [day, setDay] = useState<string | null>(null);
  const [limit, setLimit] = useState<string | null>(null);
  const [diff, setDiff] = useState<Diff | undefined>();
  const [race, setRace] = useState<string | undefined>(() => { try { return localStorage.getItem(RACE_KEY) || undefined; } catch { return undefined; } });
  const shell = useShell();
  const gen = useAction<{ ok: boolean; diff?: Diff; error?: string }>("/api/plan/generate", undefined,
    { done: r => { setDiff(r.diff); return "Plan rebuilt"; }, fail: "Rebuild failed" });
  const openDay = (date: string) => { setDaySel(date); setDay(date); };   // the server picks the week holding that day
  const pickRace = (d: string) => { setRace(d); try { localStorage.setItem(RACE_KEY, d); } catch { /* private window */ } };
  return <Query q={usePlan(sel)}>{p => {
    const genBtn = <button className="btn primary" disabled={gen.isPending} onClick={() => gen.mutate()}>{gen.isPending ? "Rebuilding…" : "Rebuild the plan"}</button>;
    const racesDrawer = <Drawer title="Races" open={races} onClose={() => setParam("races", null)}>
      <RacesDrawer current={race || p.races?.[0]?.date} onDiff={d => { setDiff(d); }} /></Drawer>;
    if (p.empty) return <div className="page"><PageHead title="Plan"><button className="btn" onClick={() => setParam("races", "1")}>Races</button></PageHead>
      <Banner tone="warn" action={<button className="btn primary" onClick={() => setParam("races", "1")}>Add a race</button>}>
        <b>No plan yet.</b> Add a race and the road is built around it, bounded by your fitness.</Banner>
      <div className="row">{genBtn}</div>{racesDrawer}</div>;
    const viewRace = p.races.length > 1 ? (p.races.find(r => r.date === race) || p.races.find(r => r.date >= p.today))?.date : undefined;
    const r0 = p.races[0];
    const daysTo = p.race ? Math.max(0, Math.round((Date.parse(p.race.date) - Date.parse(p.today)) / 864e5)) : null;
    const rebuilt = p.header.generated_at ? new Date(p.header.generated_at) : null;
    const weekDay = day ? p.week.days.find(x => x.date === day) : undefined;
    const daySessions = day ? p.week.sessions.filter(x => x.date === day) : [];
    return (
    <div className="page">
      <PageHead title="Plan">
        <div className="row">
          <button className="btn" aria-expanded={races} onClick={() => setParam("races", "1")}>Races</button>
          <button className="btn primary" aria-expanded={tell} onClick={() => setParam("tell", "1")}>Tell the horse</button>
        </div>
      </PageHead>
      {p.header.stale && <Banner tone="warn" action={genBtn}>{p.header.stale}</Banner>}
      {p.header.seed && <Banner tone="warn" action={genBtn}>{p.header.seed}</Banner>}
      {diff && !diff.first && diff.summary && <Banner tone="ok" action={<button className="btn" aria-label="Dismiss" onClick={() => setDiff(undefined)}><Icon name="close" /></button>}>
        <b>Re-planned: {diff.summary}</b>{diff.changes?.length ? <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>{diff.changes.map((c, i) => <li key={i}>{c}</li>)}</ul> : null}</Banner>}
      {p.adjustment && <AdjustmentBanner a={p.adjustment} onDiff={setDiff} />}
      <Strip items={[
        ...(p.race ? [{ k: `${p.race.label} · ${dateShort(p.race.date)}`, v: `${daysTo} days`, s: `${r0?.weeks ?? "?"} weeks to go`, onClick: () => setParam("races", "1") }] : []),
        ...(p.race ? [{ k: "Predicted finish", v: p.race.prediction ?? "?", signal: true, s: `goal ${p.race.target ?? "none"} · range ${p.race.lo} to ${p.race.hi}`, onClick: () => setView("race") }] : []),
        { k: "Fitness on race day", v: r0?.proj_ctl != null ? `${Math.round(r0.proj_ctl)} CTL` : "?", s: `verdict: ${p.race?.verdict ?? "none"}`, onClick: () => setView("history") },
        { k: `This week · ${p.week.phase_name ?? ""} ${p.week.n ?? ""}`, v: km(p.week.km, 1), s: p.week.km_done != null ? `${km(p.week.km_done)} run so far` : `${p.week.runs ?? p.week.sessions.length} runs`,
          onClick: () => { setParam("week", null); setView("week"); } },
      ]} />
      <div className="grid">
        <Card span={8} id="road" label={p.race ? `The road to ${p.race.label} · ${dateShort(p.race.date)}` : "The road"} lede={p.road_headline ?? undefined}>
          <Road road={p.road} phases={p.phases} today={p.today} tuneUps={p.tune_ups} onPick={s => { setDaySel(undefined); setParams(q => { const n = new URLSearchParams(q); n.set("week", s); n.delete("view"); return n; }); }} />
        </Card>
        <div className="span-4 rail">
          <RacesTile rows={p.races} selected={viewRace} onSelect={pickRace} onEdit={() => setParam("races", "1")} />
          <PostureAndPaces p={p} onSource={setLimit} />
        </div>
      </div>
      <div className="list" style={{ gap: "var(--sp-5)" }}>
        <Tabs label="Plan views" value={view} options={VIEWS} onChange={setView} />
        {view === "week" && <WeekView p={p} onWeek={w => { setDaySel(undefined); setParam("week", w); }} onDay={openDay} onLimit={setLimit} onDiff={setDiff} />}
        {view === "month" && <MonthView onDay={openDay} />}
        {view === "race" && <RaceView />}
        {view === "history" && <DriftView race={viewRace} />}
      </div>
      <p className="meta-line">
        {rebuilt ? `Rebuilt ${rebuilt.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}, ${rebuilt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not built yet"}
        {" · "}<button type="button" className="linkish" disabled={gen.isPending} onClick={() => gen.mutate()}>{gen.isPending ? "Rebuilding…" : "Rebuild now"}</button>
      </p>
      {racesDrawer}
      <Drawer title="Tell the horse" open={tell} onClose={() => setParam("tell", null)}>
        <TellTheHorse bare enabled={!!shell.data?.llm && !!shell.data?.ai.judgment} onDiff={d => { setDiff(d); }} />
      </Drawer>
      <Drawer title={limit ? p.week.limits.find(l => l.key === limit)?.name ?? (limit === "posture" ? "Posture" : limit === "paces" ? "Paces" : "") : ""}
              open={!!limit} onClose={() => setLimit(null)}>
        {limit && <LimitSource k={limit} />}
      </Drawer>
      <Drawer title={day ? dateLong(day) : ""} open={!!day} onClose={() => setDay(null)}>
        <DayDetail sessions={daySessions} onRun={() => setDay(null)} movedFrom={weekDay?.moved_from}
                   ranHere={(weekDay?.runs ?? []).filter(r => !daySessions.some(s => s.activity_id === r.activity_id && !s.moved_to))} />
        <button type="button" className="linkish" onClick={() => { setDay(null); setParam("tell", "1"); }}>Something off? Tell the horse ›</button>
      </Drawer>
    </div>);
  }}</Query>;
}
