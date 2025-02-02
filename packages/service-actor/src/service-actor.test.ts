import { catchError } from '@andrew_l/toolkit';
import { describe, expect, it } from 'vitest';
import { serviceActor } from '.';

describe('serviceActor', () => {
  it('default state (like plain object)', () => {
    const actor = serviceActor().use();

    expect(Object.keys(actor)).toStrictEqual([
      'traceId',
      'actorId',
      'actorType',
    ]);

    expect(actor).toStrictEqual({
      traceId: 'trace-1',
      actorId: null,
      actorType: 'unknown',
    });
  });

  it('extended default state', () => {
    const actor = serviceActor(() => ({
      ipAddress: '0.0.0.0',
    })).use();

    expect(Object.keys(actor)).toStrictEqual([
      'traceId',
      'actorId',
      'actorType',
      'ipAddress',
    ]);

    expect(actor).toStrictEqual({
      traceId: 'trace-1',
      actorId: null,
      actorType: 'unknown',
      ipAddress: '0.0.0.0',
    });
  });

  it('.assign()', () => {
    const actor = serviceActor(() => ({
      ipAddress: '0.0.0.0',
    }))
      .use()
      .assign({
        ipAddress: '127.0.0.1',
      });

    expect(Object.keys(actor)).toStrictEqual([
      'traceId',
      'actorId',
      'actorType',
      'ipAddress',
    ]);

    expect(actor).toStrictEqual({
      traceId: 'trace-1',
      actorId: null,
      actorType: 'unknown',
      ipAddress: '127.0.0.1',
    });
  });

  it('overwrite api throw error', () => {
    const actor = serviceActor(() => ({
      ipAddress: '0.0.0.0',
    })).use();

    const [err] = catchError(() => {
      // @ts-expect-error
      actor.assign = fn;
    });

    expect(!!err).toBe(true);
  });

  it('custom api', () => {
    const actor = serviceActor(() => ({
      actorId: 1,
      getAccount(this: any) {
        return { id: this.actorId, name: 'Andrew' };
      },
    })).use();

    expect(actor).toStrictEqual({
      traceId: 'trace-1',
      actorId: 1,
      actorType: 'unknown',
    });

    expect(actor.getAccount()).toStrictEqual({
      id: 1,
      name: 'Andrew',
    });
  });

  it('should keep this context in with hook', () => {
    const actor = serviceActor(() => ({
      actorId: 1,
    }));

    const fn = actor.with(function (this: any) {
      return this;
    });

    const sym = Symbol();

    expect(fn.call(sym)).toBe(sym);
  });

  it('should pass arguments to with hook', () => {
    const actor = serviceActor(() => ({
      actorId: 1,
    }));

    const fn = actor.with((...args: any[]) => {
      return args;
    });

    expect(fn(1, 2)).toStrictEqual([1, 2]);
  });

  it('should extends with hook', () => {
    const actor = serviceActor(() => ({
      actorId: 1,
    }));

    const sym = Symbol();
    let injectedActor: any;

    const fn = actor.with(
      (...args: any[]) => {
        injectedActor = actor.inject();
      },
      { traceId: sym as any },
    );

    fn();

    expect(injectedActor.traceId).toEqual(injectedActor.traceId);
  });
});
