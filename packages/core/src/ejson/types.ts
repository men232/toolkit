import { base64 } from '@/binary/base64';
import { bigIntBytes } from '@/binary/bigIntBytes';
import { bigIntFromBytes } from '@/binary/bigIntFromBytes';
import { uint16ToUint8 } from '@/binary/uint16ToUint8';
import { uint32ToUint8 } from '@/binary/uint32ToUint8';
import { uint8ToUint16 } from '@/binary/uint8ToUint16';
import { uint8ToUint32 } from '@/binary/uint8ToUint32';
import type { EJSONType } from './EJSON';

export const DateType: EJSONType = {
  placeholder: '$date',
  encode: value => {
    if (value instanceof Date) {
      return value.getTime();
    }
  },
  decode(value) {
    return new Date(value);
  },
};

export const BinaryType: EJSONType = {
  placeholder: '$binary',
  encode: value => {
    if (value instanceof Uint8Array) {
      return base64.encode(value, { includePadding: true });
    } else if (value instanceof Uint16Array) {
      return {
        value: base64.encode(uint16ToUint8(value), { includePadding: true }),
        bit: 16,
      };
    } else if (value instanceof Uint32Array) {
      return {
        value: base64.encode(uint32ToUint8(value), { includePadding: true }),
        bit: 32,
      };
    }
  },
  decode(value) {
    if (typeof value === 'string') {
      return base64.decode(value, { strict: true });
    } else if (value.bit === 16) {
      return uint8ToUint16(base64.decode(value.value, { strict: true }));
    } else if (value.bit === 32) {
      return uint8ToUint32(base64.decode(value.value, { strict: true }));
    }

    throw new Error('Unexpected $binary bit value: ' + value.bit);
  },
};

export const BigIntType: EJSONType = {
  placeholder: '$bigint',
  encode: value => {
    if (typeof value === 'bigint') {
      return base64.encode(bigIntBytes(value), { includePadding: false });
    }
  },
  decode(value) {
    return bigIntFromBytes(base64.decode(value, { strict: false }));
  },
};

export const MapType: EJSONType = {
  placeholder: '$map',
  encode: (value, encode) => {
    if (value instanceof Map) {
      return encode(Array.from(value.entries()));
    }
  },
  decode(value) {
    return new Map(value);
  },
};

export const SetType: EJSONType = {
  placeholder: '$set',
  encode: (value, encode) => {
    if (value instanceof Set) {
      return encode(Array.from(value.values()));
    }
  },
  decode(value) {
    return new Set(value);
  },
};

export const RegexType: EJSONType = {
  placeholder: '$regex',
  encode: (value, encode) => {
    if (value instanceof RegExp) {
      const regStr = value.toString();
      const patternStart = regStr.lastIndexOf('/');

      return {
        pattern: value.toString().slice(1, patternStart),
        flags: regStr.slice(patternStart + 1),
      };
    }
  },
  decode(value) {
    return new RegExp(value.pattern, value.flags);
  },
};

export const InfinityType: EJSONType = {
  placeholder: '$inf',
  encode: (value, encode) => {
    if (value === Infinity) {
      return 1;
    } else if (value === -Infinity) {
      return -1;
    }
  },
  decode(value) {
    if (value === 1) return Infinity;
    if (value === -1) return -Infinity;

    throw new Error('Unexpected $inf value: ' + value);
  },
};
