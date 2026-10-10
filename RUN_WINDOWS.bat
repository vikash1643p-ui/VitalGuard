@echo off
start "CyberBioWall Backend" cmd /k "cd /d %~dp0backend && py app.py"
timeout /t 2 >nul
start "CyberBioWall Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd install && npm.cmd run dev"
start http://localhost:5173
