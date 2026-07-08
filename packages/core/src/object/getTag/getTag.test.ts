import { describe, expect, it } from 'vitest';
import {
  arrayTag,
  booleanTag,
  dateTag,
  functionTag,
  getTag,
  nullTag,
  numberTag,
  objectTag,
  regexpTag,
  stringTag,
  symbolTag,
  undefinedTag,
} from './getTag';

describe('getTag function', () => {
  it('should return the tag of the value', () => {
    expect(getTag(null)).toBe(nullTag);
    expect(getTag(undefined)).toBe(undefinedTag);
    expect(getTag(1)).toBe(numberTag);
    expect(getTag('')).toBe(stringTag);
    expect(getTag(true)).toBe(booleanTag);
    expect(getTag(Symbol())).toBe(symbolTag);
    expect(getTag([])).toBe(arrayTag);
    expect(getTag({})).toBe(objectTag);
    expect(getTag(() => {})).toBe(functionTag);
    expect(getTag(new Date())).toBe(dateTag);
    expect(getTag(/./)).toBe(regexpTag);
  });

  it('should return the tag of the custom object', () => {
    class Custom {}
    expect(getTag(new Custom())).toBe(objectTag);
  });
});
