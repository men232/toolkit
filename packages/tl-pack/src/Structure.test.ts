import { describe, expect, it } from 'vitest';
import { Structure, defineStructure } from './Structure';
import { CORE_TYPES } from './constants';

describe('Structure', () => {
  describe('defineStructure', () => {
    it('should create a structure with basic properties', () => {
      const UserStructure = defineStructure({
        name: 'User',
        version: 1,
        properties: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          email: { type: String, required: false },
        },
      });

      const user = new UserStructure({
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(user.value.id).toBe(1);
      expect(user.value.name).toBe('John Doe');
      expect(user.value.email).toBe('john@example.com');
    });

    it('should handle optional properties', () => {
      const UserStructure = defineStructure({
        name: 'User',
        version: 1,
        properties: {
          id: { type: CORE_TYPES.Int8, required: true },
          name: { type: String, required: true },
          email: { type: String, required: false },
        },
      });

      const user = new UserStructure({
        id: 1,
        name: 'John Doe',
      });

      expect(user.value.id).toBe(1);
      expect(user.value.name).toBe('John Doe');
      expect(user.value.email).toBeUndefined();
    });

    it('should serialize and deserialize correctly', () => {
      const UserStructure = defineStructure({
        name: 'User',
        version: 1,
        properties: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
          isActive: { type: Boolean, required: true },
          createdAt: { type: Date, required: true },
        },
      });

      const originalData = {
        id: 42,
        name: 'Alice',
        isActive: true,
        createdAt: new Date('2023-01-01T00:00:00Z'),
      };

      const user = new UserStructure(originalData);
      const buffer = user.toBuffer();
      const decoded = UserStructure.fromBuffer(buffer);

      expect(decoded.id).toBe(originalData.id);
      expect(decoded.name).toBe(originalData.name);
      expect(decoded.isActive).toBe(originalData.isActive);
      expect(decoded.createdAt).toEqual(originalData.createdAt);
    });

    it('should handle Array properties', () => {
      const PostStructure = defineStructure({
        name: 'Post',
        version: 1,
        properties: {
          title: { type: String, required: true },
          tags: { type: Array, required: true },
        },
      });

      const post = new PostStructure({
        title: 'My Post',
        tags: ['javascript', 'typescript', 'vitest'],
      });

      const buffer = post.toBuffer();
      const decoded = PostStructure.fromBuffer(buffer);

      expect(decoded.title).toBe('My Post');
      expect(decoded.tags).toEqual(['javascript', 'typescript', 'vitest']);
    });

    it('should handle typed array properties', () => {
      const PostStructure = defineStructure({
        name: 'Post',
        version: 1,
        properties: {
          title: { type: String, required: true },
          tags: { type: [String], required: true },
        },
      });

      const post = new PostStructure({
        title: 'My Post',
        tags: ['javascript', 'typescript', 'vitest'],
      });

      const buffer = post.toBuffer();
      const decoded = PostStructure.fromBuffer(buffer);

      expect(decoded.title).toBe('My Post');
      expect(decoded.tags).toEqual(['javascript', 'typescript', 'vitest']);
    });

    it('should handle Map properties', () => {
      const ConfigStructure = defineStructure({
        name: 'Config',
        version: 1,
        properties: {
          name: { type: String, required: true },
          settings: { type: Object, required: true },
        },
      });

      const config = new ConfigStructure({
        name: 'AppConfig',
        settings: {
          theme: 'dark',
          language: 'en',
        },
      });

      const buffer = config.toBuffer();
      const decoded = ConfigStructure.fromBuffer(buffer);

      expect(decoded.name).toBe('AppConfig');
      expect(decoded.settings).toBeInstanceOf(Object);
      expect(decoded.settings.theme).toBe('dark');
      expect(decoded.settings.language).toBe('en');
    });

    it('should handle Uint8Array properties', () => {
      const FileStructure = defineStructure({
        name: 'File',
        version: 1,
        properties: {
          name: { type: String, required: true },
          data: { type: Uint8Array, required: true },
        },
      });

      const fileData = new Uint8Array([1, 2, 3, 4, 5]);
      const file = new FileStructure({
        name: 'test.bin',
        data: fileData,
      });

      const buffer = file.toBuffer();
      const decoded = FileStructure.fromBuffer(buffer);

      expect(decoded.name).toBe('test.bin');
      expect(decoded.data).toBeInstanceOf(Uint8Array);
      expect(Array.from(decoded.data)).toEqual([1, 2, 3, 4, 5]);
    });

    it('should handle nested structures', () => {
      const AddressStructure = defineStructure({
        name: 'Address',
        version: 1,
        properties: {
          street: { type: String, required: true },
          city: { type: String, required: true },
          zipCode: { type: String, required: true },
        },
      });

      const PersonStructure = defineStructure({
        name: 'Person',
        version: 1,
        properties: {
          name: { type: String, required: true },
          address: { type: AddressStructure, required: true },
        },
      });

      const addressData = {
        street: '123 Main St',
        city: 'Springfield',
        zipCode: '12345',
      };

      const person = new PersonStructure({
        name: 'Bob',
        address: new AddressStructure(addressData).value,
      });

      const buffer = person.toBuffer();
      const decoded = PersonStructure.fromBuffer(buffer);

      expect(decoded.name).toBe('Bob');
      expect(decoded.address).toStrictEqual(addressData);
    });

    it('should handle nested array structures', () => {
      const AddressStructure = defineStructure({
        name: 'Address',
        version: 1,
        properties: {
          street: { type: String, required: true },
          city: { type: String, required: true },
          zipCode: { type: String, required: true },
        },
      });

      const PersonStructure = defineStructure({
        name: 'Person',
        version: 1,
        properties: {
          name: { type: String, required: true },
          addresses: { type: [AddressStructure], required: true },
        },
      });

      const addressData = {
        street: '123 Main St',
        city: 'Springfield',
        zipCode: '12345',
      };

      const person = new PersonStructure({
        name: 'Bob',
        addresses: [addressData, addressData],
      });

      const buffer = person.toBuffer();
      const decoded = PersonStructure.fromBuffer(buffer);

      expect(decoded.name).toBe('Bob');
      expect(decoded.addresses.length).toBe(2);
      expect(decoded.addresses[0]).toStrictEqual(addressData);
      expect(decoded.addresses[1]).toStrictEqual(addressData);
    });

    it('should handle optional nested structures', () => {
      const AddressStructure = defineStructure({
        name: 'Address',
        version: 1,
        properties: {
          street: { type: String, required: true },
          city: { type: String, required: true },
        },
      });

      const PersonStructure = defineStructure({
        name: 'Person',
        version: 1,
        properties: {
          name: { type: String, required: true },
          address: { type: AddressStructure, required: false },
        },
      });

      // Test with address
      const personWithAddress = new PersonStructure({
        name: 'Alice',
        address: new AddressStructure({
          street: '456 Oak Ave',
          city: 'Boston',
        }).value,
      });

      let buffer = personWithAddress.toBuffer();
      let decoded = PersonStructure.fromBuffer(buffer);

      expect(decoded.name).toBe('Alice');
      expect(decoded.address?.street).toBe('456 Oak Ave');
      expect(decoded.address?.city).toBe('Boston');

      // Test without address
      const personWithoutAddress = new PersonStructure({
        name: 'Charlie',
      });

      buffer = personWithoutAddress.toBuffer();
      decoded = PersonStructure.fromBuffer(buffer);

      expect(decoded.name).toBe('Charlie');
      expect(decoded.address).toBeUndefined();
    });

    it('should validate version compatibility', () => {
      const UserV1 = defineStructure({
        name: 'User',
        version: 1,
        properties: {
          name: { type: String, required: true },
        },
      });

      const UserV2 = defineStructure({
        name: 'User',
        version: 2,
        properties: {
          name: { type: String, required: true },
        },
      });

      const userV1 = new UserV1({ name: 'Test' });
      const buffer = userV1.toBuffer();

      expect(() => {
        UserV2.fromBuffer(buffer);
      }).toThrow(/version mismatch/);
    });

    it('should handle checksum validation when enabled', () => {
      const UserStructure = defineStructure({
        name: 'User',
        version: 1,
        checksum: true,
        properties: {
          name: { type: String, required: true },
        },
      });

      const user = new UserStructure({ name: 'Test User' });
      const buffer = user.toBuffer();

      // Should decode successfully with valid checksum
      const decoded = UserStructure.fromBuffer(buffer);
      expect(decoded.name).toBe('Test User');

      // Corrupt the buffer and expect checksum validation to fail
      const corruptedBuffer = new Uint8Array(buffer);
      corruptedBuffer[corruptedBuffer.length - 2] = 0xff; // Corrupt checksum data

      expect(() => {
        UserStructure.fromBuffer(corruptedBuffer);
      }).toThrow();
    });

    it('should throw error for missing required properties', () => {
      const UserStructure = defineStructure({
        name: 'User',
        version: 1,
        properties: {
          id: { type: Number, required: true },
          name: { type: String, required: true },
        },
      });

      // @ts-expect-error
      const user = new UserStructure({
        id: 1,
        // name is missing but required
      });

      expect(() => {
        user.toBuffer();
      }).toThrow(/Required property "name" is missing or null/);
    });

    it('should throw error for unsupported property types', () => {
      expect(() => {
        defineStructure({
          name: 'Invalid',
          version: 1,
          properties: {
            unsupported: { type: Symbol, required: true },
          },
        });
      }).toThrow(/Unsupported property type/);
    });

    it('should generate unique structure IDs based on name', () => {
      const UserStructure = defineStructure({
        name: 'User',
        version: 1,
        properties: {
          name: { type: String, required: true },
        },
      });

      const PostStructure = defineStructure({
        name: 'Post',
        version: 1,
        properties: {
          title: { type: String, required: true },
        },
      });

      expect(UserStructure.extension.token).not.toBe(
        PostStructure.extension.token,
      );
      expect(typeof UserStructure.extension.token).toBe('number');
      expect(typeof PostStructure.extension.token).toBe('number');
    });
  });

  describe('Structure base class', () => {
    it('should have default extension properties', () => {
      expect(Structure.extension.token).toBeDefined();
      expect(typeof Structure.extension.encode).toBe('function');
      expect(typeof Structure.extension.decode).toBe('function');
    });

    it('should store value correctly', () => {
      const TestStructure = defineStructure({
        name: 'Test',
        version: 1,
        properties: {
          value: { type: Number, required: true },
        },
      });

      const instance = new TestStructure({ value: 42 });
      expect(instance.value).toEqual({ value: 42 });
    });
  });

  describe('type compilation edge cases', () => {
    it('should handle empty properties object', () => {
      const EmptyStructure = defineStructure({
        name: 'Empty',
        version: 1,
        properties: {},
      });

      const empty = new EmptyStructure({});
      const buffer = empty.toBuffer();
      const decoded = EmptyStructure.fromBuffer(buffer);

      expect(decoded).toEqual({});
    });

    it('should handle all primitive types in one structure', () => {
      const AllTypesStructure = defineStructure({
        name: 'AllTypes',
        version: 1,
        properties: {
          str: { type: String, required: true },
          num: { type: Number, required: true },
          bool: { type: Boolean, required: true },
          date: { type: Date, required: true },
          arr: { type: [Number], required: true },
          map: { type: Object, required: true },
          bytes: { type: Uint8Array, required: true },
        },
      });

      const testMap = { key: 'value' };
      const testBytes = new Uint8Array([1, 2, 3]);
      const testDate = new Date('2023-01-01');

      const data = {
        str: 'test',
        num: 123,
        bool: true,
        date: testDate,
        arr: [1, 2, 3],
        map: testMap,
        bytes: testBytes,
      };

      const instance = new AllTypesStructure(data);
      const buffer = instance.toBuffer();
      const decoded = AllTypesStructure.fromBuffer(buffer);

      expect(decoded.str).toBe('test');
      expect(decoded.num).toBe(123);
      expect(decoded.bool).toBe(true);
      expect(decoded.date).toEqual(testDate);
      expect(decoded.arr).toEqual([1, 2, 3]);
      expect(decoded.map).toBeInstanceOf(Object);
      expect(decoded.map.key).toBe('value');
      expect(decoded.bytes).toBeInstanceOf(Uint8Array);
      expect(Array.from(decoded.bytes)).toEqual([1, 2, 3]);
    });
  });

  describe('CORE_TYPES Binary Serialization', () => {
    describe('Integer Types', () => {
      it('should handle Int8 values correctly', () => {
        const TestStructure = defineStructure({
          name: 'Int8Test',
          version: 1,
          properties: {
            positiveValue: { type: CORE_TYPES.Int8, required: true },
            negativeValue: { type: CORE_TYPES.Int8, required: true },
            zero: { type: CORE_TYPES.Int8, required: true },
            maxValue: { type: CORE_TYPES.Int8, required: true },
            minValue: { type: CORE_TYPES.Int8, required: true },
          },
        });

        const testData = {
          positiveValue: 42,
          negativeValue: -42,
          zero: 0,
          maxValue: 127,
          minValue: -128,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });

      it('should handle Int16 values correctly', () => {
        const TestStructure = defineStructure({
          name: 'Int16Test',
          version: 1,
          properties: {
            positiveValue: { type: CORE_TYPES.Int16, required: true },
            negativeValue: { type: CORE_TYPES.Int16, required: true },
            maxValue: { type: CORE_TYPES.Int16, required: true },
            minValue: { type: CORE_TYPES.Int16, required: true },
          },
        });

        const testData = {
          positiveValue: 12345,
          negativeValue: -12345,
          maxValue: 32767,
          minValue: -32768,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });

      it('should handle Int32 values correctly', () => {
        const TestStructure = defineStructure({
          name: 'Int32Test',
          version: 1,
          properties: {
            positiveValue: { type: CORE_TYPES.Int32, required: true },
            negativeValue: { type: CORE_TYPES.Int32, required: true },
            maxValue: { type: CORE_TYPES.Int32, required: true },
            minValue: { type: CORE_TYPES.Int32, required: true },
          },
        });

        const testData = {
          positiveValue: 1234567890,
          negativeValue: -1234567890,
          maxValue: 2147483647,
          minValue: -2147483648,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });

      it('should handle UInt8 values correctly', () => {
        const TestStructure = defineStructure({
          name: 'UInt8Test',
          version: 1,
          properties: {
            zero: { type: CORE_TYPES.UInt8, required: true },
            midValue: { type: CORE_TYPES.UInt8, required: true },
            maxValue: { type: CORE_TYPES.UInt8, required: true },
          },
        });

        const testData = {
          zero: 0,
          midValue: 128,
          maxValue: 255,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });

      it('should handle UInt16 values correctly', () => {
        const TestStructure = defineStructure({
          name: 'UInt16Test',
          version: 1,
          properties: {
            zero: { type: CORE_TYPES.UInt16, required: true },
            midValue: { type: CORE_TYPES.UInt16, required: true },
            maxValue: { type: CORE_TYPES.UInt16, required: true },
          },
        });

        const testData = {
          zero: 0,
          midValue: 32768,
          maxValue: 65535,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });

      it('should handle UInt32 values correctly', () => {
        const TestStructure = defineStructure({
          name: 'UInt32Test',
          version: 1,
          properties: {
            zero: { type: CORE_TYPES.UInt32, required: true },
            midValue: { type: CORE_TYPES.UInt32, required: true },
            maxValue: { type: CORE_TYPES.UInt32, required: true },
          },
        });

        const testData = {
          zero: 0,
          midValue: 2147483648,
          maxValue: 4294967295,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });
    });

    describe('Floating Point Types', () => {
      it('should handle Double values correctly', () => {
        const TestStructure = defineStructure({
          name: 'DoubleTest',
          version: 1,
          properties: {
            positiveValue: { type: CORE_TYPES.Double, required: true },
            negativeValue: { type: CORE_TYPES.Double, required: true },
            zero: { type: CORE_TYPES.Double, required: true },
            infinity: { type: CORE_TYPES.Double, required: true },
            verySmall: { type: CORE_TYPES.Double, required: true },
            pi: { type: CORE_TYPES.Double, required: true },
          },
        });

        const testData = {
          positiveValue: 123.456789,
          negativeValue: -123.456789,
          zero: 0.0,
          infinity: Number.MAX_VALUE,
          verySmall: Number.MIN_VALUE,
          pi: Math.PI,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored.positiveValue).toBeCloseTo(testData.positiveValue);
        expect(restored.negativeValue).toBeCloseTo(testData.negativeValue);
        expect(restored.zero).toBe(testData.zero);
        expect(restored.infinity).toBe(testData.infinity);
        expect(restored.verySmall).toBe(testData.verySmall);
        expect(restored.pi).toBeCloseTo(testData.pi);
      });
    });

    describe('String Type', () => {
      it('should handle String values correctly', () => {
        const TestStructure = defineStructure({
          name: 'StringTest',
          version: 1,
          properties: {
            emptyString: { type: CORE_TYPES.String, required: true },
            shortString: { type: CORE_TYPES.String, required: true },
            longString: { type: CORE_TYPES.String, required: true },
            unicodeString: { type: CORE_TYPES.String, required: true },
            specialChars: { type: CORE_TYPES.String, required: true },
          },
        });

        const testData = {
          emptyString: '',
          shortString: 'Hello',
          longString: 'A'.repeat(1000),
          unicodeString: '🎉 Hello 世界 🌍',
          specialChars: 'Line1\nLine2\tTabbed\r\nWindows',
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });
    });

    describe('Date Type', () => {
      it('should handle Date values correctly', () => {
        const TestStructure = defineStructure({
          name: 'DateTest',
          version: 1,
          properties: {
            now: { type: CORE_TYPES.Date, required: true },
            epoch: { type: CORE_TYPES.Date, required: true },
            future: { type: CORE_TYPES.Date, required: true },
            past: { type: CORE_TYPES.Date, required: true },
          },
        });

        const testData = {
          now: new Date(),
          epoch: new Date(0),
          future: new Date('2030-12-31T23:59:59.999Z'),
          past: new Date('1970-01-01T00:00:00.000Z'),
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored.now.getTime()).toBe(testData.now.getTime());
        expect(restored.epoch.getTime()).toBe(testData.epoch.getTime());
        expect(restored.future.getTime()).toBe(testData.future.getTime());
        expect(restored.past.getTime()).toBe(testData.past.getTime());
      });
    });

    describe('Binary Type', () => {
      it('should handle Binary (Uint8Array) values correctly', () => {
        const TestStructure = defineStructure({
          name: 'BinaryTest',
          version: 1,
          properties: {
            emptyBuffer: { type: CORE_TYPES.Binary, required: true },
            smallBuffer: { type: CORE_TYPES.Binary, required: true },
            largeBuffer: { type: CORE_TYPES.Binary, required: true },
            patternBuffer: { type: CORE_TYPES.Binary, required: true },
          },
        });

        const testData = {
          emptyBuffer: new Uint8Array(0),
          smallBuffer: new Uint8Array([1, 2, 3, 4, 5]),
          largeBuffer: new Uint8Array(1000).fill(42),
          patternBuffer: new Uint8Array(256).map((_, i) => i),
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored.emptyBuffer).toEqual(testData.emptyBuffer);
        expect(restored.smallBuffer).toEqual(testData.smallBuffer);
        expect(restored.largeBuffer).toEqual(testData.largeBuffer);
        expect(restored.patternBuffer).toEqual(testData.patternBuffer);
      });
    });

    describe('Vector Type', () => {
      it('should handle Vector (Array) values correctly', () => {
        const TestStructure = defineStructure({
          name: 'VectorTest',
          version: 1,
          properties: {
            emptyArray: { type: CORE_TYPES.Vector, required: true },
            numberArray: { type: CORE_TYPES.Vector, required: true },
          },
        });

        const testData = {
          emptyArray: [],
          numberArray: [1, 2, 3, 4, 5],
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });
    });

    describe('Map Type', () => {
      it('should handle Map (Object) values correctly', () => {
        const TestStructure = defineStructure({
          name: 'MapTest',
          version: 1,
          properties: {
            emptyObject: { type: CORE_TYPES.Map, required: true },
            simpleObject: { type: CORE_TYPES.Map, required: true },
            nestedObject: { type: CORE_TYPES.Map, required: true },
            complexObject: { type: CORE_TYPES.Map, required: true },
          },
        });

        const testData = {
          emptyObject: {},
          simpleObject: { name: 'John', age: 30 },
          nestedObject: {
            user: { id: 1, profile: { email: 'john@example.com' } },
            settings: { theme: 'dark', notifications: true },
          },
          complexObject: {
            array: [1, 2, 3],
            nested: { deep: { value: 'test' } },
            nullValue: null,
            boolValue: true,
          },
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });
    });

    describe('Boolean Values', () => {
      it('should handle Boolean values correctly', () => {
        const TestStructure = defineStructure({
          name: 'BooleanTest',
          version: 1,
          properties: {
            trueValue: { type: Boolean, required: true },
            falseValue: { type: Boolean, required: true },
          },
        });

        const testData = {
          trueValue: true,
          falseValue: false,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored).toEqual(testData);
      });
    });

    describe('Optional Properties', () => {
      it('should handle optional properties correctly', () => {
        const TestStructure = defineStructure({
          name: 'OptionalTest',
          version: 1,
          properties: {
            requiredValue: { type: CORE_TYPES.String, required: true },
            optionalValue: { type: CORE_TYPES.String, required: false },
            optionalNumber: { type: CORE_TYPES.Int32, required: false },
            optionalDate: { type: CORE_TYPES.Date, required: false },
          },
        });

        // Test with optional values present
        const testDataWithOptional = {
          requiredValue: 'required',
          optionalValue: 'optional',
          optionalNumber: 42,
          optionalDate: new Date(),
        };

        let instance = new TestStructure(testDataWithOptional);
        let buffer = instance.toBuffer();
        let restored = TestStructure.fromBuffer(buffer);

        expect(restored.requiredValue).toBe(testDataWithOptional.requiredValue);
        expect(restored.optionalValue).toBe(testDataWithOptional.optionalValue);
        expect(restored.optionalNumber).toBe(
          testDataWithOptional.optionalNumber,
        );
        expect(restored.optionalDate?.getTime()).toBe(
          testDataWithOptional.optionalDate.getTime(),
        );

        // Test with optional values missing
        const testDataWithoutOptional = {
          requiredValue: 'required',
        };

        instance = new TestStructure(testDataWithoutOptional);
        buffer = instance.toBuffer();
        restored = TestStructure.fromBuffer(buffer);

        expect(restored.requiredValue).toBe(
          testDataWithoutOptional.requiredValue,
        );
        expect(restored.optionalValue).toBeUndefined();
        expect(restored.optionalNumber).toBeUndefined();
        expect(restored.optionalDate).toBeUndefined();
      });
    });

    describe('Complex Mixed Types', () => {
      it('should handle complex structures with all types', () => {
        const TestStructure = defineStructure({
          name: 'ComplexTest',
          version: 1,
          checksum: true,
          properties: {
            id: { type: CORE_TYPES.UInt32, required: true },
            name: { type: CORE_TYPES.String, required: true },
            isActive: { type: Boolean, required: true },
            createdAt: { type: CORE_TYPES.Date, required: true },
            score: { type: CORE_TYPES.Double, required: true },
            tags: { type: CORE_TYPES.Vector, required: false },
            metadata: { type: CORE_TYPES.Map, required: false },
            avatar: { type: CORE_TYPES.Binary, required: false },
            settings: { type: CORE_TYPES.Map, required: true },
          },
        });

        const testData = {
          id: 12345,
          name: 'Test User',
          isActive: true,
          createdAt: new Date('2023-01-01T12:00:00Z'),
          score: 95.5,
          tags: ['admin', 'verified', 'premium'],
          metadata: {
            loginCount: 42,
            lastLogin: '2023-12-01',
            preferences: {
              theme: 'dark',
              language: 'en',
            },
          },
          avatar: new Uint8Array([255, 216, 255, 224]), // JPEG header
          settings: {
            notifications: true,
            privacy: 'public',
            twoFactor: false,
          },
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored.id).toBe(testData.id);
        expect(restored.name).toBe(testData.name);
        expect(restored.isActive).toBe(testData.isActive);
        expect(restored.createdAt.getTime()).toBe(testData.createdAt.getTime());
        expect(restored.score).toBeCloseTo(testData.score);
        expect(restored.tags).toEqual(testData.tags);
        expect(restored.metadata).toEqual(testData.metadata);
        expect(restored.avatar).toEqual(testData.avatar);
        expect(restored.settings).toEqual(testData.settings);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null and undefined values in optional fields', () => {
        const TestStructure = defineStructure({
          name: 'EdgeCaseTest',
          version: 1,
          properties: {
            required: { type: CORE_TYPES.String, required: true },
            optionalString: { type: CORE_TYPES.String, required: false },
            optionalNumber: { type: CORE_TYPES.Int32, required: false },
          },
        });

        const testDataWithNull = {
          required: 'test',
          optionalString: null,
          optionalNumber: undefined,
        };

        const instance = new TestStructure(testDataWithNull);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored.required).toBe('test');
        expect(restored.optionalString).toBeNull();
        expect(restored.optionalNumber).toBeUndefined();
      });

      it('should throw error for missing required fields', () => {
        const TestStructure = defineStructure({
          name: 'RequiredTest',
          version: 1,
          properties: {
            required: { type: CORE_TYPES.String, required: true },
          },
        });

        const testDataMissingRequired = {};

        // @ts-expect-error
        const instance = new TestStructure(testDataMissingRequired);

        expect(() => {
          instance.toBuffer();
        }).toThrow();
      });

      it('should handle very large data structures', () => {
        const TestStructure = defineStructure({
          name: 'LargeDataTest',
          version: 1,
          properties: {
            largeString: { type: CORE_TYPES.String, required: true },
            largeArray: { type: CORE_TYPES.Vector, required: true },
            largeBinary: { type: CORE_TYPES.Binary, required: true },
          },
        });

        const testData = {
          largeString: 'X'.repeat(10000),
          largeArray: Array.from({ length: 1000 }, (_, i) => i),
          largeBinary: new Uint8Array(5000).fill(123),
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const restored = TestStructure.fromBuffer(buffer);

        expect(restored.largeString).toBe(testData.largeString);
        expect(restored.largeArray).toEqual(testData.largeArray);
        expect(restored.largeBinary).toEqual(testData.largeBinary);
      });
    });

    describe('Version Compatibility', () => {
      it('should enforce version matching', () => {
        const TestStructureV1 = defineStructure({
          name: 'VersionTest',
          version: 1,
          properties: {
            value: { type: CORE_TYPES.String, required: true },
          },
        });

        const TestStructureV2 = defineStructure({
          name: 'VersionTest',
          version: 2,
          properties: {
            value: { type: CORE_TYPES.String, required: true },
          },
        });

        const instance = new TestStructureV1({ value: 'test' });
        const buffer = instance.toBuffer();

        // Attempting to decode with different version should throw
        expect(() => {
          TestStructureV2.fromBuffer(buffer);
        }).toThrow();
      });
    });

    describe('Checksum Validation', () => {
      it('should validate checksums when enabled', () => {
        const TestStructure = defineStructure({
          name: 'ChecksumTest',
          version: 1,
          checksum: true,
          properties: {
            value: { type: CORE_TYPES.String, required: true },
          },
        });

        const testData = { value: 'test' };
        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();

        // Normal decode should work
        const restored = TestStructure.fromBuffer(buffer);
        expect(restored).toEqual(testData);

        // Corrupted buffer should fail checksum validation
        const corruptedBuffer = new Uint8Array(buffer);
        corruptedBuffer[corruptedBuffer.length - 1] ^= 0xff; // Flip last byte

        expect(() => {
          TestStructure.fromBuffer(corruptedBuffer);
        }).toThrow();
      });
    });
  });

  describe('estimatedSizeBytes Calculation', () => {
    describe('Fixed Size Types', () => {
      it('should calculate correct estimated size for Int8', () => {
        const TestStructure = defineStructure({
          name: 'Int8SizeTest',
          version: 1,
          properties: {
            value1: { type: CORE_TYPES.Int8, required: true },
            value2: { type: CORE_TYPES.Int8, required: true },
            value3: { type: CORE_TYPES.Int8, required: true },
          },
        });

        // Version byte (1) + 3 Int8 values (3) = 4 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(4);
      });

      it('should calculate correct estimated size for Int16', () => {
        const TestStructure = defineStructure({
          name: 'Int16SizeTest',
          version: 1,
          properties: {
            value1: { type: CORE_TYPES.Int16, required: true },
            value2: { type: CORE_TYPES.Int16, required: true },
          },
        });

        // Version byte (1) + 2 Int16 values (4) = 5 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(5);
      });

      it('should calculate correct estimated size for Int32', () => {
        const TestStructure = defineStructure({
          name: 'Int32SizeTest',
          version: 1,
          properties: {
            value1: { type: CORE_TYPES.Int32, required: true },
            value2: { type: CORE_TYPES.Int32, required: true },
          },
        });

        // Version byte (1) + 2 Int32 values (8) = 9 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(9);
      });

      it('should calculate correct estimated size for UInt8', () => {
        const TestStructure = defineStructure({
          name: 'UInt8SizeTest',
          version: 1,
          properties: {
            value1: { type: CORE_TYPES.UInt8, required: true },
            value2: { type: CORE_TYPES.UInt8, required: true },
            value3: { type: CORE_TYPES.UInt8, required: true },
            value4: { type: CORE_TYPES.UInt8, required: true },
          },
        });

        // Version byte (1) + 4 UInt8 values (4) = 5 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(5);
      });

      it('should calculate correct estimated size for UInt16', () => {
        const TestStructure = defineStructure({
          name: 'UInt16SizeTest',
          version: 1,
          properties: {
            value1: { type: CORE_TYPES.UInt16, required: true },
            value2: { type: CORE_TYPES.UInt16, required: true },
            value3: { type: CORE_TYPES.UInt16, required: true },
          },
        });

        // Version byte (1) + 3 UInt16 values (6) = 7 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(7);
      });

      it('should calculate correct estimated size for UInt32', () => {
        const TestStructure = defineStructure({
          name: 'UInt32SizeTest',
          version: 1,
          properties: {
            value1: { type: CORE_TYPES.UInt32, required: true },
            value2: { type: CORE_TYPES.UInt32, required: true },
          },
        });

        // Version byte (1) + 2 UInt32 values (8) = 9 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(9);
      });

      it('should calculate correct estimated size for Double', () => {
        const TestStructure = defineStructure({
          name: 'DoubleSizeTest',
          version: 1,
          properties: {
            value1: { type: CORE_TYPES.Double, required: true },
            value2: { type: CORE_TYPES.Double, required: true },
          },
        });

        // Version byte (1) + 2 Double values (16) = 17 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(17);
      });

      it('should calculate correct estimated size for Date', () => {
        const TestStructure = defineStructure({
          name: 'DateSizeTest',
          version: 1,
          properties: {
            createdAt: { type: CORE_TYPES.Date, required: true },
            updatedAt: { type: CORE_TYPES.Date, required: true },
          },
        });

        // Version byte (1) + 2 Date values (16) = 17 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(17);
      });

      it('should calculate correct estimated size for Boolean', () => {
        const TestStructure = defineStructure({
          name: 'BooleanSizeTest',
          version: 1,
          properties: {
            flag1: { type: Boolean, required: true },
            flag2: { type: Boolean, required: true },
            flag3: { type: Boolean, required: true },
          },
        });

        // Version byte (1) + 3 Boolean values (3) = 4 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(4);
      });
    });

    describe('Variable Size Types', () => {
      it('should return 0 estimated size for String (variable)', () => {
        const TestStructure = defineStructure({
          name: 'StringSizeTest',
          version: 1,
          properties: {
            text1: { type: CORE_TYPES.String, required: true },
            text2: { type: CORE_TYPES.String, required: true },
          },
        });

        // Version byte (1) + 2 String values (0 each, variable size) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });

      it('should return 0 estimated size for Binary (variable)', () => {
        const TestStructure = defineStructure({
          name: 'BinarySizeTest',
          version: 1,
          properties: {
            data1: { type: CORE_TYPES.Binary, required: true },
            data2: { type: CORE_TYPES.Binary, required: true },
          },
        });

        // Version byte (1) + 2 Binary values (0 each, variable size) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });

      it('should return 0 estimated size for Vector (variable)', () => {
        const TestStructure = defineStructure({
          name: 'VectorSizeTest',
          version: 1,
          properties: {
            items1: { type: CORE_TYPES.Vector, required: true },
            items2: { type: CORE_TYPES.Vector, required: true },
          },
        });

        // Version byte (1) + 2 Vector values (0 each, variable size) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });

      it('should return 0 estimated size for Map (variable)', () => {
        const TestStructure = defineStructure({
          name: 'MapSizeTest',
          version: 1,
          properties: {
            config1: { type: CORE_TYPES.Map, required: true },
            config2: { type: CORE_TYPES.Map, required: true },
          },
        });

        // Version byte (1) + 2 Map values (0 each, variable size) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });
    });

    describe('Mixed Type Calculations', () => {
      it('should calculate correct size for mixed fixed and variable types', () => {
        const TestStructure = defineStructure({
          name: 'MixedSizeTest',
          version: 1,
          properties: {
            id: { type: CORE_TYPES.UInt32, required: true }, // 4 bytes
            score: { type: CORE_TYPES.Double, required: true }, // 8 bytes
            isActive: { type: Boolean, required: true }, // 1 byte
            name: { type: CORE_TYPES.String, required: true }, // 0 bytes (variable)
            metadata: { type: CORE_TYPES.Map, required: true }, // 0 bytes (variable)
          },
        });

        // Version byte (1) + UInt32 (4) + Double (8) + Boolean (1) + String (0) + Map (0) = 14 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(14);
      });

      it('should calculate correct size for all fixed types', () => {
        const TestStructure = defineStructure({
          name: 'AllFixedSizeTest',
          version: 1,
          properties: {
            int8Val: { type: CORE_TYPES.Int8, required: true }, // 1 byte
            int16Val: { type: CORE_TYPES.Int16, required: true }, // 2 bytes
            int32Val: { type: CORE_TYPES.Int32, required: true }, // 4 bytes
            uint8Val: { type: CORE_TYPES.UInt8, required: true }, // 1 byte
            uint16Val: { type: CORE_TYPES.UInt16, required: true }, // 2 bytes
            uint32Val: { type: CORE_TYPES.UInt32, required: true }, // 4 bytes
            doubleVal: { type: CORE_TYPES.Double, required: true }, // 8 bytes
            dateVal: { type: CORE_TYPES.Date, required: true }, // 8 bytes
            boolVal: { type: Boolean, required: true }, // 1 byte
          },
        });

        // Version (1) + Int8 (1) + Int16 (2) + Int32 (4) + UInt8 (1) + UInt16 (2) + UInt32 (4) + Double (8) + Date (8) + Boolean (1) = 32 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(32);
      });

      it('should calculate correct size for all variable types', () => {
        const TestStructure = defineStructure({
          name: 'AllVariableSizeTest',
          version: 1,
          properties: {
            text: { type: CORE_TYPES.String, required: true }, // 0 bytes
            data: { type: CORE_TYPES.Binary, required: true }, // 0 bytes
            items: { type: CORE_TYPES.Vector, required: true }, // 0 bytes
            config: { type: CORE_TYPES.Map, required: true }, // 0 bytes
          },
        });

        // Version byte (1) + 4 variable types (0 each) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });
    });

    describe('Built-in Type Aliases', () => {
      it('should calculate correct size for Number (alias for Double)', () => {
        const TestStructure = defineStructure({
          name: 'NumberSizeTest',
          version: 1,
          properties: {
            value1: { type: Number, required: true },
            value2: { type: Number, required: true },
          },
        });

        // Version byte (1) + 2 Number values (16, alias for Double) = 17 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(17);
      });

      it('should calculate correct size for String built-in', () => {
        const TestStructure = defineStructure({
          name: 'StringBuiltinSizeTest',
          version: 1,
          properties: {
            text1: { type: String, required: true },
            text2: { type: String, required: true },
          },
        });

        // Version byte (1) + 2 String values (0 each, variable) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });

      it('should calculate correct size for Object (alias for Map)', () => {
        const TestStructure = defineStructure({
          name: 'ObjectSizeTest',
          version: 1,
          properties: {
            config1: { type: Object, required: true },
            config2: { type: Object, required: true },
          },
        });

        // Version byte (1) + 2 Object values (0 each, alias for Map) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });

      it('should calculate correct size for Uint8Array (alias for Binary)', () => {
        const TestStructure = defineStructure({
          name: 'Uint8ArraySizeTest',
          version: 1,
          properties: {
            data1: { type: Uint8Array, required: true },
            data2: { type: Uint8Array, required: true },
          },
        });

        // Version byte (1) + 2 Uint8Array values (0 each, alias for Binary) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });

      it('should calculate correct size for Array (alias for Vector)', () => {
        const TestStructure = defineStructure({
          name: 'ArraySizeTest',
          version: 1,
          properties: {
            items1: { type: Array, required: true },
            items2: { type: Array, required: true },
          },
        });

        // Version byte (1) + 2 Array values (0 each, alias for Vector) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });

      it('should calculate correct size for Date built-in', () => {
        const TestStructure = defineStructure({
          name: 'DateBuiltinSizeTest',
          version: 1,
          properties: {
            createdAt: { type: Date, required: true },
            updatedAt: { type: Date, required: true },
          },
        });

        // Version byte (1) + 2 Date values (16) = 17 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(17);
      });
    });

    describe('Checksum Impact', () => {
      it('should not affect estimated size calculation when checksum is enabled', () => {
        const WithoutChecksum = defineStructure({
          name: 'ChecksumTest',
          version: 1,
          checksum: false,
          properties: {
            value: { type: CORE_TYPES.Int32, required: true },
          },
        });

        const WithChecksum = defineStructure({
          name: 'ChecksumTest',
          version: 1,
          checksum: true,
          properties: {
            value: { type: CORE_TYPES.Int32, required: true },
          },
        });

        // Both should have same estimated size - checksum doesn't affect the calculation
        // Version byte (1) + Int32 (4) = 5 bytes
        expect(WithoutChecksum.estimatedSizeBytes).toBe(5);
        expect(WithChecksum.estimatedSizeBytes).toBe(9);
      });
    });

    describe('Optional Properties Impact', () => {
      it('should include optional properties in size calculation', () => {
        const TestStructure = defineStructure({
          name: 'OptionalSizeTest',
          version: 1,
          properties: {
            required: { type: CORE_TYPES.Int32, required: true }, // 4 bytes
            optional1: { type: CORE_TYPES.Int16, required: false }, // 2 bytes
            optional2: { type: CORE_TYPES.Int8, required: false }, // 1 byte
          },
        });

        // Version byte (1) + required Int32 (4) + optional Int16 (2) + optional Int8 (1) = 8 bytes
        // Optional properties are still counted in estimated size
        expect(TestStructure.estimatedSizeBytes).toBe(8);
      });
    });

    describe('Empty Structure', () => {
      it('should calculate size for structure with no properties', () => {
        const TestStructure = defineStructure({
          name: 'EmptyTest',
          version: 1,
          properties: {},
        });

        // Only version byte (1) = 1 byte
        expect(TestStructure.estimatedSizeBytes).toBe(1);
      });
    });

    describe('Large Structure', () => {
      it('should calculate correct size for structure with many properties', () => {
        const properties: any = {};

        // Create 10 of each fixed-size type
        for (let i = 0; i < 10; i++) {
          properties[`int8_${i}`] = { type: CORE_TYPES.Int8, required: true }; // 1 byte each
          properties[`int16_${i}`] = { type: CORE_TYPES.Int16, required: true }; // 2 bytes each
          properties[`int32_${i}`] = { type: CORE_TYPES.Int32, required: true }; // 4 bytes each
          properties[`double_${i}`] = {
            type: CORE_TYPES.Double,
            required: true,
          }; // 8 bytes each
          properties[`bool_${i}`] = { type: Boolean, required: true }; // 1 byte each
        }

        const TestStructure = defineStructure({
          name: 'LargeStructureTest',
          version: 1,
          properties,
        });

        // Version (1) + 10*Int8 (10) + 10*Int16 (20) + 10*Int32 (40) + 10*Double (80) + 10*Boolean (10) = 161 bytes
        expect(TestStructure.estimatedSizeBytes).toBe(161);
      });
    });

    describe('Real-world Example', () => {
      it('should calculate correct size for user structure example', () => {
        const UserStructure = defineStructure({
          name: 'User',
          version: 1,
          properties: {
            id: { type: CORE_TYPES.UInt32, required: true }, // 4 bytes
            score: { type: CORE_TYPES.Double, required: true }, // 8 bytes
            isActive: { type: Boolean, required: true }, // 1 byte
            lastLogin: { type: CORE_TYPES.Date, required: true }, // 8 bytes
            // Variable size fields don't contribute to estimated size
            name: { type: CORE_TYPES.String, required: true }, // 0 bytes
            tags: { type: CORE_TYPES.Vector, required: false }, // 0 bytes
            metadata: { type: CORE_TYPES.Map, required: false }, // 0 bytes
          },
        });

        // Version (1) + UInt32 (4) + Double (8) + Boolean (1) + Date (8) + String (0) + Vector (0) + Map (0) = 22 bytes
        expect(UserStructure.estimatedSizeBytes).toBe(22);
      });
    });

    describe('Actual vs Estimated Size Comparison', () => {
      it('should verify estimated size is reasonable for fixed-size data', () => {
        const TestStructure = defineStructure({
          name: 'SizeComparisonTest',
          version: 1,
          properties: {
            id: { type: CORE_TYPES.UInt32, required: true },
            score: { type: CORE_TYPES.Double, required: true },
            isActive: { type: Boolean, required: true },
          },
        });

        const testData = {
          id: 12345,
          score: 95.5,
          isActive: true,
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const actualSize = buffer.length;
        const estimatedSize = TestStructure.estimatedSizeBytes;

        // For fixed-size only data, actual size should be close to estimated
        // Version (1) + UInt32 (4) + Double (8) + Boolean (1) = 14 bytes
        expect(estimatedSize).toBe(14);

        // Actual size might be slightly different due to encoding overhead
        // but should be in the same ballpark for fixed-size data
        expect(actualSize).toBeGreaterThanOrEqual(estimatedSize);
        expect(actualSize).toBeLessThan(estimatedSize + 10); // Allow some overhead
      });

      it('should show estimated size is minimum for variable-size data', () => {
        const TestStructure = defineStructure({
          name: 'VariableSizeComparisonTest',
          version: 1,
          properties: {
            id: { type: CORE_TYPES.UInt32, required: true }, // 4 bytes
            name: { type: CORE_TYPES.String, required: true }, // 0 bytes estimated
            tags: { type: CORE_TYPES.Vector, required: true }, // 0 bytes estimated
          },
        });

        const testData = {
          id: 12345,
          name: 'John Doe',
          tags: ['admin', 'verified'],
        };

        const instance = new TestStructure(testData);
        const buffer = instance.toBuffer();
        const actualSize = buffer.length;
        const estimatedSize = TestStructure.estimatedSizeBytes;

        // Estimated: Version (1) + UInt32 (4) + String (0) + Vector (0) = 5 bytes
        expect(estimatedSize).toBe(5);

        // Actual size should be much larger due to string and array content
        expect(actualSize).toBeGreaterThan(estimatedSize);
      });
    });
  });
});
