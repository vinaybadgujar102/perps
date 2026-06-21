# Demo setup

Step-by-step guide to run the full local demo with automated seeding and live BTC orderbook activity.

## Before you start

You need these running on your machine:

- [Bun](https://bun.sh) 1.3+
- Redis (`localhost:6379`)
- Postgres (`localhost:5432`)

---

## 1. Clone and install

```bash
bun install
```

## 2. Create `.env`

Copy the example file at the repo root:

```bash
cp .env.example .env
```

Minimum values (defaults in `.env.example` are fine):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
JWT_SECRET=dev-secret-change-me
PORT=3003
```

## 3. Migrate the database

```bash
cd packages/database && bun run db:migrate && cd ../..
```

## 4. Start services

Open **five separate terminals** from the repo root. Run one command per terminal, in this order:

```bash
bun run dev --filter=trade-engine
```

```bash
bun run dev --filter=api
```

```bash
bun run dev --filter=wsserver
```

```bash
bun run dev --filter=db-poller
```

```bash
bun run dev --filter=tanstack-frontend
```

Wait until each service is up before moving on.

> Do **not** use `bun run dev` at the root — it also starts `timescale-db`, which needs a separate `DB_URL`.

## 5. Run the automated demo script

In a **sixth terminal**:

```bash
bun run simulate:orderbook
```

This script:

1. Seeds Postgres (markets, sim users, demo login account)
2. Creates matching users in the trade engine with balance
3. Seeds a BTC orderbook and keeps simulating trades

When it starts, it prints the demo login credentials, for example:

```
Demo login ready: demo@perps.local / demo1234 (userId …)
```

Leave this terminal running.

## 6. Open the app

1. Go to [http://localhost:3000](http://localhost:3000)
2. Click **Login**
3. Sign in with **`demo@perps.local`** / **`demo1234`**
4. Open the **dashboard** and place orders against the live book

---

## Demo login defaults

| Field | Default |
| --- | --- |
| Email | `demo@perps.local` |
| Password | `demo1234` |

Override with `DEMO_USER_EMAIL` and `DEMO_USER_PASSWORD` in `.env`.

Set `DEMO_SEED_LOGIN_USER=false` to skip the demo account and sign up manually instead.

---

## DB-only seed (optional)

If you only need Postgres rows and **not** live orderbook simulation:

```bash
bun run demo:seed
```

You still need `simulate:orderbook` (or a manual signup) to create trade-engine users.

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `simulate:orderbook` fails on `DATABASE_URL` | Add `DATABASE_URL` to `.env` |
| API won't start | Set `PORT=3003` and `JWT_SECRET` in `.env` |
| Empty orderbook in UI | Make sure `simulate:orderbook` is still running |
| Orders don't persist | Start `db-poller` before trading |
| FK errors in db-poller logs | Re-run `simulate:orderbook` so Postgres and engine users stay in sync |
