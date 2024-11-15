const byteToHex: string[] = [];

for (let n = 0; n <= 0xff; ++n) {
  const hexOctet = n.toString(16).padStart(2, '0');
  byteToHex.push(hexOctet);
}

/**
 * Encodes a `Uint8Array` or a number array into a hexadecimal string.
 * Each byte of the array is converted to its corresponding two-character hex representation.
 *
 * This function is useful when you need to represent binary data as a string of hexadecimal characters.
 *
 * @example
 * console.log(hex(new Uint8Array([255]))); // 'ff'
 * console.log(hex([255, 0, 128])); // 'ff0080'
 *
 * @param value - The array to be converted, either a `Uint8Array` or a number array.
 * @returns A string of hexadecimal characters representing the array's byte values.
 *
 * @group Strings
 */
export function hex(value: Uint8Array | number[]) {
  const buff = Array.isArray(value) ? new Uint8Array(value) : value;
  const hexOctets = new Array(buff.length);

  for (let i = 0; i < buff.length; ++i) {
    hexOctets[i] = byteToHex[buff[i]];
  }

  return hexOctets.join('');
}
