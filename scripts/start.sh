#!/bin/bash
# ============================================
# PMO Platform - Start All Services (Mac/Linux)
# ============================================

set -e

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "Starting PMO Platform..."
echo ""

# Start Docker containers (PostgreSQL + Redis)
echo "[1/3] Starting Docker containers..."
docker-compose -f "$PROJECT_ROOT/docker-compose.yml" up -d postgres redis

# Wait for databases
echo "[2/3] Waiting for databases..."
sleep 3

# Start Node services in background
echo "[3/3] Starting Node services..."

# Kill any existing processes on our ports
lsof -ti:7600 | xargs kill -9 2>/dev/null || true
lsof -ti:7620 | xargs kill -9 2>/dev/null || true

# Start backend
cd "$PROJECT_ROOT/backend"
nohup npm run dev > "$PROJECT_ROOT/logs/backend.log" 2>&1 &
echo "Backend PID: $!"

# Start frontend
cd "$PROJECT_ROOT/frontend"
nohup npm run dev -- --port 7620 > "$PROJECT_ROOT/logs/frontend.log" 2>&1 &
echo "Frontend PID: $!"

echo ""
echo "============================================"
echo "PMO Platform Started!"
echo "============================================"
echo ""
echo "  Backend API:    http://localhost:7600"
echo "  Frontend:       http://localhost:7620"
echo "  PostgreSQL:     localhost:7640"
echo "  Redis:          localhost:7660"
echo ""
echo "Use 'scripts/stop.sh' to stop all services"
echo "Use 'scripts/restart.sh' to restart"
echo ""
