import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/tokens.css";
import "./styles/base.css";
import { PAGES } from "./lib/pages";
import { Shell } from "./components/Shell";
import { Frame } from "./components/Frame";
import { FeedbackProvider } from "./components/feedback";
import { Today } from "./pages/Today";
import { lazy, Suspense } from "react";
import { State } from "./components/ui";

// Every page but Today loads when first opened (the map library only ships with Runs).
const lazyPage = (load: () => Promise<Record<string, () => JSX.Element>>, name: string) =>
  lazy(() => load().then(m => ({ default: m[name] })));

// The component for each entry in PAGES (the page list stays the one source for navigation).
const BUILT: Record<string, React.ComponentType> = {
  "/": Today,
  "/road": lazyPage(() => import("./pages/Plan"), "Plan"),
  "/goal": lazyPage(() => import("./pages/Goal"), "Goal"),
  "/log": lazyPage(() => import("./pages/Runs"), "Runs"),
  "/fitness": lazyPage(() => import("./pages/Fitness"), "Fitness"),
  "/body": lazyPage(() => import("./pages/Body"), "Body"),
  "/settings": lazyPage(() => import("./pages/Settings"), "Settings"),
  "/music": lazyPage(() => import("./pages/Music"), "Music"),
};

/** An old address lands on its new home with its query and hash (the plan's History now lives on Goal). */
function Redirect({ to }: { to: string }) {
  const loc = useLocation();
  const q = new URLSearchParams(loc.search);
  if (q.get("view") === "history") return <Navigate to="/goal#history" replace />;
  const [path, extra] = to.split("?");
  const merged = new URLSearchParams(extra); q.forEach((v, k) => merged.set(k, v));
  const qs = merged.toString();
  return <Navigate to={`${path}${qs ? `?${qs}` : ""}${loc.hash}`} replace />;
}

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: true, retry: 1 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <FeedbackProvider><Shell><Frame>
          <Suspense fallback={<State>Loading…</State>}><Routes>
            {PAGES.map(p => {
              if (p.redirect) return <Route key={p.path} path={p.path} element={<Redirect to={p.redirect} />} />;
              const C = BUILT[p.path];
              return <Route key={p.path} path={p.path} element={<C />} />;
            })}
          </Routes></Suspense>
        </Frame></Shell></FeedbackProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

// the offline shell, in the built app only (dev serves modules the worker must not pin)
if (import.meta.env.PROD && "serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
