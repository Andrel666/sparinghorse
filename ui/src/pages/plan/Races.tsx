// Races: the drawer that edits them (priority, date, gun time + zone, remove / put back, add, past
// results) and the tile that reads each one's finish range. All edits re-plan on the server.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAction } from "../../lib/actions";
import { dateShort, localToday } from "../../lib/format";
import { Card, Pill } from "../../components/ui";
import { Help } from "../../components/feedback";
import { LimitSource } from "../../components/LimitSource";

export interface Objective { id: number; label: string; type: string; date: string; priority: string; target: string;
  start_time: string | null; start_tz: string | null; default_tz?: string; status: string; removed_at: string | null; outcome: string | null }
export interface Diff { first?: boolean; summary?: string; changes?: string[] }
type Res = { ok: boolean; diff?: Diff; error?: string };
export const useObjectives = () => useQuery({ queryKey: ["ui", "objectives"], queryFn: () => api<Objective[]>("/api/objectives") });

const TYPES = ["5k", "10k", "half", "marathon", "custom"];
const ZONES: string[] = (() => { try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return []; } })();

function pastChip(o: Objective) {
  if (o.status === "lapsed") return "lapsed: no race-day run";
  let oc: { status?: string; dnf_km?: number; actual?: string; beat?: boolean; goal?: string } = {};
  try { oc = JSON.parse(o.outcome || "{}"); } catch { /* old rows */ }
  if (oc.status === "dnf") return `DNF at ${oc.dnf_km} km`;
  if (oc.actual) return `✓ ${oc.actual}${oc.beat === true ? " · beat the goal" : oc.beat === false ? ` · goal ${oc.goal} missed` : ""}`;
  return "run: result unverified";
}

