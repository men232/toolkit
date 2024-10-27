interface PrefixedValuesOptions {
  /**
   * Key prefix
   */
  prefix: string;

  /**
   * Remove prefix from resulted object
   */
  prefixTrim?: boolean;
}

/**
 * Pick prefixed keys in target object
 *
 * @example
 * const record = {
 *   id: 1,
 *   canRead: true,
 *   canWrite: true,
 * };
 *
 *  // { canRead: true, canWrite: true }
 * pickPrefixed(record, 'can');
 *
 * // { Read: true, Write: true }
 * pickPrefixed(record, { prefix: 'can', prefixTrim: true });
 *
 * @group Object
 */
export function pickPrefixed(
  obj: object,
  options: PrefixedValuesOptions | string,
) {
  let prefix;
  let prefixTrim = true;

  if (typeof options === 'string') {
    prefix = options;
  } else {
    prefix = options.prefix;
    prefixTrim = options.prefixTrim !== false;
  }

  const result = {};

  for (let [key, value] of Object.entries(obj)) {
    if (!key.startsWith(prefix!)) continue;
    if (prefixTrim) key = key.substring(prefix!.length);

    // @ts-expect-error
    result[key] = value;
  }

  return result;
}
