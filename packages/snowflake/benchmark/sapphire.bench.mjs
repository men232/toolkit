import { Snowflake as SapphireSnowflake } from '@sapphire/snowflake';
import { bench, describe } from 'vitest';
import { Snowflake, SnowflakeBitPack } from '../dist/index.mjs';

var epoch = new Date('2000-01-01T00:00:00.000Z');
var sapphire = new SapphireSnowflake(epoch);

var snowflake = new Snowflake({ epoch });
var bitPack = new SnowflakeBitPack({ epoch });

describe('bigint', () => {
  bench('sapphire', () => sapphire.generate(), {
    time: 1000,
    warmupIterations: 1000,
  });

  bench('generate', () => snowflake.generate(), {
    time: 1000,
    warmupIterations: 1000,
  });

  bench('generate: bitPack', () => bitPack.generate(), {
    time: 1000,
    warmupIterations: 1000,
  });
});

describe('buffer', () => {
  bench('sapphire', () => sapphire.generate(), {
    time: 1000,
    warmupIterations: 1000,
  });

  bench('generateBuffer', () => snowflake.generateBuffer(), {
    time: 1000,
    warmupIterations: 1000,
  });

  bench('generateBuffer: bitPack', () => bitPack.generateBuffer(), {
    time: 1000,
    warmupIterations: 1000,
  });
});

describe.only('buffer unsafe', () => {
  bench('sapphire', () => sapphire.generate(), {
    time: 1000,
    warmupIterations: 1000,
  });

  bench('generateBufferUnsafe', () => snowflake.generateBufferUnsafe(), {
    time: 1000,
    warmupIterations: 1000,
  });

  bench('generateBufferUnsafe: bitPack', () => bitPack.generateBufferUnsafe(), {
    time: 1000,
    warmupIterations: 1000,
  });
});
