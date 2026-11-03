// Loading, sign-in and error states for any page's query — one component, so no page repeats them.
import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "../lib/api";
import { CLASSIC } from "../lib/pages";
import { State } from "../components/ui";

export function Query<T>({ q, children }: { q: UseQueryResult<T>; children: (d: T) => ReactNode }) {
  if (q.isPending) return <State>Loading…</State>;
  if (q.isError) {
    const e = q.error as ApiError;
    if (e.status === 401) return <State>
      <p><b>Sign in first.</b> The new UI uses the same login as Sparing Horse.</p>
      <p><a className="btn primary" href={`${CLASSIC}${e.login || "/login"}`}>Sign in</a></p>
      <p className="muted">Then come back to this page and reload.</p></State>;
    return <State><p><b>Couldn't load this page.</b></p><p className="muted">{e.message}</p>
      <button className="btn" onClick={() => q.refetch()}>Try again</button></State>;
  }
  return <>{children(q.data as T)}</>;
}
