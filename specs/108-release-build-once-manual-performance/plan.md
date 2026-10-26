# Plan 108: construir, probar y publicar las mismas imágenes

## Estrategia

1. Registrar spec/ADR y probar rechazo de referencias inválidas y publicación de imágenes distintas a las probadas.
2. Extraer regresiones funcionales del archivo de benchmarks y mantener los perfiles fuera de CD.
3. Añadir override Compose que elimina build y exige imágenes explícitas.
4. Reducir CI y unir construcción, pruebas y publicación de CD en un runner con caché GHA.
5. Registrar IDs locales antes de E2E, verificar antes de push y producir manifiesto con digests para pineo y auditoría manual.
6. Añadir workflow exclusivamente manual y validador Lighthouse con agrupación por hash.
7. Verificar configuración, scripts, selección Playwright, documentación y preflight sin lanzar benchmarks exploratorios.

## Archivos

| Archivo                                     | Cambio                                      |
| ------------------------------------------- | ------------------------------------------- |
| `.github/workflows/ci.yml`                  | Retirar stack y Lighthouse                  |
| `.github/workflows/deploy.yml`              | Build único, validación, push y digests     |
| `.github/workflows/performance.yml`         | Auditoría manual de imágenes existentes     |
| `compose.images.yaml`                       | Override sin build                          |
| `scripts/release-images.cjs`                | Identidad, publicación y pineo verificables |
| `frontend/e2e/startup-regressions.spec.ts`  | Regresiones funcionales extraídas           |
| `frontend/e2e/performance.spec.ts`          | Solo medición manual                        |
| `frontend/scripts/audit-release-images.cjs` | Auditoría Lighthouse por ruta y resumen     |

## Contratos

Sin cambios de API, SDK, Prisma o comportamiento de producto. Se cambia el
contrato de publicación: mismos IDs probados, manifiesto y referencias por digest.

## Riesgos y rollback

Los fallos de GHCR pueden dejar imágenes parcialmente subidas; no se fija el
stack hasta completar todas. Rollback: revertir los workflows y override;
conservar evidencia y el cierre de la campaña. Las publicaciones antiguas se
pueden medir por digest; el código del harness es el del ref del workflow.
