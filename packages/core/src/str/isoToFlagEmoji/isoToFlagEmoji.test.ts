import { describe, expect, it } from 'vitest';
import { isoToFlagEmoji } from './isoToFlagEmoji';

describe('isoToFlagEmoji', () => {
  it('should return the flag emoji for a valid two-letter ISO country code', () => {
    expect(isoToFlagEmoji('US')).toBe('🇺🇸'); // USA
    expect(isoToFlagEmoji('GB')).toBe('🇬🇧'); // United Kingdom
    expect(isoToFlagEmoji('DE')).toBe('🇩🇪'); // Germany
    expect(isoToFlagEmoji('IN')).toBe('🇮🇳'); // India
    expect(isoToFlagEmoji('BR')).toBe('🇧🇷'); // Brazil
    expect(isoToFlagEmoji('FR')).toBe('🇫🇷'); // France
  });

  it('should return the original string if the input is not a valid ISO country code', () => {
    expect(isoToFlagEmoji('xyz')).toBe('xyz'); // Invalid code
    expect(isoToFlagEmoji('A')).toBe('A'); // Single character
    expect(isoToFlagEmoji('123')).toBe('123'); // Non-letter characters
    expect(isoToFlagEmoji('!@#')).toBe('!@#'); // Special characters
    expect(isoToFlagEmoji('USA')).toBe('USA'); // More than two characters
  });

  it('should handle mixed-case input correctly', () => {
    expect(isoToFlagEmoji('us')).toBe('🇺🇸'); // Lowercase input
    expect(isoToFlagEmoji('gB')).toBe('🇬🇧'); // Mixed case input
    expect(isoToFlagEmoji('De')).toBe('🇩🇪'); // Mixed case input
  });

  it('should return the original string if input contains spaces or is empty', () => {
    expect(isoToFlagEmoji('')).toBe(''); // Empty string
    expect(isoToFlagEmoji(' ')).toBe(' '); // Single space
    expect(isoToFlagEmoji('US UK')).toBe('US UK'); // String with spaces
  });
});
