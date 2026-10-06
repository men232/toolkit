---
name: andrew-toolkit-audit
description: Audit a codebase for hand-written code that an @andrew_l package already replaces, and report each hit with the replacement and why it is worth it. Use when asked to audit, review or clean up code against @andrew_l/toolkit, or to find helpers that duplicate it.
---

# @andrew_l replacement audit

Every entry below is a pattern people write by hand where an @andrew_l export does the job better: it fixes a bug the hand-written version usually has, or it handles edge cases the hand-written version misses. Patterns where the export is only a shorter spelling are left out on purpose.

## Steps

1. **Sweep.** Run every `Detect` pattern of every entry over the project's source with ripgrep, skipping `node_modules`, build output and lockfiles:

   ```sh
   rg -n -U --glob '!node_modules' --glob '!dist' -e '<pattern>' <src dirs>
   ```

   Done when every pattern has been run and its hits are collected per entry.

2. **Verify each hit.** Open the code around it and confirm it is the hand-written pattern the entry describes, doing the same job. A pattern only narrows the search: a hit that merely looks similar is a false positive. Check the entry's caveats against the call site (option defaults, sync vs async, mutation). Done when every hit is marked *confirmed* or *false positive* with a one-line reason.

3. **Report.** Write one table of confirmed hits, most serious first (bugs before edge cases): `file:line`, the code found, the replacement call, and why it is worth it. List the false positives briefly below it. Leave the code unchanged; the report is the deliverable.

## Replacements

### @andrew_l/toolkit

#### `alpha(color, newAlpha)`

- Replaces `hex + '80'`, a template that appends two hex digits to a color, or a hand-written `hexToRgba(hex, a)` — appending digits only works on 6-digit hex; `alpha` accepts every format `colorToChannels` parses and returns `rgba(r, g, b, a)`, replacing (not multiplying) the existing alpha. Named colors and `var()` warn and become black.
  - Detect: `(?:[Cc]olor|[Hh]ex)\w*\s*\+\s*['"][0-9a-fA-F]{2}['"]`
  - Detect: `\$\{\s*[\w.]*(?:[Cc]olor|[Hh]ex)\w*\s*\}[0-9a-fA-F]{2}\x60`

#### `AppError` (class)

- Replaces `class HttpError extends Error { constructor(public status: number, ...) }` — `AppError` already has `statusCode` (default 500), `code` (default `'ERR_UNKNOWN'`), `cause`, a status-to-message map (`new AppError(404)` is "Not Found") and `AppError.is()`, which also matches by `name`.
  - Detect: `class\s+\w*(Http|HTTP|Api|API|App)\w*(Error|Exception)\s+extends\s+Error\b`

#### `asyncFilter(array, predicate, options?)`

- Replaces `items.filter(async (item) => ...)` — the predicate returns a Promise, which is always truthy, so nothing is filtered out. `asyncFilter` awaits each predicate and keeps the source order. The default `concurrency` is 1.
  - Detect: `\.filter\(\s*async\b`
- Replaces `const ok = await Promise.all(items.map(pred)); items.filter((_, i) => ok[i])` — one call instead of two passes and an index lookup. It runs one predicate at a time unless you pass `concurrency`.
  - Detect: `\.filter\(\s*\(\s*_\w*\s*,\s*(i|idx|index)\s*\)\s*=>\s*\w+\[(i|idx|index)\]\s*\)`

#### `asyncFilterMap(array, callbackfn, options?)`

- Replaces `(await Promise.all(items.map(async (item) => ...))).filter(Boolean)` — `filter(Boolean)` also drops legitimate `0`, `''` and `false` results; here the callback returns `skip` to drop an item and every other value is kept, in source order. The default `concurrency` is 1, so pass it to keep the parallelism of `Promise.all`.
  - Detect: `Promise\.all\([\s\S]{0,300}?\)\s*\)?\s*(\.then\(\s*\(?\w+\)?\s*=>\s*\w+\s*)?\.filter\(\s*(Boolean|\(?\w+\)?\s*=>\s*\w+\s*!==?\s*(null|undefined))`

#### `asyncForEach(array, callbackfn, options?)`

- Replaces `arr.forEach(async (item) => { ... })` — `forEach` ignores the returned promises, so nothing is awaited and rejections go unhandled. Pass `concurrency` when the items may run in parallel; the default is 1.
  - Detect: `\.forEach\(\s*async\b`

#### `AsyncIterableQueue` (class)

- Replaces `[Symbol.asyncIterator]() { return { next: () => new Promise((r) => resolvers.push(r)) } }` (a hand-written push/pull channel) — `put` / `close` / `for await` instead of buffer and resolver bookkeeping; items put before `close()` are still delivered and `put` after `close()` throws. Unbounded (no backpressure) and meant for one consumer: when two consumers wait on an empty queue, `close()` ends only one of them.
  - Detect: `\[Symbol\.asyncIterator\]\s*\(\)[\s\S]{0,400}?new Promise(<[^()]*>)?\(\s*\(?\s*\w+\s*\)?\s*=>\s*(\{\s*)?\(?\s*[\w.]+(\s*=\s*\w|\.push\()`

#### `asyncMap(array, callbackfn, options?)`

- Replaces `await Promise.all(items.map(async (item) => ...))` over a large or unbounded list — every call starts at once; `asyncMap` caps the calls in flight and keeps results in input order. The default `concurrency` is 1 (sequential), so pass it explicitly. It rejects on the first error; calls already started keep running.
  - Detect: `Promise\.all\(\s*[\w.]+\.map\(\s*async\b`

#### `avg(values)`

