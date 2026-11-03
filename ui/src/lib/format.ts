// The one place values are turned into text. Pages never format numbers themselves.
export const km = (v: number | null | undefined, digits = 1) => (v == null ? "—" : `${v.toFixed(digits)} km`);
export const pace = (p: string | null | undefined) => (p ? `${p}/km` : "—");
export const bpm = (v: number | null | undefined) => (v == null ? "—" : `${v} bpm`);
export const minutes = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)} min`);
/** A reading: whole numbers without decimals, the rest to one place. */
export const reading = (v: number | null | undefined) => (v == null ? "—" : Number.isInteger(v) || Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));

const D = (iso: string) => new Date(iso + "T00:00:00");
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
