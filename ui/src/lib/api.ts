// The one API client. Every page's data comes from one /api/ui/* endpoint that already holds the
// decisions and the wording; this file only fetches it and types it.
import { useQuery } from "@tanstack/react-query";

export class ApiError extends Error {
  constructor(public status: number, message: string, public login?: string) { super(message); }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { credentials: "include", ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = await r.json().catch(() => null);
  if (!r.ok || (body && body.ok === false)) {
    throw new ApiError(r.status, (body && body.error) || `HTTP ${r.status}`, body && (body.login || body.setup));
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
}
export interface Held { key: string; name: string; text: string }
export interface TodayPage {
  ok: true; today: string; sync_minutes: number | null;
  race: { label: string; date: string; type: string; days: number; target: string | null } | null;
  readiness: { verdict: Verdict; halt: boolean; action: string; headline: string | null; detail: string;
               reasons: string[]; hrv: string | null;
               checkin: Checkin | null };
  session: { kind: string; title: string; km: number | null; minutes: number | null; note: string | null; done: boolean;
             actual: Actual | null; race: boolean; target: Target | null; steps: Step[]; phase: string | null;
             week: number | null };
  next: { date: string; dow: string; kind: string; title: string; km: number | null; minutes: number | null;
          strides: number; race: boolean; target: Target | null; days: number } | null;
  week: { start: string; phase: string | null; km: number; runs: number; days: Day[];
          held: Held | null } | null;
  latest_run: { id: number; date: string; km: number; pace: string | null; hr: number | null;
                verdict: string | null; verdict_text: string | null } | null;
}

export interface Tile { key: string; label: string; value: number | null; unit: string; delta: number | null;
  series: { date: string; v: number }[]; hint: string; word?: string | null }
export interface FitnessPage {
  ok: true; tiles: Tile[];
  load: { acwr: number | null; band: [number, number]; state: "high" | "low" | "in" | null; text: string | null;
          ramp: number | null; ramp_word: string | null };
  chart: { ctl: { date: string; v: number }[]; atl: { date: string; v: number }[] };
  weekly: { week: string; km: number }[];
  zones: { label: string; pace: string | null; hr: { lo: number | null; hi: number | null } | null }[];
  easy: { score: number | null; window_days: number; judged: number | null; on: number | null; hot: number | null;
          too_hard: number | null; by: string; ceiling: string | null;
          runs: { date: string; kind: string; km: number; pace: string | null; hr: number | null; verdict: string | null;
                  verdict_text: string | null }[] };
  durability: { ok: boolean; n: number | null; text: string; note: string | null };
  efficiency: { ok: boolean; verdict: string | null; text: string };
  track: { scored: number; text: string };
}

export interface SessionDetail { date: string; kind: string; title: string; km: number | null; minutes: number | null;
  note: string | null; race: boolean; strides: number; target: Target | null; steps: Step[]; actual: Actual | null;
  moved_to: string | null; status: string }
export interface Limit { key: string; name: string; laid: number; ceiling: number; unit: string; holds: boolean;
  over: boolean; fill: number | null }
export interface PlanPage {
  ok: true; today: string;
  race: { label: string; date: string; type: string; target: string | null; prediction: string | null;
          lo: string | null; hi: string | null; verdict: string | null } | null;
  road: { start: string; phase: string | null; km: number; ran: number; current: boolean; selected: boolean; race: boolean }[];
  phases: { key: string | null; name: string | null; start: string; weeks: number }[];
  week: { start: string; end: string; phase: string | null; phase_name: string | null; n: number | null; km: number;
          intent: string | null; current: boolean; days: Day[]; held: Held | null;
          limits: Limit[]; sessions: SessionDetail[]; prev: string | null; next: string | null };
  paces: { key: string; label: string; pace: string }[];
}
export interface RunPage { ok: true; id: number; date: string; title: string; sport: string;
  stats: { k: string; v: string | null }[]; readback: { kind: string | null; summary: string | null } | null;
  verdict: string | null; verdict_text: string | null }
export interface Marker { key: string; label: string; unit: string; value: number; date: string; ref: [number | null, number | null] | null;
  good: string | null; state: "ok" | "watch" | null; stale: boolean; delta: number | null; group: string;
  series: { date: string; v: number }[] }
export interface BodyPage { ok: true; markers: Marker[]; injuries: { start: string; end: string | null; label: string | null }[] }
export interface Field { key: string; label: string; help: string; kind: string; choices: { v: string; t: string }[];
  value: string; source: string }
export interface SettingsPage { ok: true; groups: { name: string; fields: Field[] }[] }

// existing backend-decided endpoints the new UI reads as they are
export interface CalDay { date: string; kind: string; km: number | null; status: string; race?: boolean; pk?: string;
  strides?: number; actual?: Actual | null; from?: string }
export interface PlanCalendar { ok: true; month: string; week_start: number; today: string; first: string; last: string;
  start: string; end: string; race: { date: string; label: string } | null; days: Record<string, CalDay[]>;
  phase: Record<string, string> }
export interface RunsMonth { ok: true; month: string; week_start: number; first: string; last: string;
  days: Record<string, { id: number; km: number; pace: string | null; t: string; z: number | null }[]>;
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
export const useToday = page<TodayPage>("today");
export const useFitness = page<FitnessPage>("fitness");
export const useBody = page<BodyPage>("body");
export const useSettings = page<SettingsPage>("settings");
const q = <T,>(key: unknown[], path: string, enabled = true) =>
  useQuery({ queryKey: key, queryFn: () => api<T>(path), enabled, placeholderData: prev => prev });   // keep the last view while the next loads
export const usePlan = (sel: { week?: string; day?: string }) =>
  q<PlanPage>(["ui", "plan", sel.week, sel.day], `/api/ui/plan?${new URLSearchParams(Object.entries(sel).filter(([, v]) => v) as [string, string][])}`);
export const useRun = (id?: number) => q<RunPage>(["ui", "run", id], `/api/ui/run/${id}`, !!id);
export const usePlanCalendar = (month?: string) => q<PlanCalendar>(["ui", "plancal", month], `/api/plan/calendar${month ? `?month=${month}` : ""}`);
export const useRunsMonth = (month?: string) => q<RunsMonth>(["ui", "runs", month], `/api/runs${month ? `?month=${month}` : ""}`);
export const useRacePlan = (target?: string) => q<RacePlanT>(["ui", "race", target], `/api/race/plan${target ? `?target=${encodeURIComponent(target)}` : ""}`);
export const useRunMap = (id?: number) => q<{ has_gps: boolean; path: [number, number][] }>(["ui", "map", id], `/api/activity/${id}/map`, !!id);
export const useCoach = () => q<{ ok: boolean; enabled: boolean; available: boolean; messages: CoachMsg[] }>(["ui", "coach"], "/api/coach/messages");
export const postJSON = <T,>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });

// The check-in posts to the endpoint Classic already uses (readiness owns the rule set).
export interface Checkin { energy: "" | "good" | "ok" | "heavy"; sleep: "" | "good" | "ok" | "poor"; note: string; stop_symptom: boolean }
export const postCheckin = (b: Checkin) =>
  api<{ ok: boolean }>("/api/readiness", { method: "POST", body: JSON.stringify(b) });
