import js from "@eslint/js";
import typescript from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

/**
 * Selectores de `no-restricted-syntax` compartidos entre el bloque general y
 * el bloque de `*.view.tsx` (flat config: el bloque posterior **reemplaza**
 * la lista de la regla, no la fusiona).
 */
const DATE_RESTRICTED_SYNTAX = [
  {
    selector:
      "CallExpression[callee.property.name='split'][callee.object.type='CallExpression'][callee.object.callee.property.name='toISOString']",
    message:
      "Evita toISOString().split('T')[0] para fechas de negocio. Usa utilidades de src/utils/dateUtils.ts.",
  },
  {
    selector: "NewExpression[callee.name='Date'] > BinaryExpression > Literal[value='T00:00:00']",
    message: "Evita new Date(... + 'T00:00:00'). Usa parseDateOnlyUTC/toBusinessDateChile según el caso.",
  },
  {
    selector: "NewExpression[callee.name='Date'] > Literal[value=/^\\d{4}-\\d{2}-\\d{2}$/]",
    message: "Evita new Date('YYYY-MM-DD'). Usa timePolicy/BusinessDate helpers.",
  },
  {
    selector: "BinaryExpression[right.value='T00:00:00Z']",
    message: "Evita concatenar 'T00:00:00Z'. Usa parseBusinessDateCL.",
  },
];

/**
 * Spec 033 AC1: una vista (`*.view.tsx`) es **presentacional puro**.
 *
 * La prohibición **no es una lista cerrada** de hooks: cualquier llamada
 * `useXxx(...)` (de React o de dominio) y cualquier import de hook quedan
 * fuera de una vista. El estado, los efectos y la orquestación viven en el
 * `*.container.tsx` o en un hook de dominio del feature.
 */
const VIEW_HOOK_RESTRICTED_SYNTAX = [
  {
    selector: "CallExpression[callee.type='Identifier'][callee.name=/^use[A-Z]/]",
    message:
      "No llames hooks en *.view.tsx: una vista es presentacional puro. Mueve el estado/efecto al container o a un hook de dominio.",
  },
  {
    selector:
      "CallExpression[callee.type='MemberExpression'][callee.object.name='React'][callee.property.name=/^use[A-Z]/]",
    message:
      "No llames React.useXxx en *.view.tsx: una vista es presentacional puro. Mueve el estado/efecto al container o a un hook de dominio.",
  },
  {
    selector: "CallExpression[callee.type='Identifier'][callee.name='use']",
    message: "No uses el hook `use` de React 19 en *.view.tsx: una vista es presentacional puro.",
  },
  {
    selector: "ImportDeclaration[source.value='react'] > ImportSpecifier[imported.name=/^use[A-Z]/]",
    message:
      "No importes hooks de React en *.view.tsx: recibe el estado por props desde el container.",
  },
  {
    selector: "ImportDeclaration[source.value='react'] > ImportSpecifier[imported.name='use']",
    message:
      "No importes el hook `use` de React 19 en *.view.tsx: recibe el estado por props desde el container.",
  },
];

/** Red de seguridad: referencias sueltas (no llamadas) a identificadores de hook de React. */
const VIEW_HOOK_RESTRICTED_GLOBALS = [
  "useState",
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useMemo",
  "useCallback",
  "useRef",
  "useReducer",
  "useContext",
  "useId",
  "useSyncExternalStore",
  "useTransition",
  "useDeferredValue",
  "useImperativeHandle",
  "useOptimistic",
  "useActionState",
].map((name) => ({
  name,
  message: `No uses \`${name}\` en *.view.tsx: una vista es presentacional puro.`,
}));

/**
 * Spec 033 AC1/AC4: un container orquesta, no presenta.
 *
 * Puede devolver **otros containers como props** (composición), pero no
 * puede emitir elementos DOM intrínsecos (`<div>`, `<span>`, ...): la
 * estructura visual pertenece a la vista. El invariante de "un único
 * elemento JSX de primer nivel en el return" lo verifica el guardrail
 * `viewPurityGuardrails.test.ts` (análisis AST, budget 0).
 */
const CONTAINER_RESTRICTED_SYNTAX = [
  {
    selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^[a-z]/]",
    message:
      "Un *.container.tsx no emite JSX de presentación (elementos DOM intrínsecos). Devuelve la vista o components como props.",
  },
  {
    selector: "JSXOpeningElement[name.type='JSXMemberExpression']",
    message:
      "Un *.container.tsx no emite JSX de presentación. Devuelve la vista o components como props.",
  },
];

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
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      "no-undef": "off",
      // La regla base no entiende las sobrecargas de TypeScript (las marca
      // como redeclaracion); el compilador reporta las redeclaraciones reales
      // (TS2451). Guide oficial de typescript-eslint:
      // https://typescript-eslint.io/rules/no-redeclare/
      "no-redeclare": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Spec 031 Fase A / AC1: sandbox mínimo de accesibilidad. Subset core,
      // extensión progresiva solo con budget 0/0 intacto.
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/interactive-supports-focus": "error",
      "jsx-a11y/no-noninteractive-tabindex": "error",
      "no-restricted-syntax": ["warn", ...DATE_RESTRICTED_SYNTAX],
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
      // Spec 033 AC1: sin hooks en la vista. La lista de `no-restricted-syntax`
      // **reemplaza** la del bloque general (flat config), así que se compone
      // explicitamente con los selectores de fecha.
      "no-restricted-syntax": ["error", ...DATE_RESTRICTED_SYNTAX, ...VIEW_HOOK_RESTRICTED_SYNTAX],
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
        ...VIEW_HOOK_RESTRICTED_GLOBALS,
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
  {
    // Spec 033 AC1/AC4: el container orquesta, la vista presenta.
    files: ["src/**/*.container.tsx"],
    rules: {
      "no-restricted-syntax": ["error", ...CONTAINER_RESTRICTED_SYNTAX],
    },
  },
];
