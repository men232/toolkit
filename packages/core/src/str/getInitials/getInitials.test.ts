import { describe, expect, it } from 'vitest';
import { getInitials } from './getInitials';

describe('getInitials', () => {
  it('should return initials for a standard full name', () => {
    expect(getInitials('John Doe')).toBe('JD');
    expect(getInitials('Jane Smith')).toBe('JS');
  });

  it('should handle names with multiple spaces', () => {
    expect(getInitials('  Alice   Wonderland ')).toBe('AW');
    expect(getInitials('   Bob   Marley   ')).toBe('BM');
  });

  it('should handle names with special characters at the start of words', () => {
    expect(getInitials('!@#$%^&*() Invalid Name')).toBe('IN');
    expect(getInitials('...John !!!Doe')).toBe('JD');
  });

  it('should return initials for names with Unicode characters', () => {
    expect(getInitials('José María de la Cruz')).toBe('JC');
    expect(getInitials('Åsa Björk')).toBe('ÅB');
  });

  it('should handle single-word names', () => {
    expect(getInitials('Madonna')).toBe('M');
    expect(getInitials('Cher')).toBe('C');
  });

  it('should return an empty string for non-string inputs', () => {
    expect(getInitials(null as any)).toBe('');
    expect(getInitials(undefined as any)).toBe('');
    expect(getInitials(42 as any)).toBe('');
    expect(getInitials({} as any)).toBe('');
    expect(getInitials([] as any)).toBe('');
  });

  it('should return an empty string for empty or whitespace-only strings', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials('    ')).toBe('');
  });

  it('should handle names with titles or prefixes', () => {
    expect(getInitials('Dr. Albert Einstein')).toBe('AE');
    expect(getInitials('Mr. Sherlock Holmes')).toBe('SH');
  });

  it('should handle names with trailing special characters', () => {
    expect(getInitials('John Doe!')).toBe('JD');
    expect(getInitials('Jane Smith?')).toBe('JS');
  });

  it('should handle mixed-case names correctly', () => {
    expect(getInitials('john DOE')).toBe('JD');
    expect(getInitials('JaNe SmItH')).toBe('JS');
  });

  it('should preserve emoji in initials when has two', () => {
    expect(getInitials('😀 John Doe')).toBe('JD');
    expect(getInitials('John Doe 😀')).toBe('JD');
    expect(getInitials('🎉 Jane Smith')).toBe('JS');
    expect(getInitials('Jane Smith 🎉')).toBe('JS');
    expect(getInitials('🌟 José María')).toBe('JM');
  });

  it('should apers emoji in initials when has one', () => {
    expect(getInitials('😀 John')).toBe('😀J');
    expect(getInitials('John 😀')).toBe('J😀');
  });
});
