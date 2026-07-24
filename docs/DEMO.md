# Demo setup

Run the full local demo end to end.

**Prerequisites:** [Bun](https://bun.sh) 1.3+, Redis, Postgres.

---

## 1. Install

```bash
bun install
```

## 2. Environment

```bash
cp .env.example .env
```

Required in `.env`:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
JWT_SECRET=dev-secret-change-me
PORT=3003
REDIS_URL=redis://localhost:6379
```

## 3. Migrate database

```bash
cd packages/database && bun run db:migrate && cd ../..
```

## 4. Start services

Five terminals from the **repo root**, one command each:

```bash
bun run dev --filter=trade-engine
bun run dev --filter=api
bun run dev --filter=wsserver
bun run dev --filter=db-poller
bun run dev --filter=tanstack-frontend
```

> Do not run root `bun run dev` — it also starts `timescale-db`, which needs `DB_URL`.

## 5. Run automated demo

Sixth terminal:

```bash
bun run simulate:orderbook
```

This seeds Postgres + trade-engine users and simulates a live BTC orderbook. Keep it running.

Expected output includes:

```
Demo login ready: demo@perps.local / demo1234 (userId …)
```

## 6. Use the app

1. Open [http://localhost:3000](http://localhost:3000)
2. **Login** → `demo@perps.local` / `demo1234`
3. Open **Dashboard** and place orders

---

## Hosted demo

For a production-hosted demo **without** TimescaleDB / a second Postgres for candles:

```bash
HOSTED_DEMO=true
DATABASE_URL=…          # Prisma app DB (still required)
REDIS_URL=…             # shared Redis for all services
JWT_SECRET=…
PORT=3003
# Do NOT set DB_URL — API serves static fake candles instead
SNAPSHOTING_INTERVAL_MS=3600000   # optional; default is already 1h
```

Frontend (e.g. `apps/tanstack-frontend/.env`):

```bash
VITE_HOSTED_DEMO=true   # chart stays on static candles (no live WS bar updates)
```

**Services to run:** `trade-engine`, `api`, `wsserver`, `db-poller`, `tanstack-frontend`, and `bun run simulate:orderbook`.

**Skip:** `timescale-db` and any Timescale Postgres instance.

**What `HOSTED_DEMO` changes:**

| Area | Behavior |
|------|----------|
| Candles | Static synthetic 1m/5m OHLC from the API (no Timescale) |
| Simulator | Low-volume defaults (~9s ticks, ~2% trade probability, thinner book) |
| Snapshots | Every 1 hour, then `XTRIM MAXLEN 0` on `send_queue` + `response_queue`, reset engine cursor to `"0"` |
| Redis consumers | `REDIS_URL` wired everywhere; api/db-poller start at `"$"` in hosted mode |

---

## Demo login


|          | Default            |
| -------- | ------------------ |
| Email    | `demo@perps.local` |
| Password | `demo1234`         |


Override with `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` in `.env`.  
Set `DEMO_SEED_LOGIN_USER=false` to skip and sign up manually.

## DB-only seed

Postgres rows without live simulation:

```bash
bun run demo:seed
```

Still need `simulate:orderbook` or signup for trade-engine users.

## Troubleshooting


| Problem                 | Fix                               |
| ----------------------- | --------------------------------- |
| `DATABASE_URL` required | Add to `.env`                     |
| API won't start         | Set `PORT=3003` and `JWT_SECRET`  |
| Empty orderbook         | Keep `simulate:orderbook` running |
| Orders don't save       | Start `db-poller`                 |
| FK errors in db-poller  | Re-run `simulate:orderbook`       |
| Redis connection fails  | Set `REDIS_URL` for all services  |


## Record a demo

Use these slots when capturing video or screenshots — see [`assets/demo/README.md`](assets/demo/README.md):


| Asset           | Suggested content                                  |
| --------------- | -------------------------------------------------- |
| `overview.mp4`  | Full flow: login → market order → position updates |
| `positions.png` | Positions / order history tabs                     |
| `deposit.png`   | Deposit dialog (optional)                          |
