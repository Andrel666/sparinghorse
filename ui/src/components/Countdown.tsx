// A live countdown to the race's gun time, in the race's own time zone (midnight when no gun time).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dateShort } from "../lib/format";

/** The UTC instant of a wall-clock time in an IANA zone (two passes settle DST edges). */
export function zonedInstant(date: string, time: string | null, tz: string): number | null {
  const [y, mo, d] = date.split("-").map(Number), [h, mi] = (time || "00:00").split(":").map(Number);
  if (!y || Number.isNaN(h)) return null;
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const offset = (t: number) => {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit",
        day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(t).map(x => [x.type, x.value]));
      return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - t;
    } catch { return NaN; }
  };
  let t = wall - offset(wall); t = wall - offset(t);
  return Number.isNaN(t) ? null : t;
}

/** Days until the last 48 h, then hours and minutes; seconds only in the final hour. */
export function countdownText(ms: number) {
  if (ms <= 0) return "race day";
  const s = Math.floor(ms / 1000), hours = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  if (hours >= 48) { const d = Math.ceil(s / 86400); return `${d} days`; }
  if (hours >= 1) return `${hours} h ${m} min`;
  return `${m} min ${sec} s`;
}

export function Countdown({ date, time, tz }: { date: string; time: string | null; tz: string }) {
  const at = zonedInstant(date, time, tz);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let id: number | undefined;
    // tick each second only inside the last hour, else each minute
    const step = at != null && at - Date.now() < 3600e3 ? 1000 : 60e3;
    const t0 = window.setTimeout(() => { setNow(Date.now()); id = window.setInterval(() => setNow(Date.now()), step); }, step - (Date.now() % step));
    return () => { clearTimeout(t0); if (id) clearInterval(id); };
  }, [at]);
  if (at == null) return null;
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <span className="num">{countdownText(at - now)}{time && tz !== local ? ` (gun ${time} ${tz.split("/").pop()?.replace("_", " ")})` : ""}</span>;
}

/** The race in one line, a door to the race-day plan: "Tel Aviv · A · 113 days · 1:58:43 (goal 1:59 · 17 s under)". */
export function RaceLine({ race }: { race: { label: string; date: string; start_time: string | null; start_tz: string; priority: string | null;
  pred?: { hms: string; tone: "ok" | "warn" | "bad" | null; words: string } } }) {
  return (
    <Link to="/plan?view=race" className="raceline" aria-label={`${race.label} race: open the race-day plan`}>
      <b>{race.label}</b>{race.priority ? <span className="muted"> · {race.priority}-race</span> : null}
      <span className="muted"> · {dateShort(race.date)} · </span><Countdown date={race.date} time={race.start_time} tz={race.start_tz} />
      {race.pred && <> <span className="muted">·</span> <span className={`num toned${race.pred.tone ? ` tone-${race.pred.tone}` : ""}`}>{race.pred.hms}</span>
        <span className="muted"> ({race.pred.words})</span></>}
    </Link>);
}
