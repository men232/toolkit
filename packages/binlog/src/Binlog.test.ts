import fs from 'node:fs';
import * as path from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createBinlog } from './index.js';

// Test directory for binlog files
const TEST_DIR = path.join(__dirname, 'test-binlogs');

// Helper function to clean up test directory
async function cleanTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    // Read all files in the test directory
    const files = await fs.promises.readdir(TEST_DIR);

    // Delete each file
    for (const file of files) {
      await fs.promises.unlink(path.join(TEST_DIR, file));
    }

    // Remove the directory
    await fs.promises.rmdir(TEST_DIR);
  }
}

describe('Binlog', () => {
  beforeAll(async () => {
    // Create clean test environment
    await cleanTestDir();
  });

  afterAll(async () => {
    // Clean up after all tests
    await cleanTestDir();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize successfully', async () => {
    const binlog = createBinlog({ path: `${TEST_DIR}/log-{index}.bin` });
    await binlog.init();

    expect(fs.existsSync(TEST_DIR)).toBe(true);
  });

  it('should create a createBinlog file when opening', async () => {
    const binlog = createBinlog({
      path: `${TEST_DIR}/test-binlog.{index}`,
    });

    await binlog.init();
    await binlog.open();

    // Check if binlog file was created
    const files = await fs.promises.readdir(TEST_DIR);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^test-binlog\.\d+$/);

    await binlog.close();
  });

  it('should write data to binlog file', async () => {
    const binlog = createBinlog({
      path: `${TEST_DIR}/write-test.{index}`,
    });

    await binlog.init();

    // Write test data
    await binlog.write(1, Buffer.from('test data'));
    await binlog.close();

    // Verify file exists with content
    const files = await fs.promises.readdir(TEST_DIR);
    const binlogFile = files.find(f => f.startsWith('write-test'));
    expect(binlogFile).toBeDefined();

    const stats = await fs.promises.stat(path.join(TEST_DIR, binlogFile!));
    expect(stats.size).toBeGreaterThan(0);
  });

  it('should rotate binlog file when it exceeds max size', async () => {
    const MAX_SIZE = 100; // Very small max size to force rotation
    const binlog = createBinlog({
      path: `${TEST_DIR}/rotation-test.{index}`,
      maxFileSize: MAX_SIZE,
    });

    await binlog.init();

    // Create a large buffer that will exceed the max size
    const largeData = Buffer.alloc(MAX_SIZE);

    // Write once to create first file
    await binlog.write(1, largeData);
    const firstIndex = binlog.currentFileIndex;

    // Write again to trigger rotation
    await binlog.write(1, largeData);
    const secondIndex = binlog.currentFileIndex;

    expect(secondIndex).toBeGreaterThan(firstIndex);

    // Verify two files exist
    const files = await fs.promises.readdir(TEST_DIR);
    const rotationFiles = files.filter(f => f.startsWith('rotation-test'));
    expect(rotationFiles.length).toBe(2);

    await binlog.close();
  });

  it('should read entries from binlog file', async () => {
    const binlog = createBinlog({
      path: `${TEST_DIR}/read-test.{index}`,
    });

    await binlog.init();

    // Write multiple entries
    const data1 = Buffer.from(
      JSON.stringify({ key: 'test1', value: 'value1' }),
    );
    const data2 = Buffer.from(
      JSON.stringify({ key: 'test2', value: 'value2' }),
    );

    await binlog.write(1, data1); // Write operation 1
    await binlog.write(2, data2); // Write operation 2

    await binlog.close();

    // Read entries back
    const filename = `read-test.${binlog.currentFileIndex}`;
    const entries = await binlog.readEntries(filename);

    expect(entries.length).toBe(2);

    // Check first entry
    expect(entries[0].opcode).toBe(1);
    const entry1Data = JSON.parse(entries[0].data.toString());
    expect(entry1Data.key).toBe('test1');
    expect(entry1Data.value).toBe('value1');

    // Check second entry
    expect(entries[1].opcode).toBe(2);
    const entry2Data = JSON.parse(entries[1].data.toString());
    expect(entry2Data.key).toBe('test2');
    expect(entry2Data.value).toBe('value2');
  });

  it('should detect invalid binlog files', async () => {
    // Create an invalid file
    await fs.promises.mkdir(TEST_DIR, { recursive: true });
    const invalidPath = path.join(TEST_DIR, 'invalid-binlog.1');
    await fs.promises.writeFile(invalidPath, 'not a valid binlog file');

    const binlog = createBinlog({
      path: `${TEST_DIR}/invalid-binlog.{index}`,
    });

    await binlog.init();

    // Try to read invalid file
    await expect(binlog.readEntries('invalid-binlog.1')).rejects.toThrowError(
      'Invalid binlog file format',
    );
  });

  it('should handle reopening a closed binlog', async () => {
    const binlog = createBinlog({
      path: `${TEST_DIR}/reopen-test.{index}`,
    });

    await binlog.init();
    await binlog.open();

    // Write data
    const testData = Buffer.from('first write');
    await binlog.write(1, testData);

    // Close binlog
    await binlog.close();

    // Reopen and write more data
    const moreData = Buffer.from('second write');
    await binlog.write(2, moreData);

    // Close again
    await binlog.close();

    // Read entries
    const filename = `reopen-test.${binlog.currentFileIndex}`;
    const entries = await binlog.readEntries(filename);

    expect(entries.length).toBe(2);
    expect(entries[0].opcode).toBe(1);
    expect(entries[1].opcode).toBe(2);

    // Check data content
    expect(entries[0].data.toString()).toBe('first write');
    expect(entries[1].data.toString()).toBe('second write');
  });

  it('should handle multiple file rotation cycles', async () => {
    const SMALL_MAX_SIZE = 200; // Very small to force multiple rotations
    const binlog = createBinlog({
      path: `${TEST_DIR}/multi-rotation.{index}`,
      maxFileSize: SMALL_MAX_SIZE,
    });

    await binlog.init();

    // Create data that will force rotation after each write
    const data = Buffer.alloc(168); // Large enough to trigger rotation

    // Write multiple times to force several rotations
    for (let i = 0; i < 5; i++) {
      await binlog.write(i, data);
    }

    await binlog.close();

    // Check number of files created
    const files = await fs.promises.readdir(TEST_DIR);
    const rotationFiles = files.filter(f => f.startsWith('multi-rotation'));

    expect(rotationFiles.length).toBe(5);

    // Verify each file exists and has content
    for (let i = 0; i < 5; i++) {
      const fileExists = rotationFiles.includes(`multi-rotation.${i}`);
      expect(fileExists).toBe(true);

      const stats = await fs.promises.stat(
        path.join(TEST_DIR, `multi-rotation.${i}`),
      );
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  it('should correctly sync writes when enabled', async () => {
    const binlog = createBinlog({
      path: `${TEST_DIR}/sync-test.{index}`,
      syncWrites: true,
    });

    // Spy on the file descriptor sync method
    const syncSpy = vi.fn().mockResolvedValue(undefined);

    // Mock the file descriptor
    vi.spyOn(fs.promises, 'open').mockImplementation(async () => {
      return {
        write: async () => ({ bytesWritten: 10, buffer: Buffer.alloc(10) }),
        close: async () => {},
        stat: async () => ({ size: 100 }) as fs.Stats,
        sync: syncSpy,
        read: async () => ({ bytesRead: 10, buffer: Buffer.alloc(10) }),
      } as unknown as fs.promises.FileHandle;
    });

    await binlog.init();
    await binlog.write(1, Buffer.from('test data'));

    // Verify sync was called
    expect(syncSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('should not sync writes when disabled', async () => {
    const binlog = createBinlog({
      path: `${TEST_DIR}/no-sync-test.{index}`,
      syncWrites: false,
    });

    // Spy on the file descriptor sync method
    const syncSpy = vi.fn().mockResolvedValue(undefined);

    // Mock the file descriptor
    vi.spyOn(fs.promises, 'open').mockImplementation(async () => {
      return {
        write: async () => ({ bytesWritten: 10, buffer: Buffer.alloc(10) }),
        close: async () => {},
        stat: async () => ({ size: 100 }) as fs.Stats,
        sync: syncSpy,
        read: async () => ({ bytesRead: 10, buffer: Buffer.alloc(10) }),
      } as unknown as fs.promises.FileHandle;
    });

    await binlog.init();

    // Override the syncWrites option
    binlog['_options'].syncWrites = false;

    await binlog.write(1, Buffer.from('test data'));

    // Verify sync was not called
    expect(syncSpy).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  it('should handle empty directory for finding latest binlog', async () => {
    // Create a new empty directory
    const EMPTY_DIR = path.join(__dirname, 'empty-dir');
    await fs.promises.mkdir(EMPTY_DIR, { recursive: true });

    const binlog = createBinlog({
      path: `${EMPTY_DIR}/log.{index}`,
    });

    await binlog.init();
    expect(binlog.currentFileIndex).toBe(0);

    // Clean up
    await fs.promises.rmdir(EMPTY_DIR);
  });

  // Optional integration tests that actually create and read files
  // These tests are more thorough but slower
  describe('Binlog Integration', () => {
    beforeAll(async () => {
      // Create clean test environment
      await cleanTestDir();
    });

    afterAll(async () => {
      // Clean up after all tests
      await cleanTestDir();
    });

    it('should write/read with tl-pack', async () => {
      const binlog = createBinlog({
        path: `${TEST_DIR}/tl-pack-test.{index}`,
      });

      const ts = new Date();

      await binlog.init();
      await binlog.write(3, { ts });

      const entries = await binlog.readEntries(binlog.currentFileName);

      expect(entries[0].data).toStrictEqual({ ts });
    });

    it('should write and read a large number of entries', async () => {
      const binlog = createBinlog({
        path: `${TEST_DIR}/integration-test.{index}`,
      });

      await binlog.init();

      // Write a significant number of entries
      const numEntries = 100;
      for (let i = 0; i < numEntries; i++) {
        const data = Buffer.from(
          JSON.stringify({
            index: i,
            value: `test value ${i}`,
            timestamp: Date.now(),
          }),
        );

        await binlog.write(i % 5, data); // Use different opcodes
      }

      await binlog.close();

      // Read all entries back
      const filename = `integration-test.${binlog.currentFileIndex}`;
      const entries = await binlog.readEntries(filename);

      expect(entries.length).toBe(numEntries);

      // Verify each entry
      for (let i = 0; i < numEntries; i++) {
        const entry = entries[i];
        expect(entry.opcode).toBe(i % 5);

        const data = JSON.parse(entry.data.toString());
        expect(data.index).toBe(i);
        expect(data.value).toBe(`test value ${i}`);
      }
    });

    it('should restore state from existing binlog files', async () => {
      // First create some binlog files
      const binlog1 = createBinlog({
        path: `${TEST_DIR}/restore-test.{index}`,
      });

      await binlog1.init();

      // Create 3 files through rotation
      for (let i = 0; i < 3; i++) {
        await binlog1.write(1, Buffer.from(`file ${i + 1}`));
        await binlog1.rotate();
      }

      // Now create a new instance that should detect the existing files
      const binlog2 = createBinlog({
        path: `${TEST_DIR}/restore-test.{index}`,
      });

      await binlog2.init();

      // The new instance should know the latest file index
      expect(binlog2.currentFileIndex).toBe(3);

      // Writing should create file 4
      await binlog2.write(1, Buffer.from('file 4'));
      await binlog2.close();

      // Check the files in the directory
      const files = await fs.promises.readdir(TEST_DIR);
      const testFiles = files.filter(f => f.startsWith('restore-test.'));

      expect(testFiles.length).toBe(4);
      expect(testFiles).toContain('restore-test.0');
      expect(testFiles).toContain('restore-test.1');
      expect(testFiles).toContain('restore-test.2');
      expect(testFiles).toContain('restore-test.3');
    });
  });
});
