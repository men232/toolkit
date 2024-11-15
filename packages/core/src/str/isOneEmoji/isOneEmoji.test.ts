import { describe, expect, it } from 'vitest';
import { isOneEmoji } from './isOneEmoji';

describe('isOneEmoji', () => {
  it('should return true for a single emoji', () => {
    expect(isOneEmoji('😊')).toBe(true); // Single emoji
    expect(isOneEmoji('😎')).toBe(true); // Single emoji
    expect(isOneEmoji('❤️')).toBe(true); // Single emoji
  });

  it('should return false for a string that is not a single emoji', () => {
    expect(isOneEmoji('Hello 😊')).toBe(false); // Emoji is part of a sentence
    expect(isOneEmoji('😎 is cool')).toBe(false); // Emoji in a sentence
    expect(isOneEmoji('not an emoji')).toBe(false); // No emoji
  });

  it('should return true for multi-character emojis like family emojis', () => {
    expect(isOneEmoji('👨‍👩‍👧‍👦')).toBe(true); // Family emoji (composed of multiple characters)
    expect(isOneEmoji('👨‍👩‍👧‍👦')).toBe(true); // Another multi-character emoji
  });

  it('should return false for non-emoji text', () => {
    expect(isOneEmoji('12345')).toBe(false); // Non-emoji number string
    expect(isOneEmoji('!@#$%^&*()')).toBe(false); // Non-emoji special characters
  });

  it('should return false for empty or whitespace strings', () => {
    expect(isOneEmoji('')).toBe(false); // Empty string
    expect(isOneEmoji('   ')).toBe(false); // Only spaces
  });

  it('should handle Unicode and emoji variations correctly', () => {
    expect(isOneEmoji('🦄')).toBe(true); // Unicorn emoji
    expect(isOneEmoji('🌍')).toBe(true); // Earth globe emoji
    expect(isOneEmoji('🌈')).toBe(true); // Rainbow emoji
  });

  it('should return false for strings containing mixed characters and emojis', () => {
    expect(isOneEmoji('😊 and text')).toBe(false); // Emoji and text together
    expect(isOneEmoji('Text 😊 more text')).toBe(false); // Emoji in the middle
  });

  it('should return true for composite emojis like flags', () => {
    expect(isOneEmoji('🇺🇸')).toBe(true); // Flag emoji (USA)
    expect(isOneEmoji('🇬🇧')).toBe(true); // Flag emoji (UK)
  });
});
