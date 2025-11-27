#!/bin/bash
# ============================================
# PMO Platform - Restart All Services (Mac/Linux)
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "Restarting PMO Platform..."
echo ""

# Kill existing Node processes
echo "[1/3] Stopping Node services..."
lsof -ti:7600 | xargs kill -9 2>/dev/null || true
lsof -ti:7620 | xargs kill -9 2>/dev/null || true

sleep 1

# Restart Docker if requested
if [[ "$1" == "--docker" ]]; then
    echo "[2/3] Restarting Docker containers..."
    docker-compose -f "$PROJECT_ROOT/docker-compose.yml" restart postgres redis
    sleep 2
else
    echo "[2/3] Docker containers unchanged (use --docker to restart)"
fi

# Start services
echo "[3/3] Starting Node services..."

cd "$PROJECT_ROOT/backend"
nohup npm run dev > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
echo "Backend PID: $!"

cd "$PROJECT_ROOT/frontend"
nohup npm run dev -- --port 7620 > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
echo "Frontend PID: $!"

echo ""
echo "============================================"
echo "PMO Platform Restarted!"
echo "============================================"
echo ""
echo "  Backend API:    http://localhost:7600"
echo "  Frontend:       http://localhost:7620"
echo ""
