import { assert } from '@andrew_l/toolkit';
import type { BinaryReader } from './BinaryReader';
import type { BinaryWriter } from './BinaryWriter';

export type EncodeHandler<T = any> = (this: BinaryWriter, value: T) => void;

export type DecodeHandler<T = any> = (this: BinaryReader) => T;

export interface TLExtension<T = any> {
  token: number;
  encode: EncodeHandler<T>;
  decode: DecodeHandler<T>;
}

export function createExtension(
  token: number,
  { encode, decode }: { encode: EncodeHandler; decode: DecodeHandler },
): TLExtension {
  assert.ok(Math.trunc(token) === token, ' Token must be integer value.');

  assert.ok(
    token === -1 || (token >= 0 && token <= 255),
    'Token must be a 8 bit number. (0 - 255)',
  );

  assert.ok(token === -1 || token >= 35, 'Tokens from 0 to 34 reserved.');

  return {
    token,
    encode,
    decode,
  };
}
