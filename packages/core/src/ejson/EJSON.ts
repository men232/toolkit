import { assert } from '@/assert';
import { isObject } from '@/is';
import {
  BigIntType,
  BinaryType,
  DateType,
  ErrorType,
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

  /**
   * Same handlers as {@link typeHandlers} in insertion order, kept as an
   * array so the hot encode loop does not allocate a Map iterator per value.
   *
   * @internal
   */
  protected typeList: Readonly<EJSONType>[] = [];

  /** @internal */
  protected decodeReady: (value: any) => any;

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
    Error: ErrorType,
  } as const;

  constructor() {
    this.decodeReady = this._decodeValue.bind(this);
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

    const resolved =
      placeholder === type.placeholder ? type : { ...type, placeholder };

    this.pure = false;
    this.typeHandlers.set(placeholder, resolved);
    this.typeList.push(resolved);
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
   * Encodes a value on the object level, without going through a JSON string.
   *
   * Arrays and plain objects (prototype is `Object.prototype` or `null`) are
   * walked recursively, the input is never mutated. Containers that hold an
   * encoded value somewhere below are shallow copied on the way up, subtrees
   * without any registered type are returned as the same reference. Every other
   * value is offered to the registered types in the order they were added, the
   * first `encode` returning something other than `undefined` wins and the
   * value is replaced with `{ [placeholder]: encoded }` (or inlined when the
   * type has `encodeInline`). A value no type claims stays the same reference,
   * class instances are neither unwrapped nor copied field by field.
   *
   * That makes the result safe to store where the storage understands some
   * types natively (e.g. MongoDB `Mixed` with `Date`, `ObjectId`, `Buffer`)
   * while only the registered ones are turned into placeholders.
   *
   * The result of `encode` is itself a valid input: encoding it again returns
   * a structurally equal value, placeholders are plain objects and are not
   * wrapped twice.
   *
   * Circular structures are not supported and throw a `TypeError`, the same
   * way `JSON.stringify` does. Repeated (non circular) references are fine and
   * are encoded once per occurrence.
   *
   * @example
   * const ejson = createEJSON();
   * ejson.placeholderPrefix = '__@';
   * ejson.addType(EJSON.Type.Error);
   *
   * ejson.encode({ at: new Date(0), err: new Error('boom') });
   * // { at: Date(0), err: { '__@error': { name: 'Error', message: 'boom' } } }
   */
  encode<T = unknown>(value: T): unknown {
    const seen = new Set<object>();
    const encode = (value: any): any => this._encodeValue(value, seen, encode);

    return encode(value);
  }

  /**
   * Reverse of {@link EJSON.encode}.
   *
   * Arrays and plain objects are walked recursively (inner values first). A
   * plain object with exactly one key equal to a registered placeholder is
   * replaced with `type.decode(innerValue)`. Containers are copied only when
   * something below them was decoded, everything else is returned as is, the
   * same reference.
   *
   * Note that a plain object of the shape `{ [placeholder]: ... }` is
   * indistinguishable from an encoded value and will be unwrapped. That is the
   * accepted cost of placeholders, pick a `placeholderPrefix` that cannot
   * collide with real keys when this matters. An object with a placeholder key
   * among other keys is kept untouched.
   */
  decode<T = unknown>(value: unknown): T {
    return this._decodeValue(value);
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
   *
   * Implemented as `JSON.parse` followed by {@link EJSON.decode}, which is
   * several times faster than a `JSON.parse` reviver and shares the exact
   * decoding semantics with `decode`.
   *
   * @param {string} value - The JSON string to parse.
   * @returns {any} - The decoded JavaScript object.
   */
  parse<T = any>(value: string): T {
    if (this.pure) {
      return JSON.parse(value);
    }

    return this._decodeValue(JSON.parse(value));
  }

  /** @internal */
  protected _encodeValue(
    value: any,
    seen: Set<object>,
    encode: (value: any) => any,
  ): any {
    switch (typeof value) {
      // Only `Infinity` / `-Infinity` can be claimed by a type.
      case 'number':
        if (value !== Infinity && value !== -Infinity) return value;
        break;
      case 'bigint':
      case 'object':
        break;
      // string, boolean, undefined, symbol, function: nothing to encode.
      default:
        return value;
    }

    if (value === null) return value;

    if (Array.isArray(value)) {
      enter(seen, value);

      let result: any[] | null = null;

      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        const encoded = encode(item);

        if (result !== null) {
          result[i] = encoded;
        } else if (encoded !== item) {
          result = value.slice(0, i);
          result[i] = encoded;
        }
      }

      seen.delete(value);
      return result ?? value;
    }

    if (isPlainObjectLike(value)) {
      enter(seen, value);

      const result = copyOnWrite(value, encode);

      seen.delete(value);
      return result;
    }

    const types = this.typeList;

    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const res = type.encode(value, encode);

      if (res !== undefined) {
        return type.encodeInline ? res : { [type.placeholder]: res };
      }
    }

    return value;
  }

  /** @internal */
  protected _decodeValue(value: any): any {
    if (typeof value !== 'object' || value === null) return value;

    if (Array.isArray(value)) {
      let result: any[] | null = null;

      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        const decoded = this._decodeValue(item);

        if (result !== null) {
          result[i] = decoded;
        } else if (decoded !== item) {
          result = value.slice(0, i);
          result[i] = decoded;
        }
      }

      return result ?? value;
    }

    if (isPlainObjectLike(value)) {
      return this._unwrap(copyOnWrite(value, this.decodeReady));
    }

    return value;
  }

  /**
   * Replaces `{ [placeholder]: inner }` with `type.decode(inner)`, `inner` is
   * expected to be already decoded (the walker decodes inner values first).
   *
   * @internal
   */
  protected _unwrap(value: any): any {
    const key = singleKey(value);

    if (key === null) return value;

    const type = this.typeHandlers.get(key);

    return type ? type.decode(value[key]) : value;
  }
}

