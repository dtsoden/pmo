@echo off
REM ============================================
REM PMO Platform - Restart All Services (Windows)
REM ============================================
REM
REM This script:
REM   1. Rebuilds Chrome extension (ensures latest config)
REM   2. Restarts backend + frontend (NSSM services)
REM   3. Optionally restarts Docker (use --docker flag)
REM
REM WHEN TO USE:
REM   - After changing root .env (backend config)
REM   - After pulling code updates
REM   - After npm install
REM   - When services are misbehaving
REM
REM IMPORTANT: If you changed frontend/.env or chrome-extension/.env,
REM this will rebuild the extension but you also need to:
REM   - Rebuild frontend: cd frontend && npm run build
REM   - Reload extension in chrome://extensions
REM
REM OPTIONS:
REM   --docker    Also restart PostgreSQL and Redis containers
REM
REM See docs/ENV-CONFIGURATION.md for configuration help.
REM ============================================

setlocal
set "PROJECT_ROOT=%~dp0.."
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fi"

echo.
echo Restarting PMO Platform...
echo.

REM Rebuild Chrome extension (ensures config is fresh)
echo [1/3] Rebuilding Chrome extension...
cd /d "%PROJECT_ROOT%\chrome-extension"
call npm run build > nul 2>&1
cd /d "%PROJECT_ROOT%"

REM Restart NSSM services (fastest way)
echo [2/3] Restarting NSSM services...
nssm restart pmo-backend
nssm restart pmo-frontend

REM Optionally restart Docker if needed
if "%1"=="--docker" (
    echo [3/3] Restarting Docker containers...
    docker-compose -f "%PROJECT_ROOT%\docker-compose.yml" restart postgres redis
) else (
    echo [3/3] Docker containers unchanged (use --docker to restart)
)

echo.
echo ============================================
echo PMO Platform Restarted!
echo ============================================
echo.
echo   Backend API:    http://localhost:7600
echo   Frontend:       http://localhost:7620
echo.

endlocal
