import { isString } from '@/is';

const DEF_PROTOCOLS = ['http://', 'https://'];

/**
 * Check if provided string has protocol prefix
 *
 * @example
 * console.log('https://google.com') // true
 * console.log('http://google.com') // true
 * console.log('google.com') // false
 *
 * @groups Strings
 */
export function hasProtocol(url: string, protocols: string[] = DEF_PROTOCOLS) {
  if (!isString(url)) return false;

  return protocols.some(v => url.startsWith(v));
}
