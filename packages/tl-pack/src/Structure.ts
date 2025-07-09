import { type Data, assert, crc32, noop } from '@andrew_l/toolkit';
import { BinaryReader, type BinaryReaderOptions } from './BinaryReader';
import { BinaryWriter, type BinaryWriterOptions } from './BinaryWriter';
import { CORE_TYPES } from './constants';
import type { DecodeHandler, EncodeHandler, TLExtension } from './extension';

interface CompiledStructure {
  id: number;
  encodeFns: EncodeFn[];
  decodeFns: DecodeFn[];
  structures: Structure.Constructor[];
  estimatedSizeBytes: number;
}

type EncodeFn = (this: BinaryWriter, value: any) => void;
type DecodeFn = (this: BinaryReader, result: any) => void;

type TypeHandler = {
  encode: (this: BinaryWriter, value: any, key: string) => void;
  decode: (this: BinaryReader, result: any, key: string) => void;
  estimatedSizeBytes: number;
};

export interface DefineStructureOptions<
  Props extends Structure.ObjectPropsOptions,
> {
  /**
   * Unique name of binary structure
   */
  readonly name: string;

  /**
   * Version of binary structure
   */
  readonly version: number;

  /**
   * Binary structure properties
   */
  readonly properties: Props;

  /**
   * Write checksum to verify decoded data
   * @default false
   */
  readonly checksum?: boolean;
}

const CONSTRUCTOR_OPTIONAL = 0x62016eac;
const CONSTRUCTOR_OPTIONAL_NULL = 0x22016eac;

const TYPE_HANDLERS: Record<string | number, TypeHandler> = {
  ['unknown']: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeObject(value[key]);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readObject();
    },
    estimatedSizeBytes: 0,
  },
  [CORE_TYPES.Map]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeMap(value[key]);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readMap(false);
    },
    estimatedSizeBytes: 0,
  },
  [CORE_TYPES.Binary]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeBytes(value[key]);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readBytes();
    },
    estimatedSizeBytes: 0,
  },
  [CORE_TYPES.Vector]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeVector(value[key]);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readVector(false);
    },
    estimatedSizeBytes: 0,
  },
  [Boolean.name]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeBool(value[key]);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readBool();
    },
    estimatedSizeBytes: 1,
  },
  [CORE_TYPES.Int8]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeInt8(value[key], true);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readInt8(true);
    },
    estimatedSizeBytes: 1,
  },
  [CORE_TYPES.Int16]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeInt16(value[key], true);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readInt16(true);
    },
    estimatedSizeBytes: 2,
  },
  [CORE_TYPES.Int32]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeInt32(value[key], true);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readInt32(true);
    },
    estimatedSizeBytes: 4,
  },
  [CORE_TYPES.Int64]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeInt64(value[key], true);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readInt64(true);
    },
    estimatedSizeBytes: 8,
  },
  [CORE_TYPES.UInt8]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeInt8(value[key], false);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readInt8(false);
    },
    estimatedSizeBytes: 1,
  },
  [CORE_TYPES.UInt16]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeInt16(value[key], false);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readInt16(false);
    },
    estimatedSizeBytes: 2,
  },
  [CORE_TYPES.UInt32]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeInt32(value[key], false);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readInt32(false);
    },
    estimatedSizeBytes: 4,
  },
  [CORE_TYPES.UInt64]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeInt64(value[key], false);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readInt64(false);
    },
    estimatedSizeBytes: 8,
  },
  [CORE_TYPES.Double]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeDouble(value[key]);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readDouble();
    },
    estimatedSizeBytes: 8,
  },
  [CORE_TYPES.Date]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeDate(value[key]);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readDate();
    },
    estimatedSizeBytes: 8,
  },
  [CORE_TYPES.String]: {
    encode: function (this: BinaryWriter, value: any, key: string): void {
      this.writeString(value[key]);
    },
    decode: function (this: BinaryReader, result: any, key: string): void {
      result[key] = this.readString();
    },
    estimatedSizeBytes: 0,
  },
};

TYPE_HANDLERS[Number.name] = TYPE_HANDLERS[CORE_TYPES.Double];
TYPE_HANDLERS[String.name] = TYPE_HANDLERS[CORE_TYPES.String];
TYPE_HANDLERS[Object.name] = TYPE_HANDLERS[CORE_TYPES.Map];
TYPE_HANDLERS[Uint8Array.name] = TYPE_HANDLERS[CORE_TYPES.Binary];
TYPE_HANDLERS[Array.name] = TYPE_HANDLERS[CORE_TYPES.Vector];
TYPE_HANDLERS[Date.name] = TYPE_HANDLERS[CORE_TYPES.Date];

