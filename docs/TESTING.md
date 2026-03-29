# 🧪 Guía de Testing - Plataforma de Monitoreo

Documentación completa sobre cómo ejecutar, escribir y mantener pruebas en el proyecto.

---

## 📋 Tabla de Contenidos

1. [Configuración Rápida](#configuración-rápida)
2. [Backend - Jest](#backend---jest)
3. [Frontend - Vitest](#frontend---vitest)
4. [Ejecución de Pruebas](#ejecución-de-pruebas)
5. [Escritura de Pruebas](#escritura-de-pruebas)
6. [Cobertura de Código](#cobertura-de-código)
7. [Integración Continua](#integración-continua)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Configuración Rápida

### Backend (Node.js + Jest)
```bash
# Instalar dependencias
cd backend
npm install

# Ejecutar todas las pruebas
npm test

# Ejecutar en modo watch (detecta cambios)
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage
```

### Frontend (React + Vitest)
```bash
# Instalar dependencias
cd frontend
npm install

# Ejecutar todas las pruebas
npm test

# Ejecutar en modo watch
npm run test:watch

# Generar reporte de cobertura
npm run test:coverage
```

---

## 🔧 Backend - Jest

### Estructura de Archivos de Prueba

```
backend/tests/
├── setup.ts                                    # Configuración global
├── unit/                                       # Tests unitarios
│   ├── auth-service.unit.test.ts
│   ├── alert-service.unit.test.ts
│   ├── server-service.unit.test.ts
│   ├── report-service.unit.test.ts
│   ├── prometheus-service.unit.test.ts
│   ├── jwt-utils.unit.test.ts
│   ├── password-utils.unit.test.ts
│   ├── notification.unit.test.ts
│   ├── monitoring.unit.test.ts
│   ├── repositories-dtos.unit.test.ts
│   ├── repositories-extended.unit.test.ts
│   ├── controllers-auth-server.unit.test.ts
│   ├── controllers-alert-report.unit.test.ts
│   ├── controllers-monitoring-metrics.unit.test.ts
│   └── email-alertevaluation.unit.test.ts
├── integration/                                # Tests de integración
│   ├── auth.integration.test.ts
│   ├── auth-service.integration.test.ts
│   ├── servers.integration.test.ts
│   ├── alerts.integration.test.ts
│   ├── monitoring.integration.test.ts
│   ├── reports.integration.test.ts
│   ├── reports-extended.integration.test.ts
│   ├── websocket.integration.test.ts
│   └── health.test.ts
└── fixtures/                                   # Datos de prueba
    └── mock-data.ts
```

### Configuración Jest (`jest.config.js`)

```javascript
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',              // Usar TypeScript con Jest
  testEnvironment: 'node',        // Ambiente Node.js
  roots: ['<rootDir>/tests'],     // Ubicación de pruebas
  testMatch: ['**/*.test.ts'],    // Patrón de archivos de prueba
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],  // Setup global
  transform: {
    '^.+\\.tsx?$': 'ts-jest',     // Transformar TypeScript
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  clearMocks: true,               // Limpiar mocks después de cada test
};
```

### Ejemplos de Tests Backend

#### Test Unitario - AuthService
```typescript
// backend/tests/auth-service.unit.test.ts
import { AuthService } from '../src/services/AuthService';
import { UserRepository } from '../src/repositories/UserRepository';
import * as passwordUtils from '../src/utils/password-utils';
import * as jwtUtils from '../src/utils/jwt-utils';

jest.mock('../src/repositories/UserRepository');
jest.mock('../src/utils/password-utils');
jest.mock('../src/utils/jwt-utils');

describe('AuthService - Unit Tests', () => {
  let authService: AuthService;
  let mockUserRepo: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepo = new UserRepository() as jest.Mocked<UserRepository>;
    authService = new AuthService(mockUserRepo);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('debe retornar token y datos del usuario en credenciales válidas', async () => {
      // Arrange
      const credentials = { username: 'admin', password: 'pass123' };
      const mockUser = {
        id: '1',
        username: 'admin',
        password_hash: 'hashed',
        email: 'admin@test.com',
        roles: ['ADMIN']
      };

      mockUserRepo.findByUsername.mockResolvedValue(mockUser);
      (passwordUtils.comparePassword as jest.Mock).mockResolvedValue(true);
      (jwtUtils.generateToken as jest.Mock).mockReturnValue('token123');

      // Act
      const result = await authService.login(credentials);

      // Assert
      expect(result).toHaveProperty('token', 'token123');
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('password_hash');
      expect(mockUserRepo.findByUsername).toHaveBeenCalledWith('admin');
    });

    it('debe lanzar error con credenciales inválidas', async () => {
      const credentials = { username: 'admin', password: 'wrong' };
      mockUserRepo.findByUsername.mockResolvedValue(null);

      await expect(authService.login(credentials))
        .rejects
        .toThrow('Credenciales inválidas');
    });
  });
});
```

#### Test de Integración - Auth Endpoints
```typescript
// backend/tests/auth.integration.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/database/connection';
import * as passwordUtils from '../src/utils/password-utils';

describe('Authentication - Integration Tests', () => {
  beforeAll(async () => {
    // Setup: crear usuario de prueba
    const hashedPassword = await passwordUtils.hashPassword('testPass123');
    db.prepare(`
      INSERT INTO users (id, username, password_hash, email) 
      VALUES (?, ?, ?, ?)
    `).run('test-user-1', 'testuser', hashedPassword, 'test@example.com');
  });

  afterAll(async () => {
    // Cleanup
    db.prepare('DELETE FROM users WHERE id = ?').run('test-user-1');
  });

  describe('POST /api/auth/login', () => {
    it('debe loguear exitosamente con credenciales válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testPass123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('debe retornar 401 para contraseña inválida', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/verify', () => {
    let validToken: string;

    beforeAll(async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testPass123'
        });
      validToken = loginResponse.body.data.token;
    });

    it('debe verificar token válido', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
    });

    it('debe rechazar token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });
  });
});
```

### Comandos Backend

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas específicas
npm test -- auth.integration.test.ts
npm test -- auth-service.unit.test.ts

# Ejecutar en modo watch (auto-recargar)
npm run test:watch

# Ejecutar tests de un patrón específico
npm test -- --testNamePattern="login"

# Generar reporte de cobertura
npm run test:coverage

# Ver cobertura en navegador (después de generaterar coverage)
npm run test:coverage -- --verbose
```

---

## 🎨 Frontend - Vitest

### Estructura de Archivos de Prueba

```
frontend/src/
├── main.test.tsx                             # App principal
├── app/
│   ├── App.test.tsx
│   ├── routes.test.tsx
│   ├── components/
│   │   ├── Layout.test.tsx
│   │   ├── ProtectedRoute.test.tsx
│   │   ├── RealtimeAlertsBridge.test.tsx
│   │   └── figma/
│   │       └── ImageWithFallback.test.tsx
│   └── pages/
│       ├── Login.test.tsx
│       ├── Dashboard.test.tsx
│       ├── AlertsManagement.test.tsx
│       ├── ServersPage.test.tsx
│       └── Reports.test.tsx
├── services/
│   ├── api.test.ts
│   ├── authService.test.ts
│   ├── alertsService.test.ts
│   ├── metricsService.test.ts
│   ├── serversService.test.ts
│   └── reportsService.test.ts
├── hooks/
│   ├── useAuth.test.ts
│   ├── useAlerts.test.ts
│   ├── useMetrics.test.ts
│   ├── useServers.test.ts
│   └── useWebSocket.test.ts
└── contexts/
    └── AuthContext.test.tsx
```

### Configuración Vitest (`vitest.config.ts`)

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,                      // Usar globales (describe, it, etc)
    environment: 'jsdom',               // Ambiente de navegador
    setupFiles: ['./tests/setup.ts'],   // Archivos de setup
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/setup.ts',
      ]
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### Ejemplos de Tests Frontend

#### Test Unitario - Service
```typescript
// frontend/src/services/authService.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from './authService';
import * as api from './api';

vi.mock('./api');

describe('authService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('debe retornar token en login exitoso', async () => {
      const mockResponse = {
        success: true,
        data: {
          token: 'jwt-token-123',
          user: { id: '1', username: 'admin', email: 'admin@test.com' }
        }
      };

      vi.mocked(api.post).mockResolvedValue(mockResponse);

      const result = await authService.login('admin', 'password');

      expect(result).toEqual(mockResponse.data);
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        username: 'admin',
        password: 'password'
      });
    });

    it('debe lanzar error en login fallido', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new Error('Credenciales inválidas')
      );

      await expect(authService.login('admin', 'wrong'))
        .rejects
        .toThrow('Credenciales inválidas');
    });
  });
});
```

#### Test de Componente - React
```typescript
// frontend/src/app/pages/Login.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import { Login } from './Login';
import * as authService from '../../services/authService';

