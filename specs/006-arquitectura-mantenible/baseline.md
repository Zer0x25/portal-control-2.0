# Baseline 006: Consulta de feriados, T1

Fecha: 2026-10-06. Alcance: caracterización previa a extracción; sin cambios
en servicios, controllers, rutas, esquema o contratos públicos.

## Ejecución

Dentro de `backend/`:

```bash
# Antes de añadir pruebas o mover archivos: 18/18, dos archivos.
npx vitest run tests/services/HolidayService.test.ts tests/unit/holidayController.test.ts

# Con B1–B6, antes de mover el test existente: 25/25, tres archivos.
npx vitest run tests/unit/holidays/getHolidays.test.ts tests/services/HolidayService.test.ts tests/unit/holidayController.test.ts

# Comando vigente tras el traslado.
npx vitest run tests/unit/holidays/getHolidays.test.ts tests/unit/holidayService.sync.test.ts tests/unit/holidayController.test.ts
```

La nueva suite contiene siete tests: B1–B4, dos variantes de B5 y B6.
La suite existente conserva seis tests de sincronización y doce de controller.

No se registra un ciclo rojo/verde artificial: son pruebas de caracterización
que pasan sobre el código existente. La fase TDD del caso de uso corresponde a T2.

## Hallazgos y decisiones para la extracción

1. **Descubrimiento de tests:** seis pruebas de sincronización quedaban fuera
   de `test:unit`, `test:unit:ci` y `test:coverage`. Se trasladó el archivo sin
   modificar su contenido a `tests/unit/holidayService.sync.test.ts`; los
   selectores existentes incluyen tanto ese archivo como los nuevos tests.
2. **Lectura con efectos:** B4 ejecuta el autosync real del servicio con HTTP
   y Prisma simulados. Confirma escritura, auditoría, notificación y segunda
   lectura; B6 confirma propagación del error original sin efectos de éxito.
3. **Dos referencias temporales:** fijando host UTC en `2026-01-01T02:00:00Z`,
   el filtro usa `2025-12-31` en Chile y el autosync consulta el año `2026`.
   Se preservó esa diferencia; unificarla requiere un cambio funcional separado.
4. **Contrato de paginación:** B2 y B4 fijan `data/meta`, total filtrado y
   `totalPages`; B1/B3 conservan el array enriquecido. OpenAPI de GET solo
   documenta array y `since`: la revisión detectó una omisión documental de la
   variante paginada, pendiente de evaluar fuera de la extracción.

## Límites de la evidencia

Los tests de consulta fijan el contrato de filtros/orden enviado a Prisma y
los resultados enriquecidos. No prueban el motor SQL ni implementan una copia
del algoritmo de filtrado de PostgreSQL dentro de un mock.

Las pruebas de controller usan autenticación simulada; no prueban permisos del
router real. No se ejecutaron solicitudes a Boostr ni escrituras en una BD real.

Reloj, zona del host, variable de autosync, mocks y fetch se restauran al terminar
cada test. La red está sustituida incluso en los casos que no deben usarla.

## Validación de cierre

- Suite puntual vigente tras el traslado: **25/25 tests**, tres archivos,
  incluyendo **7/7** de caracterización. Duración observada: 1,98 s; dato de
  baseline, no comparación de rendimiento de una extracción todavía pendiente.
- `npm run validate:ci` en backend: **PASS**, formato, lint, presupuesto cero,
  tipos, sincronización SDK, nueve pruebas de schemas y build.
- `JWT_SECRET=test-secret npm run test:coverage` en backend, usando el entorno
  de test declarado en CI: **FAIL**, 141 tests pasan y uno falla, 27 archivos
  pasan y uno falla. Los tests nuevos y trasladados están dentro de esta selección.
- Causa del fallo global: snapshot de `tests/api-contract.test.ts` para
  `SendTestEmail` aún espera `recipient`; `email.schemas.ts` define `to`,
  `subject` y `message`. Ambos archivos están sin cambios respecto a HEAD.
  No se actualizó el snapshot ni se omitió la prueba para obtener verde.
- El primer intento de coverage sin entorno de CI falló al importar por ausencia
  de `JWT_SECRET`; se corrigió únicamente el entorno del comando de prueba.
- `npm run validate:ci:coverage` en frontend: **PASS**, formato, lint,
  presupuesto cero, tipos, **276/276 tests en 71 archivos**, coverage y build.
- Raíz: `npm run spec:check`, `npm run docs:check` y formato de los cinco
  documentos de la spec: **PASS**. `git diff --check`: **PASS**.
- El archivo trasladado se comparó byte por byte contra su versión original
  en HEAD: contenido idéntico. No se modificaron archivos de producción.

El fallo global queda separado de T1; AC6/T5 no se declaran completados.
Esta entrega prueba la baseline de feriados, no que todo el repositorio esté verde.
