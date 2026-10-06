import { assert } from '@/assert';
import { createFunction } from '@/function/createFunction';
import { def } from '@/object';
import type { AnyFunction } from '@/types';

export namespace BitUnpack {
  export type Field = {
    name: string;
    bits: number;
  };

  export type Options<TFields extends Field[]> = {
    totalBits: number;
    fields: TFields;
    debug?: boolean;
  };

  export type API<TFields extends string = string> = {
    buffer: Fn.Buffer<TFields>;
    number: Fn.Number<TFields>;
    bigint: Fn.BigInt<TFields>;
    bits: Fn.Bits<TFields>;
  };

  export namespace Fn {
    export type Buffer<TFields extends string = string> = WithDebug<
      (data: Uint8Array) => FieldResult<TFields>
    >;

    export type Number<TFields extends string = string> = WithDebug<
      (data: number) => FieldResult<TFields>
    >;

    export type BigInt<TFields extends string = string> = WithDebug<
      (data: bigint) => FieldResult<TFields>
    >;

    export type Bits<TFields extends string = string> = WithDebug<
      (data: string) => FieldResult<TFields>
    >;
  }

  export type WithDebug<T extends AnyFunction> = T & { code?: string };

  export type ExtractFieldNames<T extends Field[]> = T[number]['name'];

  export type FieldResult<T extends string> = {
    [P in T]: number;
  };
}

type FieldInfo = BitUnpack.Field & {
  id: string;
  mask: bigint;
  startBit: number;
  endBit: number;
};

/**
 * Define compact unpacked structure
 *
 * @replaces `Number((id >> 22n) & 0x3ffn)` per field — shifts and masks come from the same field list as `bitPack`
 * (first field is most significant), so they cannot drift from the packer; reads a bigint, number, big-endian bytes
 * or a bit string. Fields wider than 53 bits lose precision as numbers; needs `new Function` (no strict CSP).
 * @detect `Number\(\s*\(?\s*(?:BigInt\(\s*[\w.]+\s*\)|[\w.]+)\s*>>\s*\d+n\b`
 *
 * @group Binary
 *
 * @example
 * ```typescript
 * const snowflake = bitUnpack({
 *   totalBits: 64,
 *   fields: [
 *     { name: 'timestamp', bits: 42, take: 'low' },
 *     { name: 'workerId', bits: 5, take: 'low' },
 *     { name: 'processId', bits: 5, take: 'low' },
 *     { name: 'increment', bits: 12, take: 'low' },
 *   ],
 * });
 *
 * console.log(
 *   snowflake.bigint(7471294063048785920n)
 * ); // { timestamp: 1781295314562, workerId: 1, processId: 0, increment: 0 }
 * ```
 */
export function bitUnpack<
  const TFields extends BitUnpack.Field[],
  TFieldNames extends string = BitUnpack.ExtractFieldNames<TFields>,
>(options: BitUnpack.Options<TFields>): BitUnpack.API<TFieldNames> {
  assert.notEmpty(options.fields, 'fields cannot be empty');
  assert.greaterThan(options.totalBits, 0, 'totalBits must be greater than 0');

  const fields = buildFieldsInfo(options.fields, options.totalBits);
  const small = options.totalBits <= 64;
  const containersCount = Math.ceil(options.totalBits / 32);

  // FN: BigInt - direct BigInt bit operations
  const fnBigIntCode = (
    small
      ? [
          containersFromBigInt(containersCount),
          `return ${compileContainerFields(fields)};`,
        ]
      : [`return ${compileFields(fields)};`]
  ).join('\n');

  const fnBigInt = createFunction<BitUnpack.Fn.BigInt>(
    'bigint',
    fnBigIntCode,
    'data',
  );

  // FN: Number
  const fnNumberCode = (
    small
      ? [
          containersFromNumber(containersCount),
          `return ${compileContainerFields(fields)};`,
        ]
      : [
          '\n// Extract container from number',
          'data = BigInt(data);',
          '\n// Return result',
          `return ${compileFields(fields)};`,
        ]
  ).join('\n');

  const fnNumber = createFunction<BitUnpack.Fn.Number>(
    'number',
    fnNumberCode,
    'data',
  );

  // FN: Buffer
  const fnBufferCode = (
    small
      ? [
          containersFromBuffer(options.totalBits),
          `return ${compileContainerFields(fields)};`,
        ]
      : [
          '\n// Extract bytes from buffer (big-endian)',
          extractBigIntFromBuffer(options.totalBits),
          '\n// Return result',
          `return ${compileFields(fields)};`,
        ]
  ).join('\n');

  const fnBuffer = createFunction<BitUnpack.Fn.Buffer>(
    'buffer',
    fnBufferCode,
    'data',
  );

  // FN: Bits - convert to bigint then use direct operations
  const fnBitsCode = [
    '\n// Convert bits string to bigint',
    'var data = BigInt("0b" + bits);',
    '\n// Return result',
    `return ${compileFields(fields)};`,
  ].join('\n');

  const fnBits = createFunction<BitUnpack.Fn.Bits>('bits', fnBitsCode, 'bits');

  if (!options.debug) {
    def(fnBuffer, 'code', undefined);
    def(fnBigInt, 'code', undefined);
    def(fnNumber, 'code', undefined);
    def(fnBits, 'code', undefined);
  }

  return {
    buffer: fnBuffer,
    bigint: fnBigInt,
    number: fnNumber,
    bits: fnBits,
  } as BitUnpack.API<TFieldNames>;
}

