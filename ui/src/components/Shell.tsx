// The app frame: the four lenses (Now, Road, Goal, Log) as the top bar on desktop and the tab bar on phones; Ask (the
// coach chat, a drawer over any page) on the bar and as the phone's fifth tab; You (Music, Settings) at the bar's
// right end and on the phone's top row. All built from PAGES.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate, useNavigationType, useSearchParams, type Location } from "react-router-dom";
import { Drawer } from "./layout";
import { Chat, useClearChat } from "./Chat";
import { BackCtx, type Back } from "../lib/trail";
import { PAGES, lensOf } from "../lib/pages";
import { Icon } from "./Icon";
import { useCoach, useShell } from "../lib/api";
import { TopBar } from "./Frame";

// a lens is lit on its own path and on the deeper pages that belong to it (Fitness and Body light Goal)
const lit = (path: string, here: string) => lensOf(here) === path;

const ROOT = { root: true };

/** What the chat's first suggestions are about: the page it was opened over. */
function topicOf(path: string, q: URLSearchParams): "today" | "run" | "road" | "goal" | "other" {
  if ((path === "/log" && q.get("id")) || q.get("q")?.startsWith("About my run")) return "run";
  return path === "/" ? "today" : path === "/road" ? "road" : path === "/goal" || path === "/fitness" ? "goal" : path === "/log" ? "run" : "other";
}

/** The in-app history since the last tab/sidebar click, and the nearest entry on another page. */
function useTrail(loc: Location): Back | null {
  const nav = useNavigationType();
  const stack = useRef<Location[]>([]), prev = useRef<Location | null>(null);
  const [back, setBack] = useState<Back | null>(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = loc;
    if (!p || p.key === loc.key) return;
    if (nav === "PUSH") {
      if ((loc.state as { root?: boolean } | null)?.root) stack.current = []; else stack.current.push(p);
    } else if (nav === "POP") stack.current.pop();
    const s = stack.current;
    let i = s.length - 1;
    while (i >= 0 && s[i].pathname === loc.pathname) i--;
    const page = i >= 0 ? PAGES.find(x => x.path === s[i].pathname) : undefined;
    setBack(page ? { label: page.label, steps: s.length - i } : null);
  }, [loc, nav]);
  return back;
}

export function Shell({ children }: { children: ReactNode }) {
  const shell = useShell();
  const loc = useLocation();
  const lenses = PAGES.filter(p => p.tab), you = PAGES.filter(p => p.you);
  const cls = (base: string, path: string) => base + (lit(path, loc.pathname) ? " active" : "");
  const back = useTrail(loc), go = useNavigate();
  const [params, setParams] = useSearchParams();
  const asking = params.get("ask") === "1";            // the Ask drawer: the coach chat over any page
  const setAsk = (on: boolean) => setParams(p => { const n = new URLSearchParams(p); if (on) n.set("ask", "1"); else { n.delete("ask"); n.delete("q"); } return n; });
  const coach = useCoach(), clear = useClearChat();
  return (
    <div className="shell">
      <header className="nav" aria-label="Sparing Horse">
        <div className="nav-brand">Sparing Horse</div>
        <nav className="nav-links" aria-label="Lenses">
          {lenses.map(p => <NavLink key={p.path} to={p.path} end className={() => cls("nav-link", p.path)} state={ROOT}>{p.label}</NavLink>)}
        </nav>
        <div className="nav-spacer" />
        <button type="button" className="btn ask-btn" aria-expanded={asking} onClick={() => setAsk(true)}>
          <Icon name="chat" />Ask</button>
        <nav className="nav-links nav-you" aria-label="You">
          {you.map(p => <NavLink key={p.path} to={p.path} end className={() => cls("nav-link", p.path)} state={ROOT}>{p.label}</NavLink>)}
        </nav>
        {shell.data && <TopBar s={shell.data} />}
      </header>
      <main className="main">
        {back && <div className="backbar"><button type="button" className="back-link" onClick={() => go(-back.steps)}>‹ {back.label}</button></div>}
        <BackCtx.Provider value={back}>{children}</BackCtx.Provider></main>
      <Drawer title="Coach" open={asking} onClose={() => setAsk(false)}>
        <p className="muted t-small">It sees your plan, today's session and readiness, your runs and the prediction.
          {!!coach.data?.messages.length && <> <button type="button" className="linkish" onClick={() => clear.mutate()}>Clear the chat</button></>}</p>
        <Chat topic={topicOf(loc.pathname, params)} draft={params.get("q") ?? undefined} />
      </Drawer>
      <nav className="tabbar" aria-label="Pages">
        {lenses.map(p => <NavLink key={p.path} to={p.path} end state={ROOT} className={() => cls("tab", p.path)}>
          <Icon name={p.icon} />{p.label}</NavLink>)}
        <button type="button" className={"tab" + (asking ? " active" : "")} aria-expanded={asking}
                onClick={() => setAsk(!asking)}><Icon name="chat" />Ask</button>
      </nav>
    </div>
  );
}
