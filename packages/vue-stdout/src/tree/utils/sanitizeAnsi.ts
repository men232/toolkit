import { hasAnsiControlCharacters, tokenizeAnsi } from './ansiTokenizer';

const sgrParametersRegex = /^[\d:;]*$/;

/**
 * Strip ANSI escape sequences that would conflict with our layout, or that
 * could corrupt the user's terminal outright.
 *
 * Ported from ink's `sanitize-ansi.ts`. Preserved: SGR sequences (colours,
 * bold, etc. -- end in `m`) and OSC sequences (hyperlinks, etc.). Stripped:
 * cursor movement, screen clearing, the alternate-screen-buffer switch, and
 * any other control sequence.
 *
 * Without this, a plain `<Text>{someString}</Text>` where `someString` is a
 * log line, an API response, or a filename a program did not write itself
 * can clear or otherwise corrupt the user's terminal on render -- no
 * `Transform` required.
 */
export const sanitizeAnsi = (text: string): string => {
  if (!hasAnsiControlCharacters(text)) {
    return text;
  }

  let output = '';

  for (const token of tokenizeAnsi(text)) {
    if (token.type === 'text' || token.type === 'osc') {
      output += token.value;
      continue;
    }

    if (
      token.type === 'csi' &&
      token.finalCharacter === 'm' &&
      token.intermediateString === '' &&
      sgrParametersRegex.test(token.parameterString)
    ) {
      output += token.value;
    }
  }

  return output;
};
