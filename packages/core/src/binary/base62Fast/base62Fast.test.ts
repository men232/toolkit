import { describe, expect, it } from 'vitest';
import { base62Fast } from './'; // Adjust import path as needed

const original = new Uint8Array(256);

for (let idx = 0; idx < original.length; idx++) {
  original[idx] = idx % 256;
}

function doTest(api: any) {
  const encoded = api.encode(original);
  const decoded = api.decode(encoded);

  return { encoded, decoded, original };
}

function doPerformanceTest(api: any) {
  const start = performance.now();
  for (let idx = 0; idx < 1000; idx++) {
    doTest(api);
  }

  return performance.now() - start;
}

describe('base62Fast', () => {
  it('should handle all byte values', () => {
    const { decoded, encoded, original } = doTest(base62Fast);
    // console.log({ encoded });
    expect(decoded).toEqual(original);
  });

  if (process.env.SKIP_PERFORMANCE_TEST !== 'true') {
    it('performance test', () => {
      const result = doPerformanceTest(base62Fast);
      console.info(`Encode/Decode took ${result} ms`);
      expect(result).toBeLessThan(6);
    });
  }
});
