# Spec 092: Reutilizar formatter al sumar días de negocio

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

El perfil CPU de Spec 091 registró `addBusinessDaysCL` con 6,978 ms muestreados
medianos en tres navegaciones frías de Control horario. La función calcula una
fecha al mediodía UTC y luego usa `formatInTimeZone` con el patrón fijo
`yyyy-MM-dd`. La conversión de zona y calendario ya está implementada mediante
el formatter `Intl.DateTimeFormat` reutilizado por `formatBusinessDateCL`.

Una microprueba local con siete rondas de 50.000 operaciones y 350 pares
deterministas de fecha/desplazamiento dio medianas de 620,00 ms con
`formatInTimeZone` y 219,12 ms con el formatter reutilizado (−64,7 % en ese
microbenchmark); los 350 resultados coincidieron.

## Alcance

Dentro:

- Reutilizar `formatBusinessDateCL` al formatear la fecha calculada por
  `addBusinessDaysCL`, conservando intacta la aritmética de fecha.
- Comparar ambos caminos para fechas de borde, años bisiestos, horario de verano
  y desplazamientos positivos y negativos.
- Medir tres perfiles de producción posteriores y cinco cargas frías de
  Lighthouse en staging.

Fuera:

- Cambiar validación de entradas, reglas de jornada, consumidores, consultas,
  componentes, API, contratos o almacenamiento.
- Cambiar `TimeControl.view.tsx`, que está marcada `UI-PROTECTED`.
- Afirmar una reducción causal de TBT con muestras secuenciales.

## Criterios de aceptación

- [x] AC1: La suma de días conserva la salida `yyyy-MM-dd` y coincide con
      `date-fns-tz` para fechas y desplazamientos deterministas de prueba.
- [x] AC2: `addBusinessDaysCL` reutiliza el formatter de fecha de negocio y no
      ejecuta el parser general `formatInTimeZone` para su resultado.
- [x] AC3: Tres perfiles de staging comparan `addBusinessDaysCL`, CPU activo y
      solicitudes con Spec 091; cobertura y límites de atribución quedan escritos.
- [x] AC4: Cinco corridas Lighthouse y el preflight registran métricas, salud de
      staging, typecheck, lint y consistencia documental.

## Restricciones

Solo se cambia la conversión del resultado. La construcción UTC al mediodía y
el ajuste con `setUTCDate` permanecen sin modificaciones para conservar las
reglas y límites actuales.

## Trazabilidad

- Tests: `frontend/src/utils/timePolicy.test.ts`.
- Perfil base: `../../091-time-policy-cached-business-date/evidencia/time-control-production-cpu-after-2026-10-25.json`.
- Lighthouse: `./evidencia/time-control-lighthouse-after-2026-10-25.json`.
- Resultado: `./evidencia/resultado.md`.
