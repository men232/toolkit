import ansiEscapes from 'ansi-escapes';
// From `@vue/runtime-core` rather than `vue` for the reason `src/focus.ts`
// gives: that is this package's own hard `dependency`, while `vue` is a peer
// the consumer supplies, and this file runs outside the consumer's tree.
import { shallowRef, type ShallowRef } from '@vue/runtime-core';
import {
  buildCursorSuffix,
  buildCursorTeardownSequence,
  buildReturnToBottomPrefix,
  type CursorPosition,
} from './cursorHelpers';
import { buildIncrementalFrameWrite } from './incrementalRender';
import { InputSource } from './input/InputSource';
import { patchConsole, type ConsoleStream } from './patchConsole';
import type { RenderMetrics } from './createApp';
import { DOMDocument } from './tree/DOMTree/DOMDocument';
import {
  Renderer,
  hasPendingStaticOutput,
  resetStaticFlushCounts,
} from './tree/render';

/**
 * Dimensions of the terminal window, in character cells. Matches ink's
 * `WindowSize`.
 *
 * Declared here rather than beside `useWindowSize` because `Container` is what
 * knows it: `syncWindowSize` is the sole writer of `renderer.width`/`height`,
 * and this is that same pair, read at the same moment with the same fallbacks.
 */
export interface WindowSize {
  readonly columns: number;
  readonly rows: number;
}

export interface ContainerOptions {
  stdout: NodeJS.WriteStream;
  stdin: NodeJS.ReadStream;
  stderr: NodeJS.WriteStream;
  /** See {@link Container.debug} for the full behavioural contract. */
  debug: boolean;
  exitOnCtrlC: boolean;
  /**
   * Resolved once by `render.ts` (`resolveInteractive`, folding CI detection,
   * `stdout.isTTY` and the `interactive` render option together) and handed
   * down already-decided rather than detected again here, so everything
   * downstream shares one answer.
   */
  interactive: boolean;
  /**
   * Caps how often a frame is computed and written. `0` means unlimited --
   * a distinct deliberate case rather than a zero-length interval. Above `0`
   * is a target frames-per-second, converted to a minimum interval between
   * writes ({@link renderThrottleMs}). Never applied in non-interactive mode;
   * see {@link Container.canComputeFrame}.
   *
   * Defaults to `0` rather than ink's `30` (which `mount()`'s own
   * `MountOptions.maxFps` does use): tests construct `Container` directly,
   * bypassing `render.ts`, and a throttled default here would silently change
   * the timing they depend on.
   */
  maxFps?: number;
  /** Called with `{ renderTime }` after each frame this class actually
   * commits -- see {@link Container.canComputeFrame}/{@link Container.commitFrame}. */
  onRender?: (metrics: RenderMetrics) => void;
  /**
   * Intercept `console.log`/`info`/`warn`/`error` for this instance's whole
   * life, so output from anywhere else in the process lands above the frame
   * instead of inside it -- see {@link writeConsoleOutput}.
   *
   * `false` here, though `render.ts` defaults its own option to `true`
   * (matching ink) -- same reasoning as {@link ContainerOptions.maxFps}:
   * patching the real global `console` as a side effect of merely constructing
   * a `Container` would surprise tests that construct one directly.
   */
  patchConsole?: boolean;
  /**
   * Repaint only the lines that changed between two frames instead of erasing
   * the previous frame whole and rewriting it -- see {@link onFrame} and
   * `src/incrementalRender.ts`.
   *
   * `false` by default, matching ink: the full repaint is the simpler
   * strategy. Both put the same thing on screen
   * (`test/render-equivalence.test.ts` holds them to that); this one writes
   * fewer bytes, which matters on a tall frame where one line ticks.
   *
   * Never consulted in non-interactive mode, where only the final frame is
   * written, at {@link destroy} -- there is no previous frame to diff.
   *
   * **Two pre-existing limits, out of scope for both strategies.** A frame
   * taller than `stdout.rows` has scrolled its top beyond the cursor's reach;
   * and any line wider than `stdout.columns` wraps into several physical rows,
   * while both strategies compute their `cursorUp`/`cursorDown` counts from
   * *logical* lines. In each case both strategies are wrong and not guaranteed
   * to be wrong identically, so `test/render-equivalence.test.ts` (and the
   * `test/helpers/terminal.ts` screen model it replays through, which models
   * neither) deliberately leaves both uncovered rather than pinning
   * already-wrong behaviour. A fix belongs to the cursor arithmetic in
   * `onFrame`/`src/incrementalRender.ts`.
   */
  incrementalRendering?: boolean;
  /**
   * Enter the terminal's alternate screen buffer for this instance's whole
   * life, restoring the primary buffer at {@link Container.destroy}. `false` by
   * default, matching ink. See {@link Container.alternateScreen} for how this
   * combines with {@link interactive}/{@link debug}, and
   * `acquireAlternateScreen` below for concurrent instances.
   */
  alternateScreen?: boolean;
}

