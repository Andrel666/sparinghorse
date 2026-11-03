// The app's charts, drawn as SVG from one pair of scale helpers. Colours come from tokens.
import { useEffect, useRef, useState } from "react";

export interface Pt { date: string; v: number }
const day = (iso: string) => new Date(iso + "T00:00:00").getTime() / 86400000;

/** y: value → pixel (top = high); x: a domain → pixel. One implementation for every chart. */
function yScale(vals: number[], h: number, pad = 0.08, from0 = false) {
  const lo = from0 ? Math.min(0, ...vals) : Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const a = from0 ? lo : lo - span * pad, b = hi + span * pad;
  return (v: number) => h - ((v - a) / (b - a)) * h;
}
const xScale = (lo: number, hi: number, w: number) => (x: number) => ((x - lo) / (hi - lo || 1)) * w;
const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

export function Spark({ pts, color = "var(--accent)" }: { pts: Pt[]; color?: string }) {
  if (pts.length < 2) return null;
  const w = 120, h = 36, y = yScale(pts.map(p => p.v), h), x = xScale(0, pts.length - 1, w);
  const d = line(pts.map((p, i) => [x(i), y(p.v)]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <path d={d + `L${w},${h}L0,${h}Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface Series { pts: Pt[]; color: string; label: string; dashed?: boolean }

/** Lines on a shared date axis (history and projection can sit side by side), with a hover readout. */
export function Lines({ series, height = 220 }: { series: Series[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const all = series.flatMap(s => s.pts);
  if (!all.length) return null;
  const w = 600, ds = all.map(p => day(p.date)), lo = Math.min(...ds), hi = Math.max(...ds);
  const x = xScale(lo, hi, w), y = yScale(all.map(p => p.v), height);
  const at = hover == null ? null : series.map(s => {
    const near = s.pts.reduce<Pt | null>((b, p) => (!b || Math.abs(day(p.date) - hover) < Math.abs(day(b.date) - hover) ? p : b), null);
    return near && Math.abs(day(near.date) - hover) <= 7 ? { s, p: near } : null;
  }).filter(Boolean) as { s: Series; p: Pt }[];
  const todayX = x(day(new Date().toISOString().slice(0, 10)));
  return (
    <figure style={{ margin: 0, position: "relative" }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img"
           aria-label={series.map(s => `${s.label} ${s.pts.at(-1)?.v}`).join(", ")}
           onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
             setHover(lo + ((e.clientX - r.left) / r.width) * (hi - lo)); }}
           onMouseLeave={() => setHover(null)}>
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
        {todayX > 0 && todayX < w && <line x1={todayX} x2={todayX} y1={0} y2={height} stroke="var(--muted)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        {series.map(s => <path key={s.label} d={line(s.pts.map(p => [x(day(p.date)), y(p.v)]))} fill="none" stroke={s.color}
                               strokeWidth={2} strokeDasharray={s.dashed ? "6 4" : undefined} vectorEffect="non-scaling-stroke" />)}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={height} stroke="var(--text)" opacity={0.3} vectorEffect="non-scaling-stroke" />}
      </svg>
      {at && at.length > 0 && <div className="readout">{at[0].p.date} · {at.map(({ s, p }) => `${s.label} ${p.v.toFixed(1)}`).join(" · ")}</div>}
      <figcaption className="row muted" style={{ justifyContent: "space-between", fontSize: "var(--fs-label)" }}>
        <span>{new Date(lo * 86400000).toISOString().slice(0, 10)}</span>
        <span className="row">{series.map(s => <span key={s.label} className="row" style={{ gap: 6 }}>
          <span style={{ width: 14, height: 0, borderTop: `2px ${s.dashed ? "dashed" : "solid"} ${s.color}`, display: "inline-block" }} />
          {s.label}</span>)}</span>
        <span>{new Date(hi * 86400000).toISOString().slice(0, 10)}</span>
      </figcaption>
    </figure>
  );
}

/** Bars; with `scroll` the full history scrolls sideways and opens at the latest bar. */
export function Bars({ items, height = 140, unit = "", scroll = false }:
  { items: { label: string; v: number }[]; height?: number; unit?: string; scroll?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll && ref.current) ref.current.scrollLeft = ref.current.scrollWidth; }, [scroll, items.length]);
  if (!items.length) return null;
  const max = Math.max(...items.map(i => i.v), 1);
  const grid = (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, ${scroll ? "10px" : "minmax(0, 1fr)"})`, gap: 3,
                  alignItems: "end", height, minWidth: scroll ? items.length * 13 : undefined }}
         role="img" aria-label={`${items.length} weeks, latest ${items.at(-1)?.v} ${unit}`}>
      {items.map((it, i) => (
        <div key={it.label} title={`${it.label}: ${it.v} ${unit}`}
             style={{ height: `${Math.max(2, (it.v / max) * 100)}%`, borderRadius: "3px 3px 0 0",
                      background: i === items.length - 1 ? "var(--accent)" : "color-mix(in oklab, var(--accent), transparent 62%)" }} />
      ))}
    </div>);
  return scroll ? <div ref={ref} style={{ overflowX: "auto", paddingBottom: 4 }}>{grid}</div> : grid;
}

