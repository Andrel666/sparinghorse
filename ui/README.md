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
npm run dev                   # http://127.0.0.1:5180
```

Open the new UI on the **same host name** as the server (both `127.0.0.1`, or both `localhost`): the
login cookie is per host name, so signing in once on the server signs in the new UI too. API calls
are forwarded to the server (`SH_API`, default `http://127.0.0.1:8770`).

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

Built so far: Today. The other pages link to their Classic equivalent until they are built.
