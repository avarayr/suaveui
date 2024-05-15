
/** @type {import('eslint').Linter.Config} */
module.exports = {
  $schema: "https://json.schemastore.org/eslintrc",
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
  ],
  ignorePatterns: ["dist", "dev-dist", ".eslintrc.cjs", "vite.config.ts", "tailwind.config.ts", "postcss.config.cjs"],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json', './packages/*/tsconfig.json'],
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: { version: "detect" },
  },
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh"],
  rules: {
    // "@typescript-eslint/naming-convention": "error",
    // only enforce for object properties
    // The `@typescript-eslint/naming-convention` rule allows `leadingUnderscore` and `trailingUnderscore` settings. However, the existing `no-underscore-dangle` rule already takes care of this.
    '@typescript-eslint/naming-convention': [
      'error',
      // Allow camelCase variables (23.2), PascalCase variables (23.8), and UPPER_CASE variables (23.10)
      {
        selector: 'variable',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
      },
      // Allow camelCase functions, and PascalCase functions
      {
        selector: 'function',
        format: ['camelCase', 'PascalCase'],
      },
      // anything "type like", including interfaces, type aliases, and enums
      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      // only camelCase for object methods
      {
        selector: 'objectLiteralMethod',
        format: ['camelCase'],
      }
    ],
    "react-refresh/only-export-components": "off",
    // warn about unused vars
    "@typescript-eslint/no-unused-vars": [
      "off",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "react/prop-types": "off",
    "react/display-name": "off",
  },
}

