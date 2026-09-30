import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y-x';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'dist/',
    '.astro/',
    'node_modules/',
    'coverage/',
    'playwright-report/',
    'test-results/',
    'docs/design/',
    // Agent worktrees (Claude Code): separate checkouts with their own tsconfig.
    '.claude/worktrees/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        // Build-time constants injected by astro.config.ts (see src/env.d.ts).
        __BUILD_COMMIT__: 'readonly',
        __SITE_ENV__: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Since Astro 6, import.meta.env values are inlined into the build output, so a secret
      // read this way would end up in dist/. Only PUBLIC_* and Astro's built-ins are allowed.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.type='MemberExpression'][object.object.type='MetaProperty'][object.property.name='env'][property.name!=/^(PUBLIC_[A-Z0-9_]+|MODE|DEV|PROD|SSR|BASE_URL|SITE|ASSETS_PREFIX)$/]",
          message:
            'Read server settings through src/server/env.ts, not import.meta.env (it is inlined at build time).',
        },
      ],
      // All server settings go through the validated env module.
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Use serverEnv() from src/server/env.ts.',
        },
      ],
    },
  },
  {
    // The only places that may read process.env directly.
    files: [
      'src/server/env.ts',
      'scripts/lib/env.ts',
      'astro.config.ts',
      'playwright.config.ts',
      'server.mjs',
      'tests/**',
    ],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    extends: [jsxA11y.configs.recommended, reactHooks.configs.flat.recommended],
  },
);
