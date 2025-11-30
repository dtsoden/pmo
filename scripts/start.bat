@echo off
REM ============================================
REM PMO Platform - Start All Services (Windows)
REM ============================================
REM
REM This script starts:
REM   - Docker containers (PostgreSQL + Redis)
REM   - NSSM services (backend + frontend)
REM
REM PREREQUISITES:
REM   1. Docker Desktop installed and running
REM   2. NSSM services configured (run scripts\setup-nssm.bat first)
REM   3. Environment files configured:
REM      - .env (root) - Backend runtime config
REM      - frontend/.env - Frontend build-time config
REM      - chrome-extension/.env - Extension build-time config
REM
REM IMPORTANT: If you changed any .env files:
REM   - Root .env: Just restart backend (no rebuild needed)
REM   - frontend/.env: Run "cd frontend && npm run build"
REM   - chrome-extension/.env: Run "cd chrome-extension && npm run build"
REM
REM See docs/ENV-CONFIGURATION.md for details.
REM ============================================

setlocal
set "PROJECT_ROOT=%~dp0.."
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fi"

echo.
echo Starting PMO Platform...
echo.
echo For configuration help, see: docs\ENV-CONFIGURATION.md
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
