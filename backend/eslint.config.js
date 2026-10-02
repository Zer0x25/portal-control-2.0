const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const prettierPlugin = require("eslint-plugin-prettier");
const prettierConfig = require("eslint-config-prettier");
const globals = require("globals");

module.exports = [
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": ["error", { endOfLine: "auto" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "warn",
        {
          selector:
            "CallExpression[callee.property.name='split'][callee.object.type='CallExpression'][callee.object.callee.property.name='toISOString']",
          message:
            "Evita toISOString().split('T')[0] para fechas de negocio. Usa timeUtils.toBusinessDateChile().",
        },
        {
          selector:
            "NewExpression[callee.name='Date'] > BinaryExpression > Literal[value='T00:00:00']",
          message:
            "Evita new Date(... + 'T00:00:00'). Usa helpers explícitos de timeUtils para parsing de business dates.",
        },
        {
          selector:
            "NewExpression[callee.name='Date'][arguments.0.type='Literal'][arguments.0.value=/^\\\\d{4}-\\\\d{2}-\\\\d{2}$/]",
          message:
            "Evita new Date('YYYY-MM-DD'). Usa timePolicy.parseBusinessDateCL o timeUtils.parseBusinessDateChile.",
        },
        {
          selector: "BinaryExpression[right.value='T00:00:00Z']",
          message: "Evita concatenar 'T00:00:00Z'. Usa timePolicy.parseBusinessDateCL.",
        },
      ],
    },
  },
];
