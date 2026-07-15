import { describe, expect, it } from 'vitest';
import { isSkip, isSuccess, stringifyExecResult } from './execResult';

describe('isSuccess', () => {
  it('returns true for a well-formed success result', () => {
    expect(isSuccess({ success: true, code: 'OK' })).toBe(true);
    expect(isSuccess({ success: true, code: 'OK', reason: 'done' })).toBe(true);
  });

  it('keeps extra payload fields', () => {
    expect(isSuccess({ success: true, code: 'OK', data: 42 })).toBe(true);
  });

  it('returns false when success is not exactly true', () => {
    expect(isSuccess({ success: false, code: 'OK' })).toBe(false);
    expect(isSuccess({ success: 1, code: 'OK' })).toBe(false);
  });

  it('returns false for a skip result', () => {
    expect(isSuccess({ skip: true, code: 'SKIP' })).toBe(false);
  });

  it('returns false when code is missing or not a string', () => {
    expect(isSuccess({ success: true })).toBe(false);
    expect(isSuccess({ success: true, code: 123 })).toBe(false);
  });

  it('returns false when reason is present but not a string', () => {
    expect(isSuccess({ success: true, code: 'OK', reason: 5 })).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isSuccess(null)).toBe(false);
    expect(isSuccess(undefined)).toBe(false);
    expect(isSuccess('success')).toBe(false);
    expect(isSuccess(42)).toBe(false);
    expect(isSuccess([{ success: true, code: 'OK' }])).toBe(false);
  });
});

describe('isSkip', () => {
  it('returns true for a well-formed skip result', () => {
    expect(isSkip({ skip: true, code: 'SKIP' })).toBe(true);
    expect(isSkip({ skip: true, code: 'SKIP', reason: 'nope' })).toBe(true);
  });

  it('keeps extra payload fields', () => {
    expect(isSkip({ skip: true, code: 'SKIP', meta: 'x' })).toBe(true);
  });

  it('returns false when skip is not exactly true', () => {
    expect(isSkip({ skip: false, code: 'SKIP' })).toBe(false);
    expect(isSkip({ skip: 1, code: 'SKIP' })).toBe(false);
  });

  it('returns false for a success result', () => {
    expect(isSkip({ success: true, code: 'OK' })).toBe(false);
  });

  it('returns false when code is missing or not a string', () => {
    expect(isSkip({ skip: true })).toBe(false);
    expect(isSkip({ skip: true, code: 123 })).toBe(false);
  });

  it('returns false when reason is present but not a string', () => {
    expect(isSkip({ skip: true, code: 'SKIP', reason: {} })).toBe(false);
  });

  it('returns false for non-object values', () => {
    expect(isSkip(null)).toBe(false);
    expect(isSkip(undefined)).toBe(false);
    expect(isSkip('skip')).toBe(false);
    expect(isSkip(0)).toBe(false);
  });
});

describe('stringifyExecResult', () => {
  it('formats a success result with its reason', () => {
    expect(
      stringifyExecResult({ success: true, code: 'OK', reason: 'done' }),
    ).toBe('ExecSuccess(code=OK, reason="done")');
  });

  it('falls back to "no reason" for a success without a reason', () => {
    expect(stringifyExecResult({ success: true, code: 'OK' })).toBe(
      'ExecSuccess(code=OK, reason="no reason")',
    );
  });

  it('formats a skip result with its reason', () => {
    expect(
      stringifyExecResult({ skip: true, code: 'SKIP', reason: 'nope' }),
    ).toBe('ExecSkip(code=SKIP, reason="nope")');
  });

  it('falls back to "no reason" for a skip without a reason', () => {
    expect(stringifyExecResult({ skip: true, code: 'SKIP' })).toBe(
      'ExecSkip(code=SKIP, reason="no reason")',
    );
  });
});