// The alternate screen buffer is real terminal state owned by no single
// `Container`, so it is ref-counted here: switched only on the 0 -> 1 and
// 1 -> 0 transitions. Two concurrent instances sharing one `stdout` (a
// short-lived prompt over a long-lived dashboard) both enter it; if the first
// to unmount wrote `exitAlternativeScreen` unconditionally, the second -- still
// drawing -- would be kicked back to the primary buffer and paint over the
// user's shell history. Keyed per `stdout` rather than one module-level count,
// because two streams have two independent buffers.
//
// This protects only *which buffer is in effect*; concurrent instances' frames
// overwrite each other here exactly as they already do outside it.
const alternateScreenRefCounts = new Map<NodeJS.WriteStream, number>();

function acquireAlternateScreen(stdout: NodeJS.WriteStream): void {
  const count = alternateScreenRefCounts.get(stdout) ?? 0;
  alternateScreenRefCounts.set(stdout, count + 1);

  if (count === 0) {
    stdout.write(ansiEscapes.enterAlternativeScreen);
    stdout.write(ansiEscapes.cursorHide);
  }
}

function releaseAlternateScreen(stdout: NodeJS.WriteStream): void {
  const count = alternateScreenRefCounts.get(stdout);
  if (!count) return;

  if (count <= 1) {
    alternateScreenRefCounts.delete(stdout);
    stdout.write(ansiEscapes.exitAlternativeScreen);
    stdout.write(ansiEscapes.cursorShow);
  } else {
    alternateScreenRefCounts.set(stdout, count - 1);
  }
}

export class Container extends DOMDocument {
  tagName = '#container';

  stdout: NodeJS.WriteStream;
  stdin: NodeJS.ReadStream;
  stderr: NodeJS.WriteStream;
  exitOnCtrlC: boolean;
  renderer: Renderer;

  /**
   * Whether this session may touch the terminal at all -- resolved once in
   * `render.ts` (`resolveInteractive`). `false` when non-interactive (CI, or
   * `stdout` is not a TTY, unless the `interactive` render option overrides
   * the detection): no ANSI erase sequences, no cursor manipulation, no resize
   * handling, and only the final frame is written -- at {@link destroy}, not
   * per-frame -- so CI logs stay readable instead of escape-sequence soup.
   */
  readonly interactive: boolean;

  /**
   * Which of the two frame-writing strategies {@link onFrame} uses -- see
   * {@link ContainerOptions.incrementalRendering}.
   */
  readonly incrementalRendering: boolean;

  /**
   * Render each update as its own appended write -- nothing erased, nothing
   * diffed. Meant for output piped to a file, or a terminal watched as a
   * scrolling log. {@link incrementalRendering} is never consulted when this is
   * on (matching ink): appending forever leaves no previous on-screen frame to
   * diff against.
   *
   * Deliberately independent of {@link interactive} rather than folded into it
   * the way {@link alternateScreen} is: `debug` piped to a file is the
   * *non*-interactive use case, yet must also work on a real TTY someone points
   * it at. So it writes every frame regardless of whether `stdout` is a TTY,
   * where plain non-interactive mode defers its one write to {@link destroy}.
   * Matches ink, which also checks `options.debug` ahead of and independently
   * from its interactive flag.
   */
  readonly debug: boolean;

  /**
   * Whether this instance enters the alternate screen buffer at construction
   * and must leave it at {@link destroy}. Already folded together with
   * {@link interactive} (as ink's `resolveAlternateScreenOption` does): the
   * alternate screen is meaningless without a real display to switch away
   * from. Also folded with {@link debug}, which wins: the buffer is discarded
   * wholesale at {@link destroy}, so `{ debug: true, alternateScreen: true }`
   * would silently throw away the very transcript `debug` exists to keep.
   *
   * Resolved once into this field rather than re-checked at entry (constructor)
   * and exit ({@link destroy}) -- both need the same combined answer, and
   * computing it twice is a chance for them to disagree.
   *
   * Decides only whether *this instance* participates, not whether the buffer
   * is currently switched -- that is the `stdout`-keyed ref count above.
   */
  readonly alternateScreen: boolean;

  /**
   * Owns the `stdin` subscription behind raw mode and input dispatch
   * (`src/input/InputSource.ts`). Constructing it touches no terminal state --
   * raw mode turns on only once something calls `input.subscribe()`, so a
   * `Container` that never uses input never puts the terminal in raw mode.
   */
  input: InputSource;

