// The one list of pages. The router, the sidebar and the phone tab bar are all built from it.
export type IconName = "today" | "plan" | "runs" | "fitness" | "body" | "coach" | "music" | "settings" | "more"
  | "close" | "trash" | "hide" | "note" | "chat" | "theme" | "alert" | "chevron" | "download";
export interface PageDef {
  path: string; label: string; icon: IconName;
  tab: boolean;            // its own phone tab (the rest live under More)
  bottom?: boolean;        // pinned to the bottom of the sidebar
  hidden?: boolean;        // a route only (an old address that redirects), not in the navigation
}
export const PAGES: PageDef[] = [
  { path: "/", label: "Today", icon: "today", tab: true },
  { path: "/plan", label: "Plan", icon: "plan", tab: true },
  { path: "/runs", label: "Runs", icon: "runs", tab: true },
  { path: "/fitness", label: "Fitness", icon: "fitness", tab: true },
  { path: "/body", label: "Body", icon: "body", tab: false, hidden: true },
  { path: "/coach", label: "Coach", icon: "coach", tab: false },
  { path: "/music", label: "Music", icon: "music", tab: false },
  { path: "/settings", label: "Settings", icon: "settings", tab: false, bottom: true },
];

// Classic runs on the API server's port; the login lives there too. Same host name keeps the cookie.
export const CLASSIC = `${location.protocol}//${location.hostname}:${import.meta.env.VITE_CLASSIC_PORT || "8770"}`;
