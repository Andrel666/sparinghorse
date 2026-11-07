// Music: cadence playlists. Playlists (the ramp, the next run, coming up, build / preview, the last run
// read back song by song) and Music settings (Spotify, listening history, matching, library). Every
// number comes from /api/music/*; this page lays it out with Classic's wording.
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api, postJSON } from "../lib/api";
import { useAction } from "../lib/actions";
import { Card, PageHead, Pill, Row, Table } from "../components/ui";
import { Tabs } from "../components/layout";
import { Banner } from "../components/feedback";
import { Keys } from "./settings/Panels";
import { Query } from "./Query";

/* eslint-disable @typescript-eslint/no-explicit-any */
type A = any;
const KIND: Record<string, string> = { easy: "Easy", long: "Long run", long_mp: "Long run + MP", tempo: "Tempo", interval: "Intervals",
  progression: "Progression", race_pace: "Race pace", race: "Race", strides: "Strides" };
const ZONE: Record<string, string> = { easy: "Easy", lt1: "LT1 (easy ceiling)", marathon: "Marathon", threshold: "Threshold", interval: "Interval", tail: "Run home" };
const SRC: Record<string, string> = { neighbours: "similar listeners", cf: "collaborative picks", weekly: "weekly exploration", radio: "LB radio" };
const FLAG: Record<string, string> = { connected: "Spotify connected.", denied: "Spotify authorisation was declined.",
  state_error: "The Spotify return did not match the request that started it: try again.",
  exchange_error: "Spotify refused the code exchange: check the client ID and secret in Settings." };
const fmtDate = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
const fmtPace = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")}`;
const paceOf = (s: A) => (s.minutes && s.km ? fmtPace(s.minutes * 60 / s.km) : "—");
const PRESS_RETIRED_FROM = "2026-10-22";
const get = <T,>(k: string, p: string, enabled = true) => useQuery({ queryKey: ["ui", "music", k], queryFn: () => api<T>(p), enabled });

function Ramp({ st }: { st: A }) {
  const q = get<A>("cadence", "/api/music/cadence");
  return <Query q={q}>{c => {
    const cv = c.curve, rp = c.ramp, rg = rp?.rung;
    if (!cv) return <Card label="Cadence"><span className="muted">No runs with cadence yet.</span></Card>;
    const when = !rp ? "" : rp.phase === "before" ? `starts ${fmtDate(rp.start)}` : rp.phase === "landed" ? `landed ${fmtDate(rp.end)}` : `lands ${fmtDate(rp.end)}`;
    const fit = (ln: A) => ln ? (ln.fitted ? `fitted on ${ln.n} runs` : `${ln.n} runs: median on the pooled slope`) : "—";
    return <Card label={rp ? `The ramp · to ${rp.label} · ${rp.days_to_race} days out` : "The ladder · no race on the road"}>
      {rp ? <>
        <div className="row" style={{ gap: "var(--sp-5)" }}>
          <div><div className="muted t-label">Week</div><b>{rp.phase === "ramp" ? rp.week : rp.phase === "landed" ? rp.weeks : 0}</b> <span className="muted">of {rp.weeks}</span></div>
          <div><div className="muted t-label">{rp.phase === "before" ? "Starts" : "Lands"}</div><b>{fmtDate(rp.phase === "before" ? rp.start : rp.end)}</b></div>
          <div><div className="muted t-label">Last rung</div><b>{!rg ? "—" : rg.held ? "held" : "missed"}</b></div>
        </div>
        <div className="meter"><span style={{ width: `${Math.round(100 * (rp.fraction || 0))}%` }} /></div>
        <span className="muted t-small">{rp.landed_by_legs ? `Landed early: legs on ${rp.landed_by_legs.runs} of ${rp.landed_by_legs.of} runs. ` : ""}{when} ({rp.lead_days} days before the race).{" "}
          {!rg ? "No read-back with a playlist yet: the rung waits for one." : `${fmtDate(rg.date)} ran ${Math.round(rg.ran)} against ${Math.round(rg.target)} over ${rg.songs} playlist song${rg.songs === 1 ? "" : "s"} · ${rg.held ? "the next target can be one step higher." : "the ramp waits there."}`}</span>
      </> : <span className="muted">The recent curve plus the step, per build: a race on the plan would give the lift a calendar.</span>}
      <Table cols={[{ head: "Zone", cell: (r: A) => ZONE[r.zone] || r.zone }, { head: "Pace", cell: r => r.pace, num: true },
        { head: "Target", cell: r => <b>{Math.round(r.spm)}</b>, num: true }, { head: "Set by", cell: r => <span className="muted">{r.why}</span>, wide: true }]}
        rows={c.table || []} keyOf={(r: A) => r.zone} />
      <span className="muted t-small">Comfort ceiling <b>{cv.comfort_max} spm</b> ({cv.comfort_source}) · step {st.settings.step_pct} % on easy segments,
        {" "}{st.constants.work_step} % on work · window ±{Math.round(st.constants.window * 100)} %</span>
      <details><summary>How the targets are set</summary>
        <p className="muted t-small">Steps per minute at each of the plan's paces, from {cv.n_rows} runs: the trained self ({fit(cv.trained)}) and
          the recent line since {cv.recent_from} ({fit(cv.recent)}). Each target is the recent line plus the step, never above the comfort ceiling.</p>
        <Table cols={[{ head: "Zone", cell: (r: A) => ZONE[r.zone] || r.zone }, { head: "Pace", cell: r => r.pace, num: true }, { head: "Trained", cell: r => r.trained, num: true },
          { head: "Recent", cell: r => r.recent, num: true }, { head: "Target", cell: r => <b>{Math.round(r.spm)}</b>, num: true }, { head: "Set by", cell: r => r.why, wide: true }]}
          rows={c.table || []} keyOf={(r: A) => r.zone} />
        {c.recent?.length > 0 && <p className="muted t-small">Last runs: {c.recent.slice(-5).map((r: A) => `${r.date.slice(5)} ${r.pace}/km · ${r.spm}`).join(" · ")}</p>}
      </details>
    </Card>;
  }}</Query>;
}

