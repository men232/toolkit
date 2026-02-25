import { describe, expect, it } from 'vitest';
import { bitPack } from '../bitPack';
import { bitUnpack } from './bitUnpack';

describe('BitUnpack', () => {
  describe('Basic functionality', () => {
    it('should unpack single field from number', () => {
      const fn = bitUnpack({
        totalBits: 32,
        fields: [{ name: 'value', bits: 16 }],
      });

      // 0x1234 shifted to top 16 bits = 0x12340000
      const result = fn.number(0x12340000);

      expect(result.value).toBe(0x1234);
    });

    it('should unpack single field from bigint', () => {
      const fn = bitUnpack({
        totalBits: 32,
        fields: [{ name: 'value', bits: 32 }],
      });

      const result = fn.bigint(0x12345678n);

      expect(result.value).toBe(0x12345678);
    });

    it('should unpack single field from bits string', () => {
      const fn = bitUnpack({
        totalBits: 8,
        fields: [{ name: 'value', bits: 8 }],
      });

      const result = fn.bits('11110111');

      expect(result.value).toBe(247);
    });

    it('should unpack single field from buffer', () => {
      const fn = bitUnpack({
        totalBits: 32,
        fields: [{ name: 'value', bits: 32 }],
      });

      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const result = fn.buffer(buffer);

      expect(result.value).toBe(0x12345678);
    });

    it('should unpack multiple small fields', () => {
      const fn = bitUnpack({
        totalBits: 32,
        fields: [
          { name: 'a', bits: 8 },
          { name: 'b', bits: 8 },
          { name: 'c', bits: 16 },
        ],
      });

      // Layout: [a:8][b:8][c:16] = [0xAA][0xBB][0xCCDD]
      const result = fn.bits('10101010101110111100110011011101');

      expect(result.a).toBe(0xaa);
      expect(result.b).toBe(0xbb);
      expect(result.c).toBe(0xccdd);
    });

    it('should create a bitUnpack with simple fields', () => {
      const unpacker = bitUnpack({
        totalBits: 8,
        fields: [
          { name: 'a', bits: 4 },
          { name: 'b', bits: 4 },
        ],
      });

      expect(unpacker).toHaveProperty('buffer');
      expect(unpacker).toHaveProperty('number');
      expect(unpacker).toHaveProperty('bigint');
      expect(unpacker).toHaveProperty('bits');
      expect(typeof unpacker.buffer).toBe('function');
      expect(typeof unpacker.number).toBe('function');
      expect(typeof unpacker.bigint).toBe('function');
      expect(typeof unpacker.bits).toBe('function');
    });

    it('should unpack data correctly from number', () => {
      const unpacker = bitUnpack({
        totalBits: 8,
        fields: [
          { name: 'a', bits: 4 },
          { name: 'b', bits: 4 },
        ],
      });

      // 247 = 11110111 = a:1111(15) b:0111(7)
      const result = unpacker.number(247);

      expect(result.a).toBe(15);
      expect(result.b).toBe(7);
    });

    it('should unpack data correctly from bigint', () => {
      const unpacker = bitUnpack({
        totalBits: 8,
        fields: [
          { name: 'a', bits: 4 },
          { name: 'b', bits: 4 },
        ],
      });

      const result = unpacker.bigint(247n);

      expect(result.a).toBe(15);
      expect(result.b).toBe(7);
    });

    it('should unpack data correctly from bits string', () => {
      const unpacker = bitUnpack({
        totalBits: 8,
        fields: [
          { name: 'a', bits: 4 },
          { name: 'b', bits: 4 },
        ],
      });

      const result = unpacker.bits('11110111');

      expect(result.a).toBe(15);
      expect(result.b).toBe(7);
    });
  });

  describe('Multiple containers', () => {
    it('should handle fields in multiple 32-bit containers', () => {
      const unpacker = bitUnpack({
        totalBits: 64,
        fields: [
          { name: 'a', bits: 32 },
          { name: 'b', bits: 32 },
        ],
        debug: true,
      });

      const result = unpacker.bigint(0xffffffff12345678n);

      expect(result).toEqual({
        a: 0xffffffff,
        b: 0x12345678,
      });
    });

    it('should handle fields that span across container boundaries', () => {
      const unpacker = bitUnpack({
        totalBits: 64,
        fields: [
          { name: 'prefix', bits: 16 },
          { name: 'spanning', bits: 32 },
          { name: 'suffix', bits: 16 },
        ],
      });

      const packer = bitPack({
        totalBits: 64,
        fields: [
          { name: 'prefix', bits: 16, take: 'low' },
          { name: 'spanning', bits: 32, take: 'low' },
          { name: 'suffix', bits: 16, take: 'low' },
        ],
      });

      const packed = packer.bigint({
        prefix: 0x1234,
        spanning: 0x56789abc,
        suffix: 0xdef0,
      });

      const result = unpacker.bigint(packed);

      expect(result.prefix).toBe(0x1234);
      expect(result.spanning).toBe(0x56789abc);
      expect(result.suffix).toBe(0xdef0);
    });
  });

  describe('Large fields (> 32 bits)', () => {
    it('should handle fields with more than 32 bits', () => {
      const unpacker = bitUnpack({
        totalBits: 48,
        fields: [{ name: 'a', bits: 48 }],
        debug: true,
      });

      const largeValue = 0x1234567890ab;
      const result = unpacker.bigint(BigInt(largeValue));

      expect(result.a).toBe(largeValue);
    });

    it('should handle 42-bit timestamp field', () => {
      const packer = bitPack({
        totalBits: 64,
        fields: [
          { name: 'timestamp', bits: 42, take: 'low' },
          { name: 'workerId', bits: 5, take: 'low' },
          { name: 'processId', bits: 5, take: 'low' },
          { name: 'increment', bits: 12, take: 'low' },
        ],
      });

      const unpacker = bitUnpack({
        totalBits: 64,
        fields: [
          { name: 'timestamp', bits: 42 },
          { name: 'workerId', bits: 5 },
          { name: 'processId', bits: 5 },
          { name: 'increment', bits: 12 },
        ],
        debug: true,
      });

      const data = {
        timestamp: Math.pow(2, 42) - 1,
        workerId: 31,
        processId: 31,
        increment: 4095,
      };

      const packed = packer.bigint(data);
      const result = unpacker.bigint(packed);

      expect(result.timestamp).toBe(data.timestamp);
      expect(result.workerId).toBe(data.workerId);
      expect(result.processId).toBe(data.processId);
      expect(result.increment).toBe(data.increment);
    });

    it('should handle 64-bit field', () => {
      const unpacker = bitUnpack({
        totalBits: 64,
        fields: [{ name: 'value', bits: 64 }],
        debug: true,
      });

      // Use a value within safe integer range
      const value = 0x123456789abcn;
      const result = unpacker.bigint(value);

      expect(result.value).toBe(Number(value));
    });
  });

  describe('Debug mode', () => {
    it('should include debug information when debug is true', () => {
      const unpacker = bitUnpack({
        totalBits: 4,
        fields: [{ name: 'a', bits: 4 }],
        debug: true,
      });

      expect(unpacker.buffer.code).toBeDefined();
      expect(unpacker.number.code).toBeDefined();
      expect(unpacker.bigint.code).toBeDefined();
      expect(unpacker.bits.code).toBeDefined();
    });

    it('should not include debug information when debug is false', () => {
      const unpacker = bitUnpack({
        totalBits: 4,
        fields: [{ name: 'a', bits: 4 }],
        debug: false,
      });

      expect(unpacker.buffer.code).toBeUndefined();
    });
  });

  describe('Edge cases and validation', () => {
    it('should throw error when fields array is empty', () => {
      expect(() => {
        bitUnpack({
          totalBits: 8,
          fields: [],
        });
      }).toThrow('fields cannot be empty');
    });

    it('should throw error when totalBits is 0 or negative', () => {
      expect(() => {
        bitUnpack({
          totalBits: 0,
          fields: [{ name: 'a', bits: 4 }],
        });
      }).toThrow('totalBits must be greater than 0');

      expect(() => {
        bitUnpack({
          totalBits: -1,
          fields: [{ name: 'a', bits: 4 }],
        });
      }).toThrow('totalBits must be greater than 0');
    });

    it('should handle zero values correctly', () => {
      const unpacker = bitUnpack({
        totalBits: 8,
        fields: [
          { name: 'a', bits: 4 },
          { name: 'b', bits: 4 },
        ],
      });

      const result = unpacker.number(0);

      expect(result.a).toBe(0);
      expect(result.b).toBe(0);
    });

    it('should handle maximum values correctly', () => {
      const unpacker = bitUnpack({
        totalBits: 4,
        fields: [{ name: 'a', bits: 4 }],
      });

      const result = unpacker.number(15);

      expect(result.a).toBe(15);
    });

    it('should handle single bit fields', () => {
      const unpacker = bitUnpack({
        totalBits: 3,
        fields: [
          { name: 'flag1', bits: 1 },
          { name: 'flag2', bits: 1 },
          { name: 'flag3', bits: 1 },
        ],
      });

      // 101 in binary = 5
      const result = unpacker.bits('101');

      expect(result.flag1).toBe(1);
      expect(result.flag2).toBe(0);
      expect(result.flag3).toBe(1);
    });
  });

  describe('Buffer endianness', () => {
    it('should correctly read big-endian byte order from buffer', () => {
      const unpacker = bitUnpack({
        totalBits: 32,
        fields: [{ name: 'a', bits: 32 }],
      });

      // Big-endian: most significant byte first
      const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
      const result = unpacker.buffer(buffer);

      expect(result.a).toBe(0x12345678);
    });
  });

  describe('Round-trip with bitPack', () => {
    it('should round-trip simple fields correctly', () => {
      const fields = [
        { name: 'a', bits: 4 },
        { name: 'b', bits: 4 },
      ];

      const packer = bitPack({
        totalBits: 8,
        fields: fields.map(f => ({ ...f, take: 'low' as const })),
      });

      const unpacker = bitUnpack({
        totalBits: 8,
        fields,
      });

      const original = { a: 15, b: 7 };
      const packed = packer.number(original);
      const unpacked = unpacker.number(packed);

      expect(unpacked.a).toBe(original.a);
      expect(unpacked.b).toBe(original.b);
    });

    it('should round-trip multiple containers correctly', () => {
      const fields = [
        { name: 'a', bits: 32 },
        { name: 'b', bits: 32 },
      ];

      const packer = bitPack({
        totalBits: 64,
        fields: fields.map(f => ({ ...f, take: 'low' as const })),
      });

      const unpacker = bitUnpack({
        totalBits: 64,
        fields,
      });

      const original = { a: 0xffffffff, b: 0x12345678 };
      const packed = packer.bigint(original);
      const unpacked = unpacker.bigint(packed);

      expect(unpacked.a).toBe(original.a);
      expect(unpacked.b).toBe(original.b);
    });

    it('should round-trip buffer correctly', () => {
      const fields = [
        { name: 'type', bits: 3 },
        { name: 'priority', bits: 2 },
        { name: 'id', bits: 16 },
        { name: 'flags', bits: 11 },
      ];

      const packer = bitPack({
        totalBits: 32,
        fields: fields.map(f => ({ ...f, take: 'low' as const })),
      });

      const unpacker = bitUnpack({
        totalBits: 32,
        fields,
      });

      const original = {
        type: 5,
        priority: 2,
        id: 12345,
        flags: 0x7ff,
      };

      const packed = packer.buffer(original);
      const unpacked = unpacker.buffer(packed);

      expect(unpacked.type).toBe(original.type);
      expect(unpacked.priority).toBe(original.priority);
      expect(unpacked.id).toBe(original.id);
      expect(unpacked.flags).toBe(original.flags);
    });

    it('should round-trip bits string correctly', () => {
      const fields = [
        { name: 'a', bits: 8 },
        { name: 'b', bits: 8 },
        { name: 'c', bits: 16 },
      ];

      const packer = bitPack({
        totalBits: 32,
        fields: fields.map(f => ({ ...f, take: 'low' as const })),
      });

      const unpacker = bitUnpack({
        totalBits: 32,
        fields,
      });

      const original = { a: 0xaa, b: 0xbb, c: 0xccdd };
      const packed = packer.bits(original);
      const unpacked = unpacker.bits(packed);

      expect(unpacked.a).toBe(original.a);
      expect(unpacked.b).toBe(original.b);
      expect(unpacked.c).toBe(original.c);
    });

    it('should round-trip large fields correctly', () => {
      const fields = [
        { name: 'timestamp', bits: 42 },
        { name: 'workerId', bits: 5 },
        { name: 'processId', bits: 5 },
        { name: 'sequence', bits: 12 },
      ];

      const packer = bitPack({
        totalBits: 64,
        fields: fields.map(f => ({ ...f, take: 'low' as const })),
      });

      const unpacker = bitUnpack({
        totalBits: 64,
        fields,
      });

      const original = {
        timestamp: 1640995200000,
        workerId: 15,
        processId: 7,
        sequence: 123,
      };

      const packed = packer.bigint(original);
      const unpacked = unpacker.bigint(packed);

      expect(unpacked.timestamp).toBe(original.timestamp);
      expect(unpacked.workerId).toBe(original.workerId);
      expect(unpacked.processId).toBe(original.processId);
      expect(unpacked.sequence).toBe(original.sequence);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Twitter Snowflake-like structure', () => {
      const fields = [
        { name: 'timestamp', bits: 42 },
        { name: 'workerId', bits: 5 },
        { name: 'processId', bits: 5 },
        { name: 'sequence', bits: 12 },
      ];

      const packer = bitPack({
        totalBits: 64,
        fields: fields.map(f => ({ ...f, take: 'low' as const })),
      });

      const unpacker = bitUnpack({
        totalBits: 64,
        fields,
      });

      const now = Date.now();
      const original = {
        timestamp: now,
        workerId: 1,
        processId: 1,
        sequence: 0,
      };

      const packed = packer.bigint(original);
      const unpacked = unpacker.bigint(packed);

      expect(unpacked.timestamp).toBe(original.timestamp);
      expect(unpacked.workerId).toBe(original.workerId);
      expect(unpacked.processId).toBe(original.processId);
      expect(unpacked.sequence).toBe(original.sequence);
    });

    it('should handle reversed Snowflake-like structure', () => {
      const fields = [
        { name: 'sequence', bits: 12 },
        { name: 'processId', bits: 5 },
        { name: 'workerId', bits: 5 },
        { name: 'timestamp', bits: 42 },
      ];

      const packer = bitPack({
        totalBits: 64,
        fields: fields.map(f => ({ ...f, take: 'low' as const })),
      });

      const unpacker = bitUnpack({
        totalBits: 64,
        fields,
      });

      const original = {
        timestamp: Math.pow(2, 42) - 1,
        workerId: 0,
        processId: 1,
        sequence: 1,
      };

      const packed = packer.bigint(original);
      const unpacked = unpacker.bigint(packed);

      expect(unpacked.timestamp).toBe(original.timestamp);
      expect(unpacked.workerId).toBe(original.workerId);
      expect(unpacked.processId).toBe(original.processId);
      expect(unpacked.sequence).toBe(original.sequence);
    });

    it('should handle mixed field sizes', () => {
      const fields = [
        { name: 'type', bits: 3 },
        { name: 'priority', bits: 2 },
        { name: 'id', bits: 16 },
        { name: 'timestamp', bits: 32 },
        { name: 'flags', bits: 8 },
      ];

      const packer = bitPack({
        totalBits: 61,
        fields: fields.map(f => ({ ...f, take: 'low' as const })),
      });

      const unpacker = bitUnpack({
        totalBits: 61,
        fields,
      });

      const original = {
        type: 5,
        priority: 2,
        id: 12345,
        timestamp: 1640995200,
        flags: 0xff,
      };

      const packed = packer.bigint(original);
      const unpacked = unpacker.bigint(packed);

      expect(unpacked.type).toBe(original.type);
      expect(unpacked.priority).toBe(original.priority);
      expect(unpacked.id).toBe(original.id);
      expect(unpacked.timestamp).toBe(original.timestamp);
      expect(unpacked.flags).toBe(original.flags);
    });
  });
});