function compileStructure(
  name: string,
  version: number,
  properties: Structure.ObjectPropsOptions,
  checksum: boolean,
): CompiledStructure {
  const encodeFns: EncodeFn[] = [];
  const decodeFns: DecodeFn[] = [];
  const structures: Structure.Constructor[] = [];
  const structureId = crc32(name) >>> 0;

  let estimatedSizeBytes = 1;

  // Version handling
  encodeFns.push(function (this: BinaryWriter): void {
    this.writeByte(version);
  });

  decodeFns.push(function (this: BinaryReader): void {
    const ver = this.readByte();
    assert.ok(
      version === ver,
      `Structure ${structureId} version mismatch: expected ${version}, got ${ver}`,
    );
  });

  // Property handling - optimized loop
  const entries = Object.entries(properties);
  const entriesLength = entries.length;

  for (let i = 0; i < entriesLength; i++) {
    const [key, prop] = entries[i];
    const isRequired = prop.required === true;
    const isArray = Array.isArray(prop.type);
    const propType = Array.isArray(prop.type) ? prop.type[0] : prop.type;

    if (isStructureType(propType)) {
      encodeFns.push(
        createStructureEncoder(key, propType, isRequired, isArray),
      );
      decodeFns.push(createStructureDecoder(key, isRequired, isArray));
      estimatedSizeBytes += propType.estimatedSizeBytes;
      structures.push(propType);
      continue;
    }

    // Handle primitive types
    const typeName =
      (propType as Function)?.name ||
      (propType === null ? 'unknown' : propType);
    const handler = TYPE_HANDLERS[typeName as keyof typeof TYPE_HANDLERS];

    if (handler) {
      encodeFns.push(
        createBoundEncoder(handler.encode, key, isRequired, isArray),
      );
      decodeFns.push(
        createBoundDecoder(handler.decode, key, isRequired, isArray),
      );
      estimatedSizeBytes += handler.estimatedSizeBytes;
    } else {
      throw new Error(`Unsupported property type: ${typeName || 'unknown'}`);
    }
  }

  if (checksum) {
    estimatedSizeBytes += 4;

    encodeFns.push(function (this: BinaryWriter): void {
      this.writeChecksum(false);
    });

    decodeFns.push(function (this: BinaryReader): void {
      this.readChecksum(false);
    });
  }

  const compiled: CompiledStructure = {
    id: structureId,
    encodeFns,
    decodeFns,
    structures,
    estimatedSizeBytes,
  };

  return compiled;
}

function isStructureType(type: any): type is Structure.Constructor {
  return type?.prototype && Structure.prototype.isPrototypeOf(type.prototype);
}

function createStructureEncoder(
  key: string,
  StructureCtor: Structure.Constructor,
  isRequired: boolean,
  isArray: boolean,
): EncodeFn {
  return function (this: BinaryWriter, value: any): void {
    const hasValue = value[key] !== undefined && value[key] !== null;

    if (!hasValue) {
      assert.ok(!isRequired, `Required property "${key}" is missing or null`);

      if (value[key] === null) {
        this.writeInt32(CONSTRUCTOR_OPTIONAL_NULL);
      } else {
        this.writeInt32(CONSTRUCTOR_OPTIONAL);
      }
    } else if (isArray) {
      const arr = value[key];

      assert.array(arr, `Expected property "${key}" to be array.`);

      this.writeLength(arr.length);

      for (let idx = 0; idx < arr.length; idx++) {
        this.writeStructure(
          (arr as any[])[idx] instanceof Structure
            ? (arr as any[])[idx]
            : new StructureCtor(arr[idx]),
        );
      }
    } else {
      this.writeStructure(
        value[key] instanceof Structure
          ? value[key]
          : new StructureCtor(value[key]),
      );
    }
  };
}