function Result({ d, write }: { d: A; write: boolean }) {
  if (!d.ok) return <Card label="Playlist" tone="bad"><span>{d.error || "could not build"}</span></Card>;
  const s = d.session || {};
  return <Card label={d.name}>
    <span className="muted">{fmtDate(s.date)} · {KIND[s.kind] || s.kind} {s.km} km · {d.minutes} min · {d.tracks} tracks, {d.filled_min} min · overall target {Math.round(d.target_spm)} spm
      {d.never_run ? ` · ${d.never_run} never run to` : ""}{d.sensor_bias_spm ? ` · legs read +${d.sensor_bias_spm.toFixed(1)} spm over the sensor` : ""}</span>
    {write ? (d.written ? <Banner tone="ok">Written to Spotify: <a href={d.url} target="_blank" rel="noopener noreferrer">open the playlist ↗</a></Banner>
      : <Banner tone="bad">{d.error || "not written"}</Banner>) : <span className="muted">Preview only: nothing was written.</span>}
    {(d.notes || []).map((n: string, i: number) => <span key={i} className="muted t-small">{n}</span>)}
    {(d.segments || []).map((sg: A, i: number) => <div key={i} className="list" style={{ gap: 4 }}>
      <span><b>{sg.label}</b> <span className="muted">{sg.minutes} min · target <b>{Math.round(sg.target_spm)}</b> spm ({sg.target?.why})
        {sg.line ? ` · songs ${sg.line[0] === sg.line[1] ? sg.line[0] : `${sg.line[0]}–${sg.line[1]}`} bpm` : ""} · {sg.filled_min} min filled{sg.fresh != null ? ` · ${sg.fresh} new` : ""}</span></span>
      {sg.tracks?.length ? <ol className="bullets flush">{sg.tracks.map((t: A, j: number) => <li key={j}>{t.title}: {t.artist}
        <span className="muted t-small"> · {Math.round(t.tempo)} bpm{t.hit === "half" ? " ×2" : ""} · {Math.round(t.duration_ms / 60000)}′
          {t.weight ? ` · taste ${t.weight.toFixed(2)}` : ""}{t.follow != null ? ` · legs ${t.follow}` : ""}{t.served ? ` · on ${t.served} recent lists` : ""}</span>
        {t.never_run && <Pill>never run to{t.source ? ` · ${SRC[t.source] || t.source}` : ""}</Pill>}{t.discovered && <Pill>new</Pill>}</li>)}</ol>
        : <span className="muted">No songs in the window.</span>}
    </div>)}
  </Card>;
}

