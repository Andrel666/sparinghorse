// One hook for every button that changes something: POST, then refresh the pages, then say what happened.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { postJSON } from "./api";
import { useFeedback, type ConfirmSpec } from "../components/feedback";
import type { ReactNode } from "react";

export interface ActionOpts<T, A = void> { confirm?: ConfirmSpec | ((a: A) => ConfirmSpec); done?: (r: T) => ReactNode | null; fail?: string; refresh?: boolean }

export function useAction<T = { ok: boolean }, A = void>(path: string | ((a: A) => string), body?: (a: A) => unknown, opts: ActionOpts<T, A> = {}) {
  const qc = useQueryClient();
  const { confirm, toast } = useFeedback();
  const m = useMutation({
    mutationFn: async (a: A) => {
      const spec = typeof opts.confirm === "function" ? opts.confirm(a) : opts.confirm;
      if (spec && !(await confirm(spec))) return null;
      return postJSON<T>(typeof path === "function" ? path(a) : path, body ? body(a) : {});
    },
    onSuccess: r => {
      if (r === null) return;
      if (opts.refresh !== false) qc.invalidateQueries();
      const msg = opts.done?.(r);
      if (msg) toast(msg, "ok");
    },
    onError: e => toast(`${opts.fail || "That didn't work"}: ${(e as Error).message}`, "bad"),
  });
  return m;
}
