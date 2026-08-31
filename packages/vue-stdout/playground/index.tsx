// The playground app itself. `playground/dev.ts` is what launches it -- this
// module is the entry the dev server imports, not the command line.
//
// It imports the renderer from `../src`, not from `dist`, so a change to the
// engine shows up on the next hot update with no build step in between. This is
// also the one place in the package where real raw mode runs against the real
// `process.stdin` -- the test suite forbids it (`test/setup/no-real-raw-mode.ts`),
// which is exactly why interactive behaviour has to be checked here by hand.
import process from 'node:process';
import { defineComponent, h, ref, shallowRef, type Component } from 'vue';
import { Box, Text, createApp, useApp, useInput } from '../src';
import { demos, findDemo, type Demo } from './demos';

// Every screen here binds the keyboard, and `useInput` refuses to attach when
// raw mode is unsupported. Without this the failure surfaces as an unhandled
// error inside a Vue watcher -- a page of component trace for what is really
// "you piped me somewhere". `--list` never reaches this module, so it still
// works in a pipe.
if (!process.stdin.isTTY) {
  process.stderr.write(
    'The playground needs an interactive terminal (stdin is not a TTY).\n' +
      'Run it directly rather than through a pipe; use --list for the demo names.\n',
  );
  process.exit(1);
}

// Which demo to open, if any; with nothing set the menu opens. It travels in
// the environment and not on `argv`, and that is forced rather than chosen:
// this module is imported *by* the dev server, so `process.argv` here is the
// server's own command line. `dev.ts` is what maps `pnpm dev <name>` onto the
// variable, and validates it there -- this check is the backstop for a
// hand-set `VUE_STDOUT_DEMO`.
const requested = process.env.VUE_STDOUT_DEMO;

if (requested && !findDemo(requested)) {
  process.stderr.write(
    `Unknown demo "${requested}". Known: ${demos.map(d => d.name).join(', ')}\n`,
  );
  process.exit(1);
}

const Menu = defineComponent<{ onPick: (demo: Demo) => void }>(
  props => {
    const index = ref(0);
    const { exit } = useApp();

    useInput((input, key) => {
      if (key.upArrow) index.value = (index.value - 1 + demos.length) % demos.length;
      else if (key.downArrow) index.value = (index.value + 1) % demos.length;
      else if (key.return) props.onPick(demos[index.value]!);
      else if (input === 'q') exit();
    });

    const width = Math.max(...demos.map(demo => demo.name.length));

    return () => (
      <Box flexDirection="column">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor="cyan"
          paddingX={1}
        >
          <Text bold>vue-stdout playground</Text>

          <Box flexDirection="column" marginTop={1}>
            {demos.map((demo, i) => (
              <Box key={demo.name}>
                <Text color={i === index.value ? 'cyan' : undefined}>
                  {i === index.value ? '❯ ' : '  '}
                  {demo.name.padEnd(width + 2)}
                </Text>
                <Text dimColor>{demo.blurb}</Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Text dimColor>↑↓ select · enter open · q quit</Text>
      </Box>
    );
  },
  { name: 'Menu', props: ['onPick'] },
);

const Stage = defineComponent<{ demo: Demo; onBack: () => void }>(
  props => {
    // Escape only. Anything else would collide with whatever the demo binds
    // -- the shell must not eat keys the demo under test wants to see.
    useInput((_input, key) => {
      if (key.escape) props.onBack();
    });

    return () => (
      <Box flexDirection="column">
        <Text dimColor>
          {props.demo.title} · esc back to the menu · ctrl+c quit
        </Text>

        <Box marginTop={1}>
          {/* `h()` because the component is a value, not a JSX tag. The `key`
              remounts the subtree per demo, so leaving and re-entering one
              starts it from a clean slate -- and exercises unmount teardown
              (timers, focus registry, input subscriptions) on every trip back
              to the menu. */}
          {h(props.demo.component, { key: props.demo.name })}
        </Box>
      </Box>
    );
  },
  { name: 'Stage', props: ['demo', 'onBack'] },
);

const Playground = defineComponent({
  name: 'Playground',
  setup() {
    // `shallowRef`, not `ref`: a `Demo` carries a component, and making that
    // deeply reactive is both wasteful and something Vue warns about.
    const current = shallowRef<Demo | null>(
      requested ? findDemo(requested)! : null,
    );

    return () =>
      current.value
        ? <Stage demo={current.value} onBack={() => (current.value = null)} />
        : <Menu onPick={demo => (current.value = demo)} />;
  },
});

createApp(Playground as Component).mount();
