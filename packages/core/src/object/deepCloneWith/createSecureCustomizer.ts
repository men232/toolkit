import { isError, isFunction, isPrimitive, isSymbol } from '@/is';
import { def } from '../def';
import { type WithCustomizer, createCustomizerFactory } from './deepCloneWith';
import { deepCloneWithImpl } from './deepCloneWithImpl';

var SECURE_LABEL = `<** secure **>`;
var CIRCULAR_LABEL = `<** circular **>`;

var WILDCARD = Symbol('*');
var DEEP_WILDCARD = Symbol('**');
/** The root as a segment: a leading `$` matches it like a literal key. */
var ROOT = Symbol('$');

type Segment = string | symbol;

/** A literal id inside a rule, or {@link STAR} for `*`. */
var STAR = -1;

/** Segments as literal ids, outermost first; `bit` is the anchor of a `**` pattern, `0` for a plain path. */
interface Rule {
  segments: number[];
  bit: number;
}

/** Anchor bits share one SMI. */
var MAX_DEEP_PATTERNS = 30;

export namespace SecureCustomizer {
  /**
   * Computes the value {@link createSecureCustomizer} substitutes for a
   * redacted property.
   *
   * @param value - The original value, whatever its type.
   * @param key - The matched property key.
   * @param getPath - Builds the keys from the root down to `key`, only when
   *   called. `Set` members carry no key and are skipped.
   * @returns The replacement. `undefined` falls back to the default label, so
   *   the secret never reaches the regular clone.
   */
  export type LabelSecureFn = (
    value: unknown,
    key: PropertyKey,
    getPath: () => PropertyKey[],
  ) => unknown;

  export interface Options {
    /**
     * @default true
     */
    normalizeError?: boolean;

    /**
     * The value substituted for a redacted property, or a function computing
     * it per property: partial masking, a hash, the last characters of a token.
     *
     * @default '<** secure **>'
     */
    labelSecure?: string | LabelSecureFn;

    /**
     * The value substituted for a circular reference.
     *
     * @default '<** circular **>'
     */
    labelCircular?: string;
  }

  /**
   * The factory returned by {@link createSecureCustomizer}. It carries the
   * labels it substitutes, so a consumer can compare against them without
   * repeating the strings.
   */
  export interface Result extends WithCustomizer.Factory {
    /** The value substituted for a redacted property, as given in the options. */
    readonly labelSecure: string | LabelSecureFn;
    /** The value substituted for a circular reference. */
    readonly labelCircular: string;
  }
}

