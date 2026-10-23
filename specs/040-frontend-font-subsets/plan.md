# Plan 040: Frontend Font Subsets

Spec: `./spec.md`.

## Estrategia

1. Capturar una muestra tipográfica del staging original y registrar la imagen medida.
2. Generar WOFF2 latinos desde las cinco fuentes originales, conservando features y hinting. Conservar originales para rangos complementarios. Renombrar internamente derivados si corresponde a la licencia, manteniendo alias CSS.
3. Generar declaraciones CSS en archivo externo importado desde index.css y cambiar el preload al subconjunto Regular.
4. Validar cobertura y reproducibilidad de los binarios y probar selección de fuentes en navegador.
5. Reconstruir solo frontend staging, comparar muestra tipográfica y ejecutar la batería 039 para medir efecto compartido y carga fría.

## Archivos a tocar

| Archivo                                     | Cambio                                               |
| ------------------------------------------- | ---------------------------------------------------- |
| frontend/scripts/fonts/*                    | Generación, dependencias fijadas y verificación      |
| frontend/src/assets/fonts/*                 | Subconjuntos, originales conservados y documentación |
| frontend/src/index.css                      | Importar declaraciones generadas                     |
| frontend/src/assets/fonts/fonts.css         | Declaraciones con unicode-range                      |
| frontend/vite.config.ts                     | Preload Regular latino                               |
| frontend/e2e/font-loading.spec.ts           | Selección y cobertura en navegador                   |
| specs/040-frontend-font-subsets/evidencia/* | Comparación y límites                                |

## Contratos afectados

Ningún contrato HTTP, OpenAPI, SDK o base de datos. No requiere ADR: conserva estrategia de fuentes locales y CSS externo.

## Riesgos y rollback

- Acentos, símbolos y nombres internacionales: particiones sin huecos respecto del cmap original y respaldo completo bajo demanda.
- Diferencias visuales: conservar glifos/features/hinting, comparar métricas y captura con fuentes resueltas.
- Variación Lighthouse: comparar bytes como efecto directo y reportar muestras/medianas sin adjudicar causalidad a diferencias pequeñas.
- Rollback: restaurar declaraciones originales y preload; los binarios originales permanecen intactos.

## Verificación

Generador --check, prueba Playwright de fuentes, frontend check/lint/formato, budgets existentes, specs/docs y batería staging después de reconstruir frontend.
