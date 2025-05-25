import eslint from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-plugin-prettier";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    env: {
      browser: true,
      es2024: true,
      node: true,
    },
    files: ["**/*.{js,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      prettier: prettier,
      import: importPlugin,
    },
    rules: {
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "*",
          next: "return",
        },
        {
          blankLine: "always",
          prev: "*",
          next: "throw",
        },
        {
          blankLine: "always",
          prev: "multiline-block-like",
          next: "*",
        },
      ],
      curly: ["error", "all"],
      "prettier/prettier": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        {
          prefer: "type-imports",
          disallowTypeAnnotations: false,
          fixStyle: "separate-type-imports",
        },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "import/order": [
        "error",
        {
          groups: ["external", "internal"],
          pathGroups: [
            {
              pattern: "../../../**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "../../**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "../**",
              group: "internal",
              position: "before",
            },
            {
              pattern: "./**",
              group: "internal",
              position: "after",
            },
          ],
          pathGroupsExcludedImportTypes: ["external"],
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
