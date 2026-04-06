@echo off
chcp 65001 >nul 2>&1
title DeFiPeru Pro — Installer
color 0A

echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║       DeFiPeru Pro — Auto Installer         ║
echo  ║    Crypto Automated Trading Platform          ║
echo  ╚══════════════════════════════════════════════╝
echo.

:: ──────────────────────────────────────────────────
:: 1. Check Python
:: ──��───────────────────────────────────────────────
echo [1/6] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Python not found. Install Python 3.11+ from https://python.org
    echo  Make sure to check "Add Python to PATH" during installation.
    pause
    exit /b 1
)
for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PYVER=%%v
echo  OK — Python %PYVER%

:: ──────────────────────────────────────────────────
:: 2. Check Node.js
:: ──────────────────────────────────────────────────
echo [2/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found. Install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f %%v in ('node --version 2^>^&1') do set NODEVER=%%v
echo  OK — Node.js %NODEVER%

:: ──────────────────────────────────────────────────
:: 3. Create Python virtual environment
:: ──────────────────────────────────────────────────
echo [3/6] Setting up Python virtual environment...
cd /d "%~dp0backend"

if not exist ".venv" (
    python -m venv .venv
    echo  Created .venv
) else (
    echo  .venv already exists
)

:: Activate venv
call .venv\Scripts\activate.bat

:: Upgrade pip
python -m pip install --upgrade pip --quiet

:: ──────────────────────────────────────────────────
:: 4. Install Python dependencies
:: ──────────────────────────────────────────────────
echo [4/6] Installing Python dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo  WARNING: Some packages failed to install.
    echo  Check the output above for errors.
    echo  Common fix: pip install --upgrade setuptools wheel
    echo.
)
echo  Python dependencies installed.

:: ──────────────────────────────────────────────────
:: 5. Create .env if not exists
:: ──────────────────────────────────────────────────
echo [5/6] Checking environment config...
if not exist ".env" (
    copy .env.example .env >nul 2>&1
    echo  Created .env from .env.example
    echo  IMPORTANT: Edit backend\.env with your API keys before running!
) else (
    echo  .env already exists
)

:: ──────────────────────────────────────────────────
:: 6. Install frontend dependencies
:: ──────────────────────────────────────────────────
echo [6/6] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
    echo  WARNING: npm install had issues. Try deleting node_modules and running again.
)
echo  Frontend dependencies installed.

:: ──────────────────────────────────────────────────
:: Done
:: ──────────────────────────────────────────────────
cd /d "%~dp0"
echo.
echo  ╔══════════════════════════════════════════════╗
echo  ║         Installation Complete!                ║
echo  ╚══════════════════════════════════════════════╝
echo.
echo  To start the platform:
echo.
echo    BACKEND:
echo      cd backend
echo      .venv\Scripts\activate
echo      uvicorn app.main:app --reload --port 8000
echo.
echo    FRONTEND:
echo      cd frontend
echo      npm run dev
echo.
echo    Then open http://localhost:3000
echo.
echo    API docs: http://localhost:8000/docs
echo.
echo  ─────────────────────────────────────────────
echo  NOTE: You need PostgreSQL running for full DB support.
echo  Without it, the app runs in demo/paper-trading mode.
echo  ─────────────────────────────────────────────
echo.
pause
