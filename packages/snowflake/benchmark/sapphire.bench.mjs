import { Snowflake as SapphireSnowflake } from '@sapphire/snowflake';
import { bench, describe } from 'vitest';
import { Snowflake } from '../dist/index.mjs';

var epoch = new Date('2000-01-01T00:00:00.000Z');
var sapphire = new SapphireSnowflake(epoch);

var snowflake = new Snowflake({ epoch });

describe('bigint', () => {
  bench('sapphire', () => sapphire.generate(), {
    time: 1000,
    warmupIterations: 1000,
  });

  bench('generate', () => snowflake.generate(), {
    time: 1000,
    warmupIterations: 1000,
  });
});

describe('buffer', () => {
  bench('sapphire', () => sapphire.generate(), {
    time: 100,
    warmupIterations: 1000,
  });

  bench('generateBuffer', () => snowflake.generateBuffer(), {
    time: 100,
    warmupIterations: 1000,
  });
});

describe('deconstruct (bigint)', () => {
  bench('sapphire', () => sapphire.deconstruct(254360814063058944n), {
    time: 100,
    warmupIterations: 1000,
  });

  bench('snowflake', () => snowflake.deconstruct(254360814063058944n), {
    time: 100,
    warmupIterations: 1000,
  });
});

describe('buffer unsafe', () => {
  bench('sapphire', () => sapphire.generate(), {
    time: 100,
    warmupIterations: 1000,
  });

  bench('generateBufferUnsafe', () => snowflake.generateBufferUnsafe(), {
    time: 100,
    warmupIterations: 10,
  });
});
