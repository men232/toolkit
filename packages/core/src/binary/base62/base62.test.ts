import { describe, expect, it } from 'vitest';
import { base62 } from './'; // Adjust import path as needed

const original = new Uint8Array(256);

for (let idx = 0; idx < 256; idx++) {
  original[idx] = idx;
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

describe('base62', () => {
  it('should handle all byte values', () => {
    const { decoded, encoded, original } = doTest(base62);
    expect(decoded).toEqual(original);
  });

  it('performance test', () => {
    const result = doPerformanceTest(base62);
    console.info(`Encode/Decode took ${result} ms`);
    expect(result).toBeLessThan(6);
  });
});
