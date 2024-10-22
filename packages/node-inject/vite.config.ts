import { node } from '@liuli-util/vite-plugin-node';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    node(),
    dts({
      tsconfigPath: './tsconfig.build.json',
    }),
  ],
  build: {
    target: 'node18',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'andrewl-toolkit-core',
      fileName: 'index',
      formats: ['es'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
