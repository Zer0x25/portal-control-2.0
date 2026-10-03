import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
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
      react(),
      {
        name: "inline-css",
        enforce: "post",
        apply: "build",
        transformIndexHtml(html: string, ctx: any) {
          if (!ctx.bundle) return html;

          let newHtml = html;
          // Find all CSS assets
          for (const [, value] of Object.entries(ctx.bundle)) {
            const chunk = value as any;
            if (
              chunk.fileName.endsWith(".css") &&
              chunk.type === "asset" &&
              typeof chunk.source === "string"
            ) {
              const cssTag = `<style>${chunk.source}</style>`;
              // Handle both absolute and relative path injections by Vite
              // Vite might inject /assets/file.css or assets/file.css
              const cssPathMatcher = new RegExp(
                `<link[^>]+href=["'].*${chunk.fileName}["'][^>]*>`,
                "g",
              );

              if (cssPathMatcher.test(newHtml)) {
                newHtml = newHtml.replace(cssPathMatcher, cssTag);
                // Remove the asset from the bundle so it doesn't get emitted as a separate file
                // delete ctx.bundle[chunk.fileName]; // Optional: keeping it is safer for debugging, but deleting it saves space.
                // Let's keep it for now to avoid side effects with PWA manifest generation potentially looking for it.
              }
            }
          }
          return newHtml;
        },
      },
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
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;

            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/scheduler/")
            ) {
              return "react-core";
            }
            if (
              id.includes("node_modules/react-router") ||
              id.includes("node_modules/react-router-dom")
            ) {
              return "router";
            }
            // Animaciones
            if (id.includes("node_modules/framer-motion")) {
              return "framer-motion";
            }
            // Estado y data fetching
            if (id.includes("node_modules/@tanstack") || id.includes("node_modules/zustand")) {
              return "state";
            }
            // Generación de PDFs
            if (id.includes("node_modules/jspdf")) {
              return "pdf";
            }
            // Charting
            if (
              id.includes("node_modules/chart.js") ||
              id.includes("node_modules/react-chartjs-2")
            ) {
              return "charts";
            }
            // Networking / realtime
            if (id.includes("node_modules/axios")) {
              return "network";
            }
            if (id.includes("node_modules/socket.io-client")) {
              return "realtime";
            }
            // Date utilities
            if (id.includes("node_modules/date-fns") || id.includes("node_modules/date-fns-tz")) {
              return "date-utils";
            }
            // Validation / ids / local db
            if (id.includes("node_modules/zod")) {
              return "validation";
            }
            if (id.includes("node_modules/idb")) {
              return "storage";
            }
            if (id.includes("node_modules/nanoid") || id.includes("node_modules/ulid")) {
              return "ids";
            }
            return "vendor";
          },
        },
        // Tree shaking agresivo
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/tests/setup.ts",
      include: ["src/**/*.{test,spec}.{ts,tsx}"],
      exclude: ["e2e/**", "node_modules/**", "dist/**"],
      // Ratchet de cobertura (spec 003 G-02, AC2). Baseline remedido
      // 2026-10-03 sobre `npm run test:coverage` con Vitest 5: 17.49%
      // líneas, 17.07% statements, 14.5% funciones, 14.46% ramas. Vitest 4+
      // usa remap AST exacto (antes v8-to-istanbul con falsos positivos que
      // inflaban funciones/ramas), asi que la baja vs el baseline 2026-10-02
      // es correccion de medicion, no perdida de cobertura. Umbrales con
      // margen anti-flakiness: solo pueden subir. Subir cobertura real va
      // por spec aparte (fuera de alcance de 003).
      // Spec 004 fase 2 (2026-10-03): +11 tests en dateUtils.test.ts
      // (helpers puros) -> 17.83% L, 14.73% F, 14.61% B, 17.42% S.
      // Ratchet 15/12/12/15 -> 16/13/13/15 (statements queda en 15:
      // 17.42 no da 2pts de margen para 16).
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
          lines: 16,
          functions: 13,
          branches: 13,
          statements: 15,
        },
      },
    },
  };
});