- Replaces `arr.reduce((a, b) => a + b, 0) / arr.length` — gives `NaN` for an empty array or any non-number entry; `avg` returns `0` for an empty array and skips non-numbers and `NaN`, dividing by the count of numbers it kept (`Infinity` is kept).
  - Detect: `\.reduce\([\s\S]{0,200}?\+[\s\S]{0,200}?,\s*0\s*\)\s*[/]\s*[\w.]+\.length`

#### `base62`

- Replaces `while (n > 0n) { out = CHARS[Number(n % 62n)] + out; n /= 62n; }` — keeps leading zero bytes and round-trips through `decode`. The alphabet is `0-9A-Za-z`; output differs from schemes that order it `0-9a-zA-Z` (use `basex` with that alphabet) and from `base62Fast`.
  - Detect: `[%/]=?\s*62n\b|BigInt\(\s*62\s*\)`

#### `base64ToBytes(data, options?)`

- Replaces `Uint8Array.from(atob(s), c => c.charCodeAt(0))`, plus `.replace(/-/g, '+').replace(/_/g, '/')` and re-padding for base64url — decodes both alphabets directly (native `fromBase64` when present). Caveat: `base64` is strict by default and throws on unpadded input (pass `strict: false`); `base64url` is lenient.
  - Detect: `atob\([^;]{0,80}?\.charCodeAt\(`
  - Detect: `atob\([\s\S]{0,200}?\w+\[\s*\w+\s*\]\s*=\s*\w+\.charCodeAt\(\s*\w+\s*\)`
  - Detect: `\.replace\(\s?/-/g\s*,\s*['"]\+['"]\s*\)`

#### `basex(alphabet)`

- Replaces `while (n > 0n) { out = ALPHABET[Number(n % BASE)] + out; n /= BASE; }` or the `bs58` / `base-x` package — keeps leading zero bytes as leading `alphabet[0]` characters, which a plain BigInt round trip loses, and `decode` throws on characters outside the alphabet. O(n²) BigInt math: fine for IDs and keys, not large blobs; no base58check checksum.
  - Detect: `\[\s*Number\(\s*\w+\s*%\s*\w+\s*\)\s*\]`
  - Detect: `while\s*\(\s*\w+\s*>\s*0n\s*\)\s*\{[^}]{0,200}%`
  - Detect: `['"]123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz['"]`
  - Detect: `from\s+['"](?:bs58|base-x)['"]|require\(\s*['"](?:bs58|base-x)['"]\s*\)`

#### `bitPack(options)`

- Replaces `(BigInt(ts) << 22n) | (BigInt(worker) << 17n) | BigInt(seq)` — an oversized value spills into the next field; `bitPack` masks each value to its width and compiles 32-bit integer code. Caveats: `buffer()` must be called as a method and reuses one `Uint8Array` across calls; needs `new Function` (no strict CSP).
  - Detect: `<<\s*\d+n\s*\)?\s*\|[^|]`

#### `bitUnpack(options)`

- Replaces `Number((id >> 22n) & 0x3ffn)` per field — shifts and masks come from the same field list as `bitPack` (first field is most significant), so they cannot drift from the packer; reads a bigint, number, big-endian bytes or a bit string. Fields wider than 53 bits lose precision as numbers; needs `new Function` (no strict CSP).
  - Detect: `Number\(\s*\(?\s*(?:BigInt\(\s*[\w.]+\s*\)|[\w.]+)\s*>>\s*\d+n\b`

#### `bytesToBase64(data, options?)`

- Replaces `btoa(String.fromCharCode(...bytes))` plus `.replace(/\+/g, '-').replace(///g, '_')` for base64url — the spread (or `.apply`) throws `RangeError` on large arrays (a few hundred KB). Uses native `toBase64` when present, a JS encoder otherwise; base64url omits padding by default. In Node-only code `Buffer#toString('base64url')` is as good.
  - Detect: `btoa\(\s*String\.fromCharCode(?:\.apply\(\s*null\s*,|\(\s*\.\.\.)`
  - Detect: `String\.fromCharCode\(\s*\w+\[\s*\w+\s*\]\s*\)[\s\S]{0,200}?btoa\(`
  - Detect: `\.replace\(\s?/\\\+/g\s*,\s*['"]-['"]\s*\)`

#### `camelCase(str)`

- Replaces `str.replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())` — the hand-written regex only handles the separators it lists and leaves acronyms and PascalCase input alone (`HTTPRequest` stays `HTTPRequest`); `camelCase` splits on case, digits and any separator (`HTTPRequest` → `httpRequest`, `user_id2` → `userId2`).
  - Detect: `\.replace\(/[^/\n]*[-_][^/\n]*[/]g,\s*\(?[\w\s,]*\)?\s*=>[^\n]*\.toUpperCase\(\)`

#### `capitalize(str)`

- Replaces `s.charAt(0).toUpperCase() + s.slice(1)` — returns the literal type `Capitalize<T>` and does not throw on `''` like `s[0].toUpperCase()`. Caveat: it also lowercases the rest (`'iPhone'` → `'Iphone'`), so suggest it only where that is wanted.
  - Detect: `\w+(\.charAt\(0\)|\[0\])\.toUpperCase\(\)\s*\+\s*\w+\.(slice|substring|substr)\(1\)`

#### `channelsToHSL(options)`

- Replaces A hand-copied `rgbToHsl(r, g, b)` (`l = (max + min) / 2`, hue by max channel) — takes `[r, g, b, a]` (0–255) and returns `{ h, s, l, a }` with h in degrees and s/l in percent. All three are rounded to integers, so the conversion is lossy.
  - Detect: `(?:function\s+|const\s+)rgbToHsla?\b`
  - Detect: `\(\s*max\s*\+\s*min\s*\)\s?/\s?2`

#### `chunk(list, size?)`

