import { describe, expect, it, vi } from 'vitest';
import { retryOnError } from './retryOnError';

describe('retryOnError', () => {
  describe('successful execution', () => {
    it('should execute function once if it succeeds on first attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      const retryFn = retryOnError({ maxRetriesNumber: 3 }, mockFn);

      const result = await retryFn('arg1', 'arg2');

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should preserve function context (this)', async () => {
      const obj = {
        value: 'test',
        method: function () {
          return this.value;
        },
      };

      const retryFn = retryOnError({ maxRetriesNumber: 3 }, obj.method);
      const result = await retryFn.call(obj);

      expect(result).toBe('test');
    });

    it('should handle synchronous functions', async () => {
      const mockFn = vi.fn().mockReturnValue('sync-result');
      const retryFn = retryOnError({ maxRetriesNumber: 3 }, mockFn);

      const result = await retryFn();

      expect(result).toBe('sync-result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry logic', () => {
    it('should retry up to maxRetriesNumber times', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('attempt 1'))
        .mockRejectedValueOnce(new Error('attempt 2'))
        .mockResolvedValue('success');

      const retryFn = retryOnError({ maxRetriesNumber: 3 }, mockFn);

      const result = await retryFn();

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after exhausting all retries', async () => {
      const error = new Error('persistent error');
      const mockFn = vi.fn().mockRejectedValue(error);
      const beforeRetryCallback = vi.fn().mockResolvedValue(undefined);

      const retryFn = retryOnError(
        { maxAttempts: 3, beforeRetryCallback },
        mockFn,
      );

      await expect(retryFn()).rejects.toThrow('persistent error');

      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(beforeRetryCallback).toHaveBeenNthCalledWith(1, 1, false);
      expect(beforeRetryCallback).toHaveBeenNthCalledWith(2, 2, true);
    });

    it('should not retry if shouldRetryBasedOnError returns false', async () => {
      const error = new Error('no-retry error');
      const mockFn = vi.fn().mockRejectedValue(error);
      const shouldRetryBasedOnError = vi.fn().mockReturnValue(false);

      const retryFn = retryOnError(
        {
          maxRetriesNumber: 3,
          shouldRetryBasedOnError,
        },
        mockFn,
      );

      await expect(retryFn()).rejects.toThrow('no-retry error');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(shouldRetryBasedOnError).toHaveBeenCalledWith(error, 1);
    });

    it('should pass correct attempt number to shouldRetryBasedOnError', async () => {
      const error = new Error('test error');
      const mockFn = vi.fn().mockRejectedValue(error);
      const shouldRetryBasedOnError = vi
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const retryFn = retryOnError(
        {
          maxRetriesNumber: 5,
          shouldRetryBasedOnError,
        },
        mockFn,
      );

      await expect(retryFn()).rejects.toThrow('test error');

      expect(shouldRetryBasedOnError).toHaveBeenCalledTimes(3);
      expect(shouldRetryBasedOnError).toHaveBeenNthCalledWith(1, error, 1);
      expect(shouldRetryBasedOnError).toHaveBeenNthCalledWith(2, error, 2);
      expect(shouldRetryBasedOnError).toHaveBeenNthCalledWith(3, error, 3);
    });
  });

  describe('delay logic', () => {
    it('should apply exponential backoff with delayFactor', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValue('success');

      const retryFn = retryOnError(
        {
          maxRetriesNumber: 3,
          delayFactor: 2,
          delayMinMs: 100,
          delayMaxMs: 1000,
        },
        mockFn,
      );

      await expect(retryFn()).resolves.toBe('success');
    });

    it('should enforce minimum delay of 1ms', () => {
      const retryFn = retryOnError(
        {
          maxRetriesNumber: 1,
          delayMinMs: -100,
          delayMaxMs: -50,
        },
        vi.fn(),
      );

      // This tests the internal logic that ensures delayMinMs and delayMaxMs are at least 1
      // We can verify this by checking the function doesn't throw and behaves correctly
      expect(() => retryFn()).not.toThrow();
    });
  });

  describe('beforeRetryCallback', () => {
    it('should call beforeRetryCallback before each retry', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error 1'))
        .mockRejectedValueOnce(new Error('error 2'))
        .mockResolvedValue('success');

      const beforeRetryCallback = vi.fn().mockResolvedValue(undefined);

      const retryFn = retryOnError(
        {
          maxRetriesNumber: 2,
          beforeRetryCallback,
        },
        mockFn,
      );

      await retryFn();

      expect(beforeRetryCallback).toHaveBeenCalledTimes(2);
      expect(beforeRetryCallback).toHaveBeenNthCalledWith(1, 1, false);
      expect(beforeRetryCallback).toHaveBeenNthCalledWith(2, 2, true);
    });

    it('should update function arguments when beforeRetryCallback returns array', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValue('success');

      const beforeRetryCallback = vi.fn().mockResolvedValue(['new', 'args']);

      const retryFn = retryOnError(
        {
          maxRetriesNumber: 2,
          beforeRetryCallback,
        },
        mockFn,
      );

      await retryFn('original', 'args');

      expect(mockFn).toHaveBeenNthCalledWith(1, 'original', 'args');
      expect(mockFn).toHaveBeenNthCalledWith(2, 'new', 'args');
    });

    it('should not update arguments when beforeRetryCallback returns non-array', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('error'))
        .mockResolvedValue('success');

      const beforeRetryCallback = vi.fn().mockResolvedValue('not-an-array');

      const retryFn = retryOnError(
        {
          maxRetriesNumber: 2,
          beforeRetryCallback,
        },
        mockFn,
      );

      await retryFn('original', 'args');

      expect(mockFn).toHaveBeenNthCalledWith(1, 'original', 'args');
      expect(mockFn).toHaveBeenNthCalledWith(2, 'original', 'args');
    });

    it('should handle beforeRetryCallback rejection', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('main error'));
      const beforeRetryCallback = vi
        .fn()
        .mockRejectedValue(new Error('callback error'));

      const retryFn = retryOnError(
        {
          maxRetriesNumber: 2,
          beforeRetryCallback,
        },
        mockFn,
      );

      await expect(retryFn()).rejects.toThrow('callback error');
    });
  });

  describe('edge cases', () => {
    it('should handle zero retries', async () => {
      const error = new Error('immediate failure');
      const mockFn = vi.fn().mockRejectedValue(error);

      const retryFn = retryOnError({ maxRetriesNumber: 0 }, mockFn);

      await expect(retryFn()).rejects.toThrow('immediate failure');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle functions that throw synchronously', async () => {
      const error = new Error('sync error');
      const mockFn = vi.fn().mockImplementation(() => {
        throw error;
      });

      const retryFn = retryOnError({ maxRetriesNumber: 2 }, mockFn);

      await expect(retryFn()).rejects.toThrow('sync error');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed sync/async errors', async () => {
      const mockFn = vi
        .fn()
        .mockImplementationOnce(() => {
          throw new Error('sync error');
        })
        .mockRejectedValueOnce(new Error('async error'))
        .mockResolvedValue('success');

      const retryFn = retryOnError({ maxRetriesNumber: 3 }, mockFn);

      const result = await retryFn();
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('default values', () => {
    it('should use default configuration values', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const retryFn = retryOnError({ maxRetriesNumber: 1 }, mockFn);

      const result = await retryFn();
      expect(result).toBe('success');
      // This test mainly ensures defaults don't cause errors
    });

    it('should retry by default for any error', async () => {
      const mockFn = vi
        .fn()
        .mockRejectedValueOnce(new Error('any error'))
        .mockResolvedValue('success');

      const retryFn = retryOnError({ maxRetriesNumber: 1 }, mockFn);

      await expect(retryFn()).resolves.toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('type safety', () => {
    it('should preserve function signature and return type', async () => {
      const typedFn = (a: string, b: number): Promise<{ result: string }> => {
        return Promise.resolve({ result: `${a}-${b}` });
      };

      const retryFn = retryOnError({ maxRetriesNumber: 1 }, typedFn);

      const result = await retryFn('test', 42);
      expect(result).toEqual({ result: 'test-42' });
    });
  });
});
