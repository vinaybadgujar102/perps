#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_DIR="$ROOT/apps/api"
PORTS=(3001 3002 3003)
STOPPED=0

stop_pid() {
  local pid="$1"
  local port="$2"

  if ! kill -0 "$pid" 2>/dev/null; then
    return
  fi

  local cwd
  cwd="$(lsof -p "$pid" 2>/dev/null | awk '/cwd/{print $NF}' | head -1)"

  if [[ "$cwd" != "$API_DIR" ]]; then
    echo "Skipping port $port (PID $pid) — not perps-platform API (cwd: ${cwd:-unknown})" >&2
    return
  fi

  kill "$pid" 2>/dev/null || true
  echo "Stopped API on port $port (PID $pid)"
  STOPPED=$((STOPPED + 1))
}

for port in "${PORTS[@]}"; do
  pids="$(lsof -i ":$port" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    echo "Port $port: nothing listening"
    continue
  fi

  while read -r pid; do
    [[ -n "$pid" ]] || continue
    stop_pid "$pid" "$port"
  done <<< "$pids"
done

if [[ "$STOPPED" -eq 0 ]]; then
  echo "No perps-platform API cluster processes were stopped."
else
  echo "Stopped $STOPPED instance(s)."
fi
