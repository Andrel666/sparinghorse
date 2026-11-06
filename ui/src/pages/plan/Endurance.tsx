// Plan → Race day: Runalyze's marathon shape, measured and then along the plan, against what the race
// needs (distance^1.23 %: 42.5 % for a half, 100 % for the marathon). Shown only — the plan is not
// built to reach it. The numbers and the words come from /api/ui/endurance.
import { useEndurance } from "../../lib/api";
import { dateShort } from "../../lib/format";
import { Card, Strip } from "../../components/ui";
import { Lines } from "../../components/charts";
import { Query } from "../Query";

export function Endurance() {
  return <Query q={useEndurance()}>{e => {
    const actual = e.series.filter(p => p.kind === "actual").map(p => ({ date: p.date, v: p.v }));
    const plan = e.series.filter(p => p.kind === "plan").map(p => ({ date: p.date, v: p.v }));
    const joined = actual.length && plan.length ? [actual[actual.length - 1], ...plan] : plan;
    // the series is a share of what the race needs: 100 is the line to reach
    const need = e.series.length ? [{ date: e.series[0].date, v: 100 }, { date: e.series[e.series.length - 1].date, v: 100 }] : [];
    const rm = e.race_morning;
    return (
      <Card id="endurance" span={12} label={e.label} lede={e.lede}>
        <Strip items={[
          { k: "Now", v: `${e.now.of_need}%`, s: `${e.now.pct}% shape of ${e.need}%`, to: "/fitness#weekly" },
          ...(rm ? [{ k: "Race morning", v: `${rm.of_need}%`, s: `${rm.pct}% shape · ${dateShort(rm.date)}`,
                      tone: (rm.of_need >= 100 ? "ok" : "warn") as "ok" | "warn", to: "/plan" }] : []),
          { k: "Reaches 100%", v: e.reaches ? dateShort(e.reaches) : "—", s: e.reaches ? "on this plan" : "not on this plan", to: "/plan" },
          { k: "From weekly km", v: `${(rm ?? e.now).week}`, s: `${(rm ?? e.now).km_week} of ${(rm ?? e.now).target_week_km} km/week`, to: "/fitness#weekly" },
          { k: "From long runs", v: `${(rm ?? e.now).long}`, s: `km past ${e.long_min_km} count`, to: "/runs" },
        ]} />
        <Lines height={200} fmt={v => `${v.toFixed(0)}%`} band={[100, null]} series={[
          { pts: actual, color: "var(--text)", label: "So far" },
          { pts: joined, color: "var(--signal)", label: "On this plan", dashed: true },
          { pts: need, color: "var(--ok)", label: "100%", dashed: true },
        ]} />
        <ul className="why-list">{e.why.map((w, i) => <li key={i} className="muted t-small">{w}</li>)}</ul>
      </Card>);
  }}</Query>;
}
