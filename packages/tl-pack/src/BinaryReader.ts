import type { Data } from '@andrew_l/toolkit';
import pako from 'pako';
import type { Structure } from './Structure';
import { CORE_TYPES } from './constants';
import { Dictionary } from './dictionary';
import type { TLExtension } from './extension';
import { float32, float64, int32, utf8Read } from './helpers';

const NOOP_DICTIONARY = new Dictionary();

export interface BinaryReaderOptions {
  dictionary?: string[] | Dictionary;
  extensions?: TLExtension[];
  structures?: Structure.Constructor[];
}

export class BinaryReader {
  private target: Uint8Array;
  private _last?: any;
  private _lastObject?: any;
  private dictionary?: Dictionary;
  private dictionaryExtended: Dictionary;
  private extensions: Map<number, TLExtension>;
  private structures: Map<number, Structure.Constructor>;
  private _repeat?: { pool: number; value: any };
  private _checksumOffset: number;
  offset: number;
  length: number;

  /**
   * Small utility class to read binary data.
   */
  constructor(
    data: Uint8Array,
    {
      dictionary = NOOP_DICTIONARY,
      extensions,
      structures,
    }: BinaryReaderOptions = {},
  ) {
    this.target = data;
    this.offset = 0;
    this._checksumOffset = 0;
    this.length = data.length;
    this.extensions = new Map();
    this.structures = new Map();

    if (extensions) {
      for (const ext of extensions) {
        this.extensions.set(ext.token, ext);
      }
    }

    if (structures) {
      for (const struct of structures) {
        this.structures.set(struct.extension.token, struct);
      }
    }

    if (Array.isArray(dictionary)) {
      this.dictionary = new Dictionary(dictionary);
    } else {
      this.dictionary = dictionary;
    }

    this.dictionaryExtended = new Dictionary(undefined, this.dictionary.size);
  }

  readByte() {
    this.assertRead(1);
    this._last = this.target[this.offset++];

    return this._last as number;
  }

  readInt64(signed = true): bigint {
    const low32 = this.readInt32(signed);
    const high32 = this.readInt32(signed);

    this._last = (BigInt(high32) << 32n) | BigInt(low32);

    return this._last as bigint;
  }

  readInt32(signed = true) {
    this.assertRead(4);

    this._last =
      this.target[this.offset++] |
      (this.target[this.offset++] << 8) |
      (this.target[this.offset++] << 16) |
      (this.target[this.offset++] << 24);

    if (!signed) {
      this._last = this._last >>> 0;
    }

    return this._last as number;
  }

  readInt16(signed = true) {
    this.assertRead(2);

    this._last = this.target[this.offset++] | (this.target[this.offset++] << 8);

    if (signed) {
      this._last = (this._last << 16) >> 16;
    }

    return this._last as number;
  }

  readInt8(signed = true) {
    this.assertRead(1);

    this._last = this.target[this.offset++];

    if (signed) {
      this._last = (this._last << 24) >> 24;
    }

    return this._last as number;
  }

  /**
   * Reads a real floating point (4 bytes) value.
   * @returns {number}
   */
  readFloat() {
    this.assertRead(4);

    int32[0] = this.readInt32();
    this._last = float32[0];

    return this._last as number;
  }

  /**
   * Reads a real floating point (8 bytes) value.
   * @returns {BigInteger}
   */
  readDouble() {
    this.assertRead(8);

    int32[0] = this.readInt32();
    int32[1] = this.readInt32();
    this._last = float64[0];

    return this._last as number;
  }

  /**
   * Throws error if provided length cannot be read from buffer
   * @param length {number}
   */
  assertRead(length: number): void {
    if (this.length < this.offset + +length) {
      const left = this.target.length - this.offset;
      const result = this.target.subarray(this.offset, this.offset + left);

      const err = new Error(
        `No more data left to read (need ${length}, got ${left}: ${result}); last read ${this._last}`,
      );

      (err as any).incomplete = true;

      Error.captureStackTrace(err, this.assertRead);

      throw err;
    }
  }

  assertConstructor(constructorId: CORE_TYPES): void {
    const byte = this.readByte();

    if (byte !== constructorId) {
      throw new Error(
        `Invalid constructor code, expected = ${CORE_TYPES[constructorId]}, got = ${
          CORE_TYPES[byte] || byte
        }, offset = ${this.offset - 1}`,
      );
    }
  }

