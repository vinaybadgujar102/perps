#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/apps/api"
PORTS=(3001 3002 3003)
PIDS=()

cleanup() {
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
}

trap cleanup EXIT INT TERM

for port in "${PORTS[@]}"; do
  if lsof -i ":$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Port $port is already in use. Stop the other process first." >&2
    exit 1
  fi
done

cd "$API_DIR"

for port in "${PORTS[@]}"; do
  echo "Starting API on port $port..."
  PORT="$port" bun run src/index.ts &
  PIDS+=("$!")
done

echo "API cluster running on ports ${PORTS[*]}. Ctrl+C to stop."
wait
