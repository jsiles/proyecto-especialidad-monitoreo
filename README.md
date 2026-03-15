# 🖥️ Plataforma de Monitoreo en Tiempo Real de Servidores y Servicios TI

> **Universidad Católica Boliviana "San Pablo"**  
> Maestría en Full Stack Development  
> Especialidad en Arquitectura y Desarrollo de Software Avanzado

## 📋 Descripción

Sistema Full Stack de monitoreo bancario para instituciones financieras bolivianas medianas, diseñado para cumplir con la **Resolución ASFI N° 362/2021** (detección de fallas < 30 minutos). Utiliza tecnologías open-source con arquitectura modular contenerizada.

## 🎯 Objetivos Principales

- ✅ Monitoreo de 5 servidores críticos + 3 sistemas nacionales simulados (SPI, ATC/Linkser)
- ✅ Detección de fallas en menos de 30 minutos
- ✅ Generación automática de reportes ASFI (diario y semanal)
- ✅ Dashboard en tiempo real con métricas de CPU, RAM y disponibilidad
- ✅ Sistema de alertas con acknowledge/resolve

## 🛠️ Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|------------|---------|
| **Frontend** | React + TypeScript + Vite | 18.3.1 |
| **Styling** | Tailwind CSS + shadcn/ui | 4.x |
| **Backend** | Node.js + Express + TypeScript | 20.x LTS |
| **Base de Datos** | SQLite | 3.x |
| **Monitoreo** | Prometheus | 2.x |
| **Visualización** | Grafana | 10.x |
| **Contenedores** | Docker + Docker Compose | Latest |
| **Autenticación** | JWT + bcrypt | - |

## 📊 Estado del Proyecto

```
✅ Fase 1: Setup e Infraestructura         (100%)
✅ Fase 2: Backend Core                    (100%)
✅ Fase 3: API REST y Base de Datos        (100%)
✅ Fase 4: Frontend Base                   (100%)
✅ Fase 5: Integración Frontend-Backend    (100%)
⏳ Fase 6: Monitoreo Prometheus/Grafana    (0%)
⏳ Fase 7: Sistema de Alertas Avanzado     (0%)
⏳ Fase 8: Reportes ASFI                   (0%)
────────────────────────────────────────────────
PROGRESO TOTAL: 60%
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 20+ instalado
- Puerto 3000 (backend) y 5173 (frontend) disponibles

### Ejecución en Desarrollo

```bash
# 1. Clonar el repositorio
git clone <repository-url>
cd proyecto-especialidad-monitoreo

# 2. Backend (Terminal 1)
cd backend
npm install
npm run dev
# ✅ Backend: http://localhost:3000
# ✅ Swagger: http://localhost:3000/api-docs

# 3. Frontend (Terminal 2)
cd frontend
npm install
npm run dev
# ✅ Frontend: http://localhost:5173
```

### Credenciales de Acceso

```
Username: admin
Password: admin123
```

### Ejecución con Docker (Pendiente - Fase 6+)

```bash
# Copiar variables de entorno
cp .env.example .env

# Levantar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

### Acceso a la aplicación

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000/api
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## 📁 Estructura del Proyecto

```
proyecto-especialidad-monitoreo/
├── frontend/          # React + TypeScript
├── backend/           # Node.js + Express + TypeScript
├── prometheus/        # Configuración de Prometheus
├── grafana/           # Dashboards y datasources
├── mock-exporters/    # Simuladores de métricas
├── docker-compose.yml
└── Dockerfile
```

## 📊 Funcionalidades Implementadas

### ✅ Dashboard (Tiempo Real)
- ✅ Estado general de servidores (online/offline)
- ✅ Métricas en tiempo real (CPU, RAM, Disk, Availability)
- ✅ Gráficos de área con 3 métricas simultáneas
- ✅ Auto-refresh cada 10 segundos
- ✅ Panel de alertas activas
- ✅ Lista de servidores con estados visuales

### ✅ Gestión de Servidores
- ✅ CRUD completo (Create, Read, Update, Delete)
- ✅ Formulario modal de creación/edición
- ✅ Validación de datos
- ✅ Estados visuales (online/offline/degraded)
- ✅ Filtrado por tipo y ambiente
- ✅ Confirmación de eliminación

### ✅ Sistema de Alertas
- ✅ 3 vistas: Active Alerts, All Alerts, Thresholds
- ✅ Configuración de umbrales personalizados
- ✅ Acknowledge de alertas
- ✅ Resolución de alertas
- ✅ Indicadores visuales por severidad (critical/warning/info)
- ✅ Historial completo de alertas
- ✅ CRUD de umbrales (Create, Delete)
- ✅ Auto-refresh cada 10 segundos

