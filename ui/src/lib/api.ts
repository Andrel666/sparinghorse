// The one API client. Every page's data comes from one /api/ui/* endpoint that already holds the
// decisions and the wording; this file only fetches it and types it.
import { useQuery } from "@tanstack/react-query";

export class ApiError extends Error {
  constructor(public status: number, message: string, public login?: string, public body?: Record<string, unknown>) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { credentials: "include", ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await r.json().catch(() => null);
  if (!r.ok || (body && body.ok === false)) {
    throw new ApiError(r.status, (body && body.error) || (body && body.errors && Object.values(body.errors).join("; ")) || `HTTP ${r.status}`,
      body && (body.login || body.setup), body || undefined);
  }
  return body as T;
}

// ── types (mirror sh_ui_api.today_page) ──
export type Verdict = "green" | "amber" | "red" | null;
export interface Target { kind: "hr" | "pace"; text: string; hint: string }
export interface Step { label: string; minutes: number | null; km: number | null; zone: string | null; pace: string | null }
export interface Actual { km: number; pace: string | null; hr?: number | null }
export interface Day {
  date: string; dow: string; kind: string; title: string; km: number | null; race: boolean; strides: number;
  status: "rest" | "planned" | "today" | "done" | "moved" | "missed" | "extra"; actual: Actual | null; moved_to: string | null;
  // the runs dated this day (a moved run sits where it was run) — optional: older servers send none
  runs?: { activity_id: number | null; km: number | null; pace: string | null; hr: number | null; kind: string; unplanned: boolean }[];
  moved_from?: string | null; moved_dow?: string | null;
}
export interface Held { key: string; name: string; text: string; short?: string }
export interface TodayPage {
  ok: true; today: string; sync_minutes: number | null; dateline?: string;
  race: { label: string; date: string; type: string; days: number; target: string | null; start_time: string | null;
          start_tz: string; priority: string | null; verdict: string | null;
          pred?: { hms: string; tone: "ok" | "warn" | "bad" | null; words: string } } | null;
  readiness: { verdict: Verdict; halt: boolean; action: string; headline: string | null; detail: string;
               reasons: string[]; hrv: string | null; hrv_line: string; ai_line: string | null;
               checkin: Checkin | null; for_label?: string | null; saved_at?: string | null };
  session: { kind: string; title: string; km: number | null; minutes: number | null; note: string | null; done: boolean;
             actual: Actual | null; race: boolean; target: Target | null; steps: Step[]; phase: string | null;
             week: number | null; trimp: number | null; optional: boolean; start: string | null; component: string | null;
             pace_zone: string | null; why: string | null; activity_id?: number | null };
  next: { date: string; dow: string; kind: string; title: string; km: number | null; minutes: number | null;
          strides: number; race: boolean; target: Target | null; days: number } | null;
  week: { start: string; phase: string | null; km: number; runs: number; days: Day[]; deload: string | null;
          held: Held | null; sessions?: SessionDetail[]; km_done?: number; runs_done?: number; runs_planned?: number } | null;
  latest_run: { id: number; date: string; km: number; pace: string | null; hr: number | null;
                verdict: string | null; verdict_text: string | null; cross_training?: string; minutes: number | null;
                hr_max: number | null; trimp: number | null; te: number | null; recovery_h: number | null; verdict_line?: string | null } | null;
  // added with the day drawer and the glance row — optional, so a backend that predates them still renders
  coming?: (Omit<SessionDetail, "mark" | "activity_id" | "reflection" | "component" | "moved_dow" | "runs"> & { dow: string; days: number })[];
  glance?: { key: string; label: string; value: string; sub: string; hint?: string | null; tone: "ok" | "warn" | "bad" | null; link: string }[];
  recovery?: { key: string; label: string; value: string; unit: string; sub: string; state: "ok" | "watch" | null;
              series: { date: string; v: number }[]; link?: string }[];
  where?: Where | null;
  why?: { key: string; text: string; detail?: string; link: string }[];
  vs_plan?: VsPlan | null;
}

/** Today's "vs. the original plan" (sh_ui_api.today_vs_plan): the race's pinned first plan against today. */
export interface VsPlan {
  since: string | null; race: string | null; pinned: boolean; just_set: boolean; lede: string | null;
  items: { key: "ctl" | "vo2" | "long"; label: string; actual: number | null; planned: number | null; diff: number | null;
           pct: number | null; unit: "km" | null; state: "ahead" | "behind" | "level" | "upcoming" | "unknown";
           tone: "ok" | "warn" | null; word: string | null; when: string | null; note: string | null; link: string }[];
}

/** Where the athlete is on the road (Today's "Where you are"). */
export interface Where {
  weeks: { start: string; phase: string | null; km: number | null; past: boolean; current: boolean; race: boolean }[];
  phases: { key: string | null; name: string | null; weeks: number; current: boolean }[];
  n: number | null; of: number; phase: string | null; phase_n: number | null; phase_of: number | null;
  race: { label: string | null; date: string; days: number | null } | null;
  fitness: { now: number | null; race: number | null };
  pred: { hms: string; goal: string | null; tone: "ok" | "warn" | "bad" | null; short: string | null } | null;
}

export interface Tile { key: string; label: string; value: number | null; unit: string; delta: number | null;
  series: { date: string; v: number }[]; hint: string; word?: string | null }
export interface FitnessPage {
  ok: true; tiles: Tile[]; ff_headline?: string | null; weekly_headline?: string | null;
  strip: { key: string; label: string; value: string | null; sub: string; tone: "ok" | "warn" | "bad" | null; link: string;
           series: { date: string; v: number }[] }[];
  load: { acwr: number | null; band: [number, number]; state: "high" | "low" | "in" | null; text: string | null;
          ramp: number | null; ramp_word: string | null };
  chart: { ctl: { date: string; v: number }[]; atl: { date: string; v: number }[]; plan: { date: string; v: number }[];
           tsb: { date: string; v: number }[]; acwr: { date: string; v: number }[]; duplicates: number;
           check: { model: { fitness: number; fatigue: number }; runalyze: { fitness: number; fatigue: number }; close: boolean } | null };
  weekly: { week: string; km: number }[];
  zones: { label: string; pace: string | null; hr: { lo: number | null; hi: number | null } | null }[];
  easy: { score: number | null; window_days: number; judged: number | null; on: number | null; hot: number | null;
          too_hard: number | null; by: string; ceiling: string | null; lt1: string | null; agreement: string | null;
          lthr_note: string | null; detrained: string | null; field_test: string | null;
          runs: { date: string; kind: string; km: number; pace: string | null; hr: number | null; hr_pct: number | null;
                  te: number | null; feel: string | null; decoupling: number | null; verdict: string | null;
                  verdict_text: string | null }[] };
  durability_detail: { points: { date: string; km: number; pct: number; hr: number | null }[];
    builds: { label: string; pb: boolean; current: boolean; race_pct: number | null; longest_km: number | null;
              runs: { km: number; pct: number | null; race: boolean }[] }[]; lines: number[] };
  efficiency_detail: { points: { date: string; v: number; temp: number | null; km: number; pace: string | null; hr: number | null }[];
    fit: { date: string; v: number }[] | null; temp_note: string | null };
  track_detail: { lead_days: number; n: number; median_err_pct: number | null; direction: string | null }[];
  track_full: { lines: string[]; empty: string | null; races: { label: string; date: string; at: string; band: string | null; err_pct: number | null }[] };
  zones_note: string;
  durability_more: { bands: string[]; min_km: number; default_compare: string | null; headline: string | null; footnote: string;
    builds: { key: string; label: string; current: boolean; pb: boolean; horizon: string; fit: { slope: number; intercept: number } | null; n: number;
              cells: ({ median: number; n: number } | null)[]; race_pct: number | null; runs: { km: number; pct: number | null; race: boolean }[] }[] };
  durability: { ok: boolean; n: number | null; text: string; note: string | null };
  efficiency: { ok: boolean; verdict: string | null; text: string };
  track: { scored: number; text: string };
}

export interface SessionDetail { date: string; kind: string; title: string; km: number | null; minutes: number | null;
  note: string | null; race: boolean; strides: number; target: Target | null; steps: Step[]; actual: Actual | null;
  moved_to: string | null; status: string; mark: "extra" | "done" | "missed" | "today" | "ahead"; activity_id: number | null;
  reflection: string | null; component: string | null; moved_dow: string | null; runs: { km: number; pace: string | null; activity_id: number | null }[] }
export interface Flag { text: string; hint: string | null; tone: "ok" | "warn" | null }
export interface Limit { key: string; name: string; laid: number; ceiling: number; unit: string; holds: boolean;
  over: boolean; fill: number | null; basis: "L" | "A" | "S" | null; headroom: number | null }
export interface PlanPage {
  ok: true; today: string; empty?: boolean;
  header: { generated_at: string | null; stale: string | null; seed: string | null; pace_note: string | null; mode: string | null;
            posture: { mode: string | null; label: string; reason: string | null; ride: string } };
  adjustment: import("../pages/plan/Adjust").Adjustment | null;
  races: import("../pages/plan/Races").RaceRow[]; tune_ups: { label: string; date: string }[];
  race: { label: string; date: string; type: string; target: string | null; tone?: "ok" | "warn" | "bad" | null; call?: string | null; prediction: string | null;
          lo: string | null; hi: string | null; verdict: string | null } | null;
  road: { start: string; phase: string | null; km: number; ran: number; current: boolean; selected: boolean; race: boolean; frozen: boolean;
          flags: { label: string; date: string; day: number }[] }[];
  phases: { key: string | null; name: string | null; start: string; weeks: number }[]; road_headline?: string | null;
  week: { start: string; end: string; phase: string | null; phase_name: string | null; n: number | null; km: number;
          intent: string | null; current: boolean; days: Day[]; held: Held | null;
          limits: Limit[]; sessions: SessionDetail[]; prev: string | null; next: string | null; flags: Flag[];
          deload: { week: string; why: string | null; state: "retired" | "offer" | "kept"; text: string } | null;
          proj_ctl: number | null; proj_acwr: number | null; km_done: number | null; km_ahead: number | null; eq_km: number | null;
          frozen: boolean; runs: number | null; status: string };
  paces: { key: string; label: string; pace: string }[];
}
export interface RunPage { ok: true; id: number; date: string; title: string; sport: string;
  stats: { k: string; v: string | null; primary?: boolean }[];
  readback: { kind: string | null; summary: string | null; rough: boolean; composite: number | null; strides: string | null } | null;
  verdict: string | null; verdict_text: string | null; time: string | null; ignored: boolean;
  split: { index: number; parts: number; km: number; min: number } | null }
export interface Profile { has_pace: boolean; has_hr: boolean; has_cadence: boolean; has_elevation: boolean; has_gct: boolean; has_vo: boolean;
  dist: number[]; pace: (number | null)[]; hr: (number | null)[]; cadence: (number | null)[]; elevation: (number | null)[];
  gct: (number | null)[]; vo: (number | null)[]; hr_avg: number | null;
  hrzones: { anchor: string; cutoffs: number[]; ref: number } | null }
export interface Marker { key: string; label: string; unit: string; value: number; date: string; ref: [number | null, number | null] | null;
  good: string | null; state: "ok" | "watch" | null; stale: boolean; delta: number | null; group: string; stale_days: number | null;
  n: number; first: string; series: { date: string; v: number }[]; recent: { date: string; v: number }[] }
export interface BodyPage { ok: true; markers: Marker[]; stopped: string | null; add: { key: string; label: string }[]; injuries: { start: string; end: string | null; label: string | null }[] }
export interface Field { key: string; label: string; help: string; help_short?: string; kind: string; choices: { v: string; t: string }[];
  value: string; source: string }
export interface SettingsPage { ok: true; groups: { name: string; fields: Field[] }[] }

// existing backend-decided endpoints the new UI reads as they are
export interface CalDay { date: string; kind: string; km: number | null; status: string; race?: boolean; pk?: string;
  strides?: number; actual?: Actual | null; from?: string }
export interface PlanCalendar { ok: true; month: string; week_start: number; today: string; first: string; last: string;
  start: string; end: string; race: { date: string; label: string } | null; days: Record<string, CalDay[]>;
  phase: Record<string, string> }
export interface RunsMonth { ok: true; month: string; week_start: number; first: string; last: string;
  days: Record<string, { id: number; km: number; pace: string | null; t: string; z: number | null; sj?: unknown }[]>;
  other: string[] | null; since: string | null;
  stats: Record<string, unknown>; stats12: Record<string, unknown>; statsAll: Record<string, unknown> }
export interface RacePlanT { ok: true; race: { label: string; date: string; type: string; km: number; start_time: string | null };
  target: { seconds: number; hms: string; pace: string; source: string; goal: string | null };
  prediction: { hms: string | null; lo: string | null; hi: string | null; verdict: string | null } | null;
  best: { hms: string; date: string } | null; lthr: number | null;
  segments: { label: string; from_km: number; to_km: number; pace: string; hr: { lo?: number; hi: number } | null; cue: string }[];
  splits: { km: number; clock: string; checkpoint: boolean }[]; notes: string[] }
export interface CoachMsg { id: number; ts: string; role: "user" | "coach"; text: string }

// ── one hook per page ──
const page = <T,>(name: string) => () => useQuery({ queryKey: ["ui", name], queryFn: () => api<T>(`/api/ui/${name}`) });
export interface ShellT { ok: true; version: string; units: "km" | "mi"; last_sync: string | null; sync_hours: number | null;
  stale: boolean; stale_hours: number; llm: boolean; ai: Record<string, boolean>;
  first_run: { key: string; title: string; text: string; done: boolean }[] | null;
  duplicates: { id: number; date: string; distance: number }[]; ignored: { id: number; date: string; distance: number; reason: string }[] }
export const useShell = page<ShellT>("shell");
export const useToday = page<TodayPage>("today");
export const useFitness = page<FitnessPage>("fitness");
export const useBody = page<BodyPage>("body");
export const useSettings = page<SettingsPage>("settings");
const q = <T,>(key: unknown[], path: string, enabled = true) =>
  useQuery({ queryKey: key, queryFn: () => api<T>(path), enabled, placeholderData: prev => prev });   // keep the last view while the next loads
export const usePlan = (sel: { week?: string; day?: string }) =>
  q<PlanPage>(["ui", "plan", sel.week, sel.day], `/api/ui/plan?${new URLSearchParams(Object.entries(sel).filter(([, v]) => v) as [string, string][])}`);
export const useRun = (id?: number) => q<RunPage>(["ui", "run", id], `/api/ui/run/${id}`, !!id);
export interface CalendarMonth { ok: true; month: string; week_start: number; today: string; first: string; last: string;
  race: { date: string; label: string } | null; stats: Record<string, unknown>;
  days: Record<string, { planned: { kind: string; title: string; km: number | null; status: string; race: boolean; moved_to: string | null }[];
                         runs: { id: number; km: number; z: number | null; pace: string | null; t: string | null }[];
                         other: boolean; in_plan: boolean }>;
  weeks: { start: string; planned_km: number; ran_km: number }[] }
export const useCalendar = (month?: string) => q<CalendarMonth>(["ui", "calendar", month], `/api/ui/calendar${month ? `?month=${month}` : ""}`);
export const usePlanCalendar = (month?: string) => q<PlanCalendar>(["ui", "plancal", month], `/api/plan/calendar${month ? `?month=${month}` : ""}`);
export interface RunsLog { ok: true; month: string; range: string | null; km: number;
  runs: { id: number; date: string; dow: string; time: string | null; km: number; pace: string | null; z: number | null; hr: number | null;
          min: number | null; kind: string; verdict: string | null; verdict_text: string | null }[];
  weeks: { start: string; km: number; runs: number; ids: number[] }[] }
export const useRunsLog = (month?: string, range?: string | null) =>
  q<RunsLog>(["ui", "runslog", month, range], `/api/ui/runs?${new URLSearchParams(Object.entries({ month, range }).filter(([, v]) => v) as [string, string][])}`);
export const useRunsMonth = (month?: string) => q<RunsMonth>(["ui", "runs", month], `/api/runs${month ? `?month=${month}` : ""}`);
export const useRacePlan = (target?: string) => q<RacePlanT>(["ui", "race", target], `/api/race/plan${target ? `?target=${encodeURIComponent(target)}` : ""}`);
export const useProfile = (id?: number) => q<Profile>(["ui", "profile", id], `/api/activity/${id}/profile`, !!id);
export const useRunMap = (id?: number) => q<{ has_gps: boolean; path: [number, number][] }>(["ui", "map", id], `/api/activity/${id}/map`, !!id);
export const useCoach = () => q<{ ok: boolean; enabled: boolean; available: boolean; messages: CoachMsg[] }>(["ui", "coach"], "/api/coach/messages");
export const postJSON = <T,>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

// The check-in posts to the endpoint Classic already uses (readiness owns the rule set).
export interface Checkin { energy: "" | "good" | "ok" | "heavy"; sleep: "" | "good" | "ok" | "poor"; note: string; stop_symptom: boolean }
export const postCheckin = (b: Checkin) =>
  api<{ ok: boolean }>("/api/readiness", { method: "POST", body: JSON.stringify(b) });
