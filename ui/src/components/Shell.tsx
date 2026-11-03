// The app frame: sidebar on desktop, tab bar + More sheet on phones — both built from PAGES.
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PAGES } from "../lib/pages";
import { Icon } from "./Icon";
import { useShell } from "../lib/api";
import { TopBar } from "./Frame";

const navCls = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "");

export function Shell({ children }: { children: ReactNode }) {
  const [more, setMore] = useState(false);
  const shell = useShell();
  const loc = useLocation();
  const top = PAGES.filter(p => !p.bottom), bottom = PAGES.filter(p => p.bottom);
  const tabs = PAGES.filter(p => p.tab), rest = PAGES.filter(p => !p.tab);
  const inMore = rest.some(p => p.path === loc.pathname);
  return (
    <div className="shell">
      <header className="nav" aria-label="Sparing Horse">
        <div className="nav-brand">Sparing Horse</div>
        <nav className="nav-links" aria-label="Pages">
          {[...top, ...bottom].map(p => <NavLink key={p.path} to={p.path} end className={navCls}>{p.label}</NavLink>)}
        </nav>
        <div className="nav-spacer" />
        {shell.data && <TopBar s={shell.data} />}
      </header>
      <main className="main" onClick={() => more && setMore(false)}>{children}</main>
      {more && <div className="more-sheet" role="menu">
        {rest.map(p => <NavLink key={p.path} to={p.path} className={navCls} onClick={() => setMore(false)}>
          <Icon name={p.icon} />{p.label}</NavLink>)}
      </div>}
      <nav className="tabbar" aria-label="Pages">
        {tabs.map(p => <NavLink key={p.path} to={p.path} end className={({ isActive }) => "tab" + (isActive ? " active" : "")}>
          <Icon name={p.icon} />{p.label}</NavLink>)}
        <button type="button" className={"tab" + (inMore || more ? " active" : "")} aria-expanded={more}
                onClick={() => setMore(m => !m)}><Icon name="more" />More</button>
      </nav>
    </div>
  );
}
