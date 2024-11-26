import { isString } from '@andrew_l/toolkit';

export function cleanLines(fromNumber: number, toNumber: number) {
  for (let line = fromNumber; line < toNumber; line++) {
    process.stdout.cursorTo(0, line);
    process.stdout.clearLine(1);
  }
}

export function writeCleaner(stdout: NodeJS.WriteStream, y: number) {
  let prevHeight: number = 0;

  return (...args: any[]) => {
    const text = args
      .map(v => (isString(v) ? v : JSON.stringify(v, null, 2)))
      .join('\n\n');

    stdout.cursorTo(0, y);
    stdout.write(text);

    const lineHeight = stdout.columns;
    const newLength = text
      .split('\n')
      .map(v => Math.max(v.length / lineHeight, 1))
      .reduce((a, b) => a + b, 0);

    cleanLines(y + prevHeight, y + newLength);

    prevHeight = newLength;
  };
}
