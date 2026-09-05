import { defineBuildConfig } from 'obuild/config';
import Vue from 'unplugin-vue/rollup';

export default defineBuildConfig({
  entries: [
    {
      input: ['./src/index.ts', './src/vrun.ts'],
      type: 'bundle',
      outDir: './dist',
      rolldown: {
        plugins: [Vue()],
      },
      dts: {
        build: true,
        sourcemap: true,
      },
    },
  ],
});
