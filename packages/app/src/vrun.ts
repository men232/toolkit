import { noop } from '@andrew_l/toolkit';

const timer = setTimeout(noop, 1 << 30);

import('./index.js')
  .then(r =>
    r.cli.runApp({
      cliName: 'vrun',
      cliDescription: 'Launch any application.',
      argv: process.argv.slice(2),
    }),
  )
  .finally(() => clearInterval(timer));
