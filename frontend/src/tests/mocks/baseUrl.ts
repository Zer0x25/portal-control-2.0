/**
 * Base URL de la API durante los tests (spec 035, T1).
 *
 * El cliente HTTP (`src/services/apiClient.ts`) resuelve su base desde
 * `import.meta.env.VITE_API_URL`; `frontend/vite.config.ts` inyecta aqui la
 * misma constante, de modo que los handlers de MSW y las peticiones del
 * cliente apuntan **al mismo origen** (si no, el `onUnhandledRequest:
 * "error"` del server dispararia en cada test).
 */
export const TEST_API_URL = "http://localhost:4000/api";
