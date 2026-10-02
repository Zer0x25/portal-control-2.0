import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
        IDBKeyRange: "readonly",
        IDBCursorDirection: "readonly",
        IDBTransactionMode: "readonly",
        IDBValidKey: "readonly",
        IDBVersionChangeEvent: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": typescript,
      prettier: prettier,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      "no-undef": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.type='CallExpression'][callee.object.callee.property.name='toISOString']",
          message:
            "Evita toISOString().split('T')[0] para fechas de negocio. Usa utilidades de src/utils/dateUtils.ts.",
        },
        {
          selector:
            "NewExpression[callee.name='Date'] > BinaryExpression > Literal[value='T00:00:00']",
          message:
            "Evita new Date(... + 'T00:00:00'). Usa parseDateOnlyUTC/toBusinessDateChile según el caso.",
        },
        {
          selector: "NewExpression[callee.name='Date'] > Literal[value=/^\\d{4}-\\d{2}-\\d{2}$/]",
          message: "Evita new Date('YYYY-MM-DD'). Usa timePolicy/BusinessDate helpers.",
        },
        {
          selector: "BinaryExpression[right.value='T00:00:00Z']",
          message: "Evita concatenar 'T00:00:00Z'. Usa parseBusinessDateCL.",
        },
      ],
    },
  },
  {
    // Test doubles are intentionally loosely typed: mocking partial API payloads and
    // module returns is not a production type-safety concern. Production `src` code
    // still forbids explicit `any`.
    // NOTE: this block must stay AFTER the main `src/**/*.{ts,tsx}` block so the
    // override wins (flat config: later matching blocks take precedence).
    files: ["src/**/*.{test,spec}.{ts,tsx}", "src/tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // The logger is the single sanctioned boundary where console output happens.
    files: ["src/utils/logger.ts"],
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["src/**/*.view.tsx"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["**/services/**"],
              message: "No importes servicios en *.view.tsx. Mueve la lógica a un controller/hook.",
            },
            {
              group: ["**/store/**"],
              message:
                "No importes store global en *.view.tsx. Pasa estado/acciones por props desde container.",
            },
            {
              group: ["react-router-dom"],
              message:
                "No uses routing hooks/components en *.view.tsx salvo casos justificados en container.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "warn",
        {
          name: "fetch",
          message: "No uses fetch en *.view.tsx. Mueve llamadas de red a hooks/controllers.",
        },
        {
          name: "localStorage",
          message: "No uses localStorage en *.view.tsx. Mueve side effects a hooks/controllers.",
        },
        {
          name: "sessionStorage",
          message: "No uses sessionStorage en *.view.tsx. Mueve side effects a hooks/controllers.",
        },
      ],
      "no-restricted-properties": [
        "warn",
        {
          object: "window",
          property: "location",
          message:
            "No uses window.location en *.view.tsx. Mueve navegación/descargas a hooks/controllers.",
        },
      ],
    },
  },
];
