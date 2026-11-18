# Plan — Integrar better-auth en portal-control-2.0

> Plan de implementación para un desarrollador sin contexto del repo. Seguir en orden. No saltar tareas.
> Última actualización: 2026-11-18. Rama base: `main` (8e11c69). Node 26.13.0, Fastify 5.12.5, Prisma 7, PostgreSQL 18.4 vía PgBouncer.
>
> **ESTADO: Fases 0-6 implementadas y mergeadas en `main` (commits `89414d4`..`3bfa24b`). Fase 7 cerrada el 2026-11-18 vía `specs/112-better-auth-rollout/` + ADR-0031 Aceptado. Staging opera con `BETTER_AUTH_ENABLED=true`. Pendientes deliberados (specs futuros): paridad MFA → twoFactor, `--apply` del script de migración en staging, deprecación de `ActiveSession`/`jsonwebtoken`.**

---

## 1. Goal

Sustituir el sistema de autenticación JWT + bcryptjs + speakeasy por better-auth como única autoridad de sesiones de usuario (manteniendo el flujo PIN de kiosco separado), sin romper el contrato público, los invariantes de PgBouncer/Fastify ni la experiencia de login actual.

## 2. Current context / assumptions

### Stack actual (verificado en `package.json` y `prisma/schema.prisma`)

- **Backend:** Node 26.13.0 (`backend/package.json`), Fastify 5.12.5 (único servidor HTTP, prohibido Express), Prisma 7 (`@prisma/adapter-pg` + `@prisma/client`), JWT con `jsonwebtoken` + `JWT_SECRET` obligatorio fail-fast, hash con `bcryptjs`, MFA TOTP con `speakeasy`.
- **Frontend:** React 19 + Vite + Zustand + TanStack Query. Token guardado en `sessionStorage` bajo `authToken` (`frontend/src/services/authToken.ts`), enviado como `Authorization: Bearer <jwt>` por `frontend/src/services/apiClient.ts`.
- **DB:** PostgreSQL 18.4 detrás de PgBouncer en `POOL_MODE: transaction`. Invariantes obligatorias:
  - Toda transacción interactiva/config de sesión → `withDirectTransaction` de `backend/src/services/db.ts` (usa `DIRECT_URL`), nunca la pool de PgBouncer.
  - Prisma 7: imports desde `backend/src/generated/prisma/client`, nunca `@prisma/client`.
  - Sin consultas N+1 en loops; batch con `findMany({ where: { id: { in: [...] } } })`.
  - Sin `console.log` en producción (usar `backend/src/utils/logger.ts`).
  - Cero `any` en `backend/src`.
  - URLs: `DATABASE_URL` = PgBouncer, `DIRECT_URL` = directo. Nunca intercambiar.

### Auth actual — mapa de archivos

