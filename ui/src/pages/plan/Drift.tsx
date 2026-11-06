// How far the road has moved from its founding plan: the scorecard (or, after the race, how it went),
// five charts, and the Conservative-vs-Assertive comparison. All values come from /api/plandrift.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { dateShort, dist, unit } from "../../lib/format";
import { Card, ListItem, Pill, Table } from "../../components/ui";
import { Lines, type Pt, type Series } from "../../components/charts";
import { Help } from "../../components/feedback";
import { Query } from "../Query";

type P<K extends string> = ({ date: string } & Record<K, number>)[];
interface Gap { founding: number | null; now: number | null; gap: number | null; state: string }
interface Drift { ok: boolean; error?: string; today: string;
  anchor?: { for_date: string; is_current: boolean; versions: number }; race?: { label: string; date: string; weeks_away: number };
  races?: { label: string; date: string }[]; duplicate_count?: number;
  scorecard?: { headline?: string; volume?: Gap; fitness?: Gap; race?: Gap & { trend: string; caveat: boolean; verdict: string }; weeks_to_go?: number;
    chain?: { label: string; date: string; founding: number; now: number; trend: string; run?: boolean }[] | null;
    reckoning?: { fitness?: { ctl: number; gap: number; state: string }; result?: { status?: string; found?: boolean; goal?: string; actual?: string; beat?: boolean };
      prediction?: { lo_hms: string; hi_hms: string; p50_hms: string; in_band: boolean; err_pct: number } } | null };
  distance?: { initial: P<"cum">; current: (P<"cum">[number] & { kind: string })[] };
  effort?: { initial: P<"trimp">; actual: P<"trimp">; current: P<"trimp"> };
  ctl?: { initial: P<"ctl">; actual: P<"ctl">; current: P<"ctl"> };
  ctl_forecast_bias?: { n: number; direction: string; median_err_pct: number | null; close_within: number; lead_days: number | null };
  outcome?: { date: string; ctl: number }[]; finish_drift?: { date: string; p50: number; lo: number; hi: number }[];
  counterfactual?: { regime: string; vs: string; reason: string; distance: P<"cum">; effort: P<"trimp">; ctl: P<"ctl">;
    outcome: { now_peak_ctl: number; now_finish: string; peak_ctl: number; finish: string; curve: { plus_weeks: number; hms: string }[] } } | null }

const pts = <K extends string>(xs: P<K> | undefined, k: K, f = (v: number) => v): Pt[] => (xs || []).map(x => ({ date: x.date, v: f(x[k]) }));
const hmm = (s: number) => `${Math.floor(s / 3600)}:${String(Math.round(s % 3600 / 60)).padStart(2, "0")}`;
const NAME: Record<string, string> = { caution: "Conservative", assertive: "Assertive" };
const gapText = (g: Gap | undefined, what: string, u = "") => !g || g.state === "unknown" ? "—"
  : g.state === "level" ? `${what} on track` : `${g.gap! > 0 ? "+" : ""}${g.gap}${u} ${g.state}`;

function Block({ title, note, series, fmt }: { title: string; note: string; series: Series[]; fmt?: (v: number) => string }) {
  const has = series.some(s => s.pts.length > 1);
  return <Card span={6} label={title}>
    {has ? <Lines series={series} height={180} fmt={fmt} /> : <span className="muted">Not enough history yet: the road will move as results come in.</span>}
    <span className="muted t-small">{note}</span></Card>;
}

