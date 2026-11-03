// Line icons, one set for the whole app (24px grid, 1.8 stroke).
import type { IconName } from "../lib/pages";

const PATHS: Record<IconName, string> = {
  today: "M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z",
  plan: "M4 5h16v15H4zM4 10h16M9 5V3M15 5V3M8 14h2M14 14h2M8 17h2",
  runs: "M3 12h4l3-8l4 16l3-8h4",
  fitness: "M4 19V5M4 19h16M7 15l4-4l3 3l5-6",
  body: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z",
  coach: "M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.4A8 8 0 1 1 20 12z",
  settings: "M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM19.4 13.5l1.6 1.2l-2 3.4l-1.9-.7a7 7 0 0 1-2 1.2L14.8 21h-4l-.3-2.1a7 7 0 0 1-2-1.2l-1.9.7l-2-3.4l1.6-1.2a7 7 0 0 1 0-2.4L4.6 10.3l2-3.4l1.9.7a7 7 0 0 1 2-1.2L10.8 3h4l.3 2.1a7 7 0 0 1 2 1.2l1.9-.7l2 3.4l-1.6 1.2a7 7 0 0 1 0 2.4z",
  more: "M5 12h.01M12 12h.01M19 12h.01",
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={name === "more" ? 3 : 1.8}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
