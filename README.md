# Plataforma de Monitoreo en Tiempo Real

> Universidad Catolica Boliviana "San Pablo"  
> Maestria en Full Stack Development  
> Especialidad en Arquitectura y Desarrollo de Software Avanzado

## Descripcion

Plataforma full stack para el monitoreo en tiempo real de servidores y servicios TI, orientada a escenarios bancarios y de cumplimiento ASFI. El proyecto integra backend con Express y TypeScript, frontend con React + Vite, base de datos SQLite, Prometheus, Grafana, exporters mock, WebSocket para alertas en tiempo real y generacion de reportes PDF.

Este README refleja el estado real del codigo actual del repositorio.

## Estado actual

- Backend API funcional con JWT, roles, Swagger, SQLite y WebSocket.
- Frontend funcional con login, dashboard, servidores, alertas y reportes.
- Monitoreo operativo con Prometheus, Grafana embebido y exporters mock de SPI, ATC, Linkser y servidores.
- Alertas con thresholds, acknowledge, resolve y notificaciones en tiempo real.
- Reportes PDF y reporte ASFI disponibles desde la UI y la API.
- Testing implementado en backend y frontend, con scripts de coverage incluidos.

## Stack real del proyecto

| Capa | Tecnologia | Version / notas |
|---|---|---|
| Frontend | React + TypeScript + Vite | React 18.3.1, Vite 6.3.5 |
| UI | Tailwind CSS + shadcn/ui + Radix UI | Tailwind 4.1.12 |
| Componentes complementarios | Material UI | 7.3.5 |
| Graficos | Recharts | 2.15.2 |
| Formularios | React Hook Form + Zod | validacion en frontend |
| Backend | Node.js + Express + TypeScript | Node 20+, Express 4.19 |
| Base de datos | SQLite | better-sqlite3 11 |
| Autenticacion | JWT + bcryptjs | roles ADMIN / OPERATOR / AUDITOR |
| Tiempo real | Socket.IO | backend + frontend |
| Reportes | PDFKit | PDF descargable |
| Email | Nodemailer | modo real o emulado |
| Monitoreo | Prometheus | v2.48 |
| Visualizacion | Grafana | 10.2 |
| Documentacion API | Swagger UI + OpenAPI | `/api-docs` |
| Testing backend | Jest + Supertest | unit + integration |
| Testing frontend | Vitest + Testing Library | componentes, hooks y servicios |

## Funcionalidades implementadas

### Autenticacion y seguridad

- Login con JWT.
- Verificacion de token y cierre de sesion.
- Cambio de contrasena.
- Consulta y actualizacion de perfil (`/api/auth/me`).
- Protected routes en frontend.
- Inyeccion automatica del token en Axios.
- Roles y autorizacion por endpoint.
- Helmet, CORS configurable, compresion y request logging.
- Swagger disponible en `http://localhost:3000/api-docs`.

### Dashboard y monitoreo

- Tarjetas resumen de servidores, CPU, memoria, disco y disponibilidad.
- Grafico historico de metricas.
- Auto refresh periodico.
- Vista unificada de 8 entidades sembradas por defecto:
  - `srv-app-01`
  - `srv-app-02`
  - `srv-db-01`
  - `srv-web-01`
  - `srv-cache-01`
  - `spi-gateway`
  - `atc-gateway`
  - `linkser-gateway`
- Dashboard de Grafana embebido en la pagina principal.
- Consulta separada de metricas nacionales para SPI, ATC y Linkser.

### Gestion de servidores

- CRUD de servidores.
- Modal de alta y edicion.
- Estados visuales `online`, `offline`, `degraded`, `unknown`.
- Consulta de estado y metricas por servidor desde la API.

### Alertas y tiempo real

- Vista de alertas activas.
- Vista de historial completo.
- Configuracion de thresholds globales o por servidor.
- Acknowledge y resolve de alertas.
- Evaluacion automatica de thresholds desde el backend.
- WebSocket autenticado para eventos en tiempo real.
- Indicador de conexion realtime en el layout.
- Toasts y puente de alertas en frontend.

### Reportes

- Generacion de reportes `daily`, `weekly`, `monthly` y `asfi`.
- Seleccion de rango de fechas.
- Filtro opcional por servidores.
- Descarga de PDF.
- Listado e historial de reportes generados.
- Estadisticas de reportes desde la API.

### Monitoreo externo con Prometheus y Grafana

- `prometheus/prometheus.yml` configurado con jobs para backend y exporters mock.
- `grafana/provisioning/` con datasource y dashboard provisionados.
- Exporters mock incluidos:
  - `mock-exporters/spi-exporter`
  - `mock-exporters/atc-exporter`
  - `mock-exporters/linkser-exporter`
  - `mock-exporters/server-exporter`

## Estructura relevante

```text
proyecto-especialidad-monitoreo/
|-- backend/
|   |-- src/
|   |   |-- app.ts
|   |   |-- server.ts
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- database/
|   |   |-- dtos/
|   |   |-- middlewares/
|   |   |-- repositories/
|   |   |-- routes/
|   |   |-- services/
|   |   |-- utils/
|   |   `-- websocket/
|   `-- tests/
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |-- contexts/
|   |   |-- hooks/
|   |   |-- services/
|   |   `-- styles/
|-- grafana/
|-- prometheus/
|-- mock-exporters/
|-- docker-compose.yml
|-- docker-compose.dev.yml
`-- monitoring-platform-api.json
```

## Credenciales por defecto

Las seeds crean estos usuarios si no existen:

```text
ADMIN
username: admin
password: admin123

OPERATOR
username: operator
password: operator123
```

