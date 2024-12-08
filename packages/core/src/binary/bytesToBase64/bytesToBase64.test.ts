import { describe, expect, it } from 'vitest';
import { bytesToBase64 } from './bytesToBase64';

describe('bytesToBase64', () => {
  it('encodes a Uint8Array to standard base64 with padding (default)', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]); // "Hello world"
    const expectedOutput = 'SGVsbG8gd29ybGQ=';
    const result = bytesToBase64(input, { encoding: 'base64' });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a Uint8Array to standard base64 without padding', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100,
    ]); // "Hello world"
    const expectedOutput = 'SGVsbG8gd29ybGQ';
    const result = bytesToBase64(input, { encoding: 'base64', padding: false });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a Uint8Array to base64url without padding (default)', () => {
    const input = new Uint8Array([
      72, 101, 108, 108, 111, 45, 119, 111, 114, 108, 100,
    ]); // "Hello-world"
    const expectedOutput = 'SGVsbG8td29ybGQ';
    const result = bytesToBase64(input, { encoding: 'base64url' });
    expect(result).toBe(expectedOutput);
  });

  it('encodes a Uint8Array to base64url with padding', () => {
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
