# ADR-0034: Renamespace de roles

- Estado: Aceptado
- Fecha: 2026-11-27
- Autores: zer0x

## Contexto

El enum `UserRole` (`backend/prisma/schema.prisma`) define 7 valores:
`Administrador`, `Supervisor_Elevado`, `Supervisor`, `Reloj_Control`,
`Fiscalizador`, `Usuario`, `Archivado`. El cliente final identifica
"administrador" con el rol que hoy se llama `Supervisor_Elevado`, mientras
que `Administrador` está reservado a desarrollo/operación interna. La
fricción aparece en onboarding y soporte: dos vocabularios para la misma
idea de "admin".

## Decisión

Renombrar dos valores del enum, sin cambiar permisos:

- `Administrador` pasa a `Super_Administrador` (reservado a desarrollador).
- `Supervisor_Elevado` pasa a `Administrador` (cliente final).

El resto de la taxonomía se mantiene. `Archivado` sigue siendo el estado
terminal de cuenta pese a vivir en el enum. La migración usa
`ALTER TYPE "UserRole" RENAME VALUE`, que en PostgreSQL solo toca el
catálogo y no reescribe filas; el orden (primero `Administrador →
Super_Administrador`, luego `Supervisor_Elevado → Administrador`) evita
colisiones.

## Alternativas consideradas

1. Separar `Archivado` del enum y añadir `is_active` — descartada:
   fuera de alcance; el guard existente ya trata `Archivado`
   consistentemente en todos los flujos.
2. Mantener nombres actuales y documentar el mapeo — descartada: la
   fricción es del cliente final, no de la documentación.
3. Renombrar solo en UI con capa de traducción — descartada: duplica el
   vocabulario y complica auditoría/guards; el costo del renombre
   mecánico es acotado y único.

## Consecuencias

Positivas:

- El vocabulario del producto coincide con el del cliente final.
- `Super_Administrador` deja explícito que es un rol técnico reservado.

Negativas / costos aceptados:

- Cambio disrupcion de enum: sesiones/token emitidos con el valor antiguo
  quedan inválidos tras deploy (re-login requerido).
- Toque masivo pero mecánico de código y pruebas.

## Referencias

- `backend/prisma/schema.prisma` — enum `UserRole`.
- `specs/123-renamespace-roles/` — spec, plan y tasks.
