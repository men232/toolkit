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
});