function compileFields(fields: FieldInfo[]): string {
  const lines: string[] = ['{'];

  for (const field of fields) {
    if (field.startBit === 0) {
      lines.push(
        `  ['${field.name}']: Number(data & 0x${field.mask.toString(16)}n),`,
      );
    } else {
      lines.push(
        `  ['${field.name}']: Number((data >> ${field.startBit}n) & 0x${field.mask.toString(16)}n),`,
      );
    }
  }

  lines.push('}');

  return lines.join('\n');
}

function compileContainerFields(fields: FieldInfo[]): string {
  const lines: string[] = ['{'];

  for (const field of fields) {
    const first = field.startBit >> 5;
    const last = field.endBit >> 5;
    const offset = field.startBit & 31;
    let expr: string;

    if (first === last) {
      const mask = Math.pow(2, field.bits) - 1;
      const shifted =
        offset === 0 ? `c_${first}` : `(c_${first} >>> ${offset})`;

      expr =
        field.bits === 32
          ? `c_${first}`
          : `(${shifted} & 0x${mask.toString(16)})`;
    } else {
      const lowBits = 32 - offset;
      const highBits = field.bits - lowBits;
      const low = offset === 0 ? `c_${first}` : `(c_${first} >>> ${offset})`;
      const high =
        highBits === 32
          ? `c_${last}`
          : `(c_${last} & 0x${(Math.pow(2, highBits) - 1).toString(16)})`;

      expr = `(${high} * ${Math.pow(2, lowBits)} + ${low})`;
    }

    lines.push(`  ['${field.name}']: ${expr},`);
  }

  lines.push('}');

  return lines.join('\n');
}

function containersFromBigInt(containersCount: number): string {
  const lines = ['var c_0 = Number(data & 0xffffffffn);'];

  if (containersCount > 1) {
    lines.push('var c_1 = Number((data >> 32n) & 0xffffffffn);');
  }

  return lines.join('\n');
}

function containersFromNumber(containersCount: number): string {
  const lines = ['var c_0 = data >>> 0;'];

  if (containersCount > 1) {
    lines.push('var c_1 = (data / 0x100000000) >>> 0;');
  }

  return lines.join('\n');
}

function containersFromBuffer(totalBits: number): string {
  const totalBytes = Math.ceil(totalBits / 8);
  const aligned = totalBits % 32 === 0;
  const at = (index: number) =>
    aligned ? `data[${index}]` : index === 0 ? 'data[o]' : `data[o + ${index}]`;
  const containers: string[][] = [];

  for (let index = 0; index < totalBytes; index++) {
    const position = totalBytes - 1 - index;
    const container = position >> 2;
    const shift = (position & 3) * 8;

    (containers[container] ??= []).push(
      shift === 0 ? at(index) : `(${at(index)} << ${shift})`,
    );
  }

  const lines = aligned ? [] : [`var o = data.length - ${totalBytes};`];

  containers.forEach((parts, container) => {
    lines.push(`var c_${container} = (${parts.join(' | ')}) >>> 0;`);
  });

  return lines.join('\n');
}

function extractBigIntFromBuffer(totalBits: number): string {
  const totalBytes = Math.ceil(totalBits / 8);
  const aligned = totalBits % 32 === 0;
  const at = (index: number) =>
    aligned ? `data[${index}]` : index === 0 ? 'data[o]' : `data[o + ${index}]`;
  const chunks: string[] = [];

  let byteIndex = 0;
  let remainingBytes = totalBytes;

  while (remainingBytes > 0) {
    if (remainingBytes >= 4) {
      // Full 32-bit chunk
      const shift = (remainingBytes - 4) * 8;
      const chunk = `((${at(byteIndex)} << 24) | (${at(byteIndex + 1)} << 16) | (${at(byteIndex + 2)} << 8) | ${at(byteIndex + 3)}) >>> 0`;
      if (shift === 0) {
        chunks.push(`BigInt(${chunk})`);
      } else {
        chunks.push(`(BigInt(${chunk}) << ${shift}n)`);
      }
      byteIndex += 4;
      remainingBytes -= 4;
    } else {
      // Remaining bytes (1-3)
      let chunk: string;
      if (remainingBytes === 3) {
        chunk = `(${at(byteIndex)} << 16) | (${at(byteIndex + 1)} << 8) | ${at(byteIndex + 2)}`;
      } else if (remainingBytes === 2) {
        chunk = `(${at(byteIndex)} << 8) | ${at(byteIndex + 1)}`;
      } else {
        chunk = at(byteIndex);
      }
      chunks.push(`BigInt(${chunk})`);
      remainingBytes = 0;
    }
  }

  const offset = aligned ? '' : `var o = data.length - ${totalBytes};\n`;

  return `${offset}data =\n    ${chunks.join('\n  | ')};`;
}

function buildFieldsInfo(
  fields: BitUnpack.Field[],
  totalBits: number,
): FieldInfo[] {
  const result: FieldInfo[] = [];
  let currentBitPosition = totalBits;

  fields.forEach((field, idx) => {
    const startBit = currentBitPosition - field.bits;
    const endBit = currentBitPosition - 1;

    result.push({
      id: `f_${idx}`,
      ...field,
      mask: (1n << BigInt(field.bits)) - 1n,
      startBit,
      endBit,
    });

    currentBitPosition -= field.bits;
  });

  return result;
}
