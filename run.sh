#!/usr/bin/env bash
# Local launcher for Sparing Horse. Loads secrets from .env (git-ignored) and runs the server and the
# new UI, both reachable from other devices on your Wi-Fi (phone, tablet).
#
#   ./run.sh           server (Classic) + new UI, on the LAN
#   ./run.sh server    the server only (Classic), on the LAN
#
# Then open on the phone:  http://<this Mac's IP>:5180   (the address is printed at start)
# Ctrl+C stops everything.
#
# First-time setup on a new machine:
#   python -m venv venv && venv/bin/pip install -r requirements.txt
#   cp .env.example .env   # then put your RUNALYZE_TOKEN in .env, and SH_COOKIE_SECURE=0 for plain-http LAN use
#   (cd ui && npm install)  # or let the first ./run.sh do it
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "No .env found. Run: cp .env.example .env  and add your RUNALYZE_TOKEN" >&2
  exit 1
fi
set -a; . ./.env; set +a   # export everything defined in .env

if [ ! -x venv/bin/python ]; then
  echo "No venv found. Run: python -m venv venv && venv/bin/pip install -r requirements.txt" >&2
  exit 1
fi

API_PORT="${SH_PORT:-8770}"
UI_PORT=5180
MODE="${1:-all}"

# The login cookie is Secure by default, and a browser drops a Secure cookie over plain http —
# from the phone you could not stay logged in. Over http on the LAN the server must be told so.
if [ "${SH_COOKIE_SECURE:-1}" != "0" ]; then
  echo "Note: SH_COOKIE_SECURE is not 0 — logging in over http://<LAN IP> will not stick." >&2
  echo "      Add SH_COOKIE_SECURE=0 to .env for LAN use (only on a network you trust)." >&2
fi

# A port held by an earlier Sparing Horse / Vite run is freed; any other program is left alone.
free_port() {
  local port=$1 pids pid cmd
  pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
  for pid in $pids; do
    cmd=$(ps -o command= -p "$pid" 2>/dev/null || true)
    case "$cmd" in
      *SparingHorse*|*vite*) echo "Stopping the earlier run on port $port (pid $pid)"; kill "$pid" 2>/dev/null || true ;;
      *) echo "Port $port is taken by another program: $cmd" >&2; exit 1 ;;
    esac
  done
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 || return 0
    sleep 0.5
  done
  echo "Port $port did not free up" >&2; exit 1
}

free_port "$API_PORT"
[ "$MODE" = "server" ] || free_port "$UI_PORT"

LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)

API_PID="" UI_PID=""
cleanup() {
  trap - INT TERM EXIT
  [ -n "$UI_PID" ] && pkill -P "$UI_PID" 2>/dev/null; [ -n "$UI_PID" ] && kill "$UI_PID" 2>/dev/null
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null
  wait 2>/dev/null || true
  echo "Stopped."
}
trap cleanup INT TERM EXIT

rm -rf __pycache__
venv/bin/waitress-serve --listen="0.0.0.0:$API_PORT" SparingHorse:app &
API_PID=$!

if [ "$MODE" != "server" ]; then
  if [ ! -d ui/node_modules ]; then
    echo "Installing the UI's packages (first run)…"
    (cd ui && npm install)
  fi
  (cd ui && SH_API="http://127.0.0.1:$API_PORT" exec npx vite --host 0.0.0.0 --port "$UI_PORT" --strictPort) &
  UI_PID=$!
fi

sleep 3
echo
echo "Sparing Horse is running — Ctrl+C stops it."
if [ "$MODE" != "server" ]; then
  echo "  New UI   on this Mac:  http://localhost:$UI_PORT"
  [ -n "$LAN_IP" ] && echo "  New UI   on the phone: http://$LAN_IP:$UI_PORT"
fi
echo "  Classic  on this Mac:  http://localhost:$API_PORT"
[ -n "$LAN_IP" ] && echo "  Classic  on the phone: http://$LAN_IP:$API_PORT"
echo "  The phone must be on the same Wi-Fi. If it can't connect, allow incoming connections"
echo "  for node and Python when macOS asks (System Settings → Network → Firewall)."
echo

# stay up while both run; if either one dies, stop the other too
while kill -0 "$API_PID" 2>/dev/null && { [ -z "$UI_PID" ] || kill -0 "$UI_PID" 2>/dev/null; }; do
  sleep 2
done
echo "One of the two stopped — shutting down the other." >&2
