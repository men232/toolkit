import { assert } from '@/assert';
import { type Defer, defer } from '@/promise/defer';
import { toError } from '@/toError';
import type { Awaitable } from '@/types';
import { SimpleEventEmitter } from '../SimpleEventEmitter';
import { asyncForEach } from '../asyncForEach';

/**
 * Configuration options for creating a ResourcePool instance.
 * @template T The type of resource being pooled
 */
export interface ResourcePoolOptions<T = unknown> {
  /** Maximum number of resources that can exist in the pool */
  poolSize: number;

  /**
   * Whether to automatically create resources when needed, up to poolSize limit.
   * If false, resources must be pre-created or acquired requests will queue.
   * @default false
   */
  auto?: boolean;

  /** Factory function to create new resources */
  createResource: () => Awaitable<T>;

  /** Optional cleanup function called when destroying resources */
  destroyResource?: (resource: T) => Awaitable<void>;
}

export type ResourcePoolEventMap = {
  error: [error: Error];
};

/**
 * Internal state container for ResourcePool to group related data.
 * @template T The type of resource being pooled
 * @internal
 */
interface PoolState<T> {
  /** Resources currently available for acquisition */
  availableResources: T[];
  /** Resources currently in use by consumers */
  inUseResources: Set<T>;
  /** Queue of pending acquisition requests waiting for resources */
  queueAcquire: Defer<T>[];
  /** Queue of drain requests waiting for all resources to be released */
  queueDrain: Defer<void>[];
  /** Queue of destroy requests waiting for destruction to complete */
  queueDestroy: Defer<void>[];
  /** Flag indicating if the pool is currently being destroyed */
  destroying: boolean;
}

/**
 * A generic resource pool that manages the lifecycle of expensive resources.
 *
 * ResourcePool provides a way to:
 * - Limit the number of concurrent resources (e.g., database connections, file handles)
 * - Reuse resources to avoid creation/destruction overhead
 * - Queue requests when all resources are in use
 * - Automatically create resources on demand (when auto mode is enabled)
 * - Gracefully handle resource cleanup and pool destruction
 *
 * @template T The type of resource being pooled
 *
 * @example
 * ```typescript
 * // Database connection pool
 * const dbPool = new ResourcePool({
 *   poolSize: 10,
 *   auto: true,
 *   createResource: () => createDatabaseConnection(),
 *   destroyResource: (conn) => conn.close()
 * });
 *
 * // Acquire and use a connection
 * const conn = await dbPool.acquire();
 * try {
 *   const result = await conn.query('SELECT * FROM users');
 *   return result;
 * } finally {
 *   dbPool.release(conn);
 * }
 * ```
 *
 * @group Promise
 */
export class ResourcePool<
  T = unknown,
