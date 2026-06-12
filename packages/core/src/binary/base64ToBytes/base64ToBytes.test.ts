import { describe, expect, it } from 'vitest';
import { base64ToBytes } from './base64ToBytes';

describe('base64ToBytes', () => {
  it('decodes a base64 string to bytes', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input, { encoding: 'base64' });
    expect(result).toEqual(expectedOutput);
  });

  it('decodes a base64 string to bytes (native=false)', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input, { encoding: 'base64', native: false });
    expect(result).toEqual(expectedOutput);
  });

  it('decodes a base64 string to bytes (strict=unset)', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input);
    expect(result).toEqual(expectedOutput);
  });

  it('decodes a base64 string to bytes (strict=unset, native=false)', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input, { native: false });
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

  it('decodes a base64url string to bytes (native=false)', () => {
    const input = 'SGVsbG8gd29ybGQ'; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input, {
      encoding: 'base64url',
      native: false,
    });
    expect(result).toEqual(expectedOutput);
  });

  it('decodes a base64url string to bytes (strict=true)', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input, {
      encoding: 'base64url',
      strict: true,
    });
    expect(result).toEqual(expectedOutput);
  });

  it('decodes a base64url string to bytes (strict=true, native=false)', () => {
    const input = 'SGVsbG8gd29ybGQ='; // "Hello world" in base64
    const expectedOutput = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]);
    const result = base64ToBytes(input, {
      encoding: 'base64url',
      strict: true,
      native: false,
    });
    expect(result).toEqual(expectedOutput);
  });

  it('throws an error for invalid encoding', () => {
    expect(() => base64ToBytes('', { encoding: 'invalid' as any })).toThrow(
      'Invalid encoding options: invalid',
    );
  });

  it('throws an error for invalid encoding (native=false)', () => {
    expect(() =>
      base64ToBytes('', { encoding: 'invalid' as any, native: false }),
    ).toThrow('Invalid encoding options: invalid');
  });

  it('throws an error for base64 in strict mode', () => {
    const input = 'SGVsbG8gd29ybGQ'; // Missing padding
    expect(() =>
      base64ToBytes(input, { encoding: 'base64', strict: true }),
    ).toThrow();
  });

  it('throws an error for base64 in strict mode (native=false)', () => {
    const input = 'SGVsbG8gd29ybGQ'; // Missing padding
    expect(() =>
      base64ToBytes(input, { encoding: 'base64', strict: true, native: false }),
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

  it('handles invalid base64 input in non-strict mode (native=false)', () => {
    const input = 'SGVsbG8gd29ybGQ'; // Missing padding
    expect(() => {
      const result = base64ToBytes(input, {
        encoding: 'base64',
        strict: false,
        native: false,
      });
      expect(result).toBeInstanceOf(Uint8Array);
    }).not.toThrow();
  });

  it('handles invalid base64url input in non-strict mode', () => {
    const input = 'SGVsbG8gd29ybGQ'; // Missing padding
    expect(() => {
      const result = base64ToBytes(input, {
        encoding: 'base64url',
        strict: false,
      });
      expect(result).toBeInstanceOf(Uint8Array);
    }).not.toThrow();
  });

  it('handles invalid base64url input in non-strict mode (native=false)', () => {
    const input = 'SGVsbG8gd29ybGQ'; // Missing padding
    expect(() => {
      const result = base64ToBytes(input, {
        encoding: 'base64url',
        strict: false,
        native: false,
      });
      expect(result).toBeInstanceOf(Uint8Array);
    }).not.toThrow();
  });

  it('handles invalid base64 input', () => {
    const input = 'Invalid!URL+Base64';
    expect(() => base64ToBytes(input, { encoding: 'base64' })).toThrow();
  });

  it('handles invalid base64 input (native=false)', () => {
    const input = 'Invalid!URL+Base64';
    expect(() =>
      base64ToBytes(input, { encoding: 'base64', native: false }),
    ).toThrow();
  });

  it('handles invalid base64url input', () => {
    const input = 'Invalid!URL+Base64';
    expect(() => base64ToBytes(input, { encoding: 'base64url' })).toThrow();
  });

  it('handles invalid base64url input (native=false)', () => {
    const input = 'Invalid!URL+Base64';
    expect(() =>
      base64ToBytes(input, { encoding: 'base64url', native: false }),
    ).toThrow();
  });
});
