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

export function bitUnpack<
  const TFields extends BitUnpack.Field[],
  TFieldNames extends string = BitUnpack.ExtractFieldNames<TFields>,
>(options: BitUnpack.Options<TFields>): BitUnpack.API<TFieldNames> {
  assert.notEmpty(options.fields, 'fields cannot be empty');
  assert.greaterThan(options.totalBits, 0, 'totalBits must be greater than 0');

  const fields = buildFieldsInfo(options.fields, options.totalBits);

  // FN: BigInt - direct BigInt bit operations
  const fnBigIntCode = [`return ${compileFields(fields)};`].join('\n');

  const fnBigInt = createFunction<BitUnpack.Fn.BigInt>(
    'bigint',
    fnBigIntCode,
    'data',
  );

  // FN: Number
  const fnNumberCode = [
    '\n// Extract container from number',
    'data = BigInt(data);',
    '\n// Return result',
    `return ${compileFields(fields)};`,
  ].join('\n');

  const fnNumber = createFunction<BitUnpack.Fn.Number>(
    'number',
    fnNumberCode,
    'data',
  );

  // FN: Buffer
  const fnBufferCode = [
    '\n// Extract bytes from buffer (big-endian)',
    extractBigIntFromBuffer(options.totalBits),
    '\n// Return result',
    `return ${compileFields(fields)};`,
  ].join('\n');

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

function extractBigIntFromBuffer(totalBits: number): string {
  const totalBytes = Math.ceil(totalBits / 8);
  const chunks: string[] = [];

  let byteIndex = 0;
  let remainingBytes = totalBytes;

  while (remainingBytes > 0) {
    if (remainingBytes >= 4) {
      // Full 32-bit chunk
      const shift = (remainingBytes - 4) * 8;
      const chunk = `((data[${byteIndex}] << 24) | (data[${byteIndex + 1}] << 16) | (data[${byteIndex + 2}] << 8) | data[${byteIndex + 3}]) >>> 0`;
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
        chunk = `(data[${byteIndex}] << 16) | (data[${byteIndex + 1}] << 8) | data[${byteIndex + 2}]`;
      } else if (remainingBytes === 2) {
        chunk = `(data[${byteIndex}] << 8) | data[${byteIndex + 1}]`;
      } else {
        chunk = `data[${byteIndex}]`;
      }
      chunks.push(`BigInt(${chunk})`);
      remainingBytes = 0;
    }
  }

  return `data =\n    ${chunks.join('\n  | ')};`;
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
