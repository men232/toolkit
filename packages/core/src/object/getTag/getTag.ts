export var nullTag = '[object Null]';
export var undefinedTag = '[object Undefined]';
export var regexpTag = '[object RegExp]';
export var stringTag = '[object String]';
export var numberTag = '[object Number]';
export var booleanTag = '[object Boolean]';
export var argumentsTag = '[object Arguments]';
export var symbolTag = '[object Symbol]';
export var dateTag = '[object Date]';
export var bigintTag = '[object BigInt]';
export var mapTag = '[object Map]';
export var setTag = '[object Set]';
export var arrayTag = '[object Array]';
export var functionTag = '[object Function]';
export var arrayBufferTag = '[object ArrayBuffer]';
export var objectTag = '[object Object]';
export var weakmapTag = '[object WeakMap]';
export var weaksetTag = '[object WeakSet]';
export var errorTag = '[object Error]';
export var dataViewTag = '[object DataView]';
export var uint8ArrayTag = '[object Uint8Array]';
export var uint8ClampedArrayTag = '[object Uint8ClampedArray]';
export var uint16ArrayTag = '[object Uint16Array]';
export var uint32ArrayTag = '[object Uint32Array]';
export var bigUint64ArrayTag = '[object BigUint64Array]';
export var int8ArrayTag = '[object Int8Array]';
export var int16ArrayTag = '[object Int16Array]';
export var int32ArrayTag = '[object Int32Array]';
export var bigInt64ArrayTag = '[object BigInt64Array]';
export var float32ArrayTag = '[object Float32Array]';
export var float64ArrayTag = '[object Float64Array]';

/**
 * Get object tag of value
 * @group Object
 */
export const getTag = function <T>(value: T): string {
  if (value == null) {
    return value === undefined ? undefinedTag : nullTag;
  }
  return Object.prototype.toString.call(value);
};
