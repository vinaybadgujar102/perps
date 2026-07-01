# timescale-db

Optional. Consumes fills from Redis and builds OHLC candles in TimescaleDB.

| | |
| --- | --- |
| Needs | `DB_URL` (separate from Prisma `DATABASE_URL`), Redis |

```bash
# Set DB_URL in repo-root .env (see .env.example).
# If local Postgres already uses localhost:5432, map Docker Timescale to 5433:
#   docker run -p 5433:5432 -e POSTGRES_PASSWORD=password timescale/timescaledb:latest-pg18

bun run db:init    # once
bun run dev        # from this app directory, or --filter=timescale-db from root
```

Not part of the standard demo. Chart UI still uses synthetic candles.
