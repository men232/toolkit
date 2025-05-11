import { deepDefaults } from '@andrew_l/toolkit';
import { Binlog, type BinlogOptions } from './Binlog.js';

export * from './Binlog.js';

const DEF_OPTIONS: BinlogOptions = {
  path: './binlogs/log-{index}.bin',
  maxFileSize: 104857600,
  rotation: true,
  syncWrites: true,
};

/**
 * Create binlog instance
 * @group Main
 */
export function createBinlog(options: Partial<BinlogOptions>): Binlog {
  return new Binlog(deepDefaults(options, DEF_OPTIONS));
}
