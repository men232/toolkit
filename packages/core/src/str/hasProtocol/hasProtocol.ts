import { isString } from '@/is';

const DEF_PROTOCOLS = ['http://', 'https://'];

/**
 * Check if provided string has protocol prefix
 *
 * @example
 * hasProtocol('https://google.com'); // true
 * hasProtocol('http://google.com'); // true
 * hasProtocol('google.com'); // false
 *
 * @group Strings
 */
export function hasProtocol(url: string, protocols: string[] = DEF_PROTOCOLS) {
  if (!isString(url)) return false;

  return protocols.some(v => url.startsWith(v));
}
