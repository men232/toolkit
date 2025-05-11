# Binlog

![license](https://img.shields.io/npm/l/%40andrew_l%2Fbinlog) <!-- omit in toc -->
![npm version](https://img.shields.io/npm/v/%40andrew_l%2Fbinlog) <!-- omit in toc -->
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40andrew_l%2Fbinlog) <!-- omit in toc -->

A high-performance binary logging system for Node.js applications, inspired by VK's KPHP KDB binlog implementation. This library provides a robust, efficient way to record and replay binary log entries with integrity checking and rotation support.

## 📋 Features

- **Automatic log rotation** based on file size
- **TL serialization** integration for complex data types
- **Data integrity** verification via CRC32 checksums
- **File system sync control** for durability vs performance tradeoffs

<!-- install placeholder -->

## 🔧 Usage

### Basic Example

```typescript
import { createBinlog } from '@andrew_l/binlog';

async function main() {
  // Create a binlog with default options
  const binlog = createBinlog({
    path: './logs/app-{index}.bin',
  });

  // Initialize binlog system
  await binlog.init();

  // Open the binlog for writing
  await binlog.open();

  // Write entries with various opcodes and data
  await binlog.write(1, { message: 'Application started' });
  await binlog.write(2, { user: 'john', action: 'login' });

  // Close the binlog when done
  await binlog.close();
}

main().catch(console.error);
```

### Reading Binlog Entries

```typescript
import { createBinlog } from '@andrew_l/binlog';

async function readLogs() {
  const binlog = createBinlog({
    path: './logs/app-{index}.bin',
  });

  await binlog.init();

  // Read entries from a specific binlog file
  const entries = await binlog.readEntries<{
    message?: string;
    user?: string;
    action?: string;
  }>('app-0.bin');

  // Process entries
  for (const entry of entries) {
    console.log(
      `[${new Date(entry.timestamp * 1000).toISOString()}] Op: ${entry.opcode}`,
    );
    console.log(entry.data);
  }
}

readLogs().catch(console.error);
```

### Configuration Options

```typescript
import { createBinlog } from '@andrew_l/binlog';

const binlog = createBinlog({
  // File path pattern with {index} placeholder for rotation
  path: './logs/application-{index}.bin',

  // Maximum file size before rotation (100MB)
  maxFileSize: 104857600,

  // Enable/disable log rotation
  rotation: true,

  // Control synchronous writes for durability
  syncWrites: true,
});
```

## ⚙️ API Reference

#### Methods

- **`async init(): Promise<void>`**  
  Initialize the binlog system, ensuring directory exists and pick most recent binlog file.

- **`async open(): Promise<void>`**  
  Open the binlog for writing.

- **`async close(): Promise<void>`**  
  Close the current binlog file.

- **`async write(opcode: number, data: unknown): Promise<void>`**  
  Write a binlog entry with the specified opcode and data.

- **`async rotate(): Promise<void>`**  
  Rotate the binlog file to a new one.

- **`async readEntries<TData = Buffer>(filename: string, unsafe?: boolean): Promise<BinlogEntry<TData>[]>`**  
  Read and parse all entries from a binlog file.

#### Properties

- **`currentFileIndex: number`**  
  Get the current binlog file index.

- **`currentFileName: string`**  
  Get current binlog file name.

- **`directory: string`**  
  Get current binlog directory.

## 🛡️ Binlog File Format

Each binlog file has:

- **File Header** (16 bytes)

  - Magic number (4 bytes): 0x4442544B
  - Version (4 bytes): Currently 1
  - Timestamp (4 bytes)
  - Reserved (4 bytes)

- **Entry Headers** (20 bytes each)

  - Operation code (4 bytes)
  - Flags (4 bytes)
  - Timestamp (4 bytes)
  - Data length (4 bytes)
  - CRC32 checksum (4 bytes)

- **Entry Data** (variable length)
  - Raw binary data or TL-encoded data

## 🔄 Integration with TL-Pack

Binlog automatically uses TL serialization for non-Buffer data types using the `@andrew_l/tl-pack` library. This allows for efficient serialization of complex JavaScript objects.

```typescript
// Data will be automatically TL-encoded
await binlog.write(1, {
  user: 'alice',
  permissions: ['read', 'write'],
  metadata: {
    lastLogin: new Date(),
    requestCount: 42,
  },
});
```

## 📝 License

MIT
