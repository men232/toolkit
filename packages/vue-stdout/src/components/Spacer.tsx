import { h, type FunctionalComponent } from 'vue';
import { Box } from './Box';

/**
 * A flexible space that expands along the major axis of its containing
 * layout.
 *
 * Useful as a shortcut for filling all the available space between elements,
 * e.g. `<Box><Text>a</Text><Spacer/><Text>b</Text></Box>` pushes `a` and `b`
 * to opposite edges. Ported from ink's `<Spacer>` — trivially, it is just a
 * `<Box flexGrow={1} />`.
 */
export const Spacer: FunctionalComponent = () => {
  return h(Box, { flexGrow: 1 });
};

Spacer.displayName = 'Spacer';
