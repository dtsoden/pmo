#!/bin/bash
# ============================================
# PMO Platform - Restart Docker Only (Mac/Linux)
# Restarts PostgreSQL and Redis without touching Node services
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo ""
echo "Restarting Docker containers..."
echo ""

docker-compose -f "$PROJECT_ROOT/docker-compose.yml" restart postgres redis

echo ""
echo "Docker containers restarted."
echo "  PostgreSQL: localhost:7640"
echo "  Redis:      localhost:7660"
echo ""
