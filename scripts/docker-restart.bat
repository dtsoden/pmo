@echo off
REM ============================================
REM PMO Platform - Restart Docker Only (Windows)
REM Restarts PostgreSQL and Redis without touching Node services
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
