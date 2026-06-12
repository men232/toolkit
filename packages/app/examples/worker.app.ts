import { IntervalStrategy, defineWorker } from '../dist/index.mjs';

export default defineWorker({
  name: 'clock',
  executeStrategy: new IntervalStrategy({
    intervalSeconds: 1,
  }),
  entry() {
    this.log.info('tick=%d', this.timerSequence);
  },
});
