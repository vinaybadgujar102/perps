# perps-platform

A perpetual futures trading platform for **BTC** and **SOL**, built as a Bun/Turborepo monorepo. An in-memory matching engine handles order placement and position management; services communicate over **Redis Streams**; orders and fills persist to **Postgres** via an async writer. A TanStack trading terminal provides the live UI.

## Status

### Working today

| Area | Details |
| --- | --- |
| Markets | **BTC** and **SOL** — switch markets in the dashboard header |
| Trading | Limit and market orders, cancel open orders, close positions, up to 20× leverage |
| Realtime | Live orderbook depth, index price, and last trade over WebSocket |
| Account | Positions, open orders, closed positions, order history, fills, deposit history |
| Balances | New engine users start with **$100,000** margin (credited on signup) |
| Funding | Periodic funding settlement in the trade engine |
| Onramp | Razorpay payment-order flow + direct balance credit stub |
| Persistence | Orders, fills, closed positions, and payments written to Postgres via `db-poller` |
| Demo | One-shot DB seed (`demo:seed`) and live orderbook simulator (`simulate:orderbook`) |

### Partial / in progress

| Area | Notes |
| --- | --- |
| Price chart | UI renders **synthetic demo candles** per market — not yet wired to Timescale OHLC |
| Orderbook sim | [`scripts/simulate-orderbook.ts`](scripts/simulate-orderbook.ts) seeds **BTC** liquidity only |
| Timescale | [`apps/timescale-db`](apps/timescale-db) ingests fills and builds 1m/5m candles — optional, requires `DB_URL` |
| Rust engine | [`apps/trade-engine-rust`](apps/trade-engine-rust) is an early scaffold; production path uses the TypeScript engine |

## Stack

| Layer | Tech |
| --- | --- |
| Runtime / monorepo | Bun 1.3, Turborepo |
| API | Express ([`apps/api`](apps/api)) |
| Engine | In-memory matcher ([`apps/trade-engine`](apps/trade-engine)) |
| Message bus | Redis Streams (`send_queue`, `response_queue` — [`packages/sharedTypes/src/enums.ts`](packages/sharedTypes/src/enums.ts)) |
| Realtime | WebSocket server on **8081** ([`apps/wsServer`](apps/wsServer)) |
| Persistence | Prisma + Postgres ([`packages/database`](packages/database)) |
| Frontend | TanStack Start + Vite on **3000** ([`apps/tanstack-frontend`](apps/tanstack-frontend)) |
| Optional | [`price-poller`](apps/price-poller) (Backpack mark prices), [`timescale-db`](apps/timescale-db) (candles/analytics) |

## Architecture

```mermaid
flowchart LR
  FE[tanstack-frontend:3000]
  API[api:3003]
  TE[trade-engine]
  WS[wsServer:8081]
  DBP[db-poller]
  R[(Redis Streams)]
  PG[(Postgres)]

  FE -->|REST /api/v1| API
  FE -->|WS| WS
  API -->|xAdd send_queue| R
  R -->|xRead| TE
  TE -->|xAdd response_queue| R
  R -->|correlate requests| API
  R -->|depth/trades/index| WS
  R -->|orders/fills| DBP
  API --> PG
  DBP --> PG
```

**How messages flow:** The API writes commands (create order, cancel, get account state) to `send_queue` with a `requestId`. The trade-engine is the sole consumer — it matches orders, updates positions, and publishes to `response_queue`. The API worker reads `response_queue` and correlates responses back to the HTTP caller via `requestId`. Separately, the engine broadcasts market events (depth updates, trades, index price) that `wsServer` fans out to WebSocket clients and `db-poller` persists to Postgres.

## Service map

| Service | Port | Redis role | Other deps |
| --- | --- | --- | --- |
| `trade-engine` | — | Consumes `send_queue`, publishes `response_queue` | Loads snapshot on boot |
| `api` | `PORT` (demo: **3003**) | Produces `send_queue`, consumes `response_queue` | `DATABASE_URL`, `JWT_SECRET` |
| `wsserver` | **8081** | Consumes `response_queue`, broadcasts to clients | — |
| `db-poller` | — | Consumes `response_queue` | `DATABASE_URL` |
| `price-poller` | — | Produces mark-price ticks → `send_queue` | Backpack WS (optional for demo) |
| `tanstack-frontend` | **3000** | — | Proxies API to `localhost:3003` |
| `timescale-db` | — | Consumes `response_queue` | `DB_URL` (separate from Prisma DB) |

## Prerequisites

