# Scheduler distribuido y contención de revisiones KPI

Segundo bloque de la [tanda 5](tandas.md), posterior a [025](spec.md).

## Reclamación de una ocurrencia

La ejecución automática lee el reporte y actualiza nextRunAt mediante compare-and-swap
sobre id, isActive, cronExpression y el nextRunAt leído. Solo el proceso cuya
actualización afecta una fila genera y entrega el adjunto. El siguiente instante
cron se confirma antes del trabajo externo; no hay lease que venza mientras el
motor sigue activo. Si otro proceso reclamó la ocurrencia o cambió el cron/toggle,
el perdedor no genera ni envía.

La entrega confirma lastRunAt únicamente si todos los destinatarios respondieron
éxito y sigue vigente el horario reclamado. Un cambio concurrente conserva su
horario. Fallo del renderer/proveedor o caída tras reclamar consume esa ocurrencia;
no hay reintento automático ni garantía de entrega exactamente una vez. La prueba
usa dos procesos Node reales, sincronizados después de leer la misma fila, y un
proveedor sustituido sin correo externo.

El registro local conserva todas las promesas de ejecución, incluidas las
invocaciones manuales. stopScheduler cierra admisión y espera el motor antes de
los pools, incluso en la fábrica HTTP-only Fastify. Abrir un runtime nuevo durante
el drenaje devuelve conflicto; abrirlo después no inicia timers. El mantenimiento
local rechaza nuevas ejecuciones y difiere el mantenimiento nocturno.

La exclusión distribuida se refiere a una misma ocurrencia automática. Dos
ocurrencias distintas, o dos invocaciones manuales en procesos diferentes, pueden
solaparse. Reset/restore aún requieren una barrera distribuida de todo el trabajo
admitido; esta reclamación no la sustituye.

## Revisión KPI en 64 filas

La generación continúa siendo global. La migración preserva el contador original
y añade 63 contadores en cero. Cada transacción elige una fila por su identificador
PostgreSQL módulo 64; todos sus triggers de fuentes incrementan esa fila dentro de
la misma transacción. La lectura agrega las 64 revisiones en una consulta MVCC y
conserva precisión bigint. Un conjunto incompleto falla explícitamente.

La suma es la misma generación monotónica empleada por cache v2, sin cambios de
DTO ni de scope de invalidación. Rollback revierte los incrementos. La revisión
inicial continúa invalidando cálculos antiguos persistidos tarde. Se conservan
las 64 filas durante resets; no truncar ni reiniciar el contador separadamente.

Esta migración requiere el código que lee la suma: un proceso antiguo que lea solo
id=1 no es compatible. Aplicar migración y código con los procesos antiguos
cerrados; no se ejecutó despliegue ni migración sobre una BD del usuario. Los
ensayos y la integración usan exclusivamente PostgreSQL desechable propiedad del
harness. La migración se validó incluyendo las migraciones anteriores.

## Ensayo reproducible

Desde backend, con Node 26:

```bash
npm run benchmark:kpi:contention:baseline
npm run benchmark:kpi:contention
```

Cada comando crea y elimina su PostgreSQL 18.4 e ignora las URLs de BD del entorno.
El baseline sustituye el trigger solo dentro de esa BD desechable. Cada ensayo
hace tres rondas de 32 escrituras por caso: control (systemConfig), fuente KPI
(employee), concurrencia 1/8 y retención artificial de transacción 0/25 ms tras la
escritura. Reporta duración, throughput y latencias p50/p95; comprueba exactamente
32 incrementos por caso fuente y cero para controles. No hay umbrales temporales
flaky en CI. Los tiempos locales no constituyen capacidad de producción.

Resultados locales del 2026-10-07, tres rondas, 8 escritores y 25 ms de retención:

| Diseño    | Duración de 32 escrituras fuente (ms) | p95 fuente (ms) | Duración control (ms) |
| --------- | ------------------------------------- | --------------- | --------------------- |
| Singleton | 913 / 926 / 911                       | 431 / 478 / 394 | 168 / 201 / 166       |
| 64 filas  | 169 / 185 / 166                       | 50 / 52 / 46    | 156 / 186 / 219       |

Las medianas de duración fuente pasan de 913 a 169 ms; p95 mediana de 431 a
50 ms. Los controles continúan en el mismo orden de magnitud. Cada ronda conservó
los 32 incrementos confirmados. Esto verifica el efecto de quitar el punto único
de contención en este escenario; quedan colisiones entre transacciones que elijan
la misma fila y la invalidación conservadora global de cachés.

Validación: 735 pruebas de integración (21 archivos), incluyendo dos procesos
reales y escrituras concurrentes en las 64 filas; 18 unitarias de scheduler y
revisión; 280 frontend. Ambos CI, SDK, docs, specs, secretos y hooks.