export function DriftView({ race }: { race?: string }) {
  const [mode, setMode] = useState<"founding" | "compare">("founding");
  const url = `/api/plandrift${race ? `?race=${race}` : ""}`;
  const q = useQuery({ queryKey: ["ui", "drift", race], queryFn: () => api<Drift>(url) });
  const cq = useQuery({ queryKey: ["ui", "drift", race, "cf"], enabled: mode === "compare",
    queryFn: () => api<Drift>(`${url}${race ? "&" : "?"}compare=1`) });
  return <Query q={q}>{d => {
    const sc = d.scorecard, rk = sc?.reckoning, cf = cq.data?.counterfactual;
    const curDist = (d.distance?.current || []);
    return (
      <div className="grid">
        <Card span={12} label={rk ? "How the race went" : "The road vs the road as it stands"}>
          <span>{sc?.headline}</span>
          {rk ? <div className="list">
            {rk.fitness && <ListItem k="Fitness arrived">CTL {rk.fitness.ctl} · {rk.fitness.state === "level" ? "on target" : `${Math.abs(rk.fitness.gap)} ${rk.fitness.state}`}</ListItem>}
            {rk.result && <ListItem k="Result">{rk.result.status === "dnf" ? "DNF" : rk.result.found === false ? "not synced yet"
              : `${rk.result.goal} → ${rk.result.actual} · ${rk.result.beat ? "beat" : "missed"} the goal`}</ListItem>}
            {rk.prediction && <ListItem k="Engine's call">{rk.prediction.lo_hms}–{rk.prediction.hi_hms}, median {rk.prediction.p50_hms} ·
              {rk.prediction.in_band ? " inside the band" : " outside the band"} · {rk.prediction.err_pct > 0 ? "+" : ""}{rk.prediction.err_pct}%</ListItem>}
          </div> : <div className="list">
            <ListItem k="Volume">{sc?.volume?.state === "unknown" ? "—" : sc?.volume?.state === "level" ? "on the road" : `${sc?.volume?.gap! > 0 ? "+" : ""}${dist(sc?.volume?.gap || 0).toFixed(1)} ${unit()} ${sc?.volume?.state}`}</ListItem>
            <ListItem k="Fitness">{gapText(sc?.fitness, "CTL")}</ListItem>
            {sc?.race && <ListItem k="Race-day fitness">{sc.race.founding} → {sc.race.now} <span className="muted">({sc.race.trend}{sc.race.caveat ? " · duplicate caveat" : ""})</span></ListItem>}
            {sc?.weeks_to_go != null && <ListItem k="Weeks to go">{sc.weeks_to_go}</ListItem>}
          </div>}
          {sc?.chain && <Table cols={[{ head: "A race", cell: (c: NonNullable<typeof sc.chain>[number]) => c.label }, { head: "Date", cell: c => dateShort(c.date) },
            { head: "Peak CTL", cell: c => `${c.founding} → ${c.now}`, num: true }, { head: "", cell: c => c.run ? "run" : c.trend }]}
            rows={sc.chain} keyOf={c => c.date} />}
          <span className="muted t-small">
            {d.anchor && `Baseline: the plan of ${dateShort(d.anchor.for_date)}${d.anchor.is_current ? " (just sealed)" : ""} · ${d.anchor.versions} versions on record`}
            {d.race && ` · ${d.race.label}, ${d.race.weeks_away} weeks out`}
            {d.duplicate_count ? ` · ${d.duplicate_count} duplicate activities inflate the actuals` : ""}
            {(d.races?.length || 0) > 1 ? " · pick a race in the Races tile to switch" : ""}</span>
          <span className="seg" role="group" aria-label="Compare">
            <button type="button" aria-pressed={mode === "founding"} onClick={() => setMode("founding")} title="How the road moved since the plan was founded">Original → Now</button>
            <button type="button" aria-pressed={mode === "compare"} onClick={() => setMode("compare")} title="Your road against the other posture">Conservative vs Assertive</button>
          </span>
        </Card>
        {mode === "founding" ? <>
          <Block title="Cumulative distance" note="The founding road against what you ran and what's now projected."
            fmt={v => `${dist(v).toFixed(0)} ${unit()}`}
            series={[{ pts: pts(d.distance?.initial, "cum"), color: "var(--muted)", label: "Original road", dashed: true },
                     { pts: curDist.filter(x => x.kind === "actual").map(x => ({ date: x.date, v: x.cum })), color: "var(--text)", label: "Run so far" },
                     { pts: curDist.filter(x => x.kind !== "actual").map(x => ({ date: x.date, v: x.cum })), color: "var(--text)", label: "Projected", dashed: true }]} />
          <Block title="Weekly training load · effort" note="TRIMP per week: founding plan, actual, and the road now." fmt={v => v.toFixed(0)}
            series={[{ pts: pts(d.effort?.initial, "trimp"), color: "var(--muted)", label: "Original", dashed: true },
                     { pts: pts(d.effort?.actual, "trimp"), color: "var(--text)", label: "Actual" },
                     { pts: pts(d.effort?.current, "trimp"), color: "var(--signal)", label: "Now", dashed: true }]} />
          <Card span={6} label="Fitness trajectory · CTL">
            <Lines height={180} series={[{ pts: pts(d.ctl?.initial, "ctl"), color: "var(--muted)", label: "Original", dashed: true },
                     { pts: pts(d.ctl?.actual, "ctl"), color: "var(--text)", label: "Actual" },
                     { pts: pts(d.ctl?.current, "ctl"), color: "var(--signal)", label: "Now", dashed: true }]} />
            <span className="muted t-small">
              {d.ctl_forecast_bias?.n ? `The weekly fitness forecast runs ${d.ctl_forecast_bias.direction} by ${d.ctl_forecast_bias.median_err_pct}% (${d.ctl_forecast_bias.n} settled).`
                : "No weekly fitness forecast has settled yet."}
              <Help>Each week the engine forecasts end-of-week fitness; once the week is lived, the forecast is scored against what happened.</Help></span>
          </Card>
          <Block title="Projected race-day fitness" note="Each re-plan's projected fitness on race day." fmt={v => v.toFixed(0)}
            series={[{ pts: (d.outcome || []).map(o => ({ date: o.date, v: o.ctl })), color: "var(--text)", label: "Race-day CTL" }]} />
          {(d.finish_drift?.length || 0) > 0 && <Block title="Predicted finish · the ledger" note="Each re-plan's predicted finish with its 80 % band." fmt={hmm}
            series={[{ pts: (d.finish_drift || []).map(f => ({ date: f.date, v: f.p50 })), color: "var(--text)", label: "Median" },
                     { pts: (d.finish_drift || []).map(f => ({ date: f.date, v: f.lo })), color: "var(--muted)", label: "Fast end", dashed: true },
                     { pts: (d.finish_drift || []).map(f => ({ date: f.date, v: f.hi })), color: "var(--muted)", label: "Slow end", dashed: true }]} />}
        </> : cq.isPending ? <Card><span className="muted">Building the comparison…</span></Card>
          : !cf ? <Card><span className="muted">The comparison needs a race set.</span></Card> : <>
          <Block title="Cumulative distance" note={`${NAME[cf.vs]} is your road now; ${NAME[cf.regime]} is ${cf.regime === "assertive" ? "what earning it unlocks" : "the floor if the gate re-closes"}.`}
            fmt={v => `${dist(v).toFixed(0)} ${unit()}`}
            series={[{ pts: curDist.filter(x => x.kind === "actual").map(x => ({ date: x.date, v: x.cum })), color: "var(--text)", label: "Run" },
                     { pts: curDist.map(x => ({ date: x.date, v: x.cum })), color: "var(--text)", label: `${NAME[cf.vs]}: now` },
                     { pts: pts(cf.distance, "cum"), color: "var(--signal)", label: NAME[cf.regime], dashed: true }]} />
          <Block title="Weekly training load" note="TRIMP per week under each posture." fmt={v => v.toFixed(0)}
            series={[{ pts: pts(d.effort?.current, "trimp"), color: "var(--text)", label: NAME[cf.vs] },
                     { pts: pts(cf.effort, "trimp"), color: "var(--signal)", label: NAME[cf.regime], dashed: true }]} />
          <Block title="Fitness · CTL" note="Projected fitness under each posture."
            series={[{ pts: pts(d.ctl?.current, "ctl"), color: "var(--text)", label: NAME[cf.vs] },
                     { pts: pts(cf.ctl, "ctl"), color: "var(--signal)", label: NAME[cf.regime], dashed: true }]} />
          <Card span={6} label="Projected race outcome">
            <div className="list">
              <ListItem k={`${NAME[cf.vs]} (now)`}>peak CTL {cf.outcome.now_peak_ctl} · finish {cf.outcome.now_finish}</ListItem>
              <ListItem k={NAME[cf.regime]}>peak CTL {cf.outcome.peak_ctl} · finish {cf.outcome.finish}</ListItem>
              {cf.outcome.curve?.filter(c => c.plus_weeks).length ? <ListItem k="With more runway">{cf.outcome.curve.filter(c => c.plus_weeks).map(c => `+${c.plus_weeks} w → ${c.hms}`).join(" · ")}</ListItem> : null}
            </div>
            <span className="muted t-small">{cf.reason}</span>
            <Pill>{cf.regime === "assertive" ? "the upside if the posture is earned" : "the floor if the gate re-closes"}</Pill>
          </Card>
        </>}
      </div>);
  }}</Query>;
}
