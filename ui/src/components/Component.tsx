// The fitness component a session builds (VO₂max, SSmax/LT2, economy, resilience) — Classic's own text.
import data from "../data/plan_sources.json";
import { Help } from "./feedback";

const TEXT = (data as { components: Record<string, string> }).components;
const NAME: Record<string, string> = { vo2max: "VO₂max", ssmax: "SSmax / LT2", economy: "Economy", resilience: "Resilience" };
export const componentFirst = (k: string | null | undefined) => (k && TEXT[k] ? TEXT[k].split(/(?<=\.)\s/)[0] : null);

export function ComponentChip({ k }: { k: string | null | undefined }) {
  if (!k || !TEXT[k]) return null;
  return <span className="flag">{NAME[k] || k}<Help label={`What ${NAME[k] || k} means`}>{TEXT[k]}</Help></span>;
}
