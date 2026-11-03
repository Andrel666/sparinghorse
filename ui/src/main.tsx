import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/tokens.css";
import "./styles/base.css";
import { PAGES } from "./lib/pages";
import { Shell } from "./components/Shell";
import { Today } from "./pages/Today";
import { lazy, Suspense } from "react";
import { State } from "./components/ui";

// Every page but Today loads when first opened (the map library only ships with Runs).
const lazyPage = (load: () => Promise<Record<string, () => JSX.Element>>, name: string) =>
  lazy(() => load().then(m => ({ default: m[name] })));

// The component for each entry in PAGES (the page list stays the one source for navigation).
const BUILT: Record<string, React.ComponentType> = {
  "/": Today,
  "/plan": lazyPage(() => import("./pages/Plan"), "Plan"),
  "/runs": lazyPage(() => import("./pages/Runs"), "Runs"),
  "/fitness": lazyPage(() => import("./pages/Fitness"), "Fitness"),
  "/body": lazyPage(() => import("./pages/Body"), "Body"),
  "/coach": lazyPage(() => import("./pages/Coach"), "Coach"),
  "/settings": lazyPage(() => import("./pages/Settings"), "Settings"),
};

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: true, retry: 1 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Shell>
          <Suspense fallback={<State>Loading…</State>}><Routes>
            {PAGES.map(p => {
              const C = BUILT[p.path];
              return <Route key={p.path} path={p.path} element={<C />} />;
            })}
          </Routes></Suspense>
        </Shell>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
