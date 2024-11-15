/**
 * Formats a string by replacing format specifiers with values from the provided arguments.
 * It supports a variety of format types, including strings, numbers, and objects.
 *
 * ⚠️ This function mutates the `unusedArgs` array, which will contain any arguments
 * that were not used in the formatting process.
 *
 * @param line - The format string containing placeholders to be replaced by arguments.
 *   Format specifiers are indicated by the `%` symbol, followed by a character indicating
 *   the type of argument to insert (e.g., `%s` for string, `%d` for integer, `%f` for float).
 * @param args - The array of arguments to replace the format specifiers in the string.
 *   The function will iterate over the arguments and substitute them into the format string
 *   in the order they appear.
 * @param [unusedArgs=[]] - The array that will collect any unused arguments
 *   that were not needed for formatting. This array is mutated by the function.
 *
 * @returns {string} The formatted string with placeholders replaced by corresponding arguments.
 *
 * @example
 * const unusedArgs: any[] = [];
 *
 * console.log(sprintf('Hello %s', ['World', 'Great'], unusedArgs));
 * // Output: 'Hello World'
 * console.log(unusedArgs);
 * // Output: ['Great']
 *
 * @example
 * console.log(sprintf('I have %d apples and %f.5 liters of water.', [5, 3.2], unusedArgs));
 * // Output: 'I have 5 apples and 3.2 liters of water.'
 * console.log(unusedArgs);
 * // Output: []
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