/**
 * Creates a {@link WithCustomizer.Factory} that redacts sensitive property values
 * and handles circular references when used with {@link deepCloneWith}.
 *
 * - **Primitive values** whose key matches one of `properties` are replaced with
 *   `labelSecure` (`<** secure **>` by default). A {@link SecureCustomizer.LabelSecureFn}
 *   function computes the replacement from the value, key and lazy path.
 * - **Circular references** are replaced with `labelCircular`
 *   (`<** circular **>` by default).
 *
 * A dotted path is matched as a suffix of the property's path. A leading
 * `$` anchors it to the root instead: `'$.headers.authorization'` covers
 * the top-level `headers.authorization` and nothing nested. `$` is only
 * allowed as the first segment.
 * - **Error objects** are normalised to a plain `{ message, stack, name, cause }`
 *   shape unless `normalizeError` is set to `false`.
 *
 * @param properties - Property keys to redact (case-insensitive for strings).
 * @param opts - Optional behaviour flags.
 * @returns A customizer factory that also exposes the effective
 *   `labelSecure` and `labelCircular`.
 *
 * @example
 * // Basic redaction
 * const customizer = createSecureCustomizer(['password', 'token']);
 * const result = deepCloneWith(
 *   { user: 'alice', password: 'secret', token: 'abc123' },
 *   customizer,
 * );
 * // → { user: 'alice', password: '<** secure **>', token: '<** secure **>' }
 *
 * @example
 * // Nested objects — redaction applies at any depth
 * const customizer = createSecureCustomizer(['apiKey']);
 * const result = deepCloneWith(
 *   { service: { apiKey: 'key-xyz', url: 'https://api.example.com' } },
 *   customizer,
 * );
 * // → { service: { apiKey: '<** secure **>', url: 'https://api.example.com' } }
 *
 * @example
 * // Error normalisation (on by default)
 * const customizer = createSecureCustomizer([]);
 * const result = deepCloneWith({ err: new Error('oops') }, customizer);
 * // → { err: { message: 'oops', name: 'Error', stack: '...', cause: undefined } }
 *
 * @example
 * // Disable Error normalisation
 * const customizer = createSecureCustomizer([], { normalizeError: false });
 * const result = deepCloneWith({ err: new Error('oops') }, customizer);
 * // → { err: Error('oops') }  — the Error instance is preserved
 *
 * @example
 * // Custom labels, read back from the factory
 * const customizer = createSecureCustomizer(['password'], {
 *   labelSecure: '[redacted]',
 *   labelCircular: '[circular]',
 * });
 * customizer.labelSecure; // → '[redacted]'
 * customizer.labelCircular; // → '[circular]'
 *
 * @example
 * // Partial masking with a label function
 * const customizer = createSecureCustomizer(['email', 'token'], {
 *   labelSecure: (value, key) =>
 *     key === 'email'
 *       ? String(value).replace(/^(.).*(@.*)$/, '$1***$2')
 *       : `…${String(value).slice(-4)}`,
 * });
 * const result = deepCloneWith(
 *   { user: { email: 'alice@mail.com' }, token: 'abcd1234' },
 *   customizer,
 * );
 * // → { user: { email: 'a***@mail.com' }, token: '…1234' }
 *
 * @group Object
 */
export function createSecureCustomizer(
  properties: PropertyKey[],
  {
    normalizeError = true,
    labelCircular = CIRCULAR_LABEL,
    labelSecure = SECURE_LABEL,
  }: SecureCustomizer.Options = {},
): SecureCustomizer.Result {
  var isSecure = createMatcher(properties);
  var labelSecureFn = isFunction(labelSecure) ? labelSecure : undefined;

  var customizer: WithCustomizer = (value, key, obj, stack, parent) => {
    if (key !== undefined && isSecure(key, parent)) {
      if (!labelSecureFn) return labelSecure;

      return (
        labelSecureFn(value, key, () => pathOf(key, parent)) ?? SECURE_LABEL
      );
    }

    if (isPrimitive(value)) return;

    // The clone maps every container it entered to its copy.
    if (stack.has(value)) return labelCircular;

    if (normalizeError && isError(value)) {
      var normalized = {
        message: value.message,
        stack: value.stack,
        name: value.name,
        cause: undefined,
      };

      // Registered before the cause is cloned so a cycle through the Error is caught.
      stack.set(value, normalized);

      if (value.cause !== undefined) {
        // The Error itself never became a node, so one stands in for it
        // and the cause keeps its place in the path.
        normalized.cause = deepCloneWithImpl(
          value.cause,
          'cause',
          obj,
          stack,
          { key, parent, state: undefined },
          customizer,
        );
      }

      return normalized;
    }
  };

  var factory = createCustomizerFactory(
    () => customizer,
  ) as SecureCustomizer.Result;

  def(factory, 'labelSecure', labelSecure);
  def(factory, 'labelCircular', labelCircular);

  return factory;
}

/** Keys from the root down to `key`; keyless nodes (`Set` members) are skipped. */
function pathOf(
  key: PropertyKey,
  node: WithCustomizer.PathNode | undefined,
): PropertyKey[] {
  var path: PropertyKey[] = [key];

  for (; node !== undefined; node = node.parent) {
    if (node.key !== undefined) path.push(node.key);
  }

  return path.reverse();
}

