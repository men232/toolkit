import { describe, expect, it } from 'vitest';
import { base64ToBytes } from './base64ToBytes';

describe('base64ToBytes', () => {
  it('decodes a standard base64 string to bytes', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input, { encoding: 'base64' });
    expect(result).toEqual(expectedOutput);
  });

  it('decodes a base64url string to bytes', () => {
    const input = 'SGVsbG8td29ybGQ'; // "Hello-world" in base64url
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 45, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input, { encoding: 'base64url' });
    expect(result).toEqual(expectedOutput);
  });

  it('uses default options (base64, strict=true)', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input);
    expect(result).toEqual(expectedOutput);
  });

  it('throws an error for invalid encoding', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    expect(() => base64ToBytes(input, { encoding: 'invalid' as any })).toThrow(
      'Invalid encoding options: invalid',
    );
  });

  it('handles invalid base64 input in strict mode', () => {
    const input = 'SGVsbG8gd29ybGQ'; // Missing padding
    expect(() =>
      base64ToBytes(input, { encoding: 'base64', strict: true }),
    ).toThrow();
  });

  it('handles invalid base64 input in non-strict mode', () => {
    const input = 'SGVsbG8gd29ybGQ'; // Missing padding
    expect(() => {
      const result = base64ToBytes(input, {
        encoding: 'base64',
        strict: false,
      });
      expect(result).toBeInstanceOf(Uint8Array);
    }).not.toThrow();
  });

  it('handles invalid base64url input', () => {
    const input = 'Invalid!URL+Base64';
    expect(() => base64ToBytes(input, { encoding: 'base64url' })).toThrow();
  });
});