- Replaces `for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))` — loops forever when `size` is `0`, returns `[]` for `NaN` and gives uneven chunks for a fractional `size`; `chunk` floors `size` and throws an `AssertionError` below 1.
  - Detect: `for\s*\([^;]*;[^;]*;\s*\w+\s*\+=\s*\w+\s*\)[\s\S]{0,120}?\.slice\(\s*\w+\s*,\s*\w+\s*\+\s*\w+\s*\)`
  - Detect: `Math\.ceil\(\s*[\w.]+\.length\s*[/]\s*\w+\s*\)[\s\S]{0,120}?\.slice\(`
- Replaces `while (arr.length) out.push(arr.splice(0, size))` — empties the input array; `chunk` leaves it untouched.
  - Detect: `while\s*\([\w.]+\.length[^)]*\)[\s\S]{0,80}?\.splice\(\s*0\s*,`

#### `clamp(num, min, max)`

- Replaces `Math.min(Math.max(x, min), max)` — one call; `NaN` or a non-number input returns `min` where the one-liner returns `NaN`. `Infinity` passes through, and `min > max` is not checked (the result is `max`).
  - Detect: `Math\.min\(([^()\n]*,\s*)?Math\.max\(`
  - Detect: `Math\.max\(([^()\n]*,\s*)?Math\.min\(`

#### `colorToChannels(color)`

- Replaces `if (c.startsWith('#')) return hexToRgb(c); if (c.startsWith('rgb')) …` — one call parses hex (3/4/6/8 digits), legacy and modern `rgb()`/`hsl()` (percentages, deg/rad/turn) and `"r,g,b"` into `[r, g, b, a]`. Never throws: named colors and `var()` log a warning and give opaque black, malformed hex/`rgb()`/`hsl()` give `[0, 0, 0, 0]`.
  - Detect: `startsWith\(\s*['"]#['"]\s*\)[\s\S]{0,300}?startsWith\(\s*['"](?:rgb|hsl)`
  - Detect: `(?:function\s+|const\s+)(?:parseColor|colorToRgba?)\b`

#### `crc32(value, seed?)`

- Replaces A hand-built CRC-32 table loop (`0xEDB88320`) or the `crc-32` package — accepts a string (UTF-8), bytes or an array of chunks and chains with `crc32(next, crc32(prev))`. Returns a signed int32 like `crc-32`: use `>>> 0` for hex or to compare with `zlib.crc32`, which is the native choice in Node-only code (22.2+).
  - Detect: `0x[eE][dD][bB]88320\b`
  - Detect: `['"]crc-32['"]`

#### `createEJSON(withBasicTypes?)`

- Replaces `JSON.stringify(v, (k, x) => typeof x === 'bigint' ? String(x) : x)`, `BigInt.prototype.toJSON` or a reviver reviving ISO-looking strings — BigInt/Map/Set never come back and any date-like string becomes a Date. `EJSON.stringify`/`parse` round-trip Date, Map, Set, BigInt, ±Infinity, RegExp and typed arrays as `{"$date": ms}`-style placeholders; both ends need EJSON.
  - Detect: `JSON\.stringify\([^;]{0,300}?['"]bigint['"]`
  - Detect: `BigInt\.prototype\.toJSON`
  - Detect: `JSON\.parse\([^;]{0,300}?\\d\{4\}-\\d\{2\}-\\d\{2\}`
- Replaces `import superjson from 'superjson'` (or `devalue`) used only for Date/Map/Set/BigInt — `EJSON` covers those without a dependency. Unlike them it drops `undefined` like JSON, throws on cycles, and other classes need `addType`.
  - Detect: `from\s+['"](?:superjson|devalue)['"]`

#### `createEJSONStream(options?)`

- Replaces `res.write('['); rows.forEach((r, i) => res.write((i ? ',' : '') + JSON.stringify(r))); res.write(']')` — a `TransformStream` that emits `[`, separators and `]`, optionally inside an object via `resultKey`/`prepend`/`append`. Caveats: items use the default EJSON (Dates become `{"$date": ms}`; pass `ejson: createEJSON()` for plain JSON), `prepend`/`append` always use the default EJSON, and `resultKey` is inserted without JSON escaping.
  - Detect: `\.write\(\s*['"]\[['"]\s*\)`
  - Detect: `\.(?:write|enqueue)\(\s*['"],['"]\s*\)`
  - Detect: `\.write\(\s*\(?\s*\w+\s*\?\s*['"],['"]\s*:\s*['"]['"]\s*\)?\s*\+`

#### `createEnvParser(targetObject, options?)`

- Replaces `parseInt(import.meta.env.VITE_X)`, `import.meta.env.VITE_X === 'true'` or `JSON.parse(import.meta.env.X)` — the same `NaN`, case and throw problems as with `process.env`; `createEnvParser(import.meta.env)` gives the typed, trimmed, default-on-failure getters of `env` over any record. Warnings need `options.logger`.
  - Detect: `(parseInt|parseFloat|Number)\(\s*import\.meta\.env\.`
  - Detect: `import\.meta\.env\.\w+\s*[!=]==?\s*['"](true|false|1|0)['"]`
  - Detect: `JSON\.parse\(\s*import\.meta\.env\.`

#### `createSecureCustomizer(properties, opts?)`

- Replaces `JSON.stringify(obj, (k, v) => /password|token/i.test(k) ? '***' : v)` or a hand-written `redact()` before logging — the replacer throws on a cycle and turns Errors into `{}`; with `deepCloneWith(obj, createSecureCustomizer(keys))` keys match case-insensitively at any depth or by dotted path, cycles become a label and Errors become `{ message, stack, name, cause }`.
  - Detect: `JSON\.stringify\([^,()]+,\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>[^;]{0,200}?(?i:password|secret|token|authorization|api_?key)`
  - Detect: `(?i)\b(function\s+|const\s+|let\s+)(redact|scrub)\w*\s*[=(]`

