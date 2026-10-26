# Plan 085: reducir el bloqueo del hilo principal en Control horario

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Confirmar staging healthy, registrar HEAD y digest de imagen frontend. No
   reconstruir ni cambiar datos antes del baseline.
2. Ejecutar cinco corridas Lighthouse solo para `/#/time-control`, con sesión
   admin sembrada, storage frío y el perfil móvil de Spec 083. Retener los cinco
   reportes localmente y guardar un resumen saneado bajo `evidencia/`.
3. Compilar frontend con source maps locales y validar igualdad con los assets
   servidos. Perfilar tres sesiones frías con CPU 4×, capturando stacks fuente y
   conteos/errores de API sin cuerpos ni query strings. Lighthouse registra las
   tareas largas por bundle; los perfiles CDP de esta iteración no se
   correlacionan temporalmente con cada tarea. Restaurar `dist` de producción
   normal incluso si una captura falla y comprobar que staging no cambió.
4. Cruzar stacks repetidos con el código. Si no aparece un origen común en dos
   perfiles, terminar como diagnóstico sin editar runtime. Si aparece, probar un
   cambio pequeño en una rama del flujo, con regresión funcional primero.
5. Solo si hay cambio funcional, repetir cinco corridas focalizadas y correr la
   batería de staging completa una vez. Registrar medianas, rangos, imagen y
   decisión en la evidencia y `.jules/bolt.md`.

## Archivos a tocar

| Archivo                                               | Cambio                                                                                    |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `frontend/.lighthouserc-time-control-cold.json`       | Configurar cinco corridas Lighthouse solo para Control horario.                           |
| `frontend/package.json`                               | Agregar un comando reproducible de medición focalizada.                                   |
| `frontend/scripts/profile-worker-production.mjs`      | Generalizar el perfilador actual para Time Control y Worker Portal.                       |
| `frontend/scripts/profile-worker-production.test.mjs` | Cubrir agregación, paridad de assets, privacidad y rutas/roles permitidos.                |
| `frontend/src/hooks/useSocketEvents.ts` y tests       | Tocar solo si la atribución confirma que el arranque del socket afecta la tarea objetivo. |
| `frontend/e2e/performance.spec.ts`                    | Extender cobertura focalizada si hace falta medir la interacción afectada.                |
| `specs/085-time-control-tbt-optimization/`            | Guardar resumen de muestras, conclusiones y validación.                                   |
| `.jules/bolt.md`                                      | Registrar resultado y siguiente prioridad con límites causales.                           |

Los archivos de runtime son condicionales: no se editan si el perfil no cumple
el criterio de repetición de AC3.

## Contratos afectados

Ninguno. No se modifican endpoints, OpenAPI/SDK, Prisma, autenticación o datos.

## Riesgos y rollback

- La imagen de staging puede no corresponder al checkout. Comparar hashes de
  assets antes de atribuir fuentes y detener el perfil si no coinciden.
- Lighthouse y CDP añaden variabilidad y no miden INP real. Usar las cinco
  corridas para comparar medianas/rangos; no sumar resultados de builds distintos.
- Un cambio de conexión Socket.IO puede retrasar eventos. Preservar los tests de
  autenticación, reconexión, invalidación y logout; revertir si la entrega de
  eventos se degrada.
- Los perfiles pueden contener datos sensibles. Persistir solo funciones,
  rutas fuente, duraciones y conteos agregados; rechazar origins, query strings,
  tokens y cuerpos.
- El script de profiling deja `dist` temporalmente instrumentado; restaurar el
  build normal en `finally`, validar CSP y asegurar que no queden mapas.

Rollback: retirar el experimento y los cambios de runtime; se pueden conservar
la configuración focalizada, pruebas y registros sanitizados.

## Verificación

```bash
cd frontend
fnm exec --using=26.10.0 -- npm run perf:time-control:cold
fnm exec --using=26.10.0 -- npm run perf:profile:route -- --route=time-control
fnm exec --using=26.10.0 -- node --test scripts/profile-worker-production.test.mjs
fnm exec --using=26.10.0 -- npm run check
fnm exec --using=26.10.0 -- npm run build
fnm exec --using=26.10.0 -- npm run perf:staging
cd ..
fnm exec --using=26.10.0 -- npm run spec:check
fnm exec --using=26.10.0 -- npm run docs:check
git diff --check
```
