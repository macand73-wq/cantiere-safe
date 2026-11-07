#!/usr/bin/env bash
# Start, stop, restart or inspect the local dev stack:
#   pocketbase  backend on 0.0.0.0:8090 (LAN + phone access)
#   vite        frontend on 0.0.0.0:5173, pointed at the LAN backend URL
#
# Usage: ./dev.sh {start|stop|restart|status} [backend|frontend|all]
#
# Logs and pid files live in .run/ (gitignored).

set -u

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$ROOT" || exit 1

RUN_DIR="$ROOT/.run"
PB_BIN="$ROOT/backend/pocketbase"
PB_PORT=8090
WEB_PORT=5173
PB_PID_FILE="$RUN_DIR/pocketbase.pid"
WEB_PID_FILE="$RUN_DIR/vite.pid"
PB_LOG="$RUN_DIR/pocketbase.log"
WEB_LOG="$RUN_DIR/vite.log"

mkdir -p "$RUN_DIR"

usage() {
  cat <<'EOF'
Usage: ./dev.sh {start|stop|restart|status} [backend|frontend|all]

  start     start the service(s) in the background
  stop      stop the service(s) started by this script
  restart   stop then start
  status    show pid, port state and LAN URLs

Default target: all. Logs: .run/pocketbase.log, .run/vite.log
EOF
}

lan_ip() {
  ip -4 route get 1.1.1.1 2>/dev/null |
    awk '{ for (i = 1; i < NF; i++) if ($i == "src") { print $(i + 1); exit } }'
}

# Echo the tracked pid when the pid file exists and that process still matches
# the expected command. A reused pid from an unrelated process is ignored.
tracked_pid() {
  local file=$1 pattern=$2 pid
  [ -f "$file" ] || return 1
  pid=$(cat "$file" 2>/dev/null)
  case "$pid" in ''|*[!0-9]*) return 1 ;; esac
  kill -0 "$pid" 2>/dev/null || return 1
  tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null | grep -q "$pattern" || return 1
  printf '%s\n' "$pid"
}

port_busy() {
  # /proc is always present; ss/netstat are not guaranteed in PATH.
  local hex
  hex=$(printf '%04X' "$1")
  awk -v want="$hex" '
    FNR > 1 && $4 == "0A" {
      split($2, parts, ":")
      if (toupper(parts[2]) == want) found = 1
    }
    END { exit found ? 0 : 1 }
  ' /proc/net/tcp /proc/net/tcp6 2>/dev/null
}

wait_for_http() {
  local url=$1 tries=${2:-40}
  while [ "$tries" -gt 0 ]; do
    curl -sf -o /dev/null "$url" && return 0
    sleep 0.25
    tries=$((tries - 1))
  done
  return 1
}

log_tail() {
  local file=$1
  [ -f "$file" ] && tail -n 15 "$file"
}

start_backend() {
  local pid
  if pid=$(tracked_pid "$PB_PID_FILE" "pocketbase.*serve"); then
    echo "backend: already running (pid $pid)"
    return 0
  fi
  if [ ! -x "$PB_BIN" ]; then
    echo "backend: missing executable $PB_BIN (see backend/README.md)" >&2
    return 1
  fi
  if port_busy "$PB_PORT"; then
    echo "backend: port $PB_PORT is already in use by another process" >&2
    echo "  inspect with: ss -ltnp | grep :$PB_PORT" >&2
    return 1
  fi
  nohup "$PB_BIN" serve --http="0.0.0.0:$PB_PORT" \
    --dir "$ROOT/backend/pb_data" \
    --migrationsDir "$ROOT/backend/pb_migrations" \
    >>"$PB_LOG" 2>&1 &
  echo $! >"$PB_PID_FILE"
  if wait_for_http "http://127.0.0.1:$PB_PORT/api/health"; then
    echo "backend: started (pid $(cat "$PB_PID_FILE")), http://127.0.0.1:$PB_PORT"
  else
    echo "backend: failed to become healthy, last log lines:" >&2
    log_tail "$PB_LOG" >&2
    rm -f "$PB_PID_FILE"
    return 1
  fi
}