#### `createTimeSpan(value, unit?)`

- Replaces `const DAY_MS = 24 * 60 * 60 * 1000` and similar unit constants — `createTimeSpan(1, 'd').milliseconds()` names the unit and converts between ms, s, m, h, d and w. Units have fixed lengths (a day is always 24h).
  - Detect: `(const|let|var)\s+\w+\s*=\s*([\d_]+\s*\*\s*)*60\s*\*\s*60\s*\*\s*1000\b`
  - Detect: `(const|let|var)\s+\w+\s*=\s*(1000\s*\*\s*60\s*\*\s*60(\s*\*\s*\d+)*|86_?400_?000|864e5)\b`

#### `dateInDays(days, fromValue?)`

- Replaces `new Date(Date.now() - n * 24 * 60 * 60 * 1000)` — one call with no millisecond arithmetic (`dateInDays(-n)`). Returns a `Date` (use `.getTime()` for ms). Like the hand-written code it adds n×24h, not calendar days, so it drifts across DST; an unparsable base string falls back to epoch 0.
  - Detect: `(Date\.now\(\)|\.getTime\(\))\s*[-+]\s*\(?\s*([\w.]+\s*\*\s*)?(24\s*\*\s*60\s*\*\s*60\s*\*\s*1000|24\s*\*\s*3600\s*\*\s*1000|1000\s*\*\s*60\s*\*\s*60\s*\*\s*24|86_?400_?000|864e5)\b`

#### `debounce(func, debounceMs, options?)`

- Replaces `clearTimeout(timer); timer = setTimeout(() => fn(...args), ms)` — adds `cancel()` / `flush()`, an `AbortSignal` that cancels the pending call (e.g. on unmount), leading and trailing edges, and keeps `this`. The debounced function returns `void`, not the result of `fn`.
  - Detect: `clearTimeout\(\s*[\w.]+\s*\)\s*;?\s*[\w.]+\s*=\s*setTimeout\(`

#### `deepClone(value)`

- Replaces `JSON.parse(JSON.stringify(x))` — turns Dates into strings and Map/Set into `{}`, drops `undefined` and class prototypes, and throws on a BigInt or a cycle; `deepClone` keeps all of them. Native `structuredClone` is also fine where class prototypes do not matter.
  - Detect: `JSON\.parse\(\s*JSON\.stringify\(`

#### `delay(amount?, options?)`

- Replaces `await new Promise((resolve) => setTimeout(resolve, ms))` and local `sleep` / `wait` helpers — one import; with `{ signal }` it clears the timer and resolves early on abort. It resolves (does not reject) on abort, unlike `setTimeout` from `node:timers/promises`, so check `signal.aborted` afterwards.
  - Detect: `new Promise(<[^()]*>)?\(\s*\(?\s*\w+\s*\)?\s*=>\s*(\{\s*)?setTimeout\(\s*\w+\s*,`

#### `env`

- Replaces `parseInt(process.env.PORT || '3000')` / `Number(process.env.X)` — `parseInt` accepts `'3000abc'` and both give `NaN` on garbage; `env.int` trims, rejects partial and unsafe integers, and falls back to the default with a warning. Note it uses `Number` rules, so `'0x10'` → 16 and `'1e3'` → 1000.
  - Detect: `(parseInt|parseFloat|Number)\(\s*process\.env(\.\w+|\[['"]\w+['"]\])`
  - Detect: `[=(,:]\s*\+process\.env\.\w+`
- Replaces `process.env.DEBUG === 'true'` — `env.bool` trims and falls back to the default for a missing or empty value. Caveat: only exact `'true'`/`'false'` parse; `'TRUE'` and `'1'` give the default.
  - Detect: `process\.env(\.\w+|\[['"]\w+['"]\])\s*[!=]==?\s*['"](true|false|1|0)['"]`
- Replaces `JSON.parse(process.env.X)` — throws on a missing or malformed value; `env.json` returns the default (`null`) with a warning and also parses EJSON.
  - Detect: `JSON\.parse\(\s*process\.env`
- Replaces `process.env.X?.split(',')` — keeps whitespace and empty items; `env.list` trims, drops empty items and parses each item as `string`, `int`, `decimal`, `bool`, one of a list, or with a custom parser.
  - Detect: `process\.env(\.\w+|\[['"]\w+['"]\])\??\.split\(`

#### `escapeHtml(unsafe)`

- Replaces `str.replace(/&/g, '&amp;').replace(/</g, '&lt;')...` — hand-written chains often miss `"` or `'` or escape `&` after the other entities; `escapeHtml` escapes all five characters in one pass.
  - Detect: `\.replace\(/&/g,\s*['"]&amp;['"]\)`
  - Detect: `\.replace\(/</g,\s*['"]&lt;['"]\)`

#### `escapeRegExp(str)`

- Replaces `str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` — copied versions often drop `-` or `/`, which break a character class or a `/`-delimited source; `escapeRegExp` escapes both. On Node 24+ and current browsers `RegExp.escape` is the native alternative.
  - Detect: `\.replace\(/\[[^\n]*\]/g,\s*['"]\\\\\$&['"]\)`

#### `filterMap(array, callbackfn)`

- Replaces `list.map(fn).filter(Boolean)` — also drops mapped `0`, `''` and `false` and walks the array twice; `filterMap(list, (x, skip) => fn(x) ?? skip)` drops only what returns `skip`, in one pass.
  - Detect: `\.map\([\s\S]{0,200}?\)\s*\.filter\(\s*Boolean\s*\)`

#### `getInitials(fullName)`

