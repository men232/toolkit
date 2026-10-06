---
name: andrew-toolkit
description: Index of the @andrew_l packages installed in this project. Check it before writing a helper to dedupe, group, chunk or sort an array; pick, omit, clone or deep-merge an object; debounce, throttle, retry, sleep or limit concurrency; format bytes, durations or dates; parse env vars; narrow or assert a value's type; hash or encode binary data; and before implementing graceful shutdown, side effects or hooks in a MongoDB transaction, cursor pagination, a request context, a query language parser or binary serialization.
---

# @andrew_l packages

One section per npm package. Prefer these over a hand-written equivalent: they are tested and handle the edge cases (`null`, empty input, retries).

Full reference: https://men232.github.io/toolkit/reference/


## Packages

| Package | Does |
| --- | --- |
| [`@andrew_l/toolkit`](#andrew_ltoolkit) | General utility functions |
| [`@andrew_l/app`](#andrew_lapp) | Application runner. |
| [`@andrew_l/binlog`](#andrew_lbinlog) | A high-performance binary logging system for Node.js applications. |
| [`@andrew_l/context`](#andrew_lcontext) | Like composition api but for Node. |
| [`@andrew_l/dom`](#andrew_ldom) | Utility functions to simplify animations, clipboard operations, and smooth scrolling. |
| [`@andrew_l/graceful`](#andrew_lgraceful) | Utility to manage application shutdown. |
| [`@andrew_l/mongo-pagination`](#andrew_lmongo-pagination) | Manages pagination without relying on traditional offsets. |
| [`@andrew_l/mongo-transaction`](#andrew_lmongo-transaction) | Manages side effects in MongoDB transactions: runs them once across retries, undoes them on failure, emits after commit. |
| [`@andrew_l/search-query-language`](#andrew_lsearch-query-language) | Converts human-readable query strings into structured representations. |
| [`@andrew_l/service-actor`](#andrew_lservice-actor) | Forget about passing data like trace IDs between functions. |
| [`@andrew_l/snowflake`](#andrew_lsnowflake) | Another implementation of snowflake id generator. |
| [`@andrew_l/tl-pack`](#andrew_ltl-pack) | Another implementation of binary serialization. |

## @andrew_l/toolkit

General utility functions

`pnpm add @andrew_l/toolkit`

### Array

| Export | Does |
| --- | --- |
| `arrayable(value)` | Converts a value into an array. |
| `avg(values)` | Calculates the average value from an array of numbers. |
| `avgCircular(values, max)` | Computes the average of circular values using vector summation. |
| `chunk(list, size?)` | Splits an array into smaller sub-arrays (chunks) of a specified size. |
| `chunkSeries(list, step?)` | Collapses a continuous series into a tuple of two elements. |
| `difference(...arrays)` | Computes the difference between arrays. |
| `filterMap(array, callbackfn)` | Filters and maps an array in a single pass. |
| `groupBy(array, keyBy, objectMode?)` |  |
| `intersection(...arrays)` | Returns the intersection of arrays. |
| `intersectionBy(keyBy, ...arrays)` | Returns the intersection of multiple arrays based on a specified key or iteratee function. |
| `keyBy(array, keyBy, objectMode?)` | Maps each element of an array based on a provided key. |
| `orderBy(array, fields, orders)` | Sort array by multiple fields |
| `shuffle(arr)` | Randomizes the order of elements in an array using the Fisher-Yates algorithm. |
| `SortedArray` (class) | A self-sorting array that maintains elements in a sorted order based on a comparison function. |
| `sum(values)` | Sums the values in an array of numbers, ignoring non-numeric values. |
| `union(...arrays)` | Creates an array of unique values from all given arrays. |
| `uniq(value)` | Returns a new array with duplicates removed. |
| `uniqBy(array, comparator)` | Extracts unique elements from an array based on a comparator function or property key. |
| `weightedRoundRobin(arr)` | Creates a function that returns a weighted round-robin item from the provided array. |

### Binary

| Export | Does |
| --- | --- |
| `base62` | Base62 encoder/decoder for binary data. |
| `base62Fast` | Base62-like encoder/decoder for binary data but **super fast**. |
| `base64` | Base64 encoder/decoder for binary data |
| `base64ToBytes(data, options?)` | Decodes a Base64 or Base64URL encoded string into a `Uint8Array`. |
| `base64url` | Base64 encoder/decoder for binary data |
| `basex(alphabet)` | Create custom base alphabet encoding. |
| `bigIntBytes(value)` | Converts a `bigint` value into a byte array (`Uint8Array`) in big-endian order. |
| `bigIntFromBytes(bytes)` | Converts a byte array (`Uint8Array`) into a `bigint`. |
| `bitPack(options)` | Define compact packed structure |
| `bitUnpack(options)` | Define compact unpacked structure |
| `bytesToBase64(data, options?)` | Encodes a byte array (`Uint8Array`) into a Base64 or Base64URL encoded string. |
| `compareBytes(a, b)` | Compares two `Uint8Array` instances to check if their contents are identical. |
| `concatenateBytes(a, b)` | Concatenates two `Uint8Array` instances into a single new `Uint8Array`. |
| `rleDecode(buf, value?)` | Decode a run-length encoded buffer. |
| `rleEncode(buf, value?)` | Run-length encode a buffer, compressing runs of a specific byte value. |
| `uint16ToUint8(value)` | Converts a `Uint16Array` into a `Uint8Array`, writing each value as 2 bytes in little-endian order. |
| `uint32ToUint8(value)` | Converts a `Uint32Array` into a `Uint8Array`, writing each value as 4 bytes in little-endian order. |
| `uint8ToUint16(value)` | Converts a `Uint8Array` into a `Uint16Array`, reading each pair of bytes as little-endian. |
| `uint8ToUint32(value)` | Converts a `Uint8Array` into a `Uint32Array`, reading each group of 4 bytes as little-endian. |

### Cache

| Export | Does |
| --- | --- |
| `dropCache(cachePointer, ...args)` | Drop cached result |
| `FixedMap` (class) | A Map-like class with a fixed capacity, where entries are automatically removed when the capacity is exceeded. |
| `FixedWeakMap` (class) | A `WeakMap`-like class with a fixed capacity. |
| `isCached(fn, ...args)` | Check if function has cached result |
| `isWithCache(value)` | Returns true when function is cached |
| `LruCache` (class) | A simple implementation of a Least Recently Used (LRU) cache. |
| `TimeBucket` (class) | A time-based bucket that holds records for a specific interval defined by `sizeMs`. |
| `withCache(fn)` | Wrap a function to cache results by arguments |
| `withCacheBucket(options, fn)` | Wrap a function to cache results by arguments |
| `withCacheBucketBatch(options, resolver)` | In this way we will cache item of resulted array by `key`. |
| `withCacheFixed(options, fn)` | Wrap a function to cache results by arguments |
| `withCacheLRU(options, fn)` | Wrap a function to cache results by arguments |
| `withDeepClone(fn)` | Make deep cloning of function result before returning. |
| `withPointerCache(pointer, dependencies, fn)` |  |

### Colors

| Export | Does |
| --- | --- |
| `alpha(color, newAlpha)` | Returns css valid color with adjusted alpha channel |
| `blendColors(color1, color2, factor)` | Just mixing of two colors |
| `buildCssColor(options, opacity?)` | Build css valid color from color channels |
| `channelsToHex(channels, withAlpha?)` | Converts color channels into hex |
| `channelsToHSL(options)` | Converts color channels into HSL |
| `channelsToRGB(options)` | Converts color channels into RGB |
| `ColorParser` | General color parser api |
| `colorToChannels(color)` | Parse css color and returns color channels |
| `contrastRatio(l1, l2)` | Calculate WCAG 2.0 contrast ratio of two luminance |
| `cssVariable(container)` | Create a getter of css variable for container |
| `hexToChannels(hexWithAlpha)` | Parsing hex string as color channels |
| `hslToChannels(value)` | Parsing HSL string as color channels |
| `interpolateColor(color1, color2, factor)` | Linear color interpolating |
| `isColorChannels(value)` | Check if provided value represents color channels |
| `luminance(options)` | Calculate luminance of color |
| `parseAlpha(value, fallback?)` | Parse alpha channel value and normalize it from 0 to 1 |
| `rgbToChannels(value)` | Parsing rgb() string as color channels |
| `tintedTextColor(background, tintPercentage?)` | Returns a color text color that should be on background to keep good contrast |

### Crypto

| Export | Does |
| --- | --- |
| `crc32(value, seed?)` | Calculate crc32 hash from string |

### Date

| Export | Does |
| --- | --- |
| `createDateObject(value)` | Converts a given input into a `DateObject` representing year, month, and date. |
| `createTimeObject(value)` | Converts a given input into a `TimeObject` representing 24 hours and minutes. |
| `createTimeSpan(value, unit?)` | Creates a new instance of `TimeSpan`. |
| `dateInDays(days, fromValue?)` | Returns a `Date` object representing a time that is the given number of days before or after a base time. |
| `dateInSeconds(seconds, fromValue?)` | Returns a `Date` object representing a time that is the given number of seconds before or after a base time. |
| `getRandomTime(startTime?, endTime?)` | Gets a random time within the specified range. |
| `hmToSeconds(hm)` | Converts a decimal representation of hours and minutes (HH.MM) into total seconds. |
| `isDateObject(value)` | Checks if a given value is a valid `DateObject`. |
| `isTimeObject(value)` | Checks if a given value is a valid `TimeObject`. |
| `isTimeString(value)` | Checks if a given value is a valid `TimeString`. |
| `isTimeValue(value)` | Checks if a given value is a valid `TimeValue`. |
| `isValidWeekDay(value)` | Checks if a given value is a valid weekday number. |
| `secondsToHm(seconds)` | Converts seconds to a decimal representation of hours and minutes (HH.MM) rounded to two decimal places. |
| `timeFromMinutes(value)` | Converts a total number of minutes into a time object with hours and minutes. |
| `timestamp(fromValue?)` | Returns the number of seconds since the Unix epoch (January 1, 1970). |
| `timestampMs(fromValue?)` | Returns or converts the given input into milliseconds since the Unix epoch. |
| `timestampToDate(value)` | Converts a Unix timestamp (in seconds) to a `Date` object. |
| `timeStringify(value)` | Converts a time value into a string formatted as "HH:MM". |
| `timeToMinutes(value)` | Converts a time value into the total number of minutes. |
| `weeksInYear(year)` | Determines the number of ISO weeks in a given year. |

### EJSON

| Export | Does |
| --- | --- |
| `createEJSON(withBasicTypes?)` | Creates a new instance of the `EJSON` (Extensible JSON) with optional basic types pre-registered. |
| `createEJSONStream(options?)` | Creates an instance of `EJSONStream`. |

### Environment

| Export | Does |
| --- | --- |
| `createEnvParser(targetObject, options?)` |  |
| `env` | Ready-to-use environment parser. |

### Errors

| Export | Does |
| --- | --- |
| `AppError` (class) | Simple application error class with the code |
| `AssertionError` (class) |  |
| `captureStackTrace(till)` | Capture stack trace till the function and returns as a `string` |
| `catchError(fn)` | You're tired to write `try... |
| `toError(value, unknownMessage?)` | Transform value to error object |

### Files

| Export | Does |
| --- | --- |
| `getFileExtension(name, withDot?)` | Extract file extension from string |
| `getFileName(value)` | Extract filename from string |
| `getMostSpecificPaths(keys)` | Filters an array of paths to retain only the most specific (deepest) paths, removing any path that is a prefix of another path. |
| `humanFileSize(bytes, digits?, withSpace?)` | Converts bytes amount into human readably string |

### Numbers

| Export | Does |
| --- | --- |
| `checkBitmask(scope, flag)` | Check if bits are set in `number` bitmask |
| `clamp(num, min, max)` | Rounds the given value to a specified range. |
| `createRandomizer(options)` | Creates a random number generator with step control and optional transformation. |
| `findMean(value?)` | Calculate the running mean (average) of a set of numbers. |
| `formatMoney(amount, formatOrCode?, intMode?)` | Formats a given number (amount of money) as a currency string. |
| `formatNumber(value, format?)` | Formats a number (or string representing a number) into a string with thousands separators and optional decimal points. |
| `getRandomInt(min, max)` | Returns a random integer between min (inclusive) and max (inclusive). |
| `humanize(input, decimals?)` | Humanizes large numbers into a more readable format using suffixes like K, M, B, T (thousand, million, billion, trillion). |
| `parseAllNumbers(value)` | Parses all numbers from a given string and returns them as an array of numbers. |
| `parsePercentage(value)` | Safely parses a percentage value and returns a number between 0 and 100. |
| `percentOf(value, percent, digits?)` | Calculates the specified percentage of a given value. |
| `round2digits(value, digits?)` | Rounds a given number to a specified number of decimal places. |

### Object

| Export | Does |
| --- | --- |
| `cleanEmpty(obj)` | Removes properties with empty values from an object. |
| `cleanObject(input)` | Removes all properties from the given object, including symbol keys. |
| `createSecureCustomizer(properties, opts?)` | Creates a that redacts sensitive property values and handles circular references when used with . |
| `deepAssign(dest, source)` | Performs a deep merge of the source object into the destination object. |
| `deepClone(value)` | Recursively clones the provided value, creating a deep copy. |
| `deepCloneWith(value, customizer)` | Recursively clones the provided value with a customizer function that allows for transformation of certain values during the cloning process. |
| `deepDefaults(target, ...sources)` | Recursively assigns default properties. |
| `deepFreeze(value)` | Recursively freezes an object or array, making it immutable at all levels. |
| `def(obj, key, value, writable?)` | Define not enumerable property in object. |
| `flagsToMap(value, bitmaskMap)` | Converts bitmask into mapped object with true/false values |
| `flatten(obj, options?)` | Flattens a nested object into a single-level object, converting nested properties into key-value pairs with keys representing the property path. |
| `get(object, path)` | Retrieves the value at a given path from an object. |
| `getTag(value)` | Get object tag of value |
| `has(value, keys)` | Returns true when provided keys exists in target object |
| `hasOwn(val, key)` | Check if object has own property |
| `omit(obj, excludes)` | Creates a new object with specified keys omitted. |
| `omitPrefixed(obj, prefix)` | Pick object keys with excluding prefix keys |
| `pick(obj, keys)` | Creates a new object composed of the picked object properties. |
| `pickPrefixed(obj, options)` | Pick prefixed keys in target object |
| `set(object, path, value)` | Sets the value at the specified path of the given object. |
| `toMap(obj)` | Converts object into Map |
| `unflatten(input, separator?)` | Converts a flattened object back into a nested structure. |
| `unset(obj, path)` | Removes the property at the given path of the object. |
| `updateWith(object, path, updater, customizer?)` | Updates the value at the specified path of the given object using an updater function and a customizer. |

### Predicates

| Export | Does |
| --- | --- |
| `isBigInt(val)` | Checks if the given value is a `bigint` |
| `isBoolean(val)` | Checks if the given value is a `boolean` |
| `isBuffer(value)` | Checks if the given value is a Buffer instance. |
| `isClient` | Determines if the window object is available in the global scope |
| `isDate(val)` | Checks if the given value is valid `Date` |
| `isDef(val?)` | Returns `true` when value is not `undefined` |
| `isEmpty(obj)` | Checks if a given value is empty. |
| `isEqual(a, b)` | Checks if two values are equal, including support for `Date`, `RegExp`, and deep object comparison. |
| `isError(val)` | Checks if the given value is a `Error` |
| `isFunction(val)` | Checks if the given value is a `function` |
| `isInfinity(val)` | Checks if the given value is a `Infinity` number. |
| `isMap(val)` | Checks if the given value is a `Map`. |
| `isNode()` | Checks if the current environment is Node.js. |
| `isNullOrUndefined(value)` | Checks if the given value is a `null` or `undefined` |
| `isNumber(val)` | Checks if the given value is a `number` |
| `isObject(val)` | Checks if the given value is a `object` |
| `isPlainObject(val)` | Checks if the given value is a plain `object` |
| `isPrimitive(value)` | Checks whether a value is a JavaScript primitive. |
| `isPromise(value)` | Checks if the given value is a `Promise` |
| `isRegExp(val)` | Checks if the given value is a `RegExp`. |
| `isSet(val)` | Checks if the given value is a `Set`. |
| `isString(val)` | Checks if the given value is a `string` |
| `isSymbol(val)` | Checks if the given value is a `symbol` |
| `isTypedArray(x)` | Checks if a value is a TypedArray. |
| `isWeakMap(val)` | Checks if the given value is a `WeakMap`. |
| `isWeakSet(val)` | Checks if the given value is a `WeekSet`. |

### Promise

| Export | Does |
| --- | --- |
| `asyncFilter(array, predicate, options?)` | Asynchronously filters an array using an async predicate function. |
| `asyncFilterMap(array, callbackfn, options?)` | Asynchronously filters and maps an array in a single pass, with bounded concurrency. |
| `asyncFind(array, callbackfn)` | Asynchronously finds the first element in an array that satisfies the provided async predicate. |
| `asyncForEach(array, callbackfn, options?)` | Asynchronously iterates over an array, executing the provided callback for each element with support for parallel processing. |
| `AsyncIterableQueue` (class) | An asynchronous queue implementation that can be iterated using an async iterator. |
| `asyncMap(array, callbackfn, options?)` | Asynchronously maps over an array, applying the provided callback function to each element, with support for parallel processing of array elements. |
| `CancellablePromise` (class) | A custom promise that supports cancellation. |
| `createScheduler()` | Creates a microtask scheduler that batches jobs and flushes them in priority order on the next tick. |
| `defer()` | Old known defer :) |
| `delay(amount?, options?)` | Returns a promise that resolves after the provided delay. |
| `fastIdle(callback)` | Executes the provided callback as soon as the event loop is idle. |
| `fastIdlePromise()` | Same as `fastIdle` but promisified |
| `fastRaf(callback, withTimeoutFallback?)` | Stacks callbacks for `requestAnimationFrame` into a single execution call. |
| `nextTickIteration(amount, delay?)` | Creates a cooldown function that resolves after a specified number of executions (`amount`). |
| `Queue` (class) | A basic FIFO queue with an optional limit and waiting `get` / `put`. |
| `ResourcePool` (class) | A generic resource pool that manages the lifecycle of expensive resources. |
| `SimpleEventEmitter` (class) | Simplified version on nodejs `EventEmitter` but platform agnostic |
| `timeout(ms, promiseOrCallback, timeoutError?)` | Throws an error if the provided promise or callback is not resolved within the specified timeout period. |
| `toPromise(value)` | Wraps a value or a thunk in a `Promise`, always resolving on the next microtask. |
| `withResolve(fn, getCacheKey?)` | Wraps an async function to guarantee single execution for identical arguments. |
| `withTimeout(run, opts)` | Executes an async function and enforces a timeout. |

### Strings

| Export | Does |
| --- | --- |
| `camelCase(str)` | Converts a string to camel case. |
| `capitalize(str)` | Converts the first character of string to upper case and the remaining to lower case. |
| `convertToUnit(str, unit?)` | Converts a value to a string and appends a specified unit to it. |
| `escapeHtml(unsafe)` | Sanitizes a string by escaping HTML syntax to prevent XSS (Cross-site scripting) attacks. |
| `escapeNumeric(str)` | Sanitizes a string by removing all non-numeric characters, leaving only digits. |
| `escapeRegExp(str)` | Escapes special characters in a string to safely use it as a literal pattern in a regular expression. |
| `getInitials(fullName)` | Extracts the initials from a full name while ignoring titles or prefixes (e.g., Dr., Mr., Mrs.), as well as any words starting with special characters (e.g., !, @, #). |
| `hasProtocol(url, protocols?)` | Checks if the provided URL string has a protocol prefix, such as `http://` or `https://`. |
| `hex(value)` | Encodes a `Uint8Array` or a number array into a hexadecimal string. |
| `isIndex(value, length?)` | Returns true when value is property index |
| `isOneEmoji(text)` | Checks if the provided text is a single emoji. |
| `isoToFlagEmoji(iso)` | Converts a two-letter ISO country code (e.g., 'US') to the corresponding flag emoji. |
| `kebabCase(str)` | Converts a string to kebab case. |
| `lowerCase(str?)` | Converts a string to lower case. |
| `maskingEmail(value)` | Masks part of the email address to provide a simple level of privacy. |
| `maskingPhone(value, fromPosition?, toPosition?, withChar?)` | Masks part of a phone number to provide a simple level of privacy. |
| `maskingWords(value, withChar?)` | Masks the middle characters of each word in the given string, leaving the first and last characters intact. |
| `objectId(fromValue?)` | Useful when you need to generate almost secure object id in browser |
| `randomString(length, alphabet?)` | Generates a random string of the specified length using characters from the given alphabet. |
| `snakeCase(str?)` | Converts a string to snake case. |
| `sprintf(line, args, unusedArgs?)` | Formats a string by replacing format specifiers with values from the provided arguments. |
| `startCase(value?)` | Converts the first character of each word in a string to uppercase and the remaining characters to lowercase. |
| `strAssign(str, obj, method?)` | Replaces placeholders in the input string with values from the provided object. |
| `toKey(value)` | Converts `value` to a string key if it's not a string or symbol. |
| `toPath(deepKey)` | Converts a deep key string into an array of path segments. |
| `toString(value?)` | Converts `value` to a string. |
| `truncate(value, maxLength?, insignificantThreshold?)` | Truncates a string to the specified maximum length while preserving whole words and appends ellipsis (`...`) if the string exceeds the maximum length. |
| `wrapText(value, maxLength?)` | Truncates the input string to the specified maximum length and appends an ellipsis (`...`) if the string exceeds the maximum length. |

### Utility Functions

| Export | Does |
| --- | --- |
| `constant(value)` | Creates a new function that always returns `value`. |
| `debounce(func, debounceMs, options?)` | Creates a debounced function that delays invoking the provided function until after `debounceMs` milliseconds have elapsed since the last time the debounced function was invoked. |
| `getLoggerLevel()` | Get global log level. |
| `identity(x)` | Returns the input value unchanged. |
| `isSkip(value)` |  |
| `isSuccess(value)` |  |
| `LOG_LEVELS` | Log levels and their severity. |
| `logger(...baseArgs)` | Create pretty simple `console.log` wrapper interface. |
| `negate(func)` | Creates a function that negates the result of the predicate function. |
| `noop()` | Function that does nothing |
| `qs` | Simple query stringy interface that supports encoding/decoding of `Array`, `Set`, `Map`, `Object`, `BigInt` |
| `retryOnError(options, fn)` | Wraps a function with retry logic. |
| `setLoggerLevel(level)` | Set global log level. |
| `stringifyExecResult(value)` |  |
| `throttle(func, throttleMs, options?)` | Creates a throttled function that only invokes the provided function at most once per every `throttleMs` milliseconds. |
| `typeOf(value)` | Typeof that you deserve |

### Other classes

| Export | Does |
| --- | --- |
| `EJSONInstance` (class) | EJSON - Extended JSON handler class for custom encoding and decoding with vendor support. |
| `FindMean` (class) | A class that allows you to calculate the running mean (average) of a set of numbers. |
| `TimeSpan` (class) | A class representing a span of time with a specific value and unit of measurement. |

### Other variables

| Export | Does |
| --- | --- |
| `noopLogger` | Logger that does nothing |

### Other functions

| Export | Does |
| --- | --- |
| `isDeepKey(key)` | Checks if a given key is a deep key. |

## @andrew_l/app

Application runner.

`pnpm add @andrew_l/app`

### App Lifecycle

| Export | Does |
| --- | --- |
| `appWaitShutdown(instance)` | Returns a promise that resolves when the app emits its shutdown event. |
| `createAppInstance(definition)` | Create a new runtime instance from an app definition. |
| `runApp(instance)` | Run the entry phase of an app instance. |
| `setupApp(instance, props)` | Run the setup phase of an app instance. |
| `shutdownApp(instance)` | Shut down an app instance, call its `shutdown` hook, and reset all state. |
| `startApp(app, props)` | Run setup and entry in one call. |
| `stopApp(instance)` | Stop a running app instance and call its `stop` hook. |

### Main

| Export | Does |
| --- | --- |
| `defineApp(definition)` | Define an application with typed props and lifecycle hooks. |
| `defineWorker(definition)` | Define a background worker with a pluggable execution strategy. |

### Threads

| Export | Does |
| --- | --- |
| `createAppThreadInstance(options)` | Create app instance with IPC fully managed lifecycle |
| `initThread(threadId, scriptFile, threadProps)` | Spawn a child process for `scriptFile` and return its immediately — synchronously, before the child signals readiness. |
| `restartThreadApp(w)` | Terminate the child and spawn a fresh one with the same script + props. |
| `setupThreadApp(w)` | Send the setup message; resolves when child replies setup_done. |
| `shutdownThreadApp(w)` | Send shutdown and wait for the OS process to exit (SIGKILL fallback). |
| `startThreadApp(w)` | Send the start message; on reply, switch to running and arm heartbeat. |
| `stopThreadApp(w)` | Send the stop message; child keeps running, app inside is stopped. |
| `waitForThreadReady(w)` | Wait for thread ready signal |

### Types

| Export | Does |
| --- | --- |
| `createAppThread(definition)` | Wrap an app definition to run across N child processes. |
| `ManagedThread.*` |  |
| `WorkerStrategy.*` |  |

### Utils

| Export | Does |
| --- | --- |
| `cli` | Programmatic access to the `vrun` CLI internals. |
| `createAppHub(definitions)` | Combine multiple app definitions into a single orchestrated app. |
| `isAppAutorun(definition)` | Returns true when app should be automatically started |
| `isAppDefinition(value)` | Returns true if the value was created by `defineApp`. |
| `isWorkerDefinition(value)` | Returns true if the value was created by defineWorker. |
| `isWorkerInstance(value)` | Returns true if the value is a WorkerInstance. |

### Worker

| Export | Does |
| --- | --- |
| `addWorkerTask(instance, ctx)` | Enqueue a task context on the worker. |
| `createWorkerInstance(definition, logger)` | Create a runtime WorkerInstance from a WorkerDefinition. |

### Worker Strategies

| Export | Does |
| --- | --- |
| `IntervalStrategy` (class) | Triggers a worker task on a fixed interval. |

## @andrew_l/binlog

A high-performance binary logging system for Node.js applications.

`pnpm add @andrew_l/binlog`

### Main

| Export | Does |
| --- | --- |
| `Binlog` (class) | TypeScript implementation of binlog system Adapted from https://github.com/vk-com/kphp-kdb/blob/master/binlog/kdb-binlog-common.c |
| `createBinlog(options)` | Create binlog instance |

## @andrew_l/context

Like composition api but for Node.

`pnpm add @andrew_l/context`

### Main

| Export | Does |
| --- | --- |
| `bindContext(fn)` | Binds the current context to the provided function. |
| `createContext(providerName, contextName?)` | Wrapper around `provide/inject` function to simple usage. |
| `getCurrentScope()` |  |
| `hasInjectionContext()` | Returns true if `inject()` can be used without warning about being called in the wrong place. |
| `inject(key)` | Inject previously provided data |
| `onScopeDispose(fn)` | The callback will be invoked when the associated context completes. |
| `provide(key, value, enterWith?)` | To provide data to a descendants |
| `runWithContext(fn, isolated?)` | Runs a function within the injection context and returns its result. |
| `withContext(fn, detached?)` | Creates a function within the injection context and returns its result. |

## @andrew_l/dom

Utility functions to simplify animations, clipboard operations, and smooth scrolling.

`pnpm add @andrew_l/dom`

### Animation

| Export | Does |
| --- | --- |
| `animate(tick)` | Continuously animates by repeatedly calling the `tick` function until it returns `false`. |
| `animateInstantly(tick)` | Instantly animates by calling the `tick` function in rapid succession until it returns `false`. |
| `animateNumber(timing)` | Animates a numeric value from `from` to `to` over a specified duration, applying an optional timing function. |
| `animateSingle(tick, instance?)` | Animates a single tick of an animation, running repeatedly until cancelled or the tick function returns `false`. |

### Clipboard

| Export | Does |
| --- | --- |
| `copyTextToClipboard(text)` | Copies the provided text to the system clipboard. |

### Scrolling

| Export | Does |
| --- | --- |
| `fastSmoothScroll(container, element, position, margin?, maxDistance?, forceDirection?, forceDuration?, forceNormalContainerHeight?, onComplete?)` | Smoothly scrolls the specified container to bring the given element into view, with optional customization for scroll behavior, direction, and duration. |
| `isScrolledToDown(target, threshold?)` | Determines if the specified element or the document/window is scrolled near the bottom. |
| `resetScroll(container, scrollTop?)` | Resets the scroll position of the specified container element. |

## @andrew_l/graceful

Utility to manage application shutdown.

`pnpm add @andrew_l/graceful`

### Main

| Export | Does |
| --- | --- |
| `isShuttingDown()` | Returns true when process received shutdown signal |
| `onShutdown(handler)` | Gracefully terminate application's modules on shutdown. |

### Other functions

| Export | Does |
| --- | --- |
| `onShutdownError(callback)` | Optional export to handle shutdown errors. |

## @andrew_l/mongo-pagination

Manages pagination without relying on traditional offsets.

`pnpm add @andrew_l/mongo-pagination`

### Main

| Export | Does |
| --- | --- |
| `withMongoosePagination(query, options?)` | Enhances a Mongoose query with pagination capabilities. |
| `withMongoPagination(cursor, options?)` | Enhances a MongoDB `FindCursor` with pagination capabilities. |

### Utils

| Export | Does |
| --- | --- |
| `createRangeFilter(sortDirection, sortValues)` | Creates a range filter based on sorting direction and values. |
| `createToken(options?)` | Create a token with pagination and metadata information. |
| `mergeFilters(first, second)` | Merges two MongoDB filters in the most effective way. |
| `parseToken(value)` | Parses a token from provided value. |

## @andrew_l/mongo-transaction

Manages side effects in MongoDB transactions: runs them once across retries, undoes them on failure, emits after commit.

`pnpm add @andrew_l/mongo-transaction`

### Hooks

| Export | Does |
| --- | --- |
| `onCommitted(callback, dependencies?)` | Registers a callback that runs once after a successful commit, regardless of retries. |
| `onMongoSessionCommitted(fn)` | Executes the provided function when the session ends with a committed transaction. |
| `onRollback(callback, dependencies?)` | Registers a callback that runs once after the final failure, after effect cleanups. |
| `useMongoSession()` | Returns the current transaction session if executed within `withMongoTransaction()` otherwise returns `null` |
| `useTransactionEffect(setup, options?)` | Executes a transactional effect with cleanup on error or rollback. |

### Main

| Export | Does |
| --- | --- |
| `withMongoTransaction(options)` | Runs a provided callback within a transaction, retrying either the commitTransaction operation or entire transaction as needed (and when the error permits) to better ensure that the transaction can complete successfully. |
| `withTransaction(fn, options?)` | Wraps a function with transaction context, enabling retry logic and transactional effects. |
| `withTransactionControlled(fn, options?)` | Wraps a function and returns a `TransactionControlled` interface, allowing manual control over transaction commit and rollback operations. |

## @andrew_l/search-query-language

Converts human-readable query strings into structured representations.

`pnpm add @andrew_l/search-query-language`

### Main

| Export | Does |
| --- | --- |
| `parseQuery(value)` | Parses a query string into a NodeProgram representation. |
| `parseToMongo(input, options?)` | Parses a query string and converts it into a MongoDB-compatible query object. |
| `parseToMongoose(reference, input, options?)` | Parses a query string and converts it into a MongoDB-compatible query object, using a provided Mongoose schema or model for field validation and transformation. |

### Utils

| Export | Does |
| --- | --- |
| `Expression` (class) | Parse an expression class. |
| `Tokenizer` (class) |  |

### Other constants

| Export | Does |
| --- | --- |
| `KEYWORDS` | Keyword tokens. |
| `MONGO_TRANSFORM` | Utility transform functions |
| `NODE` | Node types |
| `TOKEN` | Token types |

## @andrew_l/service-actor

Forget about passing data like trace IDs between functions.

`pnpm add @andrew_l/service-actor`

### Main

| Export | Does |
| --- | --- |
| `serviceActor(factory?)` | Create service actor hooks |

## @andrew_l/snowflake

Another implementation of snowflake id generator.

`pnpm add @andrew_l/snowflake`

### Main

| Export | Does |
| --- | --- |
| `Snowflake` (class) | A class for generating and deconstructing Twitter snowflakes. |

### Other variables

| Export | Does |
| --- | --- |
| `MAX_INCREMENT` | The maximum value the `increment` field accepts in snowflakes. |
| `MAX_PROCESS_ID` | The maximum value the `processId` field accepts in snowflakes. |
| `MAX_WORKER_ID` | The maximum value the `workerId` field accepts in snowflakes. |

## @andrew_l/tl-pack

Another implementation of binary serialization.

`pnpm add @andrew_l/tl-pack`

### Main

| Export | Does |
| --- | --- |
| `defineStructure(options)` | Create binary structure definition with type safety and performance optimization |
| `tlDecode(buffer, opts?)` | Decode value from `Uint8Array` |
| `tlEncode(value, opts?)` | Encode any value into `Uint8Array` |

