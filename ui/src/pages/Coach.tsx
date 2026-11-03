// Coach: the full-page chat. Answers come from /api/coach (sh_coach.py), inside the engine's picture.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJSON, useCoach, type CoachMsg } from "../lib/api";
import { Card, PageHead } from "../components/ui";
import { Query } from "./Query";

const SUGGEST = ["What should I do today?", "Why is this week's long run so short?", "How should I pace race day?", "Are my easy runs easy enough?"];

export function Coach() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: (message: string) => postJSON<{ ok: boolean; messages: CoachMsg[]; error?: string }>("/api/coach/chat", { message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ui", "coach"] }),
  });
  const clear = useMutation({ mutationFn: () => postJSON("/api/coach/clear"), onSuccess: () => qc.invalidateQueries({ queryKey: ["ui", "coach"] }) });
  const ask = (m: string) => { if (m.trim() && !send.isPending) { send.mutate(m.trim()); setText(""); } };
  return <Query q={useCoach()}>{c => (
    <div className="page" style={{ maxWidth: 860 }}>
      <PageHead title="Coach">{c.messages.length > 0 && <button className="btn" onClick={() => clear.mutate()}>Clear</button>}</PageHead>
      {!c.enabled ? <Card><b>Coach chat is switched off.</b>
          <span>It sends Claude your question and what the engine computed for you. Turn on <b>AI — coach chat</b> in Settings.</span></Card>
       : !c.available ? <Card><b>No AI connection.</b><span>Add a Claude API key, or log in to Claude Code on this machine (<code>claude login</code>).</span></Card>
       : <Card>
          <div className="chat" aria-live="polite">
            {!c.messages.length && <div className="row">{SUGGEST.map(s => <button key={s} className="btn" onClick={() => ask(s)}>{s}</button>)}</div>}
            {c.messages.map(m => <div key={m.id} className={`msg ${m.role}`}>{m.text}</div>)}
            {send.isPending && <div className="msg coach muted">Thinking… (the local Claude can take up to a minute)</div>}
            {send.isError && <div className="msg coach err">{(send.error as Error).message}</div>}
          </div>
          <form className="row" onSubmit={e => { e.preventDefault(); ask(text); }}>
            <textarea className="input" style={{ flex: 1, minHeight: 56, maxWidth: "none" }} value={text} aria-label="Message"
                      placeholder="Ask about your plan, a run, race day…" onChange={e => setText(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } }} />
            <button className="btn primary" type="submit" disabled={send.isPending || !text.trim()}>Send</button>
          </form>
        </Card>}
    </div>
  )}</Query>;
}
