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
   *
   * The leading `$` is replaced with `EJSON.placeholderPrefix` when the type is added.
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
  protected replacerReady: (value: any, key: PropertyKey | undefined) => any;

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

  /** @internal */
  protected _placeholderPrefix: string = '$';

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
   * The prefix every type placeholder is namespaced with, `$` by default.
   *
   * Type definitions declare their placeholder with the canonical `$` marker
   * ({@link EJSON.Type.Date} is `$date`), {@link EJSON.addType} substitutes this
   * prefix for it, so built-in types can be used with any prefix. Useful when
   * `$` keys are not allowed by the storage, e.g. MongoDB documents.
   *
   * Must be set before the first {@link EJSON.addType} call, otherwise already
   * added types would keep the previous prefix.
   *
   * @example
   * const ejson = createEJSON();
   *
   * ejson.placeholderPrefix = '_';
   * ejson.addType(EJSON.Type.Date);
   *
   * ejson.stringify({ at: new Date(0) }); // {"at":{"_date":0}}
   */
  get placeholderPrefix(): string {
    return this._placeholderPrefix;
  }

  set placeholderPrefix(value: string) {
    if (value === this._placeholderPrefix) return;

    assert.ok(
      typeof value === 'string' && value.length > 0,
      'placeholderPrefix must be a non-empty string.',
    );

    assert.ok(
      this.typeHandlers.size === 0,
      'placeholderPrefix cannot be changed after types were added.',
    );

    this._placeholderPrefix = value;
  }

  /**
   * Adds a custom type handler for encoding/decoding logic.
   * Ensures type placeholders are unique and adhere to conventions.
   */
  addType(type: Readonly<EJSONType>): this {
    const placeholder = this._resolvePlaceholder(type.placeholder);

    assert.ok(
      placeholder.startsWith(this._placeholderPrefix) &&
        placeholder.length > this._placeholderPrefix.length,
      `type placeholder must starts with "${this._placeholderPrefix}"`,
    );

    assert.ok(
      !this.typeHandlers.has(placeholder),
      `type with ${placeholder} already taken.`,
    );

    this.pure = false;
    this.typeHandlers.set(
      placeholder,
      placeholder === type.placeholder ? type : { ...type, placeholder },
    );
    return this;
  }

  /**
   * Substitutes the canonical `$` marker of a type definition with the
   * configured prefix. Placeholders already using the prefix are left as is.
   *
   * @internal
   */
  protected _resolvePlaceholder(placeholder: string): string {
    if (placeholder.startsWith(this._placeholderPrefix)) return placeholder;

    if (placeholder.startsWith('$')) {
      return this._placeholderPrefix + placeholder.slice(1);
    }

    return placeholder;
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
  parse<T = any>(value: string): T {
    if (this.pure) {
      return JSON.parse(value);
    }

    return JSON.parse(value, this.reviewerReady);
  }

  /** @internal */
  protected _replacer(value: any, key: PropertyKey | undefined) {
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

    if (!key) return value;

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
