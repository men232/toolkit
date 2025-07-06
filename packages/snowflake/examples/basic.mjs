import { Snowflake } from '@andrew_l/snowflake';

// Define a custom epoch
const epoch = 1751810749563;

// Create an instance of Snowflake
const snowflake = new Snowflake({ epoch });

// Generate a snowflake with the given epoch
const uniqueId = snowflake.generate();

console.log('unique id       =', uniqueId); // 1129073086464n

// Generate a snowflake with the given epoch
const uniqueIdBuffer = snowflake.generateBuffer();

console.log('unique id (buf) =', uniqueIdBuffer); // Uint8Array(8)
