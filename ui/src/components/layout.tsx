// Shared layout pieces: tabs, the detail drawer, and one month grid (plan calendar and run calendar).
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Tabs<T extends string>({ value, options, onChange, label }:
  { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map(([v, t]) => (
        <button key={v} type="button" role="tab" aria-selected={value === v} className={value === v ? "on" : ""}
                onClick={() => onChange(v)}>{t}</button>
      ))}
    </div>
  );
}

/** The detail panel: a right-hand panel on desktop, a bottom sheet on the phone. Focus moves in, is trapped
 *  (Tab cycles inside), and returns to whatever opened it; Escape or the scrim closes it. */
export function Drawer({ title, open, onClose, children }: { title: ReactNode; open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null), id = useId();
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    const focusables = () => [...(ref.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])') ?? [])];
    focusables()[0]?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", k);
    return () => { window.removeEventListener("keydown", k); opener?.focus?.(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true" aria-labelledby={id}>
        <span className="grab" aria-hidden="true" />
        <header className="row" style={{ justifyContent: "space-between" }}>
          <h2 id={id} style={{ fontSize: "var(--fs-heading)" }}>{title}</h2>
          <button type="button" className="btn" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        {children}
      </aside>
    </>
  );
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const pad = (n: number) => String(n).padStart(2, "0");
export const addMonth = (m: string, k: number) => { const [y, mo] = m.split("-").map(Number); const t = new Date(y, mo - 1 + k, 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`; };

/** One month, opening on the athlete's week start (Python weekday: 0 = Monday). */
export function MonthGrid({ month, weekStart, first, last, onMonth, cell, onPick, selected, today }:
  { month: string; weekStart: number; first?: string; last?: string; onMonth: (m: string) => void;
    cell: (date: string) => { body: ReactNode; className?: string; pickable?: boolean; style?: React.CSSProperties };
    onPick?: (date: string) => void; selected?: string | null; today?: string }) {
  const [y, m] = month.split("-").map(Number);
  const dim = new Date(y, m, 0).getDate();
  const lead = ((new Date(y, m - 1, 1).getDay() + 6) % 7 - weekStart + 7) % 7;
  const title = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return (
    <div className="month">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn" disabled={!!first && month <= first} onClick={() => onMonth(addMonth(month, -1))} aria-label="Previous month">‹</button>
        <b>{title}</b>
        <button type="button" className="btn" disabled={!!last && month >= last} onClick={() => onMonth(addMonth(month, 1))} aria-label="Next month">›</button>
      </div>
      <div className="month-grid">
        {DOW.slice(weekStart).concat(DOW.slice(0, weekStart)).map(d => <div key={d} className="month-dow">{d}</div>)}
        {Array.from({ length: lead }, (_, i) => <div key={`b${i}`} />)}
        {Array.from({ length: dim }, (_, i) => {
          const date = `${month}-${pad(i + 1)}`, c = cell(date);
          const cls = ["month-day", c.className, date === selected ? "sel" : "", date === today ? "today" : ""].filter(Boolean).join(" ");
          return c.pickable && onPick
            ? <button key={date} type="button" className={cls} style={c.style} onClick={() => onPick(date)}><span className="n">{i + 1}</span>{c.body}</button>
            : <div key={date} className={cls} style={c.style}><span className="n">{i + 1}</span>{c.body}</div>;
        })}
      </div>
    </div>
  );
}
