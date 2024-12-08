import { Base64Encoding } from './Base64Encoding';

export const base64 = new Base64Encoding(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
);

export const base64url = new Base64Encoding(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
);
