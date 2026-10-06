# Spec 007: Node 26, mantenimiento y piloto Fastify

- Estado: Implementado — piloto y mantenimiento local
- Fecha: 2026-10-06
- Autor: Codex
- Autorización: el equipo pidió corregir snapshot, actualizar compatibles,
  extraer feriados con tipos estrictos y comparar Fastify; eligió Node 26.
- Arquitectura previa: [spec 006](../006-arquitectura-mantenible/spec.md)

## Problema

La cobertura global falla por un snapshot de correo obsoleto. Existen parches
y menores compatibles pendientes. El equipo necesita evaluar Fastify sobre un
caso de uso extraído sin mezclar esa evaluación con una reescritura del backend.

## Alcance

Dentro: snapshot, actualizaciones compatibles por paquete, Node 26 en local/CI/
Docker, tipos estrictos del módulo de feriados, comparación GET Express/Fastify.

Fuera: Prisma 8, TypeScript 7, Babel 8, PWA 2, cambios en PostgreSQL o React,
despliegue, sustitución completa de Express y cambios funcionales de feriados.

## Criterios de aceptación

- [x] AC1: snapshot refleja únicamente el contrato actual de `SendTestEmail` y la suite global pasa.
- [x] AC2: lockfiles contienen actualizaciones compatibles explícitas; majors bloqueados permanecen.
- [x] AC3: Node 26 configura paquetes, `.nvmrc`, CI e imágenes; comprobaciones locales usan Node 26.
- [x] AC4: consulta extraída con dependencias explícitas, gate estricto y guardas anti-vacuidad; B1–B6 siguen pasando.
- [x] AC5: piloto Fastify compara status, JSON y opciones con router Express real en cuatro consultas, un rechazo de auth y un error.
- [x] AC6: se documentan archivos necesarios, facilidad de pruebas, complejidad y limitaciones del piloto.

## Restricciones y trazabilidad

Aplican [constitución](../constitution.md) y `AGENTS.md`, salvo Node 24,
que el usuario sustituyó explícitamente por Node 26. Mantener React + Vite,
PostgreSQL, Prisma 7 y tiempo de negocio chileno.

El piloto no se monta en `ROUTE_MOUNTS`: Express sigue siendo el servidor
productivo y el contrato público conserva sus rutas. El plugin experimental
exige autenticación y mapeo de errores inyectados, sin defaults permisivos.

Tests: `backend/tests/api-contract.test.ts`, `backend/tests/holidays-architecture.test.ts`
y `backend/tests/unit/holidays/`. Evidencia en
[resultado de 006](../006-arquitectura-mantenible/result.md).
