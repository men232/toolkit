import { assert } from '@andrew_l/toolkit';
import type { BinaryReader } from './BinaryReader';
import type { BinaryWriter } from './BinaryWriter';

export type EncodeHandler = (this: BinaryWriter, value: any) => void;

export type DecodeHandler = (this: BinaryReader) => any;

export interface TLExtension {
  token: number;
  encode: EncodeHandler;
  decode: DecodeHandler;
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
