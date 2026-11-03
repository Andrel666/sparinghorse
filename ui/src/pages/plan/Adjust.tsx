// The qualitative adjustment: the active one (with its effect, window and clear), and "Tell the horse"
// — free text the server reads as either a note on today's run or a proposal to ease the plan.
import { useState } from "react";
import { useAction } from "../../lib/actions";
import { Banner } from "../../components/feedback";
import { Card } from "../../components/ui";
import type { Diff } from "./Races";

export interface Adjustment { medical: boolean; effect: string; note: string; from: string; until: string; summary: string | null; clamp: string | null }
interface Proposal { ok: boolean; kind?: "log" | "adjust"; reply?: string; note?: string; directive?: unknown; effect?: string; medical_flag?: boolean;
  applies_from?: string; applies_until?: string; summary?: string; clamp?: string; error?: string }

export function AdjustmentBanner({ a, onDiff }: { a: Adjustment; onDiff: (d?: Diff) => void }) {
  const clear = useAction<{ ok: boolean; diff?: Diff }>("/api/adjustment/clear", undefined, { done: r => { onDiff(r.diff); return "Adjustment cleared"; } });
  return (
    <Banner tone={a.medical ? "bad" : "warn"} action={<button type="button" className="btn" onClick={() => clear.mutate()}>Clear adjustment</button>}>
      <b>{a.medical ? "⚠ Medical flag" : "Active adjustment"} — {a.effect}</b>
      <div className="muted">“{a.note}” · {a.from} → {a.until}{a.summary ? ` · ${a.summary}` : ""}</div>
      {a.clamp && <div className="muted">Engine clamp: {a.clamp}</div>}
      {a.medical && <div className="muted">Sparing Horse tracks and flags — it never diagnoses. Clear this once your doctor signs off.</div>}
    </Banner>);
}

export function TellTheHorse({ enabled, onDiff }: { enabled: boolean; onDiff: (d?: Diff) => void }) {
  const [text, setText] = useState("");
  const [prop, setProp] = useState<Proposal | null>(null);
  const propose = useAction<Proposal, string>("/api/ui/adjust/propose", t => ({ text: t }), { refresh: false,
    done: r => { setProp(r); return null; }, fail: "Could not read that" });
  const logNote = useAction<{ ok: boolean }, string>("/api/log/note", n => ({ note: n }), { done: () => "📓 Logged to today's run · plan unchanged" });
  const apply = useAction<{ ok: boolean; diff?: Diff }, Proposal>("/api/adjustment/apply", p => ({ note: p.note, directive: p.directive }),
    { done: r => { setProp(null); setText(""); onDiff(r.diff); return "Adjustment applied"; } });
  if (prop?.ok && prop.kind === "log" && !logNote.isPending && !logNote.isSuccess) logNote.mutate(prop.note || text);
  return (
    <Card label="Tell the horse">
      <span className="muted" style={{ fontSize: "var(--fs-small)" }}>
        Something about a run you've done is logged on it. Something ahead (a niggle, a trip, a bad week) proposes easing the plan — it only ever eases.</span>
      <form className="row" onSubmit={e => { e.preventDefault(); if (text.trim()) { setProp(null); logNote.reset(); propose.mutate(text.trim()); } }}>
        <input className="input" style={{ flex: 1, maxWidth: "none" }} value={text} disabled={!enabled} onChange={e => setText(e.target.value)}
               placeholder={enabled ? "e.g. calf tight since Sunday, or: travelling Thursday to Sunday" : "Needs an AI connection and AI judgment switched on in Settings"} aria-label="Tell the horse" />
        <button type="submit" className="btn primary" disabled={!enabled || propose.isPending || !text.trim()}>{propose.isPending ? "Thinking…" : "💬 Tell"}</button>
      </form>
      {prop?.ok && prop.kind === "log" && <span>{prop.reply}</span>}
      {prop?.ok && prop.kind !== "log" && <div className="list" style={{ gap: 6 }}>
        <span>{prop.reply}</span>
        {prop.effect && <b>{prop.medical_flag ? "⚠ " : ""}{prop.effect}</b>}
        <span className="muted">{prop.applies_from} → {prop.applies_until}{prop.summary ? ` · ${prop.summary}` : ""}{prop.clamp ? ` · engine clamp: ${prop.clamp}` : ""}</span>
        <div className="row"><button type="button" className="btn primary" disabled={apply.isPending} onClick={() => apply.mutate(prop)}>Apply</button>
          <button type="button" className="btn" onClick={() => setProp(null)}>Dismiss</button></div>
      </div>}
    </Card>);
}
