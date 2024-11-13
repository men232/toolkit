import { timestamp } from '@/num';
import { hex } from '../hex';

let index = Math.floor(Math.random() * 0xffffff);

const buffer = new Uint8Array(12);

/**
 * Useful when you need to generate almost secure object id in browser
 *
 * Based on [bson](https://github.com/mongodb/js-bson/blob/main/src/objectid.ts)
 *
 * @example
 * const userId = objectId(); // '67350af7885ba34010c83859'
 *
 * @group Strings
 */
export function objectId(fromValue: number | Date = Date.now()): string {
  const value = timestamp(fromValue);
  const inc = getInc();

  buffer[0] = value >> 24;
  buffer[1] = value >> 16;
  buffer[2] = value >> 8;
  buffer[3] = value;

  buffer[4] = Math.floor(Math.random() * 256);
  buffer[5] = Math.floor(Math.random() * 256);
  buffer[6] = Math.floor(Math.random() * 256);
  buffer[7] = Math.floor(Math.random() * 256);
  buffer[8] = Math.floor(Math.random() * 256);

  buffer[11] = inc & 0xff;
  buffer[10] = (inc >> 8) & 0xff;
  buffer[9] = (inc >> 16) & 0xff;

  return hex(buffer);
}

function getInc(): number {
  return (index = (index + 1) % 0xffffff);
}
