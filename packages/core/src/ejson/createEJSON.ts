import { EJSON } from './EJSON';
import {
  BigIntType,
  BinaryType,
  DateType,
  InfinityType,
  MapType,
  RegexType,
  SetType,
} from './types';

/**
 * Creates a new instance of the `EJSON` (Extensible JSON) with optional basic types pre-registered.
 *
 * This function allows you to initialize an `EJSON` instance with commonly used types like `Map`, `Set`,
 * `Date`, `RegExp`, `Infinity`, `BigInt` and `Uint8Array`. These types are added to the type handlers only when `withBasicTypes` is set to `true`.
 *
 * | Type        | Placeholder | Alias          |
 * |-------------|-------------|----------------|
 * | Date        | $date       | EJSON.Date     |
 * | Map         | $map        | EJSON.Map      |
 * | Set         | $set        | EJSON.Set      |
 * | Infinity    | $inf        | EJSON.Infinity |
 * | BigInt      | $bigint     | EJSON.BigInt   |
 * | RegExp      | $regexp     | EJSON.RegExp   |
 * | Uint8Array  | $binary     | EJSON.Binary   |
 * | Uint16Array | $binary     | EJSON.Binary   |
 * | Uint32Array | $binary     | EJSON.Binary   |
 *
 * @param {boolean} [withBasicTypes=false] - Indicates whether to include basic types like Map, Set, Date, and BigInt.
 * @returns {EJSON} - A new instance of the `EJSON` class configured with optional basic types.
 *
 * @example
 * // Instance with basic types (Map, Set, Date, BigInt, Uint8Array)
 * import { EJSON } from '@andrew_l/toolkit';
 *
 * ejson.stringify({ value: new Date(0) });
 * // {"value":{"$date": 0}}
 *
 * @example
 * // Create an EJSON instance without any additional types
 * const ejson = createEJSON();
 *
 * ejson.stringify({ value: new Date(0) });
 * // {"value":"1970-01-01T00:00:00.000Z"}
 *
 * @example
 * // Custom type
 * import { EJSON, createEJSON } from '@andrew_l/toolkit';
 *
 * const ejson = createEJSON();
 *
 * ejson.vendorName = 'Andrew';
 *
 * // Add pre-build date type
 * ejson.addType(EJSON.Date);
 *
 * // Add custom buffer type
 * ejson.addType({
 *   placeholder: '$buffer',
 *   encode(value) {
 *     if (Buffer.isBuffer(value)) {
 *       return value.toString('hex');
 *     }
 *   },
 *   decode(value) {
 *     return Buffer.from(value, 'hex');
 *   }
 * });
 *
 * ejson.stringify({
 *   value: [
 *     Buffer.from('Hello World', 'utf8'),
 *     new Date(0)
 *   ]
 * });
 * // {"value":[{"$buffer":"48656c6c6f20576f726c64"},{"$date":0}]}
 *
 * console.log(ejson.mimetype); // application/vnd.andrew+json
 *
 * @group Object
 */
export function createEJSON(withBasicTypes: boolean = false): EJSON {
  const ejson = new EJSON();

  if (withBasicTypes) {
    ejson.addType(MapType);
    ejson.addType(SetType);
    ejson.addType(DateType);
    ejson.addType(InfinityType);
    ejson.addType(BigIntType);
    ejson.addType(BinaryType);
    ejson.addType(RegexType);
  }

  return ejson;
}
