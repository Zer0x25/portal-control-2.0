# Spec 079: atribuir CPU de Worker Portal fuera de frames de la app

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Spec 077 dejó 384,878 ms de CPU activo mediano sin un frame `src/` cercano.
Los frames propios más grandes incluyen `anonymous` (≈80 ms), `fetch`
(≈28–38 ms), `appendChild` (≈26–32 ms) y `renderWithHooks` (≈23–28 ms), pero
el JSON no guardó sus pilas. Sin el caller JavaScript no podemos separar costo
del navegador, React DOM, dependencias o bundles minificados para elegir la
siguiente mejora con evidencia.

## Alcance

Dentro:

- Extender el perfilador de CPU para agregar el tipo de frame hoja y el frame
  fuente más cercano de las muestras que no contienen `src/`.
- Resumir distribución por categoría y medianas por caller entre tres contextos.
- Repetir el mismo perfil frío del Worker Portal sobre el staging activo y
  dejar un registro privado reproducible con la recomendación siguiente.

Fuera (explícito):

- Cambiar el runtime de la aplicación, sus dependencias o la configuración de
  staging.
- Comparar este perfil muestreado con Lighthouse, LCP o TBT.
- Guardar perfiles crudos, URLs, consultas, credenciales o cuerpos de API.

## Criterios de aceptación

- [x] AC1: Cada muestra sin frame `src/` conserva agregados de frames hoja
      clasificados y el frame fuente mapeado más cercano de su pila; los tiempos
      agregados no duplican muestras.
- [x] AC2: El resumen contiene medianas por categoría y caller, cuenta en
      cuántos de los tres contextos aparece cada caller, y no recomienda un
      módulo salvo que aparezca en al menos dos.
- [x] AC3: Tres capturas frías autenticadas de Chromium en viewport 412×823 y
      CPU 4× usan bundles idénticos a los activos de staging; el reloj aparece
      en 3/3 y el ID de imagen frontend no cambia.
- [x] AC4: El registro no contiene orígenes, query strings, fragmentos,
      secretos, credenciales, payloads ni perfiles crudos; el build local normal
      queda restaurado sin source maps.
- [x] AC5: Tests del agregador, `spec:check`, `docs:check`, typecheck, lint,
      lint budget y preflight pasan antes del commit local.

## Restricciones

- El perfilador lee la pila de Chromium y solo serializa rutas normalizadas y
  nombres de funciones saneados.
- Las capturas siguen siendo evidencia diagnóstica de CPU muestreado; no
  estiman por sí solas una mejora visible ni sustituyen Lighthouse.
- No se reconstruye ni reinicia ningún servicio de staging.

## Trazabilidad

- Tests: `frontend/scripts/profile-worker-production.test.mjs`.
- Evidencia: `./evidencia/resultado-2026-10-24.md` y
  `./evidencia/worker-portal-noapp-cpu-2026-10-24.json`.
- Base: [Spec 077](../077-worker-portal-production-cpu-attribution/evidencia/resultado-2026-10-24.md)
  y [Spec 078](../078-worker-portal-month-options-formatter/evidencia/resultado-2026-10-24.md).