  /**
   * Gets the byte array representing the current buffer as a whole.
   */
  getBuffer(): Uint8Array {
    return this.target;
  }

  readNull(): null {
    const value = this.readByte();

    if (value === CORE_TYPES.Null) {
      return null;
    }

    throw new Error(`Invalid boolean code ${value.toString(16)}`);
  }

  readLength(): number {
    const firstByte = this.readByte();

    if (firstByte === 254) {
      return this.readByte() | (this.readByte() << 8) | (this.readByte() << 16);
    }

    return firstByte;
  }

  readAll(): any[] {
    const result: any[] = [];

    while (this.length > this.offset) {
      result.push(this.readObject());
    }

    return result;
  }

  readBytes(): Uint8Array {
    const length = this.readLength();

    this.assertRead(length);

    const bytes = this.target.subarray(this.offset, this.offset + length);

    this.offset += bytes.length;

    this._last = bytes;

    return bytes;
  }

  /**
   * Reads encoded string.
   */
  readString(): string {
    const length = this.readLength();

    this.assertRead(length);

    const result = utf8Read(this.target, length, this.offset);

    this.offset += length;

    this._last = result;

    return result;
  }

  /**
   * Reads a boolean value.
   */
  readBool(): boolean {
    const value = this.readByte();

    if (value === CORE_TYPES.BoolTrue) {
      return true;
    } else if (value === CORE_TYPES.BoolFalse) {
      return false;
    } else {
      throw new Error(`Invalid boolean code ${value.toString(16)}`);
    }
  }

  /**
   * Reads and converts Unix time
   * into a Javascript {Date} object.
   */
  readDate(): Date {
    const value = this.readDouble();

    return new Date(value);
  }

  readStructure<T extends Data = Data>(checkConstructor: boolean = true): T {
    if (checkConstructor) {
      this.assertConstructor(CORE_TYPES.Structure);
    }

    const structureId = this.readInt32(false);
    const struct = this.structures.get(structureId);

    if (!struct) {
      throw new Error(
        `Unknown structure id = ${structureId}, offset = ${this.offset - 1}`,
      );
    }

    return struct.extension.decode.call(this);
  }

  /**
   * Reads a object.
   */
  readObject(): any {
    if (this._repeat) {
      if (this._repeat.pool > 0) {
        --this._repeat.pool;
        return this._repeat.value;
      } else {
        this._repeat = undefined;
      }
    }

    const constructorId = this.readByte();
    const ext = this.extensions.get(constructorId);

    let value: any;

    if (ext) {
      value = ext.decode.call(this);
    } else {
      value = this._lastObject = this.readCore(constructorId);
    }

    return value;
  }

  readObjectGzip(): any {
    const bytes = this.readGzip();
    const reader = new BinaryReader(bytes);

    reader.extensions = this.extensions;
    reader.dictionary = this.dictionary;
    reader.dictionaryExtended = this.dictionaryExtended;

    return reader.readObject();
  }

  readGzip(): any {
    return pako.inflateRaw(this.readBytes());
  }

  private readCore(constructorId: CORE_TYPES): any {
    switch (constructorId) {
      case CORE_TYPES.None:
        return this.readObject();
      case CORE_TYPES.GZIP:
        return this.readObjectGzip();
      case CORE_TYPES.BoolTrue:
        return true;
      case CORE_TYPES.BoolFalse:
        return false;
      case CORE_TYPES.Vector:
        return this.readVector(false);
      case CORE_TYPES.VectorDynamic:
        return this.readVectorDynamic(false);
      case CORE_TYPES.Null:
        return null;
      case CORE_TYPES.Binary:
        return this.readBytes();
      case CORE_TYPES.String:
        return this.readString();
      case CORE_TYPES.Date:
        return this.readDate();
      case CORE_TYPES.Int64:
        return this.readInt64();
      case CORE_TYPES.Int32:
        return this.readInt32();
      case CORE_TYPES.Int16:
        return this.readInt16();
      case CORE_TYPES.Int8:
        return this.readInt8();
      case CORE_TYPES.UInt64:
        return this.readInt64(false);
      case CORE_TYPES.UInt32:
        return this.readInt32(false);
      case CORE_TYPES.UInt16:
        return this.readInt16(false);
      case CORE_TYPES.UInt8:
        return this.readInt8(false);
      case CORE_TYPES.Float:
        return this.readFloat();
      case CORE_TYPES.Double:
        return this.readDouble();
      case CORE_TYPES.Map:
        return this.readMap(false);
      case CORE_TYPES.Checksum:
        return void this.readChecksum(false);
      case CORE_TYPES.Structure:
        return this.readStructure(false);
      case CORE_TYPES.DictIndex: {
        const idx = this.readLength();
        return this.getDictionaryValue(idx)!;
      }
      case CORE_TYPES.DictValue: {
        const value = this.readString();
        this.dictionaryExtended.maybeInsert(value);
        return value;
      }
      case CORE_TYPES.Repeat: {
        const size = this.readLength();
        this._repeat = { pool: size - 1, value: this._lastObject };
        return this._lastObject;
      }
    }

    throw new Error(
      `Invalid constructor = ${CORE_TYPES[constructorId] || constructorId}, offset = ${
        this.offset - 1
      }`,
    );
  }

