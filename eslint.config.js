// ESLint "flat config": TypeScript rules + a few rules that keep the code functional.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      "prefer-const": "error", // never reassign when you don't need to
      "no-var": "error",
      "no-param-reassign": ["error", { props: true }], // never mutate arguments
      "prefer-arrow-callback": "error",
      eqeqeq: "error",
    },
  },
);