vi.mock('../../services/authService');
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe('Login - Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar formulario de login', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('debe enviar credenciales al hacer clic en Sign In', async () => {
    vi.mocked(authService.login).mockResolvedValue({
      token: 'test-token',
      user: { id: '1', username: 'admin', email: 'admin@test.com' }
    });

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('admin', 'password');
    });
  });

  it('debe mostrar error en login fallido', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new Error('Credenciales inválidas')
    );

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/credenciales inválidas/i)).toBeInTheDocument();
    });
  });
});
```

#### Test de Hook Custom
```typescript
// frontend/src/hooks/useAuth.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth';

describe('useAuth - Custom Hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe retornar isAuthenticated=false inicialmente', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('debe guardar token en localStorage al login', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setToken('test-token');
      result.current.setUser({ id: '1', username: 'admin' });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('token')).toBe('test-token');
  });

  it('debe limpiar datos al logout', () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      result.current.setToken('test-token');
      result.current.setUser({ id: '1', username: 'admin' });
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
  });
});
```

### Comandos Frontend

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar en modo watch
npm run test:watch

# Ejecutar pruebas específicas
npm test -- Login.test.tsx
npm test -- hooks/useAuth.test.ts

# Generar reporte de cobertura
npm run test:coverage

# Ejecutar con patrón de nombre
npm test -- --reporter=verbose
```

