# Spec 075: carga diferida del modal de corrección de Worker Portal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

La medición fría de Spec 073 registró el chunk de validación de Zod en las tres
cargas iniciales de Worker Portal: 30.030 B transferidos por visita. La ruta
importa estáticamente `CorrectionRequestModal` desde su barrel, aunque el modal
solo aparece después de solicitar la corrección de un marcaje.

## Alcance

Dentro:

- Separar el controlador y la validación del modal del bundle inicial de la ruta.
- Mantener la API de props actual para no modificar la vista protegida.
- Verificar la ausencia del chunk en la ruta fría y la apertura del modal cuando
  se renderiza.
- Repetir tres muestras frías de Worker Portal en staging y comparar transferencia,
  LCP, FCP y TBT con el baseline de Spec 073.
- Guardar evidencia y anotar el resultado en el diario de rendimiento.

Fuera (explícito):

- Cambiar el flujo de corrección, formularios, validadores, API o backend.
- Enviar solicitudes de corrección o modificar datos de staging.
- Editar `WorkerPortal.view.tsx`, que está protegido contra cambios de UI.
- Afirmar mejora Lighthouse si la reducción de recursos no se confirma con las
  tres muestras comparables.

## Criterios de aceptación

- [x] AC1: La carga fría de Worker Portal no solicita el chunk del modal ni el
      chunk `validation` antes de abrir una corrección.
- [x] AC2: Al renderizar el modal, aparece su formulario real con el campo y
      registro recibidos; la prueba no envía ni persiste datos.
- [x] AC3: Tres muestras frías de Lighthouse muestran al menos 20.000 B menos de
      JavaScript transferido frente al baseline de 348.466 B, y la mediana LCP
      no empeora más de 5%.
- [x] AC4: Se conservan tres muestras frías con ruta, rol, commit base e imagen
      de frontend de staging identificables en el registro de la batería.
- [x] AC5: `spec:check`, `docs:check`, `npm run preflight`, tests focalizados y
      `git diff --check` pasan.

## Restricciones

- El modal debe cargarse bajo demanda desde el punto donde ya se renderiza, con
  una frontera `Suspense` local.
- El tipo de props se importa solo como tipo para no volver a crear una arista
  de importación estática al controlador.
- Usar el staging local existente, sin reiniciar backend, base de datos ni
  volúmenes; no mutar registros ni enviar el formulario.
- Si las medianas Lighthouse incumplen AC3, documentar la medición y revertir
  la optimización antes de cerrar esta spec.

## Trazabilidad

- Baseline: [resultado Spec 073](../073-staging-battery-current-endpoint/evidencia/resultado-2026-10-24.md).
- Atribución: [resultado Spec 074](../074-worker-portal-cold-load-attribution/evidencia/resultado-2026-10-24.md).
- Tests: prueba de carga diferida del componente y ruta fría en
  `frontend/e2e/performance.spec.ts`.
- Evidencia de resultado: `./evidencia/resultado-2026-10-24.md` y registro nuevo
  en la batería Spec 039.
