import { describe, expect, it, test, vi } from 'vitest';
import {
  SCHEDULER_JOB_FLAGS,
  type Scheduler,
  createScheduler,
} from './scheduler';

describe('scheduler', () => {
  const { nextTick, queueJob } = createScheduler();

  it('nextTick', async () => {
    const calls: string[] = [];
    const dummyThen = Promise.resolve().then();
    const job1 = () => {
      calls.push('job1');
    };
    const job2 = () => {
      calls.push('job2');
    };
    nextTick(job1);
    job2();

    expect(calls.length).toBe(1);
    await dummyThen;
    // job1 will be pushed in nextTick
    expect(calls.length).toBe(2);
    expect(calls).toMatchObject(['job2', 'job1']);
  });

  describe('queueJob', () => {
    it('basic usage', async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push('job1');
      };
      const job2 = () => {
        calls.push('job2');
      };
      queueJob(job1);
      queueJob(job2);
      expect(calls).toEqual([]);
      await nextTick();
      expect(calls).toEqual(['job1', 'job2']);
    });

    it("should insert jobs in ascending order of job's id when flushing", async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push('job1');

        queueJob(job2);
        queueJob(job3);
      };

      const job2 = () => {
        calls.push('job2');
        queueJob(job4);
        queueJob(job5);
      };
      job2.id = 10;

      const job3 = () => {
        calls.push('job3');
      };
      job3.id = 1;

      const job4 = () => {
        calls.push('job4');
      };

      const job5 = () => {
        calls.push('job5');
      };

      queueJob(job1);

      expect(calls).toEqual([]);
      await nextTick();
      expect(calls).toEqual(['job1', 'job3', 'job2', 'job4', 'job5']);
    });

    it('should dedupe queued jobs', async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push('job1');
      };
      const job2 = () => {
        calls.push('job2');
      };
      queueJob(job1);
      queueJob(job2);
      queueJob(job1);
      queueJob(job2);
      expect(calls).toEqual([]);
      await nextTick();
      expect(calls).toEqual(['job1', 'job2']);
    });

    it('queueJob while flushing', async () => {
      const calls: string[] = [];
      const job1 = () => {
        calls.push('job1');
        // job2 will be executed after job1 at the same tick
        queueJob(job2);
      };
      const job2 = () => {
        calls.push('job2');
      };
      queueJob(job1);

      await nextTick();
      expect(calls).toEqual(['job1', 'job2']);
    });
  });

  test('nextTick should capture scheduler flush errors', async () => {
    const err = new Error('test');

    queueJob(() => {
      throw err;
    });

    try {
      await nextTick();
    } catch (e: any) {
      expect(e).toBe(err);
    }

    // this one should no longer error
    await nextTick();
  });

  test('jobs can be re-queued after an error', async () => {
    const err = new Error('test');
    let shouldThrow = true;

    const job1: Scheduler.Job = vi.fn(() => {
      if (shouldThrow) {
        shouldThrow = false;
        throw err;
      }
    });
    job1.id = 1;

    const job2: Scheduler.Job = vi.fn();
    job2.id = 2;

    queueJob(job1);
    queueJob(job2);

    try {
      await nextTick();
    } catch (e: any) {
      expect(e).toBe(err);
    }

    expect(job1).toHaveBeenCalledTimes(1);
    expect(job2).toHaveBeenCalledTimes(0);

    queueJob(job1);
    queueJob(job2);

    await nextTick();

    expect(job1).toHaveBeenCalledTimes(2);
    expect(job2).toHaveBeenCalledTimes(1);
  });

  test('should prevent self-triggering jobs by default', async () => {
    let count = 0;
    const job = () => {
      if (count < 3) {
        count++;
        queueJob(job);
      }
    };
    queueJob(job);
    await nextTick();
    // only runs once - a job cannot queue itself
    expect(count).toBe(1);
  });

  test('recursive jobs can only be queued once non-recursively', async () => {
    const job: Scheduler.Job = vi.fn();
    job.id = 1;
    job.flags = SCHEDULER_JOB_FLAGS.ALLOW_RECURSE;

    queueJob(job);
    queueJob(job);

    await nextTick();

    expect(job).toHaveBeenCalledTimes(1);
  });

  test('recursive jobs can only be queued once recursively', async () => {
    let recurse = true;

    const job: Scheduler.Job = vi.fn(() => {
      if (recurse) {
        queueJob(job);
        queueJob(job);
        recurse = false;
      }
    });
    job.id = 1;
    job.flags = SCHEDULER_JOB_FLAGS.ALLOW_RECURSE;

    queueJob(job);

    await nextTick();

    expect(job).toHaveBeenCalledTimes(2);
  });

  test(`recursive jobs can't be re-queued by other jobs`, async () => {
    let recurse = true;

    const job1: Scheduler.Job = () => {
      if (recurse) {
        // job2 is already queued, so this shouldn't do anything
        queueJob(job2);
        recurse = false;
      }
    };
    job1.id = 1;

    const job2: Scheduler.Job = vi.fn(() => {
      if (recurse) {
        queueJob(job1);
        queueJob(job2);
      }
    });
    job2.id = 2;
    job2.flags = SCHEDULER_JOB_FLAGS.ALLOW_RECURSE;

    queueJob(job2);

    await nextTick();

    expect(job2).toHaveBeenCalledTimes(2);
  });

  // #910
  test('should not run stopped reactive effects', async () => {
    const spy = vi.fn();

    // simulate parent component that toggles child
    const job1 = () => {
      // @ts-expect-error
      job2.flags! |= SCHEDULER_JOB_FLAGS.DISPOSED;
    };
    // simulate child that's triggered by the same reactive change that
    // triggers its toggle
    const job2 = () => spy();
    expect(spy).toHaveBeenCalledTimes(0);

    queueJob(job1);
    queueJob(job2);
    await nextTick();

    // should not be called
    expect(spy).toHaveBeenCalledTimes(0);
  });

  it('nextTick should return promise', async () => {
    const fn = vi.fn(() => {
      return 1;
    });

    const p = nextTick(fn);

    expect(p).toBeInstanceOf(Promise);
    expect(await p).toBe(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
