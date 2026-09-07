import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default [
  {
    ignores: ["**/coverage/**", "**/dist/**", "**/_*", "eslint.config.mjs"],
  },
  js.configs.recommended,
  importPlugin.flatConfigs.recommended,
  ...tseslint.configs["flat/recommended"],
  importPlugin.flatConfigs.typescript,
  {
    files: ["**/*.{ts,cts,mts,js}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { args: "after-used" }],
      "@typescript-eslint/prefer-rest-params": "off",
      "@typescript-eslint/method-signature-style": ["error", "property"],
      complexity: ["warn", { max: 20 }],
    },
  },
  {
    files: ["test/**", "**/*.spec.ts", "**/*.test.ts", "**/*.int.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
