import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const ignores = {
  ignores: [
    'dist/**',
    'node_modules/**',
    'coverage/**',
    '.codex/**',
    '.claude/**',
    '.kanbn/**',
    '.prompt/**',
    '.vscode/**',
    '.worktrees/**',
    '.zenflow/**',
    'e2e/**',
    'playwright-report/**',
    'test-results/**',
    'scripts/**',
    '*.config.js',
    '*.config.ts',
  ],
};

export default [
  ignores,
  ...tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
  },
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      // Template literals with numbers are valid JavaScript
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Allow non-null assertions when array access is known to be safe
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Allow async functions without await (useful for interface compliance)
      '@typescript-eslint/require-await': 'off',
      // Allow empty functions (useful for no-op handlers)
      '@typescript-eslint/no-empty-function': 'off',
      // Deprecated API usage should be a warning, not error
      '@typescript-eslint/no-deprecated': 'warn',
      // Allow unsafe any operations with explicit type assertions
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      // Prefer nullish coalescing but don't enforce
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      // Allow misused promises in some contexts (event handlers)
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      // Unnecessary conditions can happen with type narrowing
      '@typescript-eslint/no-unnecessary-condition': 'warn',

      // React-style callbacks often return void and are safe shorthand
      '@typescript-eslint/no-confusing-void-expression': 'off',

      // Keep strict + stylistic rules as warnings until the codebase is aligned
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-dynamic-delete': 'warn',
      '@typescript-eslint/prefer-optional-chain': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/no-unnecessary-type-conversion': 'warn',
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/non-nullable-type-assertion-style': 'warn',
      '@typescript-eslint/consistent-type-definitions': 'warn',
      '@typescript-eslint/prefer-regexp-exec': 'warn',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'warn',
      '@typescript-eslint/no-invalid-void-type': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/consistent-generic-constructors': 'warn',

      // Too strict for this codebase right now; keep hooks lint to the recommended rules
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  ),
];
