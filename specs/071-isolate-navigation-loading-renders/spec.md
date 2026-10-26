# Spec 071: aislar los renders del loading de navegación

- Estado: Aprobado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Spec 070 encontró 26–32 commits de `App` durante el primer segundo de
Control Horario. `App` llama a `useNavigationLoading`, que se suscribe a la ruta,
al conteo global de queries activas (`useIsFetching`) y a la restauración de
Query. Cada cambio en esas fuentes puede volver a renderizar el componente que
construye las rutas y el shell.

## Alcance

Dentro:

- Mover `useNavigationLoading` a un controlador memoizado sin DOM, para que los
  cambios globales de query no fuercen el render de `App`.
- Agregar un scope de React Profiler dev para medir el controlador separado.
- Comparar el perfil de tres contextos con la evidencia de Spec 070 y correr los
  tests existentes del hook.
- Conservar el comportamiento actual del indicador: se abre al cambiar de ruta,
  permanece mientras hay queries y se cierra con los mismos límites.

Fuera (explícito):

- Cambiar los umbrales, los selectores, la política de queries o el indicador.
- Presentar el conteo de commits en Vite dev como mejora de latencia/CWV en
  producción.
- Guardar contenido de queries, datos de sesión o identidad de usuarios.

## Criterios de aceptación

- [x] AC1: Se implementa y mide una extracción experimental del hook a un
      controlador memoizado; el cambio final se conserva solo si cumple AC4.
- [x] AC2: Los tres tests existentes de `useNavigationLoading` pasan y no se
      agregan requests ni query markers.
- [x] AC3: En tres muestras frías el perfil separa los commits del controlador
      de los commits de `App`; se compara con Spec 070 sin sumar scopes anidados.
- [x] AC4: Si el número mediano de commits de `app:application` no baja al menos
      20% frente al baseline de Spec 070, se revierte la extracción.
- [x] AC5: Se informa el resultado como atribución de renders, sin afirmar una
      mejora de producción ni de Core Web Vitals.

## Restricciones

El cambio de owner de los efectos puede cambiar su orden relativo con los
efectos de `App`; la prueba existente y el probe de navegación deben confirmar
que el loading conserva su ciclo. El React Profiler solo se monta en dev.

## Trazabilidad

- Código: `frontend/src/App.tsx` y `frontend/src/utils/RenderProfiler.tsx`.
- Antecedentes: Specs 034, 069 y 070.
- Evidencia: `evidencia/navigation-loading-render-profile-2026-10-24.json` y
  `evidencia/resultado-2026-10-24.md`.
- Bitácora: `.jules/bolt.md`.
