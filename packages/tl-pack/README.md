# TL Pack - Binary Serialization Library

[![npm version][npm-version-src]][npm-version-href]
![license][license-src]
[![bundle][bundle-src]][bundle-href]

Binary serialization library, inspired by the TL (Type Language) format, created by the VK team. Unlike official TL, this version does not require a schema for serialization/deserialization. It provides a compact and fast alternative to other binary serialization formats like MessagePack.

⚡ **Benchmark**: Slightly faster and more compact than **@msgpack/msgpack**  
⚠️ **Note**: Benchmark claims may vary.

<!-- install placeholder -->

## ✨ Features

- **No Schema Required**: Unlike traditional serialization formats, this version does not require a predefined schema for object serialization.
- **Compact & Fast**: Designed to be lightweight and fast, with smaller binary output.
- **Type-Safe Structures**: Define strongly typed binary structures with validation and versioning.
- **Custom Extension Support**: Easily extend serialization to custom types.
- **Stream Support**: Supports streaming serialization/deserialization in Node.js.
- **Version Compatibility**: Built-in version checking for structure evolution.

## 🚀 Example Usage

### Basic Example

```javascript
import { BinaryWriter, BinaryReader } from '@andrew_l/tl-pack';

const writer = new BinaryWriter();

// Serialize an object with various data types
writer.writeObject({
  null: null,
  uint8: 255,
  uint16: 256,
  uint32: 65536,
  int8: -128,
  int16: -32768,
  int32: -2147483648,
  double: 3.14,
  string: 'Hello world',
  vector: [1, 2, 3, 4, 5, { text: 'hi' }],
  map: { foo: 'bar' },
  date: new Date(),
});

const reader = new BinaryReader(writer.getBuffer());

console.log(reader.readObject());
/**
{
  null: null,
  uint8: 255,
  uint16: 256,
  uint32: 65536,
  int8: -128,
  int16: -32768,
  int32: -2147483648,
  double: 3.14,
  string: 'Hello world',
  vector: [ 1, 2, 3, 4, 5, { text: 'hi' } ],
  map: { foo: 'bar' },
  date: 2023-07-03T12:22:26.000Z
}
 */
```

### Type-Safe Structures with `defineStructure`

Define reusable, type-safe binary structures with validation and versioning:

```ts
import { defineStructure, type Structure } from '@andrew_l/tl-pack';

// Define a User structure
const User = defineStructure({
  name: 'User',
  version: 1,
  checksum: true,
  properties: {
    id: { type: Number, required: true },
    name: { type: String, required: true },
    email: { type: String, required: false },
    isActive: { type: Boolean, required: true },
    createdAt: { type: Date, required: true },
    tags: { type: Array as Structure.PropType<string[]>, required: false },
    metadata: { type: Object, required: false },
  },
});

// Create and serialize a user
const user = new User({
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
  isActive: true,
  createdAt: new Date(),
  tags: ['admin', 'verified'],
  metadata: {
    theme: 'dark',
    lang: 'en',
  },
});

// Serialize to binary
const buffer = user.toBuffer();
console.log(`Serialized size: ${buffer.length} bytes`);

// Deserialize from binary
const restored = User.fromBuffer(buffer);
console.log(restored);
/**
{
  id: 123,
  name: 'John Doe',
  email: 'john@example.com',
  isActive: true,
  createdAt: 2023-07-03T12:22:26.000Z,
  tags: ['admin', 'verified'],
  metadata: { theme: 'dark', lang: 'en' }
}
 */
```

### Nested Structures

Create complex hierarchical data structures:

```javascript
// Define an Address structure
const Address = defineStructure({
  name: 'Address',
  version: 1,
  properties: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: false },
  },
});

// Define a Person with nested Address
const Person = defineStructure({
  name: 'Person',
  version: 2,
  checksum: true,
  properties: {
    name: { type: String, required: true },
    age: { type: Number, required: true },
    address: { type: Address, required: false },
    contacts: { type: Array, required: false }, // Array of other persons
  },
});

const person = new Person({
  name: 'Alice Smith',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'New York',
    zipCode: '10001',
    country: 'USA',
  },
  contacts: [
    { name: 'Bob', age: 25 },
    { name: 'Carol', age: 35 },
  ],
});

const buffer = person.toBuffer();
const restored = Person.fromBuffer(buffer);
```

### API Response Caching

Optimize API responses with binary serialization:

```javascript
const APIResponse = defineStructure({
  name: 'APIResponse',
  version: 1,
  properties: {
    status: { type: Number, required: true },
    data: { type: Object, required: false },
    headers: { type: Object, required: false },
    timestamp: { type: Date, required: true },
    cacheKey: { type: String, required: true },
  },
});

// Cache API response
const response = new APIResponse({
  status: 200,
  data: {
    users: [
      /*...*/
    ],
    total: 1250,
  },
  headers: { 'content-type': 'application/json' },
  timestamp: new Date(),
  cacheKey: 'users_page_1',
});

// 60% smaller than JSON in many cases
const compressed = response.toBuffer();
```

