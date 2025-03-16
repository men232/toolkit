import { describe, expect, it } from 'vitest';
import { NODE } from './constants';
import { Expression } from './Expression';
import type { NodeExpression } from './types';

function t(input: string): NodeExpression[] {
  return new Expression(input).parse().body;
}

describe('Expression', () => {
  it('should handle string equality expression', () => {
    expect(t('name = "andrew"')).toStrictEqual([
      {
        type: NODE.BINARY_EXPRESSION,
        start: 0,
        end: 15,
        left: {
          start: 0,
          end: 5,
          type: NODE.IDENTIFIER,
          name: 'name',
        },
        operator: '=',
        right: {
          start: 7,
          end: 15,
          type: NODE.LITERAL,
          value: 'andrew',
          raw: '"andrew"',
        },
      },
    ]);

    expect(t('name != "andrew"')).toStrictEqual([
      {
        type: NODE.BINARY_EXPRESSION,
        start: 0,
        end: 16,
        left: {
          start: 0,
          end: 5,
          type: NODE.IDENTIFIER,
          name: 'name',
        },
        operator: '!=',
        right: {
          start: 8,
          end: 16,
          type: NODE.LITERAL,
          value: 'andrew',
          raw: '"andrew"',
        },
      },
    ]);
  });

  it('should handle number equality expression', () => {
    expect(t('age > 5')).toStrictEqual([
      {
        type: NODE.BINARY_EXPRESSION,
        start: 0,
        end: 7,
        left: {
          start: 0,
          end: 4,
          type: NODE.IDENTIFIER,
          name: 'age',
        },
        operator: '>',
        right: {
          start: 6,
          end: 7,
          type: NODE.LITERAL,
          value: 5,
          raw: '5',
        },
      },
    ]);
  });

  it('should handle number with minus equality expression', () => {
    expect(t('age > -5')).toStrictEqual([
      {
        type: NODE.BINARY_EXPRESSION,
        start: 0,
        end: 8,
        left: {
          start: 0,
          end: 4,
          type: NODE.IDENTIFIER,
          name: 'age',
        },
        operator: '>',
        right: {
          start: 6,
          end: 8,
          type: NODE.LITERAL,
          value: -5,
          raw: '-5',
        },
      },
    ]);
  });

  describe('binary expression', () => {
    it('should throw error when left side not a identifier', () => {
      expect(() => t('5 > age')).toThrowError(
        'Expected identifier as left side of binary expression.',
      );
    });

    it('should throw error when right side not a literal', () => {
      expect(() => t('ego > balance')).toThrowError(
        'Expected literal as right side of binary expression.',
      );
    });
  });

  describe('logical expression', () => {
    it('should throw error when left side not an expression', () => {
      expect(() => t('age OR age > 5')).toThrowError(
        'Expected expression as left side of logical expression.',
      );
    });

    it('should throw error when right side not an expression', () => {
      expect(() => t('age > 5 OR age')).toThrowError(
        'Expected operator after identifier',
      );
    });
  });
});
