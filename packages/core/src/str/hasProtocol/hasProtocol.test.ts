import { describe, expect, test } from 'vitest';
import { hasProtocol } from './hasProtocol';

describe('hasProtocol', () => {
  test('defaults', () => {
    expect(hasProtocol('https://google.com')).toBe(true);
    expect(hasProtocol('http://google.com')).toBe(true);
  });

  test('custom protocol', () => {
    expect(hasProtocol('ws://google.com', ['ws://'])).toBe(true);
  });
});