function Sessions() {
  const qc = useQueryClient();
  const q = get<A>("sessions", "/api/music/sessions");
  const [res, setRes] = useState<{ d: A; write: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, write: boolean) => {
    setBusy(key + write); setRes(null);
    const d = await postJSON<A>(write ? "/api/music/build" : "/api/music/preview", { key }).catch(e => ({ ok: false, error: (e as Error).message }));
    setBusy(null); setRes({ d, write });
    if (write && d.written) qc.invalidateQueries({ queryKey: ["ui", "music", "sessions"] });
  };
  return <Query q={q}>{d => {
    if (!d.has_plan) return <Card><span className="muted">No plan yet.</span></Card>;
    if (!d.sessions.length) return <Card><span className="muted">Nothing to play in the next ten days.</span></Card>;
    const next = d.sessions[0], rest = d.sessions.slice(1);
    const btns = (s: A, big = false) => <>
      {s.built && !big && <a href={s.built.url} target="_blank" rel="noopener noreferrer">open ↗</a>}
      <button className="btn" disabled={!!busy} onClick={() => run(s.key, false)}>{busy === s.key + "false" ? "Previewing…" : big ? "Preview the songs first" : "Preview"}</button>
      <button className={`btn${big ? " primary" : ""}`} disabled={!d.has_curve || !!busy} onClick={() => run(s.key, true)}>
        {busy === s.key + "true" ? "Building…" : s.built ? (big ? "Rebuild the playlist" : "Rebuild") : (big ? "Build the playlist" : "Build")}</button></>;
    return <>
      <section className="dayband span-12 music-next" aria-label="Next run">
        <div><span className="card-label">Next run</span>
          <div className="second">{fmtDate(next.date)} · {KIND[next.kind] || next.kind}{next.race ? ` · ${next.note || ""}` : ""}</div>
          <span className="muted">{next.km} km · {next.minutes} min · {paceOf(next)} /km</span>
          <span className="muted t-small">{next.built ? <>Playlist built {String(next.built.built_at || "").slice(0, 10)}: <a href={next.built.url} target="_blank" rel="noopener noreferrer">open in Spotify ↗</a></> : "No playlist yet for this run."}</span></div>
        <div><span className="card-label">Target cadence</span>
          {next.target_spm ? <><div className="hero-v">{Math.round(next.target_spm)} <small className="muted">spm</small></div><span className="muted t-small">{next.why}</span>
            <div className="row">{(next.segs || []).filter((sg: A) => sg.spm).map((sg: A, i: number) => <span key={i} className="flag" title={sg.why}>{String(sg.label).split(": ")[0].toLowerCase()} {Math.round(sg.spm)}</span>)}</div></>
            : <span className="muted">No cadence curve yet.</span>}</div>
        <div className="list" style={{ justifyContent: "center" }}>{btns(next, true)}
          {res && res.d.key === next.key && res.d.ok && <span className="muted">{res.d.tracks} songs{res.d.never_run ? ` · ${res.d.never_run} never run to` : ""}</span>}</div>
      </section>
      <Card label="Coming up">
        {rest.length ? rest.map((x: A) => <Row key={x.key} lead={new Date(`${x.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric" })} main={`${KIND[x.kind] || x.kind}${x.race ? ` · ${x.note || ""}` : ""}`}
            cols={[{ v: `${x.km} km`, w: 8 }, { v: x.target_spm ? `${Math.round(x.target_spm)} spm` : "", w: 8 }]}
            trail={<span className="row">{btns(x)}</span>} />)
          : <span className="muted">Only the next run is on the ten-day road.</span>}
      </Card>
      {res && <Result d={res.d} write={res.write} />}
    </>;
  }}</Query>;
}

function Readback() {
  const runs = get<A>("runs", "/api/music/runs");
  const [id, setId] = useState<number | null>(null);
  const list: A[] = runs.data?.runs || [];
  const cur = list.find(r => r.id === id) || list.find(r => r.readback_at) || list.find(r => r.playlist) || list[0];
  const rb = get<A>(`rb-${cur?.id}`, `/api/music/readback/${cur?.id}`, !!cur?.readback_at);
  const read = useAction<A, number>("/api/music/readback", run_id => ({ run_id }), { done: () => "Read back", fail: "Could not read the run" });
  const verdict = useAction<A, { spotify_id: string; verdict: "keep" | "never" }>("/api/music/verdict", v => ({ run_id: cur?.id, ...v }), { fail: "Could not save the verdict" });
  if (!cur) return <Card label="Last run, read back"><span className="muted">No runs yet.</span></Card>;
  const r: A = read.data && read.variables === cur.id ? read.data : rb.data;
  const cell = (s: A) => {
    const keep = <button className="linkish" onClick={() => verdict.mutate({ spotify_id: s.spotify_id, verdict: "keep" })}>keep</button>;
    const badge = s.manual === "keep" ? <><b>kept</b> <span className="muted">(yours)</span></>
      : s.manual === "never" ? <><b>never again</b> <span className="muted">(yours)</span> {keep}</>
      : s.run_rating === "never" ? <><b>never again</b> {keep}</>
      : s.run_rating === "break" ? <><b>break{s.breaks > 1 ? ` ×${s.breaks}` : ""}</b> <span className="muted">at {(s.break_at || []).map(fmtPace).join(", ")}</span></>
      : s.skipped ? <><b>set aside</b> <span className="muted">(skipped)</span> {keep}</> : s.run_rating ? <><b>{s.run_rating}</b> <span className="muted">(older protocol)</span></> : null;
    const hide = s.manual === "never" || (s.run_rating === "never" && s.manual !== "keep");
    return <>{badge}{!hide && <> <button className="linkish" onClick={() => verdict.mutate({ spotify_id: s.spotify_id, verdict: "never" })}>leave it out</button></>}</>;
  };
  const ran = r?.ok ? r.songs.filter((s: A) => s.spm).map((s: A) => s.spm) : [];
  const mean = ran.length ? Math.round(ran.reduce((a: number, b: number) => a + b, 0) / ran.length) : null;
  return <Card label="Last run, read back" aside={<span className="row">
      <select className="input" style={{ width: "auto" }} value={cur.id} onChange={e => setId(Number(e.target.value))} aria-label="Run">
        {list.map(x => <option key={x.id} value={x.id}>{fmtDate(x.date)} · {x.km} km · {x.playlist || "no playlist"}{x.readback_at ? " · read" : ""}</option>)}</select>
      <button className="btn" disabled={read.isPending} onClick={() => read.mutate(cur.id)}>{read.isPending ? "Reading…" : cur.readback_at ? "Read again" : "Read back"}</button></span>}>
    <span className="muted">{fmtDate(cur.date)} · {cur.km} km · {cur.minutes} min{cur.playlist ? ` · ${cur.playlist}` : " · no playlist built"}</span>
    {!r ? <span className="muted">{cur.readback_at ? "Loading the read-back…" : "Not read yet: the nightly reads the day's run once its plays are in, or press Read back."}</span>
      : !r.ok ? <span style={{ color: "var(--bad)" }}>{r.error || "could not read the run"}</span> : <>
      <div className="row" style={{ gap: "var(--sp-5)" }}>
        <div><div className="muted t-label">Legs followed</div><b>{r.followed?.songs != null ? `${r.followed.entrained} of ${r.followed.songs} songs` : "—"}</b>{r.sensor_bias_spm ? <span className="muted"> legs +{r.sensor_bias_spm.toFixed(1)} spm</span> : null}</div>
        <div><div className="muted t-label">Breaks</div><b>{r.followed?.breaks || 0}</b></div>
        <div><div className="muted t-label">Set aside</div><b>{r.set_aside || 0}</b></div>
        <div><div className="muted t-label">Cadence</div><b>{mean ?? "—"}</b>{r.target_spm ? <span className="muted"> vs {Math.round(r.target_spm)} asked</span> : null}</div>
      </div>
      <span className="muted t-small">Read from the {r.stream_source === "fit" ? (r.date >= PRESS_RETIRED_FROM ? "FIT file (1 Hz)" : "FIT file (1 Hz, lap presses)") : "summary stream"}
        {r.computed_at ? ` on ${String(r.computed_at).slice(0, 16).replace("T", " ")}` : ""}{r.skipped ? ` · ${r.skipped} skipped` : ""}{r.off_playlist ? ` · ${r.off_playlist} off the playlist` : ""}
        {r.inferred ? ` · ${r.inferred} inferred` : ""}{r.clock_shift_s ? ` · clock re-anchored by ${r.clock_shift_s} s` : ""}
        {(r.presses || []).filter((p: A) => !p.spotify_id).length ? ` · ${(r.presses || []).filter((p: A) => !p.spotify_id).length} presses outside any song` : ""}</span>
      <Table cols={[{ head: "At", cell: (s: A) => `${Math.round(s.start_s / 60)}′`, num: true },
        { head: "Song", cell: s => <>{s.title} <span className="muted">— {s.artist}</span>{s.skipped && <Pill tone="warn">skipped</Pill>}{s.inferred && <Pill>from the list</Pill>}
          {s.in_playlist === false && <Pill>off the playlist</Pill>}{s.segment && <span className="muted"> · {s.segment}</span>}</>, wide: true },
        { head: "Read", cell: s => `${Math.round(s.read_s / 60)}′`, num: true },
        { head: "Cadence", cell: s => <><b>{Math.round(s.spm)}</b>{s.work_s != null && !s.jogs_only ? <span className="muted"> reps {Math.round(s.work_s / 60)}′</span> : null}
          {s.vs_target != null ? <span className="muted"> {s.vs_target > 0 ? "+" : ""}{Math.round(s.vs_target)}</span> : null}</>, num: true },
        { head: "Pace", cell: s => (s.pace_sec ? fmtPace(s.pace_sec) : "—"), num: true },
        { head: "Legs", cell: s => s.jogs_only ? <span className="muted">on the jogs</span> : s.entrained == null ? <span className="muted">no tempo</span>
          : s.entrained ? <Pill tone="ok">followed</Pill> : <span className="muted">{s.delta_pct > 0 ? "+" : ""}{(100 * s.delta_pct).toFixed(1)}%{s.dips ? ` · ${s.dips} dips` : ""}</span> },
        { head: "Verdict", cell: cell }]} rows={r.songs} keyOf={(s: A) => `${s.start_s}-${s.spotify_id}`} />
    </>}
    <span className="muted t-small">Which song was playing when, and the cadence the legs held through it, seams excluded.
      {cur.date >= PRESS_RETIRED_FROM ? " Skip a song on the headset to set it aside for that kind of segment." : ""}</span>
  </Card>;
}

function MusicSettings() {
  const qc = useQueryClient();
  const q = get<A>("status", "/api/music/status");
  const [f, setF] = useState<A | null>(null);
  const job = get<A>("job", "/api/music/library/status", !!q.data?.library?.job?.running);
  useEffect(() => { if (q.data && !f) setF({ ...q.data.settings }); }, [q.data, f]);
  useEffect(() => {
    if (!job.data?.library?.job?.running) { if (job.data) qc.invalidateQueries({ queryKey: ["ui", "music", "status"] }); return; }
    const t = setTimeout(() => job.refetch(), 2000); return () => clearTimeout(t);
  }, [job.data, job, qc]);
  const off = useAction<A>("/api/music/spotify/disconnect", undefined, { done: () => "Spotify disconnected" });
  const pull = useAction<A>("/api/music/played/pull", undefined, { done: d => `${d.new} new plays stored`, fail: "Could not pull" });
  const refresh = useAction<A>("/api/music/library/refresh", undefined, { done: () => "Refreshing the library…", fail: "Could not start" });
  const save = useAction<A>("/api/music/settings", () => f, { done: () => "Saved ✓", fail: "Could not save" });
  return <Query q={q}>{st => {
    const sp = st.spotify, lib = st.library, lbl = lib.listenbrainz || {}, s = f || st.settings, j = job.data?.library?.job || lib.job;
    const bands = Object.entries(lib.tempo_bands || {}) as [string, number][], mx = Math.max(1, ...bands.map(b => b[1]));
    const srcRows = Object.entries(st.listenbrainz?.sources || {}).filter(([, v]: A) => v.tracks) as [string, A][];
    const jobLine = !j ? "" : j.running ? `refreshing: ${j.step}${j.total ? ` ${j.done}/${j.total}` : ""}` : j.error ? `last refresh failed: ${j.error}`
      : j.summary ? `last refresh: ${j.summary.spotify_saved} saved · ${j.summary.spotify_top} top · ${j.summary.spotify_playlisted} in ${j.summary.playlists} playlists · ${j.summary.lfm_tracks} scrobbled · ${j.summary.resolved} matched · ${j.summary.unresolved} unmatched` : "";
    const ok = sp.connected && !sp.needs_reconnect;
    return <>
      <Card label="Spotify" tone={ok ? "ok" : undefined}>
        <span>{sp.connected ? (sp.needs_reconnect ? "connected · play history not granted" : `connected${sp.user ? ` · ${sp.user}` : ""}`) : sp.configured ? "not connected" : "needs the app keys below"}</span>
        <span className="muted t-small">{st.played.count} plays stored{st.played.last ? ` · pulled ${String(st.played.last).slice(11, 16)}` : ""} · Spotify keeps only the last 50, so the history is pulled when the page opens and every night</span>
        <div className="row">
          {ok ? <button className="btn" onClick={() => off.mutate()}>Disconnect</button>
            : <a className="btn primary" aria-disabled={!sp.configured} href={sp.configured ? "/api/music/spotify/connect" : undefined}>{sp.connected ? "Reconnect Spotify" : "Connect Spotify"}</a>}
          <button className="btn" disabled={!ok || pull.isPending} onClick={() => pull.mutate()}>Pull plays now</button>
        </div>
        {sp.needs_reconnect && <span className="muted">This version also reads the play history, so each run can be read back song by song. Reconnect once to grant it.</span>}
        <span className="help">Redirect URI to register with Spotify: <code>{st.redirect_uri}</code></span>
      </Card>
      {f && <Card label="Listening history and matching">
        <div className="field"><label htmlFor="m-lfm">last.fm user <Pill tone={st.lastfm?.key ? "ok" : "warn"}>{st.lastfm?.key ? "key set" : "key missing"}</Pill></label>
          <input id="m-lfm" className="input" value={s.lastfm_user || ""} placeholder="username" onChange={e => setF({ ...s, lastfm_user: e.target.value })} /></div>
        <div className="field"><label htmlFor="m-lb">ListenBrainz user <Pill tone={st.listenbrainz?.token ? "ok" : "warn"}>{st.listenbrainz?.token ? "token set" : "no token: radio off"}</Pill></label>
          <input id="m-lb" className="input" value={s.listenbrainz_user || ""} placeholder="username (empty = off)" onChange={e => setF({ ...s, listenbrainz_user: e.target.value })} />
          <span className="help">last.fm weighs the songs you actually play; ListenBrainz brings in what similar listeners run to.</span></div>
        <div className="field"><label htmlFor="m-max">Comfort ceiling (spm)</label>
          <input id="m-max" type="number" min={120} max={220} className="input" style={{ width: "14ch" }} value={s.max_spm ?? ""} placeholder="observed p90" onChange={e => setF({ ...s, max_spm: e.target.value })} />
          <span className="help">The cadence no target passes.</span></div>
        <div className="field"><label htmlFor="m-step">Step (%)</label>
          <input id="m-step" type="number" min={0} max={st.constants.max_step} step={0.5} className="input" style={{ width: "10ch" }} value={s.step_pct ?? ""} onChange={e => setF({ ...s, step_pct: e.target.value })} />
          <span className="help">Over the recent curve on easy segments · work segments use {st.constants.work_step} %.</span></div>
        <div className="field"><label htmlFor="m-lift">Target lift (spm)</label>
          <input id="m-lift" type="number" min={0} max={5} step={0.5} className="input" style={{ width: "10ch" }} value={s.lift_spm ?? ""} onChange={e => setF({ ...s, lift_spm: e.target.value })} />
          <span className="help">Added to every target, under the comfort ceiling.</span></div>
        <label className="check"><input type="checkbox" checked={s.half_time === "1"} onChange={e => setF({ ...s, half_time: e.target.checked ? "1" : "0" })} /> Allow half-time (one beat per stride)</label>
        <label className="check"><input type="checkbox" checked={s.discovery === "1"} onChange={e => setF({ ...s, discovery: e.target.checked ? "1" : "0" })} /> ReccoBeats discovery when a window runs dry</label>
        <div className="row" style={{ justifyContent: "flex-end" }}><button className="btn primary" disabled={save.isPending} onClick={() => save.mutate()}>Save</button></div>
      </Card>}
      <Keys music />
      <Card label="Library" aside={<button className="btn" disabled={j?.running || refresh.isPending} onClick={() => refresh.mutate(undefined, { onSuccess: () => job.refetch() })}>Refresh library</button>}>
        <div className="row" style={{ gap: "var(--sp-5)" }}>
          {[[lib.tracks, "tracks"], [lib.with_features, "with tempo"], [lib.with_taste, "weighted by plays"],
            ...(s.listenbrainz_user ? [[lbl.resolved || 0, "from ListenBrainz"], [lbl.never_run || 0, "never run to"]] : [])].map(([v, l]) =>
            <div key={l as string}><div className="stat-value sm num">{v as number}</div><span className="muted">{l as string}</span></div>)}
        </div>
        {jobLine && <span className="muted">{jobLine}</span>}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${bands.length || 1}, 1fr)`, gap: 4, alignItems: "end", height: 48 }}>
          {bands.map(([k, v]) => <div key={k} title={`${k} bpm: ${v} tracks`} style={{ height: `${Math.max(4, (v / mx) * 100)}%`, background: "var(--ph-base)" }} />)}</div>
        <span className="muted t-label">Tracks per 5-bpm band, 150–189{lib.unresolved_scrobbles ? ` · ${lib.unresolved_scrobbles} scrobbles unmatched` : ""}{lib.feature_misses ? ` · ${lib.feature_misses} without a tempo` : ""}</span>
        {srcRows.length > 0 && <Table cols={[{ head: "Source", cell: ([k]: [string, A]) => SRC[k] || k }, { head: "Tempo/tracks", cell: ([, v]) => `${v.with_tempo}/${v.tracks}`, num: true },
          { head: "Listed", cell: ([, v]) => v.served, num: true }, { head: "Read", cell: ([, v]) => v.read, num: true },
          { head: "Followed", cell: ([, v]) => v.followed_pct != null ? `${v.followed_pct}%` : "—", num: true }, { head: "Legs", cell: ([, v]) => v.legs ?? "—", num: true }]}
          rows={srcRows} keyOf={([k]) => k} />}
      </Card>
    </>;
  }}</Query>;
}

export function Music() {
  const [params, setParams] = useSearchParams();
  const flag = params.get("spotify");
  const [tab, setTab] = useState<"play" | "settings">(flag ? "settings" : "play");
  useEffect(() => { if (flag) { params.delete("spotify"); setParams(params, { replace: true }); } }, [flag, params, setParams]);
  const st = get<A>("status", "/api/music/status");
  return <div className="page">
    <PageHead title="Music"><Tabs label="Music sections" value={tab} options={[["play", "Playlists"], ["settings", "Music settings"]]} onChange={setTab} /></PageHead>
    {flag && FLAG[flag] && <Banner tone={flag === "connected" ? "ok" : "warn"}>{FLAG[flag]}</Banner>}
    {st.data && st.data.spotify.connected && <span className="muted">{[st.data.spotify.connected ? (st.data.spotify.needs_reconnect ? "Spotify needs a reconnect" : `Spotify connected${st.data.spotify.user ? ` · ${st.data.spotify.user}` : ""}`) : "Spotify not connected",
      `${st.data.library.with_features} tracks with tempo`, st.data.settings.listenbrainz_user ? `${st.data.library.listenbrainz?.never_run || 0} never run to` : "",
      st.data.played.last ? `plays pulled ${String(st.data.played.last).slice(11, 16)}` : ""].filter(Boolean).join(" · ")}</span>}
    {tab === "play" && st.data && !st.data.spotify.connected && <Banner tone="warn"
      action={<button type="button" className="btn primary" onClick={() => setTab("settings")}>Connect Spotify</button>}>
      <b>Spotify isn't connected.</b> Playlists need it.</Banner>}
    {tab === "play" ? (st.data ? <div className="grid"><Sessions /><Readback /><Ramp st={st.data} /></div> : <Query q={st}>{() => null}</Query>) : <MusicSettings />}
  </div>;
}