## Variables de entorno principales

El archivo base es `.env.example`.

Variables clave:

```env
NODE_ENV=development
PORT=3000
DATABASE_PATH=./data/monitoring.db

JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
JWT_EXPIRATION=1h

CORS_ALLOWED_ORIGINS=http://localhost,http://localhost:5173
CORS_ALLOW_CREDENTIALS=true

PROMETHEUS_URL=http://prometheus:9090

SMTP_MODE=emulated
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@monitoring.com
SMTP_SECURE=false
ALERT_EMAIL_TO=admin@monitoring.local
SMTP_MAX_RETRIES=3
SMTP_RETRY_DELAY_MS=250
EMAIL_EMULATION_OUTPUT_DIR=./data/emulated-emails

VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
```

### Nota sobre `VITE_WS_URL`

El cliente Socket.IO normaliza la URL automaticamente. Puedes usar:

- `http://localhost:3000`
- `ws://localhost:3000/ws`

En ambos casos el hook elimina el sufijo `/ws` si aparece y usa internamente `path: '/ws'`.

### Modo SMTP emulado

Si `SMTP_MODE=emulated`, el backend:

- usa `jsonTransport` de Nodemailer
- no requiere `SMTP_HOST`
- persiste una copia HTML del correo en `EMAIL_EMULATION_OUTPUT_DIR`

Esto permite probar alertas criticas sin un servidor SMTP real.

## Ejecucion local

### 1. Preparar variables de entorno

PowerShell:

```powershell
Copy-Item .env.example .env
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

Disponible en:

- API: `http://localhost:3000/api`
- Health: `http://localhost:3000/api/health`
- Swagger UI: `http://localhost:3000/api-docs`
- Swagger JSON: `http://localhost:3000/api-docs.json`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Disponible en:

- App: `http://localhost:5173`

## Ejecucion con Docker

### Desarrollo

```bash
docker compose -f docker-compose.dev.yml up --build
```

Servicios expuestos:

- Frontend dev: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`

### Produccion / stack integrado

```bash
docker compose up -d --build
```

Servicios expuestos:

- Frontend: `http://localhost`
- Backend API: `http://localhost:3000/api`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001`
- Grafana proxied: `http://localhost/grafana`

## Endpoints principales

### Auth

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/verify`
- `POST /api/auth/logout`
- `POST /api/auth/change-password`
- `GET /api/auth/me`
- `PUT /api/auth/me`

### Servers

- `GET /api/servers`
- `GET /api/servers/:id`
- `POST /api/servers`
- `PUT /api/servers/:id`
- `DELETE /api/servers/:id`
- `GET /api/servers/:id/status`
- `GET /api/servers/:id/metrics`

### Metrics

- `GET /api/metrics`
- `GET /api/metrics/summary`
- `GET /api/metrics/history`
- `GET /api/metrics/history/:serverId`
- `GET /api/metrics/spi`
- `GET /api/metrics/atc`
- `GET /api/metrics/linkser`
- `GET /api/metrics/server/:serverId`
- `GET /api/metrics/prometheus`

### Alerts

- `GET /api/alerts`
- `GET /api/alerts/active`
- `GET /api/alerts/:id`
- `GET /api/alerts/thresholds`
- `POST /api/alerts/thresholds`
- `PUT /api/alerts/thresholds/:id`
- `DELETE /api/alerts/thresholds/:id`
- `PUT /api/alerts/:id/acknowledge`
- `PUT /api/alerts/:id/resolve`

### Reports

- `GET /api/reports`
- `GET /api/reports/statistics`
- `GET /api/reports/:id`
- `GET /api/reports/:id/download`
- `POST /api/reports/generate`
- `POST /api/reports/generate/asfi`
- `DELETE /api/reports/:id`

## Scripts utiles

### Backend

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run lint:fix
npm run test
npm run test:watch
npm run test:coverage
npm run migration:run
npm run seed
```

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run lint:fix
npm run test
npm run test:watch
npm run test:coverage
```

## Testing actual

El repositorio ya incluye suites activas en ambos lados:

- Backend: 25 archivos de prueba entre unit e integration.
- Frontend: 23 archivos de prueba para paginas, componentes, hooks y servicios.

Comandos recomendados:

```bash
# Backend
cd backend
npm run test
npm run test:coverage

# Frontend
cd frontend
npm run test
npm run test:coverage
```

## Base de datos

SQLite se inicializa automaticamente al levantar el backend.

Migraciones actuales:

- `001_initial`
- `002_seed_data`
- `003_reports_update`

Tablas principales:

- `users`
- `roles`
- `user_roles`
- `servers`
- `alert_thresholds`
- `alerts`
- `reports`
- `audit_logs`
- `metrics_cache`
- `migrations`

## Rutas frontend actuales

- `/login`
- `/`
- `/servers`
- `/alerts`
- `/reports`

## Comandos utiles para ejecutar consultas desde un contenedo sqlite

docker run --rm -it   --volumes-from monitoring-backend   keinos/sqlite3   sqlite3 /app/data/monitoring.db "SELECT * FROM alert_thresholds ORDER BY created_at DESC LIMIT 10;"

docker run --rm -it   --volumes-from monitoring-backend   keinos/sqlite3   sqlite3 /app/data/monitoring.db "SELECT * FROM metrics_cache ORDER BY timestamp DESC LIMIT 10;"



## Licencia

Proyecto academico. El `backend/package.json` declara licencia `MIT`.

## Autor

**Jorge Siles Zepita**  
Maestria en Full Stack Development - 2026
