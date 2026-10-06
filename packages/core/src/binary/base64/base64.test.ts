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

describe('base64 behaviour', () => {
  const bytes = (s: string) => new TextEncoder().encode(s);

  it('matches RFC 4648 vectors', () => {
    const vectors: [string, string][] = [
      ['', ''],
      ['f', 'Zg=='],
      ['fo', 'Zm8='],
      ['foo', 'Zm9v'],
      ['foob', 'Zm9vYg=='],
      ['fooba', 'Zm9vYmE='],
      ['foobar', 'Zm9vYmFy'],
    ];

    for (const [plain, encoded] of vectors) {
      expect(base64.encode(bytes(plain))).toBe(encoded);
      expect(base64.decode(encoded)).toEqual(bytes(plain));
    }
  });

  it('supports encoding and decoding without padding', () => {
    expect(base64.encode(bytes('fo'), { includePadding: false })).toBe('Zm8');
    expect(base64.decode('Zm8', { strict: false })).toEqual(bytes('fo'));
    expect(() => base64.decode('Zm8')).toThrow('Invalid Base64 data');
  });

  it('rejects invalid characters and stops at padding', () => {
    expect(() => base64.decode('Zm$v')).toThrow('Invalid Base64 character: $');
    expect(base64.decode('Zg==Zm9v', { strict: false })).toEqual(bytes('f'));
  });

  it('matches Buffer on random data for both alphabets', () => {
    for (let n = 0; n < 300; n++) {
      const data = Uint8Array.from(
        { length: n % 100 },
        () => (Math.random() * 256) | 0,
      );
      const std = Buffer.from(data).toString('base64');
      const url = Buffer.from(data).toString('base64url');

      expect(base64.encode(data)).toBe(std);
      expect(base64.decode(std)).toEqual(data);
      expect(base64url.encode(data, { includePadding: false })).toBe(url);
      expect(base64url.decode(url, { strict: false })).toEqual(data);
    }
  });
});
