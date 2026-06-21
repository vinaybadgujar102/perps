# timescale-db

Optional. Consumes fills from Redis and builds OHLC candles in TimescaleDB.

| | |
| --- | --- |
| Needs | `DB_URL` (separate from Prisma `DATABASE_URL`), Redis |

```bash
bun run db:init    # once
bun run dev        # from this app directory, or --filter=timescale-db from root
```

Not part of the standard demo. Chart UI still uses synthetic candles.
