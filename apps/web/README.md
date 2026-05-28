# Web Frontend

TanStack Router trading frontend for the perps platform.

## Run

From repo root:

```bash
bun run --filter api dev
bun run --filter web dev
```

## Environment (web)

- `VITE_API_BASE_URL` (optional): defaults to `/api/v1`
- `VITE_API_PROXY_TARGET` (optional): Vite proxy target for `/api`, defaults to `http://localhost:3000`

## Current Scope

- Markets list and symbol routing
- `/trade/$symbol` exchange-style layout
- Live orderbook polling
- Chart placeholder panel
- Trade panel placeholder (auth-required actions disabled for now)
