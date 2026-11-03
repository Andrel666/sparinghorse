// The shared building blocks. Pages compose these; none of them style themselves.
import type { ReactNode } from "react";
import type { Tone } from "../lib/format";

type Span = 3 | 4 | 5 | 6 | 7 | 8 | 12;
const cls = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(" ");

export function Card({ label, span = 12, tone, children, aside }:
  { label?: string; span?: Span; tone?: Tone; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className={cls("card", `span-${span}`, tone && `tone-${tone}`)} aria-label={label}>
      {(label || aside) && <div className="row" style={{ justifyContent: "space-between" }}>
        {label && <span className="card-label">{label}</span>}{aside}</div>}
      {children}
    </section>
  );
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
export function Table<T>({ cols, rows, keyOf }: { cols: Col<T>[]; rows: T[]; keyOf: (row: T) => string }) {
  return (
    <div className="table-wrap">
      <table className="steps">
        <thead><tr>{cols.map(c => <th key={c.head}>{c.head}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={keyOf(r)}>{cols.map(c => (
          <td key={c.head} className={c.num ? "num" : undefined} style={c.wide ? { minWidth: 200 } : undefined}>{c.cell(r)}</td>))}</tr>)}</tbody>
      </table>
    </div>
  );
}