---

## 📊 Ejecución de Pruebas

### Correr Todas las Pruebas

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test

# O desde la raíz con Docker
docker-compose exec app npm test
```

### Resultado Esperado

```
PASS  backend/tests/auth.integration.test.ts
PASS  backend/tests/auth-service.unit.test.ts
PASS  backend/tests/server-service.unit.test.ts
PASS  backend/tests/alert-service.unit.test.ts
...

Test Suites: 25 passed, 25 total
Tests:       287 passed, 287 total
Snapshots:   0 total
Time:        45.234 s

PASS  frontend/src/app/App.test.tsx
PASS  frontend/src/services/authService.test.ts
...

Test Suites: 23 passed, 23 total
Tests:       156 passed, 156 total
Time:        23.456 s
```

### Monitoreo de Tests (Watch Mode)

```bash
# Backend - recarga automática
cd backend && npm run test:watch

# Frontend - recarga automática
cd frontend && npm run test:watch

# Presionar 'a' para ejecutar todos los tests
# Presionar 'f' para re-ejecutar tests fallidos
# Presionar 'q' para salir
```

---

## ✍️ Escritura de Pruebas

### Principios Clave

1. **AAA Pattern (Arrange-Act-Assert)**
   ```typescript
   // Arrange: Preparar datos
   const user = { id: '1', username: 'admin' };
   
   // Act: Ejecutar acción
   const result = await authService.validateUser(user);
   
   // Assert: Verificar resultado
   expect(result).toBe(true);
   ```

2. **Nombres Descriptivos**
   ```typescript
   // ❌ Malo
   it('works', () => {});
   
   // ✅ Bueno
   it('debe retornar usuario con email válido cuando credenciales son correctas', () => {});
   ```

3. **Una Aserción Principal por Test**
   ```typescript
   // ✅ Bien enfocado
   it('debe generar hash seguro de contraseña', async () => {
     const hash = await hashPassword('password123');
     expect(hash).not.toBe('password123'); // No es plaintext
   });
   ```

4. **Mock Solo Dependencias Externas**
   ```typescript
   // ✅ Correcto
   jest.mock('../src/repositories/UserRepository'); // Dependencia externa
   
   // ❌ Evitar
   jest.mock('../src/utils/hashPassword'); // Función interna
   ```

### Patrón: Test Unitario

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MyService } from '../src/services/MyService';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService();
  });

  afterEach(() => {
    // Limpieza si es necesaria
  });

  describe('method1', () => {
    it('debe hacer X cuando condición Y', () => {
      // Arrange
      const input = { foo: 'bar' };

      // Act
      const result = service.method1(input);

      // Assert
      expect(result).toEqual({ success: true });
    });

    it('debe lanzar error cuando input es inválido', () => {
      expect(() => {
        service.method1(null);
      }).toThrow('Invalid input');
    });
  });
});
```

### Patrón: Test de Integración

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app';

describe('API Endpoints - Integration', () => {
  beforeAll(async () => {
    // Setup: crear datos de prueba
  });

  afterAll(async () => {
    // Cleanup: eliminar datos de prueba
  });

  describe('GET /api/users', () => {
    it('debe retornar lista de usuarios autenticado', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('debe retornar 401 sin autenticación', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });
  });
});
```

### Patrón: Test de React Component

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar con props correctas', () => {
    render(<MyComponent title="Test" onClick={vi.fn()} />);

    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('debe ejecutar callback al hacer clic', async () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  it('debe mostrar estado de carga', async () => {
    render(<MyComponent isLoading={true} />);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });
});
```

