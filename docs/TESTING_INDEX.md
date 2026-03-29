# 🗂️ Índice de Tests del Proyecto

Referencia completa de todos los tests en el proyecto, organizados por módulo.

---

## 📋 Backend Tests (25 archivos)

### Unit Tests - Servicios

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| Auth Service | Autenticación, login, token validation | `tests/auth-service.unit.test.ts` |
| Alert Service | Evaluación de umbrales, creación de alertas | `tests/alert-service.unit.test.ts` |
| Server Service | CRUD de servidores | `tests/server-service.unit.test.ts` |
| Report Service | Generación de reportes | `tests/report-service.unit.test.ts` |
| Prometheus Service | Consulta de métricas en Prometheus | `tests/prometheus-service.unit.test.ts` |
| Monitoring | Lógica de monitoreo | `tests/monitoring.unit.test.ts` |

### Unit Tests - Utilities

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| JWT Utils | Generación y verificación de tokens | `tests/jwt-utils.unit.test.ts` |
| Password Utils | Hash y comparación de contraseñas | `tests/password-utils.unit.test.ts` |
| Notification | Envío de notificaciones | `tests/notification.unit.test.ts` |

### Unit Tests - Data Access

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| Repositories DTOs | Validación de DTOs | `tests/repositories-dtos.unit.test.ts` |
| Repositories Extended | Operaciones extendidas en BD | `tests/repositories-extended.unit.test.ts` |

### Unit Tests - Controllers

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| Auth Server Controllers | Controllers de auth y servers | `tests/controllers-auth-server.unit.test.ts` |
| Alert Report Controllers | Controllers de alertas y reportes | `tests/controllers-alert-report.unit.test.ts` |
| Monitoring Metrics Controllers | Controllers de métricas | `tests/controllers-monitoring-metrics.unit.test.ts` |
| Email Alert Evaluation | Evaluación y notificación de alertas | `tests/email-alertevaluation.unit.test.ts` |

### Integration Tests - Endpoints

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| Auth Integration | Login, verify, logout endpoints | `tests/auth.integration.test.ts` |
| Auth Service Integration | Flujos completos de autenticación | `tests/auth-service.integration.test.ts` |
| Servers Integration | CRUD endpoints de servidores | `tests/servers.integration.test.ts` |
| Alerts Integration | Endpoints de alertas | `tests/alerts.integration.test.ts` |
| Monitoring Integration | Endpoints de métricas | `tests/monitoring.integration.test.ts` |
| Reports Integration | Endpoints de reportes | `tests/reports.integration.test.ts` |
| Reports Extended | Tests adicionales de reportes | `tests/reports-extended.integration.test.ts` |
| WebSocket Integration | Comunicación WebSocket en tiempo real | `tests/websocket.integration.test.ts` |
| Health Check | Verificación de salud del servicio | `tests/health.test.ts` |

### Setup

| Archivo | Descripción |
|---------|-------------|
| `tests/setup.ts` | Configuración global, mocks, fixtures |

---

## 📋 Frontend Tests (23 archivos)

### Component Tests - Pages

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| Login | Formulario de login, validación | `src/app/pages/Login.test.tsx` |
| Dashboard | Visualización de métricas | `src/app/pages/Dashboard.test.tsx` |
| Alerts Management | Gestión de umbrales y alertas | `src/app/pages/AlertsManagement.test.tsx` |
| Servers Page | Listado y CRUD de servidores | `src/app/pages/ServersPage.test.tsx` |
| Reports | Generación y descarga de reportes | `src/app/pages/Reports.test.tsx` |

### Component Tests - Layout

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| Layout | Header, nav, estructura principal | `src/app/components/Layout.test.tsx` |
| Protected Route | Control de acceso a rutas | `src/app/components/ProtectedRoute.test.tsx` |
| Realtime Alerts Bridge | Puente WebSocket para alertas | `src/app/components/RealtimeAlertsBridge.test.tsx` |
| Image with Fallback | Componente de imagen con fallback | `src/app/components/figma/ImageWithFallback.test.tsx` |

