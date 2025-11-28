#!/bin/bash
# ============================================
# PMO Platform - Restart All Services (Mac/Linux)
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "Restarting PMO Platform..."
echo ""

# Rebuild Chrome extension (ensures config is fresh)
echo "[1/3] Rebuilding Chrome extension..."
cd "$PROJECT_ROOT/chrome-extension"
npm run build > /dev/null 2>&1
cd "$PROJECT_ROOT"

# Restart Node services (kill existing processes and start new ones)
echo "[2/3] Restarting Node services..."
lsof -ti:7600 | xargs kill -9 2>/dev/null || true
lsof -ti:7620 | xargs kill -9 2>/dev/null || true

sleep 1

cd "$PROJECT_ROOT/backend"
nohup npm run dev > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
echo "Backend PID: $!"

cd "$PROJECT_ROOT/frontend"
nohup npm run dev -- --port 7620 > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
echo "Frontend PID: $!"

# Optionally restart Docker if needed
if [[ "$1" == "--docker" ]]; then
    echo "[3/3] Restarting Docker containers..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" restart postgres redis
    sleep 2
else
    echo "[3/3] Docker containers unchanged (use --docker to restart)"
fi

echo ""
echo "============================================"
echo "PMO Platform Restarted!"
echo "============================================"
echo ""
echo "  Backend API:    http://localhost:7600"
echo "  Frontend:       http://localhost:7620"
echo ""
