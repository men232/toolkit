import { isNumber } from './is';

type Dict<T> = { [key: string]: T | undefined };

export const env: ReturnType<typeof createEnvParser> = (() => {
  if ((globalThis as any)?.process) {
    return createEnvParser(process.env);
  } else {
    return createEnvParser((import.meta as any).env);
  }
})();

export function createEnvParser(
  targetObject: Record<string, string> | Dict<string>,
) {
  return Object.freeze({
    /**
     * NODE_ENV is `development`
     */
    isDevelopment: targetObject.NODE_ENV === 'development',

    /**
     * NODE_ENV is `production`
     */
    isProduction: targetObject.NODE_ENV === 'production',

    /**
     * NODE_ENV is `stage`
     */
    isStage: targetObject.NODE_ENV === 'state',

    /**
     * NODE_ENV is `test`
     */
    isTest: targetObject.NODE_ENV === 'test',

    bool(key: string, defValue: boolean = false): boolean {
      if (!(key in targetObject)) {
        return defValue;
      }

      return targetObject[key] === 'true';
    },

    int(key: string, defValue: number = 0): number {
      if (!(key in targetObject)) {
        return defValue;
      }

      const value = parseInt((targetObject as any)[key]);

      if (isNumber(value)) {
        return defValue;
      }

      return value;
    },

    string(key: string, defValue: string = ''): string {
      return targetObject[key] || defValue;
    },

    list<T extends 'string' | 'int'>(
      key: string,
      type: T,
      defValue: T extends 'int' ? number[] : string[] = [],
    ): T extends 'int' ? number[] : string[] {
      if (!(key in targetObject)) {
        return defValue;
      }

      let list: any[] = (targetObject as any)[key]
        .split(',')
        .map((v: any) => v.trim());

      if (type === 'int') {
        list = list
          .map(v => parseInt(v))
          .filter((value, idx) => {
            if (isNaN(value)) {
              console.warn('Failed to parse list item as int', {
                key,
                idx,
                value,
              });
              return false;
            }

            return true;
          });
      }

      return list;
    },

    json<T = any>(key: string, defValue: T | null = null): T | null {
      if (!(key in targetObject)) {
        return defValue;
      }

      try {
        // @ts-expect-error
        return JSON.parse(targetObject[key]);
      } catch (err) {
        console.warn('Failed to parse json env variable', key);
        return defValue;
      }
    },
  });
}
