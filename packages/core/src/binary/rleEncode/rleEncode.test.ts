import { describe, expect, it } from 'vitest';
import { rleEncode } from './rleEncode';

describe('rleEncode', () => {
  it('returns empty buffer for empty input', () => {
    expect(rleEncode(new Uint8Array([]))).toEqual(new Uint8Array([]));
  });

  it('passes through non-target bytes unchanged', () => {
    const input = new Uint8Array([1, 2, 3, 4, 5]);
    expect(rleEncode(input)).toEqual(input);
  });

  it('encodes single target byte as [value, 1]', () => {
    const input = new Uint8Array([0]);
    expect(rleEncode(input)).toEqual(new Uint8Array([0, 1]));
  });

  it('encodes run of target bytes as [value, count]', () => {
    const input = new Uint8Array([0, 0, 0, 0, 0]);
    expect(rleEncode(input)).toEqual(new Uint8Array([0, 5]));
  });

  it('handles mixed data', () => {
    const input = new Uint8Array([1, 0, 0, 0, 2, 0, 3]);
    expect(rleEncode(input)).toEqual(new Uint8Array([1, 0, 3, 2, 0, 1, 3]));
  });

  it('splits runs longer than 255', () => {
    const input = new Uint8Array(300).fill(0);
    expect(rleEncode(input)).toEqual(new Uint8Array([0, 255, 0, 45]));
  });

  it('encodes custom target value', () => {
    const input = new Uint8Array([0, 1, 1, 1, 0]);
    expect(rleEncode(input, 1)).toEqual(new Uint8Array([0, 1, 3, 0]));
  });
});
