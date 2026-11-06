// The shared building blocks. Pages compose these; none of them style themselves.
import { useEffect, useRef, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import type { Tone } from "../lib/format";

type Span = 3 | 4 | 5 | 6 | 7 | 8 | 12;
const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

/** A page section (DESIGN.md "Section"). `id` makes it an anchor: a link to `#id` scrolls it into view and
 *  flashes its rule. `lede` is its one-line takeaway. `tier="group"` sits closer under the zone above it. */
export function Card({ label, span = 12, tone, children, aside, id, lede, tier = "zone", className }:
  { label?: string; span?: Span; tone?: Tone; children: ReactNode; aside?: ReactNode; id?: string; lede?: ReactNode;
    tier?: "zone" | "group"; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  const loc = useLocation();                 // a same-page door (to="#load") moves the hash without a hashchange
  useEffect(() => {
    if (!id) return;
    const go = () => {
      if (window.location.hash !== `#${id}` || !ref.current) return;
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      ref.current.classList.remove("flash"); void ref.current.offsetWidth; ref.current.classList.add("flash");
    };
    const t = setTimeout(go, 60);           // after the page has laid out
    window.addEventListener("hashchange", go);
    return () => { clearTimeout(t); window.removeEventListener("hashchange", go); };
  }, [id, loc.hash, loc.key]);
  return (
    <section ref={ref} id={id} className={cls("card", `span-${span}`, tone && `tone-${tone}`, tier === "group" && "group", className)} aria-label={label}>
      {(label || aside) && <div className="row" style={{ justifyContent: "space-between" }}>
        {label && <span className="card-label">{label}</span>}{aside}</div>}
      {lede && <div className="card-lede">{lede}</div>}
      {children}
    </section>
  );
}
export const Section = Card;

/** A segmented choice. `wrap` lays it out as a grid of `cols` on the phone instead of overflowing. */
export function Seg<T extends string>({ options, value, onChange, label, wrap, cols = 3, onPeek }:
  { options: { v: T; label: ReactNode }[]; value: T; onChange: (v: T) => void; label: string; wrap?: boolean; cols?: number;
    onPeek?: (v: T | null) => void }) {
  return (
    <div className={cls("seg", wrap && "wrap")} role="group" aria-label={label} style={wrap ? { ["--seg-cols" as string]: cols } : undefined}>
      {options.map(o => (
        <button key={o.v} type="button" aria-pressed={value === o.v} onClick={() => onChange(o.v)}
                onMouseEnter={onPeek && (() => onPeek(o.v))} onMouseLeave={onPeek && (() => onPeek(null))}
                onFocus={onPeek && (() => onPeek(o.v))} onBlur={onPeek && (() => onPeek(null))}>{o.label}</button>))}
    </div>);
}

export function Stat({ value, sub, small, toned }: { value: ReactNode; sub?: ReactNode; small?: boolean; toned?: boolean }) {
  return (<div><div className={cls("stat-value", small && "sm", toned && "toned")}>{value}</div>{sub && <div className="stat-sub">{sub}</div>}</div>);
}

export function Pill({ children, tone, dot }: { children: ReactNode; tone?: Tone; dot?: boolean }) {
  return <span className={cls("pill", tone && `tone-${tone}`)}>{dot && <span className="dot" />}{children}</span>;
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return <header className="page-head"><h1>{title}</h1>{children}</header>;
}

export function State({ children }: { children: ReactNode }) {
  return <div className="state">{children}</div>;
}

export function ListItem({ k, children }: { k: ReactNode; children: ReactNode }) {
  return <div className="list-item"><span className="k">{k}</span><span className="v">{children}</span></div>;
}

/** A data table from a column spec — every tabular list in the app uses it. */
export interface Col<T> { head: string; cell: (row: T) => ReactNode; num?: boolean; wide?: boolean }
/** On the phone a table stacks into label/value rows (`phone="stack"`, default) or scrolls with a sticky first column. */
export function Table<T>({ cols, rows, keyOf, phone = "stack" }: { cols: Col<T>[]; rows: T[]; keyOf: (row: T) => string; phone?: "stack" | "scroll" }) {
  return (
    <div className={cls("table-wrap", phone)}>
      <table className="steps">
        <thead><tr>{cols.map(c => <th key={c.head} className={c.num ? "num" : undefined}>{c.head}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={keyOf(r)}>{cols.map(c => (
          <td key={c.head} data-label={c.head} className={c.num ? "num" : undefined} style={c.wide ? { minWidth: 200 } : undefined}>{c.cell(r)}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}

/** A page's headline numbers where every number is a door: each cell links (`to`) or acts (`onClick`).
 *  The sub line clamps to two lines; `hint` carries the rest as a tooltip. */
type Door = { to: string; onClick?: never } | { onClick: () => void; to?: never };
export type StripItem = { k: string; v: ReactNode; s?: string; hint?: string | null; tone?: Tone; signal?: boolean; active?: boolean;
  spark?: ReactNode } & Door;
export function Strip({ items }: { items: StripItem[] }) {
  return <div className="figures strip">{items.map((f, i) => {
    const c = cls("figure", "link", f.signal && "signal", f.tone && `tone-${f.tone}`, f.active && "active");
    const aria = `${f.k}: ${typeof f.v === "string" ? f.v : ""}${f.s ? `. ${f.s}` : ""}. Open`;
    const body = <><span className="k">{f.k}<span className="go" aria-hidden="true">›</span></span>
      <span className={cls("v", f.tone && "toned")}>{f.v}</span>{f.s && <span className="s" title={f.hint || f.s}>{f.s}</span>}
      {f.spark && <span className="spark">{f.spark}</span>}</>;
    return f.to ? <Link key={i} to={f.to} className={c} aria-label={aria}>{body}</Link>
      : <button key={i} type="button" className={c} aria-label={aria} onClick={f.onClick}>{body}</button>;
  })}</div>;
}

/** The one list row: lead (date or mark) · main (title + sub) · fixed-width number columns · trail.
 *  Clickable as a whole when `onClick` or `to` is given. On the phone the columns wrap under the title. */
export interface RowCol { v: ReactNode; w: number; muted?: boolean }
export function Row({ lead, main, sub, cols = [], trail, onClick, to, label, active }:
  { lead?: ReactNode; main: ReactNode; sub?: ReactNode; cols?: RowCol[]; trail?: ReactNode; onClick?: () => void; to?: string;
    label?: string; active?: boolean }) {
  const style = { ["--cols" as string]: cols.map(c => `${c.w}ch`).join(" ") || "0px" };
  const body = <>
    <span className="r-lead">{lead}</span>
    <span className="r-main"><span className="r-title">{main}</span>{sub && <span className="r-sub">{sub}</span>}</span>
    <span className="r-cols">{cols.map((c, i) => <span key={i} className={cls("r-col num", c.muted && "muted")}>{c.v}</span>)}</span>
    <span className="r-trail">{trail ?? ((onClick || to) && <span aria-hidden="true">›</span>)}</span></>;
  const c = cls("r", (onClick || to) && "hit", active && "active");
  if (to) return <Link to={to} className={c} style={style} aria-label={label}>{body}</Link>;
  if (onClick) return <button type="button" className={c} style={style} onClick={onClick} aria-label={label}>{body}</button>;
  return <div className={c} style={style}>{body}</div>;
}

/** A page's headline numbers: one row of big figures on hairlines (see DESIGN.md "figures row"). */
export interface FigureT { k: ReactNode; v: ReactNode; s?: ReactNode; signal?: boolean; tone?: Tone; to?: string }
export function Figures({ items }: { items: FigureT[] }) {
  return <div className="figures">{items.map((f, i) => {
    const c = cls("figure", f.signal && "signal", f.tone && `tone-${f.tone}`, f.to && "link");
    const body = <><span className="k">{f.k}</span><span className={cls("v", f.tone && "toned")}>{f.v}</span>{f.s && <span className="s">{f.s}</span>}</>;
    return f.to ? <Link key={i} to={f.to} className={c}>{body}</Link> : <div key={i} className={c}>{body}</div>;
  })}</div>;
}
