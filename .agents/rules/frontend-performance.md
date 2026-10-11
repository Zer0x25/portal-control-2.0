---
trigger: model_decision
description: Invariants for frontend performance, bundle optimization, CSS caching, animation overhead, and state boundaries.
---

# Frontend Architecture & Performance Invariants

1. **CSS Caching & HTML Size**:
   - Prohibido el inlining masivo de CSS en `index.html` (nunca habilitar plugins como `inline-css` en Vite).
   - El CSS de producción debe emitirse como archivo estático con hash inmutable (`assets/index-[hash].css`) para permitir HTTP/2 multiplexing, caching inmutable por 1 año y precache eficiente en Workbox PWA.
   - `dist/index.html` debe mantenerse en &le; 5 KB.

2. **Shell & Critical Path Animation Hygiene**:
   - Prohibido acoplar `framer-motion` a componentes estructurales del shell (`PersistentLayout`, `Header`, `TopLoadingBar`).
   - Prohibido envolver componentes atómicos de alta repetición (`Card`, `KpiCard`, `MetricCard`, `ActionButton`, filas de tablas/listas, `DashboardSkeleton`) con `motion.div` para animaciones triviales (`opacity: 0 -> 1`, desplazamientos estáticos de `y: 5`, hover/tap).
   - Todas las micro-animaciones estándar deben implementarse mediante clases CSS nativas aceleradas por GPU de Tailwind v4 (`animate-in fade-in`, `hover:-translate-y-0.5 active:translate-y-0`, `transition-transform`) y touch handlers nativos (`onTouchStart`/`onTouchEnd`), evitando la sobrecarga del reconciler y RAF de JavaScript.

3. **Code Splitting & Modal Isolation**:
   - Todo modal secundario (`ShiftHandoverModal`, `DeveloperPanel`, `UserManualModal`, `ChangePasswordModal`, `ImportModal`, `ShiftHistoryModal`) debe cargarse bajo demanda mediante `React.lazy` + `Suspense`.
   - Vistas complejas con sub-gestores o tabs pesados (ej. `PatternManager`, `AssignmentManager`, `LeaveManager`, `HolidayManager` en `TheoreticalShifts`) deben aplicar code-splitting a nivel de contenedor de pestaña.
   - En tests unitarios con `Testing Library` sobre vistas con tabs `React.lazy`, usar `findBy*` asíncrono para esperar la resolución del chunk mockeado.

4. **Separación Estricta de Estado (TanStack Query vs Zustand)**:
   - Toda colección de datos remotos proveniente de APIs (asistencia, paginaciones, registros de tiempo, catálogos) debe ser gestionada exclusivamente por TanStack Query hooks.
   - Prohibido duplicar colecciones de entidades remotas o paginaciones en slices de Zustand (como el deprecado `timeRecordSlice`).
   - Zustand se reserva estrictamente para estado de UI del cliente efímero y global (autenticación local, modales, toasts, tema).

5. **Mutation Guarding, Optimistic State & Rapid-Click Invariants**:
   - **Protección contra Clics Rápidos**: Todo botón o disparador de mutación (`ActionButton`, botones de aprobación/rechazo) debe enlazar sincrónicamente `disabled={isProcessing}` y reflejar un estado visual de carga (`loading`/spinner).
   - **Guard Ref Anti-Doble-Submit**: Además del `disabled`, todo handler de punch o mutación crítica debe usar un ref sincrónico (`isSubmittingRef`: retorno temprano si ya hay un intento en vuelo, liberación en `finally`). Dos toques rápidos disparan dos POST antes de que React re-renderice el `disabled`; el ref es la única barrera sincrónica.
   - **Propiedad Única del Toast de Error**: Cuando el llamante tiene `catch` propio con toast, la mutación debe suprimirse (`suppressErrorToast: true` en las variables de `mutateAsync` + early-return en el `onError`) para que un mismo fallo muestre exactamente un toast. El `catch` prefiere el mensaje del backend ante denegación de negocio (licencia, jornada cerrada, colación, cooldown) y reserva el genérico solo para fallos de red.
   - **Manejo de Errores Asíncronos**: Todo handler de evento en la UI que ejecute `mutateAsync` debe estar envuelto en un bloque `try/catch` para evitar `Uncaught (in promise) Error` en la consola del cliente.
   - **Propagación de Errores de API**: Las funciones del SDK/servicios cliente (`src/services/*`) deben extraer y propagar `errorData.message` o `errorData.error` en lugar de lanzar mensajes genéricos sustitutos que oculten la causa real del servidor.
   - **Actualización Optimista y Filtrado**: Las acciones de cambio de estado en colecciones de tarjetas/listas deben aplicar actualizaciones optimistas (`onMutate` con rollback en `onError` e invalidación en `onSettled`) o filtros estrictos por estado para remover visualmente el ítem inmediatamente.
