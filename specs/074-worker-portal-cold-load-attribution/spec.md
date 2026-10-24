# Spec 074: atribuir la carga fría de Worker Portal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La corrida limpia Spec 073 midió Worker Portal con FCP frío mediano 4.001 ms,
LCP 5.780 ms, 510.000 B de transferencia y score 0,68 (tres muestras Lighthouse
con ruta y rol `worker` confirmados). El shell React compartido incluye tareas
largas; falta localizar qué scopes se actualizan en la primera ventana y cuánto
participa el hook de datos de Worker Portal antes de elegir una optimización.

## Alcance

Dentro:

- Perfilar tres navegaciones frías a Worker Portal en Vite dev con móvil 412×823
  y CPU 4×, usando el staging como API.
- Correlacionar commits y `actualDuration` entre root, App, Worker Portal y
  scopes anidados durante el primer segundo.
- Mantener separados los datos Lighthouse de producción y la atribución del
  Profiler en desarrollo.
- Decidir qué componente o estado requiere una investigación dirigida; no
  cambiar código funcional en este spec.

Fuera (explícito):

- Afirmar que el tiempo de React Profiler predice FCP/LCP de producción.
- Modificar los flujos de empleado, datos, UI, CSS, dependencias o backend.
- Enviar acciones de marcación o mutaciones.

## Criterios de aceptación

- [x] AC1: La evidencia Lighthouse previa conserva tres muestras frías válidas
      de Worker Portal, rol `worker`, como baseline de producción.
- [x] AC2: Tres perfiles Vite dev registran los scopes y commits de root, App y
      Worker Portal con viewport/CPU fijados y cero eventos descartados.
- [x] AC3: El análisis identifica el scope de mayor actividad y separa conteos,
      duración de Profiler y latencia Lighthouse sin sumarlos ni inferir causalidad.
- [x] AC4: Se documenta un próximo experimento focalizado con medición de salida;
      no se cambia comportamiento funcional en esta spec.
- [x] AC5: `spec:check`, `docs:check`, formato, lint budget y preflight pasan.

## Restricciones

- React Profiler corre en modo de desarrollo y sirve solo para atribución.
- Se usa sesión `worker` en staging local healthy; no se persisten tokens ni
  datos personales en los perfiles.
- `WorkerPortal.view.tsx` lleva protección explícita contra cambios de UI; este
  spec es de medición y no edita esa vista.

## Trazabilidad

- Baseline: [resultado Spec 073](../073-staging-battery-current-endpoint/evidencia/resultado-2026-10-24.md)
  y corrida completa de staging.
- Runner: `frontend/scripts/measure-renders.mjs --route=worker-portal`.
- Evidencia de este spec: `./evidencia/worker-portal-render-profile-2026-10-24.json`.
- Resultado: `./evidencia/resultado-2026-10-24.md`.
