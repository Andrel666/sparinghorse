// A live countdown to the race's gun time, in the race's own time zone (midnight when no gun time).
import { useEffect, useState } from "react";

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

export function countdownText(ms: number) {
  if (ms <= 0) return "race day 🏁";
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  return `in ${d ? `${d} day${d > 1 ? "s" : ""}, ` : ""}${h} h ${m} min ${sec} s`;
}

export function Countdown({ date, time, tz }: { date: string; time: string | null; tz: string }) {
  const at = zonedInstant(date, time, tz);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let id: number | undefined;
    const t0 = window.setTimeout(() => { setNow(Date.now()); id = window.setInterval(() => setNow(Date.now()), 1000); }, 1000 - (Date.now() % 1000));
    return () => { clearTimeout(t0); if (id) clearInterval(id); };
  }, []);
  if (at == null) return null;
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <span className="num">{countdownText(at - now)}{time && tz !== local ? ` (gun ${time} ${tz.split("/").pop()?.replace("_", " ")})` : ""}</span>;
}