### Component Tests - App

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| App | Componente raíz | `src/app/App.test.tsx` |
| Routes | Configuración de rutas | `src/app/routes.test.tsx` |
| Main Entry | Entry point de la aplicación | `src/main.test.tsx` |

### Service Tests

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| Auth Service | Operaciones de autenticación | `src/services/authService.test.ts` |
| Metrics Service | Lectura de métricas | `src/services/metricsService.test.ts` |
| Alerts Service | Operaciones con alertas | `src/services/alertsService.test.ts` |
| Servers Service | CRUD de servidores | `src/services/serversService.test.ts` |
| Reports Service | Generación de reportes | `src/services/reportsService.test.ts` |
| API Base | Cliente HTTP Axios | `src/services/api.test.ts` |

### Hook Tests

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| useAuth | Hook de autenticación | `src/hooks/useAuth.test.ts` |
| useMetrics | Hook de métricas | `src/hooks/useMetrics.test.ts` |
| useAlerts | Hook de alertas | `src/hooks/useAlerts.test.ts` |
| useServers | Hook de servidores | `src/hooks/useServers.test.ts` |
| useWebSocket | Hook de WebSocket | `src/hooks/useWebSocket.test.ts` |

### Context Tests

| Test | Descripción | Ubicación |
|------|-------------|-----------|
| AuthContext | Context global de autenticación | `src/contexts/AuthContext.test.tsx` |

---

## 📊 Estadísticas de Cobertura

### Backend

```
Líneas:      82.5%  (objetivo: 80%)
Branches:    71.2%  (objetivo: 70%)
Funciones:   80.1%  (objetivo: 80%)
Statements:  82.5%  (objetivo: 80%)
```

### Frontend

```
Líneas:      78.3%  (objetivo: 75%)
Branches:    69.5%  (objetivo: 70%)
Funciones:   77.8%  (objetivo: 75%)
Statements:  78.3%  (objetivo: 75%)
```

---

## 🔗 Mapeo de Tests por Feature

### Autenticación
- ✅ `tests/auth.integration.test.ts` - Endpoints
- ✅ `tests/auth-service.unit.test.ts` - Lógica
- ✅ `tests/auth-service.integration.test.ts` - Flujos
- ✅ `tests/auth-dto.unit.test.ts` - Validación
- ✅ `tests/jwt-utils.unit.test.ts` - Tokens
- ✅ `tests/password-utils.unit.test.ts` - Contraseñas
- ✅ `src/services/authService.test.ts` - Frontend
- ✅ `src/hooks/useAuth.test.ts` - Hook
- ✅ `src/app/pages/Login.test.tsx` - UI
- ✅ `src/contexts/AuthContext.test.tsx` - Context

### Servidores & Métricas
- ✅ `tests/server-service.unit.test.ts` - Lógica
- ✅ `tests/servers.integration.test.ts` - Endpoints
- ✅ `tests/monitoring.unit.test.ts` - Monitoreo
- ✅ `tests/monitoring.integration.test.ts` - Endpoints
- ✅ `tests/prometheus-service.unit.test.ts` - Prometheus
- ✅ `tests/controllers-monitoring-metrics.unit.test.ts` - Controllers
- ✅ `src/services/metricsService.test.ts` - Frontend
- ✅ `src/services/serversService.test.ts` - Frontend
- ✅ `src/hooks/useMetrics.test.ts` - Hook
- ✅ `src/hooks/useServers.test.ts` - Hook
- ✅ `src/app/pages/Dashboard.test.tsx` - UI
- ✅ `src/app/pages/ServersPage.test.tsx` - UI

### Alertas
- ✅ `tests/alert-service.unit.test.ts` - Lógica
- ✅ `tests/alerts.integration.test.ts` - Endpoints
- ✅ `tests/controllers-alert-report.unit.test.ts` - Controllers
- ✅ `tests/email-alertevaluation.unit.test.ts` - Notificaciones
- ✅ `tests/notification.unit.test.ts` - Email
- ✅ `src/services/alertsService.test.ts` - Frontend
- ✅ `src/hooks/useAlerts.test.ts` - Hook
- ✅ `src/app/pages/AlertsManagement.test.tsx` - UI
- ✅ `src/app/components/RealtimeAlertsBridge.test.tsx` - WebSocket

