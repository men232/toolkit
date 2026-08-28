import { env } from '@andrew_l/toolkit';

export const CONFIG = Object.freeze({
  IS_VRUN: env.bool('VRUN', false),

  WATCH_MODE: env.bool('VRUN_WATCH', false),

  /**
   * Root path of application
   */
  APP_ROOT: env.string('APP_ROOT') || null,

  /**
   * Typescript resolver mode
   */
  TS_MODE:
    env.string(
      'VRUN_TS_MODE',
      process.execArgv.some(v => v.includes('tsx/dist/loader.mjs'))
        ? 'tsx'
        : '',
    ) || null,

  /**
   * List of disabled workers
   */
  WORKER_DISABLED: new Set(env.list('WORKER_DISABLE', 'string')),
} as const);

export const APP_DEF = Symbol('app-definition');

export const APP_IS_AUTORUN = Symbol('app-auto-run');

export const WORKER_DEF = Symbol('worker-definition');