- Replaces `name.split(' ').map(w => w[0]).join('').toUpperCase()` — `w[0]` splits surrogate pairs, double spaces yield `undefined`, and titles like `Dr.` count as words; `getInitials` handles all three. Caveat: it returns at most two letters (first and last word) and deletes hyphens (`Jean-Luc Picard` → `JP`).
  - Detect: `\.split\((['"] ['"]|/\\s\+/)\)\s*\.map\(\s*\(?\w+\)?\s*=>\s*\w+(\[0\]|\.charAt\(0\)|\.at\(0\))\s*\)\s*\.join\(['"]{2}\)`

#### `hex(value)`

- Replaces `Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')` — `hex` reads from a precomputed byte table with no per-byte `toString`/`padStart`, and works in browsers. In Node-only code `Buffer.from(bytes).toString('hex')` is the native alternative. A `number[]` is wrapped mod 256.
  - Detect: `(Array\.from\(|\.map\()[^;]{0,80}\.toString\(16\)\.padStart\(2,\s*['"]0['"]\)[^;]{0,40}\.join\(['"]{2}\)`
  - Detect: `\(\s*['"]0['"]\s*\+\s*\w+\.toString\(16\)\s*\)\.slice\(-2\)`

#### `hexToChannels(hexWithAlpha)`

- Replaces `parseInt(hex.slice(1, 3), 16)` ×3 or `/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i` — both miss `#abc` shorthand and `#rrggbbaa` alpha; `hexToChannels` handles 3/4/6/8 digits and a `/alpha` suffix. Requires the leading `#` and returns `[0, 0, 0, 0]` (not `null`) on invalid input.
  - Detect: `parseInt\(\s*[\w.]+\.(?:slice|substring|substr)\(\s*[0-5]\s*,\s*[1-7]\s*\)\s*,\s*16\s*\)`
  - Detect: `\[(?:a-f\\d|\\da-f|0-9a-f|a-f0-9)\]\{2\}\)\(`
  - Detect: `(?:function\s+|const\s+)hexToRgba?\b`

#### `hslToChannels(value)`

- Replaces A hand-copied `hslToRgb(h, s, l)` with a `hue2rgb(p, q, t)` helper — parses `hsl()` with deg/rad/turn units, the modern syntax and alpha, and wraps negative hues. Takes a CSS string (`'hsl(210 50% 40%)'`), not three numbers, and returns `[0, 0, 0, 0]` on invalid input.
  - Detect: `\bhue2rgb\b`
  - Detect: `(?:function\s+|const\s+)hslToRgba?\b`

#### `humanFileSize(bytes, digits?, withSpace?)`

- Replaces the `units = ['KB', 'MB', 'GB']` loop or `Math.log(bytes) / Math.log(1024)` index — the log version breaks on `0` and negatives unless guarded, and the loop shows `1024.0 KB` at unit boundaries; `humanFileSize` rolls over (`1048575` → `1.0 MB`). Caveats: values under 1 KiB come out as KB (`500` → `0.5 KB`), and the base is 1024 but labelled KB/MB, not KiB/MiB.
  - Detect: `['"]KB['"],\s*['"]MB['"],\s*['"]GB['"]`
  - Detect: `['"]KiB['"],\s*['"]MiB['"],\s*['"]GiB['"]`
  - Detect: `Math\.log\(\w+\)\s*[/]\s*Math\.log\((1024|1000|k)\)`
- Replaces `(bytes / 1024 / 1024).toFixed(1) + ' MB'` — `humanFileSize` picks the unit for the size instead of a fixed MB, so small and huge values stay readable. Same 1024 base and KB/MB labels as above.
  - Detect: `[/]\s*1024\s*[/]\s*1024\b`
  - Detect: `[/]\s*\(\s*1024\s*\*\s*1024\s*\)`

#### `intersection(...arrays)`

- Replaces `a.filter(x => b.includes(x))` — O(n·m); `intersection(a, b)` gives the same result (duplicates in `a` kept, `NaN` matched) with a Set per array, and takes more than two arrays.
  - Detect: `\.filter\(\s*\(?\w+\)?\s*=>\s*[\w.]+\.includes\(\s*\w+\s*\)\s*\)`

#### `intersectionBy(keyBy, ...arrays)`

- Replaces `a.filter(x => b.some(y => y.id === x.id))` — O(n·m) and keeps duplicates; `intersectionBy` builds a Set per array lazily and dedupes by key. Caveat: the items and their order come from the shortest array, not the first one; the key is a top-level property or a function.
  - Detect: `\.filter\(\s*\(?\w+\)?\s*=>\s*[\w.]+\.(some|find)\(\s*\(?\w+\)?\s*=>\s*\w+\.\w+\s*===\s*\w+\.\w+`

#### `isDate(val)`

- Replaces `value instanceof Date` — also true for `new Date('garbage')`, whose `toISOString()` throws a `RangeError`; `isDate` rejects an Invalid Date.
  - Detect: `(\bif\s*\(\s*!?\s*\(?|\breturn\s+|=>\s*)[\w.]+\s+instanceof\s+Date\s*(\)|;|\n)`

#### `isEqual(a, b)`

- Replaces `JSON.stringify(a) === JSON.stringify(b)` — depends on key order and turns `Map`, `Set` and `RegExp` into `{}`; `isEqual` ignores key order and compares Date, RegExp, Map, typed arrays and NaN. Caveats: `{ a: undefined }` differs from `{}`, Set members compare by reference, constructors must match, and there is no cycle guard.
  - Detect: `JSON\.stringify\([^;\n]*\)\s*[!=]==?\s*JSON\.stringify\(`

#### `isNullOrUndefined(value)`

