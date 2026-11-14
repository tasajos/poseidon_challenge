@echo off
title Poseidon Challenge Runner
echo =========================================
echo    Iniciando Poseidon Challenge (2026)
echo    Base de datos: SQLite persistente
echo =========================================

echo 1. Levantando Backend en puerto 3001...
start "Poseidon Backend" cmd /k "cd /d "%~dp0Backend" && npm run dev"

echo 2. Levantando Frontend en puerto 5173...
start "Poseidon Frontend" cmd /k "cd /d "%~dp0Frontend" && npm run dev"

echo.
echo Todo listo. Abre en tu navegador: http://localhost:5173
echo.
pause
