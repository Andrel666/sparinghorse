// The check-in: three choices and a note. Blank stays blank (never a pre-selected "ok").
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postCheckin, type Checkin as C } from "../lib/api";

const LEGS: [C["energy"], string][] = [["good", "Fresh"], ["ok", "OK"], ["heavy", "Heavy"]];
const SLEEP: [C["sleep"], string][] = [["good", "Well"], ["ok", "OK"], ["poor", "Poorly"]];

function Choice<T extends string>({ label, value, options, onChange }:
  { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="row" role="group" aria-label={label}>
      <span className="card-label" style={{ width: "6ch" }}>{label}</span>
      {options.map(([v, t]) => (
        <button key={v} type="button" className="btn" aria-pressed={value === v}
                onClick={() => onChange((value === v ? "" : v) as T)}>{t}</button>
      ))}
    </div>
  );
}

export function Checkin({ initial }: { initial: C | null }) {
  const qc = useQueryClient();
  const [c, set] = useState<C>(initial || { energy: "", sleep: "", note: "", stop_symptom: false });
  const m = useMutation({ mutationFn: postCheckin, onSuccess: () => qc.invalidateQueries({ queryKey: ["ui"] }) });
  return (
    <form className="list" style={{ gap: 10 }} onSubmit={e => { e.preventDefault(); m.mutate(c); }}>
      <Choice label="Legs" value={c.energy} options={LEGS} onChange={energy => set({ ...c, energy })} />
      <Choice label="Sleep" value={c.sleep} options={SLEEP} onChange={sleep => set({ ...c, sleep })} />
      <input className="input" aria-label="Note" placeholder="Anything else? (optional)" value={c.note}
             onChange={e => set({ ...c, note: e.target.value })} />
      <label className="check">
        <input type="checkbox" checked={c.stop_symptom} onChange={e => set({ ...c, stop_symptom: e.target.checked })} />
        I had to stop, or felt chest pain, dizziness or faintness
      </label>
      <div className="row">
        <button type="submit" className="btn primary" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save check-in"}</button>
        {m.isSuccess && <span className="muted">Saved — readiness updated.</span>}
        {m.isError && <span style={{ color: "var(--bad)" }}>{(m.error as Error).message}</span>}
      </div>
    </form>
  );
}
