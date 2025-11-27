@echo off
REM ============================================
REM PMO Platform - Start All Services (Windows)
REM ============================================

setlocal
set "PROJECT_ROOT=%~dp0.."
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fi"

echo.
echo Starting PMO Platform...
echo.

REM Start Docker containers (PostgreSQL + Redis)
echo [1/3] Starting Docker containers...
docker-compose -f "%PROJECT_ROOT%\docker-compose.yml" up -d postgres redis
if errorlevel 1 (
    echo WARNING: Docker containers may have failed to start
)

REM Wait for databases to be ready
echo [2/3] Waiting for databases...
timeout /t 3 /nobreak >nul

REM Start NSSM services
echo [3/3] Starting NSSM services...
nssm start pmo-backend
nssm start pmo-frontend

echo.
echo ============================================
echo PMO Platform Started!
echo ============================================
echo.
echo   Backend API:    http://localhost:7600
echo   Frontend:       http://localhost:7620
echo   PostgreSQL:     localhost:7640
echo   Redis:          localhost:7660
echo.
echo Use 'scripts\stop.bat' to stop all services
echo Use 'scripts\restart.bat' to restart
echo.

endlocal
