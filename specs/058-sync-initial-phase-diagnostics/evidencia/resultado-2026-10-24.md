# Resultado 058: fases de sincronización inicial

## Captura

Se ejecutó el probe Playwright contra staging en tres contextos nuevos de administrador, ruta `/#/time-control`, viewport 412×823, Chromium 153 y CPU 4×. El JSON guarda requests como método, pathname, estado y tiempos; no incluye query strings ni cuerpos. Todas las 63 solicitudes registradas terminaron con HTTP 200.

## Overlay y pintura

| Medición                                     | Muestras                 |  Mediana |          Rango |
| -------------------------------------------- | ------------------------ | -------: | -------------: |
| FCP                                          | 724 / 696 / 672 ms       |   696 ms |     672–724 ms |
| Candidato LCP del navegador                  | 1.628 / 1.568 / 1.356 ms | 1.568 ms | 1.356–1.628 ms |
| Overlay visible→retirado                     | 871,5 / 937,7 / 798,4 ms | 871,5 ms | 798,4–937,7 ms |
| Inicio visible del overlay desde `page.goto` | 972 / 917 / 857 ms       |   917 ms |     857–972 ms |
| Retirada del overlay desde `page.goto`       | 1.844 / 1.854 / 1.655 ms | 1.844 ms | 1.655–1.854 ms |

En las tres muestras el overlay mantuvo la cobertura y ganó el hit-test central hasta retirarse; `lastSyncTime` era nulo al inicio y estaba escrito al final. Los dos spinners y el progreso permanecieron visibles. El candidato LCP se registró antes de retirar el overlay en las tres capturas; en una muestra fue el H1 de la ruta, bajo la pantalla bloqueante. Por eso ese candidato no mide cuándo el usuario pudo ver la ruta sin obstrucción.

## Requests y pasos

Cada contexto registró 21 requests API. Se observaron dos grupos: una primera tanda que comenzó entre 721 y 835 ms y terminó hasta 1.165 ms; una segunda tanda desde 1.430–1.583 ms hasta 1.525–1.722 ms. Entre el último fin de la primera tanda y el primer inicio de la siguiente hubo 300–556 ms sin requests API capturados. Son intervalos de pared; no identifican si el tiempo corresponde a JavaScript, consultas locales, React u otra tarea.

`GET /api/health`, usado por `validateInstanceId`, tuvo duración de 295, 344 y 349 ms (mediana 344 ms; inicio mediano 505 ms y fin mediano 839 ms). Las lecturas de usuarios, empleados, auditoría y estadísticas empezaron alrededor de 0,83 s y duraron aproximadamente 0,20 s de mediana. Las lecturas tardías de configuración, turnos y marcaciones duraron entre 0,08 y 0,14 s de mediana por endpoint; sus tiempos se solapan con el tramo final del overlay. `/api/records` apareció tres veces por contexto y `/api/shift-reports` dos veces por contexto; como se omitieron query strings, no se clasifican como llamadas duplicadas.

El texto del overlay mostró `Preparando entorno seguro...` durante la mayor parte de la espera. Los pasos visibles de Usuarios/Empleados/Configuraciones/Horarios/Medidores no conservaron intervalos separados: el primer texto de sincronización observado fue Empleados al 20%, y las actualizaciones siguientes aparecieron agrupadas a pocos milisegundos de la retirada. Eso indica que las actualizaciones de UI no permiten medir cada `await` de `runSync`; no demuestra que los pasos sean instantáneos ni que un request particular mantenga el overlay.

## Conclusión y siguiente medición

La duración del overlay sigue cerca de 0,87 s desde su primera pintura. Health ocupa unos 0,34 s antes de ese punto; la segunda oleada de consultas coincide con el tramo final y termina antes de retirar la pantalla. Son candidatos medidos, no causas confirmadas. Antes de cambiar la sincronización, el siguiente paso es tomar marcas optativas en los límites de `validateInstanceId` y de cada `step.action` para distinguir el tiempo esperado por cada grupo; después se puede priorizar un cambio con evidencia directa.

Evidencia cruda de las tres muestras: [`time-control-sync-phase-diagnostics.json`](./time-control-sync-phase-diagnostics.json). Rebuild de staging con las clases originales del overlay: `sha256:0781f32e0b234c0828bf9feb04c11d73737f528261053ecff7004d080eb31bfd`.

## Validación

- Probe enfocado en staging: 1/1 test aprobado, con tres contextos nuevos. Captura: `2026-10-24T10:30:22.178Z`.
- `frontend run check`, `frontend run lint`, Prettier, `spec:check` (58 specs), `docs:check` y el preflight completo pasan.
- El código de la medición partió de `b55b0c0`; los cambios de este probe son solo E2E, documentación y evidencia.
