# Spec 040: Frontend Font Subsets

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-23
- ADR relacionado: N/A

## Problema

Dashboard frío solicita cuatro fuentes que transfieren 378.560 bytes de un total de 834.170 bytes (45 %). Las tres Inter originales pesan entre 110 y 115 KB y contienen 2.849 caracteres cada una. El baseline de la spec 039 registra FCP/LCP fríos medianos de 4.247/6.246 ms en su última tanda; son métricas simuladas de laboratorio y varían entre corridas.

## Alcance

Crear subconjuntos tipográficos compartidos, mantener las fuentes completas para caracteres adicionales y medir bytes, cobertura y tiempos contra staging. Conservar familias, pesos, estilos, hinting, features OpenType, preload y políticas de caché. No cambiar interfaz, contratos HTTP, datos, JavaScript funcional ni presupuestos Lighthouse.

## Criterios de aceptación

- [x] AC1: Los archivos de fuentes solicitados por Dashboard para texto latino pesan en conjunto menos de 150 KB y menos que los cuatro originales; registrar bytes realmente transferidos.
- [x] AC2: Cada subconjunto conserva todos los caracteres originales dentro de su rango, sus métricas y contornos; el respaldo completo cubre el resto con rangos CSS disjuntos. Los originales no se modifican.
- [x] AC3: Las familias y pesos CSS actuales se conservan, el preload apunta a Regular latino y las fuentes siguen fuera del precache con caché inmutable. Conservar licencias y copyright.
- [x] AC4: Un generador reproducible con herramientas fijadas produce los assets y CSS, con modo check que detecta diferencias y valida cobertura. Python solo es herramienta de mantenimiento.
- [x] AC5: Una prueba de navegador demuestra latín sin descargar fuentes completas, carga adicional al solicitar otros alfabetos y apariencia tipográfica equivalente al baseline.
- [x] AC6: Reconstruir frontend de staging, ejecutar batería de 18 rutas, Lighthouse estándar y tres muestras frías; guardar imagen, resultados y comparación sin prometer mejora temporal si las muestras no la prueban.

## Trazabilidad

- Plan: ./plan.md
- Tareas: ./tasks.md
- Baseline: ../039-frontend-performance-battery/evidencia/catalogo-y-corrida-18-rutas-2026-10-23.md

- Evidencia: ./evidencia/resultado-2026-10-23.md
