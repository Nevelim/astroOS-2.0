#!/usr/bin/env bash
# AstroOS — launches all Python microservices on their canonical ports.
# Ports follow the Architecture ADR Service Catalog:
#   3001 Astro Engine (Go in prod, Python reference here)
#   3002 BaZi Engine
#   3004 Cosmic Match
#   3007 Daily Content
#   3009 Birth-Time Resolution  (infra-service)
#   3000 BFF / Next.js (started separately via `npm run dev`)
#
# Usage:  ./start-services.sh          # background, logs to logs/*.log
#         ./start-services.sh stop     # kill all
set -eu

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

LOG_DIR="${ROOT}/logs"
mkdir -p "$LOG_DIR"

if [[ "${1:-}" == "stop" ]]; then
  echo "Stopping AstroOS services..."
  for pidf in "${LOG_DIR}"/*.pid; do
    [[ -f "$pidf" ]] || continue
    pid="$(cat "$pidf")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" && echo "  killed $(basename "$pidf" .pid) ($pid)"
    fi
    rm -f "$pidf"
  done
  exit 0
fi

# Each service: name|port|module
services=(
  "birth-time|3009|services.birth_time.api.app:app"
  "bazi-engine|3002|services.bazi_engine.api.app:app"
  "astro-engine|3001|services.astro_engine.api.app:app"
  "daily-content|3007|services.daily_content.api.app:app"
  "cosmic-match|3004|services.cosmic_match.api.app:app"
)

for svc in "${services[@]}"; do
  name="${svc%%|*}"
  rest="${svc#*|}"
  port="${rest%%|*}"
  module="${rest##*|}"
  log="${LOG_DIR}/${name}.log"
  echo "▶ ${name} on :${port}  (module: ${module})"

  "${ROOT}/.venv/bin/uvicorn" "${module}" \
    --host 127.0.0.1 --port "${port}" \
    --log-level info > "${log}" 2>&1 &
  echo $! > "${LOG_DIR}/${name}.pid"
  sleep 0.5
done

echo
echo "✓ Started ${#services[@]} services."
echo "  logs:   tail -f ${LOG_DIR}/*.log"
echo "  stop:   ./start-services.sh stop"
echo
echo "Endpoints (Swagger UI):"
echo "  Birth-Time  http://127.0.0.1:3009/docs"
echo "  BaZi        http://127.0.0.1:3002/docs"
echo "  Astro       http://127.0.0.1:3001/docs"
echo "  Daily       http://127.0.0.1:3007/docs"
echo "  Match       http://127.0.0.1:3004/docs"
