# api

Express REST API. Publishes commands to Redis `send_queue`, correlates responses from `response_queue`, talks to Postgres.

| | |
| --- | --- |
| Port | `3003` (set `PORT` in root `.env`) |
| Needs | `DATABASE_URL`, `JWT_SECRET`, Redis, trade-engine |
| Optional | `DB_URL` — TimescaleDB for `GET /market/:symbol/candles` |

```bash
# from repo root
bun run dev --filter=api
```

Full demo: [docs/DEMO.md](../../docs/DEMO.md)
