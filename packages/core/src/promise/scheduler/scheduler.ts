import { CancellablePromise } from '../../index.js';

export const SCHEDULER_JOB_FLAGS = {
  QUEUED: 1 << 0,
  ALLOW_RECURSE: 1 << 2,
  DISPOSED: 1 << 3,
} as const;

export namespace Scheduler {
  export type Job<T = any> = (() => T) & JobOptions;

  export type JobOptions = {
    id?: number;

    /**
     * flags can technically be undefined, but it can still be used in bitwise
     * operations just like 0.
     */
    flags?: number;

    jobName?: string;
  };
}

/**
 * Creates a microtask scheduler that batches jobs and flushes them in
 * priority order on the next tick.
 *
 * Jobs are functions queued via {@link Scheduler.queueJob}. Each job may carry
 * an optional numeric `id` used to order the queue — lower `id` runs first,
 * and jobs without an `id` run last. Re-queueing the same job within an
 * active flush cycle is a no-op unless `SCHEDULER_JOB_FLAGS.ALLOW_RECURSE`
 * is set on the job. Use {@link Scheduler.queueJobWait} when you need to
 * await a job's result through a {@link CancellablePromise}, and the
 * `onJob` / `onJobStart` / `onJobComplete` hooks to observe lifecycle.
 *
 * @example
 * ```typescript
 * const scheduler = createScheduler();
 *
 * const log = (msg: string) => () => console.log(msg);
 *
 * const first = log('first');
 * first.id = 1;
 * const second = log('second');
 * second.id = 2;
 *
 * scheduler.queueJob(second);
 * scheduler.queueJob(first);
 *
 * scheduler.nextTick().then(() => console.log('flushed'));
 * // → first
 * // → second
 * // → flushed
 * ```
 *
 * @group Promise
 */
export function createScheduler(): Scheduler {
  return new Scheduler();
}

export class Scheduler {
  protected queue: Scheduler.Job[] = [];
  protected flushIndex: number = -1;
  protected resolvedPromise: Promise<any> = Promise.resolve();
  protected currentFlushPromise: Promise<void> | null = null;
  protected onJobCbs: ((job: Scheduler.JobOptions) => void)[] = [];
  protected onJobStartCbs: ((job: Scheduler.JobOptions) => void)[] = [];
  protected onJobCompleteCbs: ((job: Scheduler.JobOptions) => void)[] = [];

  constructor() {
    for (const methodName of Object.getOwnPropertyNames(
      Object.getPrototypeOf(this),
    )) {
      (this as any)[methodName] = (this as any)[methodName].bind(this);
    }
  }

  onJob(fn: (job: Scheduler.JobOptions) => void): void {
    this.onJobCbs.push(fn);
  }

  onJobStart(fn: (job: Scheduler.JobOptions) => void): void {
    this.onJobStartCbs.push(fn);
  }

  onJobComplete(fn: (job: Scheduler.JobOptions) => void) {
    this.onJobCompleteCbs.push(fn);
  }

  nextTick(fn?: () => void): Promise<void> {
    const p = this.currentFlushPromise || this.resolvedPromise;
    return fn ? p.then(this ? fn.bind(this) : fn) : p;
  }

  queueJob<T>(job: Scheduler.Job<T>, opts?: Scheduler.JobOptions): void {
    if (opts) {
      Object.assign(job, opts);
    }

    if (!(job.flags! & SCHEDULER_JOB_FLAGS.QUEUED)) {
      const jobId = getId(job);
      const lastJob = this.queue[this.queue.length - 1];
      if (!lastJob || jobId >= getId(lastJob)) {
        this.queue.push(job);
      } else {
        this.queue.splice(this.findInsertionIndex(jobId), 0, job);
      }

      job.flags! |= SCHEDULER_JOB_FLAGS.QUEUED;
      this.queueFlush();

      for (const hookFn of this.onJobCbs) {
        hookFn(job);
      }
    }
  }

  queueJobWait<T>(
    job: Scheduler.Job<T>,
    opts?: Scheduler.JobOptions,
  ): CancellablePromise<Awaited<T>> {
    return new CancellablePromise((resolve, reject, onCancel) => {
      onCancel(() => {
        job.flags! |= SCHEDULER_JOB_FLAGS.DISPOSED;
        reject(new Error('Canceled'));
      });

      const fn: Scheduler.Job = () => {
        return Promise.resolve()
          .then(() => job() as any)
          .then(resolve)
          .catch(reject);
      };

      fn.id = job.id;
      fn.flags = job.flags;

      this.queueJob(fn, opts);
    });
  }

  protected findInsertionIndex(id: number) {
    let start = this.flushIndex + 1;
    let end = this.queue.length;

    while (start < end) {
      const middle = (start + end) >>> 1;
      const middleJob = this.queue[middle];
      const middleJobId = getId(middleJob);
      if (middleJobId < id) {
        start = middle + 1;
      } else {
        end = middle;
      }
    }

    return start;
  }

  protected async flushJobs(): Promise<void> {
    try {
      for (
        this.flushIndex = 0;
        this.flushIndex < this.queue.length;
        this.flushIndex++
      ) {
        const job = this.queue[this.flushIndex];
        if (job && !(job.flags! & SCHEDULER_JOB_FLAGS.DISPOSED)) {
          if (job.flags! & SCHEDULER_JOB_FLAGS.ALLOW_RECURSE) {
            job.flags! &= ~SCHEDULER_JOB_FLAGS.QUEUED;
          }

          for (const hookFn of this.onJobStartCbs) {
            hookFn(job);
          }

          await job();

          for (const hookFn of this.onJobCompleteCbs) {
            hookFn(job);
          }

          if (!(job.flags! & SCHEDULER_JOB_FLAGS.ALLOW_RECURSE)) {
            job.flags! &= ~SCHEDULER_JOB_FLAGS.QUEUED;
          }
        }
      }
    } finally {
      // If there was an error we still need to clear the QUEUED flags
      for (; this.flushIndex < this.queue.length; this.flushIndex++) {
        const job = this.queue[this.flushIndex];
        if (job) {
          job.flags! &= ~SCHEDULER_JOB_FLAGS.QUEUED;
        }
      }

      this.flushIndex = -1;
      this.queue.length = 0;

      this.currentFlushPromise = null;
      // If new jobs have been added to either queue, keep flushing
      if (this.queue.length) {
        return this.flushJobs();
      }
    }
  }

  protected queueFlush() {
    if (!this.currentFlushPromise) {
      this.currentFlushPromise = this.resolvedPromise.then(this.flushJobs);
    }
  }
}
function getId(job: Scheduler.Job): number {
  return job.id == null ? Infinity : job.id;
}
