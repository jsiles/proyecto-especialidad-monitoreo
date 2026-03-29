#!/bin/bash

# Script para ejecutar pruebas de la Plataforma de Monitoreo
# Uso: ./run-tests.sh [backend|frontend|all|coverage]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-all}"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones
print_header() {
  echo -e "${BLUE}================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}================================${NC}"
}

print_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
  echo -e "${RED}❌ $1${NC}"
}

print_info() {
  echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Funciones principales
run_backend_tests() {
  print_header "Ejecutando Tests Backend"
  cd "${SCRIPT_DIR}/backend"
  
  if [ "$1" == "coverage" ]; then
    print_info "Generando reporte de cobertura..."
    npm run test:coverage
  else
    npm test
  fi
  
  if [ $? -eq 0 ]; then
    print_success "Tests backend completados"
  else
    print_error "Tests backend fallaron"
    exit 1
  fi
}

run_frontend_tests() {
  print_header "Ejecutando Tests Frontend"
  cd "${SCRIPT_DIR}/frontend"
  
  if [ "$1" == "coverage" ]; then
    print_info "Generando reporte de cobertura..."
    npm run test:coverage
  else
    npm test
  fi
  
  if [ $? -eq 0 ]; then
    print_success "Tests frontend completados"
  else
    print_error "Tests frontend fallaron"
    exit 1
  fi
}

run_watch_mode() {
  print_header "Ejecutando en modo Watch"
  
  case "$1" in
    backend)
      cd "${SCRIPT_DIR}/backend"
      npm run test:watch
      ;;
    frontend)
      cd "${SCRIPT_DIR}/frontend"
      npm run test:watch
      ;;
    *)
      echo "Uso: ./run-tests.sh watch [backend|frontend]"
      exit 1
      ;;
  esac
}

# Verificar dependencias
check_dependencies() {
  if ! command -v node &> /dev/null; then
    print_error "Node.js no está instalado"
    exit 1
  fi
  
  if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
  fi
  
  print_success "Dependencias verificadas"
}

# Main
echo ""
print_info "Plataforma de Monitoreo - Script de Testing"
echo ""

check_dependencies

case "$MODE" in
  backend)
    run_backend_tests
    ;;
  frontend)
    run_frontend_tests
    ;;
  coverage)
    run_backend_tests coverage
    run_frontend_tests coverage
    print_success "Reportes de cobertura generados"
    print_info "Backend:  backend/coverage/lcov-report/index.html"
    print_info "Frontend: frontend/coverage/index.html"
    ;;
  watch)
    run_watch_mode "$2"
    ;;
  all|*)
    run_backend_tests
    echo ""
    run_frontend_tests
    echo ""
    print_success "Todos los tests completados exitosamente"
    ;;
esac

echo ""
