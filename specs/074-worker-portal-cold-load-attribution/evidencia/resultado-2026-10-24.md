# Resultado Spec 074: atribución de carga de Worker Portal

## Atribución React en Vite dev

- Tres contextos nuevos, sesión `worker`, 412×823, CPU 4×.
- API de staging respondió por proxy local; la aplicación registró sincronización
  completada en las tres muestras. Eventos descartados: 0/0/0.
- Medianas en la ventana del profiler:

| Scope                      | Commits | `actualDuration` | `baseDuration` |
| -------------------------- | ------: | ---------------: | -------------: |
| Root                       |      19 |         355,1 ms |     1.548,2 ms |
| `app:application`          |      19 |         328,5 ms |     1.182,1 ms |
| `app:query-cache-provider` |      19 |         352,3 ms |     1.508,3 ms |
| `app:router`               |      18 |         342,5 ms |     1.432,1 ms |
| `app:routes`               |      10 |         262,3 ms |       725,8 ms |
| `worker-portal`            |       5 |         146,7 ms |       191,3 ms |

Scopes padres/hijos se solapan; estas filas no se suman. El shell registró más
commits que la ruta, pero el perfil no identifica qué hook originó cada commit.
Los timings React son desarrollo y no equivalen a los Lighthouse de producción.

## Hallazgo de recursos en Lighthouse

Se conserva el baseline frío de Spec 073: Worker Portal, rol confirmado, tres
muestras, FCP 4.001 ms, LCP 5.780 ms, transferencia 510.000 B y JavaScript
348.466 B mediana.

Cada muestra fría solicita el chunk `validation` de Zod: 89.113 B sin comprimir,
30.030 B transferidos. La ruta importa estáticamente `CorrectionRequestModal`
desde el barrel `features/worker-portal/index.ts`; ese modal solo se monta cuando
se abre una corrección y su controlador usa `useAppForm`. La vista no se editó
por su protección explícita.

## Próximo experimento

Hacer lazy el export de `CorrectionRequestModal` en el barrel, con una frontera
`Suspense` local, y comprobar que:

1. el chunk `validation` no se descarga en la carga fría inicial de Worker Portal;
2. el modal y su validación sí se cargan al abrirlo en una prueba con registro
   sintético, sin mutar staging;
3. tres corridas frías comparables reducen al menos 20 KB de JS transferido, sin
   degradar la ruta o la interacción de corrección.

No se declara mejora Lighthouse a partir de esta atribución; el nuevo bundle
deberá volver a medirse con la batería completa de staging.

## Evidencia

- [Perfil React crudo](./worker-portal-render-profile-2026-10-24.json).
- [Baseline Lighthouse de tres rutas](../../039-frontend-performance-battery/evidencia/runs/2026-10-24T17-23-56-778Z-9e6c151b.json).
