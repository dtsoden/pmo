@echo off
REM ============================================
REM PMO Platform - NSSM Service Setup (Windows)
REM Run this ONCE as Administrator to install services
REM ============================================

setlocal enabledelayedexpansion

REM Get project root (parent of scripts folder)
set "PROJECT_ROOT=%~dp0.."
for %%i in ("%PROJECT_ROOT%") do set "PROJECT_ROOT=%%~fi"

echo.
echo ============================================
echo PMO Platform - NSSM Service Setup
echo ============================================
echo Project Root: %PROJECT_ROOT%
echo.

REM Check for NSSM
where nssm >nul 2>&1
if errorlevel 1 (
    echo ERROR: NSSM not found in PATH
    echo Please install NSSM: https://nssm.cc/download
    echo Or run: choco install nssm
    exit /b 1
)

REM Find node.exe
for /f "tokens=*" %%i in ('where node') do set "NODE_PATH=%%i"
if "%NODE_PATH%"=="" (
    echo ERROR: Node.js not found
    exit /b 1
)
echo Found Node: %NODE_PATH%

REM Find npm
for /f "tokens=*" %%i in ('where npm') do set "NPM_PATH=%%i"
echo Found NPM: %NPM_PATH%

REM ============================================
REM Remove existing services (if any)
REM ============================================
echo.
echo Removing existing services (if any)...
nssm stop pmo-backend >nul 2>&1
nssm remove pmo-backend confirm >nul 2>&1
nssm stop pmo-frontend >nul 2>&1
nssm remove pmo-frontend confirm >nul 2>&1

REM ============================================
REM Install Backend Service
REM ============================================
echo.
echo Installing pmo-backend service...

nssm install pmo-backend "%NPM_PATH%"
nssm set pmo-backend AppParameters "run dev"
nssm set pmo-backend AppDirectory "%PROJECT_ROOT%\backend"
nssm set pmo-backend AppEnvironmentExtra "NODE_ENV=development" "PORT=7600"
nssm set pmo-backend DisplayName "PMO Platform - Backend API"
nssm set pmo-backend Description "PMO Platform Backend API running on port 7600"
nssm set pmo-backend Start SERVICE_DEMAND_START
nssm set pmo-backend AppStdout "%PROJECT_ROOT%\logs\backend.log"
nssm set pmo-backend AppStderr "%PROJECT_ROOT%\logs\backend-error.log"
nssm set pmo-backend AppRotateFiles 1
nssm set pmo-backend AppRotateBytes 1048576

echo Backend service installed.

REM ============================================
REM Install Frontend Service
REM ============================================
echo.
echo Installing pmo-frontend service...

nssm install pmo-frontend "%NPM_PATH%"
nssm set pmo-frontend AppParameters "run dev -- --port 7620"
nssm set pmo-frontend AppDirectory "%PROJECT_ROOT%\frontend"
nssm set pmo-frontend AppEnvironmentExtra "NODE_ENV=development"
nssm set pmo-frontend DisplayName "PMO Platform - Frontend"
nssm set pmo-frontend Description "PMO Platform SvelteKit Frontend running on port 7620"
nssm set pmo-frontend Start SERVICE_DEMAND_START
nssm set pmo-frontend AppStdout "%PROJECT_ROOT%\logs\frontend.log"
nssm set pmo-frontend AppStderr "%PROJECT_ROOT%\logs\frontend-error.log"
nssm set pmo-frontend AppRotateFiles 1
nssm set pmo-frontend AppRotateBytes 1048576

echo Frontend service installed.

REM ============================================
REM Create logs directory
REM ============================================
if not exist "%PROJECT_ROOT%\logs" mkdir "%PROJECT_ROOT%\logs"

echo.
echo ============================================
echo NSSM Services Installed Successfully!
echo ============================================
echo.
echo Services created (manual start):
echo   - pmo-backend  (port 7600)
echo   - pmo-frontend (port 7620)
echo.
echo Use these scripts to manage services:
echo   start.bat   - Start all services + Docker
echo   stop.bat    - Stop all services + Docker
echo   restart.bat - Restart everything
echo.
echo Or manage individually:
echo   nssm start pmo-backend
echo   nssm stop pmo-frontend
echo   nssm restart pmo-backend
echo.

endlocal
