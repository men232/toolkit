import type { Data } from './types';

export type ExecResult<T extends Data = Data, K extends Data = Data> =
  | ExecSuccess<T>
  | ExecSkip<K>;

export type ExecSuccess<T extends Data = Data> = {
  success: true;
  code: string;
  reason?: string;
} & T;

export type ExecSkip<T extends Data = Data> = {
  skip: true;
  code: string;
  reason?: string;
} & T;

export type ExecResultToSuccess<T> =
  T extends ExecSuccess<infer X> ? ExecSuccess<X> : ExecSuccess;

export type ExecResultToSkip<T> =
  T extends ExecSkip<infer X> ? ExecSkip<X> : ExecSkip;
