module.exports = {
  forbidden: [
    {
      name: 'main-must-not-import-renderer',
      severity: 'error',
      comment: 'electron/main and electron/renderer are separate processes and must not import each other. Share contracts and types through src/shared/ipc.ts.',
      from: { path: '^src/electron/main/' },
      to: { path: '^src/electron/renderer/' },
    },
    {
      name: 'renderer-must-not-import-main',
      severity: 'error',
      comment: 'electron/main and electron/renderer are separate processes and must not import each other. Share contracts and types through src/shared/ipc.ts.',
      from: { path: '^src/electron/renderer/' },
      to: { path: '^src/electron/main/' },
    },
    {
      name: 'no-cross-feature-internals',
      severity: 'error',
      comment: 'A feature may import another feature only through its index file (src/features/<id>/index.ts), never its internals.',
      from: { path: '^src/features/([^/]+)/' },
      to: {
        path: '^src/features/[^/]+/',
        pathNot: ['^src/features/$1/', '^src/features/[^/]+/index\\.tsx?$'],
      },
    },
    {
      name: 'no-feature-registry',
      severity: 'error',
      comment: 'Features are discovered from src/features/*/feature.tsx; nothing outside src/features imports a feature. Do not build a registry or hard-wire a feature. To add a feature, add a folder with a feature.tsx.',
      from: { path: '^src/', pathNot: '^src/features/' },
      to: { path: '^src/features/' },
    },
    {
      name: 'one-writer-notes-store',
      severity: 'error',
      comment: "Durable notes state has one writer. Import commands and queries from '@/client' (commands live in src/client/commands.ts); add a command there instead of touching the store.",
      from: { path: '^src/', pathNot: '^src/client/' },
      to: { path: '^src/client/', pathNot: '^src/client/index\\.ts$' },
    },
    {
      name: 'framework-is-a-package',
      severity: 'error',
      comment: 'src/framework is a standalone package: it may import only itself and npm packages, never src/features, src/client or app code. Receive what it needs through a Feature definition or props.',
      from: { path: '^src/framework/' },
      to: { path: '^src/', pathNot: '^src/framework/' },
    },
    {
      name: 'shared-is-a-leaf',
      severity: 'error',
      comment: 'src/shared must stay a leaf: it must not import src/features, src/client, src/framework or src/electron. Move the shared piece down into src/shared instead of importing up.',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|client|framework|electron)/' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular imports hide the real dependency direction. Move the shared piece into a lower module that both sides import.',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
}