- [Bun](https://bun.sh) 1.3+ (`packageManager: bun@1.3.5`)
- Redis running locally
- Postgres running locally

## Environment variables

Copy [`.env.example`](.env.example) to `.env` at the **repo root** and adjust as needed. Bun auto-loads it when running services via turbo from the root.

```bash
# .env — minimum for the standard demo
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
JWT_SECRET=dev-secret-change-me
PORT=3003
```

Frontend overrides live in [`apps/tanstack-frontend/.env.example`](apps/tanstack-frontend/.env.example) (optional — defaults work locally).

### Required for core demo

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | api, db-poller, Prisma migrate, demo scripts | Postgres connection string |
| `JWT_SECRET` | api auth | Any random string for local dev |
| `PORT` | api | **No default in code** — set `3003` for the frontend proxy |

### Demo / simulator

| Variable | Default | Notes |
| --- | --- | --- |
| `DEMO_USER_EMAIL` | `demo@perps.local` | Login account created by `demo:seed` / simulator |
| `DEMO_USER_PASSWORD` | `demo1234` | Password for the demo login account |
| `DEMO_SEED_LOGIN_USER` | `true` | Set `false` to skip demo login user seeding |
| `DEMO_LOGIN_BALANCE_USD` | `100000000` | Engine balance credited to demo user (scaled USD) |
| `SIM_*`, `REDIS_URL` | see script header | Tunables for [`scripts/simulate-orderbook.ts`](scripts/simulate-orderbook.ts) |

### Optional / feature-specific

| Variable | Used by |
| --- | --- |
| `ADMIN_API_SECRET` | api admin routes |
| `RAZORPAY_TEST_API_KEY`, `RAZORPAY_TEST_SECRET_KEY` | onramp |
| `FUNDING_INTERVAL_MS` | trade-engine (default 8h) |
| `VITE_API_PROXY_TARGET`, `VITE_WS_URL` | frontend (defaults: `http://localhost:3003`, `ws://localhost:8081`) |
| `DB_URL` | timescale-db only |

Most services connect to Redis via `createClient()` with the default `redis://localhost:6379`. Only the orderbook simulator documents `REDIS_URL`.

## Startup order

Services have dependencies — start them in this order:

1. **Redis** — all services block on connect
2. **Postgres** + migrate: `cd packages/database && bun run db:migrate`
3. **trade-engine** — must be running before commands get processed
4. **api** — needs Redis, DB, and engine for order flow (`PORT=3003`)
5. **wsserver** — live UI needs this for depth/trades/index price
6. **db-poller** — async Postgres writer for orders/fills
7. **price-poller** — optional; mark prices for liquidations/index (or use the simulator)
8. **tanstack-frontend** — last; hits api + ws
9. **simulate:orderbook** — dev BTC liquidity after engine is running

> **Note:** `bun run dev` at the root runs **all** turbo `dev` tasks, including `timescale-db` which requires `DB_URL`. For the standard demo, use per-service filters instead (see below).

## Demo script

Copy-paste setup (~5 minutes):

```bash
# 1. Install + DB (Redis and Postgres must already be running)
bun install
# create .env at repo root (see Environment variables above)
cd packages/database && bun run db:migrate && cd ../..

# 2. Core services (separate terminals, or background with &)
bun run dev --filter=trade-engine
bun run dev --filter=api
bun run dev --filter=wsserver
bun run dev --filter=db-poller
bun run dev --filter=tanstack-frontend

# 3. Seed Postgres + demo login + BTC orderbook liquidity
bun run simulate:orderbook

# 4. Open http://localhost:3000 → /login → /dashboard
#    Demo account: demo@perps.local / demo1234
#    (or sign up — new users also receive $100k engine balance)
```

Ensure `.env` has `PORT=3003`, `JWT_SECRET`, and `DATABASE_URL` before starting the api.

### DB-only seed (no simulator)

If you only need Postgres rows (markets, sim users, demo login) without live orderbook activity:

```bash
bun run demo:seed
```

The simulator runs this automatically on startup when `DATABASE_URL` is set.

## Liquidity for demo

The orderbook starts empty. Use [`scripts/simulate-orderbook.ts`](scripts/simulate-orderbook.ts) to seed a multi-level **BTC** book and simulate realistic activity:

```bash
bun run simulate:orderbook
```

**What it does:** seeds markets and sim users in Postgres, creates a demo login account, registers sim users in the engine, places resting limit orders, executes crosses, and refreshes liquidity on a jittered interval.

**Requires:** Redis + trade-engine (+ wsserver for live depth/trade UI, db-poller for persisted fills).

**Tunable via env:** `SIM_MID_PRICE`, `SIM_SPREAD`, `SIM_TRADE_PROB`, `SIM_DEPTH_LEVELS`, and more — see the script header for the full list.

## Testing

```bash
# Typecheck + lint (all packages)
bun run check-types
bun run lint

# Trade engine unit tests (matching, PnL, liquidation, leverage)
cd apps/trade-engine && bun test

# API tests
cd apps/api && bun test

# Frontend tests
cd apps/tanstack-frontend && bun test
```

## Monorepo layout

```
apps/
  api/                 REST + Redis producer/consumer
  trade-engine/        Matching engine (production)
  trade-engine-rust/   Rust engine scaffold (WIP)
  wsServer/            WebSocket fanout
  db-poller/           Postgres writer
  price-poller/        External mark prices (optional)
  timescale-db/        Fill → OHLC consumer (optional)
  tanstack-frontend/   Trading UI (BTC + SOL)
packages/
  database/            Prisma schema + client
  sharedTypes/         Queues, events, asset config (@repo/sharedtypes)
  ui/                  Shared UI primitives
scripts/
  demo-seed.ts         Postgres demo seed
  simulate-orderbook.ts  Live BTC orderbook simulator
  run-api-cluster.sh   Multi-instance API for nginx load tests
```

## Further reading

- [`notes/FUNDING_RATE.md`](notes/FUNDING_RATE.md) — funding rate implementation
- [`nginx/README.md`](nginx/README.md) — API cluster load test (ports 3001–3003 → nginx 8080)
- [`apps/timescale-db/README.md`](apps/timescale-db/README.md) — optional Timescale setup
