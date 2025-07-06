import { Snowflake as SapphireSnowflake } from '@sapphire/snowflake';
import { bench } from 'vitest';
import { Snowflake } from '../dist/index.mjs';

var epoch = new Date('2000-01-01T00:00:00.000Z');
var sapphire = new SapphireSnowflake(epoch);

var custom = new Snowflake({ epoch });

bench('sapphire', () => sapphire.generate(), {
  time: 1000,
  warmupIterations: 1000,
});

bench('andrew (bigint)', () => custom.generate(), {
  time: 1000,
  warmupIterations: 1000,
});

bench('andrew (buffer)', () => custom.generateBuffer(), {
  time: 1000,
  warmupIterations: 1000,
});

bench('andrew (buffer unsafe)', () => custom.generateBufferUnsafe(), {
  time: 1000,
  warmupIterations: 1000,
});
