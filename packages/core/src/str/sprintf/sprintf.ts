/**
 * Allows you to create strings with specified formats.
 *
 * ⚠️ This function mutates arguments. Anything that is not included in the formatting will be added to `unusedArgs` array.
 *
 * @example
 * const unusedArgs: any[] = [];
 *
 * console.log(sprintf('Hello %s', ['World', 'Great'], unusedArgs))
 *
 * console.log(unusedArgs); // ['Great']
 *
 * @group Strings
 */
export function sprintf(line: string, args: any[], unusedArgs: any[] = []) {
  let result = '';

  const argsLen = args.length;
  const lineLen = line.length;

  let opened = false;
  let currentChar = -1;
  let lastPos = 0;
  let argsIndex = 0;

  for (let idx = 0; idx < lineLen; idx++) {
    currentChar = line.charCodeAt(idx);

    // "%" found
    if (currentChar === 37) {
      opened = true;
      continue;
    }

    if (!opened) continue;

    opened = false;

    switch (currentChar) {
      // 'd'
      case 100:
      // 'f'
      case 102: {
        result += line.slice(lastPos, idx - 1);
        result += Number(args[argsIndex]);
        lastPos = idx + 1;
        argsIndex++;
        break;
      }

      // 'i'
      case 105: {
        result += line.slice(lastPos, idx - 1);
        result += Math.floor(Number(args[argsIndex]));
        lastPos = idx + 1;
        argsIndex++;
        break;
      }

      // 'O'
      case 79:
      // 'o'
      case 111:
      // 'j'
      case 106: {
        result += line.slice(lastPos, idx - 1);
        result += tryStringify(args[argsIndex]);
        lastPos = idx + 1;
        argsIndex++;
        break;
      }

      // 's'
      case 115: {
        result += line.slice(lastPos, idx - 1);
        result += String(args[argsIndex]);
        lastPos = idx + 1;
        argsIndex++;
        break;
      }
    }

    if (argsIndex >= argsLen) break;
  }

  if (lastPos < lineLen) {
    result += line.slice(lastPos, lineLen);
  }

  if (argsIndex < argsLen) {
    unusedArgs.push(...args.slice(argsIndex, argsLen));
  }

  return result;
}

function tryStringify(o: unknown) {
  switch (typeof o) {
    case 'function': {
      return o.name || '<anonymous>';
    }

    case 'string': {
      return "'" + o + "'";
    }

    default: {
      try {
        return JSON.stringify(o);
      } catch (e) {
        return '"[Circular]"';
      }
    }
  }
}
