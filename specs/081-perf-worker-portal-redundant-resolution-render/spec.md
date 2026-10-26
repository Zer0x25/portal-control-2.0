# Spec 081: evitar render redundante al resolver el Worker Portal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En las tres muestras frías de Spec 080, la ruta Worker Portal registró cinco
commits frente a cuatro del subárbol visual; uno de los commits de ruta tuvo
`actualDuration` de 0 ms y no actualizó la vista. La captura A/B con la bandera
de resolución eliminada mantuvo el mismo conteo. La inspección del hook mostró
otra sincronización derivada: `status` se copia a estado desde la última query y
`latestOpenRecord` se actualiza aunque la vista no lo consume. Esa segunda
sincronización puede añadir un commit después de recibir el registro.

## Alcance

Dentro:

- Derivar el estado de marcaje directamente del empleado y de su última query.
- Eliminar el estado `latestOpenRecord`, no consumido por la vista, y la bandera
  de finalización usada solo para calcular la carga.
- Derivar el indicador de carga desde el rol, la disponibilidad del empleado,
  la carga de la query y la resolución de fallback en curso.
- Añadir una regresión que compruebe que el estado de marcaje disponible al
  montar no necesita un render posterior de sincronización.
- Medir de nuevo la ruta con tres contextos fríos usando el perfil Vite dev.

Fuera (explícito):

- Editar `WorkerPortal.view.tsx`, marcado `UI-PROTECTED`.
- Cambiar el contrato de datos, consultas, endpoints o comportamiento de negocio.
- Reconstruir, reiniciar o desplegar servicios de staging.
- Atribuir los tiempos de Vite dev a producción o a Core Web Vitals.

## Criterios de aceptación

- [x] AC1: `status` se deriva de la query del último registro y conserva `getContractClockingStatus`; sin empleado o registro devuelve `fuera`.
- [x] AC2: La carga distingue query inicial y resolución de fallback sin bandera de finalización redundante.
- [x] AC3: Con empleado y último registro disponibles al montar, el hook produce el estado correcto en un render, sin commit de sincronización.
- [x] AC4: Tres perfiles fríos con la misma configuración comparan baseline y cambio, con eventos completos y sin aumento de commits de ruta o vista.
- [x] AC5: La evidencia documenta los límites de Vite dev y confirma que la imagen de staging no cambió.
- [x] AC6: Tests dirigidos, frontend check/lint, governance specs/docs y preflight local pasan antes del commit.

## Restricciones

- La vista protegida permanece intacta.
- El perfil de React en Vite dev se usa para atribución de commits, no para
  estimar latencia de producción ni CWV.
- El API de desarrollo apunta al staging local de `127.0.0.1:8080`; no ejecutar
  mutaciones de negocio ni alterar sus servicios.

## Trazabilidad

- Baseline: [perfil de vista Spec 080](../080-worker-portal-view-subtree-render-profile/evidencia/worker-portal-view-render-profile-2026-10-24.json).
- Baseline A/B: `./evidencia/worker-portal-baseline-render-profile-2026-10-24.json`.
- Evidencia posterior: `./evidencia/worker-portal-render-profile-2026-10-24.json`.
- Test dirigido: `frontend/src/tests/features/worker-portal/useWorkerPortalData.test.tsx`.
