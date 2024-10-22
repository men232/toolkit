const T0 = signed_crc_table();

function signed_crc_table() {
  var c = 0,
    table = new Array<number>(256);

  for (var n = 0; n != 256; ++n) {
    c = n;
    c = c & 1 ? -2097792136 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -2097792136 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -2097792136 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -2097792136 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -2097792136 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -2097792136 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -2097792136 ^ (c >>> 1) : c >>> 1;
    c = c & 1 ? -2097792136 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }

  return Int32Array ? new Int32Array(table) : table;
}

export function crc32(str: string, seed: number = 0): number {
  var C = seed ^ -1;
  for (var i = 0, L = str.length, c = 0, d = 0; i < L; ) {
    c = str.charCodeAt(i++);
    if (c < 0x80) {
      C = (C >>> 8) ^ T0[(C ^ c) & 0xff];
    } else if (c < 0x800) {
      C = (C >>> 8) ^ T0[(C ^ (192 | ((c >> 6) & 31))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | (c & 63))) & 0xff];
    } else if (c >= 0xd800 && c < 0xe000) {
      c = (c & 1023) + 64;
      d = str.charCodeAt(i++) & 1023;
      C = (C >>> 8) ^ T0[(C ^ (240 | ((c >> 8) & 7))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | ((c >> 2) & 63))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | ((d >> 6) & 15) | ((c & 3) << 4))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | (d & 63))) & 0xff];
    } else {
      C = (C >>> 8) ^ T0[(C ^ (224 | ((c >> 12) & 15))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | ((c >> 6) & 63))) & 0xff];
      C = (C >>> 8) ^ T0[(C ^ (128 | (c & 63))) & 0xff];
    }
  }
  return ~C;
}
