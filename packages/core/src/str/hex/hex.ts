const byteToHex: string[] = [];

for (let n = 0; n <= 0xff; ++n) {
  const hexOctet = n.toString(16).padStart(2, '0');
  byteToHex.push(hexOctet);
}

/**
 * Encodes a `Uint8Array` or number array to a hex string.
 *
 * @example
 * console.log(hex(new Uint8Array[255])); // 'ff'
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
