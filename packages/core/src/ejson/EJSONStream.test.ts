import { describe, expect, it } from 'vitest';
import { createEJSONStream } from './createEJSONStream';

describe('EJSONStream', () => {
  it('should handle plain items', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);
    const jsonStream = createEJSONStream();

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('[1,2,3,4]');
  });

  it('should handle object items', async () => {
    const dataStream = readableStream([{ v: 1 }, { v: 2 }, { v: 3 }, { v: 4 }]);

    const jsonStream = createEJSONStream();

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('[{"v":1},{"v":2},{"v":3},{"v":4}]');
  });

  it('should handle custom symbols', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({ sep: '|', op: '(', cl: ')' });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('(1|2|3|4)');
  });

  it('should handle result key', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({ resultKey: 'data' });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"data":[1,2,3,4]}');
  });

  it('should handle prepend', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      prepend: () => Promise.resolve({ status: 200 }),
    });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"status":200,"data":[1,2,3,4]}');
  });

  it('should handle empty prepend', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      prepend: () => Promise.resolve({}),
    });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"data":[1,2,3,4]}');
  });

  it('should handle null prepend', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      prepend: () => null,
    });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"data":[1,2,3,4]}');
  });

  it('should handle undefined prepend', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      prepend: () => undefined,
    });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"data":[1,2,3,4]}');
  });

  it('should throw error when prepend returns not a object', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      prepend: () => [],
    });

    dataStream.pipeThrough(jsonStream);

    expect(() => streamToArray(jsonStream.readable)).rejects.toThrowError(
      'expected to be plain object',
    );
  });

  it('should handle append', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      append: () => Promise.resolve({ status: 200 }),
    });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"data":[1,2,3,4],"status":200}');
  });

  it('should handle empty append', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      append: () => Promise.resolve({}),
    });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"data":[1,2,3,4]}');
  });

  it('should handle null append', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      append: () => null,
    });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"data":[1,2,3,4]}');
  });

  it('should handle undefined append', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      append: () => undefined,
    });

    dataStream.pipeThrough(jsonStream);

    const result = await streamToArray(jsonStream.readable);

    expect(result.join('')).toBe('{"data":[1,2,3,4]}');
  });

  it('should throw error when append returns not a object', async () => {
    const dataStream = readableStream([1, 2, 3, 4]);

    const jsonStream = createEJSONStream({
      resultKey: 'data',
      append: () => [],
    });

    dataStream.pipeThrough(jsonStream);

    expect(() => streamToArray(jsonStream.readable)).rejects.toThrowError(
      'expected to be plain object',
    );
  });
});

async function streamToArray(stream: ReadableStream) {
  const reader = stream.getReader();
  const resultArray = [];

  let done = false;
  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (value) {
      resultArray.push(value);
    }
    done = streamDone;
  }

  return resultArray;
}

function readableStream(values: any[]) {
  return new ReadableStream({
    start(controller) {
      for (const item of values) {
        controller.enqueue(item);
      }
      controller.close();
    },
  });
}
