# perps-platform

Perpetual futures trading — matching engine, Redis event bus, Postgres persistence, TanStack trading UI.

**[Run the local demo →](docs/DEMO.md)**

## Demo

<!-- DEMO_VIDEO: Paste a hosted URL below, or commit docs/assets/demo/overview.mp4 and link it here -->
<!-- Example: https://www.youtube.com/watch?v=YOUR_VIDEO_ID -->

> **Video:** Add `docs/assets/demo/overview.mp4` or paste a hosted walkthrough URL above.

| | |
| --- | --- |
| ![Trading dashboard](docs/assets/demo/dashboard.png) | ![Live orderbook](docs/assets/demo/orderbook.png) |
| *Dashboard — `docs/assets/demo/dashboard.png`* | *Orderbook — `docs/assets/demo/orderbook.png`* |

More screenshot slots: [`docs/assets/demo/README.md`](docs/assets/demo/README.md)

## Quick start

1. Redis + Postgres running locally  
2. `cp .env.example .env`  
3. Follow **[docs/DEMO.md](docs/DEMO.md)** (install → migrate → 5 services → `bun run simulate:orderbook`)  
4. Login: `demo@perps.local` / `demo1234`

## Architecture

```mermaid
flowchart LR
  FE[frontend :3000]
  API[api :3003]
  TE[trade-engine]
  WS[ws :8081]
  DBP[db-poller]
  R[(Redis)]
  PG[(Postgres)]

  FE --> API
  FE --> WS
  API --> R
  R --> TE
  TE --> R
  R --> API
  R --> WS
  R --> DBP
  API --> PG
  DBP --> PG
```

## Services

| Service | Port | Run from root |
| --- | --- | --- |
| `tanstack-frontend` | 3000 | `bun run dev --filter=tanstack-frontend` |
| `api` | 3003 | `bun run dev --filter=api` |
| `wsserver` | 8081 | `bun run dev --filter=wsserver` |
| `trade-engine` | — | `bun run dev --filter=trade-engine` |
| `db-poller` | — | `bun run dev --filter=db-poller` |
| `price-poller` | — | optional |
| `timescale-db` | — | optional, needs `DB_URL` |

Env vars: [`.env.example`](.env.example). Do **not** use root `bun run dev` for the standard demo (it starts Timescale without `DB_URL`).

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run simulate:orderbook` | Full demo seed + live BTC book |
| `bun run demo:seed` | Postgres seed only |
| `bun run check-types` | Typecheck all packages |
| `bun run lint` | Lint all packages |

## Docs

- **[Demo setup](docs/DEMO.md)** — step-by-step local runbook  
- **[Demo media](docs/assets/demo/README.md)** — where to add screenshots & video  
- [Funding rate notes](notes/FUNDING_RATE.md)  
- [Nginx API cluster](nginx/README.md)  
- [Timescale (optional)](apps/timescale-db/README.md)

## Repo layout

```
apps/           api, trade-engine, wsServer, db-poller, tanstack-frontend, …
packages/       database (Prisma), sharedTypes, ui
scripts/        demo-seed, simulate-orderbook
docs/           DEMO.md, assets/demo/
```