function createStructureDecoder(
  key: string,
  isRequired: boolean,
  isArray: boolean,
): DecodeFn {
  return function (this: BinaryReader, result: any): void {
    let shouldRead = true;

    if (!isRequired) {
      shouldRead = !readMaybeInt32(this, CONSTRUCTOR_OPTIONAL);

      if (shouldRead && readMaybeInt32(this, CONSTRUCTOR_OPTIONAL_NULL)) {
        result[key] = null;
        return;
      }
    }

    if (shouldRead) {
      if (isArray) {
        const length = this.readLength();
        const arrResult = Array.from({ length });

        for (let idx = 0; idx < length; idx++) {
          arrResult[idx] = this.readStructure(false);
        }

        result[key] = arrResult;
      } else {
        result[key] = this.readStructure(false);
      }
    }
  };
}

function readMaybeInt32(reader: BinaryReader, expectedValue: number): boolean {
  let result = false;

  if (reader.length >= reader.offset + 4) {
    result = reader.readInt32() === expectedValue;

    // Make offset back when null constructor not detected
    if (!result) {
      reader.offset -= 4;
    }
  }

  return result;
}

function createBoundEncoder(
  encodeFn: Function,
  key: string,
  isRequired: boolean,
  isArray: boolean,
): EncodeFn {
  return function (this: BinaryWriter, value: any): void {
    const hasValue = value[key] !== undefined && value[key] !== null;

    if (!hasValue) {
      assert.ok(!isRequired, `Required property "${key}" is missing or null`);

      if (value[key] === null) {
        this.writeInt32(CONSTRUCTOR_OPTIONAL_NULL);
      } else {
        this.writeInt32(CONSTRUCTOR_OPTIONAL);
      }
    } else if (isArray) {
      const arr = value[key];

      assert.array(arr, `Expected property "${key}" to be array.`);

      this.writeLength(arr.length);

      for (let idx = 0; idx < arr.length; idx++) {
        encodeFn.call(this, arr, idx);
      }
    } else {
      encodeFn.call(this, value, key);
    }
  };
}

function createBoundDecoder(
  decodeFn: Function,
  key: string,
  isRequired: boolean,
  isArray: boolean,
): DecodeFn {
  return function (this: BinaryReader, result: any): void {
    let shouldRead = true;

    if (!isRequired) {
      shouldRead = !readMaybeInt32(this, CONSTRUCTOR_OPTIONAL);

      if (shouldRead && readMaybeInt32(this, CONSTRUCTOR_OPTIONAL_NULL)) {
        result[key] = null;
        return;
      }
    }

    if (shouldRead) {
      if (isArray) {
        const length = this.readLength();
        const arrResult = Array.from({ length });

        for (let idx = 0; idx < length; idx++) {
          decodeFn.call(this, arrResult, idx);
        }

        result[key] = arrResult;
      } else {
        decodeFn.call(this, result, key);
      }
    }
  };
}

/**
 * Create binary structure definition with type safety and performance optimization
 *
 * @example
 * // Define a user structure
 * const User = defineStructure({
 *   name: 'User',
 *   version: 1,
 *   checksum: true,
 *   properties: {
 *     id: { type: Number, required: true },
 *     name: { type: String, required: true },
 *     email: { type: String, required: false },
 *     isActive: { type: Boolean, required: true },
 *     createdAt: { type: Date, required: true },
 *     tags: { type: Array, required: false }
 *   }
 * });
 *
 * // Create and serialize a user
 * const user = new User({
 *   id: 123,
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   isActive: true,
 *   createdAt: new Date(),
 *   tags: ['admin', 'verified']
 * });
 *
 * const buffer = user.toBuffer();
 * const restored = User.fromBuffer(buffer);
 *
 * @example
 * // Define nested structures
 * const Address = defineStructure({
 *   name: 'Address',
 *   version: 1,
 *   properties: {
 *     street: { type: String, required: true },
 *     city: { type: String, required: true },
 *     zipCode: { type: String, required: true }
 *   }
 * });
 *
 * const Person = defineStructure({
 *   name: 'Person',
 *   version: 1,
 *   properties: {
 *     name: { type: String, required: true },
 *     address: { type: Address, required: false }
 *   }
 * });
 *
 * @example
 * // Using with complex data types
 * const GameState = defineStructure({
 *   name: 'GameState',
 *   version: 2,
 *   checksum: true,
 *   properties: {
 *     playerData: { type: Object, required: true },      // Untrusted data
 *     screenshot: { type: Uint8Array, required: false }, // Binary data
 *     timestamp: { type: Date, required: true },
 *     metadata: { type: Object, required: false }
 *   }
 * });
 *
 * @group Main
 */
