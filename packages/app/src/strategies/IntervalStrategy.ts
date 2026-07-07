import { log } from '../logger.js';
import type { WorkerInstance, WorkerStrategy } from '../worker.js';

export namespace IntervalStrategy {
  /**
   * Options for the built-in IntervalStrategy.
   */
  export interface Options {
    intervalSeconds: number;

    /**
     * @default true
     */
    warnOnBusy?: boolean;
  }

  /**
   * Context emitted by IntervalStrategy on each tick.
   */
  export interface Context extends WorkerStrategy.Context {
    timerSequence: number;
  }
}

/**
 * Triggers a worker task on a fixed interval.
 * Skips the tick with a warning if the worker is not idle.
 * @group Worker Strategies
 */
export class IntervalStrategy
  implements WorkerStrategy<IntervalStrategy.Context>
{
  private timerSequence = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private worker!: WorkerInstance;
  private warnOnBusy: boolean;

  constructor(private readonly options: IntervalStrategy.Options) {
    this.warnOnBusy = options.warnOnBusy ?? true;
  }

  doSetup({ worker }: { worker: WorkerInstance }): void {
    this.worker = worker;
  }

  startSignal(): void {
    this.timer = setInterval(() => {
      if (this.worker.isIdle) {
        this.worker.addTask(this.createTask());
      } else if (this.warnOnBusy) {
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
