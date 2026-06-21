# db-poller

Async Postgres writer — persists orders, fills, and closed positions from `response_queue`.

| | |
| --- | --- |
| Needs | `DATABASE_URL`, Redis |

```bash
# from repo root
bun run dev --filter=db-poller
```

Required for the demo so trades survive restarts. Full setup: [docs/DEMO.md](../../docs/DEMO.md)