/**
 * Returns the only own enumerable key of a plain object, `null` when the
 * object has zero or more than one key or is not an object.
 */
function singleKey(value: unknown): string | null {
  if (!isObject(value)) return null;

  let found: string | null = null;

  for (const key in value) {
    if (found !== null) return null;
    found = key;
  }

  return found;
}

/**
 * Plain object check used by the walker: prototype is `Object.prototype` or
 * `null`. Class instances and exotic objects are left to the type handlers.
 */
function isPlainObjectLike(value: unknown): value is Record<string, any> {
  if (typeof value !== 'object' || value === null) return false;

  const proto = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
}

/**
 * Maps own enumerable values of a plain object with `fn`. Returns the same
 * object when no value changed, a shallow copy with the mapped values
 * otherwise, so untouched subtrees are not reallocated.
 */
function copyOnWrite(
  value: Record<string, any>,
  fn: (value: any) => any,
): Record<string, any> {
  const keys = Object.keys(value);
  let result: Record<string, any> | null = null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const item = value[key];
    const mapped = fn(item);

    if (result !== null) {
      setOwn(result, key, mapped);
    } else if (mapped !== item) {
      result = {};

      for (let j = 0; j < i; j++) {
        setOwn(result, keys[j], value[keys[j]]);
      }

      setOwn(result, key, mapped);
    }
  }

  return result ?? value;
}

/**
 * Plain assignment of a `__proto__` key would change the prototype of the
 * copy instead of creating an own property (JSON.parse does produce such
 * keys), so that one key goes through `defineProperty`.
 */
function setOwn(target: Record<string, any>, key: string, value: any) {
  if (key === '__proto__') {
    Object.defineProperty(target, key, {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
  } else {
    target[key] = value;
  }
}

function enter(seen: Set<object>, value: object) {
  if (seen.has(value)) {
    throw new TypeError('Converting circular structure to EJSON');
  }

  seen.add(value);
}
