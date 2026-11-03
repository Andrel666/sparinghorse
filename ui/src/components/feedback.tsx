// App-wide feedback: one confirm dialog (consequences + an alternative), toasts for action results,
// "?" help bubbles, banners. Pages ask for them through hooks; none builds its own dialog.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Tone } from "../lib/format";

export interface ConfirmSpec { title: string; intro?: ReactNode; lines?: ReactNode[]; alt?: ReactNode; ok?: string; danger?: boolean }
type Toast = { id: number; text: ReactNode; tone?: Tone };
const Ctx = createContext<{ confirm: (s: ConfirmSpec) => Promise<boolean>; toast: (text: ReactNode, tone?: Tone) => void } | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<ConfirmSpec | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const confirm = useCallback((s: ConfirmSpec) => {
    if (resolver.current) return Promise.resolve(false);          // one at a time
    setSpec(s);
    return new Promise<boolean>(res => { resolver.current = res; });
  }, []);
  const close = (v: boolean) => { resolver.current?.(v); resolver.current = null; setSpec(null); };
  useEffect(() => { if (spec && dlg.current && !dlg.current.open) dlg.current.showModal(); }, [spec]);
  const toast = useCallback((text: ReactNode, tone?: Tone) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, text, tone }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), tone === "bad" ? 9000 : 5000);
  }, []);
  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}
      {spec && <dialog ref={dlg} className="confirm" aria-labelledby="cf-title" onCancel={e => { e.preventDefault(); close(false); }}
                       onClick={e => e.target === dlg.current && close(false)}>
        <h2 id="cf-title">{spec.title}</h2>
        {spec.intro && <p>{spec.intro}</p>}
        {spec.lines?.length ? <ul>{spec.lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : null}
        {spec.alt && <p className="muted">{spec.alt}</p>}
        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button type="button" className="btn" autoFocus onClick={() => close(false)}>Cancel</button>
          <button type="button" className={`btn ${spec.danger === false ? "primary" : "danger"}`} onClick={() => close(true)}>{spec.ok || "Delete"}</button>
        </div>
      </dialog>}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => <div key={t.id} className={`toast${t.tone ? ` tone-${t.tone}` : ""}`}>{t.text}
          <button type="button" className="linkish" aria-label="Dismiss" onClick={() => setToasts(x => x.filter(y => y.id !== t.id))}>✕</button></div>)}
      </div>
    </Ctx.Provider>
  );
}

export function useFeedback() {
  const c = useContext(Ctx);
  if (!c) throw new Error("FeedbackProvider missing");
  return c;
}

/** A "?" that opens a short explanation; Escape or a click elsewhere closes it. */
export function Help({ children, label = "What this means" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: Event) => { if (!(e.target instanceof Node && ref.current?.contains(e.target))) setOpen(false); };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", off); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("click", off); document.removeEventListener("keydown", key); };
  }, [open]);
  return (
    <span className="help-wrap" ref={ref}>
      <button type="button" className="help-q" aria-label={label} aria-expanded={open} onClick={e => { e.stopPropagation(); setOpen(o => !o); }}>?</button>
      {open && <span className="help-pop" role="tooltip">{children}</span>}
    </span>
  );
}

export function Banner({ tone, children, action }: { tone?: Tone; children: ReactNode; action?: ReactNode }) {
  return <div className={`banner${tone ? ` tone-${tone}` : ""}`} role="status"><div>{children}</div>{action}</div>;
}
