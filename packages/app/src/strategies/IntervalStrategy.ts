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
export class IntervalStrategy implements WorkerStrategy<IntervalStrategy.Context> {
  private timerSequence = 0;
  private timer: NodeJS.Timeout | null = null;
  private worker!: WorkerInstance;
  private readonly warnOnBusy: boolean;
  private readonly intervalMs: number;

  constructor(options: IntervalStrategy.Options) {
    this.warnOnBusy = options.warnOnBusy ?? true;
    this.intervalMs = options.intervalSeconds * 1000;
  }

  doSetup({ worker }: { worker: WorkerInstance }): void {
    this.worker = worker;
  }

  /**
   * Trigger running immediately
   */
  trigger(): boolean {
    if (!this.timer) return false;

    this.timer.refresh();
    this.handleTick();

    return true;
  }

  /**
   * Reschedules timer interval
   */
  refresh(): boolean {
    if (!this.timer) return false;
    this.timer.refresh();
    return true;
  }

  startSignal(): void {
    this.timer = setInterval(this.handleTick.bind(this), this.intervalMs);
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

  protected handleTick(): void {
    if (this.worker.isIdle) {
      this.worker.addTask(this.createTask());
    } else if (this.warnOnBusy) {
      log.warn('[%s] Worker busy, skipping tick', this.worker.definition.name);
    }
  }
}