export function defineStructure<
  PropsOptions extends Structure.ObjectPropsOptions,
  T extends Data = Structure.ExtractPropTypes<PropsOptions>,
>({
  name,
  properties,
  version,
  checksum = false,
}: DefineStructureOptions<PropsOptions>): Structure.Constructor<T> {
  const compiled = compileStructure(name, version, properties, checksum);

  return class DefinedStructure extends Structure<T> {
    static readonly estimatedSizeBytes = compiled.estimatedSizeBytes;
    static readonly structures = compiled.structures;
    static readonly extension: TLExtension<T> = {
      token: compiled.id,

      encode(this: BinaryWriter, value: T): void {
        const fns = compiled.encodeFns;
        const length = fns.length;

        for (let i = 0; i < length; i++) {
          fns[i].call(this, value);
        }
      },

      decode(this: BinaryReader): T {
        const result: Record<string, any> = {};
        const fns = compiled.decodeFns;
        const length = fns.length;

        for (let i = 0; i < length; i++) {
          fns[i].call(this, result);
        }

        return result as T;
      },
    };
  } as Structure.Constructor<T>;
}

export class Structure<T extends Data = Data>
  implements Structure.Structure<T>
{
  public readonly value: T;

  constructor(value: T) {
    this.value = value;
  }

  toBuffer(options?: BinaryWriterOptions): Uint8Array {
    const ctor = this.constructor as Structure.Constructor;
    const writer = new BinaryWriter(options);

    ctor.extension.encode.call(writer, this.value);
    return writer.getBuffer();
  }

  static fromBuffer(
    buffer: Uint8Array,
    options: BinaryReaderOptions = {},
  ): Data {
    const reader = new BinaryReader(buffer, {
      ...options,
      structures: options.structures
        ? this.structures.concat(options.structures)
        : this.structures,
    });

    return this.extension.decode.call(reader);
  }

  static readonly estimatedSizeBytes: number = -1;

  static readonly structures: Structure.Constructor[] = [];

  static readonly extension: TLExtension = {
    token: CORE_TYPES.Binary,
    encode: noop,
    decode: noop,
  };
}

export namespace Structure {
  export interface Options<T extends Data = Data> {
    readonly encode: EncodeHandler<T>;
    readonly decode: DecodeHandler<T>;
  }

  export interface Structure<T extends Data = Data> {
    /**
     * The structured data value
     * @type {T}
     * @readonly
     *
     * @example
     * const user = new UserStruct({ id: 1, name: 'Alice' });
     * console.log(user.value.name); // 'Alice'
     */
    readonly value: T;

    /**
     * Serializes the structure to a binary buffer
     *
     * @param {BinaryWriterOptions} [options] - Writer configuration options
     * @returns {Uint8Array} Serialized binary data
     *
     * @example
     * const user = new User({ id: 1, name: 'Alice' });
     * const buffer = user.toBuffer();
     * console.log(buffer.length); // Size in bytes
     *
     * @example
     * // With custom writer options
     * const buffer = user.toBuffer({
     *   initialSize: 1024,
     *   growthFactor: 2
     * });
     */
    toBuffer(options?: BinaryWriterOptions): Uint8Array;
  }

  /**
   * Base Structure class for binary serialization with type safety
   *
   * @template T - Data type extending Data interface
   *
   * @example
   * // Direct usage (not recommended, use defineStructure instead)
   * class CustomStruct extends Structure<{id: number, name: string}> {
   *   // Custom implementation
   * }
   *
   * @example
   * // Typical usage through defineStructure
   * const MyStruct = defineStructure({
   *   name: 'MyStruct',
   *   version: 1,
   *   properties: { id: { type: Number, required: true } }
   * });
   *
   * const instance = new MyStruct({ id: 42 });
   * console.log(instance.value.id); // 42
   */
  export interface Constructor<T extends Data = any> {
    /**
     * Creates a new Structure instance
     *
     * @param {T} value - The data to structure
     *
     * @example
     * const data = { id: 123, name: 'Test' };
     * const struct = new MyStructure(data);
     */
    new (value: T): Structure<T>;

    /**
     * Deserializes a structure from a binary buffer
     *
     * @param {Uint8Array} buffer - Binary data to deserialize
     * @param {BinaryReaderOptions} [options] - Reader configuration options
     * @returns {Data} Deserialized structure data
     *
     * @example
     * const buffer = user.toBuffer();
     * const restored = User.fromBuffer(buffer);
     * console.log(restored.id); // Original user ID
     */
    fromBuffer(buffer: Uint8Array, options?: BinaryReaderOptions): T;

