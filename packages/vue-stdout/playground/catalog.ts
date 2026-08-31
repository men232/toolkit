/**
 * What each demo is called, titled and described — and nothing that imports a
 * component.
 *
 * Split out of `demos.ts` for one reason: `pnpm dev --list` is answered from
 * here, by `dev.ts`, in plain Node. `demos.ts` statically imports six
 * components, five of them `.vue`, and nothing but a bundler loads those — so
 * listing six names through `demos.ts` would mean starting a Vite dev server
 * to print them. Reading the list must not be able to fail for a dev server's
 * reasons.
 *
 * This is the source of the names; `demos.ts` attaches the components to it.
 */
export interface DemoInfo {
  /** What `pnpm dev <name>` matches on. */
  name: string;
  title: string;
  /** One line, shown beside the name in the menu. */
  blurb: string;
}

export const catalog = [
  {
    name: 'layout',
    title: 'Layout',
    blurb: 'flex direction, justify, align, grow, borders · the .tsx demo',
  },
  {
    name: 'text',
    title: 'Text',
    blurb: 'colors, styles, every wrap mode, Transform',
  },
  {
    name: 'focus',
    title: 'Focus & input',
    blurb: 'Tab traversal, useFocus, useFocusManager, useInput',
  },
  {
    name: 'static',
    title: 'Static & console',
    blurb: '<Static> scrollback plus console.log above a live frame',
  },
  {
    name: 'progress',
    title: 'Progress',
    blurb: 'a frame updating faster than maxFps draws it',
  },
  {
    name: 'counter',
    title: 'Counter',
    blurb: 'the smallest reactive screen: one ref, read three ways',
  },
] as const satisfies readonly DemoInfo[];

export type DemoName = (typeof catalog)[number]['name'];
