# Spec 091: Formatear fecha de negocio con Intl reutilizable

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

El perfil CPU de producción de Control horario registró `formatBusinessDateCL`
con una mediana de 13,466 ms muestreados en tres navegaciones. La función usa
`formatInTimeZone(date, "America/Santiago", "yyyy-MM-dd")`; ese formateador
construye una fecha zonificada y ejecuta el parser general de tokens de
`date-fns` para producir un formato fijo. La dependencia ya cachea su
`Intl.DateTimeFormat` de zona, por lo que el candidato es evitar el trabajo
general de formateo, conservando las mismas reglas de calendario y zona.

Una microprueba local en Node 26, con siete rondas de 50.000 conversiones,
obtuvo medianas de 511,96 ms con `formatInTimeZone` y 137,44 ms con un
formateador `Intl.DateTimeFormat` reutilizado (−73,2 % en ese microbenchmark).
Cuatro fechas de borde, incluidas transiciones de día local y una fecha del año
99, produjeron el mismo resultado. Es una señal de bajo nivel que debe
confirmarse con el perfil de producción del navegador.

## Alcance

Dentro:

- Cambiar solo la implementación de `formatBusinessDateCL` para reutilizar un
  `Intl.DateTimeFormat` de `America/Santiago` y extraer año, mes y día.
- Conservar la salida `yyyy-MM-dd`, el valor predeterminado sincronizado y la
  interpretación del calendario gregoriano.
- Probar límites de día en horario de verano e invierno y conservar la
  equivalencia con `date-fns-tz` en fechas de referencia.
- Comparar tres perfiles CPU de staging antes y después y guardar la evidencia.

Fuera:

- Cambiar otras funciones o consumidores de fechas, reglas de jornada,
  consultas, componentes, endpoints, contratos o almacenamiento.
- Afirmar mejora de TBT a partir de este cambio local de formato.
- Modificar la vista `TimeControl.view.tsx`, marcada `UI-PROTECTED`.

## Criterios de aceptación

- [x] AC1: Los tests conservan `yyyy-MM-dd` para límites de día en verano e
      invierno, fechas tempranas, fecha por defecto y `Invalid Date`.
- [x] AC2: El formateador de zona se crea una vez bajo demanda y la función no
      usa el parser general `formatInTimeZone`.
- [x] AC3: Tres perfiles de producción de staging registran el coste de
      `formatBusinessDateCL` antes y después; se documentan medianas, límites y
      cobertura de mapas de fuente sin atribuir cambios de TBT a esta función.
- [x] AC4: Frontend typecheck, lint dirigido, tests dirigidos, preflight y
      reconstrucción saludable de staging completan sin errores.

## Restricciones

La zona debe permanecer fijada en `America/Santiago`; el resultado usa dígitos
latinos y calendario gregoriano. La fecha se extrae de `formatToParts`, sin
depender del orden de componentes que entregue la locale.

## Trazabilidad

- Tests: `frontend/src/utils/timePolicy.test.ts`.
- Perfil base: `../../090-time-control-defer-collapsed-filter-query/evidencia/time-control-production-cpu-after-2026-10-25.json`.
- Lighthouse: `./evidencia/time-control-lighthouse-after-2026-10-25.json`.
- Resultado: `./evidencia/resultado.md`.
