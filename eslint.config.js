/**
 * ESLint flat config: type-checked TypeScript rules, React hooks rules and the
 * import-rules decision from docs/architecture.html, enforced with no-restricted-imports.
 * Flat config replaces a rule's options per matching block, so each folder block
 * carries its full list of restrictions.
 */
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Libraries owned by one folder each: Dexie (storage), React Flow (canvas), Zustand and
 * zundo (store), Zod (export).
 */
const ownedLibraries = {
  dexie: { name: 'dexie', message: 'Only src/shared/storage/ may use Dexie.' },
  reactFlow: { name: '@xyflow/react', message: 'Only src/features/canvas/ may use React Flow.' },
  zustand: { name: 'zustand', message: 'Only src/shared/store/ may use Zustand.' },
  zundo: { name: 'zundo', message: 'Only src/shared/store/ may use zundo.' },
  zod: { name: 'zod', message: 'Only src/features/export/ may use Zod.' },
};

const deepFeatureImport = {
  group: ['@/features/*/*'],
  message: "Use another feature only through its index.ts (import from '@/features/<name>').",
};

const sharedImportsUp = [
  {
    group: ['@/features', '@/features/*', '**/features/**'],
    message: 'shared/ never imports features/.',
  },
  { group: ['@/app', '@/app/*', '**/app/**'], message: 'shared/ never imports app/.' },
];

const featureImportsUp = [
  { group: ['@/app', '@/app/*'], message: 'A feature never imports app/.' },
  {
    regex: String.raw`^\.\./`,
    message: "Leave a feature with the '@/' alias, never a relative '../' path.",
  },
];

/** Builds the no-restricted-imports rule for a folder from the libraries it may not use. */
function restrict(libraries, patterns) {
  return ['error', { paths: libraries, patterns: [deepFeatureImport, ...patterns] }];
}

const { dexie, reactFlow, zustand, zundo, zod } = ownedLibraries;

export default tseslint.config(
  {
    ignores: ['dist', 'docs', 'coverage', 'playwright-report', 'test-results', 'blob-report'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.{js,ts,mjs}', 'scripts/**', 'tests/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{js,mjs}'],
    ...tseslint.configs.disableTypeChecked,
  },
  // import-rules: base restrictions for every source file.
  {
    files: ['src/**'],
    rules: { 'no-restricted-imports': restrict([dexie, reactFlow, zustand, zundo, zod], []) },
  },
  {
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': restrict([dexie, reactFlow, zustand, zundo, zod], sharedImportsUp),
    },
  },
  {
    files: ['src/features/**'],
    rules: {
      'no-restricted-imports': restrict([dexie, reactFlow, zustand, zundo, zod], featureImportsUp),
    },
  },
  // The owning folders re-allow their library.
  {
    files: ['src/shared/storage/**'],
    rules: { 'no-restricted-imports': restrict([reactFlow, zustand, zundo, zod], sharedImportsUp) },
  },
  {
    files: ['src/shared/store/**'],
    rules: { 'no-restricted-imports': restrict([dexie, reactFlow, zod], sharedImportsUp) },
  },
  {
    files: ['src/features/canvas/**'],
    rules: { 'no-restricted-imports': restrict([dexie, zustand, zundo, zod], featureImportsUp) },
  },
  {
    files: ['src/features/export/**'],
    rules: {
      'no-restricted-imports': restrict([dexie, reactFlow, zustand, zundo], featureImportsUp),
    },
  },
  prettier,
);
