import { describe, expect, it } from 'vitest';
import { parseAllNumbers } from './parseAllNumbers';

describe('parseAllNumbers', () => {
  it('should return a single number as an array if the input is a valid number', () => {
    expect(parseAllNumbers(42)).toEqual([42]);
    expect(parseAllNumbers(3.14)).toEqual([3.14]);
  });

  it('should return numbers from a string with integers and decimals', () => {
    expect(
      parseAllNumbers('The temperature is 23.5°C and humidity is 60%.'),
    ).toEqual([23.5, 60]);
    expect(parseAllNumbers('1,234 and 56.78 are numbers')).toEqual([
      1.234, 56.78,
    ]);
  });

  it('should handle strings with no numbers gracefully', () => {
    expect(parseAllNumbers('No numbers here!')).toEqual([]);
    expect(parseAllNumbers('Only words and symbols @#$%^&*()')).toEqual([]);
  });

  it('should handle strings with invalid number formats', () => {
    expect(parseAllNumbers('Not a number: 123abc')).toEqual([123]);
    expect(parseAllNumbers('Trailing dots: 123.')).toEqual([123]);
    expect(parseAllNumbers('Leading dots: .456')).toEqual([456]);
  });

  it('should handle negative numbers and scientific notation', () => {
    expect(parseAllNumbers('-42 and -3.14 are negative numbers')).toEqual([
      -42, -3.14,
    ]);
    expect(parseAllNumbers('Scientific notation: 1.23e4')).toEqual([1.23, 4]); // Regex doesn't support 'e' yet
  });

  // it('should handle large numbers and multiple commas', () => {
  //   expect(parseAllNumbers('Population: 1,234,567')).toEqual([1234567]);
  //   expect(parseAllNumbers('Price: $2,345.67')).toEqual([2345.67]);
  // });

  it('should return an empty array for non-string, non-number inputs', () => {
    expect(parseAllNumbers(null)).toEqual([]);
    expect(parseAllNumbers(undefined)).toEqual([]);
    expect(parseAllNumbers([])).toEqual([]);
    expect(parseAllNumbers({})).toEqual([]);
  });

  it('should returns an empty array for unsupported input types if validation is strict', () => {
    expect(parseAllNumbers(['Invalid input'])).toEqual([]);
    expect(parseAllNumbers({ key: 'value' })).toEqual([]);
  });

  it('should correctly handle edge cases with mixed valid and invalid data', () => {
    expect(parseAllNumbers('123abc456')).toEqual([123, 456]);
    expect(parseAllNumbers('..123..456..')).toEqual([123, 456]);
    expect(parseAllNumbers('123 456.789')).toEqual([123, 456.789]);
  });

  it('should handle empty or whitespace-only strings', () => {
    expect(parseAllNumbers('')).toEqual([]);
    expect(parseAllNumbers('   ')).toEqual([]);
  });
});