- Replaces `x !== null && x !== undefined` or `x === null || x === undefined` — one call that narrows the type; write `!isNullOrUndefined(x)` for the first form. `x != null` is the same check and can stay.
  - Detect: `[\w.]+\s*[!=]==\s*(null|undefined)\s*(&&|\|\|)\s*[\w.]+\s*[!=]==\s*(null|undefined)\b`

#### `isObject(val)`

- Replaces `typeof x === 'object' && x !== null && !Array.isArray(x)` — still lets through `Date`, `Map`, `RegExp`, `Error` and other built-ins; `isObject` accepts only values tagged `[object Object]`: plain objects, class instances and null-prototype objects.
  - Detect: `typeof\s+[\w.]+\s*===\s*['"]object['"]\s*&&[^;\n]{0,40}!\s*Array\.isArray\(`

#### `isPlainObject(val)`

- Replaces `x?.constructor === Object` — false for `Object.create(null)` and for objects from another realm (iframe, `vm`); `isPlainObject` accepts both and rejects class instances. Caveat: an object with an own non-function `constructor` key, such as parsed JSON `{"constructor": "x"}`, still returns `false`.
  - Detect: `\.constructor\s*===\s*Object\b`

#### `kebabCase(str)`

- Replaces `str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()` — the two-group regex does not split acronym runs (`HTTPRequest` → `httprequest`) and leaves spaces and `_` in place; `kebabCase` splits on case, digits and any separator (`getHTTPResponse` → `get-http-response`).
  - Detect: `\.replace\(/\(\[a-z[^\]\n]*\]\)\(\[A-Z\]\)/g,\s*['"]\$1-\$2['"]\)`
  - Detect: `\.replace\(/\(?\[A-Z\]\)?/g,\s*\(?\w+\)?\s*=>\s*(['"]-['"]\s*\+|\x60-\$\{)`

#### `keyBy(array, keyBy, objectMode?)`

- Replaces `new Map(list.map(x => [x.id, x]))` — `keyBy(list, 'id')` builds the same Map (the last item wins for a repeated key) without the intermediate array of pairs; the key can also be a function.
  - Detect: `new Map\(\s*[\w.]+\.map\(\s*\(?\w+\)?\s*=>\s*\[\s*\w+(\.\w+|\[[^\]]+\])\s*,\s*\w+\s*\]\s*,?\s*\)\s*,?\s*\)\s*[^.\s]`
- Replaces `Object.fromEntries(list.map(x => [x.id, x]))` — `keyBy(list, 'id', true)` returns the same plain object (the last item wins) in one pass.
  - Detect: `Object\.fromEntries\(\s*[\w.]+\.map\(\s*\(?\w+\)?\s*=>\s*\[\s*\w+(\.\w+|\[[^\]]+\])\s*,\s*\w+\s*\]\s*\)\s*\)`

#### `lowerCase(str?)`

- Replaces `str.replace(/([A-Z])/g, ' $1').toLowerCase().trim()` — the regex splits every capital (`HTTPRequest` → `h t t p request`) and keeps `-`/`_`; `lowerCase` keeps acronyms together and joins words with single spaces (`getHTTPResponse` → `get http response`).
  - Detect: `\.replace\(/\(\[A-Z\]\)/g,\s*['"] \$1['"]\)[^;]{0,80}\.toLowerCase\(\)`

#### `luminance(options)`

- Replaces The WCAG relative-luminance formula typed by hand (`0.2126 * R + 0.7152 * G + 0.0722 * B` after the `c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4` linearization) — skipping the linearization is the usual bug. Takes `[r, g, b, a]` in 0–255, not a CSS string; pair with `contrastRatio`.
  - Detect: `0\.2126[\s\S]{0,60}?0\.7152`
  - Detect: `0\.0(?:3928|4045)\b`

#### `orderBy(array, fields, orders)`

- Replaces `list.sort((a, b) => a.x - b.x || a.y - b.y)` — sorts in place and only works for numbers; `orderBy(list, ['x', 'y'], ['asc', 'asc'])` returns a stable sorted copy (typed `readonly T[]`), also compares strings (by code unit, not `localeCompare`) and puts `null`/`undefined` last in `asc`.
  - Detect: `\.sort\(\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\(?\s*\w+\.\w+\s*-\s*\w+\.\w+\s*\)?\s*\|\|`

#### `qs`

- Replaces `Number(searchParams.get('page')) || 1`, `params.get('x') === 'true'` — `qs.parse(search, defaults)` casts each key to the type of its default (number, boolean, Date, array, Set, Map, bigint) and falls back to the default when the value is missing or invalid. Caveats: numbers use `parseFloat` (`'12abc'` becomes 12), only `'true'` is true, and keys missing from `defaults` are dropped.
  - Detect: `(Number|parseInt|parseFloat)\(\s*[\w.]*(?i:params|query)\w*\.get\(`
  - Detect: `\.get\(\s*['"][^'"]+['"]\s*\)\s*===\s*['"]true['"]`
- Replaces `new URLSearchParams(Object.entries(obj).filter(([, v]) => v != null))` — `qs.stringify(obj)` skips `null`, `undefined`, `''` and empty arrays or objects (keeps `0` and `false`), writes Dates as ISO strings and arrays as CSV; `excludeDefaults` also drops values equal to their defaults.
  - Detect: `new URLSearchParams\(\s*Object\.entries\(`

#### `randomString(length, alphabet?)`

- Replaces `Math.random().toString(36).slice(2, 10)` — the result can come back shorter than asked (the float may have few digits) and tops out near 11 characters; `randomString` always returns exactly `length` characters from a uniform alphabet. Still `Math.random`: use `crypto` for tokens or secrets.
  - Detect: `Math\.random\(\)\.toString\(36\)\.(slice|substr|substring)\(`

#### `ResourcePool` (class)

