# Snowflake - Generate unique IDs in a distributed environment at scale

[![npm version][npm-version-src]][npm-version-href]
![license][license-src]
[![bundle][bundle-src]][bundle-href]

There is a bit improved version of [@sapphire/snowflake](https://github.com/sapphiredev/utilities/tree/main/packages/snowflake) package by using javascript numbers and Uint8Array buffer.

⚡ **Benchmark**

```
  name                               hz      rme   samples
· sapphire                10,690,009.83   ±0.62%  10690010
· andrew (bigint)         11,704,038.89   ±0.03%  11704039
· andrew (buffer)         13,808,748.82   ±0.37%  13808749
· andrew (buffer unsafe)  16,023,413.95   ±0.04%  16023414   fastest
```

<!-- install placeholder -->

## 🚀 Example Usage

### Basic Example

```javascript
import { Snowflake } from '@andrew_l/snowflake';

// Define a custom epoch
const epoch = 1751810749563;

// Create an instance of Snowflake
const snowflake = new Snowflake({ epoch });

// Generate a snowflake with the given epoch
const uniqueId = snowflake.generate();

// Generate a snowflake with the given epoch
const uniqueIdBuffer = snowflake.generateBuffer();
```

### Stripe Style

```javascript
import { Snowflake } from '@andrew_l/snowflake';
import { base62, bigIntFromBytes } from '@andrew_l/toolkit';

// Create an instance of Snowflake
const snowflake = new Snowflake({ epoch: 1288834974657 });

// Generate a snowflake with the given epoch
const customerId = 'cus_' + base62.encode(snowflake.generateBuffer());

// e.g. cus_2JRkp89kSZs
console.log('customer id  =', customerId);

// Extract the numeric value by decoding the base62 portion
const customerIdNumber = bigIntFromBytes(base62.decode(customerId.slice(4)));

// e.g. 1941863457523503104n
console.log('customer id (number) =', customerIdNumber);
```

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@andrew_l/snowflake?style=flat
[npm-version-href]: https://npmjs.com/package/@andrew_l/snowflake
[bundle-src]: https://img.shields.io/bundlephobia/min/@andrew_l/snowflake?style=flat
[bundle-href]: https://bundlephobia.com/result?p=@andrew_l/snowflake
[license-src]: https://img.shields.io/npm/l/@andrew_l/snowflake?style=flat
