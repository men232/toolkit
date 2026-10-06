import { describe, expect, it } from 'vitest';
import { SimpleEventEmitter } from './SimpleEventEmitter';

describe('SimpleEventEmitter', () => {
  it('.on()', () => {
    const emitter = new SimpleEventEmitter();

    let called = 0;

    emitter.on('test', () => {
      called++;
    });

    emitter.emit('test');
    emitter.emit('test');
    emitter.emit('test');

    expect(called).toBe(3);
  });

  it('.once()', () => {
    const emitter = new SimpleEventEmitter();

    let called = 0;

    emitter.once('test', () => {
      called++;
    });

    emitter.emit('test');
    emitter.emit('test');
    emitter.emit('test');

    expect(called).toBe(1);
  });

  it('.off()', () => {
    const emitter = new SimpleEventEmitter();

    let called = 0;

    const onCallback = () => {
      called++;
    };

    const onCallback2 = () => {
      called++;
    };

    emitter.on('test', onCallback);
    emitter.on('test', onCallback2);

    emitter.emit('test');

    emitter.off('test', onCallback);

    emitter.emit('test');

    expect(called).toBe(3);
  });

  it('.removeAllListeners()', () => {
    const emitter = new SimpleEventEmitter();

    let called = 0;

    const onCallback = () => {
      called++;
    };

    const onCallback2 = () => {
      called++;
    };

    emitter.on('test', onCallback);
    emitter.on('test', onCallback2);

    emitter.emit('test');

    emitter.removeAllListeners('test');

    emitter.emit('test');

    expect(called).toBe(2);
  });

  it('should not call a once listener re-added during emit in the same emit', () => {
    const emitter = new SimpleEventEmitter();
    let called = 0;
    const handler = () => {
      called++;
      if (called < 100) emitter.once('test', handler);
    };

    emitter.on('test', () => {});
    emitter.once('test', handler);
    emitter.emit('test');
    expect(called).toBe(1);

    emitter.emit('test');
    expect(called).toBe(2);
  });

  it('should not call a listener added during emit in the same emit', () => {
    const emitter = new SimpleEventEmitter();
    const calls: string[] = [];

    emitter.on('test', () => {
      calls.push('a');
      emitter.on('test', () => calls.push('b'));
    });

    emitter.emit('test');
    expect(calls).toEqual(['a']);
  });

  it('should call a listener once even if added twice', () => {
    const emitter = new SimpleEventEmitter();
    let called = 0;
    const handler = () => called++;

    emitter.on('test', handler);
    emitter.on('test', handler);
    emitter.emit('test');

    expect(called).toBe(1);
  });

  it('should remove a once listener by the original function', () => {
    const emitter = new SimpleEventEmitter();
    let called = 0;
    const handler = () => called++;

    emitter.once('test', handler);
    emitter.off('test', handler);

    expect(emitter.emit('test')).toBe(false);
    expect(called).toBe(0);
  });

  it('should rethrow when an error listener throws', () => {
    const emitter = new SimpleEventEmitter();
    const failure = new Error('listener');

    emitter.removeAllListeners('error');
    emitter.on('error', (err: unknown) => {
      throw err;
    });
    emitter.on('test', () => {
      throw failure;
    });

    expect(() => emitter.emit('test')).toThrow(failure);
  });
});
