import { describe, expect, it } from 'vitest';
import { truncate } from './truncate';

describe('truncate', () => {
  it('should truncate a string to the specified length and add ellipsis', () => {
    const result = truncate('This is a test string for truncation.', 20);
    expect(result).toBe('This is a test...');
  });

  it('should not truncate a string if its length is within the limit', () => {
    const result = truncate('Short string', 20);
    expect(result).toBe('Short string');
  });

  it('should not truncate if the difference is insignificant', () => {
    const result = truncate('This string has an insignificant truncation.', 42);
    expect(result).toBe('This string has an insignificant truncation.');
  });

  it('should handle strings with no spaces correctly', () => {
    const result = truncate('ThisStringHasNoSpacesButIsVeryLong', 10);
    expect(result).toBe('ThisString...');
  });

  it('should handle edge case where maxLength equals the string length', () => {
    const result = truncate('Exact length', 12);
    expect(result).toBe('Exact length');
  });

  it('should truncate correctly with custom insignificantThreshold', () => {
    const result = truncate('This is a very specific case.', 20, 0.1);
    expect(result).toBe('This is a very...');
  });

  it('should return the original string if truncation is not needed', () => {
    const result = truncate('A short string', 50);
    expect(result).toBe('A short string');
  });

  it('should handle strings shorter than maxLength gracefully', () => {
    const result = truncate('Short', 10);
    expect(result).toBe('Short');
  });

  it('should truncate strings with leading spaces correctly', () => {
    const result = truncate('     This is a long string.', 10);
    expect(result).toBe('This...');
  });

  it('should truncate strings with trailing spaces correctly', () => {
    const result = truncate('This is a test string    ', 20);
    expect(result).toBe('This is a test...');
  });

  it('should handle empty strings', () => {
    const result = truncate('', 10);
    expect(result).toBe('');
  });

  it('should handle maxLength of 0 gracefully', () => {
    const result = truncate('Test string', 0);
    expect(result).toBe('...');
  });
});
