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
});
