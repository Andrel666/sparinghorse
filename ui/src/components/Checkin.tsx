// The check-in: two three-way choices, an optional note, the stop-symptom flag. Blank stays blank
// (never a pre-selected "ok").
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postCheckin, type Checkin as C } from "../lib/api";

const LEGS: [C["energy"], string][] = [["good", "Fresh"], ["ok", "OK"], ["heavy", "Heavy"]];
const SLEEP: [C["sleep"], string][] = [["good", "Well"], ["ok", "OK"], ["poor", "Poorly"]];

function Choice<T extends string>({ label, value, options, onChange }:
  { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="row" role="group" aria-label={label}>
      <span className="muted" style={{ width: "5ch", fontSize: "var(--fs-small)" }}>{label}</span>
      <span className="seg">{options.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange((value === v ? "" : v) as T)}>{t}</button>
      ))}</span>
    </div>
  );
}

const WORD = { energy: { good: "legs fresh", ok: "legs OK", heavy: "legs heavy" }, sleep: { good: "slept well", ok: "slept OK", poor: "slept poorly" } } as const;

/** The saved check-in as one line ("✓ Checked in 07:12 · legs fresh"), or null when there is none. */
export function checkinLine(c: C | null, savedAt?: string | null): string | null {
  if (!c || !savedAt) return null;
  const t = new Date(savedAt);
  const at = Number.isNaN(t.getTime()) ? "" : ` ${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const bits = [c.energy && WORD.energy[c.energy], c.sleep && WORD.sleep[c.sleep], c.note && `“${c.note}”`,
                c.stop_symptom && "had to stop"].filter(Boolean);
  return `Checked in${at}${bits.length ? ` · ${bits.join(" · ")}` : ""}`;
}

/** The check-in form. It lives in a drawer opened from Today; `onSaved` closes it. */
export function Checkin({ initial, onSaved }: { initial: C | null; onSaved?: () => void }) {
  const qc = useQueryClient();
  const [c, set] = useState<C>(initial || { energy: "", sleep: "", note: "", stop_symptom: false });
  const [note, showNote] = useState(!!c.note);
  const m = useMutation({ mutationFn: postCheckin, onSuccess: () => { qc.invalidateQueries({ queryKey: ["ui"] }); onSaved?.(); } });
  return (
    <form className="list" style={{ gap: 10 }} onSubmit={e => { e.preventDefault(); m.mutate(c); }}>
      <Choice label="Legs" value={c.energy} options={LEGS} onChange={energy => set({ ...c, energy })} />
      <Choice label="Sleep" value={c.sleep} options={SLEEP} onChange={sleep => set({ ...c, sleep })} />
      {note ? <input className="input" aria-label="Note" placeholder="e.g. calf a bit tight" value={c.note} autoFocus
                     onChange={e => set({ ...c, note: e.target.value })} />
            : <button type="button" className="linkish" onClick={() => showNote(true)}>+ Add a note</button>}
      <label className="check">
        <input type="checkbox" checked={c.stop_symptom} onChange={e => set({ ...c, stop_symptom: e.target.checked })} />
        Had to stop, or chest pain, dizziness or faintness
      </label>
      <div className="row">
        <button type="submit" className="btn primary" disabled={m.isPending}>{m.isPending ? "Saving…" : "Save"}</button>
        {m.isError && <span style={{ color: "var(--bad)" }}>Not saved: {(m.error as Error).message}. Try again.</span>}
      </div>
    </form>
  );
}
