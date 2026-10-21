import "@testing-library/jest-dom/vitest";
// En browser mode (Playwright + Chromium) el DOM y las APIs del navegador
// (matchMedia, indexedDB, Object URL) son reales: no se stubbean. Este setup
// es el equivalente "ligero" de `setup.ts` para el proyecto `browser`
// (spec 035, T10/T12): el setup principal importa MSW (node:http), que no
// es compatible con el bundle del navegador.
