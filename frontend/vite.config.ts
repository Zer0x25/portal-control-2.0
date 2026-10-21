import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { playwright } from "@vitest/browser-playwright";

// Version de despliegue: release-please la actualiza en package.json. El
// `buster` del cache persistido de TanStack Query (spec 032) la usa para
// invalidar datos entre releases.
const appVersion = (
  JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
    version?: string;
  }
).version;
const buildVersion = process.env.VITE_BUILD_VERSION || appVersion || "dev";

// Preload de la fuente del cuerpo (Inter-Regular, pesos 400/500) con su URL
// hasheada del bundle: sin esto el navegador la descubre tarde vía CSS y el
// primer paint de texto espera ~110KB. Solo Regular: SemiBold/Bold llegan
// por CSS para encabezados sin competir con el JS crítico en el preload.
const fontPreloadPlugin = (): Plugin => ({
  name: "font-preload-inter-regular",
  apply: "build",
  transformIndexHtml(html, ctx) {
    const files = Object.keys(ctx.bundle ?? {});
    const regular = files.find(
      (f) => f.startsWith("assets/Inter-Regular-") && f.endsWith(".woff2"),
    );
    if (!regular) return html;
    const tag = {
      tag: "link",
      attrs: {
        rel: "preload",
        href: `/${regular}`,
        as: "font",
        type: "font/woff2",
        crossorigin: "",
      },
      injectTo: "head-prepend" as const,
    };
    return { html, tags: [tag] };
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      __BUILD_VERSION__: JSON.stringify(buildVersion),
    },
    server: {
      host: true,
      proxy: {
        "/api": {
          target: env.VITE_PROXY_TARGET || "http://localhost:4000",
          changeOrigin: true,
        },
        "/socket.io": {
          target: env.VITE_PROXY_TARGET || "http://localhost:4000",
          ws: true,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: true,
      port: 4173,
      proxy: {
        "/api": {
          target: env.VITE_PROXY_TARGET || "http://localhost:4000",
          changeOrigin: true,
        },
        "/socket.io": {
          target: env.VITE_PROXY_TARGET || "http://localhost:4000",
          ws: true,
          changeOrigin: true,
        },
      },
    },
    base: "/",
    plugins: [
      tailwindcss(),
      react(),
      fontPreloadPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg"],
        workbox: {
          navigateFallbackDenylist: [/^\/api\//, /^\/socket\.io\//],
          globIgnores: [
            "**/*.mp3",
            "**/*.woff2",
            "**/assets/charts-*.js",
            "**/assets/framer-motion-*.js",
            "**/assets/realtime-*.js",
            "**/assets/socketService-*.js",
            "**/assets/PersistentLayout-*.js",
            "**/assets/AnalyticsTab-*.js",
            "**/assets/KpisTab-*.js",
            "**/assets/ReportsTab-*.js",
            "**/assets/RequestsTab-*.js",
            "**/assets/AccountingClosureTab-*.js",
            // Solo rutas post-login (store global ya no los importa en boot):
            // runtimeCaching StaleWhileRevalidate los trae bajo demanda.
            "**/assets/date-utils-*.js",
            "**/assets/dateUtils-*.js",
            "**/assets/formatters-*.js",
            // Validación zod de IndexedDB: solo se importa en writes de caché.
            "**/assets/validation-*.js",
            "**/assets/idbValidation-*.js",
          ],
          runtimeCaching: [
            {
              urlPattern: ({ request }) =>
                request.destination === "script" || request.destination === "style",
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "portal-assets-dynamic",
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 7,
                },
              },
            },
            {
              // Fuentes woff2 hasheadas (immutable): primer uso va a red,
              // luego 1 año en caché. Se excluyen del precache (globIgnores)
              // para no inflar la instalación del SW en ~350KB.
              urlPattern: ({ request }) => request.destination === "font",
              handler: "CacheFirst",
              options: {
                cacheName: "portal-fonts",
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        manifest: {
          name: "PORTAL - Enterprise Studio",
          short_name: "PORTAL",
          description: "Sistema de Gestión de Operaciones Industrial",
          theme_color: "#030305",
          background_color: "#030305",
          display: "standalone",
          icons: [
            {
              src: "favicon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          // Rolldown nativo (Vite 8): `advancedChunks` separa cada grupo
          // vendor en su propio chunk SIN absorber runtime compartido.
          // Con el legacy `manualChunks(id)` el runtime JSX compartido
          // caía dentro del chunk "charts" y el entry lo preloadeaba,
          // arrastrando chart.js (~100KB treeshaken) a la carga inicial
          // aunque solo se usa tras React.lazy (AttendanceChart).
          advancedChunks: {
            groups: [
              {
                name: "react-core",
                test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              },
              {
                name: "router",
                test: /[\\/]node_modules[\\/]react-router/,
              },
              {
                name: "devtools",
                test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query-devtools/,
              },
              {
                name: "state",
                test: /[\\/]node_modules[\\/](@tanstack[\\/]react-query|zustand)[\\/]/,
              },
              // Solo la lib de charting: la usa AttendanceChart tras
              // React.lazy, nunca debe ir en el preload del entry.
              {
                name: "charts",
                test: /[\\/]node_modules[\\/](chart\.js|react-chartjs-2)[\\/]/,
              },
              {
                name: "network",
                test: /[\\/]node_modules[\\/]axios[\\/]/,
              },
              {
                name: "realtime",
                test: /[\\/]node_modules[\\/]socket\.io-client[\\/]/,
              },
              {
                name: "date-utils",
                test: /[\\/]node_modules[\\/](date-fns|date-fns-tz)[\\/]/,
              },
              {
                name: "validation",
                test: /[\\/]node_modules[\\/]zod[\\/]/,
              },
              {
                name: "storage",
                test: /[\\/]node_modules[\\/]idb[\\/]/,
              },
              {
                name: "ids",
                test: /[\\/]node_modules[\\/](nanoid|ulid)[\\/]/,
              },
              {
                name: "vendor",
                test: /[\\/]node_modules[\\/]/,
              },
            ],
          },
        },
        // Tree shaking agresivo
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
        },
      },
    },
    test: {
      globals: true,
      projects: [
        {
          test: {
            name: "jsdom",
            environment: "jsdom",
            setupFiles: "./src/tests/setup.ts",
            include: ["src/**/*.{test,spec}.{ts,tsx}"],
            exclude: ["e2e/**", "node_modules/**", "dist/**", "src/tests/browser/**"],
          },
        },
        {
          test: {
            name: "browser",
            include: ["src/tests/browser/**/*.{test,spec}.{ts,tsx}"],
            exclude: ["e2e/**", "node_modules/**", "dist/**"],
            browser: {
              enabled: true,
              provider: playwright(),
              instances: [
                {
                  browser: "chromium",
                },
              ],
              headless: true,
            },
          },
        },
      ],
      // Ratchet de cobertura (spec 003 G-02, AC2). Baseline remedido
      // 2026-10-03 sobre `npm run test:coverage` con Vitest 5: 17.49%
      // líneas, 17.07% statements, 14.5% funciones, 14.46% ramas. Vitest 4+
      // usa remap AST exacto (antes v8-to-istanbul con falsos positivos que
      // inflaban funciones/ramas), asi que la baja vs el baseline 2026-10-02
      // es correccion de medicion, no perdida de cobertura. Umbrales con
      // margen anti-flakiness: solo pueden subir. Subir cobertura real va
      // por spec aparte (fuera de alcance de 003).
      // Spec 035 (2026-10-21): Suite MSW unificada, tests de invalidación
      // de caché, contratos de services y Vitest Browser Mode en Chromium
      // real -> medido y sostenido en 2 corridas consecutivas:
      // Run 1: 31.02% L, 24.99% F, 25.57% B, 30.84% S.
      // Run 2: 31.06% L, 25.08% F, 25.57% B, 30.89% S.
      // Umbrales fijados con margen anti-flakiness de ~1.5 - 2pts (AC6):
      // lines: 29, functions: 23, branches: 23, statements: 29 (antes 16/13/13/16).
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary"],
        include: ["src/**/*.{ts,tsx}"],
        exclude: [
          "node_modules",
          "dist",
          "e2e/**",
          "**/*.test.{ts,tsx}",
          "**/*.spec.{ts,tsx}",
          "src/tests/**",
        ],
        thresholds: {
          lines: 29,
          functions: 23,
          branches: 23,
          statements: 29,
        },
      },
    },
  };
});
