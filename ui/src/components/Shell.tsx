// The app frame: sidebar on desktop, tab bar + More sheet on phones — both built from PAGES.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate, useNavigationType, type Location } from "react-router-dom";
import { BackCtx, type Back } from "../lib/trail";
import { PAGES } from "../lib/pages";
import { Icon } from "./Icon";
import { useShell } from "../lib/api";
import { TopBar } from "./Frame";

const navCls = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "");

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
  const nav = PAGES.filter(p => !p.hidden);
  const top = nav.filter(p => !p.bottom), bottom = nav.filter(p => p.bottom);
  const tabs = nav.filter(p => p.tab), rest = nav.filter(p => !p.tab);
  const inMore = rest.some(p => p.path === loc.pathname);
  const back = useTrail(loc), go = useNavigate();
  return (
    <div className="shell">
      <header className="nav" aria-label="Sparing Horse">
        <div className="nav-brand">Sparing Horse</div>
        <nav className="nav-links" aria-label="Pages">
          {[...top, ...bottom].map(p => <NavLink key={p.path} to={p.path} end className={navCls} state={ROOT}>{p.label}</NavLink>)}
        </nav>
        <div className="nav-spacer" />
        {shell.data && <TopBar s={shell.data} />}
      </header>
      <main className="main" onClick={() => more && setMore(false)}>
        {back && <div className="backbar"><button type="button" className="back-link" onClick={() => go(-back.steps)}>‹ {back.label}</button></div>}
        <BackCtx.Provider value={back}>{children}</BackCtx.Provider></main>
      {more && <div className="more-sheet" role="menu">
        {rest.map(p => <NavLink key={p.path} to={p.path} className={navCls} state={ROOT} onClick={() => setMore(false)}>
          <Icon name={p.icon} />{p.label}</NavLink>)}
      </div>}
      <nav className="tabbar" aria-label="Pages">
        {tabs.map(p => <NavLink key={p.path} to={p.path} end state={ROOT} className={({ isActive }) => "tab" + (isActive ? " active" : "")}>
          <Icon name={p.icon} />{p.label}</NavLink>)}
        <button type="button" className={"tab" + (inMore || more ? " active" : "")} aria-expanded={more}
                onClick={() => setMore(m => !m)}><Icon name="more" />More</button>
      </nav>
    </div>
  );
}
