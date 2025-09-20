import { describe, expect, it } from 'vitest';
import { bigIntFromBytes } from '../bigIntFromBytes';
import { type BitPack, bitPack } from './bitPack';

describe('BitPack', () => {
  describe('Basic functionality', () => {
    it('should pack single field into one container', () => {
      const fn = bitPack({
        totalBits: 32,
        fields: [{ name: 'value', bits: 16, take: 'low' }],
      });

      const result = fn.buffer({ value: 0x1234 });
      const bits = bigIntFromBytes(result).toString(2);

      // Should be packed at bits 16-31 (top 16 bits of container)
      expect(bits).toEqual('10010001101000000000000000000');
    });

    it('should pack single field into one container (bigint)', () => {
      const fn = bitPack({
        debug: true,
        totalBits: 32,
        fields: [{ name: 'value', bits: 32, take: 'low' }],
      });

      const result = fn.bigint({ value: 0x1234 });

      // Should be packed at bits 16-31 (top 16 bits of container)
      expect(result).toEqual(0x1234n);
    });

    it('should pack multiple small fields', () => {
      const fn = bitPack({
        totalBits: 32,
        debug: true,
        fields: [
          { name: 'a', bits: 8, take: 'low' },
          { name: 'b', bits: 8, take: 'low' },
          { name: 'c', bits: 16, take: 'low' },
        ],
      });

      const result = fn.bits({ a: 0xaa, b: 0xbb, c: 0xccdd });

      // Layout: [a:8][b:8][c:16] = [0xAA][0xBB][0xCCDD]
      expect(result).toEqual('10101010101110111100110011011101');
    });

    it('should create a bitPack with simple fields', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 4, take: 'low' },
        { name: 'b', bits: 4, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 8,
        fields,
      });

      expect(packer).toHaveProperty('buffer');
      expect(packer).toHaveProperty('number');
      expect(packer).toHaveProperty('bigint');
      expect(packer).toHaveProperty('bits');
      expect(typeof packer.buffer).toBe('function');
      expect(typeof packer.number).toBe('function');
      expect(typeof packer.bigint).toBe('function');
      expect(typeof packer.bits).toBe('function');
    });

    it('should pack data correctly into buffer', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 4, take: 'low' },
        { name: 'b', bits: 4, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 8,
        fields,
      });

      const result = packer.buffer({ a: 15, b: 7 });

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(4); // 1 container * 4 bytes

      // Expected: a=15 (1111) in high nibble, b=7 (0111) in low nibble = 11110111 = 247
      expect(result[3]).toBe(247);
    });

    it('should pack data correctly into number', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 4, take: 'low' },
        { name: 'b', bits: 4, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 8,
        fields,
      });

      const result = packer.number({ a: 15, b: 7 });

      expect(result).toBe(247); // 11110111 in binary
    });

    it('should pack data correctly into bigint', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 4, take: 'low' },
        { name: 'b', bits: 4, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 8,
        fields,
      });

      const result = packer.bigint({ a: 15, b: 7 });

      expect(result).toBe(247n);
    });

    it('should pack data correctly into bits string', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 4, take: 'low' },
        { name: 'b', bits: 4, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 8,
        fields,
      });

      const result = packer.bits({ a: 15, b: 7 });

      expect(result).toBe('11110111');
    });
  });

  describe('Multiple containers', () => {
    it('should handle fields spanning multiple 32-bit containers', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 32, take: 'low' },
        { name: 'b', bits: 32, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 64,
        fields,
      });

      const result = packer.bigint({ a: 0xffffffff, b: 0x12345678 });

      // First container should have a, second container should have b
      expect(result).toBe(0xffffffff12345678n);
    });

    it('should handle fields that span across container boundaries', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 20, take: 'low' },
        { name: 'b', bits: 20, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 40,
        fields,
      });

      const result = packer.bigint({ a: 0xfffff, b: 0x12345 });

      expect(typeof result).toBe('bigint');
      expect(result > 0n).toBe(true);
    });
  });

  describe('Large fields (> 32 bits)', () => {
    it('should handle fields with more than 32 bits', () => {
      const fields: BitPack.Field[] = [{ name: 'a', bits: 48, take: 'low' }];

      const packer = bitPack({
        totalBits: 48,
        fields,
      });

      const largeValue = 0x1234567890ab;
      const result = packer.bigint({ a: largeValue });

      expect(result).toBe(BigInt(largeValue));
    });

    it('should handle take high for large numbers', () => {
      const fields: BitPack.Field[] = [{ name: 'a', bits: 32, take: 'high' }];

      const packer = bitPack({
        totalBits: 32,
        fields,
      });

      const largeValue = 0x123456789abcdef0;
      const result = packer.number({ a: largeValue });

      // Should take the high 32 bits
      expect(result).toBe(0x12345678);
    });
  });

  describe('Debug mode', () => {
    it('should include debug information when debug is true', () => {
      const fields: BitPack.Field[] = [{ name: 'a', bits: 4, take: 'low' }];

      const packer = bitPack({
        totalBits: 4,
        fields,
        debug: true,
      });

      expect(packer.plan).toBeDefined();
      expect(Array.isArray(packer.plan)).toBe(true);
      expect(packer.buffer.code).toBeDefined();
      expect(packer.number.code).toBeDefined();
      expect(packer.bigint.code).toBeDefined();
      expect(packer.bits.code).toBeDefined();
    });

    it('should not include debug information when debug is false', () => {
      const fields: BitPack.Field[] = [{ name: 'a', bits: 4, take: 'low' }];

      const packer = bitPack({
        totalBits: 4,
        fields,
        debug: false,
      });

      expect(packer.plan).toBeUndefined();
      expect(packer.buffer.code).toBeUndefined();
    });
  });

  describe('Optimization', () => {
    it('should optimize plan when optimize is true', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 4, take: 'low' },
        { name: 'b', bits: 4, take: 'low' },
      ];

      const optimizedPacker = bitPack({
        totalBits: 8,
        fields,
        debug: true,
        optimize: true,
      });

      const unoptimizedPacker = bitPack({
        totalBits: 8,
        fields,
        debug: true,
        optimize: false,
      });

      // Both should work the same way
      const data = { a: 5, b: 3 };
      expect(optimizedPacker.number(data)).toBe(unoptimizedPacker.number(data));

      // Optimized version might have fewer plan items due to merging
      expect(optimizedPacker.plan!.length).toBeLessThanOrEqual(
        unoptimizedPacker.plan!.length,
      );
    });
  });

  describe('Edge cases and validation', () => {
    it('should throw error when fields array is empty', () => {
      expect(() => {
        bitPack({
          totalBits: 8,
          fields: [],
        });
      }).toThrow('fields cannot be empty');
    });

    it('should throw error when totalBits is 0 or negative', () => {
      const fields: BitPack.Field[] = [{ name: 'a', bits: 4, take: 'low' }];

      expect(() => {
        bitPack({
          totalBits: 0,
          fields,
        });
      }).toThrow('totalBits must be greater than 0');

      expect(() => {
        bitPack({
          totalBits: -1,
          fields,
        });
      }).toThrow('totalBits must be greater than 0');
    });

    it('should handle zero values correctly', () => {
      const fields: BitPack.Field[] = [
        { name: 'a', bits: 4, take: 'low' },
        { name: 'b', bits: 4, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 8,
        fields,
      });

      const result = packer.number({ a: 0, b: 0 });
      expect(result).toBe(0);
    });

    it('should handle maximum values correctly', () => {
      const fields: BitPack.Field[] = [{ name: 'a', bits: 4, take: 'low' }];

      const packer = bitPack({
        totalBits: 4,
        fields,
      });

      // Maximum value for 4 bits is 15
      const result = packer.number({ a: 15 });
      expect(result).toBe(15);
    });

    it('should mask values that exceed field bit limits', () => {
      const fields: BitPack.Field[] = [{ name: 'a', bits: 4, take: 'low' }];

      const packer = bitPack({
        totalBits: 4,
        fields,
      });

      // 31 in binary is 11111, but only 4 bits allowed, so should be masked to 1111 = 15
      const result = packer.number({ a: 31 });
      expect(result).toBe(15);
    });

    it('should handle single bit fields', () => {
      const fields: BitPack.Field[] = [
        { name: 'flag1', bits: 1, take: 'low' },
        { name: 'flag2', bits: 1, take: 'low' },
        { name: 'flag3', bits: 1, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 3,
        fields,
      });

      const result = packer.bits({ flag1: 1, flag2: 0, flag3: 1 });
      expect(result).toBe('101');
    });
  });

  describe('Buffer endianness', () => {
    it('should produce big-endian byte order in buffer', () => {
      const fields: BitPack.Field[] = [{ name: 'a', bits: 32, take: 'low' }];

      const packer = bitPack({
        totalBits: 32,
        fields,
      });

      const result = packer.buffer({ a: 0x12345678 });

      // Big-endian: most significant byte first
      expect(result[0]).toBe(0x12);
      expect(result[1]).toBe(0x34);
      expect(result[2]).toBe(0x56);
      expect(result[3]).toBe(0x78);
    });
  });

  describe('Complex real-world scenarios', () => {
    it('should handle mixed field sizes correctly', () => {
      const packer = bitPack({
        totalBits: 61, // 3+2+16+32+8
        fields: [
          { name: 'type', bits: 3, take: 'low' }, // 0-7
          { name: 'priority', bits: 2, take: 'low' }, // 0-3
          { name: 'id', bits: 16, take: 'low' }, // 0-65535
          { name: 'timestamp', bits: 32, take: 'low' }, // Unix timestamp
          { name: 'flags', bits: 8, take: 'low' }, // Various flags
        ],
      });

      const data = {
        type: 5,
        priority: 2,
        id: 12345,
        timestamp: 1640995200, // 2022-01-01 00:00:00 UTC
        flags: 0xff,
      };

      const resultBigInt = packer.bigint(data);
      const resultBuffer = packer.buffer(data);

      expect(typeof resultBigInt).toBe('bigint');
      expect(resultBigInt).toBe(1598840959974080767n);
      expect(resultBuffer).toBeInstanceOf(Uint8Array);
      expect(resultBuffer.length).toBe(8); // 2 containers * 4 bytes
    });

    it('should handle IPv6-like addresses', () => {
      const fields: BitPack.Field[] = [
        { name: 'segment1', bits: 16, take: 'low' },
        { name: 'segment2', bits: 16, take: 'low' },
        { name: 'segment3', bits: 16, take: 'low' },
        { name: 'segment4', bits: 16, take: 'low' },
        { name: 'segment5', bits: 16, take: 'low' },
        { name: 'segment6', bits: 16, take: 'low' },
        { name: 'segment7', bits: 16, take: 'low' },
        { name: 'segment8', bits: 16, take: 'low' },
      ];

      const packer = bitPack({
        totalBits: 128,
        fields,
      });

      const ipv6Data = {
        segment1: 0x2001,
        segment2: 0x0db8,
        segment3: 0x85a3,
        segment4: 0x0000,
        segment5: 0x0000,
        segment6: 0x8a2e,
        segment7: 0x0370,
        segment8: 0x7334,
      };

      const result = packer.bigint(ipv6Data);
      expect(typeof result).toBe('bigint');
      expect(result > 0n).toBe(true);
    });
  });

  describe('Type safety (compile-time checks)', () => {
    it('should infer correct field names in TypeScript', () => {
      const packer = bitPack({
        totalBits: 32,
        fields: [
          { name: 'width', bits: 16, take: 'low' },
          { name: 'height', bits: 16, take: 'low' },
        ],
      });

      // This should compile without issues and require correct field names
      const result = packer.number({ width: 1920, height: 1080 });
      expect(result).toBeDefined();

      // Note: In a real TypeScript environment, this would fail to compile:
      // packer.number({ width: 1920, invalidField: 1080 }); // Should error
      // packer.number({ width: 1920 }); // Should error - missing height
    });
  });

  describe('Large field handling (>32 bits)', () => {
    it('should correctly pack 42-bit timestamp field', () => {
      const fn = bitPack({
        debug: true,
        totalBits: 64,
        fields: [
          { name: 'timestamp', bits: 42, take: 'low' },
          { name: 'workerId', bits: 5, take: 'low' },
          { name: 'processId', bits: 5, take: 'low' },
          { name: 'increment', bits: 12, take: 'low' },
        ],
      });

      // Test with a 42-bit timestamp (max value: 2^42 - 1 = 4398046511103)
      const result = fn.bits({
        timestamp: Math.pow(2, 42) - 1, // 42-bit max value
        workerId: Math.pow(2, 5) - 1, // 5-bit max value
        processId: Math.pow(2, 5) - 1, // 5-bit max value
        increment: Math.pow(2, 12) - 1, // 12-bit max value
      });

      expect(result).toBe(
        '1111111111111111111111111111111111111111111111111111111111111111',
      );
    });

    it('should handle 64-bit field spanning two containers', () => {
      const fn = bitPack({
        totalBits: 96,
        fields: [
          { name: 'bigValue', bits: 64, take: 'low' },
          { name: 'smallValue', bits: 32, take: 'low' },
        ],
      });

      const bigValue = BigInt('0x123456789ABCDEF0');
      const smallValue = 0x87654321;

      const result = fn.buffer({
        bigValue: Number(bigValue),
        smallValue,
      });

      expect(result).toHaveLength(12); // 96 bits = 12 bytes
    });

    it('should handle mixed high/low take modes', () => {
      const fn = bitPack({
        totalBits: 64,
        fields: [
          { name: 'value', bits: 32, take: 'high' },
          { name: 'value', bits: 32, take: 'low' },
        ],
      });

      const value = BigInt('0x123456789ABCDEF0');

      const result = fn.buffer({ value: Number(value) });
      expect(result).toHaveLength(8);
    });
  });

  describe('Edge cases', () => {
    it('should handle 1-bit fields', () => {
      const fn = bitPack({
        totalBits: 8,
        fields: [
          { name: 'bit0', bits: 1, take: 'low' },
          { name: 'bit1', bits: 1, take: 'low' },
          { name: 'bit2', bits: 1, take: 'low' },
          { name: 'bit3', bits: 1, take: 'low' },
          { name: 'bit4', bits: 1, take: 'low' },
          { name: 'bit5', bits: 1, take: 'low' },
          { name: 'bit6', bits: 1, take: 'low' },
          { name: 'bit7', bits: 1, take: 'low' },
        ],
      });

      const result = fn.bits({
        bit0: 1,
        bit1: 0,
        bit2: 1,
        bit3: 0,
        bit4: 1,
        bit5: 0,
        bit6: 1,
        bit7: 0,
      });

      expect(result).toEqual('10101010');
    });

    it('should handle maximum values for each field size', () => {
      const fn = bitPack({
        totalBits: 32,
        fields: [
          { name: 'f4', bits: 4, take: 'low' }, // max: 15
          { name: 'f8', bits: 8, take: 'low' }, // max: 255
          { name: 'f12', bits: 12, take: 'low' }, // max: 4095
          { name: 'f8b', bits: 8, take: 'low' }, // max: 255
        ],
      });

      const result = fn.buffer({
        f4: 15,
        f8: 255,
        f12: 4095,
        f8b: 255,
      });

      expect(result).toHaveLength(4);
    });

    it('should handle zero values', () => {
      const fn = bitPack({
        totalBits: 32,
        fields: [
          { name: 'a', bits: 16, take: 'low' },
          { name: 'b', bits: 16, take: 'low' },
        ],
      });

      const result = fn.buffer({ a: 0, b: 0 });
      expect(result).toEqual(new Uint8Array([0, 0, 0, 0]));
    });
  });

  describe('Field spanning multiple containers', () => {
    it('should handle field spanning exactly 2 containers', () => {
      const fn = bitPack({
        totalBits: 64,
        fields: [
          { name: 'prefix', bits: 16, take: 'low' },
          { name: 'spanning', bits: 32, take: 'low' }, // This will span containers
          { name: 'suffix', bits: 16, take: 'low' },
        ],
      });

      const result = fn.buffer({
        prefix: 0x1234,
        spanning: 0x56789abc,
        suffix: 0xdef0,
      });

      expect(result).toHaveLength(8);
    });
  });

  describe('Debug mode', () => {
    it('should include debug information when enabled', () => {
      const api = bitPack({
        totalBits: 32,
        debug: true,
        fields: [{ name: 'value', bits: 16, take: 'low' }],
      });

      expect(api.plan).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should throw for empty fields', () => {
      expect(() => {
        bitPack({
          totalBits: 32,
          fields: [],
        });
      }).toThrow('fields cannot be empty');
    });

    it('should throw for fields spanning more than 2 containers', () => {
      expect(() => {
        bitPack({
          totalBits: 128,
          fields: [
            { name: 'huge', bits: 80, take: 'low' }, // Would span 3 containers
          ],
        });
      }).toThrow('Fields spanning more than 2 containers');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle MongoDB ObjectId-like structure', () => {
      const fn = bitPack({
        totalBits: 96, // 12 bytes like ObjectId
        fields: [
          { name: 'timestamp', bits: 32, take: 'low' },
          { name: 'random', bits: 40, take: 'low' },
          { name: 'counter', bits: 24, take: 'low' },
        ],
      });

      const result = fn.buffer({
        timestamp: Math.floor(Date.now() / 1000),
        random: Math.floor(Math.random() * Math.pow(2, 40)),
        counter: 123456,
      });

      expect(result).toHaveLength(12);
    });

    it('should handle Twitter Snowflake-like structure', () => {
      const fn = bitPack({
        totalBits: 64,
        fields: [
          { name: 'timestamp', bits: 42, take: 'low' },
          { name: 'workerId', bits: 5, take: 'low' },
          { name: 'processId', bits: 5, take: 'low' },
          { name: 'sequence', bits: 12, take: 'low' },
        ],
      });

      const now = Date.now();
      const result = fn.buffer({
        timestamp: now,
        workerId: 1,
        processId: 1,
        sequence: 0,
      });

      expect(result).toHaveLength(8);
    });

    it('reversed Snowflake-like structure', () => {
      const fn = bitPack({
        debug: true,
        optimize: true,
        totalBits: 64,
        fields: [
          { name: 'sequence', bits: 12, take: 'low' },
          { name: 'processId', bits: 5, take: 'low' },
          { name: 'workerId', bits: 5, take: 'low' },
          { name: 'timestamp', bits: 42, take: 'low' },
        ],
      });

      const result = fn.bits({
        timestamp: Math.pow(2, 42) - 1,
        workerId: 0,
        processId: 1,
        sequence: 1,
      });

      expect(result).toEqual(
        '0000000000010000100000111111111111111111111111111111111111111111',
      );
    });
  });
});
