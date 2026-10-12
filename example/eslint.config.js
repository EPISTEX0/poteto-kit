import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import tseslint from 'typescript-eslint'
import { noComments } from './eslint-rules/no-comments.js'
import { storeStaysPrivate } from './eslint-rules/store-stays-private.js'
import { writerTakesData } from './eslint-rules/writer-takes-data.js'

const useEffectMessage =
  'useEffect and useLayoutEffect are banned. Effects hide data flow and cause stale-state bugs that agents cannot see. Derive state during render, update it in event handlers, use useSyncExternalStore for external stores, or a ref callback for DOM subscriptions.'

const globMessage =
  'import.meta.glob is only allowed in src/framework/discover.ts, and import.meta may not be aliased or destructured anywhere else. Globbing reads files by path and so bypasses the import rules. To add a feature, add a folder with a feature.tsx; to read notes, import from @/client.'

const featureInternalMessage =
  'Feature internals are private. Import another feature only through its index (@/features/<id>), use @/ aliases for shared code, and use ./ for files inside your own feature.'

const featureRegistryMessage =
  'Features are discovered from src/features/*/feature.tsx; nothing outside src/features imports a feature. Do not build a registry or hard-wire a feature here. To add a feature, add a folder with a feature.tsx (see AGENTS.md).'

const clientWriterMessage =
  "Durable notes state has one writer. Import commands and queries from '@/client' (commands live in src/client/commands.ts). To change state in a new way, add a command there instead of touching the store."

const frameworkMessage =
  'src/framework is a standalone package: it may import only itself and npm packages. It must not know about features, the client or app code. Receive what it needs through a Feature definition or props.'

const paths = [{ name: 'react', importNames: ['useEffect', 'useLayoutEffect'], message: useEffectMessage }]

const effectName = '/^use(Layout)?Effect$/'

const effectSyntax = [
  { selector: `MemberExpression[property.name=${effectName}]`, message: useEffectMessage },
  { selector: `MemberExpression[property.value=${effectName}]`, message: useEffectMessage },
  { selector: `ObjectPattern > Property[key.name=${effectName}]`, message: useEffectMessage },
  { selector: `ObjectPattern > Property[key.value=${effectName}]`, message: useEffectMessage },
]

const globSyntax = [
  {
    selector: 'MemberExpression[object.type="MetaProperty"]:not([computed=false][property.name=/^(env|url|dirname|filename|hot)$/])',
    message: globMessage,
  },
  { selector: ':not(MemberExpression) > MetaProperty[meta.name="import"]', message: globMessage },
]

const clientPatterns = [
  { group: ['@/client/*'], message: clientWriterMessage },
  { regex: '^\\.{1,2}/.*client/.+', message: clientWriterMessage },
]

const internalPatterns = [
  { group: ['@/features/*/*'], message: featureInternalMessage },
  { regex: '^\\.{1,2}/.*features/[^/]+/.+', message: featureInternalMessage },
]

const registryPatterns = [
  { group: ['@/features', '@/features/**'], message: featureRegistryMessage },
  { regex: '^\\.{1,2}/.*features(/|$)', message: featureRegistryMessage },
]

const frameworkPatterns = [{ regex: '^@/(?!framework(/|$))', message: frameworkMessage }]

export default defineConfig(
  globalIgnores(['dist', 'artifacts', 'node_modules', 'guardrail-fixtures']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    linterOptions: { noInlineConfig: true },
    plugins: {
      local: {
        rules: { 'no-comments': noComments, 'store-stays-private': storeStaysPrivate, 'writer-takes-data': writerTakesData },
      },
    },
    rules: {
      'local/no-comments': 'error',
      'no-restricted-imports': ['error', { paths, patterns: [...internalPatterns, ...clientPatterns] }],
      'no-restricted-syntax': ['error', ...effectSyntax, ...globSyntax],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { 'local/store-stays-private': 'error' },
  },
  {
    files: ['src/client/commands.ts'],
    rules: { 'local/writer-takes-data': 'error' },
  },
  {
    files: ['src/framework/discover.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...effectSyntax],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/features/**', 'src/client/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths, patterns: [...registryPatterns, ...clientPatterns] },
      ],
    },
  },
  {
    files: ['src/client/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths, patterns: registryPatterns }],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths,
          patterns: [
            ...internalPatterns,
            ...clientPatterns,
            { regex: '^\\.\\./', message: featureInternalMessage },
          ],
        },
      ],
    },
  },
  {
    files: ['src/framework/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths, patterns: [...frameworkPatterns, ...registryPatterns, { regex: '^\\.\\./', message: frameworkMessage }] },
      ],
    },
  },
  {
    files: ['.dependency-cruiser.cjs'],
    languageOptions: { globals: { module: 'readonly' } },
  },
)
