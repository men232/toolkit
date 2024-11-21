import pako from 'pako';
import { CORE_TYPES, MAX_BUFFER_SIZE } from './constants';
import { Dictionary } from './dictionary';
import type { TLExtension } from './extension';
import {
  byteArrayAllocate,
  coreType,
  float32,
  float64,
  int32,
  utf8Write,
} from './helpers.js';

const noop = Symbol();

export interface BinaryWriterOptions {
  gzip?: boolean;
  dictionary?: string[] | Dictionary;
  extensions?: TLExtension[];
}

const NO_CONSTRUCTOR = new Set([
  CORE_TYPES.BoolFalse,
  CORE_TYPES.BoolTrue,
  CORE_TYPES.Null,
]);

const SUPPORT_COMPRESSION = new Set([CORE_TYPES.String]);

export class BinaryWriter {
  private withGzip: boolean;
  private target: Uint8Array;
  private dictionary?: Dictionary;
  private dictionaryExtended: Dictionary;
  private extensions: Map<number, TLExtension>;
  private _last: any = noop;
  private _checksumOffset: number;
  private _repeat?: { offset: number; count: number };
  offset: number;

  constructor(options?: BinaryWriterOptions) {
    this.offset = 0;
    this._checksumOffset = 0;
    this.extensions = new Map();
    this.withGzip = !!options && !!options.gzip;

    this.target = byteArrayAllocate(8192);

    if (options && options.extensions) {
      options.extensions.forEach(ext => {
        this.extensions.set(ext.token, ext);
      });
    }

    if (!options) {
      this.dictionary = new Dictionary();
    } else if (options.dictionary instanceof Dictionary) {
      this.dictionary = options.dictionary;
    } else if (Array.isArray(options.dictionary)) {
      this.dictionary = new Dictionary(options.dictionary);
    } else {
      this.dictionary = new Dictionary();
    }

    this.dictionaryExtended = new Dictionary(undefined, this.dictionary.size);
  }

  allocate(size: number): this {
    const position = this.offset + size;

    if (this.safeEnd < position) {
      this.makeRoom(position);
    }

    return this;
  }

  private makeRoom(end: number): void {
    let start = 0;
    let newSize = 0;
    let target = this.target;

    if (end > 0x1000000) {
      // special handling for really large buffers
      if (end - start > MAX_BUFFER_SIZE)
        throw new Error(
          'Packed buffer would be larger than maximum buffer size',
        );
      newSize = Math.min(
        MAX_BUFFER_SIZE,
        Math.round(
          Math.max((end - start) * (end > 0x4000000 ? 1.25 : 2), 0x400000) /
            0x1000,
        ) * 0x1000,
      );
    } else {
      // faster handling for smaller buffers
      newSize =
        ((Math.max((end - start) << 2, target.length - 1) >> 12) + 1) << 12;
    }

    const newBuffer = byteArrayAllocate(newSize);

    end = Math.min(end, target.length);

    newBuffer.set(target.slice(start, end));

    this.target = newBuffer;
  }

  get safeEnd(): number {
    return this.target.length - 10;
  }

  getBuffer(): Uint8Array {
    return this.target.subarray(0, this.offset);
  }

  writeByte(value: number): this {
    this.allocate(1);
    this.target[this.offset++] = value;
    return this;
  }

  writeBool(value: boolean): this {
    if (value) {
      this.writeByte(CORE_TYPES.BoolTrue);
    } else {
      this.writeByte(CORE_TYPES.BoolFalse);
    }

    return this;
  }

  writeNull(): this {
    this.writeByte(CORE_TYPES.Null);
    return this;
  }

  writeInt32(value: number, signed = true): this {
    this.allocate(4);

    if (signed) {
      this.target[this.offset++] = value;
      this.target[this.offset++] = value >> 8;
      this.target[this.offset++] = value >> 16;
      this.target[this.offset++] = value >> 24;
    } else {
      this.target[this.offset++] = value;
      this.target[this.offset++] = value >> 8;
      this.target[this.offset++] = value >> 16;
      this.target[this.offset++] = value >> 24;
    }

    return this;
  }

