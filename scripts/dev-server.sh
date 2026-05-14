#!/usr/bin/env bash
#
# Dev server harness for the k3s VM that hosts the Cloudflare tunnel.
#
# What this does, in order:
#   1. Starts `kubectl port-forward svc/postgres 5433:5432` in the background
#      so the dev server can reach the in-cluster Postgres at localhost:5433.
#   2. Sets DEV_TUNNEL=1 so vite.config.ts switches into tunnel mode.
#   3. Runs `pnpm dev --host` (binds 0.0.0.0:5173).
#   4. On Ctrl-C or exit, kills the port-forward cleanly.
#
# Pair this with the cloudflared deployment on the same node patched for
# `hostNetwork: true`, and a Cloudflare Public Hostname pointing
# dev.joaomvieira.com → http://localhost:5173 — see docs/DEV_TUNNEL.md.
#
# Env vars you can override:
#   HEALTH_NS         k8s namespace housing Postgres   (default: health-dashboard-ns)
#   LOCAL_PG_PORT     host port for port-forward       (default: 5433)
#   DEV_TUNNEL_HOST   public hostname for HMR / Vite   (default: dev.joaomvieira.com)
#
# Requires: kubectl (configured), pnpm, nc (netcat) for the readiness probe.

set -euo pipefail

NS="${HEALTH_NS:-health-dashboard-ns}"
LOCAL_PG_PORT="${LOCAL_PG_PORT:-5433}"
TUNNEL_HOST="${DEV_TUNNEL_HOST:-dev.joaomvieira.com}"

echo "→ port-forward postgres :$LOCAL_PG_PORT  (namespace: $NS)"
kubectl -n "$NS" port-forward svc/postgres "$LOCAL_PG_PORT":5432 \
	>/tmp/dev-pg-forward.log 2>&1 &
PG_PID=$!

cleanup() {
	echo
	echo "→ stopping port-forward (pid $PG_PID)"
	kill "$PG_PID" 2>/dev/null || true
	wait "$PG_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# Wait up to 10s for the port-forward to accept connections.
ready=0
for _ in $(seq 1 20); do
	if (echo >/dev/tcp/127.0.0.1/"$LOCAL_PG_PORT") 2>/dev/null; then
		ready=1
		break
	fi
	sleep 0.5
done
if [[ "$ready" -ne 1 ]]; then
	echo "✗ port-forward never became ready. Last log lines:"
	tail -n 20 /tmp/dev-pg-forward.log || true
	exit 1
fi
echo "✓ postgres reachable @ localhost:$LOCAL_PG_PORT"

echo "→ starting vite on 0.0.0.0:5173 (tunnel host: $TUNNEL_HOST)"
DEV_TUNNEL=1 DEV_TUNNEL_HOST="$TUNNEL_HOST" pnpm dev --host
