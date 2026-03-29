# 📖 Testing Guide - Ejemplos Prácticos

Ejemplos paso a paso de cómo ejecutar, escribir y depurar tests.

---

## 🎯 Casos de Uso Comunes

### Caso 1: Ejecutar TODOS los tests después de cambios

```bash
# Opción 1: Scripts automáticos
./run-tests.sh all                    # Linux/macOS
run-tests.bat all                     # Windows

# Opción 2: Comandos manuales
cd backend && npm test
cd ../frontend && npm test
```

**Resultado esperado:**
```
PASS  src/services/authService.test.ts
PASS  src/hooks/useAuth.test.ts
...

Test Suites: 48 passed, 48 total
Tests:       443 passed, 443 total
Snapshots:   0 total
Time:        67.234s
```

---

### Caso 2: Ejecutar solo backend después de cambiar AuthService

```bash
cd backend

# Opción 1: Todos los tests de auth
npm test -- auth

# Opción 2: Test específico
npm test -- auth.integration.test.ts

# Opción 3: Por nombre de test
npm test -- --testNamePattern="login"

# Opción 4: Modo watch (desarrollo)
npm run test:watch
```

**Consola de resultados:**
```
 PASS  tests/auth.integration.test.ts (2.45s)
 PASS  tests/auth-service.unit.test.ts (1.23s)
 PASS  tests/auth-dto.unit.test.ts (0.89s)

Test Suites: 3 passed, 3 total
Tests:       28 passed, 28 total
```

---

### Caso 3: Ejecutar solo frontend después de cambiar Login.tsx

```bash
cd frontend

# Opción 1: Tests del componente Login
npm test -- Login.test.tsx

# Opción 2: Por patrón de nombre
npm test -- --reporter=verbose Login

# Opción 3: Modo watch (desarrollo)
npm run test:watch
```

**Presionar durante watch mode:**
- `a` - ejecutar todos los tests
- `p` - filtrar por nombre de archivo
- `t` - filtrar por nombre de test
- `q` - salir

---

### Caso 4: Verificar cobertura de código

```bash
# Backend
cd backend
npm run test:coverage

# Ver resultados en HTML
open coverage/lcov-report/index.html   # macOS
start coverage/lcov-report/index.html  # Windows
```

**Salida de terminal:**
```
--------------------------|----------|----------|----------|----------|
File                       | % Stmts  | % Branch | % Funcs  | % Lines  |
--------------------------|----------|----------|----------|----------|
All files                  |   82.35  |   71.25  |   81.90  |   82.35  |
 src/services             |   85.00  |   75.00  |   85.00  |   85.00  |
  authService.ts          |   90.00  |   80.00  |   90.00  |   90.00  |
  alertService.ts         |   78.00  |   70.00  |   78.00  |   78.00  |
 src/utils                |   80.00  |   68.00  |   80.00  |   80.00  |
--------------------------|----------|----------|----------|----------|
```

---

### Caso 5: Depurar un test que falla

```bash
# Paso 1: Ejecutar el test específico
cd backend
npm test -- auth-service.unit.test.ts

# Paso 2: Ver output detallado
npm test -- auth-service.unit.test.ts --verbose

# Paso 3: Ejecutar en modo watch para iterar rápido
npm run test:watch
# Presionar 'p' y tipear: auth-service

# Paso 4: Agregar console.log en el test
it('should do X', () => {
  console.log('Debugging:', someValue);
  expect(true).toBe(true);
});

# Paso 5: Ver en consola durante ejecución
```

---

### Caso 6: Escribir nuevo test para Feature

```typescript
// Archivo: backend/tests/new-feature.unit.test.ts

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NewFeatureService } from '../src/services/NewFeatureService';

describe('NewFeatureService', () => {
  let service: NewFeatureService;

  beforeEach(() => {
    service = new NewFeatureService();
  });

  // Test 1: Caso feliz
  it('should return correct result when input is valid', () => {
    const input = { foo: 'bar' };
    const result = service.process(input);
    expect(result).toEqual({ status: 'success' });
  });

  // Test 2: Manejo de errores
  it('should throw error when input is null', () => {
    expect(() => {
      service.process(null);
    }).toThrow('Invalid input');
  });

  // Test 3: Validación de llamadas
  it('should call dependency method', () => {
    const input = { foo: 'bar' };
    service.process(input);
    // Agregar más assertions
  });
});
```

**Ejecutar nuevo test:**
```bash
npm test -- new-feature
# Result: PASS ✓
```

---

### Caso 7: Ejecutar solo tests rápidos (sin integración)

```bash
cd backend

# Ejecutar solo tests unitarios
npm test -- --testPathPattern="unit"

# Saltar tests de integración
npm test -- --testPathIgnorePatterns="integration"
```

---

### Caso 8: CI/CD - Validación antes de commit

```bash
# Usar hook pre-commit para validar
# Archivo: .husky/pre-commit

#!/bin/sh
echo "🧪 Running tests before commit..."

cd backend && npm test -- --bail --coverage

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit abortado."
  exit 1
fi

echo "✅ Tests passed!"
```

