import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32.js';

describe('crc32', () => {
  // Test with string inputs
  it('calculates correct hash for empty string', () => {
    expect(crc32('')).toBe(0);
  });

  it('calculates correct hash for simple strings', () => {
    // Known CRC32 values for test strings
    expect(crc32('hello')).toBe(907060870);
    expect(crc32('world')).toBe(980881731);
    expect(crc32('hello world')).toBe(222957957);
  });

  it('calculates correct hash for longer text', () => {
    const text =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies aliquam, nunc nisl aliquet nunc, quis aliquam nisl nunc quis nisl.';
    expect(crc32(text)).toBe(1890403853);
  });

  // Test with Uint8Array inputs
  it('calculates correct hash for Uint8Array', () => {
    const data = new Uint8Array([104, 101, 108, 108, 111]);
    expect(crc32(data)).toBe(907060870);
  });

  it('calculates correct hash for empty Uint8Array', () => {
    expect(crc32(new Uint8Array([]))).toBe(0);
  });

  // Test with seed values
  it('uses seed value when provided', () => {
    const text = 'test';
    // Calculate with default seed
    const defaultResult = crc32(text);
    // Calculate with explicit seed
    const seedResult = crc32(text, 123456789);

    // Results should be different with different seeds
    expect(defaultResult).not.toBe(seedResult);

    // Verify consistency with same seed
    expect(crc32(text, 123456789)).toBe(seedResult);
  });

  it('uses 0 seed correctly', () => {
    const text = 'zero seed test';
    expect(crc32(text, 0)).toBe(-1286639364);
  });

  // Edge cases
  it('handles special characters correctly', () => {
    expect(crc32('áéíóú£€ñ¡¿')).toBe(-1125999011);
  });

  it('handles null and undefined characters in Uint8Array', () => {
    const data = new Uint8Array([0, 0, 0, 97, 98, 99]); // null bytes followed by "abc"
    expect(crc32(data)).toBe(2074556787);
  });

  // Consistency tests
  it('produces consistent results for same input', () => {
    const text = 'consistency test';
    const result1 = crc32(text);
    const result2 = crc32(text);
    expect(result1).toBe(result2);
  });

  it('produces same result for equivalent string and Uint8Array', () => {
    const text = 'equivalence test';
    const textArray = new TextEncoder().encode(text);

    expect(crc32(text)).toBe(crc32(textArray));
  });
});
