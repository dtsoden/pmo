@echo off
REM ============================================
REM PMO Platform - Restart All Services (Windows)
REM ============================================

setlocal
set "PROJECT_ROOT=%~dp0.."
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fi"

echo.
echo Restarting PMO Platform...
echo.

REM Restart NSSM services (fastest way)
echo [1/2] Restarting NSSM services...
nssm restart pmo-backend
nssm restart pmo-frontend

REM Optionally restart Docker if needed
if "%1"=="--docker" (
    echo [2/2] Restarting Docker containers...
    docker-compose -f "%PROJECT_ROOT%\docker-compose.yml" restart postgres redis
) else (
    echo [2/2] Docker containers unchanged (use --docker to restart)
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
