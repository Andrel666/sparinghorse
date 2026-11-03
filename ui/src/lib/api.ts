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
          held: { key: string; name: string; text: string } | null } | null;
  latest_run: { id: number; date: string; km: number; pace: string | null; hr: number | null;
                verdict: string | null; verdict_text: string | null } | null;
}

// ── one hook per page ──
export const useToday = () => useQuery({ queryKey: ["ui", "today"], queryFn: () => api<TodayPage>("/api/ui/today") });

// The check-in posts to the endpoint Classic already uses (readiness owns the rule set).
export interface Checkin { energy: "" | "good" | "ok" | "heavy"; sleep: "" | "good" | "ok" | "poor"; note: string; stop_symptom: boolean }
export const postCheckin = (b: Checkin) =>
  api<{ ok: boolean }>("/api/readiness", { method: "POST", body: JSON.stringify(b) });
