// The app frame: sidebar on desktop, tab bar + More sheet on phones — both built from PAGES.
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { PAGES } from "../lib/pages";
import { Icon } from "./Icon";

const navCls = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " active" : "");

export function Shell({ children }: { children: ReactNode }) {
  const [more, setMore] = useState(false);
  const loc = useLocation();
  const top = PAGES.filter(p => !p.bottom), bottom = PAGES.filter(p => p.bottom);
  const tabs = PAGES.filter(p => p.tab), rest = PAGES.filter(p => !p.tab);
  const inMore = rest.some(p => p.path === loc.pathname);
  return (
    <div className="shell">
      <nav className="nav" aria-label="Pages">
        <div className="nav-brand">Sparing Horse</div>
        {top.map(p => <NavLink key={p.path} to={p.path} end className={navCls}><Icon name={p.icon} />{p.label}</NavLink>)}
        <div className="nav-spacer" />
        {bottom.map(p => <NavLink key={p.path} to={p.path} className={navCls}><Icon name={p.icon} />{p.label}</NavLink>)}
      </nav>
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