### Stream Example (Node.js Only)

```javascript
import { Readable } from 'node:stream';
import { TLEncode, TLDecode } from '@andrew_l/tl-pack/stream';

const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const dataStream = new Readable({ objectMode: true });

dataStream._read = () => {
  const chunk = values.shift();

  dataStream.push(chunk || null);
};

const encode = new TLEncode();
const decode = new TLDecode();

dataStream.pipe(encode).pipe(decode);

decode.on('data', data => console.log('stream', data));
decode.on('error', console.error);
```

## Structure Features

### Version Management

Structures support versioning for backward compatibility:

```javascript
// Version 1
const UserV1 = defineStructure({
  name: 'User',
  version: 1,
  properties: {
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
});

// Version 2 - Added optional fields
const UserV2 = defineStructure({
  name: 'User',
  version: 2,
  properties: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    createdAt: { type: Date, required: false },
    isVerified: { type: Boolean, required: false },
  },
});

// Reading V1 data with V2 structure will fail with version mismatch
// This ensures data integrity across application updates
```

### Checksum Validation

Enable checksum validation for data integrity:

```javascript
const SecureData = defineStructure({
  name: 'SecureData',
  version: 1,
  checksum: true, // Enables automatic checksum validation
  properties: {
    sensitiveInfo: { type: String, required: true },
    timestamp: { type: Date, required: true },
  },
});

// Checksum is automatically calculated during serialization
// and validated during deserialization
```

## Supported Types

| Constructor ID | Byte Size          |
| -------------- | ------------------ |
| Binary         | 5 + sizeof(object) |
| BoolFalse      | 1                  |
| BoolTrue       | 1                  |
| Null           | 1                  |
| Date           | 4                  |
| Vector         | 5 + n \* sizeof(n) |
| VectorDynamic  | 2 + n \* sizeof(n) |
| Int8           | 1                  |
| Int16          | 2                  |
| Int32          | 4                  |
| UInt8          | 1                  |
| UInt16         | 2                  |
| UInt32         | 4                  |
| Float          | 4                  |
| Double         | 8                  |
| Map            | 2 + sizeof(object) |
| String         | 5 + sizeof(object) |
| Repeat         | 5                  |
| GZIP           | 5 + sizeof(object) |
| Structure      | 4 + sizeof(object) |

## Custom Types

You can extend tl-pack to handle custom types. For example, handling ObjectId from Mongoose:

```javascript
import mongoose from 'mongoose';
import { BinaryWriter, BinaryReader, createExtension } from '@andrew_l/tl-pack';

const ObjectId = mongoose.Types.ObjectId;

const extensions = [
  // Reserve token for ObjectId type
  createExtension(100, {
    encode(value) {
      if (value instanceof ObjectId) {
        this.writeBytes(value.id);
      }
    },
    decode() {
      const bytes = this.readBytes();

      if (IS_BROWSER) {
        return hex(bytes);
      }

      return new ObjectId(bytes);
    },
  }),
];

const writer = new BinaryWriter({ extensions });

writer.writeObject({
  _id: new ObjectId('64a2be105e19f67e19a71a1d'),
  firstName: 'Andrew',
  lastName: 'L.',
});

const reader = new BinaryReader(writer.getBuffer(), { extensions });

console.log(reader.readObject());
/**
{
  _id: 64a2be105e19f67e19a71a1d,
  firstName: 'Andrew',
  lastName: 'L.'
}
 */

const byteToHex: string[] = [];

for (let n = 0; n <= 0xff; ++n) {
  const hexOctet = n.toString(16).padStart(2, '0');
  byteToHex.push(hexOctet);
}

function hex(arrayBuffer: Uint8Array) {
  const buff = new Uint8Array(arrayBuffer);
  const hexOctets = new Array(buff.length);

  for (let i = 0; i < buff.length; ++i) {
    hexOctets[i] = byteToHex[buff[i]];
  }

  return hexOctets.join('');
}
```

## Dictionary Support

The dictionary helps optimize serialization by replacing strings with numeric indexes, saving buffer space.

- **Static Dictionary:** Pre-defined dictionary initialized when creating the BinaryWriter/BinaryReader.
- **Dynamic Dictionary:** Grows dynamically during encoding and decoding, especially useful for objects (Maps).

## Production

No way!

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@andrew_l/tl-pack?style=flat
[npm-version-href]: https://npmjs.com/package/@andrew_l/tl-pack
[bundle-src]: https://img.shields.io/bundlephobia/min/@andrew_l/tl-pack?style=flat
[bundle-href]: https://bundlephobia.com/result?p=@andrew_l/tl-pack
[license-src]: https://img.shields.io/npm/l/@andrew_l/tl-pack?style=flat
