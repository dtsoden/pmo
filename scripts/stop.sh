#!/bin/bash
# ============================================
# PMO Platform - Stop All Services (Mac/Linux)
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "Stopping PMO Platform..."
echo ""

# Stop Node processes on our ports
echo "[1/2] Stopping Node services..."
lsof -ti:7600 | xargs kill -9 2>/dev/null || true
lsof -ti:7620 | xargs kill -9 2>/dev/null || true

# Stop Docker containers
echo "[2/2] Stopping Docker containers..."
docker-compose -f "$PROJECT_ROOT/docker-compose.yml" stop postgres redis

echo ""
echo "============================================"
echo "PMO Platform Stopped"
echo "============================================"
echo ""
