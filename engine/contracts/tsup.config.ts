import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: {
      'index': 'src/index.ts',
      'sync/index': 'src/sync/index.ts',
      'shared/index': 'src/shared/index.ts',
    },
    format: ['esm'],
    outDir: 'dist/esm',
    dts: true,
    clean: true,
    external: ['zod'],
  },
  {
    entry: {
      'index': 'src/index.ts',
      'sync/index': 'src/sync/index.ts',
      'shared/index': 'src/shared/index.ts',
    },
    format: ['cjs'],
    outDir: 'dist/cjs',
    clean: false,
    external: ['zod'],
  },
]);
