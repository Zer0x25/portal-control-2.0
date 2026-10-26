# Resultado Spec 101: bail-out de React Compiler en panel de marcación

## Decisión

**Descartada para producción.** La variante retiró una propiedad `isSubmitting`
no consumida, quitó la memoización manual de `ClockingPanel` y permitió que React
Compiler procesara `useClockingPanel`. El perfil React de desarrollo bajó, pero
el gate predefinido exige también no aumentar bytes y no empeorar las medianas
TBT/LCP más de 5%. La candidata transfirió 610 bytes adicionales y su TBT
mediano subió 80%; el runtime se revirtió íntegramente.

Se conserva una prueba de regresión del guard existente: dos intentos mientras
el primer punch está pendiente hacen una sola llamada a `mutateAsync`. La prueba
no cambia el runtime.

## Perfil React de desarrollo

Tres navegaciones frías de `#/time-control` con Chromium 153, viewport 412×823,
Vite desarrollo y un segundo de captura por muestra. No son tiempos de
producción.

| Scope                     |                   Spec 100 base |                      Candidata | Cambio de mediana |
| ------------------------- | ------------------------------: | -----------------------------: | ----------------: |
| Ruta `time-control`       | 51,1 ms (43,8–51,6), 10 commits | 36,0 ms (24,7–37,9), 7 commits |            −29,5% |
| Vista `time-control:view` |  31,8 ms (31,7–35,3), 9 commits | 24,8 ms (19,8–26,5), 6 commits |            −22,0% |
| `clocking-panel`          |    9,3 ms (6,9–10,6), 3 commits |    6,5 ms (2,0–7,0), 3 commits |            −30,1% |
| `filters`                 |    9,7 ms (8,9–15,8), 4 commits |    8,1 ms (7,6–8,6), 4 commits |            −16,5% |
| `records`                 |     2,2 ms (1,6–2,2), 7 commits |    1,5 ms (1,5–2,4), 4 commits |            −31,8% |

Los tres perfiles de cada variante tuvieron cero eventos descartados. El build
candidato no volvió a reportar el bail-out de `useClockingPanel`; persistieron
avisos no relacionados en otros módulos. La reducción del profiler no demuestra
una mejora de TBT de producción.

## Lighthouse frío

Cinco corridas por imagen, con Lighthouse 12.6.1, configuración móvil de
`.lighthouserc-time-control-cold.json` y el backend staging sin cambios.

| Métrica                  |                   Spec 100 base |                       Candidata |  Cambio mediano |
| ------------------------ | ------------------------------: | ------------------------------: | --------------: |
| TBT                      |              175 ms (117,5–349) |                315 ms (131–422) |          +80,0% |
| LCP                      | 2.253,61 ms (2.250,54–4.015,85) | 2.254,19 ms (2.253,85–5.242,56) |          +0,03% |
| FCP                      | 2.008,41 ms (1.995,21–2.812,46) | 2.001,79 ms (1.994,61–2.600,44) |          −0,33% |
| Transferencia total      |                       457.667 B |                       458.277 B | +610 B (+0,13%) |
| Transferencia JavaScript |                       294.712 B |                       295.322 B | +610 B (+0,21%) |
| CLS mediano              |                         0,01016 |                            0,01 |         estable |

TBT candidato: 422, 131, 345,3, 225 y 315 ms. Los rangos se solapan, pero la
mediana supera ampliamente el límite de +5%; la transferencia también crece y
no pasa su gate. LCP mediano permanece estable. Las cinco corridas observaron
2–3 solicitudes API, cero errores y HTTP 200.

## Validación

- El test del campo retirado falló antes de la variante; el test de doble acción
  pasa con la barrera sincronizada original.
- TypeScript, ESLint, build y formato del candidato pasaron.
- La imagen candidata fue `sha256:93e27895e42741ad2dfb99debdafe7e703fce67d4eabc3d55d612e7596850f1b`.
- El runtime fue restaurado a Spec 100. Frontend, backend, PostgreSQL y
  PgBouncer quedaron `healthy`; gateway está `running`. Imagen final del
  frontend: `sha256:d28d7b330911eff65556468e4d51e0175ab6fb45c832610a324fd963bef9c3b0`.
- La prueba focalizada final pasó 9/9 con el runtime restaurado. Preflight
  completo: todas las seis etapas pasaron (secret scan, spec check, docs check,
  Markdown format, lint budget y TypeScript backend/frontend).
- No se ejecutaron marcaciones de negocio durante la prueba.

## Evidencia

- [Perfil React base](./render-profile-before-2026-10-25.json)
- [Perfil React candidato](./render-profile-after-2026-10-25.json)
- [Lighthouse candidato](./time-control-lighthouse-after-2026-10-25.json)
- [Lighthouse base Spec 100](../../100-defer-timecontrol-indexeddb-open/evidencia/time-control-lighthouse-after-2026-10-25.json)
