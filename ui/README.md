# Sparing Horse — new UI (fork)

A thin React front end over the Sparing Horse server. The server computes every number, verdict and
sentence (one endpoint per page, `sh_ui_api.py`); this app only lays it out. Classic stays at the
server's own address; the new UI runs on its own port.

## Run it

```bash
# 1. the server (Classic + the API), as always
./run.sh                      # http://127.0.0.1:8770

# 2. the new UI, in a second terminal
cd ui
npm install                   # once
npm run dev                   # http://localhost:5180
```

Use **localhost** for both: open the new UI at `http://localhost:5180` and sign in to the server at
`http://localhost:8770` (the login cookie is per host name, so `127.0.0.1` and `localhost` don't share
it). If the new UI says "Sign in first", its button opens the server's login on the right host name.
API calls are forwarded to the server (`SH_API`, default `http://127.0.0.1:8770`).

After pulling changes that touch the server (`sh_ui_api.py`, `SparingHorse.py`), **restart the
server** — a page endpoint the running server doesn't have yet answers 404.

`npm run build` writes `dist/`; `npm run preview` serves that build on the same port with the same
forwarding. `npm test` runs the unit tests, `npm run typecheck` the type check.

## Where things live (one place each)

| What | File |
|---|---|
| Colours, type scale, spacing, shape | `src/styles/tokens.css` |
| Building blocks (card, stat, pill, list, week strip, steps) | `src/components/` |
| Pages and navigation (router, sidebar, tab bar) | `src/lib/pages.ts` |
| Turning values into text | `src/lib/format.ts` |
| API client, types, one data hook per page | `src/lib/api.ts` |
| Page data, decided and worded | `sh_ui_api.py` (server) |

## Pages

| Page | Shows | Data |
|---|---|---|
| Today | readiness, today's session (or the next one), check-in, the week, the latest run | `/api/ui/today` |
| Plan | the road to the race; Week (days, sessions, the limits that size it, paces), Month, Race day, History | `/api/ui/plan`, `/api/plan/calendar`, `/api/race/plan`, `/api/plandrift` |
| Runs | calendar with totals; a run's numbers, read-back, verdict and map | `/api/runs`, `/api/ui/run/<id>`, `/api/activity/<id>/map` |
| Fitness | shape tiles, fitness & fatigue, load, weekly distance, zones, easy-run check, durability, efficiency, track record | `/api/ui/fitness` |
| Body | resting HR, sleep, weight, lab values with their state; injury history | `/api/ui/body` |
| Coach | the coach chat (switch it on in Settings) | `/api/coach/*` |
| Settings | typed settings, calibration (keys and connections stay in Classic) | `/api/ui/settings`, `/api/settings`, `/api/calibration*` |

Every page but Today loads when first opened; the map library only ships with Runs.

## Docker

`docker compose up -d` also starts `sparinghorse-ui` on port 5180: nginx serving the built app and
forwarding the API and icons to the `sparinghorse` container (`SH_API_UPSTREAM`).
