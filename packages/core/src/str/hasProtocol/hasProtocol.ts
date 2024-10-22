import { isString } from '@/is';

const DEF_PROTOCOLS = ['http://', 'https://'];

export function hasProtocol(url: string, protocols: string[] = DEF_PROTOCOLS) {
  if (!isString(url)) return false;

  return protocols.some(v => url.startsWith(v));
}
