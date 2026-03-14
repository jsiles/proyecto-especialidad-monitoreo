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
- ✅ Sistema de alertas por email

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Frontend | React 18 + TypeScript + Material-UI |
| Backend | Node.js + Express + TypeScript |
| Base de Datos | SQLite |
| Monitoreo | Prometheus |
| Visualización | Grafana |
| Contenedores | Docker + Docker Compose |
| Autenticación | JWT + bcrypt |

## 🚀 Inicio Rápido

### Prerrequisitos

- Docker y Docker Compose instalados
- Node.js 20+ (para desarrollo local)

### Ejecución con Docker

```bash
# Clonar el repositorio
git clone <repository-url>
cd proyecto-especialidad-monitoreo

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

## 📊 Funcionalidades

### Dashboard
- Estado general de servidores (semáforo visual)
- Métricas en tiempo real (CPU, RAM, disponibilidad)
- Gráficos históricos (últimos 7 días)

### Alertas
- Configuración de umbrales
- Notificaciones por email
- Historial de alertas

### Reportes ASFI
- Reporte diario de disponibilidad
- Reporte semanal de incidentes
- Exportación en PDF

### Sistemas Simulados
- **SPI**: Sistema de Pagos Interbancarios
- **ATC**: Autorización de Tarjetas
- **Linkser**: Pagos Electrónicos

## 🔐 Seguridad

- Autenticación JWT con expiración
- Contraseñas hasheadas con bcrypt
- HTTPS/TLS para comunicación
- Headers de seguridad (CSP, X-Frame-Options, HSTS)
- Logs de auditoría

## 📝 Licencia

Proyecto académico - Universidad Católica Boliviana "San Pablo"

## 👤 Autor

**Jorge Siles Zepita**  
Maestría en Full Stack Development - 2026
