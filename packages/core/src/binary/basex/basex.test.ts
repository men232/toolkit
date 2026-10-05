import { describe, expect, it } from 'vitest';
import { basex } from './basex';

const base16 = basex('0123456789abcdef');
const base2 = basex('01');
const base58 = basex(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz',
);

describe('basex', () => {
  it('encodes with alphabets shorter than 32 characters', () => {
    expect(base16.encode(new Uint8Array([255, 255, 255, 255, 255]))).toBe(
      'ffffffffff',
    );
    expect(base2.encode(new Uint8Array([5, 1]))).toBe('10100000001');
  });

  it('keeps leading zero bytes as zero characters', () => {
    expect(base16.encode(new Uint8Array([0, 0, 1]))).toBe('001');
    expect(base58.encode(new Uint8Array([0, 0, 1]))).toBe('112');
  });

  it('matches known base58 vectors', () => {
    expect(base58.encode(new TextEncoder().encode('Hello World!'))).toBe(
      '2NEpo7TZRRrLZSi2U',
    );
  });

  it.each([
    ['base2', base2],
    ['base16', base16],
    ['base58', base58],
  ])('round-trips random bytes (%s)', (_, codec) => {
    for (let length = 0; length < 40; length++) {
      const bytes = new Uint8Array(length);
      for (let i = 0; i < length; i++) bytes[i] = (i * 73 + length) & 0xff;
      if (length > 2) bytes[0] = 0;

      expect(Array.from(codec.decode(codec.encode(bytes)))).toEqual(
        Array.from(bytes),
      );
    }
  });
  it('reports the invalid character on decode', () => {
    expect(() => base16.decode('0fz')).toThrow(
      'Invalid character "z" for the alphabet',
    );
  });
});
