// The coach chat, shared by the Coach page and the Ask drawer (?ask=1, on every page). Answers come from
// /api/coach (sh_coach.py), inside the engine's picture of the athlete.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { postJSON, useCoach, type CoachMsg } from "../lib/api";
import { Query } from "../pages/Query";

const SUGGEST = ["What should I do today?", "Why is this week's long run so short?", "How should I pace race day?", "Are my easy runs easy enough?"];

export function Chat() {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const send = useMutation({
    mutationFn: (message: string) => postJSON<{ ok: boolean; messages: CoachMsg[]; error?: string }>("/api/coach/chat", { message }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ui", "coach"] }),
  });
  const ask = (m: string) => { if (m.trim() && !send.isPending) { send.mutate(m.trim()); setText(""); } };
  return <Query q={useCoach()}>{c => !c.enabled
    ? <p><b>The coach is off.</b> Turn on AI coach chat in <Link to="/settings#connections">Settings</Link>.</p>
    : !c.available ? <p><b>No AI connection.</b> Add a Claude API key in <Link to="/settings#connections">Settings</Link>.</p>
    : <div className="chat-wrap">
        <div className="chat" aria-live="polite">
          {!c.messages.length && <div className="suggest">{SUGGEST.map(s => <button key={s} type="button" className="r hit" onClick={() => ask(s)}>
            <span className="r-main"><span className="r-title">{s}</span></span><span className="r-trail" aria-hidden="true">›</span></button>)}</div>}
          {c.messages.map(m => <div key={m.id} className={`msg ${m.role}`}>{m.text}</div>)}
          {send.isPending && <div className="msg coach muted">Thinking…</div>}
          {send.isError && <div className="msg coach err">{(send.error as Error).message} <button type="button" className="linkish" onClick={() => send.reset()}>Dismiss</button></div>}
        </div>
        <form className="composer" onSubmit={e => { e.preventDefault(); ask(text); }}>
          <textarea className="input" value={text} aria-label="Message" placeholder="Ask about your plan, a run, race day"
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(text); } }} />
          <button className="btn primary" type="submit" disabled={send.isPending || !text.trim()}>Send</button>
        </form>
      </div>}</Query>;
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: () => postJSON("/api/coach/clear"), onSuccess: () => qc.invalidateQueries({ queryKey: ["ui", "coach"] }) });
}
