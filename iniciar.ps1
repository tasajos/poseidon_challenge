# Script para iniciar Backend y Frontend de Poseidon con un solo clic
Write-Host "=========================================" -ForegroundColor Green
Write-Host "   Iniciando Poseidon Challenge (2026)   " -ForegroundColor Green
Write-Host "   Base de datos: SQLite persistente     " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Green

Write-Host "1. Levantando Backend en puerto 3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Backend'; npm run dev"

Write-Host "2. Levantando Frontend en puerto 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Frontend'; npm run dev"

Write-Host "`nTodo listo. Abre tu navegador en: http://localhost:5173" -ForegroundColor Green
