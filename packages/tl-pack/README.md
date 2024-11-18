# TL Pack - Binary Serialization Library <!-- omit in toc -->

![license](https://img.shields.io/npm/l/%40andrew_l%2Ftl-pack) <!-- omit in toc -->
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Ftl-pack) <!-- omit in toc -->
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Ftl-pack) <!-- omit in toc -->

Binary serialization library, inspired by the TL (Type Language) format, created by the VK team. Unlike official TL, this version does not require a schema for serialization/deserialization. It provides a compact and fast alternative to other binary serialization formats like MessagePack.

⚡ **Benchmark**: Slightly faster and more compact than **@msgpack/msgpack**  
⚠️ **Note**: Benchmark claims may vary.

<!-- install placeholder -->

## ✨ Features

- **No Schema Required**: Unlike traditional serialization formats, this version does not require a predefined schema for object serialization.
- **Compact & Fast**: Designed to be lightweight and fast, with smaller binary output.
- **Custom Extension Support**: Easily extend serialization to custom types.
- **Stream Support**: Supports streaming serialization/deserialization in Node.js.

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
