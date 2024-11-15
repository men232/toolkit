import { isString } from '@/is';

const DEF_PROTOCOLS = ['http://', 'https://'];

/**
 * Checks if the provided URL string has a protocol prefix, such as `http://` or `https://`.
 * The function checks whether the URL starts with any of the specified protocols (defaults to HTTP and HTTPS).
 *
 * This can be useful for validating URLs or ensuring a URL has a valid protocol before using it in network requests.
 *
 * @example
 * hasProtocol('https://google.com'); // true
 * hasProtocol('http://google.com'); // true
 * hasProtocol('google.com'); // false
 *
 * @param url - The URL string to check.
 * @param protocols - An array of protocol prefixes to check against (defaults to `['http://', 'https://']`).
 * @returns `true` if the URL starts with one of the provided protocols, `false` otherwise.
 *
 * @group Strings
 */
export function hasProtocol(url: string, protocols: string[] = DEF_PROTOCOLS) {
  if (!isString(url)) return false;

  return protocols.some(v => url.startsWith(v));
}
