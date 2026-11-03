// The app's charts, drawn as SVG from one scale helper. Colours come from tokens via CSS variables.
export interface Pt { date: string; v: number }

function scale(vals: number[], h: number, pad = 0.08) {
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const a = lo - span * pad, b = hi + span * pad;
  return (v: number) => h - ((v - a) / (b - a)) * h;
}
const path = (pts: Pt[], w: number, y: (v: number) => number) =>
  pts.map((p, i) => `${i ? "L" : "M"}${((i / Math.max(pts.length - 1, 1)) * w).toFixed(1)},${y(p.v).toFixed(1)}`).join("");

export function Spark({ pts, color = "var(--accent)" }: { pts: Pt[]; color?: string }) {
  if (pts.length < 2) return null;
  const w = 120, h = 36, y = scale(pts.map(p => p.v), h);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" aria-hidden="true">
      <path d={path(pts, w, y) + `L${w},${h}L0,${h}Z`} fill={color} opacity={0.12} />
      <path d={path(pts, w, y)} fill="none" stroke={color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Lines({ series, height = 200 }: { series: { pts: Pt[]; color: string; label: string }[]; height?: number }) {
  const all = series.flatMap(s => s.pts.map(p => p.v));
  if (!all.length) return null;
  const w = 600, y = scale(all, height), first = series[0].pts[0]?.date, last = series[0].pts.at(-1)?.date;
  const ticks = [Math.min(...all), (Math.min(...all) + Math.max(...all)) / 2, Math.max(...all)];
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img"
           aria-label={series.map(s => `${s.label} ${s.pts.at(-1)?.v}`).join(", ")}>
        {ticks.map((t, i) => <line key={i} x1={0} x2={w} y1={y(t)} y2={y(t)} stroke="var(--line)" vectorEffect="non-scaling-stroke" />)}
        {series.map(s => <path key={s.label} d={path(s.pts, w, y)} fill="none" stroke={s.color} strokeWidth={2}
                               vectorEffect="non-scaling-stroke" />)}
      </svg>
      <figcaption className="row muted" style={{ justifyContent: "space-between", fontSize: "var(--fs-label)" }}>
        <span>{first}</span>
        <span className="row">{series.map(s => <span key={s.label} className="row" style={{ gap: 6 }}>
          <span style={{ width: 12, height: 3, background: s.color, display: "inline-block", borderRadius: 2 }} />
          {s.label} {s.pts.at(-1)?.v.toFixed(1)}</span>)}</span>
        <span>{last}</span>
      </figcaption>
    </figure>
  );
}

export function Bars({ items, height = 140, unit = "" }: { items: { label: string; v: number }[]; height?: number; unit?: string }) {
  if (!items.length) return null;
  const max = Math.max(...items.map(i => i.v), 1);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`, gap: 3, alignItems: "end", height }}
         role="img" aria-label={`last ${items.length} weeks, latest ${items.at(-1)?.v} ${unit}`}>
      {items.map((it, i) => (
        <div key={it.label} title={`${it.label}: ${it.v} ${unit}`}
             style={{ height: `${Math.max(2, (it.v / max) * 100)}%`, borderRadius: "3px 3px 0 0",
                      background: i === items.length - 1 ? "var(--accent)" : "color-mix(in oklab, var(--accent), transparent 65%)" }} />
      ))}
    </div>
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
