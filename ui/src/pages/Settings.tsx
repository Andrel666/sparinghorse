// Settings: Athlete (typed fields, away days, calibration), Connections (keys, watches, AI features),
// Console (access, system, links, backup & export). Saved through the server's own validation.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import { postJSON, useSettings, type ApiError, type Field, type SettingsPage } from "../lib/api";
import { Card, PageHead, Pill } from "../components/ui";
import { Tabs } from "../components/layout";
import { useFeedback } from "../components/feedback";
import { Access, AwayDays, Backup, Calibration, Coros, Keys, Suunto, System } from "./settings/Panels";
import { Query } from "./Query";

type Tab = "athlete" | "connections" | "console";
const TABS: [Tab, string][] = [["athlete", "Athlete"], ["connections", "Connections"], ["console", "Console"]];
const GROUPS: Record<Tab, string[]> = { athlete: ["Athlete", "Week", "Display", "Other"], connections: ["AI features"], console: ["Links"] };
const SRC: Record<string, string> = { saved: "saved here", env: "from environment", default: "default" };

function Input({ f, value, onChange }: { f: Field; value: string; onChange: (v: string) => void }) {
  const id = `set-${f.key}`;
  if (f.kind === "flag") return <label className="switch" htmlFor={id}>
    <input id={id} type="checkbox" checked={value === "1"} onChange={e => onChange(e.target.checked ? "1" : "0")} />{value === "1" ? "On" : "Off"}</label>;
  if (f.kind === "choice") return <select id={id} className="input" value={value} onChange={e => onChange(e.target.value)}>
    {f.choices.map(c => <option key={c.v} value={c.v}>{c.t}</option>)}</select>;
  if (f.kind === "text") return <textarea id={id} className="input" value={value} onChange={e => onChange(e.target.value)} />;
  return <input id={id} className="input" style={{ maxWidth: 320 }} value={value} onChange={e => onChange(e.target.value)} />;
}

function Fields({ d, names }: { d: SettingsPage; names: string[] }) {
  const qc = useQueryClient();
  const { toast } = useFeedback();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const n = Object.keys(edits).length;
  const save = useMutation({ mutationFn: () => postJSON("/api/settings", edits),
    onSuccess: () => { setEdits({}); setErrs({}); toast(`${n} setting${n > 1 ? "s" : ""} saved ✓`, "ok"); qc.invalidateQueries(); },
    onError: e => { const b = (e as ApiError).body; setErrs((b?.errors as Record<string, string>) || {}); toast(`Not saved: ${(e as Error).message}`, "bad"); } });
  const groups = d.groups.filter(g => names.includes(g.name) && g.fields.length);
  if (!groups.length) return null;
  return <>
    {groups.map(g => (
      <Card key={g.name} label={g.name}>
        <div className="list">{g.fields.map(f => (
          <div key={f.key} className="field">
            <label htmlFor={`set-${f.key}`}>{f.label} {f.source && <Pill>{SRC[f.source] || f.source}</Pill>}</label>
            <Input f={f} value={edits[f.key] ?? f.value} onChange={v => setEdits(e => (v === f.value ? (({ [f.key]: _, ...r }) => r)(e) : { ...e, [f.key]: v }))} />
            {errs[f.key] && <span style={{ color: "var(--bad)" }}>⚠ {errs[f.key]}</span>}
            <span className="help">{f.help}</span>
          </div>))}</div>
      </Card>))}
    <div className="row" style={{ justifyContent: "flex-end" }}>
      <button className="btn primary" disabled={!n || save.isPending} onClick={() => save.mutate()}>
        {save.isPending ? "Saving…" : n ? `Save ${n} change${n > 1 ? "s" : ""}` : "No changes"}</button>
    </div>
  </>;
}

export function Settings() {
  const loc = useLocation();
  const [tab, setTab] = useState<Tab>(() => (TABS.find(([t]) => loc.hash === `#${t}`)?.[0]) || "athlete");
  return <Query q={useSettings()}>{d => (
    <div className="page" style={{ maxWidth: 980 }}>
      <PageHead title="Settings"><Tabs label="Settings sections" value={tab} options={TABS} onChange={t => { setTab(t); history.replaceState(null, "", `#${t}`); }} /></PageHead>
      <Fields key={tab} d={d} names={GROUPS[tab]} />
      {tab === "athlete" && <><AwayDays /><Calibration /></>}
      {tab === "connections" && <><Keys /><Suunto /><Coros /></>}
      {tab === "console" && <><Access /><System /><Backup /></>}
    </div>
  )}</Query>;
}
