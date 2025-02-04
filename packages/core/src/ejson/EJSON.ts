import { assert } from '@/assert';
import {
  isBigInt,
  isInfinity,
  isObject,
  isPlainObject,
  isPrimitive,
} from '@/is';
import { deepCloneWith } from '@/object/deepCloneWith';
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
   * Should encoded value inlined to original key
   */
  encodeInline?: boolean;

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

  /** @internal */
  protected pure: boolean = true;

  protected _vendorName: string | null = null;

  /**
   * MIME type based on the provided vendor name or defaults to 'application/json'.
   */
  public mimetype: string = 'application/json';

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
   * The vendor name used for the custom MIME type definition.
   * If null, defaults to 'application/json'.
   */
  get vendorName(): string | null {
    return this._vendorName;
  }

  set vendorName(value: string | null) {
    this._vendorName = value;

    if (!value) {
      this.mimetype = 'application/json';
    } else {
      const vendorName = value
        .split(' ')
        .map(v => v.toLowerCase())
        .join('.')
        .replace(/\.\.+/g, '.')
        .replace(/\.$/, '');

      this.mimetype = `application/vnd.${vendorName}+json`;
    }
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

    this.pure = false;
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
    if (this.pure) {
      return JSON.stringify(value, undefined, space);
    }

    return JSON.stringify(this.encode(value), undefined, space);
  }

  /**
   * Parses a JSON string using custom decoding logic.
   * @param {string} value - The JSON string to parse.
   * @returns {any} - The decoded JavaScript object.
   */
  parse(value: string): any {
    if (this.pure) {
      return JSON.parse(value);
    }

    return JSON.parse(value, this.reviewerReady);
  }

  /** @internal */
  protected _replacer(value: any, key: string) {
    // deep object check
    if (isPlainObject(value)) return;
    // deep array check
    if (Array.isArray(value)) return;
    // exclude primitive
    if (!isInfinity(value) && !isBigInt(value)) {
      if (isPrimitive(value)) return;
    }

    for (const type of this.typeHandlers.values()) {
      const res = type.encode(value, this.encode);

      if (res !== undefined) {
        return type.encodeInline ? res : { [type.placeholder]: res };
      }
    }

    return value;
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
