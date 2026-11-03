// Body: recovery and health markers over time, grouped, each against its reference range; add a reading.
import { useState } from "react";
import { useBody, type Marker } from "../lib/api";
import { useAction } from "../lib/actions";
import { dateShort, localToday, reading } from "../lib/format";
import { Card, ListItem, PageHead, Pill } from "../components/ui";
import { Lines } from "../components/charts";
import { Banner } from "../components/feedback";
import { Query } from "./Query";

const GROUPS: [string, string][] = [["heart", "Heart"], ["sleep", "Sleep"], ["weight", "Weight"], ["labs", "Lab values"]];
type Range = "6m" | "1y" | "all";
const DAYS: Record<Range, number> = { "6m": 183, "1y": 365, all: 1e9 };
const RANGE_KEY = "sh-ui-hrange";
const refText = (m: Marker) => !m.ref ? "" : m.ref[0] != null && m.ref[1] != null ? `${m.ref[0]}–${m.ref[1]}` : m.ref[1] != null ? `< ${m.ref[1]}` : `> ${m.ref[0]}`;

function MarkerCard({ m }: { m: Marker }) {
  const span = (new Date(m.date).getTime() - new Date(m.first).getTime()) / 864e5;
  const ranged = m.n > 50 && span > 183;
  const [range, setRange] = useState<Range>(() => { try { return (JSON.parse(localStorage.getItem(RANGE_KEY) || "{}")[m.key] as Range) || "6m"; } catch { return "6m"; } });
  const pick = (r: Range) => { setRange(r); try { const o = JSON.parse(localStorage.getItem(RANGE_KEY) || "{}"); o[m.key] = r; localStorage.setItem(RANGE_KEY, JSON.stringify(o)); } catch { /* private window */ } };
  const anchor = new Date(m.date).getTime();
  let pts = ranged ? m.series.filter(p => anchor - new Date(p.date).getTime() <= DAYS[range] * 864e5) : m.series;
  if (pts.length < 2) pts = m.series;
  return (
    <Card span={4} label={m.label} tone={m.state === "watch" ? "warn" : undefined}
          aside={ranged ? <span className="seg" role="group" aria-label="Range">{(["6m", "1y", "all"] as Range[]).map(r =>
            <button key={r} type="button" aria-pressed={range === r} onClick={() => pick(r)}>{r === "all" ? "All" : r}</button>)}</span> : undefined}>
      <div className="row" style={{ alignItems: "baseline" }}>
        <span className="stat-value sm num">{reading(m.value)}</span><span className="muted">{m.unit}</span>
        {m.state && <Pill tone={m.state === "ok" ? "ok" : "warn"}>{m.state}{refText(m) ? ` · range ${refText(m)}` : ""}</Pill>}
      </div>
      {pts.length > 1 ? <Lines height={120} band={m.ref} fmt={v => `${reading(v)} ${m.unit}`}
                               series={[{ pts, color: m.state === "watch" ? "var(--warn)" : "var(--text)", label: m.label }]} />
        : <span className="muted">One reading so far.</span>}
      <span className="stat-sub">{pts.length === m.n ? `${m.n} readings` : `${pts.length} of ${m.n} readings`} · {dateShort(pts[0].date)} → {dateShort(m.date)}
        {m.delta != null ? ` · ${m.delta > 0 ? "+" : ""}${m.delta} in 30 days` : ""}{m.stale && m.stale_days != null ? ` · last reading ${m.stale_days} days ago` : ""}</span>
    </Card>);
}

function AddReading({ options }: { options: { key: string; label: string }[] }) {
  const today = localToday();
  const [f, setF] = useState({ marker: options[0]?.key || "", date: today, value: "" });
  const add = useAction<{ ok: boolean }>("/api/health", () => ({ marker: f.marker, date: f.date, value: Number(f.value), source: "manual" }),
    { done: () => { setF(x => ({ ...x, value: "" })); return "Reading added"; }, fail: "Could not add that marker" });
  return (
    <Card label="Add a reading">
      <form className="row" onSubmit={e => { e.preventDefault(); if (f.value !== "") add.mutate(); }}>
        <select className="input" style={{ width: "auto" }} value={f.marker} onChange={e => setF({ ...f, marker: e.target.value })} aria-label="Marker">
          {options.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}</select>
        <input type="date" required className="input" style={{ width: "auto" }} value={f.date} onChange={e => setF({ ...f, date: e.target.value })} aria-label="Reading date" />
        <input type="number" step="any" required className="input" style={{ width: "12ch" }} placeholder="value" value={f.value} onChange={e => setF({ ...f, value: e.target.value })} aria-label="Value" />
        <button type="submit" className="btn primary" disabled={add.isPending || f.value === ""}>Add reading</button>
      </form>
    </Card>);
}

export function Body() {
  return <Query q={useBody()}>{d => (
    <div className="page">
      <PageHead title="Body" />
      {d.stopped && <Banner tone="warn">{d.stopped}</Banner>}
      {!d.markers.length && <Card><span className="muted">No health readings yet. Runalyze sync brings resting HR and sleep; lab values are added below.</span></Card>}
      {GROUPS.map(([g, title]) => {
        const ms = d.markers.filter(m => m.group === g);
        return ms.length ? (
          <section key={g} className="list" style={{ gap: "var(--sp-3)" }}>
            <h2 style={{ fontSize: "var(--fs-heading)" }}>{title}</h2>
            <div className="grid">{ms.map(m => <MarkerCard key={m.key} m={m} />)}</div>
          </section>) : null;
      })}
      <AddReading options={d.add} />
      <Card label="Injury history">
        {d.injuries.length ? <div className="list">{d.injuries.map(i => (
          <ListItem key={i.start} k={dateShort(i.start)}>{i.label || "injury"}{i.end ? ` · until ${dateShort(i.end)}` : ""}</ListItem>))}</div>
          : <span className="muted">None listed. Add past injuries in Settings → Athlete; calibration and the coach use them.</span>}
      </Card>
    </div>
  )}</Query>;
}
