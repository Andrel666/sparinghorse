// Settings panels that read their own endpoints: away days, calibration, keys, Suunto, COROS,
// console access, system status, backup & export, backfill.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAction } from "../../lib/actions";
import { dateShort } from "../../lib/format";
import { Card, ListItem, Pill, Table } from "../../components/ui";
import { Query } from "../Query";

const useGet = <T,>(key: string, path: string) => useQuery({ queryKey: ["ui", "set", key], queryFn: () => api<T>(path) });

// ── Away days ──
interface Away { id: number; date_from: string; date_to: string; note: string; active: number }
export function AwayDays() {
  const q = useGet<Away[]>("away", "/api/availability");
  const [f, setF] = useState({ from: "", to: "", note: "" });
  const add = useAction<{ ok: boolean }>("/api/availability", () => ({ date_from: f.from, date_to: f.to || f.from, note: f.note }),
    { done: () => { setF({ from: "", to: "", note: "" }); return "Away days added — the plan lays around them"; }, fail: "Could not add the away days" });
  const rm = useAction<{ ok: boolean }, Away>(a => `/api/availability/${a.id}/remove`, undefined, {
    confirm: a => ({ title: "Clear these away days?", ok: "Clear", lines: [`${dateShort(a.date_from)} → ${dateShort(a.date_to)}${a.note ? ` · ${a.note}` : ""}`],
      alt: "They stay listed for 24 hours with a put-back control." }), done: () => "Cleared — the plan re-laid" });
  const back = useAction<{ ok: boolean }, number>(id => `/api/availability/${id}/restore`, undefined, { done: () => "Put back" });
  return <Card label="Away / can't run">
    <span className="muted" style={{ fontSize: "var(--fs-small)" }}>The plan lays its runs around these days. Away days stay private.</span>
    <Query q={q}>{xs => xs.length ? <div className="list">{xs.map(a => (
      <ListItem key={a.id} k={`${dateShort(a.date_from)} → ${dateShort(a.date_to)}`}>
        {a.note}{a.active ? <button className="btn" style={{ marginLeft: 8 }} aria-label="Clear" onClick={() => rm.mutate(a)}>✕</button>
          : <><span className="muted"> · cleared</span> <button className="btn" onClick={() => back.mutate(a.id)}>Put back</button></>}</ListItem>))}</div>
      : <span className="muted">None — you're fully available.</span>}</Query>
    <form className="row" onSubmit={e => { e.preventDefault(); if (f.from) add.mutate(); }}>
      <input type="date" required className="input" style={{ width: "auto" }} value={f.from} onChange={e => setF({ ...f, from: e.target.value })} aria-label="From" />
      <input type="date" className="input" style={{ width: "auto" }} value={f.to} min={f.from} onChange={e => setF({ ...f, to: e.target.value })} aria-label="To" />
      <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="note (optional)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} aria-label="Note" />
      <button type="submit" className="btn primary" disabled={!f.from || add.isPending}>Add</button>
    </form>
  </Card>;
}

// ── Calibration ──
const CAL_NAMES: Record<string, string> = { trimp_scale: "Load of an easy minute (× default)", BIO_EQ_STEP: "Biggest single run vs last 30 days",
  CTL_RAMP_MAX: "Fitness gain allowed per week", ACWR_HARD: "Load-ratio ceiling", ACWR_SOFT: "Load-ratio planning target" };
interface Cal { ok: boolean; in_force: Record<string, number>; proposal: null | { approved: boolean; created_at: string; history: { runs: number };
  injury_errors: string[]; breaks: { from: string; to: string }[];
  params: { key: string; default: number; value: number; status: string; basis: string; effect?: string }[] } }
export function Calibration() {
  const q = useGet<Cal>("cal", "/api/calibration");
  const act = (a: string, msg: string) => useAction<{ ok: boolean }>(`/api/calibration/${a}`, undefined, { done: () => msg, fail: "Calibration failed" });
  const fit = act("fit", "Fitted — review and approve"), ok = act("approve", "Calibration approved — in force"), rev = act("revert", "Back on the defaults");
  return <Query q={q}>{c => {
    const p = c.proposal, n = Object.keys(c.in_force).length;
    return <Card label="Calibrate to my history">
      <span className="muted">Re-fits the engine's load and safety numbers to your runs and injury history. Nothing changes until you approve.</span>
      {!p ? <span className="muted">{n ? "" : "No calibration — the engine runs on its defaults."}</span> : <>
        <span><b>{p.approved ? "In force" : "Proposed — not applied"}</b> · fitted {p.created_at.slice(0, 10)} on {p.history.runs} runs</span>
        <Table phone="scroll" cols={[{ head: "Number", cell: (x: NonNullable<Cal["proposal"]>["params"][number]) => CAL_NAMES[x.key] || x.key },
          { head: "Default", cell: x => x.default, num: true }, { head: "Fitted", cell: x => x.value, num: true },
          { head: "Status", cell: x => x.status === "fitted" ? <Pill tone="warn">change</Pill> : x.status === "insufficient" ? "no data" : "keep" },
          { head: "Why", cell: x => <span className="muted">{x.basis}{x.effect ? ` · ${x.effect}` : ""}</span>, wide: true }]} rows={p.params} keyOf={x => x.key} />
        {p.injury_errors?.length > 0 && <span style={{ color: "var(--warn)" }}>Injury lines not read: {p.injury_errors.join("; ")}</span>}
        {p.breaks?.length > 0 && <span className="muted">Breaks of 14+ days not in your injury list: {p.breaks.slice(0, 8).map(b => `${b.from} → ${b.to}`).join(", ")}{p.breaks.length > 8 ? " …" : ""}</span>}
      </>}
      <div className="row">
        <button className="btn" onClick={() => fit.mutate()} disabled={fit.isPending}>{fit.isPending ? "Fitting on your history…" : "Fit"}</button>
        <button className="btn primary" onClick={() => ok.mutate()} disabled={ok.isPending || !p || p.approved}>Approve</button>
        <button className="btn" onClick={() => rev.mutate()} disabled={rev.isPending || (!p && !n)}>Revert to defaults</button>
      </div>
    </Card>;
  }}</Query>;
}

// ── Keys ──
interface Secret { key: string; label: string; configured: boolean; source: string; fingerprint: string; help: string }
const MUSIC_KEY = /^(spotify|lastfm|listenbrainz)_/;
export function Keys({ music = false }: { music?: boolean }) {
  const q = useGet<{ ok: boolean; secrets: Secret[] }>("secrets", "/api/secrets");
  const v = useQuery({ queryKey: ["ui", "set", "secrets-valid"], queryFn: () => api<{ results: Record<string, string> }>("/api/secrets/validate"), enabled: !!q.data });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const save = useAction<{ ok: boolean }, { key: string; value: string }>("/api/secrets", a => a,
    { done: r => { void r; return "Key saved"; }, fail: "Could not save the key" });
  return <Query q={q}>{d => {
    const rows = d.secrets.filter(s => MUSIC_KEY.test(s.key) === music);
    return <Card label={music ? "Music keys" : "Keys"}>
      {!music && <span className="muted" style={{ fontSize: "var(--fs-small)" }}>Keys are write-only: they're never shown again. A Claude key sends Anthropic what the AI
        features need (narration, parsing, judgment, the coach) and nothing else. Check a key against its fingerprint with <code>printf %s "$KEY" | sha256sum</code>.</span>}
      {rows.map(s => {
        const r = v.data?.results?.[s.key];
        return <div key={s.key} className="field">
          <label htmlFor={`sec-${s.key}`}>{s.label} {s.configured
            ? <Pill tone={r === "invalid" ? "bad" : "ok"}>{r === "valid" ? "✓ in use · valid" : r === "invalid" ? "✕ key rejected" : s.source === "env" ? "✓ from environment" : "✓ configured"}{v.isFetching ? " · checking…" : ""}</Pill>
            : <Pill>not set</Pill>}{s.fingerprint && <code className="muted" title="sha256 of the key, first 8 characters"> fp {s.fingerprint}</code>}</label>
          <div className="row">
            <input id={`sec-${s.key}`} type="password" autoComplete="off" className="input" style={{ maxWidth: 360 }} value={draft[s.key] || ""}
                   placeholder={s.configured ? "•••• — paste a new value to replace" : "Paste your key to enable"} onChange={e => setDraft({ ...draft, [s.key]: e.target.value })} />
            <button className="btn primary" disabled={!draft[s.key]} onClick={() => save.mutate({ key: s.key, value: draft[s.key] }, { onSuccess: () => setDraft({ ...draft, [s.key]: "" }) })}>Save</button>
            {s.source === "saved" && <button className="btn" onClick={() => save.mutate({ key: s.key, value: "" })}>Clear</button>}
          </div>
          <span className="help">{s.help}</span>
        </div>;
      })}
    </Card>;
  }}</Query>;
}

// ── Watches ──
type Push = { ok: boolean; pushed?: number; recreated?: number; days?: number; kept?: number; note?: string; error?: string };
export function Suunto() {
  const q = useGet<{ connected: boolean; user: string | null; configured: boolean; redirect_uri: string }>("suunto", "/api/suunto/status");
  const push = useAction<Push, boolean>("/api/suunto/push", recreate => ({ recreate }),
    { done: r => `✓ ${r.pushed ?? 0} sessions pushed${r.recreated ? ` (${r.recreated} rebuilt from scratch)` : ""}${r.note ? ` — ${r.note}` : ""}`, fail: "Push failed" });
  const off = useAction<{ ok: boolean }>("/api/suunto/disconnect", undefined, { done: () => "Suunto disconnected" });
  return <Query q={q}>{s => <Card label="Suunto">
    <span>{s.connected ? <Pill tone="ok">✓ connected{s.user ? ` as ${s.user}` : ""}</Pill> : s.configured ? <Pill>not connected</Pill> : <Pill>needs the 3 Suunto keys above</Pill>}</span>
    <div className="row">{!s.connected ? <a className={`btn primary${s.configured ? "" : " disabled"}`} aria-disabled={!s.configured} href={s.configured ? "/api/suunto/connect" : undefined}>Connect Suunto</a> : <>
      <button className="btn primary" disabled={push.isPending} onClick={() => push.mutate(false)}>{push.isPending ? "Pushing…" : "Push week to watch"}</button>
      <button className="btn" disabled={push.isPending} onClick={() => push.mutate(true)}>Rebuild on watch</button>
      <button className="btn" onClick={() => off.mutate()}>Disconnect</button></>}</div>
    <span className="help">Register this redirect URI with Suunto: <code>{s.redirect_uri}</code></span>
  </Card>}</Query>;
}
export function Coros() {
  const q = useGet<{ connected: boolean; pending: boolean; login_url?: string; plan_end: string | null; last_push: string | null; last_error: { at: string; error: string } | null }>("coros", "/api/coros/status");
  const connect = useAction<{ ok: boolean }>("/api/coros/connect", undefined, { done: () => "Sign in to COROS to finish" });
  const push = useAction<Push>("/api/coros/push", undefined, { done: r => `✓ ${r.days ?? 0} days pushed${r.kept ? ` — ${r.kept} completed days left alone` : ""}${r.note ? ` — ${r.note}` : ""}`, fail: "Push failed" });
  const off = useAction<{ ok: boolean }>("/api/coros/disconnect", undefined, { done: () => "COROS disconnected" });
  return <Query q={q}>{c => <Card label="COROS">
    <span>{c.connected ? <Pill tone="ok">✓ connected</Pill> : c.pending ? <Pill tone="warn">waiting for sign-in</Pill> : <Pill>not connected</Pill>}</span>
    <div className="row">
      {!c.connected && !c.pending && <button className="btn primary" disabled={connect.isPending} onClick={() => connect.mutate()}>Connect COROS</button>}
      {c.pending && <>{c.login_url && <a className="btn primary" href={c.login_url} target="_blank" rel="noopener noreferrer">Sign in to COROS</a>}
        <button className="btn" onClick={() => q.refetch()}>I've signed in</button></>}
      {c.connected && <><button className="btn primary" disabled={push.isPending} onClick={() => push.mutate()}>{push.isPending ? "Pushing…" : "Push to COROS"}</button>
        <button className="btn" onClick={() => off.mutate()}>Disconnect</button></>}
    </div>
    {c.last_error && <span style={{ color: "var(--bad)" }}>Last error {new Date(c.last_error.at).toLocaleString()}: {c.last_error.error}</span>}
    {(c.plan_end || c.last_push) && <span className="muted">{c.plan_end ? `Plan on the watch to ${dateShort(c.plan_end)}` : ""}{c.last_push ? ` · last push ${new Date(c.last_push).toLocaleString()}` : ""}</span>}
  </Card>}</Query>;
}

// ── Console ──
export function Access() {
  const q = useGet<{ mode: string; user: string | null; passphrase_set_on: string | null; session_days: number; cookie_secure: boolean }>("auth", "/api/auth/status");
  const [f, setF] = useState({ current: "", next: "", again: "" });
  const change = useAction<{ ok: boolean }>("/api/auth/passphrase", () => ({ current: f.current, new: f.next }),
    { done: () => { setF({ current: "", next: "", again: "" }); return "Changed ✓ — other devices are signed out"; }, fail: "Could not change the passphrase" });
  return <Query q={q}>{a => a.mode === "none" ? null : <Card label="Console access">
    <span>{a.mode === "proxy" ? `Signed in through the proxy as ${a.user}.` : `Signed in with the passphrase${a.passphrase_set_on ? ` (set ${dateShort(a.passphrase_set_on.slice(0, 10))})` : ""}. Sessions last ${a.session_days} days.`}</span>
    {!a.cookie_secure && <span style={{ color: "var(--warn)" }}>The session cookie isn't marked secure — serve this over HTTPS.</span>}
    {a.mode === "passphrase" && <form className="row" onSubmit={e => { e.preventDefault(); if (f.next === f.again && f.next.length >= 12) change.mutate(); }}>
      <input type="password" className="input" style={{ width: "18ch" }} placeholder="current" value={f.current} onChange={e => setF({ ...f, current: e.target.value })} aria-label="Current passphrase" autoComplete="current-password" />
      <input type="password" className="input" style={{ width: "18ch" }} placeholder="new (12+ characters)" value={f.next} onChange={e => setF({ ...f, next: e.target.value })} aria-label="New passphrase" autoComplete="new-password" />
      <input type="password" className="input" style={{ width: "18ch" }} placeholder="once more" value={f.again} onChange={e => setF({ ...f, again: e.target.value })} aria-label="New passphrase again" autoComplete="new-password" />
      <button className="btn primary" type="submit" disabled={!f.current || f.next.length < 12 || f.next !== f.again}>Change</button>
      {f.again && f.next !== f.again && <span style={{ color: "var(--bad)" }}>The two new entries differ</span>}
    </form>}
    <form method="post" action="/logout"><button className="btn" type="submit">Log out</button></form>
  </Card>}</Query>;
}
interface Sys { engine_version: string; tz: string; db_writable: boolean; db_unwritable: string[]; last_sync: string | null; sync_stale: boolean;
  sched: { last_ok: string | null; fail_count: number }; suunto: { connected: boolean; last_push: string | null }; coros: { connected: boolean; last_push: string | null };
  backup: { latest: string | null; age_h: number | null; dir: string; push: boolean }; access: { bypass: boolean; team: string | null; matches: boolean; seen: unknown } }
export function System() {
  const q = useGet<Sys>("system", "/api/system");
  const t = (s: string | null) => (s ? new Date(s).toLocaleString() : "never");
  return <Query q={q}>{s => <Card label="System">
    <div className="list">
      <ListItem k="Engine">v{s.engine_version} · zone {s.tz}</ListItem>
      <ListItem k="Database">{s.db_writable ? "writable" : <span style={{ color: "var(--bad)" }}>not writable ({s.db_unwritable.join(", ")}) — restart the container</span>}</ListItem>
      <ListItem k="Last sync"><span style={{ color: s.sync_stale ? "var(--warn)" : undefined }}>{t(s.last_sync)}{s.sync_stale ? " · stale" : ""}</span></ListItem>
      <ListItem k="Nightly"><span style={{ color: !s.sched.last_ok || s.sched.fail_count ? "var(--warn)" : undefined }}>{s.sched.last_ok ? `last ok ${t(s.sched.last_ok)}` : "no nightly run yet"}{s.sched.fail_count ? ` · ${s.sched.fail_count} failures in a row` : ""}</span></ListItem>
      <ListItem k="Watches">Suunto {s.suunto.connected ? `connected · last push ${t(s.suunto.last_push)}` : "off"} · COROS {s.coros.connected ? `connected · last push ${t(s.coros.last_push)}` : "off"}</ListItem>
      <ListItem k="Backups"><span style={{ color: !s.backup.latest || (s.backup.age_h ?? 0) > 48 ? "var(--warn)" : undefined }}>{s.backup.latest ? `latest ${t(s.backup.latest)} (${Math.round(s.backup.age_h ?? 0)} h ago)` : "no backup yet"} · {s.backup.dir}{s.backup.push ? " · pushed off-box" : ""}</span></ListItem>
      {(s.access.team || s.access.bypass) && <ListItem k="Access"><span style={{ color: s.access.matches === false ? "var(--warn)" : undefined }}>{s.access.bypass ? "proxy bypass on" : `team ${s.access.team}`}{s.access.matches === false ? " · the proxy's team doesn't match" : ""}</span></ListItem>}
    </div>
  </Card>}</Query>;
}
export function Backup() {
  const back = useAction<{ ok: boolean; activities?: { added?: number; pages_fetched?: number } }>("/api/sync?backfill=1", undefined, {
    confirm: { title: "Backfill the full history?", ok: "Backfill", danger: false, intro: "Walks every page back to your first activity.",
      lines: ["It can take longer than the gateway timeout on a long history.", "Usually only needed on a fresh machine or when old history is missing."] },
    done: r => `Backfill done — added ${r.activities?.added ?? 0} activities across ${r.activities?.pages_fetched ?? 0} pages`, fail: "Backfill didn't complete" });
  return <Card label="Backup & export">
    <div className="row">
      <a className="btn" href="/api/backup/db" download>⬇ Database snapshot (.db)</a>
      <a className="btn" href="/api/export/json" download>⬇ Data export (.json)</a>
      <button className="btn" disabled={back.isPending} onClick={() => back.mutate()}>{back.isPending ? "Backfilling…" : "Backfill all history"}</button>
    </div>
    <span className="help">The snapshot is a complete copy of the database — restore by stopping the app and dropping it into ./data as sparinghorse.db.
      The JSON export carries only what can't be rebuilt (races, check-ins, reflections, adjustments, lab markers, plans, settings) — restore into a fresh
      instance with <code>python SparingHorse.py import &lt;file&gt;</code>. API keys are never included in either.</span>
  </Card>;
}