    /**
     * Estimated size of bytes
     */
    readonly estimatedSizeBytes: number;

    /**
     * Nested structures defining encoding/decoding behavior
     */
    readonly structures: Constructor[];

    /**
     * Structure extension defining encoding/decoding behavior
     */
    readonly extension: TLExtension;
  }

  type PropConstructor<T = any> =
    | { new (...args: any[]): T & {} }
    | { (): T }
    | PropMethod<T>;

  type PropMethod<T, TConstructor = any> = [T] extends [
    ((...args: any) => any) | undefined,
  ] // if is function with args, allowing non-required functions
    ? { new (): TConstructor; (): T; readonly prototype: TConstructor } // Create Function like constructor
    : never;

  // Fixed OptionalKeys to properly detect optional properties
  type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;

  type RequiredKeys<T> = {
    [K in keyof T]: T[K] extends { required: true } ? K : never;
  }[keyof T];

  type Prop<T> = PropOptions<T> | PropType<T>;

  type CoreInt =
    | CORE_TYPES.Int8
    | CORE_TYPES.Int16
    | CORE_TYPES.Int32
    | CORE_TYPES.UInt8
    | CORE_TYPES.UInt16
    | CORE_TYPES.UInt32
    | CORE_TYPES.Float
    | CORE_TYPES.Double;

  type InferPropType<T, NullAsAny = true> = [T] extends [null]
    ? NullAsAny extends true
      ? any
      : null
    : [T] extends [{ type: null }]
      ? any // As TS issue https://github.com/Microsoft/TypeScript/issues/14829 // somehow `ObjectConstructor` when inferred from { (): T } becomes `any` // `BooleanConstructor` when inferred from PropConstructor(with PropMethod) becomes `Boolean`
      : [T] extends [{ type: [null] }]
        ? any[]
        : [T] extends [{ type: ObjectConstructor | CORE_TYPES.Map }]
          ? Record<string, any>
          : [T] extends [{ type: CoreInt }]
            ? number
            : [T] extends [{ type: CORE_TYPES.String }]
              ? string
              : [T] extends [{ type: CORE_TYPES.Vector }]
                ? unknown[]
                : [T] extends [{ type: CORE_TYPES.Binary }]
                  ? Uint8Array
                  : [T] extends [{ type: BooleanConstructor }]
                    ? boolean
                    : [T] extends [{ type: DateConstructor | CORE_TYPES.Date }]
                      ? Date
                      : [T] extends [
                            {
                              type: CORE_TYPES.UInt64 | CORE_TYPES.Int64;
                            },
                          ]
                        ? bigint
                        : [T] extends [{ type: Constructor<infer U> }]
                          ? U
                          : [T] extends [{ type: [infer U] }]
                            ? U extends DateConstructor
                              ? Date[]
                              : U extends Constructor<infer V>
                                ? V[]
                                : InferPropType<U, false>[]
                            : [T] extends [{ type: (infer U)[] }]
                              ? U extends DateConstructor
                                ? Date | InferPropType<U, false>
                                : InferPropType<U, false>
                              : [T] extends [Prop<infer V>]
                                ? V
                                : T;

  export type ObjectPropsOptions<P = Data> = {
    readonly [K in keyof P]: PropOptions<P[K]>;
  };

  export interface PropOptions<T = any> {
    type: PropType<T> | null | [null];
    required?: boolean;
  }

  export type PropType<T> =
    | PropConstructor<T>
    | [PropConstructor<T>]
    | CORE_TYPES
    | [CORE_TYPES];

  export type ExtractType<T extends Constructor> =
    T extends Constructor<infer U> ? U : never;

  export type ExtractPropTypes<O> = {
    // use `keyof Pick<O, RequiredKeys<O>>` instead of `RequiredKeys<O>` to
    // support IDE features
    [K in keyof Pick<O, RequiredKeys<O>>]: O[K] extends { default: any }
      ? Exclude<InferPropType<O[K]>, undefined>
      : InferPropType<O[K]>;
  } & {
    // use `keyof Pick<O, OptionalKeys<O>>` instead of `OptionalKeys<O>` to
    // support IDE features
    [K in keyof Pick<O, OptionalKeys<O>>]?: InferPropType<O[K]> | null;
  };
}
