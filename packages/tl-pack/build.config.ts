import { defineBuildConfig } from 'obuild/config';

export default defineBuildConfig({
  entries: [
    {
      input: ['./src/index.ts', './src/stream.ts'],
      type: 'bundle',
      outDir: './dist',
      dts: {
        build: true,
        sourcemap: true,
      },
    },
  ],
});
