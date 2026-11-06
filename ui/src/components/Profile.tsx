// A run's profile along its distance: one channel drawn as the shaded trace (pace by default), a
// channel picker (hover previews, click locks), the HR-zone strip with its legend, a hover readout.
import { ZONE_COLORS } from "../lib/format";
import { useState } from "react";
import { useProfile, type Profile as P } from "../lib/api";
import { dist, unit } from "../lib/format";
import { Seg } from "./ui";

type Ch = "pace" | "hr" | "cadence" | "elevation" | "gct" | "vo";
const CH: { k: Ch; label: string; has: keyof P; fmt: (v: number) => string; invert?: boolean }[] = [
  { k: "pace", label: "Pace", has: "has_pace", invert: true, fmt: v => { const s = Math.round(unit() === "mi" ? v * 1.609344 : v); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}/${unit()}`; } },
  { k: "hr", label: "Heart rate", has: "has_hr", fmt: v => `${Math.round(v)} bpm` },
  { k: "cadence", label: "Cadence", has: "has_cadence", fmt: v => `${Math.round(v)} spm` },
  { k: "elevation", label: "Elevation", has: "has_elevation", fmt: v => `${Math.round(v)} m` },
  { k: "gct", label: "Ground contact", has: "has_gct", fmt: v => `${Math.round(v)} ms` },
  { k: "vo", label: "Vert. oscillation", has: "has_vo", fmt: v => `${v.toFixed(1)} cm` },
];
const ZC = ZONE_COLORS;
const zoneOf = (bpm: number, cut: number[]) => { let z = 0; for (const c of cut) if (bpm >= c) z++; return Math.min(z, 4); };

export function Profile({ id }: { id: number }) {
  const q = useProfile(id);
  const [locked, setLocked] = useState<Ch | null>(null);
  const [peek, setPeek] = useState<Ch | null>(null);
  const [hx, setHx] = useState<number | null>(null);
  const p = q.data;
  if (!p) return null;
  const avail = CH.filter(c => p[c.has]);
  if (!avail.length || p.dist.length < 2) return <span className="muted">No stream recorded for this run.</span>;
  const ch = CH.find(c => c.k === (peek || locked)) || avail[0];
  const vals = p[ch.k] as (number | null)[];
  const nums = vals.filter((v): v is number => v != null);
  const lo = Math.min(...nums), hi = Math.max(...nums), span = hi - lo || 1, W = 600, H = 150, d0 = p.dist[0], d1 = p.dist.at(-1)!;
  const X = (d: number) => ((d - d0) / (d1 - d0 || 1)) * W;
  const Y = (v: number) => { const f = (v - lo) / span; return H - 6 - (ch.invert ? 1 - f : f) * (H - 12); };
  const path = vals.map((v, i) => v == null ? null : `${X(p.dist[i]).toFixed(1)},${Y(v).toFixed(1)}`).filter(Boolean);
  const cut = p.hrzones?.cutoffs || [];
  const hi_ = hx == null ? null : p.dist.reduce((b, d, i) => Math.abs(d - hx) < Math.abs(p.dist[b] - hx) ? i : b, 0);
  return (
    <div className="list" style={{ gap: 6 }}>
      <Seg label="Profile channel" wrap cols={3} value={ch.k} onChange={setLocked} onPeek={setPeek}
           options={avail.map(c => ({ v: c.k, label: c.label }))} />
      <figure style={{ margin: 0, position: "relative" }}>
        {p.has_hr && cut.length > 0 && <svg viewBox={`0 0 ${W} 6`} width="100%" height={6} preserveAspectRatio="none" aria-hidden="true">
          {p.hr.map((v, i) => v == null || i === p.hr.length - 1 ? null :
            <rect key={i} x={X(p.dist[i])} width={Math.max(0.5, X(p.dist[i + 1]) - X(p.dist[i]))} y={0} height={6} fill={ZC[zoneOf(v, cut)]} />)}</svg>}
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img"
             aria-label={`${ch.label} along the run, ${ch.fmt(lo)} to ${ch.fmt(hi)}`}
             onMouseMove={e => { const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); setHx(d0 + ((e.clientX - r.left) / r.width) * (d1 - d0)); }}
             onMouseLeave={() => setHx(null)}>
          {path.length > 1 && <>
            <path d={`M${path[0]!.split(",")[0]},${H}L${path.join("L")}L${path.at(-1)!.split(",")[0]},${H}Z`} fill="var(--text)" opacity={0.07} />
            <path d={`M${path.join("L")}`} fill="none" stroke="var(--text)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          </>}
          {ch.k === "hr" && p.hr_avg && <line x1={0} x2={W} y1={Y(p.hr_avg)} y2={Y(p.hr_avg)} stroke="var(--muted)" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
          {hi_ != null && <line x1={X(p.dist[hi_])} x2={X(p.dist[hi_])} y1={0} y2={H} stroke="var(--text)" opacity={0.3} vectorEffect="non-scaling-stroke" />}
        </svg>
        {hi_ != null && <div className="readout">{dist(p.dist[hi_]).toFixed(2)} {unit()} · {CH.filter(c => p[c.has] && (p[c.k] as (number | null)[])[hi_] != null)
          .map(c => c.fmt((p[c.k] as number[])[hi_])).join(" · ")}</div>}
        <figcaption className="row muted" style={{ justifyContent: "space-between", fontSize: "var(--fs-label)" }}>
          <span>{ch.label.toLowerCase()} profile{ch.invert ? " (faster = higher)" : ""}{ch.k === "hr" && p.hr_avg ? ` · avg ${p.hr_avg} bpm` : ""}</span>
          {p.has_hr && cut.length > 0 && <span className="row" style={{ gap: 6 }}>{ZC.map((c, i) => <span key={i} className="row" style={{ gap: 3 }}>
            <span style={{ width: 10, height: 6, background: c, display: "inline-block" }} />Z{i + 1}</span>)}
            <span>· {p.hrzones?.anchor === "lthr" ? `LTHR ${p.hrzones.ref}` : "% HRmax"}</span></span>}
        </figcaption>
      </figure>
    </div>);
}
