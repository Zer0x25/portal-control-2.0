# Plan 074: atribuir la carga fría de Worker Portal

Spec: `./spec.md`. Constitución: `../constitution.md`.

## Estrategia

1. Reutilizar el Lighthouse frío validado de Spec 073 como baseline de
   producción, sin recalcularlo con los timings dev.
2. Levantar el profiler Vite existente contra el API local de staging y tomar
   tres contextos nuevos para `worker-portal`, viewport móvil y CPU 4×.
3. Comparar scopes con sus propios commits/duraciones; los scopes anidados no se
   suman.
4. Recomendar un único foco para la siguiente spec y una medida objetiva de
   salida, sin editar código de producto aquí.

## Archivos a tocar

| Archivo                                          | Cambio                                              |
| ------------------------------------------------ | --------------------------------------------------- |
| `specs/074-worker-portal-cold-load-attribution/` | Guardar medición, análisis y siguiente experimento. |
| `.jules/bolt.md`                                 | Registrar el nuevo foco de la campaña frontend.     |

## Contratos afectados

Ninguno. El runner existente solo navega, inicia sesión de prueba y captura
perfiles React sin mutar datos de negocio.

## Riesgos y rollback

Socket.IO/proxy y el seed de staging pueden introducir ruido en Vite dev. Se
reportan como límites y se repite solo si faltan scopes o hay eventos perdidos.
Rollback: eliminar exclusivamente la evidencia de este spec; no hay cambios de
producto.

## Verificación

Crear temporalmente `frontend/.env.development.local` (ignorado por Git) con
`VITE_API_URL=/api` y `VITE_PROXY_TARGET=http://127.0.0.1:8080`; el fallback de
`apiBase.ts` apunta a `localhost:4000` en dev, que no es el API de staging.
Retirar el archivo y detener el Vite temporal al terminar.

```bash
E2E_BASE_URL=http://127.0.0.1:5174 \
E2E_API_URL=http://127.0.0.1:8080/api \
npm --prefix frontend run measure:renders -- \
  --route=worker-portal --viewport=mobile --cpu-throttle=4 --samples=3 \
  --output=../specs/074-worker-portal-cold-load-attribution/evidencia/worker-portal-render-profile-2026-10-24.json
```

Después, `npm run preflight` y `git diff --check`.