  writeInt16(value: number, signed = true): this {
    this.allocate(2);

    if (signed) {
      this.target[this.offset++] = value;
      this.target[this.offset++] = value >> 8;
    } else {
      this.target[this.offset++] = value;
      this.target[this.offset++] = value >> 8;
    }

    return this;
  }

  writeInt8(value: number, signed = true): this {
    this.allocate(1);
    this.target[this.offset++] = value;
    return this;
  }

  writeFloat(value: number): this {
    this.allocate(4);
    float32[0] = value;
    this.writeInt32(int32[0]);
    return this;
  }

  writeDouble(value: number): this {
    this.allocate(8);

    float64[0] = value;
    this.writeInt32(int32[0], false);
    this.writeInt32(int32[1], false);

    return this;
  }

  writeDate(value: number | Date): this {
    let timestamp = 0;

    if (value instanceof Date) {
      timestamp = value.getTime();
    } else if (typeof value === 'number') {
      timestamp = value;
    }

    this.writeDouble(timestamp);
    return this;
  }

  writeString(value: string): this {
    const strLength = value.length;

    let start = this.offset;
    let require = strLength << 2;

    if (require < 254) {
      require += 1;
      this.offset += 1;
    } else {
      require += 4;
      this.offset += 4;
    }

    this.allocate(require);

    const bytes = utf8Write(this.target, value, this.offset);

    if (require < 254) {
      this.target[start++] = bytes;
    } else {
      this.target[start++] = 254;
      this.target[start++] = bytes % 256;
      this.target[start++] = (bytes >> 8) % 256;
      this.target[start++] = (bytes >> 16) % 256;
    }

    this.offset += bytes;

    return this;
  }

  writeChecksum(withConstructor: boolean = true): this {
    const bytes = this.target.slice(this._checksumOffset, this.offset);
    let sum = 0;

    for (const val of bytes) {
      sum += val;
    }

    if (withConstructor) {
      this.writeByte(CORE_TYPES.Checksum);
    }

    this.writeLength(sum);
    this._checksumOffset = this.offset;

    return this;
  }

  writeBytes(value: Uint8Array): this {
    const length = value.length;

    this.writeLength(length);
    this.allocate(length);
    this.target.set(value, this.offset);

    this.offset += length;

    return this;
  }

  writeLength(value: number): this {
    if (value < 254) {
      this.allocate(1);
      this.target[this.offset++] = value;
    } else {
      this.allocate(4);
      this.target[this.offset++] = 254;
      this.target[this.offset++] = value % 256;
      this.target[this.offset++] = (value >> 8) % 256;
      this.target[this.offset++] = (value >> 16) % 256;
    }

    return this;
  }

  writeVector(value: Array<any>): this {
    const length = value.length;
    this.writeLength(length);

    for (let i = 0; i < length; i++) {
      if (value[i] === undefined) {
        this.writeNull();
      } else {
        this.writeObject(value[i]);
      }
    }

    return this;
  }

  writeMap(object: Record<string, any>): this {
    for (const key in object) {
      if (object[key] === undefined) continue;

      this._last = noop;
      this.wireDictionary(key);
      this.writeObject(object[key]);
    }

    this.writeByte(CORE_TYPES.None);

    return this;
  }

  wireDictionary(value: string): this {
    let idx: number | null = null;

    if (this.dictionary) {
      idx = this.dictionary.getIndex(value);
    }

    if (idx === null) {
      idx = this.dictionaryExtended.getIndex(value);
    }

    if (idx === null) {
      this.dictionaryExtended.maybeInsert(value);
      this.writeCore(CORE_TYPES.DictValue, value);
    } else {
      this.writeCore(CORE_TYPES.DictIndex, idx);
    }

    return this;
  }

  writeGzip(value: Uint8Array | ArrayBuffer): this {
    const compressed = pako.deflateRaw(value, { level: 9 });
    this.writeBytes(compressed);
    return this;
  }

  encode(value: any): Uint8Array {
    this.offset = 0;
    this._checksumOffset = 0;
    this._last = noop;
    this._repeat = undefined;
    this.target = byteArrayAllocate(256);

    this.writeObject(value);

    return this.getBuffer();
  }