- Replaces `availableConnections.pop() ?? (await waitForRelease())` (a hand-rolled pool with an idle list, an in-use set and a wait queue) — `acquire` / `release` with a FIFO wait queue, lazy creation up to `poolSize` with `auto: true`, `drain()` and `destroy(rejectAcquires)`. Not included: acquire timeouts and health checks; every `acquire` must be paired with `release`.
  - Detect: `\b(available|idle|free)(Connections|Resources|Workers|Clients|Sessions)\b`

#### `retryOnError(options, fn)`

- Replaces `for (let attempt = 0; attempt < max; attempt++) { try { return await fn() } catch { await sleep(ms) } }` and local `retry` helpers — retries only while `shouldRetryBasedOnError(err, attempt)` allows, catches synchronous throws and rethrows the last error. Defaults differ: 2 attempts in total and a constant 100 ms delay; set `maxAttempts` and `delayFactor: 2` for exponential backoff (capped by `delayMaxMs`, default 1000). No jitter, no `AbortSignal`.
  - Detect: `for\s*\(\s*let\s+\w+\s*=\s*[01]\s*;\s*\w+\s*<=?\s*[\w.]*(?i:retr|attempt)\w*`
  - Detect: `\bcatch\s*(\(\s*\w*\s*\))?\s*\{[^}]{0,200}?await\s+(sleep|delay|wait)\(`
  - Detect: `(function\s+(retry|withRetry)\w*\s*[<(]|const\s+(retry|withRetry)\w*\s*=\s*(async\s*)?(<[^()]*>)?\()`

#### `rgbToChannels(value)`

- Replaces `rgb.match(/\d+/g).map(Number)` or a hand-written `/rgba?\((\d+),…/` regex — `/\d+/g` splits a `0.5` alpha into `0` and `5` and ignores percentages; `rgbToChannels` parses comma and space/slash syntax, percentages and decimals, rounding and clamping to 0–255. Returns `[0, 0, 0, 0]` on invalid input.
  - Detect: `/\^?rgba?\\\(`
  - Detect: `rgb\w*\.match\(\s?/\\d\+/g\s*\)`

#### `round2digits(value, digits?)`

- Replaces `Math.round(x * 100) / 100` or `+x.toFixed(2)` — both suffer from binary float error (`1.005` → `1`); `round2digits` shifts the decimal point in the string form (`1.005` → `1.01`) and handles exponent notation. Negative halves still round toward +∞, as with `Math.round` (`-1.005` → `-1`).
  - Detect: `Math\.round\([^;\n]*\*\s*10+\s*\)\s*[/]\s*10+\b`
  - Detect: `(parseFloat|Number)\(\s*[\w.]+\.toFixed\(\d\)\s*\)`
  - Detect: `(=|\(|return|,|:)\s*\+\(?[\w.]+\.toFixed\(\d\)`

#### `shuffle(arr)`

- Replaces `arr.sort(() => Math.random() - 0.5)` — biased shuffle that also mutates the array.
  - Detect: `sort\(\s*\(\)\s*=>\s*Math\.random\(\)\s*-\s*0?\.5`

#### `snakeCase(str?)`

- Replaces `str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()` — the two-group regex does not split acronym runs (`HTTPRequest` → `httprequest`) and leaves spaces and `-` in place; `snakeCase` splits on case, digits and any separator (`getHTTPResponseCode` → `get_http_response_code`).
  - Detect: `\.replace\(/\(\[a-z[^\]\n]*\]\)\(\[A-Z\]\)/g,\s*['"]\$1_\$2['"]\)`
  - Detect: `\.replace\(/\(?\[A-Z\]\)?/g,\s*\(?\w+\)?\s*=>\s*(['"]_['"]\s*\+|\x60_\$\{)`

#### `startCase(value?)`

- Replaces `str.replace(/\b\w/g, c => c.toUpperCase())` — `\b\w` is ASCII-only and leaves `foo_bar` and `fooBar` unsplit; `startCase` splits case, `-` and `_` and capitalizes each word. Caveat: it lowercases the rest of each word (`HELLO` → `Hello`) and splits on apostrophes (`don't` → `Don T`).
  - Detect: `\.replace\(/\\b\\w/g,`
  - Detect: `\.replace\(/\(\[a-z[^\]\n]*\]\)\(\[A-Z\]\)/g,\s*['"]\$1 \$2['"]\)`
  - Detect: `\.split\(['"] ['"]\)\s*\.map\(\s*\(?\w+\)?\s*=>\s*\w+(\[0\]|\.charAt\(0\))\.toUpperCase\(\)\s*\+\s*\w+\.(slice|substring|substr)\(1\)`

#### `sum(values)`

- Replaces `values.reduce((a, b) => a + b, 0)` — one string entry turns the result into concatenation and one `NaN` makes it `NaN`; `sum` skips non-numbers and `NaN` (`Infinity` is kept).
  - Detect: `\.reduce\(\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\w+\s*\+\s*\w+\s*,\s*0\s*\)`

#### `timeout(ms, promiseOrCallback, timeoutError?)`

- Replaces `Promise.race([p, new Promise((_, reject) => setTimeout(reject, ms))])` — the timer is never cleared, so the process stays alive for `ms` after the work finishes; `timeout` clears it, aborts the `AbortSignal` passed to the callback and rejects with a 408 `AppError`. For `fetch` alone, `AbortSignal.timeout(ms)` is enough.
  - Detect: `Promise\.race\(\[[\s\S]{0,200}?setTimeout\(`

#### `timestamp(fromValue?)`

- Replaces `Math.floor(Date.now() / 1000)` — one call that also takes a `Date` or epoch ms. An invalid `Date` gives `NaN`. `Math.round` variants differ from it by up to 1s.
  - Detect: `Math\.(floor|trunc)\(\s*(Date\.now\(\)|new Date\([^)\n]*\)\.getTime\(\)|[\w.]+\.getTime\(\))\s*[/]\s*1000\s*\)`

