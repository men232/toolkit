import { describe, expect, it } from 'vitest';
import { bytesToBase64 } from './bytesToBase64';

describe('bytesToBase64', () => {
  it('encodes a bytes to base64 string', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]); // "Hello world"
    const expectedOutput = 'SGVsbG8gd29ybGQ=';
    const result = bytesToBase64(input, { encoding: 'base64' });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a bytes to base64 string (native=false)', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]); // "Hello world"
    const expectedOutput = 'SGVsbG8gd29ybGQ=';
    const result = bytesToBase64(input, { encoding: 'base64', native: false });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a bytes to base64 string (padding=false)', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]); // "Hello world"
    const expectedOutput = 'SGVsbG8gd29ybGQ';
    const result = bytesToBase64(input, { encoding: 'base64', padding: false });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a bytes to base64 string (padding=false, native=false)', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]); // "Hello world"
    const expectedOutput = 'SGVsbG8gd29ybGQ';
    const result = bytesToBase64(input, {
      encoding: 'base64',
      native: false,
      padding: false,
    });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a bytes to base64url string', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 45, 119, 111, 114, 108, 100,
    ]); // "Hello-world"
    const expectedOutput = 'SGVsbG8td29ybGQ';
    const result = bytesToBase64(input, {
      encoding: 'base64url',
    });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a bytes to base64url string (native=false)', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 45, 119, 111, 114, 108, 100,
    ]); // "Hello-world"
    const expectedOutput = 'SGVsbG8td29ybGQ';
    const result = bytesToBase64(input, {
      encoding: 'base64url',
      native: false,
    });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a bytes to base64url string (padding=true)', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 45, 119, 111, 114, 108, 100,
    ]); // "Hello-world"
    const expectedOutput = 'SGVsbG8td29ybGQ=';
    const result = bytesToBase64(input, {
      encoding: 'base64url',
      padding: true,
    });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a bytes to base64url string (padding=true, native=false)', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 45, 119, 111, 114, 108, 100,
    ]); // "Hello-world"
    const expectedOutput = 'SGVsbG8td29ybGQ=';
    const result = bytesToBase64(input, {
      encoding: 'base64url',
      padding: true,
      native: false,
    });
    expect(result).toBe(expectedOutput);
  });

  it('throws an error for invalid encoding', () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]);
    expect(() => bytesToBase64(input, { encoding: 'invalid' as any })).toThrow(
      'Invalid encoding options: invalid',
    );
  });

  it('uses default options (base64 with padding)', () => {
    const input = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const expectedOutput = 'SGVsbG8=';
    const result = bytesToBase64(input);
    expect(result).toBe(expectedOutput);
  });
});
