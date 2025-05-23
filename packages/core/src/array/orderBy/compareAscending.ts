import { isSymbol } from '@/is';

export function compareAscending(value: any, other: any) {
  if (value !== other) {
    const valIsDefined = value !== undefined,
      valIsNull = value === null,
      valIsReflexive = value === value,
      valIsSymbol = isSymbol(value);

    const othIsDefined = other !== undefined,
      othIsNull = other === null,
      othIsReflexive = other === other,
      othIsSymbol = isSymbol(other);

    if (
      (!othIsNull && !othIsSymbol && !valIsSymbol && value > other) ||
      (valIsSymbol &&
        othIsDefined &&
        othIsReflexive &&
        !othIsNull &&
        !othIsSymbol) ||
      (valIsNull && othIsDefined && othIsReflexive) ||
      (!valIsDefined && othIsReflexive) ||
      !valIsReflexive
    ) {
      return 1;
    }
    if (
      (!valIsNull && !valIsSymbol && !othIsSymbol && value < other) ||
      (othIsSymbol &&
        valIsDefined &&
        valIsReflexive &&
        !valIsNull &&
        !valIsSymbol) ||
      (othIsNull && valIsDefined && valIsReflexive) ||
      (!othIsDefined && valIsReflexive) ||
      !othIsReflexive
    ) {
      return -1;
    }
  }
  return 0;
}
