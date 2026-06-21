# nginx — API load test (local)

Run three API instances behind nginx on port **8080**.

## 1. Include config

In Homebrew nginx (`/opt/homebrew/etc/nginx/nginx.conf`), inside `http { }`:

```nginx
include /path/to/perps-platform/nginx/perps-api.conf;
```

Disable the default `listen 8080` static site block if it conflicts.

```bash
nginx -t && nginx -s reload
```

## 2. Start API cluster

From repo root:

```bash
./scripts/run-api-cluster.sh
```

Stop: `./scripts/stop-api-cluster.sh`

Backends: ports `3001`, `3002`, `3003`.

## 3. Test

```bash
curl http://localhost:3001/api/v1/ping
curl http://localhost:8080/api/v1/ping
```

## 4. Frontend through nginx (optional)

```bash
VITE_API_PROXY_TARGET=http://localhost:8080 bun run dev --filter=tanstack-frontend
```
