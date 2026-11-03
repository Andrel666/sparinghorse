// Settings: typed fields (pickers, switches) saved through the server's own validation, and calibration.
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, postJSON, useSettings, type Field } from "../lib/api";
import { Card, PageHead } from "../components/ui";
import { CLASSIC } from "../lib/pages";
import { Query } from "./Query";

function Input({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const id = `set-${f.key}`;
  if (f.kind === "flag") return <label className="switch" htmlFor={id}>
    <input id={id} type="checkbox" checked={value === "1"} onChange={e => onChange(e.target.checked ? "1" : "0")} />{value === "1" ? "On" : "Off"}</label>;
  if (f.kind === "choice") return <select id={id} className="input" value={value} onChange={e => onChange(e.target.value)}>
    {f.choices.map(c => <option key={c.v} value={c.v}>{c.t}</option>)}</select>;
  if (f.kind === "text") return <textarea id={id} className="input" value={value} onChange={e => onChange(e.target.value)} />;
  return <input id={id} className="input" style={{ maxWidth: 320 }} value={value} onChange={e => onChange(e.target.value)} />;
}

const CAL_NAMES: Record<string, string> = { trimp_scale: "Load of an easy minute (× default)",
  BIO_EQ_STEP: "Biggest single run vs last 30 days", CTL_RAMP_MAX: "Fitness gain allowed per week",
  ACWR_HARD: "Load-ratio ceiling", ACWR_SOFT: "Load-ratio planning target" };
interface Cal { ok: boolean; in_force: Record<string, number>; proposal: null | { approved: boolean;
  params: { key: string; default: number; value: number; status: string; basis: string }[] } }
function Calibration() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ui", "cal"], queryFn: () => api<Cal>("/api/calibration") });
  const act = useMutation({ mutationFn: (a: string) => postJSON(`/api/calibration/${a}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["ui"] }) });
  return <Query q={q}>{c => (
    <Card label="Calibrate to my history">
      <span className="muted">Re-fits the engine's load and safety numbers to your runs and injury history. Nothing changes until you approve.</span>
      {c.proposal && <div className="table-wrap"><table className="steps">
        <thead><tr><th>Number</th><th>Default</th><th>Fitted</th><th>Status</th></tr></thead>
        <tbody>{c.proposal.params.map(p => <tr key={p.key} title={p.basis}><td>{CAL_NAMES[p.key] || p.key}</td><td className="num">{p.default}</td>
          <td className="num">{p.value}</td><td>{p.status}</td></tr>)}</tbody></table></div>}
      <div className="row">
        <button className="btn" onClick={() => act.mutate("fit")} disabled={act.isPending}>Fit</button>
        <button className="btn primary" onClick={() => act.mutate("approve")} disabled={act.isPending || !c.proposal || c.proposal.approved}>Approve</button>
        <button className="btn" onClick={() => act.mutate("revert")} disabled={act.isPending || !Object.keys(c.in_force).length}>Revert to defaults</button>
        {Object.keys(c.in_force).length > 0 && <span className="muted">In force: {Object.entries(c.in_force).map(([k, v]) => `${CAL_NAMES[k] || k} ${v}`).join(", ")}</span>}
      </div>
      {act.isError && <span style={{ color: "var(--bad)" }}>{(act.error as Error).message}</span>}
    </Card>)}</Query>;
}

export function Settings() {
  const qc = useQueryClient();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: () => postJSON("/api/settings", edits),
    onSuccess: () => { setEdits({}); qc.invalidateQueries({ queryKey: ["ui"] }); } });
  return <Query q={useSettings()}>{d => (
    <div className="page" style={{ maxWidth: 980 }}>
      <PageHead title="Settings">
        <a className="btn" href={`${CLASSIC}/`}>Keys, connections, music (Classic)</a>
        <button className="btn primary" disabled={!Object.keys(edits).length || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : Object.keys(edits).length ? `Save ${Object.keys(edits).length} change${Object.keys(edits).length > 1 ? "s" : ""}` : "Saved"}</button>
      </PageHead>
      {save.isError && <Card tone="bad"><span>{(save.error as Error).message}</span></Card>}
      {d.groups.map(g => (
        <Card key={g.name} label={g.name}>
          <div className="list">{g.fields.map(f => (
            <div key={f.key} className="field">
              <label htmlFor={`set-${f.key}`}>{f.label}</label>
              <Input f={f} value={edits[f.key] ?? f.value} onChange={v => setEdits(e => (v === f.value ? (({ [f.key]: _, ...r }) => r)(e) : { ...e, [f.key]: v }))} />
              <span className="help">{f.help}</span>
            </div>))}</div>
        </Card>))}
      <Calibration />
    </div>
  )}</Query>;
}
