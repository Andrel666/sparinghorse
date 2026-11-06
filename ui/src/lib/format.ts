// The one place values are turned into text. Pages never format numbers themselves.
// Every API answers in metric; the display unit is the athlete's setting (set once by the Shell).
const MI = 1.609344;
let UNIT: "km" | "mi" = "km";
export const setUnits = (u: "km" | "mi") => { UNIT = u; };
export const unit = () => UNIT;
export const dist = (v: number) => (UNIT === "mi" ? v / MI : v);
export const km = (v: number | null | undefined, digits = 1) => (v == null ? "—" : `${dist(v).toFixed(digits)} ${UNIT}`);
/** "m:ss" per km → the display unit's pace string (no unit suffix). */
export const paceNum = (p: string | null | undefined) => {
  if (!p || UNIT === "km") return p || "";
  const m = /^(\d+):(\d{2})$/.exec(p); if (!m) return p;
  const s = Math.round((+m[1] * 60 + +m[2]) * MI);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
export const pace = (p: string | null | undefined) => (p ? `${paceNum(p)}/${UNIT}` : "—");
export const bpm = (v: number | null | undefined) => (v == null ? "—" : `${v} bpm`);
export const minutes = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)} min`);
/** A reading: whole numbers without decimals, the rest to one place. */
export const reading = (v: number | null | undefined) => (v == null ? "—" : Number.isInteger(v) || Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

const D = (iso: string) => new Date(iso + "T00:00:00");
/** Today's calendar date where the athlete is (not UTC's). */
export const localToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
/** A calendar date as a day number, in UTC arithmetic so no time zone shifts it; and back. */
export const dayNum = (iso: string) => Date.parse(iso + "T00:00:00Z") / 864e5;
export const numDay = (n: number) => new Date(Math.round(n) * 864e5).toISOString().slice(0, 10);
export const dayName = (iso: string) => D(iso).toLocaleDateString(undefined, { weekday: "short" });
export const dateShort = (iso: string) => D(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
export const dateLong = (iso: string) => D(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

export function ago(mins: number | null | undefined) {
  if (mins == null) return "not synced yet";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

// state → tone, shared by every card, pill and day cell
export type Tone = "ok" | "warn" | "bad" | undefined;
export const verdictTone = (v: string | null | undefined): Tone =>
  v === "green" || v === "on" ? "ok" : v === "amber" || v === "hot" ? "warn" : v === "red" || v === "too_hard" ? "bad" : undefined;

/** Heart-rate zone colours, Z1..Z5: a grey ramp heating into signal (tokens --z1..--z5), never status colours. */
export const ZONE_COLORS = ["var(--z1)", "var(--z2)", "var(--z3)", "var(--z4)", "var(--z5)"] as const;
