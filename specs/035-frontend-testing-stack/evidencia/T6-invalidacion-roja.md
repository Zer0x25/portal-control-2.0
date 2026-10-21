# Evidencia T6 — la invalidación de la bitácora de turno falla con el código pre-034

## Qué se comprobó

El test de invalidación (`frontend/src/tests/cache/invalidation.test.tsx`) verifica, para
**cada** mutación que declara `invalidateQueries`, que la query del recurso se vuelve a
pedir (re-fetch) y trae el dato nuevo.

Antes de la spec 034, `src/hooks/useReportMutations.ts` invalidaba la raíz **`["reports"]`**
mientras que la query de la bitácora de turno vivía en la raíz **`["shiftReports"]`**: la
invalidación **no alcanzaba** a la query y el modal de reportes cerrados seguía mostrando
datos stale.

## Reproducción (código pre-034)

Se sustituyó temporalmente la raíz de las tres invalidaciones del hook:

```diff
-      queryClient.invalidateQueries({ queryKey: queryKeys.shiftReports() });
+      queryClient.invalidateQueries({ queryKey: ["reports"] });
```

y se ejecutó el test:

```bash
cd frontend && npx vitest run src/tests/cache/invalidation.test.tsx
```

### Salida (roja)

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/tests/cache/invalidation.test.tsx > Invalidacion de queries tras mutacion (spec 035 T5, AC2) > addReport invalida la query de shiftReports (re-fetch + dato nuevo)
 FAIL  src/tests/cache/invalidation.test.tsx > Invalidacion de queries tras mutacion (spec 035 T5, AC2) > updateReport invalida la query de shiftReports (re-fetch + dato nuevo)
 FAIL  src/tests/cache/invalidation.test.tsx > Invalidacion de queries tras mutacion (spec 035 T5, AC2) > deleteReport invalida la query de shiftReports (re-fetch + dato nuevo)
AssertionError: expected 1 to be 2 // Object.is equality

- Expected
+ Received

- 2
+ 1

 ❯ src/tests/cache/invalidation.test.tsx:706:66
    704|       // 6. La query se **volvio a pedir** (re-fetch) y trae el dato n…
    705|       await waitFor(() => {
    706|         expect(recorder.countOf(resource.method, resource.path)).toBe(…
```

El `1` es el número de peticiones al endpoint: la query **no se volvió a pedir** porque la
invalidación apuntaba a otra raíz.

## Estado tras la corrección (la que se mergea)

Con `queryKeys.shiftReports()` (raíz canónica `["shiftReports"]`, tabla de
`src/lib/queryKeys.ts`) el suite queda **en verde**:

```
 Test Files  1 passed (1)
      Tests  40 passed (40)
```

El fichero `src/hooks/useReportMutations.ts` se restauró tras la captura: el código que se
mergea es el de la spec 034, no el reproducido aquí.
