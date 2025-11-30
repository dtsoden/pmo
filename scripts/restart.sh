#!/bin/bash
# ============================================
# PMO Platform - Restart All Services (Mac/Linux)
# ============================================
#
# This script:
#   1. Rebuilds Chrome extension (ensures latest config)
#   2. Restarts Node.js services (backend + frontend)
#   3. Optionally restarts Docker (use --docker flag)
#
# WHEN TO USE:
#   - After changing root .env (backend config)
#   - After pulling code updates
#   - After npm install
#   - When services are misbehaving
#
# IMPORTANT: If you changed frontend/.env or chrome-extension/.env,
# this will rebuild the extension but you also need to:
#   - Rebuild frontend: cd frontend && npm run build
#   - Reload extension in chrome://extensions
#
# OPTIONS:
#   --docker    Also restart PostgreSQL and Redis containers
#
# For systemd service setup (production), see: docs/DEPLOY-LINUX.md
# For environment config help, see: docs/ENV-CONFIGURATION.md
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