  getDictionaryValue(index: number): string | null {
    let value: string | null = null;

    if (this.dictionary) {
      value = this.dictionary.getValue(index);
    }

    if (value === null) {
      value = this.dictionaryExtended.getValue(index);
    }

    return value;
  }

  readDictionary(): null | string {
    const constructorId = this.readByte();

    let key: string | null = null;

    switch (constructorId) {
      case CORE_TYPES.DictIndex: {
        const idx = this.readLength();
        key = this.getDictionaryValue(idx)!;
        break;
      }
      case CORE_TYPES.DictValue: {
        key = this.readString();
        this.dictionaryExtended.maybeInsert(key);
        break;
      }
      case CORE_TYPES.None: {
        key = null;
        break;
      }
      default: {
        this.seek(-1);
      }
    }

    return key;
  }

  readMap(checkConstructor = true): Record<string, any> {
    if (checkConstructor) {
      this.assertConstructor(CORE_TYPES.Map);
    }

    const temp: Record<string, any> = {};

    let key = this.readDictionary();

    while (key !== null) {
      temp[key] = this.readObject();
      key = this.readDictionary();
    }

    return temp;
  }

  decode<T = any>(value: Uint8Array): T {
    this.target = value;
    this._last = undefined;
    this._lastObject = undefined;
    this._repeat = undefined;
    this.offset = 0;
    this._checksumOffset = 0;
    this.length = value.length;

    return this.readObject();
  }

  /**
   * Reads a vector (a list) of objects.
   */
  readVector<T = any>(checkConstructor = true): T[] {
    if (checkConstructor) {
      this.assertConstructor(CORE_TYPES.Vector);
    }

    const count = this.readLength();
    const temp = [];

    for (let i = 0; i < count; i++) {
      temp.push(this.readObject());
    }

    return temp;
  }

  /**
   * Reads a vector (a list) of objects.
   */
  readVectorDynamic<T>(checkConstructor = true): T[] {
    if (checkConstructor) {
      this.assertConstructor(CORE_TYPES.VectorDynamic);
    }

    const temp = [];

    let complete = false;

    while (this.length > this.offset) {
      const constructorId = this.readByte();

      if (constructorId === CORE_TYPES.None) {
        complete = true;
        break;
      }

      const ext = this.extensions.get(constructorId);

      let value: any;

      if (ext) {
        value = ext.decode.call(this);
      } else {
        value = this.readCore(constructorId);
      }

      temp.push(value);
    }

    if (!complete) {
      const err = new Error(`DynamicVector incomplete.`);
      (err as any).incomplete = true;
      Error.captureStackTrace(err, this.readDictionary);

      throw err;
    }

    this._last = temp;

    return temp;
  }

  readChecksum(checkConstructor: boolean = true): void {
    const offset = this.offset;

    if (checkConstructor) {
      this.assertConstructor(CORE_TYPES.Checksum);
    }

    const bytes = this.target.subarray(this._checksumOffset, offset);
    const checksum = this.readInt32();
    let sum = 0;

    for (const val of bytes) {
      sum += val;
    }

    if (checksum - sum !== 0) {
      throw new Error(
        `Invalid checksum = ${checksum - sum}, offset = ${offset}`,
      );
    }

    this._checksumOffset = this.offset;
  }

  /**
   * Tells the current position on the stream.
   */
  tellPosition(): number {
    return this.offset;
  }

  /**
   * Sets the current position on the stream.
   */
  setPosition(position: number): void {
    this.offset = position;
  }

  /**
   * Seeks the stream position given an offset from the current position.
   * The offset may be negative.
   */
  seek(offset: number): void {
    this.offset += offset;
  }
}
