import { KEYWORDS, TOKEN } from './constants';
import { Token, type TokenOptions } from './Token';
import type { TokenType } from './TokenType';

/**
 * @group Utils
 */
export class Tokenizer implements Iterable<Token> {
  protected input: string;
  protected pos: number;
  protected length: number;
  protected state: TokenOptions;
  protected prev: TokenOptions;

  constructor(input: string) {
    this.input = input;
    this.length = input.length;
    this.pos = 0;
    this.state = {
      start: 0,
      end: 0,
      type: TOKEN.SOF,
      value: null,
    };
    this.prev = { ...this.state };
  }

  [Symbol.iterator]() {
    return {
      next: () => {
        let token = this.getToken();

        return {
          done: token.type === TOKEN.EOF,
          value: token,
        };
      },
    };
  }

  /**
   * Get the next token.
   */
  getToken(): Token {
    this.nextToken();
    const token = new Token(this.state);

    return token;
  }

  protected nextToken(): void {
    this.skipSpace();
    this.state.start = this.pos;
    if (this.pos >= this.length) return this.finishToken(TOKEN.EOF);
    this.readToken(this.charCodeAtPos());
  }

  protected skipSpace(): void {
    let ch: number;
    while (this.pos < this.length) {
      ch = this.charCodeAtPos();
      if (ch === 32 || ch === 160) {
        this.pos++;
      } else {
        break;
      }
    }
  }

  protected finishToken(type: TokenType, value?: unknown): void {
    Object.assign(this.prev, this.state);
    this.state.end = this.pos;
    this.state.type = type;
    this.state.value = value;
  }

  protected finishOp(type: TokenType, size: number): void {
    let str = this.input.slice(this.pos, this.pos + size);
    this.pos += size;
    return this.finishToken(type, str);
  }

  protected readToken(code: number): void {
    if (isIdentifierStart(code)) {
      return this.readWord();
    }

    return this.getTokenFromCode(code);
  }

  protected getTokenFromCode(code: number): void {
    switch (code) {
      case 40:
        ++this.pos;
        return this.finishToken(TOKEN.PAREN_L);
      case 41:
        ++this.pos;
        return this.finishToken(TOKEN.PAREN_R);

      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57: // 1-9
        return this.readNumber();

      case 45: // -
        ++this.pos;
        return this.finishToken(TOKEN.MINUS);

      case 61:
      case 33: // '=!'
        return this.readEquality(code);

      case 60:
      case 62: // <>
        return this.readLtGt();

      case 34: // "
        return this.readString();
    }

    this.raise(
      this.pos,
      "Unexpected character '" + String.fromCharCode(code) + "'",
    );
  }

  protected charCodeAtPos(): number {
    return this.input.charCodeAt(this.pos);
  }

  protected readEquality(code: number): void {
    let next = this.input.charCodeAt(this.pos + 1);

    if (code === 33) {
      if (next === 61) return this.finishOp(TOKEN.EQUALITY, 2);
    } else {
      return this.finishOp(TOKEN.EQUALITY, 1);
    }
  }

  protected readLtGt(): void {
    let next = this.input.charCodeAt(this.pos + 1);
    let size = 1;

    // =
    if (next === 61) size = 2;

    return this.finishOp(TOKEN.RELATIONAL, size);
  }

  protected readInt(): number | null {
    const radix = 10;
    let start = this.pos;
    let code = 0;
    let total = 0;

    for (;;) {
      code = this.input.charCodeAt(this.pos);

      if (code >= 48 && code <= 57) {
        total = total * radix + (code - 48);
        this.pos++;
      } else {
        break;
      }
    }

    if (this.pos === start) return null;

    return total;
  }

  protected raise(pos: number, message: string): never {
    throw new SyntaxError(`${message} (${pos})`);
  }

  protected readString(): void {
    let out = '';
    let chunkStart = ++this.pos;
    let ch: number;

    for (;;) {
      if (this.pos >= this.length) {
        this.raise(this.state.start, 'Unterminated string constant');
      }

      ch = this.input.charCodeAt(this.pos);
      if (ch === 34) break;
      if (ch === 92) {
        // '\'
        out += this.input.slice(chunkStart, this.pos);
        out += this.readEscapedChar();
        chunkStart = this.pos;
      }
      ++this.pos;
    }
    out += this.input.slice(chunkStart, this.pos++);
    return this.finishToken(TOKEN.STRING, out);
  }

  protected readWord(): void {
    let chunkStart = this.pos;
    let ch: number;
    let cmp = isIdentifierStart;

    while (this.pos < this.input.length) {
      ch = this.charCodeAtPos();
      if (!cmp(ch)) break;
      cmp = isIdentifierChar;
      this.pos++;
    }

    const word = this.input.slice(chunkStart, this.pos);

    let type = TOKEN.NAME;

    if (word in KEYWORDS) {
      type = KEYWORDS[word];
    }

    return this.finishToken(type, word);
  }

  protected readEscapedChar(): string {
    let ch = this.input.charCodeAt(++this.pos);
    ++this.pos;
    return String.fromCharCode(ch);
  }

  protected readNumber(): void {
    let start = this.pos;
    if (this.readInt() === null) this.raise(start, 'Invalid number');
    let next = this.input.charCodeAt(this.pos);

    // '.'
    if (next === 46) {
      ++this.pos;
      this.readInt();
      next = this.input.charCodeAt(this.pos);
    }

    let val = Number(this.input.slice(start, this.pos));
    return this.finishToken(TOKEN.NUM, val);
  }
}

function isIdentifierStart(code: number) {
  // A-Z
  if (code < 65) return false;
  if (code < 91) return true;
  // _
  if (code < 97) return code === 95;
  // a-z
  if (code < 123) return true;
  return false;
}

function isIdentifierChar(code: number) {
  if (code < 48) return code === 46;
  // 0-9
  if (code < 58) return true;
  // A-Z
  if (code < 65) return false;
  if (code < 91) return true;
  // _
  if (code < 97) return code === 95;
  // a-z
  if (code < 123) return true;

  return false;
}
