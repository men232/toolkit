import { describe, expect, it } from 'vitest';
import { base62 } from './'; // Adjust import path as needed

const original = new Uint8Array(256);

for (let idx = 0; idx < original.length; idx++) {
  original[idx] = idx % 256;
}

function doTest(api: any) {
  const encoded = api.encode(original);
  const decoded = api.decode(encoded);

  return { encoded, decoded, original };
}

describe('base62', () => {
  it('should handle all byte values', () => {
    const { decoded, encoded, original } = doTest(base62);
    expect(decoded).toEqual(original);
  });
});
