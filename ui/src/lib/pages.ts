// The one list of pages. The router, the sidebar and the phone tab bar are all built from it.
export type IconName = "today" | "plan" | "runs" | "fitness" | "body" | "coach" | "settings" | "more";
export interface PageDef {
  path: string; label: string; icon: IconName;
  tab: boolean;            // its own phone tab (the rest live under More)
  bottom?: boolean;        // pinned to the bottom of the sidebar
  classic?: string;        // where the same content lives in Classic, until this page is built
}
export const PAGES: PageDef[] = [
  { path: "/", label: "Today", icon: "today", tab: true },
  { path: "/plan", label: "Plan", icon: "plan", tab: true, classic: "/#sec-plan" },
  { path: "/runs", label: "Runs", icon: "runs", tab: true, classic: "/runs" },
  { path: "/fitness", label: "Fitness", icon: "fitness", tab: true, classic: "/#sec-ff" },
  { path: "/body", label: "Body", icon: "body", tab: false, classic: "/#sec-health" },
  { path: "/coach", label: "Coach", icon: "coach", tab: false, classic: "/" },
  { path: "/settings", label: "Settings", icon: "settings", tab: false, bottom: true, classic: "/" },
];

// Classic runs on the API server's port; the login lives there too. Same host name keeps the cookie.
export const CLASSIC = `${location.protocol}//${location.hostname}:${import.meta.env.VITE_CLASSIC_PORT || "8770"}`;
