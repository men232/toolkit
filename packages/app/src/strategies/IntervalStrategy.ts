import { log } from '../logger.js';
import type { WorkerInstance, WorkerStrategy } from '../worker.js';

export namespace IntervalStrategy {
  /**
   * Options for the built-in IntervalStrategy.
   */
  export interface Options {
    intervalSeconds: number;
  }

  /**
   * Context emitted by IntervalStrategy on each tick.
   * @group Worker
   */
  export interface Context extends WorkerStrategy.Context {
    timerSequence: number;
  }
}

/**
 * Triggers a worker task on a fixed interval.
 * Skips the tick with a warning if the worker is not idle.
 * @group Worker
 */
export class IntervalStrategy
  implements WorkerStrategy<IntervalStrategy.Context>
{
  private timerSequence = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private worker!: WorkerInstance;

  constructor(private readonly options: IntervalStrategy.Options) {}

  doSetup({ worker }: { worker: WorkerInstance }): void {
    this.worker = worker;
  }

  startSignal(): void {
    this.timer = setInterval(() => {
      if (this.worker.isIdle) {
        this.worker.addTask(this.createTask());
      } else {
        log.warn(
          '[%s] Worker busy, skipping tick',
          this.worker.definition.name,
        );
      }
    }, this.options.intervalSeconds * 1000);
  }

  stopSignal(done: () => void): void {
    clearInterval(this.timer!);
    this.timer = null;
    done();
  }

  doShutdown(): void {}

  createTask(): IntervalStrategy.Context {
    return { timerSequence: ++this.timerSequence };
  }
}
