@echo off
REM ============================================
REM PMO Platform - Stop All Services (Windows)
REM ============================================

setlocal
set "PROJECT_ROOT=%~dp0.."
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fi"

echo.
echo Stopping PMO Platform...
echo.

REM Stop NSSM services
echo [1/2] Stopping NSSM services...
nssm stop pmo-frontend >nul 2>&1
nssm stop pmo-backend >nul 2>&1

REM Stop Docker containers
echo [2/2] Stopping Docker containers...
docker-compose -f "%PROJECT_ROOT%\docker-compose.yml" stop postgres redis

echo.
echo ============================================
echo PMO Platform Stopped
echo ============================================
echo.

endlocal
