import { TokenType, type TokenTypeOptions } from './TokenType';

/**
 * Node types
 * @group Constants
 */
export const NODE = Object.freeze({
  PROGRAM: 'program',
  IDENTIFIER: 'identifier',
  LITERAL: 'literal',
  LOGICAL_EXPRESSION: 'logical-expression',
  BINARY_EXPRESSION: 'binary-expression',
});

/**
 * Keyword tokens.
 * @group Constants
 */
export const KEYWORDS: Record<string, TokenType> = {};

/**
 * Token types
 * @group Constants
 */
export const TOKEN = Object.freeze({
  /**
   * Start of File token.
   */
  SOF: new TokenType('sof'),

  /**
   * End of File token.
   */
  EOF: new TokenType('eof'),

  /**
   * Number token.
   */
  NUM: new TokenType('num'),

  /**
   * String token.
   */
  STRING: new TokenType('string'),

  /**
   * Identifier token.
   */
  NAME: new TokenType('identifier'),

  /**
   * Parenthesis token.
   */
  PAREN_L: new TokenType('('),

  /**
   * Parenthesis token.
   */
  PAREN_R: new TokenType(')'),

  /**
   * Logical operator token.
   */
  LOGICAL_OR: kw('OR'),

  /**
   * Logical operator token.
   */
  LOGICAL_AND: kw('AND'),

  /**
   * Equality operator token.
   */
  EQUALITY: new TokenType('=/!='),

  /**
   * Relational operator token.
   */
  RELATIONAL: new TokenType('</>/<=/>='),

  /**
   * Minus operator token.
   */
  MINUS: new TokenType('-'),

  /**
   * Null literal token.
   */
  NULL: kw('null'),

  /**
   * True literal tokens.
   */
  TRUE: kw('true'),

  /**
   * False literal tokens.
   */
  FALSE: kw('false'),
} as const);

function kw(name: string, options: TokenTypeOptions = {}) {
  options.keyword = name;
  return (KEYWORDS[name] = new TokenType(name, options));
}
