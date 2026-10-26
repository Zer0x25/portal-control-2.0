# Spec 100: Diferir apertura de IndexedDB hasta el primer uso

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-25
- ADR relacionado: N/A

## Problema

Los perfiles fríos de Time Control registran `initDB` (39,568 ms muestreados
en una captura) y `createStoreWithSyncIndexes` (21,327 y 11,366 ms en dos de
tres) durante el arranque. `indexedDB.ts` abre la base como efecto lateral al
importarse, aunque las operaciones públicas ya esperan esa misma inicialización
y la sincronización fría omite la lectura de caché (Spec 061).

## Alcance

Dentro:

- Evaluar la apertura diferida al primer CRUD sin cambiar nombre, versión,
  stores, índices, migraciones ni contenido de IndexedDB.
- Verificar que la primera operación abre una sola promesa compartida y que la
  lectura de caché/offline sigue funcionando.
- Comparar perfiles y Lighthouse contra la imagen exacta de Spec 099.

Fuera (explícito):

- Rediseñar el esquema, eliminar stores/índices o cambiar políticas de caché.
- Cambiar sincronización, APIs, datos, contratos o la vista protegida
  `TimeControl.view.tsx`.
- Conservar el cambio de runtime si la medición no muestra una mejora repetible.

## Criterios de aceptación

- [x] AC1: Importar el módulo no llama `openDB`; la primera operación de
      IndexedDB lo abre una vez y llamadas concurrentes comparten la promesa.
- [x] AC2: Las pruebas de sincronización fría, consultas y fallback offline
      conservan su comportamiento y TypeScript, ESLint y formato pasan.
- [x] AC3: Tres perfiles fríos verifican requests/respuestas sin fallos y
      atribuyen cuándo ocurre la apertura; cinco corridas Lighthouse comparan
      TBT y LCP contra Spec 099. Conservar el cambio solo si TBT mediano baja al
      menos 10% y LCP mediano no empeora más de 5%; si no, revertir el runtime,
      guardar el resultado y marcar la spec Descartado.
- [x] AC4: Preflight completo, staging saludable y sin modificación del esquema,
      cuentas ni datos compartidos.

## Restricciones

Sin contrato, migración ni cambio del esquema IndexedDB. Todas las funciones
CRUD deben seguir aguardando la inicialización antes de usar una store. El
rollback consiste en restaurar el `initDB()` de módulo si se comprueba una
regresión funcional o si no se alcanza el umbral de rendimiento del AC3.

## Trazabilidad

- Tests que lo probarán: un test de ciclo de vida del módulo IndexedDB y las
  pruebas focalizadas de `syncSlice` y `useTimeRecordsQuery`.
- Docs a actualizar: evidencia de antes/después y `.jules/bolt.md`.
