// The app frame: the four lenses (Now, Road, Goal, Log) as the top bar on desktop and the tab bar on phones, Ask on
// every page, and You (Coach, Music, Settings) at the bar's right end / the phone's fifth tab. All built from PAGES.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate, useNavigationType, useSearchParams, type Location } from "react-router-dom";
import { Drawer } from "./layout";
import { Chat } from "./Chat";
import { BackCtx, type Back } from "../lib/trail";
import { PAGES, lensOf } from "../lib/pages";
import { Icon } from "./Icon";
import { useShell } from "../lib/api";
import { TopBar } from "./Frame";

// a lens is lit on its own path and on the deeper pages that belong to it (Fitness and Body light Goal)
const lit = (path: string, here: string) => lensOf(here) === path;

const ROOT = { root: true };

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
  const [more, setMore] = useState(false);
  const shell = useShell();
  const loc = useLocation();
  const lenses = PAGES.filter(p => p.tab), you = PAGES.filter(p => p.you);
  const inYou = you.some(p => p.path === loc.pathname);
  const cls = (base: string, path: string) => base + (lit(path, loc.pathname) ? " active" : "");
  const back = useTrail(loc), go = useNavigate();
  const [params, setParams] = useSearchParams();
  const asking = params.get("ask") === "1";            // the Ask drawer: the coach chat over any page
  const setAsk = (on: boolean) => setParams(p => { const n = new URLSearchParams(p); if (on) n.set("ask", "1"); else n.delete("ask"); return n; });
  return (
    <div className="shell">
      <header className="nav" aria-label="Sparing Horse">
        <div className="nav-brand">Sparing Horse</div>
        <nav className="nav-links" aria-label="Lenses">
          {lenses.map(p => <NavLink key={p.path} to={p.path} end className={() => cls("nav-link", p.path)} state={ROOT}>{p.label}</NavLink>)}
        </nav>
        <div className="nav-spacer" />
        {loc.pathname !== "/coach" && <button type="button" className="btn ask-btn" aria-expanded={asking} onClick={() => setAsk(true)}>
          <Icon name="chat" />Ask</button>}
        <nav className="nav-links nav-you" aria-label="You">
          {you.map(p => <NavLink key={p.path} to={p.path} end className={() => cls("nav-link", p.path)} state={ROOT}>{p.label}</NavLink>)}
        </nav>
        {shell.data && <TopBar s={shell.data} />}
      </header>
      <main className="main" onClick={() => more && setMore(false)}>
        {back && <div className="backbar"><button type="button" className="back-link" onClick={() => go(-back.steps)}>‹ {back.label}</button></div>}
        <BackCtx.Provider value={back}>{children}</BackCtx.Provider></main>
      <Drawer title="Ask the coach" open={asking} onClose={() => setAsk(false)}>
        <Chat />
        <Link to="/coach" className="linkish" onClick={() => setAsk(false)} state={{ root: true }}>Open the coach page ›</Link>
      </Drawer>
      {more && <div className="more-sheet" role="menu">
        {you.map(p => <NavLink key={p.path} to={p.path} className={() => cls("nav-link", p.path)} state={ROOT} onClick={() => setMore(false)}>
          <Icon name={p.icon} />{p.label}</NavLink>)}
      </div>}
      <nav className="tabbar" aria-label="Pages">
        {lenses.map(p => <NavLink key={p.path} to={p.path} end state={ROOT} className={() => cls("tab", p.path)}>
          <Icon name={p.icon} />{p.label}</NavLink>)}
        <button type="button" className={"tab" + (inYou || more ? " active" : "")} aria-expanded={more}
                onClick={() => setMore(m => !m)}><Icon name="more" />You</button>
      </nav>
    </div>
  );
}
