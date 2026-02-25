import { toError } from '@/toError';
import type { AnyFunction } from '@/types';

export type WithCode<T extends AnyFunction> = T & { code: string };

export function createFunction<T extends AnyFunction>(
  fnName: string,
  code: string,
  ...args: any[]
): WithCode<T> {
  try {
    const fn = new Function(...args, code) as WithCode<T>;
    fn.code = code;
    return fn;
  } catch (err) {
    throw new Error(
      `failed to create bitPack.${fnName}()\nError: ${toError(err).message}\n-- CODE START --\n${code}\n-- CODE END--`,
    );
  }
}
