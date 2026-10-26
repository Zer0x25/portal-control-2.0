# Plan 091: Formatear fecha de negocio con Intl reutilizable

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Confirmar que staging servía la imagen registrada por Spec 090 y reutilizar
   sus tres perfiles como base; de lo contrario, capturar una base nueva.
2. Añadir casos de equivalencia para fechas próximas a medianoche local en
   verano e invierno, años bajos, default sincronizado e `Invalid Date`.
3. Reemplazar el formateo genérico con un `Intl.DateTimeFormat` de zona y
   calendario explícitos, creado bajo demanda y reutilizado.
4. Ejecutar los tests dirigidos y validar output diferencial contra
   `date-fns-tz` en un conjunto amplio de instantes deterministas.
5. Reconstruir frontend de staging, confirmar salud, captura de tres perfiles
   de producción y cinco Lighthouse frías; comparar métricas y declarar límites
   sin inferir causalidad en TBT.
6. Guardar perfil posterior y resultados, actualizar `.jules/bolt.md`, ejecutar
   preflight y crear un commit Conventional.

## Archivos a tocar

| Archivo                                       | Cambio                                                |
| --------------------------------------------- | ----------------------------------------------------- |
| `frontend/src/utils/timePolicy.ts`            | Reutilizar formatter Intl para BusinessDateCL.        |
| `frontend/src/utils/timePolicy.test.ts`       | Cubrir límites, default, calendario y fecha inválida. |
| `specs/091-time-policy-cached-business-date/` | Registrar evidencia comparativa y conclusión.         |
| `.jules/bolt.md`                              | Registrar el cambio y el siguiente foco medido.       |

## Contratos afectados

Sin cambios: no afecta APIs, schemas, SDK, Prisma ni persistencia.

## Riesgos y rollback

Los riesgos son el calendario, los dígitos o el orden regional que devuelve
`Intl`. Se fijarán `calendar: "gregory"`, `numberingSystem: "latn"`, zona
`America/Santiago` y extracción por tipo de parte. Rollback: restaurar la llamada
`formatInTimeZone(date, BUSINESS_TZ, "yyyy-MM-dd")`.

## Verificación

```bash
fnm exec --using=26.10.0 -- npm --prefix frontend run test:run -- src/utils/timePolicy.test.ts
fnm exec --using=26.10.0 -- npm --prefix frontend run check
fnm exec --using=26.10.0 -- npm --prefix frontend exec -- eslint src/utils/timePolicy.ts src/utils/timePolicy.test.ts
fnm exec --using=26.10.0 -- npm run preflight
fnm exec --using=26.10.0 -- npm run staging:up
fnm exec --using=26.10.0 -- npm --prefix frontend run perf:profile:route -- --route=time-control --output=../specs/091-time-policy-cached-business-date/evidencia/time-control-production-cpu-after-2026-10-25.json
fnm exec --using=26.10.0 -- npm --prefix frontend run perf:time-control:cold
```
