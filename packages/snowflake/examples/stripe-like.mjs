/**
 * Stripe provides excellent documentation, and their use of human-readable IDs
 * makes it easier to identify resources at a glance.
 *
 * We can achieve similar readability by encoding our snowflake int64 IDs into Base62.
 *
 * For further reading, here's a great article by a Stripe developer:
 * https://dev.to/stripe/designing-apis-for-humans-object-ids-3o5a/comments
 */

import { Snowflake } from '@andrew_l/snowflake';
import { base62, bigIntFromBytes } from '@andrew_l/toolkit';

// Create an instance of Snowflake
const snowflake = new Snowflake({ epoch: 1288834974657 });

// Generate a snowflake with the given epoch
const customerId = 'cus_' + base62.encode(snowflake.generateBuffer());

console.log('customer id          =', customerId); // e.g. cus_2JRkp89kSZs

// Extract the numeric value by decoding the base62 portion
const customerIdNumber = bigIntFromBytes(base62.decode(customerId.slice(4)));

console.log('customer id (number) =', customerIdNumber); // e.g. 1941863457523503104n
