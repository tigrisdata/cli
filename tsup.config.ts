import { defineConfig } from 'tsup';
import { join } from 'path';

export default defineConfig((options) => ({
  entry: ['src/cli.ts', 'src/**/*.ts'],
  format: ['esm'],
  dts: false,
  splitting: true,
  sourcemap: false,
  clean: true,
  minify: true,
  esbuildOptions(buildOptions) {
    buildOptions.loader = {
      ...(buildOptions.loader ?? {}),
      '.yaml': 'text',
    };
  },
}));
