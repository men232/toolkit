import { Structure, tlDecode, tlEncode } from '@andrew_l/tl-pack';
import {
  type Logger,
  assert,
  checkBitmask,
  crc32,
  logger,
  noop,
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

  structures?: Structure.Constructor[];
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

interface EntryHeader {
  opcode: number;
  flags: number;
  timestamp: number;
  dataLength: number;
  crc: number;
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
    this._options = {
      ...options,
      structures: options.structures ? [...options.structures] : [],
    };
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
  public init(): Promise<void> {
    return Promise.resolve()
      .then(() => fs.promises.mkdir(this._directory, { recursive: true }))
      .then(() => this.#findLatestBinlogFile());
  }

  /**
   * Find the latest binlog file to continue writing
   */
  #findLatestBinlogFile(): Promise<void> {
    return Promise.resolve()
      .then(() => fs.promises.readdir(this._directory))
      .then(files => {
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
      });
  }

  /**
   * Open the binlog for writing
   */
  public open(): Promise<void> {
    const filePath = path.join(this._directory, this.currentFileName);

    return Promise.resolve()
      .then(() => fs.promises.open(filePath, 'a+'))
      .then(fileDescription => {
        this._currentFileDescriptor = fileDescription;
        this._currentFile = filePath;

        return this._currentFileDescriptor.stat();
      })
      .then(fileStat => {
        this._currentFileSize = fileStat.size;
        this._isOpen = true;

        // Write the binlog header
        if (this._currentFileSize === 0) {
          return this.#writeBinlogHeader();
        } else {
          return this.#checkBinlogHeaders(this._currentFileDescriptor!).then(
            noop,
          );
        }
      });
  }

  /**
   * Close the current binlog file
   */
  public close(): Promise<void> {
    return Promise.resolve()
      .then(() => {
        if (!this._isOpen || !this._currentFileDescriptor) {
          return;
        }

        return this._currentFileDescriptor.close();
      })
      .then(() => {
        this._currentFileDescriptor = null;
        this._currentFile = null;
        this._isOpen = false;
      });
  }

  /**
   * Write a binlog entry
   * @param opcode - Operation code
   * @param data - Data to write
   * @returns Promise resolving to true if successful, false otherwise
   */
  public write(opcode: number, data: unknown): Promise<void> {
    let promise = Promise.resolve();

    if (!this._isOpen) {
      promise = promise.then(() => this.open());
    }

    // Check if we need to rotate the file
    return promise
      .then(() => {
        if (
          this._options.rotation &&
          this._currentFileSize >= this._options.maxFileSize
        ) {
          return this.rotate();
        }
      })
      .then(() => {
        assert.ok(this._currentFileDescriptor, 'File descriptor is null');

        let flags = this.BINLOG_FLAG.NONE;

        if (!Buffer.isBuffer(data)) {
          if (data instanceof Structure) {
            data = tlEncode(data);
            flags |= this.BINLOG_FLAG.TL;
          } else {
            data = tlEncode(data) as Buffer;
            flags |= this.BINLOG_FLAG.TL;
          }
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
          crc32(
            Buffer.concat([headerBuffer.subarray(0, 16), data as Buffer]),
          ) >>> 0,
          16,
        );

        // Write the entry
        return Promise.resolve()
          .then(() => this._currentFileDescriptor!.write(headerBuffer))
          .then(() => this._currentFileDescriptor!.write(data as Buffer))
          .then(() => {
            if (this._options.syncWrites) {
              return this._currentFileDescriptor!.sync();
            }
          })
          .then(() => {
            this._currentFileSize += totalLength;
          });
      });
  }

  /**
   * Rotate the binlog file
   */
  public rotate(): Promise<void> {
    return Promise.resolve()
      .then(() => this.close())
      .then(() => {
        this._currentFileIndex++;
        return this.open();
      });
  }

  /**
   * Write the binlog header
   */
  #writeBinlogHeader(): Promise<void> {
    assert.ok(this._currentFileDescriptor, 'File descriptor is null');

    const headerBuffer = Buffer.allocUnsafe(this.BINLOG_HEADER_SIZE);

    headerBuffer.writeUInt32LE(this.BINLOG_MAGIC, 0);
    headerBuffer.writeUInt32LE(this.BINLOG_VERSION, 4);
    headerBuffer.writeUInt32LE(timestamp(), 8);
    headerBuffer.writeUInt32LE(0, 12); // Reserved field

    return Promise.resolve()
      .then(() => this._currentFileDescriptor!.write(headerBuffer))
      .then(() => {
        this._currentFileSize += headerBuffer.length;

        if (this._options.syncWrites) {
          return this._currentFileDescriptor!.sync();
        }
      });
  }

  /**
   * Read and parse all entries from a binlog file
   * @param filename - Binlog file to read
   * @param unsafe - Ignore broken binlog records otherwise throws error
   * @returns Array of parsed entries
   */
  public readEntries<TData = Buffer>(
    filename: string,
    unsafe?: boolean,
  ): Promise<BinlogEntry<TData>[]> {
    var filepath = path.join(this._directory, filename);
    var fileHandle: fs.promises.FileHandle;
    var entries: BinlogEntry<TData>[] = [];

    return fs.promises
      .open(filepath, 'r')
      .then(_fileHandle => {
        fileHandle = _fileHandle;
        return this.#checkBinlogHeaders(fileHandle);
      })
      .then(isValidHeader => {
        if (!isValidHeader) {
          if (unsafe) {
            this._log.warn('Invalid binlog file format: ' + filename);
            return;
          }
          return Promise.reject(
            new Error('Invalid binlog file format:\n' + filepath),
          );
        }

        return fileHandle.stat();
      })
      .then(stats => {
        if (!stats) return;

        var contentSize = stats.size - this.BINLOG_HEADER_SIZE;
        var position = this.BINLOG_HEADER_SIZE;
        var headerBuffer = Buffer.allocUnsafe(this.BINLOG_ENTRY_HEADER_SIZE);

        return new Promise<void>((resolve, reject) => {
          var processNextBatch = () => {
            if (position >= contentSize) {
              return resolve();
            }

            fileHandle
              .read(headerBuffer, 0, this.BINLOG_ENTRY_HEADER_SIZE, position)
              .then(() => {
                var header = this.#readEntryHeader(headerBuffer, position);
                var dataBuffer = Buffer.allocUnsafe(header.dataLength);

                position += this.BINLOG_ENTRY_HEADER_SIZE;

                return fileHandle
                  .read(dataBuffer, 0, header.dataLength, position)
                  .then(() => {
                    var entry = this.#readEntry(
                      headerBuffer,
                      header,
                      dataBuffer.subarray(0, header.dataLength),
                    );

                    if (!entry) {
                      if (!unsafe) {
                        return Promise.reject(
                          new Error(
                            `CRC mismatch at position ${position - this.BINLOG_ENTRY_HEADER_SIZE}`,
                          ),
                        );
                      } else {
                        this._log.warn(
                          `CRC mismatch at position ${position - this.BINLOG_ENTRY_HEADER_SIZE}`,
                        );
                      }
                    } else {
                      entries.push(entry);
                    }

                    position += header.dataLength;
                  })
                  .then(() => processNextBatch())
                  .catch(reject);
              });
          };

          processNextBatch();
        });
      })
      .then(() => fileHandle?.close())
      .then(() => entries)
      .catch(error => {
        return fileHandle.close().then(() => Promise.reject(error));
      });
  }

  #readEntryHeader(buffer: Buffer, position: number): EntryHeader {
    return {
      opcode: buffer.readUInt32LE(0),
      flags: buffer.readUInt32LE(4),
      timestamp: buffer.readUInt32LE(8),
      dataLength: buffer.readUInt32LE(12),
      crc: buffer.readUInt32LE(16),
      position,
    };
  }

  #readEntry(
    headerBuffer: Buffer,
    header: EntryHeader,
    dataBuffer: Buffer,
  ): BinlogEntry<any> | null {
    // Verify CRC
    var crc = crc32([headerBuffer.subarray(0, 16), dataBuffer]) >>> 0;

    if (crc !== header.crc) {
      return null;
    }

    var data: any;

    if (checkBitmask(header.flags, this.BINLOG_FLAG.TL)) {
      data = tlDecode(dataBuffer, {
        structures: this._options.structures,
      });
    } else {
      // Make copy
      data = Buffer.from(dataBuffer);
    }

    return {
      opcode: header.opcode,
      timestamp: header.timestamp,
      data: data,
      position: header.position,
    };
  }

  #checkBinlogHeaders(fileHandle: fs.promises.FileHandle): Promise<boolean> {
    var headerBuffer = Buffer.allocUnsafe(this.BINLOG_HEADER_SIZE);

    return Promise.resolve()
      .then(() => fileHandle.read(headerBuffer, 0, this.BINLOG_HEADER_SIZE, 0))
      .then(() => {
        var magic = headerBuffer.readUInt32LE(0);
        var version = headerBuffer.readUInt32LE(4);

        return magic === this.BINLOG_MAGIC && version === this.BINLOG_VERSION;
      });
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