export function RacesDrawer({ current, onDiff }: { current?: string; onDiff: (d?: Diff) => void }) {
  const q = useObjectives();
  const done = (r: Res) => { onDiff(r.diff); return null; };
  const pri = useAction<Res, { id: number; priority: string }>(a => `/api/objectives/${a.id}/priority`, a => ({ priority: a.priority }), { done, fail: "Could not set the priority" });
  const move = useAction<Res, { id: number; date: string }>(a => `/api/objectives/${a.id}/date`, a => ({ date: a.date }), { done, fail: "Could not move the race" });
  const time = useAction<Res, { id: number; start_time: string | null; start_tz?: string | null }>(a => `/api/objectives/${a.id}/time`,
    a => ({ start_time: a.start_time, ...(a.start_tz !== undefined ? { start_tz: a.start_tz } : {}) }), { fail: "Could not set the gun time" });
  const restore = useAction<Res, number>(id => `/api/objectives/${id}/restore`, undefined, { done, fail: "Could not put the race back" });
  const remove = useAction<Res, Objective>(o => `/api/objectives/${o.id}/remove`, undefined, {
    confirm: o => ({ title: `Remove ${o.label}?`, ok: "Remove",
      intro: "It comes off the calendar and the plan re-anchors on the next race: maintenance if none is left.",
      lines: [`${dateShort(o.date)} · ${o.type} · ${o.target}`], alt: "It stays listed for 24 hours with a put-back control." }),
    done, fail: "Could not remove the race" });
  const blank = { label: "", type: "marathon", date: "", start_time: "", start_tz: "", priority: "A", target: "" };
  const [f, setF] = useState(blank);
  const add = useAction<Res, void>("/api/objectives", () => ({ label: f.label || "Race", type: f.type, date: f.date, priority: f.priority,
    target: f.target || "finish", start_time: f.start_time || null, start_tz: f.start_tz || null }),
    { done: r => { setF(blank); onDiff(r.diff); return "Race added: the plan re-periodized"; }, fail: "Could not add the race" });
  if (!q.data) return <span className="muted">Loading races…</span>;
  const today = localToday();
  const up = q.data.filter(o => o.status === "upcoming");
  const removed = q.data.filter(o => o.status === "removed" && o.removed_at && Date.now() - new Date(o.removed_at).getTime() < 864e5 && o.date >= today)
    .sort((a, b) => (b.removed_at || "").localeCompare(a.removed_at || ""));
  const past = q.data.filter(o => o.status === "done" || o.status === "lapsed").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  return (
    <div className="list races-drawer">
      <datalist id="tzlist">{ZONES.map(z => <option key={z} value={z} />)}</datalist>
      {!up.length && <span className="muted">No races: the plan holds fitness (maintenance).</span>}
      {up.map(o => (
        <section key={o.id} className="race-group" aria-label={o.label}>
          <div className="race-head"><b>{o.label}</b>{o.date === current && <Pill tone="ok">current</Pill>}
            <span className="muted">{o.type} · goal {o.target}</span></div>
          <div className="form-grid">
            <label>Priority<span className="seg" role="group" aria-label="Priority">{["A", "B", "C"].map(p => (
              <button key={p} type="button" aria-pressed={o.priority === p} disabled={pri.isPending}
                      onClick={() => o.priority !== p && pri.mutate({ id: o.id, priority: p })}>{p}</button>))}</span></label>
            <label>Date<input type="date" className="input" defaultValue={o.date}
                   onChange={e => e.target.value && e.target.value !== o.date && move.mutate({ id: o.id, date: e.target.value })} /></label>
            <label>Gun time<input type="time" className="input" defaultValue={o.start_time || ""}
                   onBlur={e => (e.target.value || null) !== (o.start_time || null) && time.mutate({ id: o.id, start_time: e.target.value || null })} /></label>
            <label>Time zone<input className="input" list="tzlist" defaultValue={o.start_tz || ""} placeholder={o.default_tz || "your zone"}
                   onBlur={e => (e.target.value || null) !== (o.start_tz || null) && time.mutate({ id: o.id, start_time: o.start_time, start_tz: e.target.value || null })} /></label>
          </div>
          <button type="button" className="linkish danger" onClick={() => remove.mutate(o)}>Remove race</button>
        </section>))}
      {removed.length > 0 && <div><b>Removed in the last 24 hours</b>{removed.map(o => (
        <div key={o.id} className="row" style={{ justifyContent: "space-between" }}><span className="muted">{o.priority} · {o.label} · {dateShort(o.date)} · {o.type}</span>
          <button type="button" className="btn" onClick={() => restore.mutate(o.id)}>Put back</button></div>))}</div>}
      <form className="race-group" onSubmit={e => { e.preventDefault(); if (f.date) add.mutate(); }}>
        <div className="race-head"><b>Add a race</b></div>
        <div className="form-grid">
          <label className="wide">Name<input className="input" placeholder="Race name" value={f.label} onChange={e => setF({ ...f, label: e.target.value })} /></label>
          <label>Distance<select className="input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
            {TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
          <label>Date<input type="date" required className="input" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
          <label>Gun time<input type="time" className="input" value={f.start_time} onChange={e => setF({ ...f, start_time: e.target.value })} /></label>
          <label>Time zone<input className="input" list="tzlist" placeholder={up[0]?.default_tz || "your zone"} value={f.start_tz} onChange={e => setF({ ...f, start_tz: e.target.value })} /></label>
          <label>Priority<select className="input" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>
            {["A", "B", "C"].map(p => <option key={p}>{p}</option>)}</select></label>
          <label>Goal<input className="input" placeholder="e.g. 1:59" value={f.target} onChange={e => setF({ ...f, target: e.target.value })} /></label>
        </div>
        <button type="submit" className="btn primary" disabled={add.isPending || !f.date} style={{ alignSelf: "flex-start" }}>{add.isPending ? "Planning…" : "Add race"}</button>
      </form>
      {past.length > 0 && <div><b>Past races</b>{past.map(o => (
        <div key={o.id} className="list-item"><span className="k">{dateShort(o.date)}</span><span className="v">{o.label} · {o.type} <Pill>{pastChip(o)}</Pill></span></div>))}</div>}
    </div>);
}

export interface RaceRow { label: string; date: string; type: string; target: string | null; weeks: number; proj_ctl: number | null;
  verdict: string | null; note: string | null; finish: { hms: string; s: number; lo: string; hi: string; lo_s: number; hi_s: number; level: number } | null;
  later: { weeks: number; hms: string }[]; now: { hms: string; gain_s: number } | null; anchor_stale_days: number | null; ft_note: string | null }

const goalSec = (g: string | null, near: number) => {
  const m = /^(\d+):(\d{2})(?::(\d{2}))?$/.exec((g || "").trim()); if (!m) return null;
  if (m[3]) return +m[1] * 3600 + +m[2] * 60 + +m[3];
  const hm = +m[1] * 3600 + +m[2] * 60, ms = +m[1] * 60 + +m[2];
  return Math.abs(hm - near) < Math.abs(ms - near) ? hm : ms;
};
const hm = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}`;
const bold = (t: string) => t.split(/\*\*(.+?)\*\*/g).map((x, i) => i % 2 ? <b key={i}>{x}</b> : x);

/** The finish range of each race: band, median and goal ticks on one shared axis. */
export function RacesTile({ rows, selected, onSelect, onEdit }: { rows: RaceRow[]; selected?: string; onSelect: (d: string) => void; onEdit: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <Card span={4} label="Races"><span className="muted">No race: the plan holds fitness.</span>
    <button type="button" className="btn" onClick={onEdit}>Edit races →</button></Card>;
  const all = rows.flatMap(r => r.finish ? [r.finish.lo_s, r.finish.hi_s, goalSec(r.target, r.finish.s) ?? r.finish.s] : []);
  const lo = Math.floor((Math.min(...all) - 300) / 600) * 600, hi = Math.ceil((Math.max(...all) + 300) / 600) * 600;
  const x = (s: number) => `${((s - lo) / (hi - lo || 1)) * 100}%`;
  return (
    <Card span={4} label="Races" aside={<button type="button" className="linkish" onClick={onEdit}>Edit races</button>}>
      {rows.map(r => {
        const g = r.finish ? goalSec(r.target, r.finish.s) : null, chain = rows.length > 1;
        return (
          <div key={r.date} className="list" style={{ gap: 6 }}>
            {chain ? <button type="button" className={`btn${selected === r.date ? " primary" : ""}`} aria-pressed={selected === r.date} onClick={() => onSelect(r.date)}>
              {r.label} · {dateShort(r.date)} · {r.weeks} w{r.target ? ` · goal ${r.target}` : ""}</button>
              : <span><b>{r.label}</b> <span className="muted">{dateShort(r.date)} · {r.weeks} weeks{r.target ? ` · goal ${r.target}` : ""}</span></span>}
            {r.finish && <>
              <div className="bandbar" role="img" aria-label={`Finish ${r.finish.lo}–${r.finish.hi}, median ${r.finish.hms}${g ? `, goal ${r.target}` : ""}`}>
                <span className="band" style={{ left: x(r.finish.lo_s), width: `calc(${x(r.finish.hi_s)} - ${x(r.finish.lo_s)})` }} />
                <span className="tick med" style={{ left: x(r.finish.s) }} title={`median ${r.finish.hms}`} />
                {g && <span className="tick goal" style={{ left: x(g) }} title={`goal ${r.target}`} />}
              </div>
              <div className="row muted" style={{ justifyContent: "space-between", fontSize: "var(--fs-label)" }}><span>{hm(lo)}</span><span>{hm((lo + hi) / 2)}</span><span>{hm(hi)}</span></div>
              <span className="num">{r.finish.lo}–{r.finish.hi} · median <b>{r.finish.hms}</b>{r.target ? ` · goal ${r.target}` : ""}</span>
            </>}
            <span className="muted t-small">Fitness on race day: CTL {r.proj_ctl ?? "—"} · verdict: {r.verdict ?? "—"}</span>
            <button type="button" className="linkish" aria-expanded={open === r.date} onClick={() => setOpen(open === r.date ? null : r.date)}>
              {open === r.date ? "Hide the source ↑" : "Why this range, and the source →"}</button>
            {open === r.date && <div className="list" style={{ gap: 8, fontSize: "var(--fs-small)" }}>
              {r.note ? <span>{bold(r.note)}</span> : <span>Projected verdict: <b>{r.verdict}</b></span>}
              {r.later.length > 0 && <span>If the race were later (same training): {r.later.map(l => `+${l.weeks} w → ${l.hms}`).join(" · ")}</span>}
              {r.anchor_stale_days != null && <span className="muted">◷ last measured {r.anchor_stale_days} days ago: today's shape unread</span>}
              {r.now && r.finish && <span><b>Now:</b> off today's shape {r.now.hms} → by race day {r.finish.hms} · the build buys {Math.round(r.now.gain_s / 60)} min</span>}
              <LimitSource k="finish" />
            </div>}
          </div>);
      })}
      <Help label="About the finish range">The bar is the 80 % range of the predicted finish; the dark tick is the median, the outlined tick your goal.</Help>
    </Card>);
}
