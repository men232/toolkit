import type { Options } from 'tsup';
import VueJSX from 'unplugin-vue-jsx/esbuild';
import p from './package.json';

export const tsup: Options = {
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  outExtension({ format }) {
    const extension = format === 'esm' ? '.mjs' : '.js';
    return {
      js: extension,
    };
  },
  esbuildPlugins: [VueJSX({})],
  splitting: true,
  external: [...Object.keys(p.dependencies), ...Object.keys(p.devDependencies)],
  clean: true,
  shims: false,
};