/**
 * A pattern is `prefix.**.suffix`, or a plain path without `**`. Paths and
 * suffixes are matched upwards from the key. A suffix also needs its prefix
 * to have ended somewhere above: each prefix owns an anchor bit, set in the
 * state of every node below the one where the prefix ended.
 */
function createMatcher(
  properties: PropertyKey[],
): (key: PropertyKey, parent: WithCustomizer.PathNode | undefined) => boolean {
  var literals: Segment[] = [];
  var literalIndex = new Map<Segment, number>();

  var idOf = (segment: Segment): number => {
    var id = literalIndex.get(segment);

    if (id === undefined)
      literalIndex.set(segment, (id = literals.push(segment) - 1));

    return id;
  };

  var toIds = (segments: Segment[]): number[] =>
    segments.map(s => (s === WILDCARD ? STAR : idOf(s)));

  var paths: Rule[] = [];
  var suffixes: Rule[] = [];
  var prefixes: Rule[] = [];

  for (const property of properties) {
    var segments = parsePattern(property);
    var deepAt = segments.indexOf(DEEP_WILDCARD);

    if (segments.indexOf(DEEP_WILDCARD, deepAt + 1) >= 0) {
      throw new Error(
        `createSecureCustomizer: a pattern may hold one \`**\`: ${String(property)}`,
      );
    }

    // A leading `**` adds nothing to a suffix match.
    if (deepAt <= 0) {
      paths.push({
        segments: toIds(deepAt === 0 ? segments.slice(1) : segments),
        bit: 0,
      });
      continue;
    }

    if (prefixes.length === MAX_DEEP_PATTERNS) {
      throw new Error(
        `createSecureCustomizer: at most ${MAX_DEEP_PATTERNS} patterns may hold \`**\``,
      );
    }

    var bit = 1 << prefixes.length;

    prefixes.push({ segments: toIds(segments.slice(0, deepAt)), bit });
    suffixes.push({ segments: toIds(segments.slice(deepAt + 1)), bit });
  }

  var OTHER = literals.length;

  /** Rules by the literal their last segment names; a rule ending in `*` fires on any key. */
  var byLast = (rules: Rule[]): (Rule[] | undefined)[] => {
    var out: (Rule[] | undefined)[] = [];

    for (var s = 0; s <= OTHER; s++) {
      var matching = rules.filter(r => {
        var last = r.segments[r.segments.length - 1];

        return last === STAR || last === s;
      });

      if (matching.length > 0) out[s] = matching;
    }

    return out;
  };

  var pathsAt = byLast(paths);
  var suffixesAt = byLast(suffixes);
  var prefixesAt = byLast(prefixes);
  var hasPrefixes = prefixes.length > 0;

  var literalsByLength: number[][] = [];
  var symbolLiterals = new Map<symbol, number>();
  var numericMax = -1;
  var hasNonAscii = false;

  literals.forEach((literal, id) => {
    if (isSymbol(literal)) return void symbolLiterals.set(literal, id);

    if (/[^\x00-\x7f]/.test(literal)) hasNonAscii = true;

    // `'007'` never equals the index `7`.
    if (/^\d+$/.test(literal) && String(Number(literal)) === literal) {
      numericMax = Math.max(numericMax, Number(literal));
    }

    (literalsByLength[literal.length] ??= []).push(id);
  });

  // The root node carries no key; a pattern names it with `$`.
  var rootId = symbolLiterals.get(ROOT) ?? OTHER;

  var symbolOf = (key: PropertyKey | undefined): number => {
    if (typeof key === 'string') {
      if (hasNonAscii) return literalIndex.get(key.toLowerCase()) ?? OTHER;

      var candidates = literalsByLength[key.length];

      if (candidates !== undefined) {
        for (var c = 0; c < candidates.length; c++) {
          if (equalsFolded(literals[candidates[c]] as string, key))
            return candidates[c];
        }
      }

      return OTHER;
    }

    if (typeof key === 'number') {
      return key >= 0 && key <= numericMax
        ? (literalIndex.get(String(key)) ?? OTHER)
        : OTHER;
    }

    if (typeof key === 'symbol') return symbolLiterals.get(key) ?? OTHER;

    return rootId;
  };

  /**
   * Matches all segments but the last, innermost first, against the keyed
   * ancestors from `node` up. Returns the node above them, or `null`.
   * Only `Set` members are skipped as keyless: the root stays, as `$`.
   */
  var matchUp = (
    segments: number[],
    node: WithCustomizer.PathNode | undefined,
  ): WithCustomizer.PathNode | undefined | null => {
    for (var i = segments.length - 2; i >= 0; i--) {
      while (
        node !== undefined &&
        node.key === undefined &&
        node.parent !== undefined
      )
        node = node.parent;

      if (node === undefined) return null;
      if (segments[i] !== STAR && symbolOf(node.key) !== segments[i])
        return null;

      node = node.parent;
    }

    return node;
  };

  /**
   * Anchor bits active below `node`, cached in `node.state`. The recursion
   * is shallow: the parent was resolved when this node was checked as a key,
   * only keyless nodes (`Set` members) add a level.
   */
  var stateOf = (node: WithCustomizer.PathNode | undefined): number => {
    if (node === undefined) return 0;
    if (typeof node.state === 'number') return node.state;

    var bits = stateOf(node.parent);

    // Keyed nodes and the root can end a prefix; `Set` members cannot.
    if (node.key !== undefined || node.parent === undefined) {
      var rules = prefixesAt[symbolOf(node.key)];

      if (rules !== undefined) {
        for (var r = 0; r < rules.length; r++) {
          if (matchUp(rules[r].segments, node.parent) !== null)
            bits |= rules[r].bit;
        }
      }
    }

    return (node.state = bits);
  };

  return (key, parent) => {
    var symbol = symbolOf(key);
    var rules = pathsAt[symbol];

    if (rules !== undefined) {
      for (var p = 0; p < rules.length; p++) {
        if (matchUp(rules[p].segments, parent) !== null) return true;
      }
    }

    // Bits only accumulate downwards: none at the parent means none above it.
    if (!hasPrefixes || stateOf(parent) === 0) return false;

    rules = suffixesAt[symbol];

    if (rules !== undefined) {
      for (var s = 0; s < rules.length; s++) {
        var above = matchUp(rules[s].segments, parent);

        if (above !== null && (stateOf(above) & rules[s].bit) !== 0)
          return true;
      }
    }

    return false;
  };
}