  /**
   * The lines of the frame currently on screen — empty when there is nothing
   * there to erase (fresh start, or right after a `<Static>` flush).
   *
   * Lines rather than a bare row count, because the incremental strategy
   * (`src/incrementalRender.ts`) needs to know what is on those rows.
   * Deliberately the *same* field as the erase count rather than a second one
   * beside it: many paths already zero the row count (`<Static>` flushes,
   * intercepted `console.log`, {@link onResize}/{@link clear}), so sharing the
   * field means all of them zero the diff baseline too and no future writer can
   * forget to. The only assignment is in {@link onFrame}, at the write, so
   * nothing that did not reach the terminal can leave this describing something
   * never written.
   *
   * Holds the raw `split('\n')`, including the trailing empty element a frame
   * ending in a newline produces, so `.length` is exactly the row count the
   * erase needs.
   *
   * @internal
   */
  private screenLines: string[] = [];

  /**
   * Rows the on-screen frame occupies. Derived from {@link screenLines} rather
   * than tracked alongside it, so the two can never disagree.
   *
   * Erasing must stay *relative* to the cursor (`ansiEscapes.eraseLines`, the
   * primitive ink uses) rather than anchored to a fixed row via
   * `cursorTo(0, y)`: a `<Static>` flush scrolls the terminal on purpose, so an
   * absolute row goes stale the first time one fires -- `cursorTo(0, 0)` after
   * a scroll lands on whatever filled row 0, not on this frame.
   *
   * @internal
   */
  private get frameHeight(): number {
    return this.screenLines.length;
  }

  /**
   * The most recent frame `onFrame` received, remembered in *every* mode:
   * {@link writeConsoleOutput} needs frame text to repaint below a console
   * write when the throttle owes no newer one, not only non-interactive mode's
   * deferred final write. `undefined` until the first frame arrives, so both
   * readers know not to write for an instance that never rendered.
   *
   * Non-interactive mode writes this out exactly once, at {@link destroy};
   * everything upstream still runs on every change.
   */
  private lastFrame: string | undefined;

  /**
   * Backs `useCursor()`. Not reference-counted the way raw mode and bracketed
   * paste are: there is exactly one terminal cursor, so the last
   * `setCursorPosition` call wins, and clearing it back to `undefined` on
   * unmount is `useCursor`'s own job.
   */
  private cursorPosition: CursorPosition | undefined;

  /**
   * The cursor position and shown/hidden state as of the *last frame actually
   * written* -- as opposed to {@link cursorPosition}, which may have been
   * updated again since. Read by {@link returnCursorToBottomIfShown} to compute
   * how far to move the cursor back down before erasing that previous frame.
   */
  private previousCursorPosition: CursorPosition | undefined;
  private cursorWasShown = false;

  /**
   * Whether {@link cursorWasShown} has ever been `true` this instance's life --
   * unlike that field, this never resets. Exists solely for {@link destroy}'s
   * teardown branch; see the comment there for why `cursorWasShown` alone is
   * not sufficient once that method's own `flush()` has run.
   *
   * @internal
   */
  private cursorEverShown = false;

  /**
   * Reference-counted like raw mode: multiple `usePaste()` hooks can be mounted
   * at once, and the escape sequence must stay in effect until every one has
   * turned it back off, not just the first.
   */
  private bracketedPasteModeEnabledCount = 0;

  /**
   * Minimum milliseconds between two committed frames --
   * `Math.max(1, Math.ceil(1000 / maxFps))`, ink's formula. `0` when `maxFps`
   * is `0` or this instance is non-interactive; both make
   * {@link canComputeFrame} let every pass through outright rather than
   * computing a `0`ms window, which is a distinct deliberate case.
   *
   * @internal
   */
  private readonly renderThrottleMs: number;

  /** @internal */
  private readonly onRenderCallback: ((metrics: RenderMetrics) => void) | undefined;

  /**
   * `setTimeout` handle for the trailing edge of the throttle. Fires
   * `Renderer#flush()` once the window closes, which is what guarantees the
   * true final state of a burst that has gone quiet gets computed and written
   * rather than dropped with the rest of the burst. `unref()`'d so it never
   * keeps the process alive, and cleared by {@link destroy} so it cannot fire
   * after teardown.
   *
   * @internal
   */
  private throttleTimer: NodeJS.Timeout | undefined;

  /** `Date.now()` as of the last committed frame. `0` initially, so the first
   * frame always commits immediately -- nothing is on screen yet for a
   * throttle window to protect. @internal */
  private lastCommitTime = 0;

  /**
   * Un-registers this instance's `writeConsoleOutput` from `patchConsole`'s
   * shared, ref-counted installation. Despite the name this does NOT
   * necessarily restore the real `console` methods by itself -- `patchConsole`
   * only does that once every registered instance has un-registered.
   *
   * Read and cleared by {@link destroy}, which `render.ts`'s `teardown()` calls
   * from a `finally` even when `app.unmount()` throws. That matters: an
   * instance left registered after an abnormal exit means nothing ever
   * un-registers it, corrupting every later `console.log` in the process.
   *
   * @internal
   */
  private restoreConsole: (() => void) | undefined;

