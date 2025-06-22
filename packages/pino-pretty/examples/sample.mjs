import pino from 'pino';

const logger = pino({
  serializers: {
    error: pino.stdSerializers.errWithCause,
    err: pino.stdSerializers.errWithCause,
  },
  level: 'debug',
  transport: {
    target: '@andrew_l/pino-pretty',
    options: {
      inspect: 'compact',
      columns: process.stdout.columns,
    },
  },
});

logger.child({ name: 'app' }).info('Starting application');
logger.child({ name: 'mongoose' }).info('Database connected');
logger.child({ name: 'http-server' }).info('Starting http server');
logger
  .child({ name: 'http-server' })
  .info(`Server listening at http://127.0.0.1:3000`);
logger
  .child({ name: 'http-server' })
  .info(`Docs listening at http://127.0.0.1:3000/docs`);

logger.warn('A new version of pino-pretty is available: 0.2.18');
logger.error(new Error('This is an example error. Everything is fine!'));

logger.child({ name: 'cache' }).debug(
  {
    operation: 'SET',
    key: 'user:session:abc123',
    ttl: 3600,
    pipeline: true,
    cluster: {
      node: 'redis-01',
      shard: 'users',
      memory: '2.1GB',
      namespace: 'b2b-organization',
      vm: 'san192.small',
    },
  },
  'Redis operation',
);
