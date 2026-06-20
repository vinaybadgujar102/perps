# timescale-db

Consumes trade fills from Redis and writes them to TimescaleDB.

## Setup

```bash
bun install
```

Initialize the database (run once):

```bash
bun run db:init
```

Drop all tables and continuous aggregates:

```bash
bun run db:drop
```

## Run consumer

```bash
bun run dev
```

Requires `DB_URL` for Postgres/TimescaleDB and Redis for `response_queue`.
