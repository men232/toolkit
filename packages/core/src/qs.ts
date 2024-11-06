import { isDate, isFunction, isObject } from './is.js';

/**
 * Simple function to transform object into query string (not standards)
 * @group Utility Functions
 */
export function qs(obj: object): string {
  const urlSearchParams = new URLSearchParams();

  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;

    value = stringifyValue(value);

    if (value === '' || value === '{}') continue;

    urlSearchParams.set(key, value);
  }

  return urlSearchParams.toString();
}

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) {
    value = value
      .filter(v => v !== undefined)
      .map(stringifyValue)
      .join(',');
  } else if (isDate(value)) {
    value = value.toISOString();
  } else if (isObject(value)) {
    value = JSON.stringify(value);
  } else if (isFunction(value?.toString)) {
    value = value.toString();
  } else {
    value = String(value);
  }

  return value as string;
}
