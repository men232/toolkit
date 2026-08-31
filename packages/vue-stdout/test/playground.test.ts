import { describe, expect, it } from 'vitest';
import { createApp } from '../src';
import { demos } from '../playground/demos';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

const flush = () => new Promise<void>(resolve => setTimeout(resolve, 20));

// The playground is where interactive behaviour gets checked by hand, which
// means a demo can rot unnoticed until someone happens to open it. This
// mounts every one of them: a demo that throws on mount, or whose unmount
// leaks the timer it started, fails here instead of in front of whoever
// reached for the playground to debug something else.
describe('playground demos', () => {
  it.each(demos.map(demo => [demo.name, demo] as const))(
    'mounts and unmounts %s',
    async (_name, demo) => {
      const stdout = createStdout(60);
      const stdin = createStdin();

      const app = createApp(demo.component);
      app.mount({ stdout, stdin });

      await flush();

      expect(stdout.get()).not.toBe('');

      app.unmount();
      await app.waitUntilExit();
    },
  );
});