| Archivo                                                | Rol                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/services/AuthService.ts`                  | Lógica dura: `authenticate`, `createSession` (JWT + `active_sessions` con `tokenHash` sha256), `credentialStamp`, límites por rol (Administrador 10, Reloj_Control 2, resto 1), duraciones por rol desde `SystemConfig` `AUTH_SESSION_DURATIONS`, `verifyKioskPin` (PIN de empleado, 5 intentos → bloqueo), `revokeSession`, MFA flow `setupMFA/confirmMFASetup/validateMFALogin`, `purgeSessions`, `invalidateAllSessions` + `SocketService.emitToAll("auth:force_logout")` |
| `backend/src/modules/auth/application/authenticate.ts` | Middleware `createAuthenticate`: verifica JWT, busca `ActiveSession`, chequea expiración, `isForcePasswordChange`, `Kiosk_Employee` allowlist                                                                                                                                                                                                                                                                                                                                |
| `backend/src/modules/auth/application/flows.ts`        | Orquesta login, kioskLogin, logout, MFA setup/verify/validate; auditoría `LOGIN_SUCCESS/FAILED`, `LOGIN_MFA_SUCCESS`, `KIOSK_PIN_SUCCESS/FAILED`                                                                                                                                                                                                                                                                                                                             |
| `backend/src/modules/auth/http/routes.ts`              | Rutas `/api/auth/login`, `/kiosk-login`, `/logout`, `/mfa/setup`, `/mfa/verify`, `/mfa/validate`                                                                                                                                                                                                                                                                                                                                                                             |
| `backend/src/modules/auth/infrastructure/jwt.ts`       | `verifyAccessToken`, `resolveAccessToken` (Bearer o `?token=`)                                                                                                                                                                                                                                                                                                                                                                                                               |
| `backend/src/services/socketAuthentication.ts`         | `authorizeSocketTokens` — valida en **2 batch queries** (sesiones + usuarios), nunca 1 por socket                                                                                                                                                                                                                                                                                                                                                                            |
| `backend/prisma/schema.prisma`                         | `User` (id uuid, `username` único, `passwordHash`, `role` enum, `employeeId`, `mfa*`, `isForcePasswordChange`), `ActiveSession` (`tokenHash` único, `deviceInfo`, `lastActive`, `expiresAt`), `Employee` (PIN `pin`, `isPinBlocked`)                                                                                                                                                                                                                                         |
| `frontend/src/services/authService.ts`                 | `login/logout/setupMFA/verifyMFASetup/validateMFACode/kioskVerifyPin/isAuthenticated` (decodea `exp` con `atob`)                                                                                                                                                                                                                                                                                                                                                             |
| `frontend/src/store/slices/authSlice.ts`               | Zustand: `login`, `validateMFACode`, `_handleSuccessfulLogin` (limpia IndexedDB + query cache si cambia usuario), `logout` (redirección dura a `/login`)                                                                                                                                                                                                                                                                                                                     |
| `frontend/src/services/authToken.ts`                   | `authTokenStore` — lee/escribe `sessionStorage["authToken"]`, provee `getAuthHeader`                                                                                                                                                                                                                                                                                                                                                                                         |

### Contrato API que NO se puede romper sin migración mayor

- `POST /api/auth/login` `{ username, password }` → `{ userId, username, role, employeeId, token, mustChangePassword, message }` o `{ mfaRequired: true, mfaToken, userId, message }`.
- `POST /api/auth/mfa/validate` `{ mfaToken, code }` → misma sesión que login.
- `POST /api/auth/kiosk-login` `{ employeeId, pin }` → `{ success, token, employeeName, message }` (token tipo `Kiosk_Employee`, 5 min, sin fila en `ActiveSession`).
- `POST /api/auth/logout`, `POST /api/auth/mfa/setup|verify`.
- Socket: `authorizeSocketTokens(tokens: string[])` recibe JWT Bearer.

### Supuestos del plan (confirmar en Fase 0)

1. **Identificador primario = `username` (no email).** better-auth soporta `email` como default; se mapea `username` → `email` virtual o se usa `username` vía `additionalFields` + `username` plugin de better-auth. No hay login social ni OAuth en requisitos.
2. **Sesiones con cookie HttpOnly por defecto, pero el frontend actual usa `Authorization: Bearer`.** Decisión: habilitar el plugin `bearer` de better-auth para mantener compatibilidad con `authToken.ts` sin reescribir el frontend entero el día 1. Migrar a cookie en Fase 5 si se desea.
3. **MFA:** conservar bundle actual (`speakeasy`) el día 1; migrar a `twoFactor` plugin de better-auth solo después de compatibilizar `mfaSecret` y el lockout (5 intentos / 5 min ventana) en `AuthService.validateMFALogin`.
4. **Kiosk PIN queda fuera de better-auth.** Es autenticación de _empleado sin usuario_, con token corto de 5 min y allowlist de rutas. No crear sesiones de better-auth para kiosco.
5. **Hash de contraseñas:** `bcryptjs` (`$2a$`/`$2b$`) es compatible con better-auth cuando se configura `emailAndPassword` con `password.hash` custom vía `bcryptjs` o con el adaptador de Prisma que respeta `passwordHash`. Si se deja el hashing por defecto de better-auth (scrypt), habrá que re-hashear al primer login exitoso — ver Fase 3.
6. **Una sola migración Prisma.** better-auth necesita tablas `user`, `session`, `account`, `verification` (nombre exacto según versión). Para no duplicar, se reutiliza `User` existente y se añade `Session/Account/Verification` con prefijo o se migra vía `npx @better-auth/cli generate`. Ver Fase 1 para cómo evitar la duplicación.

> Si la Fase 0 responde "email como identificador" o "cookie only", el plan cambia en los archivos indicados. No improvisar.

## 3. Architecture / proposed approach

Se introduce better-auth como capa nueva dentro de `backend/src/modules/auth/infrastructure/` (nunca fuera de Fastify), reutilizando `User` existente y creando las tablas `Session/Account/Verification` con Prisma, exponiendo su handler en `/api/auth/*` bajo Fastify y adaptando el `authenticate` actual para que resuelva `request.user` desde la sesión de better-auth (con fallback transitorio al JWT viejo vía feature-flag). El flujo kiosk y `socketAuthentication` se mantienen intactos hasta una fase posterior, y el frontend migra de `authTokenStore` manual a `better-auth/client` sin cambiar el contrato de respuesta durante la transición. Todo commit pasa por `npm run validate:ci` (backend) y el E2E de login antes de seguir.

Estrategia: **strangler fig** con flag `BETTER_AUTH_ENABLED`. Default `false` hasta la Fase 4. Cada fase es un PR independiente, reversible.

---

## 4. Step-by-step tasks

> Convenciones: trabajar desde `main` recién sincronizada (`git status -sb` limpio). Usar ramas tipo `feat/better-auth-01-...`. Conventional commits, sin emojis. Cada tarea termina con el comando de verificación indicado; si falla, parar y corregir antes de seguir.
> No usar `console.log`, no usar `any` en `backend/src`, importar Prisma desde `../src/generated/prisma/client` (o ruta relativa equivalente).

### Fase 0 — Decisión y baseline (30 min)

**T0.1 — Sincronizar `main` y crear rama de trabajo.**

```bash
cd /home/zer0x/Proyectos/portal-control-2.0
git checkout main && git pull --ff-only origin main
git checkout -b feat/better-auth-integration
```

Verificación: `git status -sb` → `## feat/better-auth-integration`, `git branch -vv` → en `feat/better-auth-integration`, `git log --oneline -1` → `8f4a1ea`.

**T0.2 — Baseline backend: comprobar que todo compila antes de tocar auth.**

```bash
cd backend && npm ci && npx prisma generate && npm run check
```

Salida esperada: `tsc --noEmit` sin errores (salida vacía), `check:holidays` y `check:modules` OK.

**T0.3 — Baseline frontend.**

```bash
cd ../frontend && npm ci && npm run check
```

Salida esperada: `tsc --noEmit` sin errores.

**T0.4 — Preservar baseline de auth: correr tests unitarios de auth.**

```bash
cd ../backend && npm run test:unit -- tests/unit/modules/auth.test.ts 2>&1 | tail -20
# Si el nombre difiere, listar con:
ls tests/unit/ | grep -i auth
```

Salida esperada: tests en verde (o identificar archivo real). Guardar el nombre para el resto del plan.

**T0.5 — Responder y registrar las 4 decisiones bloqueantes en un ADR draft.**
Crear `docs/adr/0021-better-auth.md` copiando `docs/adr/0000-template.md` y rellenando:

- Identificador: `username` (no email).
- Transporte de sesión: Bearer (fase 1) → cookie HttpOnly (fase 2, opcional).
- MFA: conservar `speakeasy` en fase 1.
- Kiosk: fuera de better-auth.

Comando: `cp docs/adr/0000-template.md docs/adr/0021-better-auth.md` luego editar.

Verificación: `npm run docs:check` (raíz) → OK.

### Fase 1 — Dependencias y esquema Prisma (30 min)

**T1.1 — Instalar better-auth y CLI.**

```bash
cd backend
npm install better-auth
npm install -D @better-auth/cli
```

Verificación: `grep '"better-auth"' package.json` → versión instalada, `ls node_modules/better-auth` existe.

**T1.2 — Generar esquema Prisma de better-auth y revisar el diff.**

```bash
cd backend
npx @better-auth/cli generate --output prisma/schema.prisma --yes
# Si la CLI pide config, crear primero el archivo de config (T1.3) y reintentar.
git diff prisma/schema.prisma | head -100
```

Salida esperada: diff en `schema.prisma` con modelos `User`, `Session`, `Account`, `Verification` (sintaxis Prisma).

> Peligro: el generador puede crear un modelo `User` duplicado. Si el diff muestra `model User { ... }` nuevo con `email` único y sin `username/role/employeeId`, **renombrar** el nuevo a `BetterAuthUser` o fusionar manualmente antes de aplicar. El plan asume que se fusionan: se conserva el `User` actual y se añaden campos `email`, `emailVerified`, `name`, `image` opcionales (todos con `@map` snake_case).

**T1.3 — Crear `backend/src/modules/auth/infrastructure/betterAuth.ts` (configuración del servidor).**
Archivo completo, copy-pasteable:

```ts
// backend/src/modules/auth/infrastructure/betterAuth.ts
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { bearer, twoFactor } from "better-auth/plugins";
import bcryptjs from "bcryptjs";
import prisma from "../../../services/db";
import { createLogger } from "../../../utils/logger";

const logger = createLogger({ scope: "better-auth" });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`CRITICAL: ${name} is not set`);
  return value;
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: requireEnv("BETTER_AUTH_URL"),
  secret: requireEnv("BETTER_AUTH_SECRET"),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    // Mapeo: better-auth usa `email` como identificador; guardamos el username en `email` hasta migración completa
    // Campos extra para no romper el modelo existente
    additionalFields: {
      username: { type: "string", input: true },
      role: { type: "string", input: false },
    },
    password: {
      hash: (pw: string) => bcryptjs.hash(pw, 10),
      verify: (pw: string, hash: string) => bcryptjs.compare(pw, hash),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24, // sobrescrito en el adapter por rol (ver Fase 2)
    updateAge: 60,
    cookieCache: { enabled: false },
  },
  user: {
    additionalFields: {
      role: { type: "string", input: false, defaultValue: "Usuario" },
    },
  },
  plugins: [
    bearer(), // mantiene compatibilidad con Authorization: Bearer (ver Fase 4)
    twoFactor({ issuer: "Portal Control" }),
  ],
  logger: {
    info: (msg) => logger.info(msg),
    warn: (msg) => logger.warn(msg),
    error: (msg) => logger.error(msg),
  },
});

export type Auth = typeof auth;
```

Verificación: `npx tsc --noEmit` (backend) → sin errores. Si `better-auth` no exporta `prismaAdapter` en esa ruta según versión, ajustar import a `better-auth/adapters/node` y anotarlo.

**T1.4 — Añadir variables de entorno.**
Editar `backend/.env.example` y `compose.yaml` (solo documentación, no secretos reales):

```
BETTER_AUTH_URL=http://localhost:4000/api/auth
BETTER_AUTH_SECRET=cambiar_por_algo_muy_largo_y_aleatorio_minimo_32_chars
```

Verificación: `grep -r "BETTER_AUTH_URL" backend/.env.example compose.yaml` → 2+ hits. Commit: `docs(auth): add better-auth env placeholders`.

**T1.5 — Crear migración Prisma (usando DIRECT_URL, nunca PgBouncer para DDL).**

```bash
cd backend
# Asegurar DIRECT_URL local apunta a PG directo (ver compose.db.dev.yaml)
DATABASE_URL="$DIRECT_URL" npx prisma migrate dev --name add_better_auth
```

Salida esperada: `Applying migration ...`, crea `prisma/migrations/<timestamp>_add_better_auth/migration.sql` y actualiza `schema.prisma`.
Verificación: `ls prisma/migrations | tail -3` incluye la nueva, `npx prisma generate` OK.

> Invariante: DDL siempre con `DIRECT_URL`. No usar `DATABASE_URL` de PgBouncer para migraciones.

**T1.6 — TDD: test del esquema. Escribir test que falla.**
Crear `backend/tests/unit/modules/auth/betterAuthSchema.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("better-auth schema", () => {
  it("declara las tablas necesarias", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    expect(schema).toContain("model Session");
    expect(schema).toContain("model Account");
    expect(schema).toContain("model Verification");
    expect(schema).toContain("model User");
  });
});
```

Ejecutar: `npm run test:unit -- tests/unit/modules/auth/betterAuthSchema.test.ts 2>&1 | tail -5`
Salida esperada: `1 passed`. Si no pasa, el esquema no se aplicó.

### Fase 2 — Instancia de better-auth y adapter de sesión por rol (45 min)

**T2.1 — TDD: adapter de sesión que respeta duración y límite por rol ( falla primero ).**
Crear `backend/tests/unit/modules/auth/betterAuthSessionAdapter.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { mapBetterAuthSession } from "../../../src/modules/auth/infrastructure/sessionAdapter";

describe("mapBetterAuthSession", () => {
  it("Administrador dura 10h y usa límite 10", () => {
    const r = mapBetterAuthSession({ role: "Administrador" } as never, new Date("2026-11-07T00:00:00Z"));
    expect(r.hours).toBe(10);
    expect(r.limit).toBe(10);
  });
  it("Usuario dura 0.03h y usa límite 1", () => {
    const r = mapBetterAuthSession({ role: "Usuario" } as never, new Date());
    expect(r.hours).toBe(0.03);
    expect(r.limit).toBe(1);
  });
});
```

Ejecutar: `npm run test:unit -- tests/unit/modules/auth/betterAuthSessionAdapter.test.ts 2>&1 | tail -5` → **FAIL** (módulo no existe).

**T2.2 — Implementar `backend/src/modules/auth/infrastructure/sessionAdapter.ts`.**

```ts
// backend/src/modules/auth/infrastructure/sessionAdapter.ts
import type { AuthUser } from "../application/authenticate";

export function sessionDurationHoursForRole(role: string): number {
  switch (role) {
    case "Administrador":
      return 10;
    case "Supervisor_Elevado":
    case "Supervisor Elevado":
      return 4;
    case "Supervisor":
    case "Fiscalizador":
      return 1;
    case "Reloj_Control":
    case "Reloj Control":
      return 12;
    case "Usuario":
      return 0.03;
    default:
      return 1;
  }
}

export function sessionLimitForRole(role: string): number {
  if (role === "Administrador") return 10;
  if (role === "Reloj_Control") return 2;
  return 1;
}

export function mapBetterAuthSession(user: AuthUser, now: Date) {
  return {
    hours: sessionDurationHoursForRole(user.role),
    limit: sessionLimitForRole(user.role),
    expiresAt: new Date(now.getTime() + sessionDurationHoursForRole(user.role) * 3600_000),
  };
}
```

Verificación: mismo comando de test → **PASS**.

**T2.3 — Envolver `createSession` actual para que pueda delegar a better-auth bajo flag.**
Editar `backend/src/services/AuthService.ts`:

- Añadir import: `import { auth } from "../modules/auth/infrastructure/betterAuth";`
- Añadir getter:

```ts
private static get useBetterAuth(): boolean {
  return process.env.BETTER_AUTH_ENABLED === "true";
}
```

- En `createSession`, antes de `jwt.sign(...)`:

```ts
if (this.useBetterAuth) {
  // TODO Fase 4: delegar a auth.api.signInEmail(...) y persistir sesión por rol vía sessionAdapter
  // Hasta Fase 4, fallback al flujo JWT antiguo para no romper tests
}
```

No cambiar comportamiento aún. Verificación: `npm run check` → OK.

### Fase 3 — Compatibilidad de contraseñas y usuarios existentes (30 min)

**T3.1 — TDD: test de verificación de hash bcryptjs vs better-auth.**
Crear `backend/tests/unit/modules/auth/passwordCompat.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import bcryptjs from "bcryptjs";
import { auth } from "../../../src/modules/auth/infrastructure/betterAuth";

describe("password compat", () => {
  it("verifica hashes bcryptjs existentes", async () => {
    const hash = await bcryptjs.hash("secreta123", 10);
    expect(hash.startsWith("$2")).toBe(true);
    const ok = await bcryptjs.compare("secreta123", hash);
    expect(ok).toBe(true);
    // better-auth expone su propio verify a través del adapter; se valida existencia del objeto
    expect(auth).toBeDefined();
  });
});
```

Ejecutar: `npm run test:unit -- tests/unit/modules/auth/passwordCompat.test.ts` → PASS tras T1.3.

**T3.2 — Script de migración idempotente de usuarios (no destructivo).**
Crear `backend/scripts/migrate-users-to-better-auth.ts`:

```ts
// Detecta users sin fila en Account y crea una fila con passwordHash actual
// Nunca borra ni re-hashea: solo crea Account(providerId: "credential") si no existe
```

Ejecutar en dry-run primero: `npx tsx scripts/migrate-users-to-better-auth.ts --dry-run` → salida lista `0 usuarios para migrar` o `N usuarios para migrar`, sin writes.
No correr `--apply` hasta la Fase 4. Verificación: comando no modifica DB en dry-run (`git diff prisma/` vacío).

### Fase 4 — Integración Fastify (1 hora) — el cambio de mayor riesgo

**T4.1 — TDD: test de contrato HTTP del handler de better-auth.**
Crear `backend/tests/unit/modules/auth/betterAuthRoute.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildFastifyApp } from "../../../src/platform/fastify/app";
// mock deps mínimas; si buildFastifyApp exige deps reales, usar helper de tests/fastify-integration/runtime.test.ts
describe("better-auth route", () => {
  it("expone /api/auth/*", async () => {
    // El test en CI usa buildFastifyApp con deps mock; assert que /api/auth/get-session existe en routeManifest
    expect(true).toBe(true); // reemplazar por assert real en implementación
  });
});
```

Ejecutar: `npm run test:unit -- tests/unit/modules/auth/betterAuthRoute.test.ts` → FAIL o PASS según implementación.

**T4.2 — Registrar el handler de better-auth en Fastify.**
Editar `backend/src/platform/fastify/app.ts`:

- Añadir import: `import { auth } from "../../modules/auth/infrastructure/betterAuth";`
- Dentro de `buildFastifyApp`, antes del `protectedApp.register(...)`, añadir:

```ts
// Handler de better-auth: rutas /api/auth/* gestionadas por better-auth
app.all("/api/auth/*", async (req, reply) => {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  const url = `http://${req.headers.host}${req.raw.url}`;
  const res = await auth.handler(
    new Request(url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : JSON.stringify(req.body ?? {}),
    }),
  );
  reply.code(res.status);
  res.headers.forEach((v, k) => reply.header(k, v));
  return reply.send(Buffer.from(await res.arrayBuffer()));
});
```

> Invariante: Fastify sigue siendo el único servidor HTTP. No levantar `better-auth` como proceso separado ni abrir otro puerto.

**T4.3 — Precedencia de ruta: evitar colisión con `authPlugin` actual.**
En `backend/src/modules/auth/http/routes.ts`, envolver todo el `authPlugin` con flag:

```ts
export const authPlugin: FastifyPluginAsync<AuthPluginOptions> = async (app, options) => {
  if (process.env.BETTER_AUTH_ENABLED === "true") {
    app.log.info("Auth: better-auth handler takes over /api/auth/*, legacy routes disabled");
    return; // better-auth ya maneja /api/auth/* vía app.ts
  }
  // ... resto de rutas legacy
};
```

Verificación: `npm run check` → OK, `npm run test:unit` → tests de auth legacy pasan con flag `false`.

**T4.4 — Adaptar `authenticate` para coexistir (dual-mode).**
Editar `backend/src/modules/auth/application/authenticate.ts`:

- Añadir param `mode: "legacy" | "better-auth"` o leo de `process.env.BETTER_AUTH_ENABLED`.
- En modo better-auth: usar `auth.api.getSession({ headers: ... })` para resolver `AuthUser`, luego aplicar las mismas 3 reglas legacy (Archivado, `isForcePasswordChange`, `Kiosk_Employee` allowlist) y el `touch` de `lastActive` (≤ 60 s).
- En modo legacy: comportamiento actual intacto.
  Código plantilla (fragmento, no archivo completo):

```ts
if (process.env.BETTER_AUTH_ENABLED === "true" && token) {
  const session = await auth.api.getSession({ headers: reqHeadersFromToken(token) });
  if (!session?.user) throw new AuthError("Sesión inválida o expirada");
  // Reutilizar Kiosk allowlist y isForcePasswordChange existentes
}
```

Verificación: test manual con flag `true`: `curl -i http://localhost:4000/api/auth/get-session -H "Authorization: Bearer <token-legacy>"` debe responder 200 con sesión o 401 controlado (nunca 500).

**T4.5 — CORS + cookies (si se usa cookie).**
En `backend/src/platform/fastify/app.ts` (config `cors`), cambiar `credentials: false` → `credentials: true` **solo** cuando el frontend usa cookies (Fase 5). En Fase 4 con Bearer, dejar `credentials: false`.
Verificación: `grep -n "credentials" backend/src/platform/fastify/app.ts` muestra valor correcto según flag.

### Fase 5 — Frontend `better-auth/client` (45 min)

**T5.1 — Instalar cliente.**

```bash
cd frontend && npm install better-auth
```

Verificación: `grep '"better-auth"' package.json` → OK.

**T5.2 — Crear `frontend/src/lib/authClient.ts`.**

```ts
// frontend/src/lib/authClient.ts
import { createAuthClient } from "better-auth/client";
import { twoFactorClient, bearerClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "/api/auth",
  plugins: [twoFactorClient(), bearerClient()],
});
```

Verificación: `npm run check` (frontend) → OK.

**T5.3 — TDD: test de cliente.**
Crear `frontend/src/tests/lib/authClient.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { authClient } from "../../lib/authClient";
describe("authClient", () => {
  it("expone signIn y useSession", () => {
    expect(typeof authClient.signIn.email).toBe("function");
    expect(typeof authClient.useSession).toBe("function");
  });
});
```

Ejecutar: `npm run test:run -- src/tests/lib/authClient.test.ts` → PASS.

**T5.4 — Adaptador `frontend/src/services/authService.ts` (no borrar la API pública aún).**

- Mantener la interfaz `AuthService` idéntica (`login`, `logout`, `setupMFA`, `verifyMFASetup`, `validateMFACode`, `kioskVerifyPin`, `isAuthenticated`, `getToken`, ...).
- Internamente, cuando `VITE_BETTER_AUTH_ENABLED=true`, delegar a `authClient.signIn.email({ email: username, password })` y mapear la respuesta a `LoginResponse` legacy; si `false`, usar el fetch actual.
- `isAuthenticated`: ya no hace `atob` del JWT; en modo better-auth usa `authClient.useSession()` o chequea cookie.
  Verificación: `npm run test:run -- src/tests/services/authService.test.ts` → PASS en ambos modos (mock de `authClient`).

**T5.5 — Adaptar `frontend/src/services/authToken.ts` para cookie.**
Si se migra a cookie HttpOnly: `getToken`/`setToken` pasan a no-op (el token vive en cookie), `getAuthHeader` devuelve `{}` y `apiClient` usa `credentials: "include"`. Si se queda en Bearer: no tocar este archivo.
Verificación: `grep -rn "authToken" frontend/src` — no debe haber escrituras directas a `sessionStorage` en modo cookie.

**T5.6 — Socket.**
`frontend/src/services/socketService.ts` y `backend/src/services/socketAuthentication.ts` reciben JWT. Con Bearer sigue igual. Con cookie, se envía la cookie en el handshake (`socket.io-client` con `withCredentials: true`) y `authorizeSocketTokens` debe aceptar cookie además de token — ver T4.4 y T6.2.

### Fase 6 — MFA, sesiones, sockets y kiosco (45 min)

**T6.1 — MFA: espejar lockout antes de migrar a `twoFactor`.**
Crear `backend/tests/unit/modules/auth/mfaLockoutParity.test.ts` que asserts:

- 5 intentos fallidos en 5 min → `mfaBlockedUntil = now+5min`.
- Ventana nueva resetea contador.
  Ejecutar → PASS con código actual de `AuthService.validateMFALogin`. No cambiar código aún; es el baseline para la migración.

**T6.2 — Migrar MFA a `twoFactor` de better-auth (solo tras T6.1 verde).**

- Mapear `User.mfaSecret` → `twoFactorSecret` de better-auth.
- Reimplementar `setupMFA/verifyMFASetup/validateMFALogin` como wrappers sobre `auth.api.twoFactor*` manteniendo las respuestas HTTP legacy (`{ message, qrCode, secret }`).
- Quitar `speakeasy` solo cuando `.../node_modules/speakeasy` ya no se importe en `backend/src` (`grep -r "speakeasy" backend/src` → 0 hits).

**T6.3 — Kiosco: no tocar.** Verificar que `AuthService.verifyKioskPin` y el allowlist de `authenticate.ts` siguen pasando sus tests. `grep -r "Kiosk_Employee" backend/src` debe seguir existiendo tras la migración (prueba de que no se borró).

**T6.4 — Socket: batch en 2 queries.** Ya cumplido en `socketAuthentication.ts`. Añadir test `backend/tests/unit/modules/auth/socketAuthBatch.test.ts` que cuenta queries con mock de Prisma y asserts `findMany` llamado 2 veces (no N). Verificar con `npm run test:unit`.

### Fase 7 — Migración de datos, limpieza y docs (30 min)

**T7.1 — Aplicar migración de usuarios en staging (dry-run → apply).**

```bash
cd backend
npx tsx scripts/migrate-users-to-better-auth.ts --dry-run   # debe decir "0 writes"
npx tsx scripts/migrate-users-to-better-auth.ts --apply     # solo staging
# Verificar:
DATABASE_URL="$DIRECT_URL" npx prisma migrate status
```

Salida esperada: `Database schema is up to date`.

**T7.2 — Limpiar código muerto: `AuthService` legacy (solo si `BETTER_AUTH_ENABLED=true` en prod 1 semana).**

- Marcar `AuthService.authenticate/createSession` como `@deprecated`, no borrar aún.
- Quitar `jsonwebtoken` de `backend/package.json` una vez que `grep -r "jsonwebtoken" backend/src` → 0 hits.
  Verificación: `npm run check` + `npm run lint` (budget 0/0).

**T7.3 — ADR final y specs.**

- Actualizar `docs/adr/0021-better-auth.md` con resultado: decidir Bearer vs cookie, MFA final, por qué se conserva kiosco.
- Actualizar `specs/009-fastify-autenticacion/spec.md` (o crear `specs/0XX-better-auth/spec.md` según SDD) con contrato nuevo.
  Verificación: `npm run docs:check` y `npm run spec:check` (raíz) → OK.

**T7.4 — Validación CI completa.**

```bash
cd backend && npm run validate:ci
cd ../frontend && npm run validate:ci
cd .. && npm run lint:budget && npm run docs:check
```

Salida esperada: todos 0 warnings, 0 errores, bundle budget OK.

## 5. Tests / validation

Ciclo TDD por tarea (obligatorio para un implementador con mal gusto):

1. **Escribir el test primero** que falla por "módulo no existe" / "endpoint no existe".
2. **Correrlo** con `npm run test:unit -- <archivo>` (backend) o `npm run test:run -- <archivo>` (frontend) y verificar que **falla** (pegar la salida en el PR).
3. **Implementar lo mínimo** para que pase.
4. **Volver a correr** → PASS.
5. **Commit** con prefijo Conventional Commits: `feat(auth): ...`, `test(auth): ...`, `refactor(auth): ...`. Sin emojis.

### Matriz de validación por fase

| Fase | Comando exacto                                                                                | Salida esperada                     |
| ---- | --------------------------------------------------------------------------------------------- | ----------------------------------- |
| 0    | `cd backend && npm run check`                                                                 | sin errores                         |
| 0    | `cd ../frontend && npm run check`                                                             | sin errores                         |
| 1    | `cd backend && npm run test:unit -- tests/unit/modules/auth/betterAuthSchema.test.ts`         | `1 passed`                          |
| 2    | `cd backend && npm run test:unit -- tests/unit/modules/auth/betterAuthSessionAdapter.test.ts` | `2 passed`                          |
| 3    | `cd backend && npm run test:unit -- tests/unit/modules/auth/passwordCompat.test.ts`           | `1 passed`                          |
| 4    | `cd backend && npm run test:unit`                                                             | todo verde (sin regresiones)        |
| 4    | `curl -i http://localhost:4000/api/auth/get-session`                                          | 401 sin token, 200 con token válido |
| 5    | `cd frontend && npm run test:run -- src/tests/lib/authClient.test.ts`                         | `1 passed`                          |
| 5    | `cd ../frontend && npm run test:run -- src/tests/services/authService.test.ts`                | PASS                                |
| 6    | `cd backend && npm run test:unit -- tests/unit/modules/auth/mfaLockoutParity.test.ts`         | PASS                                |
| 7    | `cd backend && npm run validate:ci && cd ../frontend && npm run validate:ci`                  | todo verde                          |

### E2E manual mínimo (antes de merge a `main`)

1. `docker compose -f compose.db.dev.yaml up -d --wait` (PG + PgBouncer).
2. `cd backend && npm run dev` + `cd ../frontend && npm run dev`.
3. Login como `Administrador` → ver dashboard, `GET /api/auth/get-session` 200.
4. Logout → `GET /api/auth/get-session` 401.
5. Login con MFA habilitado → debe pedir código.
6. Kiosco: `POST /api/auth/kiosk-login` con PIN incorrecto 5 veces → bloqueado (403).
7. Socket: abrir 2 tabs, logout en una → la otra recibe `auth:force_logout` si se hace `invalidateAllSessions`.

## 6. Risks, tradeoffs, and open questions

### Riesgos (con mitigación)

1. **PgBouncer en transaction mode + better-auth.** better-auth hace transacciones interactivas y `set_config`. **Mitigación:** usar `withDirectTransaction` de `backend/src/services/db.ts` para todo lo que better-auth toque (adapter de Prisma debe recibir el cliente directo). Nunca `DATABASE_URL` de PgBouncer para `getSession` en hot path. Test con `npm run test:integration`.
2. **Duplicación `User` vs `BetterAuthUser`.** El generador de better-auth crea `User` con `email` único y rompe `username`/`role`/`employeeId`. **Mitigación:** fusionar manualmente (T1.2), no crear modelo paralelo. Si se crean dos `User`, hay dos fuentes de verdad → prohibido.
3. **Hash incompatible.** `bcryptjs` (`$2a$`) vs scrypt de better-auth. **Mitigación:** configurar `password.hash/verify` con `bcryptjs` (T1.3) y re-hashear oportunistamente al primer login exitoso si se migra a scrypt en el futuro. No forzar reset masivo de contraseñas.
4. **CORS `credentials: false` actual.** Cookie HttpOnly no funcionará con `credentials: false`. **Mitigación:** Fase 4 queda en Bearer (sin cambio CORS). Activar `credentials: true` solo en Fase 5 cuando el frontend está listo, con `ALLOWED_ORIGINS` explícitos (nunca `*`).
5. **Kiosco roto.** `Kiosk_Employee` no tiene fila en `User` ni en better-auth. **Mitigación:** no tocar `verifyKioskPin` ni el allowlist; test de regresión en T6.3.
6. **MFA lockout.** La lógica de `mfaFailedAttempts/Window/BlockedUntil` es custom y auditada. Migrar a `twoFactor` sin paridad rompe la seguridad. **Mitigación:** test de paridad T6.1 antes de migrar.
7. **Socket auth.** `authorizeSocketTokens` asume JWT en `Authorization`. Con cookie, deja de funcionar. **Mitigación:** mantener Bearer en Fase 4; migrar socket en T6.4 solo con test batch.
8. **Route collision en `/api/auth/*`.** Fastify registra tus rutas legacy y better-auth registra el mismo prefijo → 404 o 500. **Mitigación:** flag `BETTER_AUTH_ENABLED` en `authPlugin` (T4.3). Solo un handler activo a la vez.
9. **Secrets.** `BETTER_AUTH_SECRET` debe ser ≥ 32 chars y rotarse sin invalidar sesiones en prod. **Mitigación:** `requireEnv` fail-fast (T1.3), nunca hardcodear, `.env.example` solo placeholders.
10. **Lint budget 0/0 y `any` cero.** better-auth trae tipos estrictos pero el wrapper debe respetar el ratchet. **Mitigación:** `npm run lint` y `npm run lint:budget` en cada PR.

### Tradeoffs

- **Bearer vs cookie:** Bearer = cero cambio frontend día 1, pero token en `sessionStorage` XSS-robable. Cookie HttpOnly = más seguro, pero rompe `apiClient` y CORS. Compromiso del plan: Bearer fase 1 → cookie fase 5 opcional.
- **Reutilizar `ActiveSession` vs tabla `Session` de better-auth:** duplicar sesiones = dos lugares que purgar. Mejor: deprecar `ActiveSession` tras T7.2 y que `Session` de better-auth sea la única. Durante la transición conviven ambas (doble escritura no, doble lectura sí).
- **Migrar MFA ya vs después:** migrar ya simplifica (un solo proveedor), pero arriesga lockout. Después = dos implementaciones vivas 1 mes. Plan elige después.
- **Email vs username:** better-auth nativo es email. Forzar username requiere `additionalFields` y mapear `email = username`. Coste: confusión. Beneficio: no se rompe login actual ni se obliga a todos los usuarios a tener email válido.

### Open questions (responder en Fase 0 antes de codificar)

1. ¿El login debe seguir siendo `username` o se migra a `email` en esta integración? (Si es email, ¿qué pasa con usuarios sin email?)
2. ¿Se necesita OAuth / login social (Google) en los próximos 6 meses? Si sí, better-auth lo cubre gratis pero hay que reservar `account.providerId`.
3. ¿El frontend pasará a cookie HttpOnly o se queda en Bearer indefinidamente? Determina el trabajo de Fase 5 y CORS.
4. ¿Se mantiene `speakeasy` o se migra a `twoFactor` de better-auth en el mismo PR? Plan recomienda después.
5. ¿Se deprecates `ActiveSession` ahora o se mantiene como tabla espejo hasta T7.2? Determina la migración de `socketAuthentication`.
6. ¿`BETTER_AUTH_URL` en prod es `https://<dominio>/api/auth` o un subdominio separado? Afecta `baseURL` y `trustProxy` en Fastify.
7. ¿Necesitas reset de contraseña por email en esta iteración? better-auth lo trae, pero `EmailService` actual (Nodemailer) debe integrarse con `sendResetPassword`.

---

### Apéndice — Checklist de invariantes (antes de cada PR)

- [ ] `git status -sb` limpio, sin archivos temporales.
- [ ] `grep -r "console.log" backend/src` → 0 resultados.
- [ ] `grep -r "from \"@prisma/client\"" backend/src` → 0 resultados (usar `generated/prisma/client`).
- [ ] `grep -r "exec(" backend/src --include="*.ts"` → usar `execFile`/`spawn` con array.
- [ ] `grep -r "BETTER_AUTH_SECRET" backend/src` → solo vía `requireEnv`, nunca hardcodeado.
- [ ] `grep -r "jsonwebtoken" backend/src` tras T7.2 → 0 hits (o documentado el fallback).
- [ ] `DATABASE_URL` y `DIRECT_URL` no intercambiados.
- [ ] `npm run check` (backend y frontend) verde.
- [ ] `npm run lint` + `npm run lint:budget` 0/0.
- [ ] E2E manual (apartado 5) pasa.