**Usar:**
```bash
git commit -m "feat: new feature"
# Automáticamente ejecuta tests
```

---

### Caso 9: Generar reporte de cobertura para CI

```bash
# Backend
cd backend
npm run test:coverage -- --collectCoverageFrom="src/**/*.ts"

# Frontend
cd frontend
npm run test:coverage -- --coverage.reporter=json

# Enviar a servicio de cobertura (codecov, coveralls)
```

---

### Caso 10: Test de integración con base de datos

```typescript
// Archivo: backend/tests/servers.integration.test.ts

import request from 'supertest';
import { app } from '../src/app';
import { db } from '../src/database/connection';

describe('Servers - Integration', () => {
  beforeAll(async () => {
    // Setup: crear servidor de prueba
    db.prepare(`
      INSERT INTO servers (id, name, ip_address, type)
      VALUES (?, ?, ?, ?)
    `).run('test-srv-1', 'Test Server', '192.168.1.1', 'web');
  });

  afterAll(async () => {
    // Cleanup: eliminar datos de prueba
    db.prepare('DELETE FROM servers WHERE id = ?').run('test-srv-1');
  });

  it('should list all servers', async () => {
    const response = await request(app)
      .get('/api/servers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('should create new server', async () => {
    const response = await request(app)
      .post('/api/servers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'New Server',
        ip_address: '10.0.0.1',
        type: 'database'
      })
      .expect(201);

    expect(response.body.data.id).toBeDefined();
  });
});
```

**Ejecutar:**
```bash
npm test -- servers.integration.test.ts
```

---

## 🔄 Flujo Típico de Desarrollo

```
1. Implementar nueva feature
   ↓
2. Escribir tests
   ↓
3. npm run test:watch
   ↓
4. Iterar hasta que pasen
   ↓
5. npm run test:coverage (verificar cobertura)
   ↓
6. npm test (validación final)
   ↓
7. git commit
```

---

## 🐛 Troubleshooting Común

### "Tests pasan localmente pero fallan en CI"

```bash
# Verificar variables de entorno
echo $NODE_ENV  # debe ser "test"

# Verificar que npm install se ejecutó
npm ci --prefer-offline --no-audit

# Ejecutar igual que CI
npm test -- --coverage --bail
```

### "Module not found in tests"

```bash
# Verificar tsconfig.json tiene paths correctos
cat tsconfig.json | grep paths

# Verificar jest.config.js tiene moduleNameMapper
jest.config.js: moduleNameMapper

# Limpiar cache
npm test -- --clearCache
```

### "Timeout en test de integración"

```typescript
// Aumentar timeout
it('should fetch data', async () => {
  // ...
}, 10000); // 10 segundos en lugar de 5

// O globalmente en jest.config.js
testTimeout: 10000,
```

### "Mock no funciona"

```typescript
// ❌ Incorrecto
import { MyService } from './MyService';
jest.mock('./MyService');

// ✅ Correcto
jest.mock('./MyService');
import { MyService } from './MyService';

// ✅ También funciona con hoisting automático
```

---

## 📊 Monitoreo de Tests

### Dashboard de Coverage

```bash
# Generar y abrir
npm run test:coverage
# Navegar a coverage/lcov-report/index.html

# Búsqueda de archivos no testeados
grep -r "^" coverage/coverage-summary.json | grep 0
```

### Histórico de Resultados

```bash
# Guardar resultados
npm test -- --json --outputFile=test-results.json

# Comparar con ejecución anterior
diff test-results-old.json test-results-new.json
```

### Tests Más Lentos

```bash
# Ver duración de tests
npm test -- --verbose

# Identificar bottlenecks
npm test -- --detectOpenHandles
```

---

## 🎓 Buenas Prácticas

### ✅ Hace

- Escribir tests tan pronto como posible
- Usar nombres descriptivos
- Una aserción principal por test
- Mock solo dependencias externas
- Usar before/after hooks para setup/cleanup
- Verificar cobertura regularmente

### ❌ Evita

- Tests que dependen unos de otros
- Usar `any` en TypeScript
- Mocks globales sin cleanup
- Tests que acceden base de datos real
- Console.log en código de producción
- Tests que pasan por casualidad

---

## 📚 Recursos Útiles

### Documentación

- [Jest Docs](https://jestjs.io/docs)
- [Vitest Docs](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Supertest](https://github.com/visionmedia/supertest)

### Archivos de Configuración

```
backend/
├── jest.config.js          ← Configuración Jest
├── tests/
│   └── setup.ts            ← Setup global

frontend/
├── vitest.config.ts        ← Configuración Vitest
└── vitest.setup.ts         ← Setup global
```

---

## 📝 Checklist Pre-Commit

- [ ] `npm test` pasa sin errores
- [ ] `npm run test:coverage` cumple requerimientos
- [ ] No hay console.log en código
- [ ] Nombres de tests son descriptivos
- [ ] Tests limpian sus propios datos
- [ ] No hay warnings en salida

---

**Última actualización:** Marzo 2026
**Versión:** 1.0.0
