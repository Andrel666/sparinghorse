import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./styles/tokens.css";
import "./styles/base.css";
import { PAGES } from "./lib/pages";
import { Shell } from "./components/Shell";
import { Today } from "./pages/Today";
import { NotYet } from "./pages/NotYet";
import { Fitness } from "./pages/Fitness";

// Pages that exist; every other entry in PAGES shows NotYet until it is built.
const BUILT: Record<string, () => JSX.Element> = { "/": Today, "/fitness": Fitness };

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: true, retry: 1 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Shell>
          <Routes>
            {PAGES.map(p => {
              const C = BUILT[p.path];
              return <Route key={p.path} path={p.path} element={C ? <C /> : <NotYet page={p} />} />;
            })}
          </Routes>
        </Shell>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
