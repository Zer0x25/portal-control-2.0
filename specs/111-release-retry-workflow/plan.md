# Plan 111

## Estrategia

1. Añadir regresión de alta embebida y de identidad del manifiesto antes de cambiar la implementación.
2. Restaurar el botón en la barra de empleados y actualizar la prueba del recorrido real heredado.
3. Separar build de validación/publicación mediante artefacto de imágenes Docker y manifiesto por ejecución.
4. Hacer checkout del SHA construido, verificar identidad al cargar y antes de publicar, y aislar reportes.
5. Eliminar detección inútil en push y omisiones de bots; acotar permisos y concurrencia de release-please.
6. Ejecutar preflight y pruebas funcionales locales; actualizar ADR-0029 y evidencia.

## Archivos

| Archivo                                                                           | Cambio                                              |
| --------------------------------------------------------------------------------- | --------------------------------------------------- |
| `frontend/src/features/employee-management/views/EmployeeManagement.view.tsx`     | Restaurar acción existente en modo embebido         |
| `frontend/src/tests/features/employee-management/EmployeeManagementView.test.tsx` | Regresión del botón embebido                        |
| `frontend/e2e/business-flows.spec.ts`                                             | Ruta, filtros, modal, casos independientes          |
| `.github/workflows/deploy.yml`                                                    | Build reutilizable y validación por identidad       |
| `.github/workflows/ci.yml`                                                        | Detección solo PR y validación sin bypass por actor |
| `.github/workflows/release-please.yml`                                            | Permisos por job y concurrencia                     |
| `scripts/release-images.cjs`                                                      | Verificación del manifiesto restaurado              |
| `scripts/release-images.test.cjs`                                                 | Rechazo de IDs o fuente incorrectos                 |
| `docs/adr/0029-release-build-once-manual-performance.md`                          | Reintentos y recuperación                           |

## Contratos, riesgos y rollback

Sin cambios HTTP, Prisma ni SDK. Transferir imágenes añade almacenamiento y
tráfico entre runners; retención de tres días para candidatos y siete para
reportes. Los reintentos requieren el artefacto no expirado. Una ejecución nueva
construye candidatos nuevos usando caché de capas. Revertir el PR restaura el
workflow anterior sin tocar versiones publicadas. Una release cuyo código tiene
la regresión necesita una versión correctiva; no mover tags existentes.
