import { LogLevels, createConsola } from 'consola';

export const log = createConsola({
  formatOptions: { date: false },
  level: LogLevels.info,
  fancy: true,
});
