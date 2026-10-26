# Spec 077: atribución CPU de producción para Worker Portal

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

En las tres trazas Lighthouse frías de Spec 076, `react-core` tuvo entre 807 y
1.027 ms de scripting con CPU 4×, y las long tasks duraron 78–245 ms. El shell
temprano ya redujo LCP, pero las trazas minificadas no dicen qué componente
aplicativo origina el trabajo. Los perfiles React de Vite dev de Spec 074 no
son comparables con estos tiempos de producción.

## Alcance

Dentro:

- Capturar perfiles CPU de la carga fría de Worker Portal en el staging activo,
  con source maps locales del build de producción y tres contextos Chromium.
- Traducir las muestras a rutas de módulo y estimar tiempo propio por función y
  tiempo inclusivo por el frame aplicativo más cercano.
- Guardar un resumen reproducible y privado que permita priorizar una hipótesis
  de optimización o concluir que la atribución aún no alcanza.

Fuera (explícito):

- Cambiar componentes, dependencias, contratos, datos, autenticación o el
  comportamiento del portal.
- Usar el perfil instrumentado para declarar mejora de LCP/TBT o compararlo
  numéricamente con Vite dev.
- Publicar source maps o reconstruir backend, base de datos, volúmenes o la
  imagen activa de staging.

## Criterios de aceptación

- [x] AC1: Tres contextos fríos autenticados como Worker cargan directamente
      `#/worker-portal` del staging activo, con viewport 412×823 y CPU 4×; el
      reloj real aparece en las tres muestras.
- [x] AC2: El perfil CPU conserva duración de muestra y frames; source maps
      locales corresponden byte por byte a los scripts activos (ignorando solo
      la anotación `sourceMappingURL`) y resuelven al menos 90% del tiempo
      muestreado de `react-core` en cada contexto, o la evidencia identifica la
      causa concreta de menor cobertura y declara la atribución insuficiente.
- [x] AC3: El informe agrega tiempo propio por frame y tiempo inclusivo al frame
      aplicativo más cercano, muestra las tres muestras y sus medianas, y solo
      recomienda un módulo si se repite en al menos dos contextos; conserva la
      línea original cuando el source map la resuelve.
- [x] AC4: La evidencia no incluye tokens, credenciales, cuerpos de API,
      orígenes, query strings ni fragmentos; no se cambian archivos de runtime
      bajo `frontend/src/` y el ID de la imagen activa de staging permanece
      igual antes y después.
- [x] AC5: El build normal de `frontend/dist` queda restaurado sin mapas; la
      auditoría y las validaciones SDD/documentales pasan.

## Restricciones

- Medir staging con `Profiler` de Chromium; los mapas se generan en `dist`
  local, se validan contra los mismos bundles activos y nunca se sirven desde
  staging.
- La carga perfileada no debe enviar mutaciones. Las credenciales de prueba se
  consumen de variables de entorno/defaults del harness y nunca se escriben al
  JSON.
- El perfil agrega overhead del propio muestreador; sirve para atribución, no
  para comparar tiempos de página ni para afirmar mejora.
- Si domina React interno y el frame aplicativo no se repite, conservar los
  datos y detener la optimización de componentes hasta mejorar la atribución.

## Trazabilidad

- Baseline: [resultado Spec 076](../076-worker-portal-bootstrap-shell/evidencia/resultado-2026-10-24.md) y
  [run Lighthouse](../039-frontend-performance-battery/evidencia/runs/2026-10-24T18-38-45-541Z-ec56eb43.json).
- Tests: `frontend/scripts/profile-worker-production.test.mjs` y
  `frontend/scripts/profile-worker-production.mjs`.
- Evidencia final: `./evidencia/resultado-2026-10-24.md` y perfil agregado JSON.