#### `tintedTextColor(background, tintPercentage?)`

- Replaces `(r * 299 + g * 587 + b * 114) / 1000 >= 128 ? '#000' : '#fff'` — the YIQ threshold can pick the worse color (white on `#00a000` gives 3.5:1, black 6:1); this picks by WCAG contrast. Returns channels, not a string, and by default mixes in 20% of the background (pass `0` for pure black or white).
  - Detect: `\*\s*(?:0\.)?299\s*\+[\s\S]{0,40}?\*\s*(?:0\.)?587`
  - Detect: `(?:0\.)?299\s*\*\s*\w+(?:\[\d\])?\s*\+[\s\S]{0,40}?(?:0\.)?587\s*\*`

#### `toError(value, unknownMessage?)`

- Replaces `err instanceof Error ? err.message : String(err)` — `toError(err).message` gives the same text for errors, strings and numbers, uses `message` of error-like objects instead of `'[object Object]'`, and recognises errors from another realm (`vm`, iframes).
  - Detect: `instanceof\s+Error\s*\?\s*[\w.]+\.message\s*:\s*String\(`

#### `toPath(deepKey)`

- Replaces `path.split('.')` to walk a key path — breaks on brackets and quoted keys (`a[0].b`, `a["c.d"]`); `toPath` parses both like lodash (`a["c.d"]` → `['a', 'c.d']`). To read or write the value, prefer `get`/`set`.
  - Detect: `\b(path|keyPath|propPath|fieldPath|objectPath|dotPath)\.split\(['"]\.['"]\)`

#### `truncate(value, maxLength?, insignificantThreshold?)`

- Replaces `s.length > n ? s.slice(0, n) + '…' : s` — cuts mid-word; `truncate` cuts at the last space within `maxLength` and trims. Caveats: it skips truncation when the overflow is under 5% of `maxLength` (default 120), appends `...` (not `…`), so the result can exceed `maxLength`. Suggest it only where word breaks are wanted.
  - Detect: `\.(slice|substring)\(0,\s*[^)\n]+\)\s*\+\s*['"](\.\.\.|…)['"]`
  - Detect: `\x60\$\{\w+\.(slice|substring)\(0,\s*[^)\n]+\)\}(\.\.\.|…)\x60`

#### `uniq(value)`

- Replaces `list.filter((v, i, a) => a.indexOf(v) === i)` — O(n²) and drops every `NaN` (`indexOf` never finds it); `uniq` uses a Set, keeps one `NaN` and the first-occurrence order.
  - Detect: `\.filter\(\s*\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\w+\.indexOf\(\s*\w+\s*\)\s*===\s*\w+\s*\)`
- Replaces `[...new Set(list)]` or `Array.from(new Set(list))` — same result for an array, as one call. Caveat: `uniq` returns `[]` for a non-array input such as a Set or a string.
  - Detect: `\[\s*\.\.\.\s*new Set\(|Array\.from\(\s*new Set\(`

#### `uniqBy(array, comparator)`

- Replaces `a.filter((x, i, s) => s.findIndex(y => y.id === x.id) === i)` — O(n²); `uniqBy` is O(n) with a Set and also keeps the first occurrence. A string key may be a deep path such as `'a.b'`.
  - Detect: `findIndex\(\s*\(?\w+\)?\s*=>\s*\w+\.\w+\s*===\s*\w+\.\w+\s*\)\s*===\s*\w+`
- Replaces `[...new Map(a.map(x => [x.id, x])).values()]` — keeps the last item for each key (at the first item's position); `uniqBy` keeps the first item.
  - Detect: `new Map\(\s*[\w.]+\.map\([\s\S]{0,120}?\)\s*\)\s*\.values\(\)`

#### `withCache(fn)`

- Replaces `const key = JSON.stringify(args); if (cache.has(key)) return cache.get(key)` — keys are typed (`1` and `'1'` differ; `undefined`, Dates and bigint survive) and a rejected promise is not cached. Caveats: object arguments are keyed by reference unless `objectStrategy: 'json'`; no in-flight dedupe (combine with `withResolve`); unbounded, entries for collected object arguments stay (use `withCacheLRU`/`withCacheFixed` for short-lived objects); a promise-returning function must be declared `async`, otherwise cache hits return the raw value, not a promise.
  - Detect: `\w+\s*=\s*JSON\.stringify\(\s*args\s*\)\s*;?\s*(if\s*\(\s*!?\s*)?[\w.]+\.(has|get)\(`

#### `withCacheLRU(options, fn)`

- Replaces `map.delete(key); map.set(key, value)` to bump recency plus `map.delete(map.keys().next().value)` to evict, around a memo — a bounded memo in one call. Same keying as `withCache`: objects by reference unless `objectStrategy: 'json'`, rejections are not cached, and promise-returning functions must be declared `async`.
  - Detect: `\.get\(\s*\w+\s*\)[\s\S]{0,120}?\.delete\(\s*\w+\s*\)\s*;?\s*[\w.]+\.set\(\s*\w+\s*,`
  - Detect: `[\w.]+\.delete\(\s*[\w.]+\.keys\(\)\.next\(\)\.value`

#### `withResolve(fn, getCacheKey?)`

- Replaces `const p = load(key).finally(() => pending.delete(key)); pending.set(key, p)` (in-flight dedupe) — one wrapper; the key is the EJSON of the arguments by default, the entry is cleared on both resolve and reject, and a synchronous throw becomes a rejection. The wrapped function must return a promise.
  - Detect: `\.finally\(\s*\(\)\s*=>\s*(\{\s*)?[\w.]+\.delete\(`

