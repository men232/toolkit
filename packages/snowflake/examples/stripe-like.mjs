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
