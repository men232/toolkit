import {
  CORE_TYPES,
  createExtension,
  defineStructure,
} from '@andrew_l/tl-pack';
import { crc32 } from '@andrew_l/toolkit';
import { ObjectId } from 'mongodb';

const SCHEMA_VERSION = 1;
const OBJECT_ID_TOKEN = 100;

const extensions = [
  createExtension(OBJECT_ID_TOKEN, {
    encode(value) {
      if (value?._bsontype?.toLowerCase() === 'objectid') {
        this.writeBytes(value.id);
      }
    },
    decode() {
      const bytes = this.readBytes();
      return new ObjectId(bytes);
    },
  }),
];

export interface TokenOptions {
  /**
   * The schema version of the token.
   */
  schemaVersion: number;

  /**
   * The name of the model the token is related to.
   */
  modelName?: string;

  /**
   * The sorting direction used to building pagination query.
   */
  sortDirection?: Record<string, any>;

  /**
   * The values associated with sorting.
   * Used in conjunction with `sortDirection` to building range query.
   */
  sortValues?: Record<string, any>;

  /**
   * The payload of the token. Contains additional data or metadata (can be `null`).
   */
  payload: Record<string, any> | null;
}

const TokenStructure = defineStructure({
  name: 'PaginationToken',
  version: 1,
  properties: {
    modelNameCrc: { type: CORE_TYPES.Int32, required: true },
    keys: { type: [String], required: true },
    sortDirection: { type: [null], required: true },
    sortValues: { type: [null], required: true },
    payload: { type: Object },
  },
});

/**
 * Represents a token with pagination and metadata information.
 * This class holds the token data, including sorting details, and any payload.
 */
export class Token {
  /**
   * The CRC of the model name, used for verify the model.
   */
  public modelNameCRC: number = 0;

  /**
   * The sorting direction used for pagination building pagination query.
   */
  public sortDirection: Record<string, any> = {};

  /**
   * The sorting values associated with the pagination.
   */
  public sortValues: Record<string, any> = {};

  /**
   * The payload of the token, which can contain any associated metadata or data (may be `null`).
   */
  public payload: Record<string, any> | null = null;

  constructor(options?: Partial<TokenOptions>) {
    if (options) {
      Object.assign(this, { ...options, modelName: undefined });

      if (options.modelName) {
        this.modelNameCRC = crc32(options.modelName);
      }
    }
  }

  /**
   * Retrieves the string representation of token.
   */
  public stringify(): string {
    return this.buffer().toString('base64url');
  }

  /**
   * Retrieves binary buffer representation of token.
   */
  public buffer(): Buffer {
    const struct = new TokenStructure({
      modelNameCrc: this.modelNameCRC,
      sortDirection: Object.values(this.sortDirection),
      sortValues: Object.values(this.sortValues),
      keys: Object.keys(this.sortValues),
      payload: this.payload,
    });

    return Buffer.from(struct.toBuffer({ extensions }));
  }

  /**
   * Encode token from provided value
   */
  static from(value: string | Buffer): Token {
    const buffer = Buffer.isBuffer(value)
      ? value
      : Buffer.from(value, 'base64url');

    const struct = TokenStructure.fromBuffer(buffer);

    const token = new Token();

    token.modelNameCRC = struct.modelNameCrc;
    token.sortDirection = Object.fromEntries(
      struct.keys.map((key, idx) => [key, struct.sortDirection[idx]]),
    );
    token.sortValues = Object.fromEntries(
      struct.keys.map((key, idx) => [key, struct.sortValues[idx]]),
    );
    token.payload = struct.payload ?? {};

    return token;
  }
}

/**
 * Parses a token from provided value.
 * @group Utils
 */
export function parseToken(value: string | Buffer): Token {
  return Token.from(value);
}

/**
 * Create a token with pagination and metadata information.
 * This holds the token data, including sorting details, and any payload.
 *
 * @group Utils
 */
export function createToken(options?: Partial<TokenOptions>): Token {
  return new Token(options);
}
