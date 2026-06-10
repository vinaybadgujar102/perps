# nginx load balancing (local)

## 1. Include this config

In Homebrew nginx (`/opt/homebrew/etc/nginx/nginx.conf`), inside `http { }`:

```nginx
include /Users/YOUR_USER/Desktop/Developer/perps-platform/nginx/perps-api.conf;
```

Or symlink/copy to `~/nginx-lab/` if you already use that folder.

**Important:** Disable the default Homebrew `server { listen 8080; ... }` block (static `html/`), or it will conflict and return nginx 404s instead of proxying.

```bash
nginx -t && nginx -s reload
```

## 2. Run three API instances

From `apps/api`:

```bash
bun run dev:cluster
```

Stop the cluster:

```bash
bun run dev:cluster:stop
```

Backends: `3001`, `3002`, `3003`.

## 3. Test

```bash
# Direct
curl http://localhost:3001/api/v1/ping

# Through nginx (port 8080)
curl -s http://localhost:8080/api/v1/ping
curl -sI http://localhost:8080/api/v1/ping | grep -i x-upstream

for i in {1..9}; do curl -s http://localhost:8080/api/v1/ping | jq .data.port; done
```

## 4. Frontend via Vite

```bash
VITE_API_PROXY_TARGET=http://localhost:8080 bun run dev --filter=web
```
