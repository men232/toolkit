import { tlDecode, tlEncode } from '@andrew_l/tl-pack';
import {
  type Logger,
  assert,
  checkBitmask,
  crc32,
  deepClone,
  logger,
  timestamp,
} from '@andrew_l/toolkit';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Options for configuring the KdbBinlog
 */
export interface BinlogOptions {
  /**
   * File location to store binlog files
   * @default './binlogs/log-{index}.bin'
   */
  path: string;

  /**
   * Maximum size of each binlog file before rotation (in bytes)
   * @default 104857600
   */
  maxFileSize: number;

  /**
   * Whether to enable log rotation
   * @default true
   */
  rotation: boolean;

  /**
   * Whether to sync writes to disk immediately
   * @default true
   */
  syncWrites: boolean;
}

/**
 * Represents a single binlog entry
 */
export interface BinlogEntry<TData = Buffer> {
  /**
   * Operation code defining the type of operation
   */
  opcode: number;

  /**
   * Unix timestamp when the entry was created
   */
  timestamp: number;

  /**
   * Binary data of the entry
   */
  data: TData | Buffer;

  /**
   * Position in the file where this entry starts
   */
  position: number;
}

/**
 * TypeScript implementation of binlog system
 * Adapted from https://github.com/vk-com/kphp-kdb/blob/master/binlog/kdb-binlog-common.c
 * @group Main
 */
export class Binlog {
  private _options: Required<BinlogOptions>;
  private _filePattern: string;
  private _directory: string;
  private _currentFile: string | null;
  private _currentFileDescriptor: fs.promises.FileHandle | null;
  private _currentFileSize: number;
  private _currentFileIndex: number;
  private _isOpen: boolean;
  private _log: Logger;

  private readonly BINLOG_MAGIC: number = 0x4442544b;
  private readonly BINLOG_VERSION: number = 1;
  private readonly BINLOG_HEADER_SIZE: number = 16;
  private readonly BINLOG_ENTRY_HEADER_SIZE: number = 20;
  private readonly BINLOG_FLAG = Object.freeze({
    NONE: 0,
    TL: 1 << 0,
  } as const);

  constructor(options: BinlogOptions) {
    this._log = logger('Binlog');
    this._options = deepClone(options);
    this._filePattern = path.basename(options.path);
    this._directory = path.dirname(options.path);
    this._currentFile = null;
    this._currentFileDescriptor = null;
    this._currentFileSize = 0;
    this._currentFileIndex = 0;
    this._isOpen = false;
  }

  /**
   * Initialize the binlog system, ensuring directory exists and pick most recent binlog file
   * @returns Promise resolving to true if successful, false otherwise
   */
  public async init(): Promise<void> {
    await fs.promises.mkdir(this._directory, { recursive: true });
    await this.#findLatestBinlogFile();
  }

  /**
   * Find the latest binlog file to continue writing
   */
  async #findLatestBinlogFile(): Promise<void> {
    const files = await fs.promises.readdir(this._directory);
    const fileRegEx = filePatternToRegex(this._filePattern);

    this._currentFileIndex = 0;

