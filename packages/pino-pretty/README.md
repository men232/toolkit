# Pino Pretty

![license](https://img.shields.io/npm/l/%40andrew_l%2Fpino-pretty)
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fpino-pretty)

A highly customizable [pino](https://www.npmjs.com/package/pino) transport that transforms JSON logs into beautiful, readable output with colors, icons, and intelligent formatting for development.

Inspired by [consola](https://www.npmjs.com/package/consola)

[Documentation](https://men232.github.io/toolkit/reference/@andrew_l/pino-pretty/)

![screenshot](https://raw.githubusercontent.com/men232/toolkit/refs/heads/main/packages/pino-pretty/assets/sample.png?raw=true)

<!-- install placeholder -->

## 📋 Features

- **Highly Customizable:** Configure colors, icons, badges, and formatting options for each log level
- **Intelligent Formatting:** Smart object inspection with configurable depth and string truncation
- **Type-Aware Coloring:** Different colors for strings, numbers, booleans, errors, and other data types
- **Terminal Optimized:** Respects terminal width and supports both colored and plain text output

## ⚠️ Cautions

To ensure optimal performance and display, please keep the following in mind:

- **Terminal Width:** Set `columns` to `process.stdout.columns` for proper formatting
- **Color Support:** Disable `colorize` when piping to files or in CI environments without color support
- **Memory Usage:** Be mindful of `depth` and `maxStringLength` settings for large objects
- **Performance:** Do not use in production logs output.

## 🚀 Example: Basic Usage

```js
import pino from 'pino';

const logger = pino({
  serializers: {
    // To enable pretty error stack trace displaying.
    error: pino.stdSerializers.errWithCause,
    err: pino.stdSerializers.errWithCause,
  },
  transport: {
    target: '@andrew_l/pino-pretty',
    options: {
      columns: process.stdout.columns,
    },
  },
});

logger.info('Basic pino-pretty setup successful');
```

## 🚀 Example: Advanced Configuration

Customize every aspect of your log formatting:

```typescript
import pino from 'pino';
import type { PinoPretty } from '@andrew_l/pino-pretty';

const logger = pino({
  transport: {
    target: '@andrew_l/pino-pretty',
    options: {
      columns: process.stdout.columns,
      colorize: !process.env.CI,
      indent: 4,
      depth: 3,
      maxStringLength: 200,
      numericSeparator: true,
      quoteStyle: 'double',
      ignore: 'hostname,pid',

      // Custom level configurations
      levels: {
        10: { icon: '🔍', color: ['gray', 'dim'], badge: 'TRACE' },
        20: { icon: '📋', color: 'cyan', badge: 'INFO' },
        30: { icon: '⚠️', color: ['yellow', 'bold'], badge: 'WARN' },
        40: { icon: '❌', color: ['red', 'bold'], badge: 'ERROR' },
        50: { icon: '💀', color: ['magenta', 'bold'], badge: 'FATAL' },
      },

      // Custom type coloring
      types: {
        string: { color: 'green' },
        number: { color: 'cyan' },
        boolean: { color: 'yellow' },
        object: { color: 'blue' },
        error: { color: ['gray'] },
        errorStack: { color: 'cyan' },
        time: { color: 'gray' },
        name: { color: ['blue', 'bold'] },
      },
    } as PinoPretty.Options,
  },
});

logger.info('Custom pino-pretty setup successful');
```

## 🤔 Why Use This Package?

1. **Enhanced Readability:** Transform cryptic JSON logs into human-readable, visually appealing output
2. **Development Productivity:** Quickly identify issues with color-coded levels and intelligent formatting
3. **Highly Customizable:** Every aspect of formatting can be tailored to your preferences
