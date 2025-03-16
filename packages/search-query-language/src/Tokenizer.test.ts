import { describe, expect, it } from 'vitest';
import { Token } from './Token';
import { Tokenizer } from './Tokenizer';
import { TOKEN } from './constants';

function t(input: string): Token[] {
  return Array.from(new Tokenizer(input));
}

describe('Tokenizer', () => {
  it('should handle number token', () => {
    expect(t('1')).toStrictEqual([
      new Token({ type: TOKEN.NUM, start: 0, end: 1, value: 1 }),
    ]);
  });

  it('should handle string token', () => {
    expect(t('"1"')).toStrictEqual([
      new Token({ type: TOKEN.STRING, start: 0, end: 3, value: '1' }),
    ]);

    expect(t('"Hel\\"o"')).toStrictEqual([
      new Token({ type: TOKEN.STRING, start: 0, end: 8, value: 'Hel"o' }),
    ]);

    expect(() => t('"Hello')).toThrowError('Unterminated string constant');
  });

  it('should handle true token', () => {
    expect(t('true')).toStrictEqual([
      new Token({ type: TOKEN.TRUE, start: 0, end: 4, value: 'true' }),
    ]);
  });

  it('should handle false token', () => {
    expect(t('false')).toStrictEqual([
      new Token({ type: TOKEN.FALSE, start: 0, end: 5, value: 'false' }),
    ]);
  });

  it('should handle null token', () => {
    expect(t('null')).toStrictEqual([
      new Token({ type: TOKEN.NULL, start: 0, end: 4, value: 'null' }),
    ]);
  });

  it('should handle equality token', () => {
    expect(t('=')).toStrictEqual([
      new Token({ type: TOKEN.EQUALITY, start: 0, end: 1, value: '=' }),
    ]);

    expect(t('!=')).toStrictEqual([
      new Token({ type: TOKEN.EQUALITY, start: 0, end: 2, value: '!=' }),
    ]);
  });

  it('should handle AND token', () => {
    expect(t('AND')).toStrictEqual([
      new Token({ type: TOKEN.LOGICAL_AND, start: 0, end: 3, value: 'AND' }),
    ]);
  });

  it('should handle OR token', () => {
    expect(t('OR')).toStrictEqual([
      new Token({ type: TOKEN.LOGICAL_OR, start: 0, end: 2, value: 'OR' }),
    ]);
  });

  it('should handle minus token', () => {
    expect(t('-')).toStrictEqual([
      new Token({ type: TOKEN.MINUS, start: 0, end: 1, value: undefined }),
    ]);
  });

  it('should handle name tokens', () => {
    expect(t('abc')).toStrictEqual([
      new Token({ type: TOKEN.NAME, start: 0, end: 3, value: 'abc' }),
    ]);

    expect(t('abc1')).toStrictEqual([
      new Token({ type: TOKEN.NAME, start: 0, end: 4, value: 'abc1' }),
    ]);

    expect(t('_abc')).toStrictEqual([
      new Token({ type: TOKEN.NAME, start: 0, end: 4, value: '_abc' }),
    ]);

    expect(t('_abc_1')).toStrictEqual([
      new Token({ type: TOKEN.NAME, start: 0, end: 6, value: '_abc_1' }),
    ]);

    expect(t('user.name')).toStrictEqual([
      new Token({ type: TOKEN.NAME, start: 0, end: 9, value: 'user.name' }),
    ]);
  });

  it('should handle null token', () => {
    expect(t('()')).toStrictEqual([
      new Token({ type: TOKEN.PAREN_L, start: 0, end: 1, value: undefined }),
      new Token({ type: TOKEN.PAREN_R, start: 1, end: 2, value: undefined }),
    ]);
  });

  it('should handle relational tokens', () => {
    expect(t('> >= < <=')).toStrictEqual([
      new Token({ type: TOKEN.RELATIONAL, start: 0, end: 1, value: '>' }),
      new Token({ type: TOKEN.RELATIONAL, start: 2, end: 4, value: '>=' }),
      new Token({ type: TOKEN.RELATIONAL, start: 5, end: 6, value: '<' }),
      new Token({ type: TOKEN.RELATIONAL, start: 7, end: 9, value: '<=' }),
    ]);
  });
});
