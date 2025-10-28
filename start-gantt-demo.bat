@echo off
title Gantt Demo - SVAR Gantt
echo ========================================
echo   Iniciar Gantt Demo (Server + Frontend)
echo ========================================

REM ================================
REM 1️⃣ Parar processos antigos
REM ================================
echo.
echo [1/5] A verificar e libertar portas...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3025') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do taskkill /PID %%a /F >nul 2>&1

echo Portas 3025 e 5173 libertadas.
timeout /t 1 >nul

REM ================================
REM 2️⃣ Verificar Node.js
REM ================================
echo.
echo [2/5] Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Instala em https://nodejs.org/
    pause
    exit /b
)
for /f "tokens=* usebackq" %%f in (`node --version`) do set NODEVER=%%f
echo Node.js encontrado: %NODEVER%
timeout /t 1 >nul

REM ================================
REM 3️⃣ Instalar dependências (apenas se faltar)
REM ================================
if not exist "node_modules" (
    echo.
    echo [3/5] A instalar dependências...
    call npm install
    if errorlevel 1 (
        echo ERRO: Falha ao instalar dependências!
        pause
        exit /b
    )
) else (
    echo.
    echo [3/5] Dependências já instaladas.
)
timeout /t 1 >nul

REM ================================
REM 4️⃣ Iniciar backend e frontend
REM ================================
echo.
echo [4/5] A iniciar servidor Express (3025) e Vite (5173)...
start "SVAR Gantt Server" cmd /k "echo === Server backend iniciado === & npm run server"
start "SVAR Gantt Frontend" cmd /k "echo === Frontend iniciado === & npm run dev"

REM Esperar alguns segundos
timeout /t 5 >nul

REM ================================
REM 5️⃣ Abrir navegador
REM ================================
echo.
echo [5/5] A abrir o Gantt no browser...
start "" "http://localhost:5173"

echo.
echo ========================================
echo   Projeto Gantt iniciado com sucesso!
echo   Backend:  http://localhost:3025
echo   Frontend: http://localhost:5173
echo ========================================
echo.
echo Para parar, fecha as janelas do "SVAR Gantt Server" e "SVAR Gantt Frontend".
pause
