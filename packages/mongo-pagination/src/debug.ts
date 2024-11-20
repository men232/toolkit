import d from 'debug';

export const debug = {
  init: d('mongo-pagination:init'),
  tweak: d('mongo-pagination:tweak'),
  exec: d('mongo-pagination:exec'),
  stream: d('mongo-pagination:query:stream'),
};