export interface Dot { x: number; y: number; color: string; label: string; ring?: boolean }

/** Points on numeric axes, with reference lines and an optional fitted line. */
export function Scatter({ dots, height = 200, xLabel, yLabel, refs = [], fit, xFmt = (v: number) => v.toFixed(0) }:
  { dots: Dot[]; height?: number; xLabel: string; yLabel: string; refs?: number[]; fit?: [number, number][];
    xFmt?: (v: number) => string }) {
  if (!dots.length) return <span className="muted">Not enough runs yet.</span>;
  const w = 600, xs = dots.map(d => d.x), ys = dots.map(d => d.y).concat(refs);
  const lo = Math.min(...xs), hi = Math.max(...xs), pad = (hi - lo) * 0.05 || 1;
  const x = xScale(lo - pad, hi + pad, w), y = yScale(ys, height);
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label={`${yLabel} by ${xLabel}`}>
        {refs.map(r => <g key={r}><line x1={0} x2={w} y1={y(r)} y2={y(r)} stroke="var(--warn)" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" /></g>)}
        {fit && <path d={line(fit.map(([a, b]) => [x(a), y(b)]))} stroke="var(--muted)" strokeWidth={2} fill="none" vectorEffect="non-scaling-stroke" />}
        {dots.map((d, i) => <circle key={i} cx={x(d.x)} cy={y(d.y)} r={5} fill={d.ring ? "var(--surface)" : d.color} stroke={d.color}
                                    strokeWidth={2} vectorEffect="non-scaling-stroke"><title>{d.label}</title></circle>)}
      </svg>
      <figcaption className="row muted" style={{ justifyContent: "space-between", fontSize: "var(--fs-label)" }}>
        <span>{xFmt(lo)}</span><span>{yLabel} by {xLabel}{refs.length ? ` · dashed ${refs.join(" and ")}` : ""}</span><span>{xFmt(hi)}</span>
      </figcaption>
    </figure>
  );
}

export function Gauge({ value, band, max = 2 }: { value: number; band: [number, number]; max?: number }) {
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`;
  return (
    <div style={{ position: "relative", height: 14, borderRadius: 7, background: "var(--surface-2)", border: "1px solid var(--line)" }}
         role="img" aria-label={`${value.toFixed(2)} against a band of ${band[0]} to ${band[1]}`}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: pct(band[0]), width: `calc(${pct(band[1])} - ${pct(band[0])})`,
                    background: "var(--ok-soft)", borderLeft: "1px solid var(--ok)", borderRight: "1px solid var(--ok)" }} />
      <div style={{ position: "absolute", top: -4, bottom: -4, width: 4, borderRadius: 2, left: `calc(${pct(value)} - 2px)`,
                    background: value > band[1] ? "var(--bad)" : "var(--text)" }} />
    </div>
  );
}
