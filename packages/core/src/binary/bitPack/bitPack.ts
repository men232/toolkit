import { assert } from '@/assert';
import { createFunction } from '@/function/createFunction';
import { def } from '@/object';
import type { AnyFunction } from '@/types';

export namespace BitPack {
  export type Field = {
    name: string;
    bits: number;
    take: Take;
  };

  export type Options<TFields extends Field[]> = {
    totalBits: number;
    fields: TFields;
    debug?: boolean;
    optimize?: boolean;
  };

  export type Take = 'low' | 'high';

  export type API<TFields extends string = string> = {
    buffer: Fn.Buffer<TFields>;
    number: Fn.Number<TFields>;
    bigint: Fn.BigInt<TFields>;
    bits: Fn.Bits<TFields>;
    plan?: Plan[];
  };

  export namespace Fn {
    export type Buffer<TFields extends string = string> = WithDebug<
      (data: FieldOptions<TFields>) => Uint8Array
    >;

    export type Number<TFields extends string = string> = WithDebug<
      (data: FieldOptions<TFields>) => number
    >;

    export type BigInt<TFields extends string = string> = WithDebug<
      (data: FieldOptions<TFields>) => bigint
    >;

    export type Bits<TFields extends string = string> = WithDebug<
      (data: FieldOptions<TFields>) => string
    >;
  }

  export type WithDebug<T extends AnyFunction> = T & { code?: string };

  export type ExtractFieldNames<T extends Field[]> = T[number]['name'];

  export type FieldOptions<T extends string> = {
    [P in T]: number;
  };
}

type FieldInfo = BitPack.Field & {
  id: string;
  startBit: number;
  endBit: number;
  mask: number;
};

type Plan = {
  object: 'set' | 'value';
  container?: number;
  bits?: number;
  offset?: number;
  value?: unknown;
  child?: Plan;
};

export function bitPack<
  const TFields extends BitPack.Field[],
  TFieldNames extends string = BitPack.ExtractFieldNames<TFields>,
>(options: BitPack.Options<TFields>): BitPack.API<TFieldNames> {
  assert.notEmpty(options.fields, 'fields cannot be empty');
  assert.greaterThan(options.totalBits, 0, 'totalBits must be greater than 0');

  const fields = buildFieldsInfo(options.fields, options.totalBits);
  const plan = buildPlan(fields);
  const containersCount = Math.ceil(options.totalBits / 32);

  const buf = new Uint8Array(containersCount * 4);

  const baseCode = [
    '\n// Field init',
    initFields(fields),
    '\n// Plan',
    compilePlan(plan, options.optimize),
  ];

  // FN: Buffer
  const fnBufferCode = [
    ...baseCode,
    '\n// Return result',
    buildBufferResult(containersCount),
  ].join('\n');

  const fnBuffer: BitPack.Fn.Buffer = createFunction(
    'buffer',
    fnBufferCode,
    'data',
  );

  // FN: BigInt
  const fnBigIntCode = [
    ...baseCode,
    '\n// Return result',
    buildBigIntResult(containersCount),
  ].join('\n');

  const fnBigInt = createFunction<BitPack.Fn.BigInt>(
    'bigint',
    fnBigIntCode,
    'data',
  );

  // FN: Number
  const fnNumberCode = [
    ...baseCode,
    '\n// Return result',
    buildNumberResult(containersCount),
  ].join('\n');

  const fnNumber = createFunction<BitPack.Fn.Number>(
    'number',
    fnNumberCode,
    'data',
  );

  // FN: Bits
  const fnBitsCode = [
    ...baseCode,
    '\n// Return result',
    buildBitsResult(containersCount, options.totalBits),
  ].join('\n');

  const fnBits = createFunction<BitPack.Fn.Bits>('bits', fnBitsCode, 'data');

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
    plan: options.debug ? plan : undefined,
    __buf: buf,
  } as BitPack.API<TFieldNames>;
}

function initFields(fields: FieldInfo[]): string {
  return fields
    .map(field => {
      if (field.bits > 32) {
        assert.ok(
          field.take === 'low',
          `Fields more than 32 bits with take 'high' not yet supported`,
        );

        const highMask = Math.pow(2, field.bits - 32) - 1;
        return [
          `var ${field.id}_high = ((data['${field.name}'] / 0x100000000) | 0) & 0x${highMask.toString(16)};`,
          `var ${field.id}_low = (data['${field.name}'] >>> 0);`,
        ].join('\n');
      }

      if (field.take === 'high') {
        return `var ${field.id} = (data['${field.name}'] / 0x100000000) | 0;`;
      }

      return `var ${field.id} = (data['${field.name}'] & 0x${field.mask.toString(16)}) >>> 0;`;
    })
    .join('\n');
}

function buildBufferResult(containersCount: number): string {
  const lines: string[] = [`var buf = this.__buf;`];
  for (let i = 0; i < containersCount; i++) {
    const containerIndex = containersCount - 1 - i; // Big-endian order
    lines.push(
      `buf[${i * 4}] = c_${containerIndex} >>> 24;`,
      `buf[${i * 4 + 1}] = c_${containerIndex} >>> 16;`,
      `buf[${i * 4 + 2}] = c_${containerIndex} >>> 8;`,
      `buf[${i * 4 + 3}] = c_${containerIndex};`,
    );
  }
  lines.push('return buf;');
  return lines.join('\n');
}

