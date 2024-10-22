import { isObject } from '@/is';

export const deepAssign = (dest: object, source: object): void => {
  for (const key of Object.keys(source)) {
    const destValue = (dest as any)[key];
    const sourceValue = (source as any)[key];

    if (isObject(destValue) && isObject(sourceValue)) {
      deepAssign(destValue as any, sourceValue as any);
    } else {
      (dest as any)[key] = sourceValue;
    }
  }
};
