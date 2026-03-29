@echo off
REM Script para ejecutar pruebas de la Plataforma de Monitoreo (Windows)
REM Uso: run-tests.bat [backend|frontend|all|coverage]

setlocal enabledelayedexpansion

set MODE=%1
if "%MODE%"=="" set MODE=all

REM Colores ANSI (requiere Windows 10+)
set "RESET=[0m"
set "BLUE=[0;34m"
set "GREEN=[0;32m"
set "RED=[0;31m"
set "YELLOW=[1;33m"

REM Obtener directorio del script
set SCRIPT_DIR=%~dp0

REM Funciones
goto :main

:print_header
  echo.
  echo %BLUE%================================%RESET%
  echo %BLUE%%~1%RESET%
  echo %BLUE%================================%RESET%
  exit /b 0

:print_success
  echo %GREEN%[OK] %~1%RESET%
  exit /b 0

:print_error
  echo %RED%[ERROR] %~1%RESET%
  exit /b 0

:print_info
  echo %YELLOW%[INFO] %~1%RESET%
  exit /b 0

:run_backend_tests
  call :print_header "Ejecutando Tests Backend"
  
  cd /d "%SCRIPT_DIR%backend"
  
  if "%~1"=="coverage" (
    call :print_info "Generando reporte de cobertura..."
    call npm run test:coverage
  ) else (
    call npm test
  )
  
  if errorlevel 1 (
    call :print_error "Tests backend fallaron"
    exit /b 1
  )
  
  call :print_success "Tests backend completados"
  exit /b 0

:run_frontend_tests
  call :print_header "Ejecutando Tests Frontend"
  
  cd /d "%SCRIPT_DIR%frontend"
  
  if "%~1"=="coverage" (
    call :print_info "Generando reporte de cobertura..."
    call npm run test:coverage
  ) else (
    call npm test
  )
  
  if errorlevel 1 (
    call :print_error "Tests frontend fallaron"
    exit /b 1
  )
  
  call :print_success "Tests frontend completados"
  exit /b 0

:run_watch_mode
  call :print_header "Ejecutando en modo Watch"
  
  if "%~1"=="backend" (
    cd /d "%SCRIPT_DIR%backend"
    call npm run test:watch
  ) else if "%~1"=="frontend" (
    cd /d "%SCRIPT_DIR%frontend"
    call npm run test:watch
  ) else (
    echo Uso: run-tests.bat watch [backend^|frontend]
    exit /b 1
  )
  
  exit /b 0

:check_dependencies
  where node >nul 2>nul
  if errorlevel 1 (
    call :print_error "Node.js no esta instalado"
    exit /b 1
  )
  
  where npm >nul 2>nul
  if errorlevel 1 (
    call :print_error "npm no esta instalado"
    exit /b 1
  )
  
  call :print_success "Dependencias verificadas"
  exit /b 0

:main
  echo.
  call :print_info "Plataforma de Monitoreo - Script de Testing"
  echo.
  
  call :check_dependencies
  if errorlevel 1 (
    exit /b 1
  )
  
  if "%MODE%"=="backend" (
    call :run_backend_tests
    if errorlevel 1 exit /b 1
  ) else if "%MODE%"=="frontend" (
    call :run_frontend_tests
    if errorlevel 1 exit /b 1
  ) else if "%MODE%"=="coverage" (
    call :run_backend_tests coverage
    if errorlevel 1 exit /b 1
    echo.
    call :run_frontend_tests coverage
    if errorlevel 1 exit /b 1
    call :print_success "Reportes de cobertura generados"
    call :print_info "Backend:  backend\coverage\lcov-report\index.html"
    call :print_info "Frontend: frontend\coverage\index.html"
  ) else if "%MODE%"=="watch" (
    call :run_watch_mode %2
    if errorlevel 1 exit /b 1
  ) else (
    call :run_backend_tests
    if errorlevel 1 exit /b 1
    echo.
    call :run_frontend_tests
    if errorlevel 1 exit /b 1
    echo.
    call :print_success "Todos los tests completados exitosamente"
  )
  
  echo.
  endlocal