start_frontend() {
  local pid ip
  if pid=$(tracked_pid "$WEB_PID_FILE" "vite"); then
    echo "frontend: already running (pid $pid)"
    return 0
  fi
  if [ ! -x "$ROOT/node_modules/.bin/vite" ]; then
    echo "frontend: dependencies missing, run npm install" >&2
    return 1
  fi
  if port_busy "$WEB_PORT"; then
    echo "frontend: port $WEB_PORT is already in use by another process" >&2
    echo "  inspect with: ss -ltnp | grep :$WEB_PORT" >&2
    return 1
  fi
  ip=$(lan_ip)
  # Process env wins over .env.local, so the phone gets the current LAN address
  # even when the address changed since the file was written.
  VITE_PB_URL="http://${ip:-127.0.0.1}:$PB_PORT" \
    nohup "$ROOT/node_modules/.bin/vite" --host --port "$WEB_PORT" --strictPort \
    >>"$WEB_LOG" 2>&1 &
  echo $! >"$WEB_PID_FILE"
  if wait_for_http "http://127.0.0.1:$WEB_PORT/"; then
    echo "frontend: started (pid $(cat "$WEB_PID_FILE")), http://127.0.0.1:$WEB_PORT"
  else
    echo "frontend: failed to become reachable, last log lines:" >&2
    log_tail "$WEB_LOG" >&2
    rm -f "$WEB_PID_FILE"
    return 1
  fi
}

stop_one() {
  local name=$1 file=$2 pattern=$3 pid
  if ! pid=$(tracked_pid "$file" "$pattern"); then
    rm -f "$file"
    echo "$name: not running"
    return 0
  fi
  kill "$pid" 2>/dev/null
  local tries=20
  while [ "$tries" -gt 0 ] && kill -0 "$pid" 2>/dev/null; do
    sleep 0.25
    tries=$((tries - 1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null
    echo "$name: killed (pid $pid)"
  else
    echo "$name: stopped (pid $pid)"
  fi
  rm -f "$file"
}

status_one() {
  local name=$1 file=$2 pattern=$3 port=$4 pid state
  if pid=$(tracked_pid "$file" "$pattern"); then
    state="running (pid $pid)"
  else
    state="stopped"
    pid=""
  fi
  if port_busy "$port"; then
    if [ -n "$pid" ]; then
      state="$state, port $port listening"
    else
      state="$state, but port $port is held by another process"
    fi
  fi
  printf '%-11s %s\n' "$name" "$state"
}

status() {
  local ip
  ip=$(lan_ip)
  status_one "backend" "$PB_PID_FILE" "pocketbase.*serve" "$PB_PORT"
  status_one "frontend" "$WEB_PID_FILE" "vite" "$WEB_PORT"
  if [ -n "$ip" ]; then
    echo
    echo "LAN (use these on the phone):"
    echo "  app:       http://$ip:$WEB_PORT"
    echo "  backend:   http://$ip:$PB_PORT"
    echo "  dashboard: http://$ip:$PB_PORT/_/"
  fi
  echo
  echo "logs: ${PB_LOG#$ROOT/} ${WEB_LOG#$ROOT/}"
}

do_start() {
  case "$1" in
    all) start_backend; start_frontend ;;
    backend) start_backend ;;
    frontend) start_frontend ;;
  esac
}

do_stop() {
  case "$1" in
    all) stop_all ;;
    backend) stop_one "backend" "$PB_PID_FILE" "pocketbase.*serve" ;;
    frontend) stop_one "frontend" "$WEB_PID_FILE" "vite" ;;
  esac
}

start_all() { start_backend; start_frontend; }
stop_all() { stop_one "backend" "$PB_PID_FILE" "pocketbase.*serve"; stop_one "frontend" "$WEB_PID_FILE" "vite"; }

command=${1:-}
target=${2:-all}

case "$target" in
  backend|frontend|all) ;;
  *) usage; exit 2 ;;
esac

case "$command" in
  start) do_start "$target" ;;
  stop) do_stop "$target" ;;
  restart) do_stop "$target"; do_start "$target" ;;
  status) status ;;
  ""|help|-h|--help) usage ;;
  *) usage; exit 2 ;;
esac
