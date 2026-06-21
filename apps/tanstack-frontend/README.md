# tanstack-frontend

Trading terminal — landing, auth, dashboard (BTC + SOL).

| | |
| --- | --- |
| Port | `3000` |
| API proxy | `localhost:3003` (default) |
| WebSocket | `ws://localhost:8081` |

```bash
# from repo root
bun run dev --filter=tanstack-frontend
```

Routes: `/` landing · `/login` · `/register` · `/dashboard` (protected).

Full demo: [docs/DEMO.md](../../docs/DEMO.md)

### Demo screenshot

![Dashboard](../../docs/assets/demo/dashboard.png)
*Add `docs/assets/demo/dashboard.png` for README previews*
