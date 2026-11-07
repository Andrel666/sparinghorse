// The app's charts, drawn as SVG from one pair of scale helpers. Colours come from tokens.
import { useEffect, useRef, useState } from "react";

export interface Pt { date: string; v: number }
import { dayNum as day, localToday, numDay } from "../lib/format";

/** y: value → pixel (top = high); x: a domain → pixel. One implementation for every chart. */
function yScale(vals: number[], h: number, pad = 0.08, from0 = false) {
  const lo = from0 ? Math.min(0, ...vals) : Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const a = from0 ? lo : lo - span * pad, b = hi + span * pad;
  return Object.assign((v: number) => h - ((v - a) / (b - a)) * h, { a, b });
}

/** The y axis as three values at the left edge (top, middle, bottom of the plotted range). */
function YTicks({ a, b, fmt }: { a: number; b: number; fmt: (v: number) => string }) {
  return <div className="yticks" aria-hidden="true">
    {[b, (a + b) / 2, a].map((v, i) => <span key={i} style={{ top: `${i * 50}%` }}>{fmt(v)}</span>)}</div>;
}
const tick = (v: number) => Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1);
const xScale = (lo: number, hi: number, w: number) => (x: number) => ((x - lo) / (hi - lo || 1)) * w;
const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");

export function Spark({ pts, color = "var(--text)" }: { pts: Pt[]; color?: string }) {
  if (pts.length < 2) return null;
  const w = 120, h = 36, y = yScale(pts.map(p => p.v), h), x = xScale(0, pts.length - 1, w);
  const d = line(pts.map((p, i) => [x(i), y(p.v)]));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <path d={d + `L${w},${h}L0,${h}Z`} fill={color} opacity={0.06} />
      <circle cx={x(pts.length - 1)} cy={y(pts.at(-1)!.v)} r={2.5} fill="var(--signal)" />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export interface Series { pts: Pt[]; color: string; label: string; dashed?: boolean; hidden?: boolean }  // hidden: readout only

/** Lines on a shared date axis (history and projection can sit side by side), with a hover readout. */
export function Lines({ series, height = 220, fmt = (v: number) => v.toFixed(1), band }:
  { series: Series[]; height?: number; fmt?: (v: number) => string; band?: [number | null, number | null] | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const all = series.filter(s => !s.hidden).flatMap(s => s.pts);
  if (!all.length) return null;
  const w = 600, ds = all.map(p => day(p.date)), lo = Math.min(...ds), hi = Math.max(...ds);
  const bandVals = band ? band.filter((b): b is number => b != null) : [];
  const x = xScale(lo, hi, w), y = yScale(all.map(p => p.v).concat(bandVals), height);
  const at = hover == null ? null : series.map(s => {
    const near = s.pts.reduce<Pt | null>((b, p) => (!b || Math.abs(day(p.date) - hover) < Math.abs(day(b.date) - hover) ? p : b), null);
    return near && Math.abs(day(near.date) - hover) <= 7 ? { s, p: near } : null;
  }).filter(Boolean) as { s: Series; p: Pt }[];
  const todayX = x(day(localToday()));
  return (
    <figure className="chart" style={{ margin: 0, position: "relative" }}>
      {/* the ticks sit over the plot only: a caption that wraps (phones) must not move them onto it */}
      <div style={{ position: "relative" }}>
      <YTicks a={y.a} b={y.b} fmt={tick} />
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img"
           aria-label={series.map(s => `${s.label} ${s.pts.at(-1)?.v}`).join(", ")}
           onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
             setHover(lo + ((e.clientX - r.left) / r.width) * (hi - lo)); }}
           onMouseLeave={() => setHover(null)}>
        {band && (band[0] != null || band[1] != null) && (() => { const top = band[1] != null ? y(band[1]) : 0, bot = band[0] != null ? y(band[0]) : height;
          return <rect x={0} width={w} y={top} height={Math.max(0, bot - top)} fill="var(--ok)" opacity={0.1} />; })()}
        {[0.25, 0.5, 0.75].map(f => <line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
        {todayX > 0 && todayX < w && <line x1={todayX} x2={todayX} y1={0} y2={height} stroke="var(--muted)" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />}
        {series.filter(s => !s.hidden).map(s => <path key={s.label} d={line(s.pts.map(p => [x(day(p.date)), y(p.v)]))} fill="none" stroke={s.color}
                               strokeWidth={2} strokeDasharray={s.dashed ? "6 4" : undefined} vectorEffect="non-scaling-stroke" />)}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={height} stroke="var(--text)" opacity={0.3} vectorEffect="non-scaling-stroke" />}
      </svg>
      </div>
      {at && at.length > 0 && <div className="readout">{at[0].p.date} · {at.map(({ s, p }) => `${s.label} ${s.label === "Load ratio" ? p.v.toFixed(2) : fmt(p.v)}`).join(" · ")}</div>}
      <figcaption className="row muted" style={{ justifyContent: "space-between", fontSize: "var(--fs-label)" }}>
        <span>{numDay(lo)}</span>
        <span className="row">{series.filter(s => !s.hidden).map(s => <span key={s.label} className="row" style={{ gap: "var(--sp-2)" }}>
          <span style={{ width: 14, height: 0, borderTop: `2px ${s.dashed ? "dashed" : "solid"} ${s.color}`, display: "inline-block" }} />
          {s.label}</span>)}</span>
        <span>{numDay(hi)}</span>
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
  const ticks = <div className="yticks bars" aria-hidden="true" style={{ height }}>
    <span style={{ top: 0 }}>{tick(max)}{unit ? ` ${unit}` : ""}</span><span style={{ top: "50%" }}>{tick(max / 2)}</span></div>;
  const grid = (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, ${scroll ? "10px" : "minmax(0, 1fr)"})`, gap: 3,
                  alignItems: "end", height, minWidth: scroll ? items.length * 13 : undefined }}
         role="img" aria-label={`${items.length} weeks, latest ${items.at(-1)?.v} ${unit}`}>
      {items.map((it, i) => (
        <div key={it.label} title={`${it.label}: ${it.v} ${unit}`}
             style={{ height: `${Math.max(2, (it.v / max) * 100)}%`,
                      background: i === items.length - 1 ? "var(--signal)" : "var(--ph-base)" }} />
      ))}
    </div>);
  return <div className="chart" style={{ position: "relative" }}>{ticks}
    {scroll ? <div ref={ref} style={{ overflowX: "auto", paddingBottom: 4 }}>{grid}</div> : grid}</div>;
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
    <div style={{ position: "relative", height: 16, borderRadius: 8, background: "var(--surface-2)", border: "1px solid var(--line)" }}
         role="img" aria-label={`${value.toFixed(2)} against a band of ${band[0]} to ${band[1]}`}>
      <div style={{ position: "absolute", top: 0, bottom: 0, left: pct(band[0]), width: `calc(${pct(band[1])} - ${pct(band[0])})`,
                    background: "var(--ok-soft)", borderLeft: "1px solid var(--ok)", borderRight: "1px solid var(--ok)" }} />
      <div style={{ position: "absolute", top: -4, bottom: -4, width: 4, borderRadius: 2, left: `calc(${pct(value)} - 2px)`,
                    background: value > band[1] ? "var(--bad)" : "var(--text)" }} />
    </div>
  );
}
