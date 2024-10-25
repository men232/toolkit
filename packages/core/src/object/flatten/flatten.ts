import { isObject } from '@/is';

interface FlattenOptions {
  separator?: string;
  initialPrefix?: string;
  withArrays?: boolean;
  isObjectCompare?: (value: unknown) => boolean;
}

/**
 * Flat object
 *
 * @group Object
 */
export function flatten(
  obj: Record<string, unknown>,
  {
    separator = '_',
    initialPrefix = '',
    withArrays = true,
    isObjectCompare = isObject,
  }: FlattenOptions = {},
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const processed = new WeakSet();

  const handle = (node: any, prefix: string, initial?: boolean) => {
    if (processed.has(node)) return;

    if (isObjectCompare(node)) {
      processed.add(node);

      prefix = prefix && !initial ? `${prefix}${separator}` : prefix;

      for (const [key, value] of Object.entries(node)) {
        handle(value, `${prefix}${key}`);
      }

      return;
    }

    if (Array.isArray(node) && withArrays) {
      processed.add(node);

      prefix = prefix && !initial ? `${prefix}${separator}` : prefix;

      node.forEach((value, idx) => handle(value, `${prefix}${idx}`));

      return;
    }

    result[prefix] = node;
  };

  handle(obj, initialPrefix, true);

  return result;
}
