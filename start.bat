@echo off
chcp 65001 >nul 2>&1
title DeFiPeru Pro — Launcher
color 0B

echo.
echo  DeFiPeru Pro — Starting...
echo.

:: Start backend in new window
echo  Starting backend (port 8000)...
start "DeFiPeru-Backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start frontend in new window
echo  Starting frontend (port 3000)...
start "DeFiPeru-Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

:: Wait and open browser
timeout /t 5 /nobreak >nul
echo  Opening browser...
start http://localhost:3000

echo.
echo  Backend:  http://localhost:8000  (API docs: /docs)
echo  Frontend: http://localhost:3000
echo.
echo  Close this window or press Ctrl+C to stop.
pause
