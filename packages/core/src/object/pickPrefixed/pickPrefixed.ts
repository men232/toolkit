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
 */
export function prefixedValues(
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
