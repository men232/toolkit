import { describe, expect, it } from 'vitest';
import { rleDecode } from './rleDecode';
import { rleEncode } from '../rleEncode';

describe('rleDecode', () => {
  it('returns empty buffer for empty input', () => {
    expect(rleDecode(new Uint8Array([]))).toEqual(new Uint8Array([]));
  });

  it('passes through non-target bytes unchanged', () => {
    const input = new Uint8Array([1, 2, 3, 4, 5]);
    expect(rleDecode(input)).toEqual(input);
  });

  it('decodes [value, count] pair into run', () => {
    const input = new Uint8Array([0, 5]);
    expect(rleDecode(input)).toEqual(new Uint8Array([0, 0, 0, 0, 0]));
  });

  it('decodes mixed data', () => {
    const input = new Uint8Array([1, 0, 3, 2, 0, 1, 3]);
    expect(rleDecode(input)).toEqual(new Uint8Array([1, 0, 0, 0, 2, 0, 3]));
  });

  it('decodes multiple chunks for long runs', () => {
    const input = new Uint8Array([0, 255, 0, 45]);
    expect(rleDecode(input)).toEqual(new Uint8Array(300).fill(0));
  });

  it('decodes custom target value', () => {
    const input = new Uint8Array([0, 1, 3, 0]);
    expect(rleDecode(input, 1)).toEqual(new Uint8Array([0, 1, 1, 1, 0]));
  });

  it('roundtrips with rleEncode', () => {
    const original = new Uint8Array([1, 0, 0, 0, 2, 3, 0, 0, 4]);
    expect(rleDecode(rleEncode(original))).toEqual(original);
  });
});
