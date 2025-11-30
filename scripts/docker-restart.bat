@echo off
REM ============================================
REM PMO Platform - Restart Docker Only (Windows)
REM ============================================
REM
REM Restarts PostgreSQL and Redis containers without touching
REM Node.js services (backend + frontend).
REM
REM Use this when:
REM   - Database connection issues
REM   - PostgreSQL needs restart
REM   - Redis cache needs clearing
REM   - Docker containers are stuck
REM
REM NOTE: This does NOT affect backend/frontend services.
REM To restart everything: scripts\restart.bat --docker
REM ============================================

setlocal
set "PROJECT_ROOT=%~dp0.."
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fi"

echo.
echo Restarting Docker containers...
echo.

docker-compose -f "%PROJECT_ROOT%\docker-compose.yml" restart postgres redis

echo.
echo Docker containers restarted.
echo   PostgreSQL: localhost:7640
echo   Redis:      localhost:7660
echo.

endlocal
