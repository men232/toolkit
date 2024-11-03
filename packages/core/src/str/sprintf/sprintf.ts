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

    if (currentChar === 37) {
      opened = true;
      continue;
    }

    if (!opened) continue;

    opened = false;

    switch (currentChar) {
      case 100: // 'd'
      case 102: {
        // 'f'
        result += line.slice(lastPos, idx - 1);
        result += Number(args[argsIndex]);
        lastPos = idx + 1;
        argsIndex++;
        break;
      }

      case 105: {
        // 'i'
        result += line.slice(lastPos, idx - 1);
        result += Math.floor(Number(args[argsIndex]));
        lastPos = idx + 1;
        argsIndex++;
        break;
      }

      case 79: // 'O'
      case 111: // 'o'
      case 106: {
        // 'j'
        result += line.slice(lastPos, idx - 1);
        result += tryStringify(args[argsIndex]);
        lastPos = idx + 1;
        argsIndex++;
        break;
      }

      case 115: {
        // 's'
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
