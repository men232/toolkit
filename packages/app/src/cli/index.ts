import { runApp } from './runApp.js';

/**
 * Programmatic access to the `vrun` CLI internals.
 * @group Utils
 */
export const cli = Object.freeze({
  runApp,
} as const);
