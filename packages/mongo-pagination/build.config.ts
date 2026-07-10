import { defineBuildConfig } from 'obuild/config';

export default defineBuildConfig({
  entries: [
    {
      input: ['./src/index.ts', './src/mongoose-7.ts', './src/mongoose-8.ts'],
      type: 'bundle',
      outDir: './dist',
      dts: {
        build: true,
        sourcemap: true,
      },
    },
  ],
});
