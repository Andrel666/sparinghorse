// What every page shares above and below its content: sync state + Sync now + theme, the first-run
// guide, the data-quality banner, the footer. Auto-syncs once when the app opens.
import { Icon } from "./Icon";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { postJSON, useShell, type ShellT } from "../lib/api";
import { useAction } from "../lib/actions";
import { dateShort, km, setUnits } from "../lib/format";
import { Banner, useFeedback } from "./feedback";
import { Link, NavLink } from "react-router-dom";
import { PAGES } from "../lib/pages";

type Theme = "auto" | "dark" | "light";
const THEME_KEY = "sh-ui-theme";
const readTheme = (): Theme => { try { const t = localStorage.getItem(THEME_KEY); return t === "dark" || t === "light" ? t : "auto"; } catch { return "auto"; } };
const dark = typeof matchMedia === "function" ? matchMedia("(prefers-color-scheme: dark)") : null;
/** The tokens have one dark block under [data-theme="dark"], so Auto resolves the system setting here
 *  (and index.html does the same before first paint). */
export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t === "auto" ? (dark?.matches ? "dark" : "light") : t;
  try { if (t === "auto") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, t); } catch { /* private window */ }
}
applyTheme(readTheme());
dark?.addEventListener?.("change", () => { if (readTheme() === "auto") applyTheme("auto"); });
export { readTheme, type Theme };

const since = (h: number | null) => h == null ? "not synced yet" : h < 1 ? `synced ${Math.max(1, Math.round(h * 60))} min ago`
  : h < 48 ? `synced ${Math.round(h)} h ago` : `synced ${Math.round(h / 24)} days ago`;

type SyncResult = { ok: boolean; skipped?: boolean; error?: string; activities?: { added?: number; pages_fetched?: number } };

export function TopBar({ s }: { s: ShellT }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const sync = useAction<SyncResult>("/api/sync", undefined, {
    fail: "Sync failed", done: r => `Synced${r.activities?.added ? ` · ${r.activities.added} new activities` : " · nothing new"}` });
  const next: Record<Theme, Theme> = { auto: "dark", dark: "light", light: "auto" };
  return (
    <div className="topbar">
      <span className={`sync-state${s.stale ? " stale" : ""}`} title={s.last_sync ? `Last successful sync: ${new Date(s.last_sync).toLocaleString()}` : undefined}>
        {since(s.sync_hours)}</span>
      <button type="button" className="btn" disabled={sync.isPending} onClick={() => sync.mutate()}>{sync.isPending ? "Syncing…" : "Sync"}</button>
      <button type="button" className="linkish" aria-label={`Theme: ${theme === "auto" ? "follows the system" : theme}. Change`}
              onClick={() => { const t = next[theme]; setTheme(t); applyTheme(t); }}>
        {theme === "auto" ? "Auto" : theme === "dark" ? "Dark" : "Light"}</button>
    </div>);
}

function FirstRun({ steps }: { steps: NonNullable<ShellT["first_run"]> }) {
  const active = steps.find(x => !x.done);
  return (
    <Banner action={active && (active.key === "race" ? <Link className="btn primary" to="/plan?races=1">Add a race</Link>
                              : active.key === "token" ? <Link className="btn primary" to="/settings#connections">Open Settings</Link> : null)}>
      <b>Set up Sparing Horse</b> Three steps to your first plan.
      <ol className="bullets">{steps.map(x => (
        <li key={x.key} style={{ opacity: x.done ? .6 : 1 }}>{x.done ? "✓ " : ""}<b>{x.title}</b>{x === active ? `: ${x.text}` : ""}</li>))}</ol>
    </Banner>);
}

function DataQuality({ s }: { s: ShellT }) {
  const del = useAction<{ ok: boolean }, number>(id => `/api/activity/${id}/delete`, undefined, {
    confirm: { title: "Delete this leftover duplicate?", ok: "Delete locally",
      lines: ["It is removed from this app's copy only: Runalyze keeps it.", "Your load numbers are recomputed without it.",
              "A full backfill would bring it back if Runalyze still has it."], alt: "Ignore excludes it reversibly instead." },
    done: () => "Duplicate deleted" });
  const restore = useAction<{ ok: boolean }, number>(id => `/api/activity/${id}/unignore`, () => ({ reason: "manual" }), { done: () => "Run restored" });
  if (!s.duplicates.length && !s.ignored.length) return null;
  return <>
    {s.duplicates.length > 0 && <Banner tone="warn">
      <b>{s.duplicates.length} likely duplicate {s.duplicates.length > 1 ? "activities" : "activity"}</b> (same time, distance and sport).
      They inflate fitness, fatigue and the load ratio on Runalyze too: delete them there and sync. The charts here already ignore them.
      <div className="row" style={{ marginTop: "var(--sp-2)" }}>{s.duplicates.map(d => (
        <button key={d.id} type="button" className="btn" onClick={() => del.mutate(d.id)}><Icon name="trash" /> Delete {d.date ? dateShort(d.date) : `#${d.id}`} · {km(d.distance)}</button>))}</div>
    </Banner>}
    {s.ignored.length > 0 && <Banner>
      {s.ignored.length} {s.ignored.length > 1 ? "runs are" : "run is"} excluded from your stats.
      <div className="row" style={{ marginTop: "var(--sp-2)" }}>{s.ignored.map(i => (
        <button key={i.id} type="button" className="btn" onClick={() => restore.mutate(i.id)}>Restore {i.date ? dateShort(i.date) : `#${i.id}`}</button>))}</div>
    </Banner>}
  </>;
}

/** Wraps the routes: sets units, auto-syncs once, shows the top bar, shared banners and footer. */
export function Frame({ children }: { children: ReactNode }) {
  const q = useShell();
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return; once.current = true;
    postJSON<SyncResult>("/api/sync?auto=1").then(r => {
      if (r.ok && !r.skipped) qc.invalidateQueries();
      if (r.activities?.added) toast(`${r.activities.added} new ${r.activities.added > 1 ? "runs" : "run"} synced`, "ok");
    }).catch(() => { /* the server throttles it; a miss is silent, like Classic */ });
  }, [qc, toast]);
  const s = q.data;
  if (s) setUnits(s.units);
  return <>
    {s && <div className="page frame-top"><div className="phone-only phone-top"><nav className="phone-you" aria-label="You">
      {PAGES.filter(p => p.you).map(p => <NavLink key={p.path} to={p.path} className="linkish" state={{ root: true }}>{p.label}</NavLink>)}</nav>
      <TopBar s={s} /></div>{s.first_run && <FirstRun steps={s.first_run} />}<DataQuality s={s} /></div>}
    {children}
    {s && <footer className="page footer"><span>Sparing Horse v{s.version}</span>
      <a href="https://runalyze.com" target="_blank" rel="noopener noreferrer">powered by Runalyze</a>
      <a href="https://getsongbpm.com" target="_blank" rel="noopener noreferrer">with GetSongBPM</a></footer>}
  </>;
}
