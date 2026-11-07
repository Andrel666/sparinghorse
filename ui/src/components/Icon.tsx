// Line icons, one set for the whole app: a 24px grid, ONE stroke (1.5), round caps. Nav icons draw at 20px on the
// phone, everything else at 16px (.icon-inline). Never an emoji in place of one of these (slop.test.ts).
import type { IconName } from "../lib/pages";

const PATHS: Record<IconName, string> = {
  today: "M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z",
  plan: "M4 5h16v15H4zM4 10h16M9 5V3M15 5V3M8 14h2M14 14h2M8 17h2",
  runs: "M3 12h4l3-8l4 16l3-8h4",
  fitness: "M4 19V5M4 19h16M7 15l4-4l3 3l5-6",
  body: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  coach: "M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.4A8 8 0 1 1 20 12z",
  settings: "M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM19.4 13.5l1.6 1.2l-2 3.4l-1.9-.7a7 7 0 0 1-2 1.2L14.8 21h-4l-.3-2.1a7 7 0 0 1-2-1.2l-1.9.7l-2-3.4l1.6-1.2a7 7 0 0 1 0-2.4L4.6 10.3l2-3.4l1.9.7a7 7 0 0 1 2-1.2L10.8 3h4l.3 2.1a7 7 0 0 1 2 1.2l1.9-.7l2 3.4l-1.6 1.2a7 7 0 0 1 0 2.4z",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  close: "M6 6l12 12M18 6L6 18",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  hide: "M3 3l18 18M10.6 6.1A9.7 9.7 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3 3.4M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6a9 9 0 0 0 4.4-1.2",
  note: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
  chat: "M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.4A8 8 0 1 1 20 12zM8.5 12h.01M12 12h.01M15.5 12h.01",
  theme: "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 3v18",
  alert: "M12 3l9.5 17h-19zM12 10v4M12 17h.01",
  chevron: "M9 6l6 6l-6 6",
  download: "M12 4v11M7 10l5 5l5-5M5 20h14",
};
// the small glyphs that sit inside buttons and lines (16px) rather than the nav (24px)
const INLINE: ReadonlySet<IconName> = new Set(["close", "trash", "hide", "note", "chat", "theme", "alert", "chevron", "download"]);
const STROKE = 1.5;                 // the one stroke; "more" is three dots drawn as strokes, so it needs a heavier pen

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "more" ? 3 : STROKE}
         className={INLINE.has(name) ? "icon-inline" : undefined}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