function buildBigIntResult(containersCount: number): string {
  const parts: string[] = [];

  for (let i = 0; i < containersCount; i++) {
    const containerIndex = containersCount - 1 - i; // Big-endian order

    if (containerIndex > 0) {
      parts.push(
        `(BigInt(c_${containerIndex} >>> 0) << ${containerIndex * 32}n)`,
      );
    } else {
      parts.push(`BigInt(c_${containerIndex} >>> 0)`);
    }
  }

  return `return (\n  ${parts.join(' |\n  ')}\n);`;
}

function buildNumberResult(containersCount: number): string {
  return `return c_0;`;
}

function buildBitsResult(containersCount: number, totalBits: number): string {
  const parts: string[] = [];

  for (let i = 0; i < containersCount; i++) {
    const containerIndex = containersCount - 1 - i; // Big-endian order

    if (containerIndex > 0) {
      parts.push(
        `(BigInt(c_${containerIndex} >>> 0) << ${containerIndex * 32}n)`,
      );
    } else {
      parts.push(`BigInt(c_${containerIndex} >>> 0)`);
    }
  }

  return `return (\n  ${parts.join(' |\n  ')}\n).toString(2).padStart(${totalBits}, '0');`;
}

function compilePlan(plan: Plan[], optimize?: boolean): string {
  if (optimize) {
    plan = optimizePlan(plan);
  }

  const assigned = new Set<number>();
  return plan.map(item => compilePlanItem(item, assigned)).join('\n');
}

function optimizePlan(plan: Plan[]): Plan[] {
  return plan.reduce<Plan[]>((result, item) => {
    const prev = result.at(-1);

    if (canMergeSetOperations(prev, item)) {
      result.pop();
      result.push({
        object: 'set',
        container: item.container,
        child: {
          object: 'value',
          value: [
            compilePlanItem(prev!.child!),
            compilePlanItem(item.child!),
          ].join(' |\n  '),
        },
      });
    } else {
      result.push(item);
    }

    return result;
  }, []);
}

function canMergeSetOperations(prev: Plan | undefined, current: Plan): boolean {
  return (
    prev?.object === 'set' &&
    current.object === 'set' &&
    prev.container === current.container
  );
}

function compilePlanItem(plan: Plan, assigned?: Set<number>): string {
  switch (plan.object) {
    case 'set':
      if (assigned && !assigned.has(plan.container!)) {
        assigned.add(plan.container!);
        return `var c_${plan.container} = ${compilePlanItem(plan.child!)};`;
      }
      return `c_${plan.container} |= ${compilePlanItem(plan.child!)};`;

    case 'value':
      const offset = plan.offset ?? 0;
      return offset > 0 ? `(${plan.value}) << ${offset}` : `(${plan.value})`;

    default:
      throw new Error(`Unknown plan object: ${plan.object}`);
  }
}

function buildPlan(fields: FieldInfo[]): Plan[] {
  const result: Plan[] = [];

  for (const field of fields) {
    const startContainer = Math.floor(field.startBit / 32);
    const endContainer = Math.floor(field.endBit / 32);

    if (startContainer === endContainer) {
      addSingleContainerField(field, result);
    } else if (field.bits <= 32) {
      addSpanningField(field, result);
    } else {
      addLargeField(field, result);
    }
  }

  return result;
}

function addSingleContainerField(field: FieldInfo, result: Plan[]): void {
  result.push({
    object: 'set',
    container: Math.floor(field.startBit / 32),
    child: {
      object: 'value',
      offset: field.startBit % 32,
      value: field.id,
    },
  });
}

function addSpanningField(field: FieldInfo, result: Plan[]): void {
  const startContainer = Math.floor(field.startBit / 32);
  const endContainer = Math.floor(field.endBit / 32);
  const firstContainerBits = 32 - (field.startBit % 32);

  // First part
  result.push({
    object: 'set',
    container: startContainer,
    child: {
      object: 'value',
      offset: field.startBit % 32,
      value: `(${field.id}) & ${(1 << firstContainerBits) - 1}`,
    },
  });

  // Second part
  result.push({
    object: 'set',
    container: endContainer,
    child: {
      object: 'value',
      value: `(${field.id}) >>> ${firstContainerBits}`,
    },
  });
}

function addLargeField(field: FieldInfo, result: Plan[]): void {
  const startContainer = Math.floor(field.startBit / 32);
  const endContainer = Math.floor(field.endBit / 32);
  const startOffset = field.startBit % 32;

  assert.ok(
    startContainer !== endContainer,
    `Large field ${field.name} fits in single container - logic error`,
  );

  assert.ok(
    endContainer - startContainer === 1,
    `Fields spanning more than 2 containers (${field.bits} bits) not yet supported`,
  );

  const bitsInLowerContainer = 32 - startOffset;

  // Add high bits to lower container
  result.push({
    object: 'set',
    container: endContainer,
    child: {
      object: 'value',
      offset: startOffset,
      value: `${field.id}_high`,
    },
  });

  // Add low bits if needed
  if (bitsInLowerContainer < 32) {
    result.push({
      object: 'set',
      container: endContainer,
      child: {
        object: 'value',
        value: `${field.id}_low >>> ${bitsInLowerContainer}`,
      },
    });
  }

  // Add remaining low bits to upper container
  if (field.bits > 32) {
    result.push({
      object: 'set',
      container: startContainer,
      child: {
        object: 'value',
        offset: startOffset,
        value: `${field.id}_low`,
      },
    });
  }
}

function buildFieldsInfo(
  fields: BitPack.Field[],
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
      startBit,
      endBit,
      mask: Math.pow(2, field.bits) - 1,
    });

    currentBitPosition -= field.bits;
  });

  return result;
}
