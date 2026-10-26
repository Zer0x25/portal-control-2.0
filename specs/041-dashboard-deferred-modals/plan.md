# Plan 041

## Estrategia

1. Registrar perfil diagnóstico CDP local sin publicar credenciales, cuerpos de API ni coverage cruda. Comparar con el ledger válido de spec 040.
2. Escribir regresiones que fallen con imports/montajes anticipados.
3. Añadir wrappers lazy locales a Dashboard. Una vez abiertos, conservar montados los componentes para mantener borradores; antes del primer uso no montar controladores.
4. Cambiar únicamente imports de la vista protegida, sin modificar su presentación. Separar formularios/sanitización del vendor compartido en Vite.
5. Reconstruir staging; comprobar notas, reporte e impresión sin mutar datos reales. Ejecutar batería serial y registrar mediana/rangos, sin prometer mejora temporal si hay ruido.

## Archivos a tocar

| Archivo                                                                | Cambio                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------- |
| frontend/src/features/dashboard/components/DashboardDeferredModals.tsx | Wrappers de carga y montaje bajo demanda           |
| frontend/src/features/dashboard/views/Dashboard.view.tsx               | Sustitución de imports, sin layout                 |
| frontend/vite.config.ts                                                | Grupos forms y sanitization                        |
| frontend/src/tests/features/dashboard/DashboardDeferredModals.test.tsx | Montaje y borrador conservado                      |
| frontend/e2e/dashboard-deferred-modals.spec.ts                         | Requests, apertura, validación, borrador y reporte |
| specs/041-dashboard-deferred-modals/evidencia                          | Perfil resumido y comparación                      |
| .jules/bolt.md                                                         | Resultado y límites                                |

## Contratos afectados

Ningún endpoint, schema, SDK ni autorización cambia. Los componentes reales conservan sus props y reglas de negocio. La indicación unread ya se actualiza por socket/store; verificar lectura de notas independiente del modal antes de diferir su hook.

## Riesgos y rollback

Primera apertura requiere red/chunk; usar Suspense con spinner existente y ErrorBoundary de la aplicación. Evitar desmontar al cerrar para conservar borrador. El precache puede descargar chunks después del arranque: diferenciar solicitudes del documento de la instalación SW. Rollback: restaurar los dos imports y retirar wrappers/grupos de esta spec, preservando 039/040. No requiere ADR: aplica el invariante existente de modales secundarios lazy.

## Corrección del preparador durante la medición

La primera batería detectó un destino incorrecto al preparar Gobernanza. El helper visitaba origen y luego hash mientras LoginPage podía restaurar sesión y redirigir. Se eliminó la visita intermedia, conservando la siembra previa al documento y el guard estricto. `lhci-puppeteer.test.cjs` cubre navegación única y fallo con destino incorrecto; la batería ejecuta estas pruebas en `harnessValidation`. Se verificó en Chromium real la secuencia worker, kiosk, governance, dashboard, governance. El intento fallido se preserva y se repite el lote completo.