  /**
   * The size the layout was last computed at, as reactive data for
   * `useWindowSize` to derive from.
   *
   * Deliberately one shared ref written by {@link syncWindowSize} rather than a
   * subscription per consumer, for two reasons a per-consumer
   * `stdout.on('resize', ...)` gets wrong in both directions:
   *
   * 1. `process.stdout`'s `maxListeners` is Node's default 10 and this class
   *    already holds one, so the tenth consumer would print a
   *    `MaxListenersExceededWarning` to stderr *mid-frame* -- the garbling
   *    `InputSource`'s own `setMaxListeners(0)` exists to prevent. A list of
   *    ten-plus rows each sizing itself from `columns` is ordinary UI, so there
   *    is no consumer count this could call "enough".
   * 2. It is written *here*, next to `renderer.width`/`height` and from the same
   *    read, so what a consumer reports can never be a size the layout was not
   *    computed at. That matters most in non-interactive mode, which never
   *    subscribes to `'resize'` (see the constructor): the layout stays pinned
   *    at its construction-time width, and so does this. A consumer with its own
   *    subscription would instead track the live terminal and do arithmetic
   *    against a width nothing was laid out at.
   *
   * Seeded with {@link syncWindowSize}'s own fallbacks rather than left empty:
   * the constructor calls that method before anything can read this, so the seed
   * is never observed, but it keeps the two spellings of the default identical.
   *
   * @internal
   */
  readonly windowSize: ShallowRef<WindowSize> = shallowRef<WindowSize>({
    columns: 80,
    rows: 20,
  });

  /** @internal */
  onResizeBound: () => void;

  /** @internal */
  destroyed: boolean = false;

  constructor({
    alternateScreen,
    debug,
    exitOnCtrlC,
    incrementalRendering,
    interactive,
    maxFps,
    onRender,
    patchConsole: patchConsoleOption,
    stderr,
    stdin,
    stdout,
  }: ContainerOptions) {
    super();
    this.stdout = stdout;
    this.stdin = stdin;
    this.stderr = stderr;
    this.exitOnCtrlC = exitOnCtrlC;
    this.interactive = interactive;
    this.debug = debug;
    this.incrementalRendering = incrementalRendering ?? false;
    const resolvedMaxFps = maxFps ?? 0;
    this.renderThrottleMs =
      resolvedMaxFps > 0 ? Math.max(1, Math.ceil(1000 / resolvedMaxFps)) : 0;
    this.onRenderCallback = onRender;
    this.input = new InputSource(this.stdin);
    this.renderer = new Renderer({
      // The `maxFps` throttle, handed to the scheduler as a gate rather than
      // applied to the frame it hands back -- see `canComputeFrame`.
      canRender: () => this.canComputeFrame(),
      document: this,
      height: 0,
      width: 0,
    });

    // Entered before the first frame is scheduled below, so the very first
    // thing this instance draws lands in the alternate buffer.
    this.alternateScreen = Boolean(alternateScreen) && this.interactive && !this.debug;
    if (this.alternateScreen) {
      acquireAlternateScreen(this.stdout);
    }

    this.onResizeBound = this.onResize.bind(this);
    // No resize handling in non-interactive mode (matches ink): with nothing
    // subscribed, a resize never reaches `onResize`, so it can never erase or
    // repaint for a session whose only write is the final one at `destroy`.
    if (this.interactive) {
      this.stdout.on('resize', this.onResizeBound);
    }
    this.renderer.on('static', this.onStatic.bind(this));
    this.renderer.on('frame', this.commitFrame.bind(this));
    // Sizing only -- deliberately not `onResize()`, whose clear belongs to a
    // resize and would wipe whatever the terminal already held. See there.
    this.syncWindowSize();

    // Installed last, once everything `writeConsoleOutput` reads is in place:
    // other code can call the global `console` the moment this returns.
    if (patchConsoleOption) {
      this.restoreConsole = patchConsole(this.writeConsoleOutput.bind(this));
    }
  }