---

## 📈 Cobertura de Código

### Configuración

**Backend (`jest.config.js`):**
```javascript
module.exports = {
  // ...
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

**Frontend (`vitest.config.ts`):**
```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: ['node_modules/', 'dist/'],
      lines: 75,
      functions: 75,
      branches: 70,
      statements: 75
    }
  }
});
```

### Generar Reportes

```bash
# Backend
cd backend
npm run test:coverage

# Abrir en navegador
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html # Windows
xdg-open coverage/lcov-report/index.html # Linux

# Frontend
cd frontend
npm run test:coverage
```

### Interpretar Reportes

```
File                    | Stmts | Branch | Funcs | Lines
-----------------------------------------------------------------
All files              |  82.5 |  71.2  | 80.1  | 82.5
 src/services          |  85.0 |  75.0  | 85.0  | 85.0
  authService.ts       |  90.0 |  80.0  | 90.0  | 90.0
  metricsService.ts    |  80.0 |  70.0  | 80.0  | 80.0
 src/utils             |  78.0 |  68.0  | 78.0  | 78.0
```

- **Stmts**: Porcentaje de sentencias ejecutadas
- **Branch**: Porcentaje de bifurcaciones (if/else) ejecutadas
- **Funcs**: Porcentaje de funciones ejecutadas
- **Lines**: Porcentaje de líneas ejecutadas

### Meta de Cobertura

| Tipo | Backend | Frontend | Descripción |
|------|---------|----------|-------------|
| Statements | 80% | 75% | Líneas de código |
| Branches | 70% | 70% | Rutas if/else |
| Functions | 80% | 75% | Funciones |
| Lines | 80% | 75% | Líneas físicas |

---

## 🔄 Integración Continua

### GitHub Actions (Ejemplo)

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd backend && npm ci
      - run: cd backend && npm run lint
      - run: cd backend && npm test
      - run: cd backend && npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage/coverage-final.json

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm test
      - run: cd frontend && npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./frontend/coverage/coverage-final.json
```

### Pre-commit Hook (Opcional)

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🧪 Running tests..."
npm run test -- --bail

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit abortado."
  exit 1
fi

echo "✅ Tests pasaron. Continuando..."
```

---

## 🐛 Troubleshooting

### Backend

#### "Cannot find module"
```
Error: Cannot find module '../src/services/AuthService'

Solución:
1. Verificar ruta correcta
2. Asegurar que archivo existe
3. Revisar tsconfig.json compilerOptions
```

#### "Test timeout"
```
Error: Exceeded timeout of 5000ms

Solución:
it('test name', async () => {
  // Aumentar timeout
}, 10000); // 10 segundos
```

#### "Mock no funciona"
```typescript
// ❌ Incorrecto
jest.mock('../src/services/AuthService');
import { AuthService } from '../src/services/AuthService'; // Falta

// ✅ Correcto
jest.mock('../src/services/AuthService');
import { AuthService } from '../src/services/AuthService';
import type { AuthService } from '../src/services/AuthService'; // Type para TypeScript
```

### Frontend

#### "act() warning"
```
Warning: An update inside a test was not wrapped in act()

Solución:
import { act } from '@testing-library/react';

act(() => {
  // Actualizar estado aquí
});
```

#### "useEffect no se ejecuta"
```typescript
it('test', async () => {
  render(<Component />);
  
  // Esperar efectos asíncronos
  await waitFor(() => {
    expect(screen.getByText('loaded')).toBeInTheDocument();
  });
});
```

#### "localStorage undefined"
```typescript
// Setup en archivo de configuración
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
});
```

---

## 📝 Checklist para Tests Nuevos

- [ ] Archivo test en directorio correcto
- [ ] Nombre sigue patrón `*.test.ts` o `*.test.tsx`
- [ ] Imports correctos (describe, it, expect)
- [ ] Setup y cleanup si es necesario
- [ ] Mocks de dependencias externas
- [ ] Tests unitarios e integración separados
- [ ] Nombres descriptivos
- [ ] AAA pattern (Arrange-Act-Assert)
- [ ] Coverage > threshold
- [ ] Tests ejecutan localmente
- [ ] Sin warnings en consola

---

## 📚 Recursos Adicionales

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro)
- [Supertest (API Testing)](https://github.com/visionmedia/supertest)

---

**Última actualización:** Marzo 2026
**Autor:** Jorge Siles Zepita
**Proyecto:** Plataforma de Monitoreo en Tiempo Real