function fold(code: number): number {
  return code >= 65 && code <= 90 ? code + 32 : code;
}

/** Case-insensitive equality of two strings of the same length. */
function equalsFolded(literal: string, key: string): boolean {
  for (var i = 0; i < literal.length; i++) {
    if (fold(literal.charCodeAt(i)) !== fold(key.charCodeAt(i))) return false;
  }

  return true;
}

function parsePattern(property: PropertyKey): Segment[] {
  if (isSymbol(property)) return [property];

  var pattern: Segment[] = [];

  for (const segment of String(property).split('.')) {
    if (segment === '$') {
      if (pattern.length > 0) {
        throw new Error(
          `createSecureCustomizer: \`$\` may only lead a pattern: ${String(property)}`,
        );
      }

      pattern.push(ROOT);
    } else if (segment === '**') {
      if (pattern[pattern.length - 1] !== DEEP_WILDCARD)
        pattern.push(DEEP_WILDCARD);
    } else {
      pattern.push(segment === '*' ? WILDCARD : segment.toLowerCase());
    }
  }

  if (pattern.length === 1 && pattern[0] === ROOT) {
    throw new Error(
      `createSecureCustomizer: \`$\` alone names no property: ${String(property)}`,
    );
  }

  // `$.**` anchors nothing: any depth below the root is any depth.
  if (pattern[0] === ROOT && pattern[1] === DEEP_WILDCARD) pattern.shift();

  // A trailing `**` must still name the property itself: any key will do.
  if (pattern[pattern.length - 1] === DEEP_WILDCARD) pattern.push(WILDCARD);

  return pattern;
}
