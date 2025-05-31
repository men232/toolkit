import { describe, expect, it } from 'vitest';
import { base64, base64url } from './';

const original = new Uint8Array(256);

for (let idx = 0; idx < original.length; idx++) {
  original[idx] = idx % 256;
}

function doTest(api: any) {
  const encoded = api.encode(original);
  const decoded = api.decode(encoded);

  return { encoded, decoded, original };
}

describe('base64', () => {
  it('should handle all byte values', () => {
    const { decoded, encoded, original } = doTest(base64);
    expect(decoded).toEqual(original);
  });
});

describe('base64Url', () => {
  it('should handle all byte values', () => {
    const { decoded, encoded, original } = doTest(base64url);
    expect(decoded).toEqual(original);
  });
});