  startDynamicVector(): this {
    this.writeByte(CORE_TYPES.VectorDynamic);
    return this;
  }

  endDynamicVector(): this {
    this.writeByte(CORE_TYPES.None);
    return this;
  }

  private _writeCustom(value: any): boolean {
    const start = this.offset;

    this.allocate(1);

    this.offset++;

    let edgeExt;

    for (const ext of this.extensions.values()) {
      if (ext.token === -1) {
        edgeExt = ext;
        continue;
      }

      ext.encode.call(this, value);

      const processed = start + 1 < this.offset;

      if (processed) {
        const end = this.offset;
        this.offset = start;
        this.writeByte(ext.token);
        this.offset = end;

        return true;
      }
    }

    this.offset = start;

    if (edgeExt) {
      edgeExt.encode.call(this, value);
      return start < this.offset;
    }

    return false;
  }

  writeObject(value: any): this {
    if (value === undefined) return this;

    const constructorId = coreType(value);

    // console.log('write', {
    // 	offset: this.offset,
    // 	constructorId: CORE_TYPES[constructorId],
    // 	value: String(value),
    // });

    if (constructorId === CORE_TYPES.None) {
      if (this._writeCustom(value)) {
        return this;
      }

      throw new TypeError(`Invalid core type of ${value}`);
    }

    if (this._last === value) {
      this.writeRepeat();
    } else {
      this._last = value;
      this._repeat = undefined;
      this.writeCore(constructorId, value);
    }

    return this;
  }

  writeObjectGzip(value: any): this {
    const writer = new BinaryWriter();

    writer.extensions = this.extensions;
    writer.dictionary = this.dictionary;
    writer.dictionaryExtended = this.dictionaryExtended;

    writer.writeObject(value);
    this.writeCore(CORE_TYPES.GZIP, writer.getBuffer());

    return this;
  }

  private writeCore(constructorId: CORE_TYPES, value: any): this {
    if (this.withGzip && SUPPORT_COMPRESSION.has(constructorId)) {
      this.writeObjectGzip(value);
      return this;
    } else if (!NO_CONSTRUCTOR.has(constructorId)) {
      this.writeByte(constructorId);
    }

    switch (constructorId) {
      case CORE_TYPES.GZIP: {
        return this.writeGzip(value);
      }

      case CORE_TYPES.DictIndex: {
        return this.writeLength(value);
      }

      case CORE_TYPES.DictValue: {
        return this.writeString(value);
      }

      case CORE_TYPES.BoolFalse: {
        return this.writeBool(value);
      }

      case CORE_TYPES.BoolTrue: {
        return this.writeBool(value);
      }

      case CORE_TYPES.Date: {
        return this.writeDate(value);
      }

      case CORE_TYPES.Int32: {
        return this.writeInt32(value);
      }

      case CORE_TYPES.Int16: {
        return this.writeInt16(value);
      }

      case CORE_TYPES.Int8: {
        return this.writeInt8(value);
      }

      case CORE_TYPES.UInt32: {
        return this.writeInt32(value, false);
      }

      case CORE_TYPES.UInt16: {
        return this.writeInt16(value, false);
      }

      case CORE_TYPES.UInt8: {
        return this.writeInt8(value, false);
      }

      case CORE_TYPES.Double: {
        return this.writeDouble(value);
      }

      case CORE_TYPES.Float: {
        return this.writeFloat(value);
      }

      case CORE_TYPES.Null: {
        return this.writeNull();
      }

      case CORE_TYPES.String: {
        // write short strings into dictionary
        if (value.length <= 0x10) {
          this.offset--;
          return this.wireDictionary(value);
        }

        return this.writeString(value);
      }

      case CORE_TYPES.Vector: {
        return this.writeVector(value);
      }

      case CORE_TYPES.Map: {
        return this.writeMap(value);
      }
    }

    return this;
  }

  private writeRepeat(): this {
    if (!this._repeat) {
      this.writeByte(CORE_TYPES.Repeat);
      this._repeat = { count: 0, offset: this.offset };
    }

    this.offset = this._repeat.offset;
    this._repeat.count++;

    this.writeLength(this._repeat.count);
    return this;
  }
}
