// The one list of pages. The router, the sidebar and the phone tab bar are all built from it.
export type IconName = "today" | "plan" | "runs" | "fitness" | "body" | "coach" | "music" | "settings" | "more"
  | "close" | "trash" | "hide" | "note" | "chat" | "theme" | "alert" | "chevron" | "download";
export interface PageDef {
  path: string; label: string; icon: IconName;
  tab: boolean;            // one of the four lenses: a phone tab and the main desktop links
  you?: boolean;           // under "You" (the phone's fifth tab, the right end of the desktop bar)
  hidden?: boolean;        // a route only, not in the navigation
  lights?: string;         // the lens whose tab stays lit on this page (Fitness and Body light Goal)
  redirect?: string;       // an old address: it lands on this path, keeping its query and hash
}
// The four lenses on one road (docs/design/FOUR_LENSES_DESIGN.md): Now, Road, Goal, Log. Ask (the coach) is a
// button on every page; Coach, Music and Settings live under You. Old addresses redirect, so every door still works.
export const PAGES: PageDef[] = [
  { path: "/", label: "Now", icon: "today", tab: true },
  { path: "/road", label: "Road", icon: "plan", tab: true },
  { path: "/goal", label: "Goal", icon: "fitness", tab: true },
  { path: "/log", label: "Log", icon: "runs", tab: true },
  { path: "/coach", label: "Coach", icon: "coach", tab: false, you: true },
  { path: "/music", label: "Music", icon: "music", tab: false, you: true },
  { path: "/settings", label: "Settings", icon: "settings", tab: false, you: true },
  { path: "/fitness", label: "Fitness", icon: "fitness", tab: false, hidden: true, lights: "/goal" },
  { path: "/body", label: "Body", icon: "body", tab: false, hidden: true, lights: "/goal" },
  { path: "/plan", label: "Road", icon: "plan", tab: false, hidden: true, redirect: "/road" },
  { path: "/runs", label: "Log", icon: "runs", tab: false, hidden: true, redirect: "/log" },
];
/** The lens a path belongs to (for the lit tab): itself, or the lens it lights. */
export const lensOf = (path: string) => PAGES.find(p => p.path === path)?.lights ?? path;

// Classic runs on the API server's port; the login lives there too. Same host name keeps the cookie.
export const CLASSIC = `${location.protocol}//${location.hostname}:${import.meta.env.VITE_CLASSIC_PORT || "8770"}`;