    for (const fileName of files) {
      const match = fileName.match(fileRegEx);

      if (match) {
        this._currentFileIndex = Math.max(
          this._currentFileIndex,
          parseInt(match[1], 10),
        );
      }
    }
  }

  /**
   * Open the binlog for writing
   */
  public async open(): Promise<void> {
    const filePath = path.join(this._directory, this.currentFileName);

    this._currentFileDescriptor = await fs.promises.open(filePath, 'a+');
    this._currentFile = filePath;
    this._currentFileSize = (await this._currentFileDescriptor.stat()).size;
    this._isOpen = true;

    // Write the binlog header
    if (this._currentFileSize === 0) {
      await this.#writeBinlogHeader();
    } else {
      await this.#checkBinlogHeaders(this._currentFileDescriptor);
    }
  }

  /**
   * Close the current binlog file
   */
  public async close(): Promise<void> {
    if (!this._isOpen || !this._currentFileDescriptor) return;

    // Write footer
    await this._currentFileDescriptor.close();

    this._currentFileDescriptor = null;
    this._currentFile = null;
    this._isOpen = false;
  }

  /**
   * Write a binlog entry
   * @param opcode - Operation code
   * @param data - Data to write
   * @returns Promise resolving to true if successful, false otherwise
   */
  public async write(opcode: number, data: unknown): Promise<void> {
    if (!this._isOpen) {
      await this.open();
    }

    // Check if we need to rotate the file
    if (
      this._options.rotation &&
      this._currentFileSize >= this._options.maxFileSize
    ) {
      await this.rotate();
    }

    assert.ok(this._currentFileDescriptor, 'File descriptor is null');

    let flags = this.BINLOG_FLAG.NONE;

    if (!Buffer.isBuffer(data)) {
      data = tlEncode(data) as Buffer;
      flags |= this.BINLOG_FLAG.TL;
    }

    // Create entry header
    const dataLength = (data as Buffer).length;
    const totalLength = this.BINLOG_ENTRY_HEADER_SIZE + dataLength;

    const headerBuffer = Buffer.allocUnsafe(this.BINLOG_ENTRY_HEADER_SIZE);
    headerBuffer.writeUInt32LE(opcode, 0);
    headerBuffer.writeUInt32LE(flags, 4);
    headerBuffer.writeUInt32LE(timestamp(), 8);
    headerBuffer.writeUInt32LE(dataLength, 12);

    headerBuffer.writeUInt32LE(
      crc32(Buffer.concat([headerBuffer.subarray(0, 16), data as Buffer])) >>>
        0,
      16,
    );

    // Write the entry
    await this._currentFileDescriptor.write(headerBuffer);
    await this._currentFileDescriptor.write(data as Buffer);

    if (this._options.syncWrites) {
      await this._currentFileDescriptor.sync();
    }

    this._currentFileSize += totalLength;
  }

  /**
   * Rotate the binlog file
   */
  public async rotate(): Promise<void> {
    await this.close();
    this._currentFileIndex++;
    await this.open();
  }

  /**
   * Write the binlog header
   */
  async #writeBinlogHeader(): Promise<void> {
    assert.ok(this._currentFileDescriptor, 'File descriptor is null');

    const headerBuffer = Buffer.allocUnsafe(this.BINLOG_HEADER_SIZE);

    headerBuffer.writeUInt32LE(this.BINLOG_MAGIC, 0);
    headerBuffer.writeUInt32LE(this.BINLOG_VERSION, 4);
    headerBuffer.writeUInt32LE(timestamp(), 8);
    headerBuffer.writeUInt32LE(0, 12); // Reserved field

    await this._currentFileDescriptor.write(headerBuffer);
    this._currentFileSize += headerBuffer.length;

    if (this._options.syncWrites) {
      await this._currentFileDescriptor.sync();
    }
  }

  /**
   * Read and parse all entries from a binlog file
   * @param filename - Binlog file to read
   * @param unsafe - Ignore broken binlog records otherwise throws error
   * @returns Array of parsed entries
   */
  public async readEntries<TData = Buffer>(
    filename: string,
    unsafe?: boolean,
  ): Promise<BinlogEntry<TData>[]> {
    const filepath = path.join(this._directory, filename);
    const fileHandle = await fs.promises.open(filepath, 'r');

    if (!(await this.#checkBinlogHeaders(fileHandle))) {
      if (unsafe) {
        this._log.warn('Invalid binlog file format: ' + filename);
        return [];
      }

      throw new Error('Invalid binlog file format:\n' + filepath);
    }

    const contentSize =
      (await fileHandle.stat()).size - this.BINLOG_HEADER_SIZE;

    let position = this.BINLOG_HEADER_SIZE;

    const entries: BinlogEntry<TData>[] = [];

    // Read entries until we reach the end or footer
    while (position < contentSize) {
      const entryHeaderBuffer = Buffer.allocUnsafe(
        this.BINLOG_ENTRY_HEADER_SIZE,
      );
      await fileHandle.read(
        entryHeaderBuffer,
        0,
        this.BINLOG_ENTRY_HEADER_SIZE,
        position,
      );

      const opcode = entryHeaderBuffer.readUInt32LE(0);
      const flags = entryHeaderBuffer.readUInt32LE(4);
      const timestamp = entryHeaderBuffer.readUInt32LE(8);
      const dataLength = entryHeaderBuffer.readUInt32LE(12);
      const crc = entryHeaderBuffer.readUInt32LE(16);

      position += this.BINLOG_ENTRY_HEADER_SIZE;

      // Read data
      let data = Buffer.allocUnsafe(dataLength);

      await fileHandle.read(data, 0, dataLength, position);

      // Verify CRC
      const calculatedCrc =
        crc32(Buffer.concat([entryHeaderBuffer.subarray(0, 16), data])) >>> 0;

      if (calculatedCrc === crc) {
        if (checkBitmask(flags, this.BINLOG_FLAG.TL)) {
          data = tlDecode(data);
        }

        entries.push({
          opcode,
          timestamp,
          data: data,
          position: position - this.BINLOG_ENTRY_HEADER_SIZE,
        });
      } else if (!unsafe) {
        throw new Error(
          `CRC mismatch at position ${position - this.BINLOG_ENTRY_HEADER_SIZE}`,
        );
      } else {
        this._log.warn(
          `CRC mismatch at position ${position - this.BINLOG_ENTRY_HEADER_SIZE}`,
        );
      }

      position += dataLength;
    }

    // Close file
    await fileHandle.close();

    return entries;
  }

  async #checkBinlogHeaders(
    fileHandle: fs.promises.FileHandle,
  ): Promise<boolean> {
    const headerBuffer = Buffer.allocUnsafe(this.BINLOG_HEADER_SIZE);
    await fileHandle.read(headerBuffer, 0, this.BINLOG_HEADER_SIZE, 0);

    const magic = headerBuffer.readUInt32LE(0);
    const version = headerBuffer.readUInt32LE(4);

    return magic === this.BINLOG_MAGIC && version === this.BINLOG_VERSION;
  }

  /**
   * Get the current binlog file index
   */
  get currentFileIndex(): number {
    return this._currentFileIndex;
  }

  /**
   * Get current binlog file name
   */
  get currentFileName(): string {
    return this._filePattern.replaceAll(
      '{index}',
      String(this._currentFileIndex),
    );
  }

  /**
   * Get current binlog directory
   */
  get directory(): string {
    return this._directory;
  }
}

function filePatternToRegex(value: string): RegExp {
  return new RegExp(value.replaceAll('{index}', '(\\d+)'));
}