> extends SimpleEventEmitter<ResourcePoolEventMap> {
  private readonly poolSize: number;
  private readonly auto: boolean;
  private readonly createResource: () => Awaitable<T>;
  private readonly destroyResource?: (resource: T) => Awaitable<void>;
  private readonly state: PoolState<T>;

  /**
   * Creates a new ResourcePool instance.
   *
   * @param options Configuration options for the pool
   *
   * @example
   * ```typescript
   * const pool = new ResourcePool({
   *   poolSize: 5,
   *   auto: true,
   *   createResource: async () => new DatabaseConnection(),
   *   destroyResource: async (conn) => conn.close()
   * });
   * ```
   */
  constructor({
    poolSize,
    auto = false,
    createResource,
    destroyResource,
  }: ResourcePoolOptions<T>) {
    super();
    this.poolSize = poolSize;
    this.auto = auto;
    this.createResource = createResource;
    this.destroyResource = destroyResource;
    this.removeAllListeners('error');

    this.state = {
      availableResources: [],
      inUseResources: new Set(),
      queueAcquire: [],
      queueDrain: [],
      queueDestroy: [],
      destroying: false,
    };
  }

  /**
   * Whether the pool is idle (no resources currently in use).
   * Useful for determining if it's safe to destroy the pool.
   */
  get isIdle(): boolean {
    return this.state.inUseResources.size === 0;
  }

  /** Number of resources currently available for acquisition */
  get availableCount(): number {
    return this.state.availableResources.length;
  }

  /** Number of resources currently in use */
  get usedCount(): number {
    return this.state.inUseResources.size;
  }

  /** Maximum number of resources this pool can manage */
  get size(): number {
    return this.poolSize;
  }

  /**
   * Acquires a resource from the pool.
   *
   * This method will:
   * 1. Return an available resource immediately if one exists
   * 2. Create a new resource if auto mode is enabled and under the pool limit
   * 3. Queue the request and wait if no resources are available
   *
   * @returns Promise that resolves to an acquired resource
   * @throws Error if the pool is destroyed while waiting (when rejectAcquires is true)
   *
   * @example
   * ```typescript
   * const resource = await pool.acquire();
   * try {
   *   // Use the resource
   *   await resource.doSomething();
   * } finally {
   *   pool.release(resource); // Always release in finally block
   * }
   * ```
   */
  async acquire(): Promise<T> {
    if (this.state.destroying) {
      return this.enqueueAcquireRequest();
    }
    let availableResource = this.tryGetAvailableResource();
    if (availableResource !== null) {
      return availableResource;
    }

    const autoCreatedResource = await this.tryCreateAutoResource();
    if (autoCreatedResource !== null) {
      return autoCreatedResource;
    }

    // Check for available resources again, maybe someone free now
    availableResource = this.tryGetAvailableResource();
    if (availableResource !== null) {
      return availableResource;
    }

    return this.enqueueAcquireRequest();
  }

  /**
   * Returns a resource to the pool, making it available for reuse.
   *
   * The resource will be made available to the next queued acquisition request,
   * or returned to the available pool if no requests are pending.
   *
   * @param resource The resource to return to the pool
   *
   * @example
   * ```typescript
   * const resource = await pool.acquire();
   * try {
   *   // Use resource...
   * } finally {
   *   pool.release(resource); // Always release when done
   * }
   * ```
   *
   * @remarks
   * - Safe to call multiple times with the same resource (idempotent)
   * - Only resources that were acquired from this pool should be released
   * - Triggers drain completion if this was the last resource in use
   */
  release(resource: T): void {
    if (!this.state.inUseResources.has(resource)) {
      return;
    }

    this.processNextAcquireRequest(resource);
    this.checkForDrainCompletion();
  }

  /**
   * Manually add a resource to the pool.
   *
   * @param resource The resource to return to the pool
   *
   * @throws Error if resource already exists in the pool.
   * @throws Error if size reached.
   */
  add(resource: T): void {
    assert.ok(
      this.poolSize >
        this.state.availableResources.length + this.state.inUseResources.size,
      'Pool size reached',
    );

    assert.ok(
      !this.state.inUseResources.has(resource) &&
        !this.state.availableResources.includes(resource),
      'This resource already added to the pool',
    );

    this.state.inUseResources.add(resource);
    this.processNextAcquireRequest(resource);
  }

  /**
   * Waits for all currently acquired resources to be released.
   *
   * This is useful for graceful shutdown scenarios where you want to ensure
   * all work is completed before destroying the pool.
   *
   * @returns Promise that resolves when all resources are returned to the pool
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * console.log('Waiting for all connections to be released...');
   * await pool.drain();
   * console.log('All connections released, safe to destroy pool');
   * await pool.destroy();
   * ```
   *
   * @remarks
   * - Resolves immediately if no resources are currently in use
   * - Multiple drain calls can be made concurrently; they will all resolve together
   * - Does not prevent new acquisitions; use destroy() to prevent new usage
   */
  async drain(): Promise<void> {
    if (this.isIdle) {
      return;
    }

    const drainDefer = defer<void>();
    this.state.queueDrain.push(drainDefer);
    return drainDefer.promise;
  }

  /**
   * Destroys the pool and all its resources.
   *
   * This method will:
   * 1. Wait for all resources to be released (drain)
   * 2. Optionally reject any pending acquisition requests
   * 3. Call destroyResource() on all available resources
   * 4. Clean up internal state
   *
   * @param rejectAcquires Whether to reject pending acquire() requests with an error
   *                       If false, pending requests will remain queued indefinitely
   * @returns Promise that resolves when destruction is complete
   *
   * @example
   * ```typescript
   * // Graceful shutdown - let pending requests complete
   * await pool.destroy(false);
   *
   * // Immediate shutdown - reject pending requests
   * await pool.destroy(true);
   * ```
   *
   * @remarks
   * - Safe to call multiple times; subsequent calls will wait for the first to complete
   * - The pool cannot be used after destruction
   * - Resources currently in use will not be force-destroyed; drain() is called first
   * - If destroyResource was not provided, resources are simply discarded
   */
  async destroy(rejectAcquires = false): Promise<void> {
    if (this.state.destroying) {
      return this.enqueueDestroyRequest();
    }

    this.state.destroying = true;

    try {
      await this.drain();

      if (rejectAcquires) {
        this.rejectPendingAcquires();
      }

      await this.destroyAllResources();
      this.resetState();
    } catch (err) {
      this.emit('error', toError(err));
    } finally {
      this.state.destroying = false;
      this.resolveDestroyQueue();
    }
  }

  private tryGetAvailableResource(): T | null {
    if (this.state.availableResources.length === 0) {
      return null;
    }

    const resource = this.state.availableResources.pop()!;
    this.state.inUseResources.add(resource);
    return resource;
  }

  private async tryCreateAutoResource(): Promise<T | null> {
    if (!this.auto || this.state.inUseResources.size >= this.poolSize) {
      return null;
    }

    const resource = await this.createResource();
    this.state.inUseResources.add(resource);
    return resource;
  }

  private enqueueAcquireRequest(): Promise<T> {
    const acquireDefer = defer<T>();
    this.state.queueAcquire.push(acquireDefer);
    return acquireDefer.promise;
  }

  private moveResourceToAvailable(resource: T): void {
    this.state.inUseResources.delete(resource);
    this.state.availableResources.push(resource);
  }

  private processNextAcquireRequest(resource: T): void {
    if (this.state.destroying || this.state.queueAcquire.length === 0) {
      this.moveResourceToAvailable(resource);
      return;
    }

    const nextRequest = this.state.queueAcquire.shift()!;
    nextRequest.resolve(resource);
  }

  private checkForDrainCompletion(): void {
    if (this.isIdle && this.state.queueDrain.length > 0) {
      this.state.queueDrain.forEach(deferred => deferred.resolve());
      this.state.queueDrain = [];
    }
  }

  private enqueueDestroyRequest(): Promise<void> {
    const destroyDefer = defer<void>();
    this.state.queueDestroy.push(destroyDefer);
    return destroyDefer.promise;
  }

  private rejectPendingAcquires(): void {
    const destroyError = new Error('ResourcePool destroyed');
    this.state.queueAcquire.forEach(deferred => deferred.reject(destroyError));
    this.state.queueAcquire = [];
  }

  private async destroyAllResources(): Promise<void> {
    if (!this.destroyResource || this.state.availableResources.length === 0) {
      return;
    }

    await asyncForEach(
      this.state.availableResources,
      async resource => {
        try {
          await this.destroyResource!(resource);
        } catch (err) {
          this.emit('error', toError(err));
        }
      },
      { concurrency: 4 },
    );
  }

  private resetState(): void {
    this.state.availableResources = [];
  }

  private resolveDestroyQueue(): void {
    this.state.queueDestroy.forEach(deferred => deferred.resolve());
    this.state.queueDestroy = [];
  }
}
