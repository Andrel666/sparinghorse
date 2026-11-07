// Coach: the chat beside what the coach sees (today's session, readiness, the prediction, the latest run).
import { Link } from "react-router-dom";
import { useCoach, useToday } from "../lib/api";
import { Card, PageHead, Strip } from "../components/ui";
import { Chat, useClearChat } from "../components/Chat";
import { km } from "../lib/format";

function Sees() {
  const t = useToday().data;
  if (!t) return null;
  const s = t.session, r = t.readiness, lr = t.latest_run, p = t.where?.pred;
  return <Strip items={[
    { k: "Today", v: s.kind === "rest" ? "Rest" : `${s.title} ${s.km != null ? km(s.km) : ""}`, to: "/" },
    { k: "Readiness", v: r.headline || r.verdict || "No read", to: "/" },
    ...(p ? [{ k: "Predicted", v: p.hms, tone: p.tone ?? undefined, s: p.goal ? `goal ${p.goal}` : undefined, to: "/plan?view=race" }] : []),
    ...(lr ? [{ k: "Latest run", v: km(lr.km), s: lr.verdict_text ?? undefined, to: `/runs?id=${lr.id}` }] : []),
  ]} />;
}

export function Coach() {
  const c = useCoach().data, clear = useClearChat();
  return (
    <div className="page">
      <PageHead title="Coach">{!!c?.messages.length && <button className="linkish" onClick={() => clear.mutate()}>Clear</button>}</PageHead>
      <div className="grid">
        <Card span={8}><Chat /></Card>
        <Card span={4} label="What the coach sees" tier="group">
          <div className="sees"><Sees /></div>
          <Link to="/plan?tell=1" className="linkish">Tell the horse ›</Link>
        </Card>
      </div>
    </div>);
}
