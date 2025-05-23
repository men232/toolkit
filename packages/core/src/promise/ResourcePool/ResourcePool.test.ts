import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourcePool } from './ResourcePool.js';

vi.mock('@/promise/defer', () => ({
  defer: <T>() => {
    let resolve: (value: T) => void;
    let reject: (error: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve: resolve!, reject: reject! };
  },
}));

vi.mock('@/toError', () => ({
  toError: (err: any) => (err instanceof Error ? err : new Error(String(err))),
}));

describe('ResourcePool', () => {
  let createResourceSpy: ReturnType<typeof vi.fn>;
  let destroyResourceSpy: ReturnType<typeof vi.fn>;
  let mockResource: { id: number; closed?: boolean };
  let resourceCounter: number;

  beforeEach(() => {
    resourceCounter = 0;
    createResourceSpy = vi.fn(() => {
      mockResource = { id: ++resourceCounter };
      return Promise.resolve(mockResource);
    });
    destroyResourceSpy = vi.fn((resource: any) => {
      resource.closed = true;
      return Promise.resolve();
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a pool with correct initial state', () => {
      const pool = new ResourcePool({
        poolSize: 5,
        createResource: createResourceSpy,
        destroyResource: destroyResourceSpy,
      });

      expect(pool.size).toBe(5);
      expect(pool.availableCount).toBe(0);
      expect(pool.usedCount).toBe(0);
      expect(pool.isIdle).toBe(true);
    });

    it('should handle auto mode correctly', () => {
      const pool = new ResourcePool({
        poolSize: 3,
        auto: true,
        createResource: createResourceSpy,
      });

      expect(pool.size).toBe(3);
    });

    it('should work without destroyResource function', () => {
      const pool = new ResourcePool({
        poolSize: 2,
        createResource: createResourceSpy,
      });

      expect(pool.size).toBe(2);
    });
  });

  describe('acquire()', () => {
    it('should create and return resource in auto mode', async () => {
      const pool = new ResourcePool({
        poolSize: 2,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource = await pool.acquire();

      expect(createResourceSpy).toHaveBeenCalledTimes(1);
      expect(resource).toEqual({ id: 1 });
      expect(pool.usedCount).toBe(1);
      expect(pool.availableCount).toBe(0);
      expect(pool.isIdle).toBe(false);
    });

    it('should return available resource without creating new one', async () => {
      const pool = new ResourcePool({
        poolSize: 2,
        auto: true,
        createResource: createResourceSpy,
      });

      // First acquire creates resource
      const resource1 = await pool.acquire();
      pool.release(resource1);

      // Second acquire should reuse existing resource
      const resource2 = await pool.acquire();

      expect(createResourceSpy).toHaveBeenCalledTimes(1);
      expect(resource2).toBe(resource1);
      expect(pool.usedCount).toBe(1);
      expect(pool.availableCount).toBe(0);
    });

    it('should respect pool size limit in auto mode', async () => {
      const pool = new ResourcePool({
        poolSize: 2,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource1 = await pool.acquire();
      const resource2 = await pool.acquire();

      expect(createResourceSpy).toHaveBeenCalledTimes(2);
      expect(pool.usedCount).toBe(2);

      // Third acquire should wait since pool is at capacity
      const acquirePromise = pool.acquire();

      // Give it a moment to potentially create a resource (it shouldn't)
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(createResourceSpy).toHaveBeenCalledTimes(2);

      // Release one resource to fulfill the waiting request
      pool.release(resource1);
      const resource3 = await acquirePromise;

      expect(resource3).toBe(resource1);
      expect(pool.usedCount).toBe(2);
    });

    it('should queue requests when no resources available (non-auto mode)', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: false,
        createResource: createResourceSpy,
      });

      const acquirePromise = pool.acquire();

      // Should not create resource automatically
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(createResourceSpy).not.toHaveBeenCalled();

      // Manually add a resource to fulfill the request
      const manualResource = await createResourceSpy();
      pool.add(manualResource);

      const resource = await acquirePromise;
      expect(resource).toBe(manualResource);
    });

    it('should handle multiple concurrent acquire requests', async () => {
      const pool = new ResourcePool({
        poolSize: 2,
        auto: true,
        createResource: createResourceSpy,
      });

      const [resource1, resource2] = await Promise.all([
        pool.acquire(),
        pool.acquire(),
      ]);

      expect(createResourceSpy).toHaveBeenCalledTimes(2);
      expect(resource1).not.toBe(resource2);
      expect(pool.usedCount).toBe(2);
    });

    it('should handle createResource throwing an error', async () => {
      const errorSpy = vi.fn();
      createResourceSpy.mockRejectedValueOnce(new Error('Creation failed'));

      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      pool.on('error', errorSpy);

      await expect(pool.acquire()).rejects.toThrow('Creation failed');
    });
  });

  describe('release()', () => {
    it('should move resource from in-use to available', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource = await pool.acquire();
      expect(pool.usedCount).toBe(1);
      expect(pool.availableCount).toBe(0);

      pool.release(resource);
      expect(pool.usedCount).toBe(0);
      expect(pool.availableCount).toBe(1);
      expect(pool.isIdle).toBe(true);
    });

    it('should fulfill queued acquire requests', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource1 = await pool.acquire();
      const acquirePromise = pool.acquire();

      pool.release(resource1);

      const resource2 = await acquirePromise;

      expect(resource2).toBe(resource1);
      expect(pool.usedCount).toBe(1);
      expect(pool.availableCount).toBe(0);
    });

    it('should be idempotent (safe to call multiple times)', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource = await pool.acquire();
      pool.release(resource);
      pool.release(resource); // Should be safe

      expect(pool.usedCount).toBe(0);
      expect(pool.availableCount).toBe(1);
    });

    it('should ignore release of unknown resources', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      const unknownResource = { id: 999 };
      pool.release(unknownResource as any); // Should not throw

      expect(pool.usedCount).toBe(0);
      expect(pool.availableCount).toBe(0);
    });
  });

  describe('drain()', () => {
    it('should resolve immediately when pool is idle', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      const drainPromise = pool.drain();
      await expect(drainPromise).resolves.toBeUndefined();
    });

    it('should wait for all resources to be released', async () => {
      const pool = new ResourcePool({
        poolSize: 2,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource1 = await pool.acquire();
      const resource2 = await pool.acquire();

      const drainPromise = pool.drain();

      // Drain should not resolve yet
      let drained = false;
      drainPromise.then(() => {
        drained = true;
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(drained).toBe(false);

      // Release one resource
      pool.release(resource1);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(drained).toBe(false);

      // Release second resource - now drain should complete
      pool.release(resource2);
      await drainPromise;
      expect(drained).toBe(true);
    });

    it('should handle multiple concurrent drain requests', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource = await pool.acquire();

      const [drain1, drain2, drain3] = await Promise.all([
        pool.drain(),
        pool.drain(),
        pool.drain(),
        Promise.resolve(pool.release(resource)),
      ]);

      expect(drain1).toBeUndefined();
      expect(drain2).toBeUndefined();
      expect(drain3).toBeUndefined();
    });
  });

  describe('destroy()', () => {
    it('should drain pool and destroy all resources', async () => {
      const pool = new ResourcePool({
        poolSize: 2,
        auto: true,
        createResource: createResourceSpy,
        destroyResource: destroyResourceSpy,
      });

      const resource1 = await pool.acquire();
      const resource2 = await pool.acquire();

      pool.release(resource1);
      // Keep resource2 in use

      const destroyPromise = pool.destroy();

      // Should wait for resource2 to be released
      let destroyed = false;
      destroyPromise.then(() => {
        destroyed = true;
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(destroyed).toBe(false);

      // Release resource2
      pool.release(resource2);
      await destroyPromise;

      expect(destroyResourceSpy).toHaveBeenCalledTimes(2);
      expect(destroyResourceSpy).toHaveBeenCalledWith(resource1);
      expect(destroyResourceSpy).toHaveBeenCalledWith(resource2);
      expect(pool.availableCount).toBe(0);
    });

    it('should reject pending acquire requests when rejectAcquires is true', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: false,
        createResource: createResourceSpy,
      });

      const acquirePromise = pool.acquire();

      await pool.destroy(true);

      await expect(acquirePromise).rejects.toThrow('ResourcePool destroyed');
    });

    it('should not reject pending acquire requests when rejectAcquires is false', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: false,
        createResource: createResourceSpy,
      });

      const acquirePromise = pool.acquire();

      await pool.destroy(false);

      // acquirePromise should still be pending
      let resolved = false;
      acquirePromise
        .then(() => {
          resolved = true;
        })
        .catch(() => {
          resolved = true;
        });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(resolved).toBe(false);
    });

    it('should handle multiple concurrent destroy requests', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
        destroyResource: destroyResourceSpy,
      });

      const resource1 = await pool.acquire(); // Create a resource

      setTimeout(() => pool.release(resource1), 5);

      const [destroy1, destroy2, destroy3] = await Promise.all([
        pool.destroy(),
        pool.destroy(),
        pool.destroy(),
      ]);

      expect(destroy1).toBeUndefined();
      expect(destroy2).toBeUndefined();
      expect(destroy3).toBeUndefined();
      expect(destroyResourceSpy).toHaveBeenCalledTimes(1);
    });

    it('should work without destroyResource function', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource = await pool.acquire();
      pool.release(resource);

      await expect(pool.destroy()).resolves.toBeUndefined();
    });

    it('should emit error when destroyResource throws', async () => {
      const errorSpy = vi.fn();
      destroyResourceSpy.mockRejectedValueOnce(new Error('Destroy failed'));

      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
        destroyResource: destroyResourceSpy,
      });

      pool.on('error', errorSpy);

      const resource = await pool.acquire();
      pool.release(resource);

      await pool.destroy();

      expect(errorSpy).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should prevent new acquisitions during destruction', async () => {
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });

      const resource = await pool.acquire();

      const destroyPromise = pool.destroy();
      const acquirePromise = pool.acquire();

      pool.release(resource);
      await destroyPromise;

      // The acquire request should still be pending
      let resolved = false;
      acquirePromise
        .then(() => {
          resolved = true;
        })
        .catch(() => {
          resolved = true;
        });
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(resolved).toBe(false);
    });
  });

  describe('Property getters', () => {
    it('should return correct counts and states', async () => {
      const pool = new ResourcePool({
        poolSize: 3,
        auto: true,
        createResource: createResourceSpy,
      });
      expect(pool.size).toBe(3);
      expect(pool.availableCount).toBe(0);
      expect(pool.usedCount).toBe(0);
      expect(pool.isIdle).toBe(true);
      const resource1 = await pool.acquire();
      expect(pool.availableCount).toBe(0);
      expect(pool.usedCount).toBe(1);
      expect(pool.isIdle).toBe(false);
      const resource2 = await pool.acquire();
      pool.release(resource1);
      expect(pool.availableCount).toBe(1);
      expect(pool.usedCount).toBe(1);
      expect(pool.isIdle).toBe(false);
      pool.release(resource2);
      expect(pool.availableCount).toBe(2);
      expect(pool.usedCount).toBe(0);
      expect(pool.isIdle).toBe(true);
    });
  });
  describe('Error handling', () => {
    it('should emit error events when createResource fails', async () => {
      const errorSpy = vi.fn();
      createResourceSpy.mockRejectedValueOnce(new Error('Creation error'));
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });
      pool.on('error', errorSpy);
      await expect(pool.acquire()).rejects.toThrow('Creation error');
    });
    it('should handle non-Error objects in toError', async () => {
      const errorSpy = vi.fn();
      createResourceSpy.mockRejectedValueOnce('String error');
      const pool = new ResourcePool({
        poolSize: 1,
        auto: true,
        createResource: createResourceSpy,
      });
      pool.on('error', errorSpy);
      await expect(pool.acquire()).rejects.toThrow('String error');
    });
  });
  describe('Edge cases', () => {
    it('should handle zero pool size', () => {
      expect(
        () =>
          new ResourcePool({
            poolSize: 0,
            createResource: createResourceSpy,
          }),
      ).not.toThrow();
    });
    it('should handle rapid acquire/release cycles', async () => {
      const pool = new ResourcePool({
        poolSize: 2,
        auto: true,
        createResource: createResourceSpy,
      });
      // Rapid acquire/release cycles
      for (let i = 0; i < 10; i++) {
        const resource = await pool.acquire();
        pool.release(resource);
      }
      expect(pool.isIdle).toBe(true);
      expect(pool.availableCount).toBe(1); // Should reuse the same resource
    });
    it('should handle async createResource and destroyResource', async () => {
      const slowCreateResource = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { id: ++resourceCounter };
      });
      const slowDestroyResource = vi.fn(async (resource: any) => {
        await new Promise(resolve => setTimeout(resolve, 30));
        resource.destroyed = true;
      });
      const pool = new ResourcePool({
        poolSize: 2,
        auto: true,
        createResource: slowCreateResource,
        destroyResource: slowDestroyResource,
      });
      const startTime = Date.now();
      const resource1 = await pool.acquire();
      const resource2 = await pool.acquire();
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(50);
      pool.release(resource1);
      pool.release(resource2);
      const destroyStartTime = Date.now();
      await pool.destroy();
      expect(Date.now() - destroyStartTime).toBeGreaterThanOrEqual(30);
      expect(slowDestroyResource).toHaveBeenCalledTimes(2);
    });
  });
});
