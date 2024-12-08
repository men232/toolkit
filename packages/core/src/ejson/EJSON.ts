import { assert } from '@/assert';
import {
  isBigInt,
  isInfinity,
  isObject,
  isPlainObject,
  isPrimitive,
} from '@/is';
import { deepCloneWith } from '@/object/deepCloneWith';
import { getWords } from '@/str/getWords';
import {
  BigIntType,
  BinaryType,
  DateType,
  InfinityType,
  MapType,
  RegexType,
  SetType,
} from './types';

export type EJSONType = {
  /**
   * The string placeholder (must start with `$`) that represents the custom type.
   */
  placeholder: string;

  /**
   * Function to encode a value into a custom representation using a custom type handler.
   *
   * If the function returns `undefined`, it signals that encoding for this value should
   * be delegated to another type handler or encoding logic.
   *
   * @param {any} value - The value to be encoded.
   * @param {(value: any) => any} encode - A reference to the general encoding function
   *                                       (useful for recursive encoding logic if necessary).
   * @returns {any} - The custom-encoded value or `undefined` to delegate encoding to another type handler.
   */
  encode: (value: any, encode: (value: any) => any) => any;

  /**
   * A function to decode a custom representation back into a valid JavaScript value.
   */
  decode: (value: any) => any;
};

/**
 * EJSON - Extended JSON handler class for custom encoding and decoding with vendor support.
 * This class provides methods to encode, decode, stringify, and parse JSON with custom type handlers.
 */
export class EJSON {
  /** @internal */
  protected typeHandlers: Map<string, Readonly<EJSONType>> = new Map();

  /** @internal */
  protected replacerReady: (value: any, key: string) => any;

  /** @internal */
  protected encode: (value: any) => any;

  /** @internal */
  protected reviewerReady: (_: string, value: any) => any;

  /**
   * The vendor name used for the custom MIME type definition.
   * If null, defaults to 'application/json'.
   */
  public vendorName: string | null = null;

  public readonly Type = {
    Date: DateType,
    Map: MapType,
    Set: SetType,
    RegExp: RegexType,
    Infinity: InfinityType,
    BigInt: BigIntType,
    Binary: BinaryType,
  } as const;

  constructor() {
    this.replacerReady = this._replacer.bind(this);
    this.reviewerReady = this._reviewer.bind(this);
    this.encode = (value: any) => {
      return deepCloneWith(value, this.replacerReady);
    };
  }

  /**
   * MIME type based on the provided vendor name or defaults to 'application/json'.
   */
  get mimetype() {
    if (!this.vendorName) {
      return 'application/json';
    }

    return `application/vnd.${getWords(this.vendorName).join('.').toLowerCase()}+json`;
  }

  /**
   * Adds a custom type handler for encoding/decoding logic.
   * Ensures type placeholders are unique and adhere to conventions.
   */
  addType(type: Readonly<EJSONType>): this {
    assert.ok(
      !this.typeHandlers.has(type.placeholder),
      `type with ${type.placeholder} already taken.`,
    );

    assert.ok(
      type.placeholder.startsWith('$'),
      'type placeholder must starts with $ symbol.',
    );

    this.typeHandlers.set(type.placeholder, type);
    return this;
  }

  /**
   * Stringifies a JavaScript value using custom encoding logic.
   * @param {any} value - The value to encode and stringify.
   * @param {string | number} [space] - Optional space for pretty-printing.
   * @returns {string} - The JSON stringified value.
   */
  stringify(value: any, space?: string | number): string {
    return JSON.stringify(this.encode(value), undefined, space);
  }

  /**
   * Parses a JSON string using custom decoding logic.
   * @param {string} value - The JSON string to parse.
   * @returns {any} - The decoded JavaScript object.
   */
  parse(value: string): any {
    return JSON.parse(value, this.reviewerReady);
  }

  /** @internal */
  protected _replacer(value: any, key: string) {
    if (isPlainObject(value)) return;
    if (!isInfinity(value) && !isBigInt(value)) {
      if (isPrimitive(value)) return;
    }

    for (const type of this.typeHandlers.values()) {
      const res = type.encode(value, this.encode);

      if (res !== undefined) {
        return { [type.placeholder]: res };
      }
    }
  }

  /** @internal */
  protected _reviewer(_: string, value: any) {
    const key = firstKey(value);

    if (!key || key[0] !== '$') return value;

    const type = this.typeHandlers.get(key);

    if (type) {
      return type.decode(value[key]);
    }

    return value;
  }
}

function firstKey(value: unknown): string | null {
  if (!isObject(value)) return null;

  for (const key in value) {
    return key;
  }

  return null;
}
