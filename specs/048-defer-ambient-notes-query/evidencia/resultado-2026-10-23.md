# Evidencia Spec 048: consulta ambiental de notas diferida

## Método

Comparé tres ejecuciones seriales del test de arranque en staging después de Spec 047 con tres ejecuciones después de reconstruir el frontend para Spec 048. Se usaron el mismo Dashboard, usuario Admin, viewport y test Playwright. También comprobé una apertura separada del modal Quick Notes. No ejecuté Lighthouse: esta iteración mide solicitudes API y mantiene por separado los tiempos DOM observados.

## Resultados

| Medición                                     |                Antes (3 muestras) |      Después (3 muestras) |
| -------------------------------------------- | --------------------------------: | ------------------------: |
| Solicitudes API únicas al iniciar            |                                 9 |                         8 |
| `GET /api/notes` al iniciar                  |                     1 por muestra |             0 por muestra |
| Duración de `/api/notes` removida del inicio | mediana 25,96 ms (19,56–33,34 ms) |                         — |
| Contenido principal visible, mediana         |         553,08 ms (536,19–559,29) | 582,83 ms (528,75–663,67) |
| Reloj visible en DOM, mediana                |         571,27 ms (550,84–612,62) | 633,27 ms (587,97–891,02) |
| Endpoints con error o duplicados             |                             0 / 0 |                     0 / 0 |

La carga de API se redujo un 11,1% en esta iteración y un 20% acumulado desde las 10 solicitudes de Spec 046. Al abrir Notas, `/api/notes` se solicitó 382,54 ms después de iniciar la acción y respondió HTTP 200. Las respuestas de las tres corridas de inicio también fueron HTTP 200.

Los tiempos DOM medianos fueron numéricamente más lentos después del cambio, pero los rangos antes y después se solapan. Con tres muestras no se demuestra una variación estable ni se atribuye una mejora de render o Core Web Vitals a esta reducción de solicitudes.

## Verificación

- `AmbientReminderManager.test.tsx`: 2/2 pruebas; cubren la ventana de un minuto y conservar el disparador durante una lectura pendiente.
- Playwright staging: 3/3 inicios y 1/1 apertura de Quick Notes aprobados.
- Frontend `validate:ci`: 178 archivos de test, 929 pruebas, lint, tipos, Storybook, build y budgets aprobados.
- Staging reconstruido y saludable: gateway HTTP 200; imagen `sha256:90f244ed92908124a6635a82612179318c88604e57ccbdd4ce0474aaa216f534`.

## Archivos

- Capturas antes/después: `./baseline/` y `./runs/sample-*/`.
- Apertura bajo demanda: `./runs/modal-open/quick-notes-on-demand.json`.
- Comparación legible por máquina: `./comparison.json`.
