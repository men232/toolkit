import { BinaryReader, type BinaryReaderOptions } from './BinaryReader';
import { BinaryWriter, type BinaryWriterOptions } from './BinaryWriter';

export { BinaryReader, type BinaryReaderOptions } from './BinaryReader';
export { BinaryWriter, type BinaryWriterOptions } from './BinaryWriter';
export * from './constants';
export { createDictionary } from './dictionary';
export {
  createExtension,
  type DecodeHandler,
  type EncodeHandler,
  type TLExtension,
} from './extension';

/**
 * Encode any value into `Uint8Array`
 *
 * @example
 * const buffer = tlEncode(new Date(0));
 *
 * console.log(buffer); // Uint8Array([5, 0, 0, 0, 0, 0, 0, 0, 0])
 *
 * @group Main
 */
export function tlEncode(
  value: unknown,
  opts?: BinaryWriterOptions,
): Uint8Array {
  return new BinaryWriter(opts).writeObject(value).getBuffer();
}

/**
 * Decode value from `Uint8Array`
 *
 * @example
 * const buffer = new Uint8Array([5, 0, 0, 0, 0, 0, 0, 0, 0]);
 * const value = tlDecode(buffer);
 *
 * console.log(value); // Thu Jan 01 1970 01:00:00 GMT+0100 (Central European Standard Time)
 *
 * @group Main
 */
export function tlDecode<T = any>(
  buffer: Uint8Array,
  opts?: BinaryReaderOptions,
): T {
  return new BinaryReader(buffer, opts).readObject();
}