### Reportes
- ✅ `tests/report-service.unit.test.ts` - Lógica
- ✅ `tests/reports.integration.test.ts` - Endpoints
- ✅ `tests/reports-extended.integration.test.ts` - Tests extendidos
- ✅ `tests/controllers-alert-report.unit.test.ts` - Controllers
- ✅ `src/services/reportsService.test.ts` - Frontend
- ✅ `src/app/pages/Reports.test.tsx` - UI

### Tiempo Real (WebSocket)
- ✅ `tests/websocket.integration.test.ts` - Endpoints
- ✅ `src/hooks/useWebSocket.test.ts` - Hook
- ✅ `src/app/components/RealtimeAlertsBridge.test.tsx` - Componente

### Infraestructura
- ✅ `tests/jwt-utils.unit.test.ts` - JWT
- ✅ `tests/password-utils.unit.test.ts` - Contraseñas
- ✅ `tests/repositories-dtos.unit.test.ts` - Validación
- ✅ `tests/repositories-extended.unit.test.ts` - Repositorios
- ✅ `tests/health.test.ts` - Health check
- ✅ `src/services/api.test.ts` - HTTP client
- ✅ `src/app/routes.test.tsx` - Routing
- ✅ `src/app/App.test.tsx` - App root
- ✅ `src/app/components/Layout.test.tsx` - Layout
- ✅ `src/app/components/ProtectedRoute.test.tsx` - Seguridad

---

## 🧪 Comandos Rápidos por Feature

### Probar Autenticación
```bash
cd backend
npm test -- auth
npm run test:watch -- auth
```

### Probar Servidores
```bash
cd backend
npm test -- server
```

### Probar Alertas
```bash
cd backend
npm test -- alert
```

### Probar Reportes
```bash
cd backend
npm test -- report
```

### Probar UI
```bash
cd frontend
npm test -- Dashboard
npm test -- Login
npm test -- pages
```

### Probar Hooks
```bash
cd frontend
npm test -- hooks
npm test -- useAuth.test.ts
```

---

## 📈 Evolución del Testing

```
Marzo 2026:
├── Backend:  25 test files, 287 tests total
├── Frontend: 23 test files, 156 tests total
└── Total:    48 test files, 443 tests

Cobertura:
├── Backend:  82.5% promedio
└── Frontend: 78.3% promedio
```

---

## 🎯 Prioridades de Testing

### Alta Prioridad (100% cobertura)
- ✅ Autenticación y autorización
- ✅ CRUD de servidores
- ✅ Evaluación de alertas
- ✅ Generación de reportes

### Media Prioridad (75%+ cobertura)
- ✅ Utilidades (hash, JWT)
- ✅ Servicios de API
- ✅ Hooks custom
- ✅ Consulta de métricas

### Baja Prioridad (50%+ cobertura)
- ✅ Componentes UI (visual)
- ✅ Estilos y temas
- ✅ Configuración

---

## 📝 Agregar Nuevo Test

### Pasos

1. **Crear archivo** en directorio apropiado
   ```bash
   # Backend
   backend/tests/my-feature.unit.test.ts
   backend/tests/my-feature.integration.test.ts

   # Frontend
   frontend/src/services/myService.test.ts
   frontend/src/hooks/useMyHook.test.ts
   ```

2. **Escribir test** siguiendo patrón AAA
   ```typescript
   describe('Feature', () => {
     it('should do something', () => {
       // Arrange
       // Act
       // Assert
     });
   });
   ```

3. **Ejecutar test**
   ```bash
   npm test -- my-feature
   npm run test:watch -- my-feature
   ```

4. **Verificar cobertura**
   ```bash
   npm run test:coverage
   ```

---

## 🔗 Referencias

- [Documentación Completa](./TESTING.md)
- [Ejemplos Prácticos](./TESTING_EXAMPLES.md)
- [Quick Reference](../TESTING_QUICK_REFERENCE.md)

---

**Última actualización:** Marzo 2026
**Versión:** 1.0.0
**Proyecto:** Plataforma de Monitoreo en Tiempo Real