  /**
   * The `maxFps` throttle. Handed to `Renderer` as its `canRender` gate, so it
   * is consulted **before** the layout+paint pass rather than applied to the
   * frame that pass produced: a frame that will not be shown is not computed.
   * ink is arranged the same way (`throttledOnRender` wraps its render call);
   * we were not, and a 125 Hz source at `maxFps: 30` computed 400 frames to
   * show 104, spending three quarters of the engine's CPU on frames nobody
   * could see.
   *
   * Returning `false` takes on the obligation to call `Renderer#flush()` later,
   * which the {@link throttleTimer} armed here discharges. That trailing edge is
   * not optional: without it a burst that goes quiet would leave its final state
   * uncomputed, which `MountOptions.maxFps` rightly calls indistinguishable from
   * a layout bug. The leading edge is {@link lastCommitTime} starting at `0`, so
   * the first frame of a session -- and the first of any burst arriving a full
   * window after the last -- runs immediately.
   *
   * Three cases let every pass through, because throttling them would be
   * meaningless rather than merely unhelpful: non-interactive mode, which defers
   * its one write to {@link destroy} anyway (and where skipping passes would
   * leave that write showing a stale frame); `maxFps: 0`; and {@link debug},
   * whose point is to write every update -- ink's own `unthrottled` flag is
   * likewise `true` whenever `options.debug` is set.
   *
   * The fourth is `<Static>`, and it is the one that had to move here with the
   * throttle. `onStatic` writes unconditionally, but the content it writes does
   * not exist until this pass produces it, so bypassing the *write* would no
   * longer be enough: the pass itself has to run, or permanent
   * scroll-into-history output waits on a window it is meant to ignore. ink has
   * the same escape hatch, as its reconciler's `isStaticDirty` ->
   * `onImmediateRender`.
   */
  private canComputeFrame(): boolean {
    if (this.debug || !this.interactive || this.renderThrottleMs === 0) {
      return true;
    }

    if (hasPendingStaticOutput(this)) return true;

    const elapsedSinceLastCommit = Date.now() - this.lastCommitTime;

    if (elapsedSinceLastCommit >= this.renderThrottleMs) return true;

    // Already armed for the end of this window, and it will compute whatever
    // the tree holds by the time it fires -- newer than anything capturable now.
    if (!this.throttleTimer) {
      const remaining = this.renderThrottleMs - elapsedSinceLastCommit;

      this.throttleTimer = setTimeout(() => {
        this.throttleTimer = undefined;
        this.renderer.flush();
      }, remaining);

      // Must never keep the process alive on its own: a burst that never
      // settles should still let the event loop drain.
      this.throttleTimer.unref?.();
    }

    return false;
  }

  /**
   * Writes (or, non-interactively, records) a frame the `Renderer` has just
   * computed, and reports its `renderTime` to `onRender`.
   *
   * Unconditional, and that is the point of the arrangement above: every
   * `'frame'` emit is a frame {@link canComputeFrame} already agreed to show, so
   * there is nothing left here to buffer, supersede or drop.
   */
  private commitFrame(frame: string, renderTime: number): void {
    // A trailing edge armed for this window would only recompute what is being
    // written right now -- this pass may have come from `flush()` (console
    // output, teardown) or a `<Static>` bypass rather than from the timer.
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = undefined;
    }

