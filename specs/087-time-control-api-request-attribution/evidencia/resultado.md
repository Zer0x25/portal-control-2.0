# Resultado Spec 087: atribuir solicitudes API del arranque

## Entorno y captura

- Ruta: Control horario, tres navegaciones frías, Chromium 153, CPU 4×,
  viewport 412×823.
- Imagen staging: `sha256:fcdcc13af02ae5891514463b2f5bec9d8c22202417edbb1a63de7e17544e5524`,
  la misma de Spec 086.
- Source maps: 208/208 bundles JavaScript cotejados con el frontend activo;
  cobertura de React Core mapeada al 100%.
- API: 19 solicitudes por muestra, 19 respuestas HTTP 200 y cero fallos en
  cada una; se observaron 12 plantillas OpenAPI. No se añadieron solicitudes de
  medición.

## Hallazgos

| Señal                                           |                Resultado |
| ----------------------------------------------- | -----------------------: |
| Solicitudes iniciadas dentro de una tarea larga |        13, 13 y 18 de 19 |
| Llamador `apiClient.performRequest`             | presente en 3/3 perfiles |
| CPU muestreado bajo ese frame                   |        mediana 71,027 ms |
| Duración de red válida                          |         0/57 solicitudes |

Las tareas largas contenían solicitudes de varias áreas. La captura no prueba
que `performRequest` cause el TBT: sus muestras son de CPU muestreado y las
solicitudes solo se correlacionan temporalmente con `RunTask`.

Los 57 requests se marcaron `out-of-order`; por eso se guardaron nulos los
tiempos a headers y de respuesta completa. El protocolo CDP define los tiempos
de estos eventos como `MonotonicTime` ([referencia Network de CDP](https://chromedevtools.github.io/devtools-protocol/tot/Network/));
esta evidencia no permite explicar por qué el orden observado incumple la
secuencia esperada. No usar esos tiempos como latencia de red.

## Decisión

La llamada más clara para reducir el fanout era el hook de correcciones, junto
con consultas de configuración que Control horario no consume. Se implementó
ese experimento aislado en Spec 088. La evidencia agregada está en
[`time-control-api-requests-2026-10-25.json`](./time-control-api-requests-2026-10-25.json);
no se conservaron trazas CDP crudas.
