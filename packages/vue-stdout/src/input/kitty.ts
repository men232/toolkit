// Ported from ink's `src/kitty-keyboard.ts` -- the flag/modifier bit tables
// and the `resolveFlags` encoder -- plus the three sequence builders ink keeps
// inline in `ink.tsx`. Internal to this package; see `src/index.ts` for why it
// is not re-exported yet.
//
// The auto-detection state machine around those sequences (query the terminal,
// buffer its response, fall back if it never answers) is deliberately NOT
// ported: it is a much larger feature, and there is no live kitty-capable
// terminal here to validate the handshake against.
//
// `src/input/parseKeypress.ts` holds the decoder side of this protocol and
// keeps its own private `kittyModifiers` table rather than importing this
// one -- it is covered by a differential suite against ink, so the duplication
// is left alone on purpose.

/** Kitty keyboard protocol flags. @see https://sw.kovidgoyal.net/kitty/keyboard-protocol/ */
export const kittyFlags = {
  disambiguateEscapeCodes: 1,
  reportEventTypes: 2,
  reportAlternateKeys: 4,
  reportAllKeysAsEscapeCodes: 8,
  reportAssociatedText: 16,
} as const;

/** Valid flag names for the kitty keyboard protocol. */
export type KittyFlagName = keyof typeof kittyFlags;

/** Converts an array of flag names to the corresponding bitmask value. */
export function resolveFlags(flags: KittyFlagName[]): number {
  let result = 0;
  for (const flag of flags) {
     
    result |= kittyFlags[flag];
  }

  return result;
}

/**
 * Kitty keyboard modifier bits. Used in the modifier parameter of CSI-u
 * sequences.
 *
 * Note: the actual modifier value transmitted is `(modifiers - 1)`, per the
 * protocol -- these are the bit values to compare a decoded modifier
 * against *after* that subtraction, not the raw wire value.
 */
export const kittyModifiers = {
  shift: 1,
  alt: 2,
  ctrl: 4,
  super: 8,
  hyper: 16,
  meta: 32,
  capsLock: 64,
  numLock: 128,
} as const;

/** Options for configuring kitty keyboard protocol support. */
export interface KittyKeyboardOptions {
  /**
   * Mode for kitty keyboard protocol support.
   * - `'auto'`: attempt to detect terminal support (default)
   * - `'enabled'`: force enable the protocol
   * - `'disabled'`: never enable the protocol
   */
  mode?: 'auto' | 'enabled' | 'disabled';

  /**
   * Protocol flags to request from the terminal. Defaults to
   * `['disambiguateEscapeCodes']`, matching ink.
   */
  flags?: KittyFlagName[];
}

/**
 * The CSI-u query sequence: asks the terminal to report which kitty
 * keyboard protocol flags it currently has enabled. Safe to send to any
 * terminal -- one that doesn't support the protocol simply never responds.
 */
export const kittyQuerySequence = '[?u';

/**
 * The CSI-u sequence that disables the kitty keyboard protocol, popping the
 * flag stack entry this same session pushed with {@link buildKittyEnableSequence}.
 */
export const kittyDisableSequence = '[<u';

/**
 * Builds the CSI-u sequence that pushes `flags` onto the terminal's kitty
 * keyboard protocol flag stack, enabling it.
 */
export function buildKittyEnableSequence(flags: KittyFlagName[]): string {
  return `[>${resolveFlags(flags)}u`;
}