    this.onFrame(frame);
    this.lastCommitTime = Date.now();
    this.onRenderCallback?.({ renderTime });
  }

  /**
   * Read the terminal's size, lay out at it, and publish it -- the half of
   * {@link onResize} that a *resize* and this instance's *construction* both
   * need, with nothing in it that writes to the terminal.
   *
   * Split out because the two callers want different things and the constructor
   * used to get the resize one. See {@link onResize}.
   *
   * @internal
   */
  private syncWindowSize(): void {
    this.renderer.width = this.stdout.columns || 80;
    this.renderer.height = this.stdout.rows || 20;
    // From the values just assigned, not a second read of `stdout`, so
    // {@link windowSize} and the layout cannot disagree even by a resize
    // landing between the two lines.
    this.windowSize.value = {
      columns: this.renderer.width,
      rows: this.renderer.height,
    };
    this.renderer.schedule();
  }

  /**
   * The `'resize'` handler, and **only** that -- the constructor calls
   * {@link syncWindowSize} directly.
   *
   * The clear is what separates the two. A resize can leave the previous
   * frame's rows re-wrapped and duplicated across the screen with no reliable
   * way to erase what is now there, so this wipes and repaints; a *mount* has
   * nothing of its own on screen, and what is up there belongs to whoever was
   * using the terminal first. Clearing at construction cost that: every mount
   * wiped the scrollback above it, which under `pnpm dev` -- now the HMR server,
   * so a mount per edit -- meant every hot reload threw away everything the
   * developer had above the frame, including anything `<Static>` had permanently
   * handed to scrollback. **ink never clears at mount** (`ink.js`: its
   * constructor subscribes `resized` and writes nothing), and is stricter still
   * on resize, clearing only when the terminal got *narrower*. Matching that
   * narrowing rule is a separate question.
   *
   * Erasing is cursor manipulation neither non-interactive mode nor `debug` may
   * perform, so both skip the branch. Both still get sized, once, from the
   * constructor; non-interactive mode never again (nothing subscribes it to
   * `resize`), while `debug` does resubscribe -- it can run on a real, resizable
   * TTY -- and simply never takes the branch.
   */
  onResize(): void {
    if (this.interactive && !this.debug) {
      this.stdout.write(ansiEscapes.clearTerminal);
      // `clearTerminal` wipes the screen and homes the cursor, so there is
      // nothing left to erase and no position left to be relative to.
      this.screenLines = [];
      this.previousCursorPosition = undefined;
      this.cursorWasShown = false;
      // `clearTerminal` also erased any `<Static>` content that had scrolled
      // into place, but `staticFlushedCount` (`src/tree/render.ts`) still
      // remembers it as printed -- without this reset it would be gone from
      // the screen *and* never reprinted.
      resetStaticFlushCounts(this);
    }

    this.syncWindowSize();
  }

  /**
   * Flush a `<Static>` subtree's newly-rendered content straight to the
   * terminal, permanently — a plain sequential write, never through `onFrame`'s
   * erase-and-rewrite, which would erase it on the very next frame. `<Static>`
   * output scrolls into history exactly once.
   *
   * Always fires before `onFrame` for the same render (see `Renderer#render`),
   * so this lands above the dynamic frame it belongs before — but that frame is
   * still on screen below the cursor and has to be erased first, or this content
   * lands in the middle of it. `onFrame`, right after, then finds nothing left
   * to erase.
   *
   * Non-interactive mode skips the erase-and-cursor dance but still writes
   * static content immediately, matching ink: CI logs want that permanent
   * history too. Only the *dynamic* frame is deferred to {@link destroy}.
   */
  onStatic(text: string): void {
    const normalized = text.endsWith('\n') ? text : `${text}\n`;

    // `debug` takes this plain write regardless of `interactive`: its contract
    // is "never erase", and the branch below exists precisely to erase.
    if (!this.interactive || this.debug) {
      this.stdout.write(normalized);
      return;
    }

    this.returnCursorToBottomIfShown(this.frameHeight);
    this.eraseFrameAndForgetCursor();

    this.stdout.write(normalized);
  }

  /**
   * Put `frame` on screen, by whichever of the two strategies this instance was
   * constructed with -- see {@link ContainerOptions.incrementalRendering}. Both
   * leave the same thing on screen and the same state behind, differing only in
   * the bytes it takes; `test/render-equivalence.test.ts` holds them to that.
   *
   * The return-to-bottom step is out here rather than inside either strategy
   * because both share its preconditions: the cursor must be on the bottom row
   * of the previous frame before anything measures upwards from it, and
   * {@link screenLines} must describe exactly what is on those rows.
   */
  onFrame(frame: string) {
    this.lastFrame = frame;

    // `debug` appends every frame as its own write -- no erase, no cursor
    // suffix, and never the incremental strategy's diff walk, since there is no
    // previous on-screen frame to diff against. Returns deliberately before
    // `screenLines`/the cursor fields: nothing here maintains state for an erase
    // or diff that never happens.
    if (this.debug) {
      this.stdout.write(frame.endsWith('\n') ? frame : `${frame}\n`);
      return;
    }

    // Non-interactive mode never writes a frame as it arrives -- `destroy`
    // writes {@link lastFrame} out exactly once, at unmount. Erase sequences and
    // cursor walks are terminal manipulation this mode must never perform.
    if (!this.interactive) {
      return;
    }

    this.returnCursorToBottomIfShown(this.frameHeight);

    const lines = frame.split('\n');

    if (this.incrementalRendering) {
      // One write, not the full repaint's two: this sequence interleaves cursor
      // moves with line fragments, and a frame torn across several writes can
      // have foreign output land in the middle of it. (ink buffers its own
      // chunks the same way, for the same reason.)
      this.stdout.write(
        buildIncrementalFrameWrite({
          frame,
          previousLines: this.screenLines,
          cursorPosition: this.cursorPosition,
        }),
      );
    } else {
      this.eraseFrameAndForgetCursor();

      const cursorSuffix = buildCursorSuffix(lines.length - 1, this.cursorPosition);

      this.stdout.write(frame + cursorSuffix);
    }

    // The single assignment that puts a frame in the diff baseline, here at the
    // write deliberately. See {@link screenLines}.
    this.screenLines = frame ? lines : [];

    this.previousCursorPosition = this.cursorPosition
      ? { ...this.cursorPosition }
      : undefined;
    this.cursorWasShown = this.cursorPosition !== undefined;
    if (this.cursorWasShown) {
      this.cursorEverShown = true;
    }
  }

  /**
   * Passed to `patchConsole` as its `onWrite` callback -- every intercepted
   * `console.log`/`info`/`warn`/`error` call in the whole process reaches here,
   * not just this app's own components.
   *
   * Non-interactive and `debug` modes pass straight through to the real stream:
   * neither repaints or erases anything during the app's life, so there is
   * nothing for a console write to protect or restore.
   *
   * Interactive mode must land console output *above* the frame, with the frame
   * intact below it -- so it erases the current frame, writes the data, then
   * repaints a frame underneath. Which frame to repaint is the hazard: the tree
   * can have moved on mid-throttle at that exact moment, and repainting
   * {@link lastFrame} would leave a superseded frame under the output until the
   * window closes on its own. So an owed frame is computed and committed instead
   * -- `Renderer#flush()`, which bypasses {@link canComputeFrame} and so arms no
   * new timer -- and only when nothing is owed does this fall back to
   * `lastFrame`. Either repaint's `onFrame` skips its erase branch,
   * {@link frameHeight} already being `0`, so nothing is erased twice. Nothing
   * is repainted at all before the first frame.
   */
  private writeConsoleOutput(stream: ConsoleStream, data: string): void {
    const target = stream === 'stderr' ? this.stderr : this.stdout;

    if (!this.interactive || this.debug) {
      target.write(data);
      return;
    }

    this.returnCursorToBottomIfShown(this.frameHeight);
    this.eraseFrameAndForgetCursor();

    target.write(data);

    if (!this.renderer.flush() && this.lastFrame !== undefined) {
      this.onFrame(this.lastFrame);
    }
  }

  /**
   * Backs `useCursor()`. The position set here is read by the *next*
   * `onFrame`/`onStatic` call -- this does not itself schedule a repaint, it
   * takes effect at whatever repaint fires next for some other reason. Same as
   * ink, whose cursor ref is only ever propagated at an existing commit.
   */
  setCursorPosition(position: CursorPosition | undefined): void {
    this.cursorPosition = position;
  }

  /**
   * Erase the on-screen frame ({@link frameHeight} rows, via
   * `ansiEscapes.eraseLines`) and forget what this class tracked about it, as
   * one unit in one fixed order -- so the three callers ({@link onStatic},
   * {@link writeConsoleOutput}, {@link onFrame}'s full-repaint branch) have no
   * ordering left to get wrong. Each writes something immediately after with
   * nothing left to erase a second time.
   *
   * Only the erase write and {@link screenLines} reset are gated on
   * {@link frameHeight} being non-zero. The cursor-state reset is **not** gated
   * the same way, deliberately: `frameHeight` and {@link cursorWasShown} are
   * independent -- an empty-string frame with an active cursor position leaves
   * `frameHeight` at `0` while `cursorWasShown` is still `true` (see
   * {@link onFrame}'s `this.screenLines = frame ? lines : []`). Gating it too
   * would leave a stale `cursorWasShown` for the next caller to read as "a
   * previous frame's cursor to hide", emitting a hide sequence with no matching
   * show. Not covered by the test suite.
   *
   * Must run after {@link returnCursorToBottomIfShown}, which puts the real
   * cursor on the bottom line `eraseLines` assumes it starts from.
   */
  private eraseFrameAndForgetCursor(): void {
    if (this.frameHeight > 0) {
      this.stdout.write(ansiEscapes.eraseLines(this.frameHeight));
      this.screenLines = [];
    }

    this.previousCursorPosition = undefined;
    this.cursorWasShown = false;
  }

  /**
   * Hides the cursor and walks it back down to the bottom line, if the previous
   * frame parked it elsewhere via {@link buildCursorSuffix}. Must run before any
   * `eraseLines` call, which assumes the cursor already sits on that line.
   */
  private returnCursorToBottomIfShown(previousLineCount: number): void {
    const prefix = buildReturnToBottomPrefix(
      this.cursorWasShown,
      previousLineCount,
      this.previousCursorPosition,
    );

    if (prefix) {
      this.stdout.write(prefix);
    }
  }

  /**
   * Backs `usePaste()`. Enables or disables the terminal's
   * bracketed-paste-mode escape sequence, reference-counted -- see
   * {@link bracketedPasteModeEnabledCount}. No-ops on a non-TTY `stdout`,
   * matching ink: there is no terminal on the other end to interpret it.
   */
  setBracketedPasteMode(enabled: boolean): void {
    if (!this.stdout.isTTY) return;

    if (enabled) {
      if (this.bracketedPasteModeEnabledCount === 0) {
        this.stdout.write('[?2004h');
      }

      this.bracketedPasteModeEnabledCount++;
      return;
    }

    if (this.bracketedPasteModeEnabledCount === 0) return;

    if (--this.bracketedPasteModeEnabledCount === 0) {
      this.stdout.write('[?2004l');
    }
  }

  /**
   * No-ops in non-interactive mode (matching ink): nothing has been painted to
   * erase, so a `clearTerminal` write would be exactly the stray ANSI escape
   * that mode exists to avoid. Also a no-op under {@link debug} regardless of
   * `interactive` -- erasing the screen is what that mode's contract rules out.
   */
  clear(): void {
    if (!this.interactive || this.debug) return;

    this.stdout.write(ansiEscapes.clearTerminal);
    this.screenLines = [];
    this.previousCursorPosition = undefined;
    this.cursorWasShown = false;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // First, ahead of every other teardown step, so it cannot depend on
    // anything below succeeding: leaving the global `console` patched after an
    // abnormal exit corrupts every later `console.log` in the process, well
    // beyond this instance's lifetime.
    this.restoreConsole?.();
    this.restoreConsole = undefined;

    // Cancel the trailing-edge timer outright: letting it fire after teardown
    // would write to a `stdout` this instance no longer owns. Both statements
    // must run *before* the branch below -- if a frame was owed to the throttle
    // when `destroy()` was called, this `flush()` is what makes
    // `frameHeight`/`cursorWasShown`/`previousCursorPosition` describe the true
    // last frame rather than an already-superseded one, and it is the guarantee
    // the throttle feature exists to uphold: a burst still mid-window at unmount
    // ends with its final state on screen, not its second-to-last.
    //
    // `Renderer#destroy()` makes the same call for the same reason, and is not
    // redundant with this one: `render.ts`'s `teardown()` runs it first and then
    // `app.unmount()`, so by the time this method is reached the renderer
    // refuses to render and the tree is gone -- the frame has to be computed
    // there. This is the path for a `Container` destroyed on its own, with a
    // live renderer, which every test constructing one directly takes.
    // Whichever runs first computes the frame; the other sees nothing owed.
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = undefined;
    }
    this.renderer.flush();

    // These writes cannot be deferred to `onFrame`/`onStatic`: `render.ts`'s
    // `teardown()` calls `this.renderer.destroy()` before this method, which
    // latches the Renderer's `destroyed` flag, so neither would ever run again.
    // That is why "only the final frame, at unmount" has to be this class's job.
    //
    // The branches are mutually exclusive, not independent guards: interactive
    // mode restores the cursor; non-interactive mode never manipulated it (see
    // `onFrame`) and writes its one deferred frame.
    if (this.interactive) {
      // An abrupt exit while `useCursor` had an active position must not leave
      // the real cursor hidden and parked mid-frame -- the shell's next prompt
      // would land on top of this app's last output instead of below it. No
      // write at all when `useCursor` was never used.
      if (this.stdout.isTTY) {
        const restoreSequence = buildCursorTeardownSequence(
          this.cursorWasShown,
          this.frameHeight,
          this.previousCursorPosition,
        );

        if (restoreSequence) {
          this.stdout.write(restoreSequence);
        } else if (this.cursorEverShown) {
          // The `renderer.flush()` above can commit a throttled trailing frame
          // whose `onFrame` already saw `cursorPosition === undefined`:
          // `useCursor`'s disposer clears it during `app.unmount()`, which runs
          // before this method. That flush's `returnCursorToBottomIfShown` still
          // saw the *previous* frame's `cursorWasShown` and wrote the hide
          // sequence, but `buildCursorSuffix` found no position to show again --
          // so `cursorWasShown` is now correctly `false` while the real cursor
          // sits hidden with nothing to undo it. `cursorEverShown` is the one
          // piece of state that flush could not clobber. No frame-relative move
          // is needed: the write already left the real cursor at the end of the
          // frame, which is where showing it belongs.
          this.stdout.write(ansiEscapes.cursorShow);
        }
      }
    } else if (!this.debug && this.lastFrame !== undefined) {
      // Guarded on `lastFrame` so a session that never rendered doesn't emit a
      // stray blank line, and on `debug`, which already wrote this frame as it
      // arrived (see `onFrame`) and would otherwise duplicate it.
      this.stdout.write(
        this.lastFrame.endsWith('\n') ? this.lastFrame : `${this.lastFrame}\n`,
      );
    }

    // Must reach every exit path -- unmount, `useApp().exit()`, Ctrl+C, an
    // uncaught throw, a signal -- which it does because `render.ts`'s
    // `teardown()` calls `destroy()` from a `finally`. Leaving the alternate
    // screen active on an abnormal exit strands the user in an empty buffer with
    // their shell history out of view: it looks like the terminal broke.
    if (this.alternateScreen) {
      releaseAlternateScreen(this.stdout);
    }

    this.previousCursorPosition = undefined;
    this.cursorWasShown = false;
    this.cursorPosition = undefined;

    this.stdout.off('resize', this.onResizeBound);
    // Tears down raw mode regardless of how many subscribers were still
    // attached: an abrupt unmount must not leave the terminal in raw mode just
    // because a `useInput` hook never got to clean up.
    this.input.destroy();
    // Same for bracketed paste mode, which would otherwise leave the terminal
    // reading subsequent pastes as escape sequences forever.
    if (this.bracketedPasteModeEnabledCount > 0 && this.stdout.isTTY) {
      this.stdout.write('[?2004l');
    }

    this.bracketedPasteModeEnabledCount = 0;
    // Latches the Renderer's `destroyed` flag, so a frame already queued for the
    // next tick bails out instead of laying out over the Yoga nodes freed below.
    this.renderer.destroy();
    this.removeAllListeners('DOMChanged');
    // Frees this document's Yoga nodes (native, not garbage collected) and its
    // subtree's.
    super.destroy();
  }
}