### ✅ Reportes ASFI
- ✅ Generación rápida de reporte ASFI
- ✅ Reportes personalizados (daily/weekly/monthly)
- ✅ Selección de rango de fechas
- ✅ Filtrado por servidores específicos
- ✅ Descarga de PDFs
- ✅ Historial de reportes generados
- ✅ Visualización de metadatos

### ✅ Autenticación y Seguridad
- ✅ Login con JWT
- ✅ Auto-logout en token expirado
- ✅ Protected routes
- ✅ Roles y permisos (Admin/Operator/Auditor)
- ✅ Contraseñas hasheadas (bcrypt)
- ✅ Logs de auditoría

### ⏳ Próximas Funcionalidades (Fases 6-8)
- ⏳ Integración con Prometheus
- ⏳ Dashboards Grafana embebidos
- ⏳ Notificaciones por email
- ⏳ WebSocket para notificaciones en tiempo real
- ⏳ Exporters de métricas (SPI, ATC, Linkser)
- ⏳ Reportes PDF con gráficos
- ⏳ Cálculo de MTTR y MTBF

## 🔐 Seguridad

- Autenticación JWT con expiración
- Contraseñas hasheadas con bcrypt
- HTTPS/TLS para comunicación
- Headers de seguridad (CSP, X-Frame-Options, HSTS)
- Logs de auditoría

## Endpoints implementados

- AUTH
- POST   /api/auth/login
- POST   /api/auth/register
- GET    /api/auth/verify
- POST   /api/auth/logout
- POST   /api/auth/change-password
- GET    /api/auth/me

- SERVERS
- GET    /api/servers
- GET    /api/servers/:id
- POST   /api/servers (admin only)
- PUT    /api/servers/:id (admin only)
- DELETE /api/servers/:id (admin only)
- GET    /api/servers/:id/status
- GET    /api/servers/:id/metrics

- ALERTS
- GET    /api/alerts
- GET    /api/alerts/active
- GET    /api/alerts/:id
- PUT    /api/alerts/:id/acknowledge
- PUT    /api/alerts/:id/resolve
- GET    /api/alerts/thresholds
- POST   /api/alerts/thresholds (admin only)
- PUT    /api/alerts/thresholds/:id (admin only)
- DELETE /api/alerts/thresholds/:id (admin only)

- METRICS
- GET    /api/metrics
- GET    /api/metrics/summary
- GET    /api/metrics/history
- GET    /api/metrics/history/:serverId
- GET    /api/metrics/prometheus

- REPORTS
- GET    /api/reports
- GET    /api/reports/statistics
- GET    /api/reports/:id
- GET    /api/reports/:id/download
- POST   /api/reports/generate (admin/operator)
- POST   /api/reports/generate/asfi (admin/operator)
- DELETE /api/reports/:id (admin only)

## � Documentación Adicional

- 📖 [**Guía Rápida de Testing**](GUIA_RAPIDA_TESTING.md) - Instrucciones paso a paso para probar la aplicación
- ✅ [**Fase 5 Completada**](FASE_5_COMPLETADA.md) - Resumen detallado de la integración frontend-backend
- 📋 [**Instrucciones de Desarrollo**](.github/copilot-instructions.md) - Guía completa del proyecto y estándares

## 🎯 Guía de Testing Rápida

### 1. Iniciar Aplicación
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm run dev
```

### 2. Acceder
- URL: http://localhost:5173/login
- User: `admin`
- Pass: `admin123`

### 3. Probar Flujo Completo
1. ✅ Login → Dashboard
2. ✅ Servers → Crear/Editar/Eliminar servidor
3. ✅ Alerts → Ver alertas, crear threshold, acknowledge/resolve
4. ✅ Reports → Generar reporte ASFI, descargar PDF
5. ✅ Logout

## 🔧 Comandos Útiles

```bash
# Backend
npm run dev          # Desarrollo con hot-reload
npm run build        # Compilar TypeScript
npm run start        # Producción
npm run test         # Ejecutar tests
npm run lint         # Linter

# Frontend
npm run dev          # Desarrollo con Vite
npm run build        # Build para producción
npm run preview      # Preview del build
npm run lint         # Linter
```

## �📝 Licencia

Proyecto académico - Universidad Católica Boliviana "San Pablo"

## 👤 Autor

**Jorge Siles Zepita**  
Maestría en Full Stack Development - 2026
