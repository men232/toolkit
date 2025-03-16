import type { TokenType } from './TokenType';

export interface TokenOptions {
  type: TokenType;
  value: unknown;
  start: number;
  end: number;
}

/**
 * @group Utils
 */
export class Token {
  public readonly type: TokenType;
  public readonly value: unknown;
  public readonly start: number;
  public readonly end: number;

  constructor(p: TokenOptions) {
    this.type = p.type;
    this.value = p.value;
    this.start = p.start;
    this.end = p.end;
  }
}
