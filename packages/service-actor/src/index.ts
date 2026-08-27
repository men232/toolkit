import {
  hasInjectionContext,
  inject,
  provide,
  withContext,
} from '@andrew_l/context';
import {
  type AnyFunction,
  type OverwriteWith,
  isFunction,
} from '@andrew_l/toolkit';

export type AnyServiceActor = {
  traceId: any;
  actorId: any;
  actorType: any;
  [x: PropertyKey]: any;
};

export type ServiceActorData<T extends Record<PropertyKey, any> = {}> =
  OverwriteWith<
    {
      traceId: string;
      actorId: string | null;
      actorType: 'unknown' | string;
    },
    T
  >;

export type ServiceActor<T extends Record<PropertyKey, any> = {}> =
  ServiceActorData<T> & {
    assign(params: Partial<ServiceActorData<T>>): ServiceActor<T>;
  };

/**
 * Create service actor hooks
 *
 * @example
 * const { use: useServiceActor, with: withServiceActor } = serviceActor(() => ({
 *   actorType: 'http-request',
 *   ipAddress: '',
 *  }));
 *
 * app.use((ctx, next) => {
 *   return withServiceActor(
 *     {
 *       traceId: ctx.headers['x-request-id'],
 *       ipAddress: ctx.headers['x-forwarded-for'],
 *     },
 *     next,
 *   );
 * });
 *
 * app.get('/', () => {
 *   const actor = useServiceActor();
 *
 *   // { traceId: 'req_35123', actorId: null, actorType: 'http-request', ipAddress: '::' }
 *   console.log(actor);
 * });
 *
 * @group Main
 */
export function serviceActor<T extends Record<PropertyKey, any> = {}>(
  factory?: () => T,
): {
  /**
   * Wrap a function to execute it with service actor providers
   */
  with: <Fn extends AnyFunction>(
    fn: Fn,
    params?: Partial<ServiceActor<T>>,
  ) => Fn;

  /**
   * Returns the service actor instance from the current context.
   */
  inject: () => ServiceActor<T> | undefined;

  /**
   * Returns the service actor instance from the context, or creates and binds a new instance if none exists.
   */
  use: () => ServiceActor<T>;
} {
  var injectKey = Symbol();
  var idSeq = 0;

  var createActor = (): AnyServiceActor => {
    var actor = createServiceActor();

    actor.traceId = `trace-${++idSeq}`;

    if (factory) {
      actor.assign(factory());
    }

    return actor;
  };

  var withHook = <Fn extends AnyFunction>(
    fn: Fn,
    params?: Partial<ServiceActor<T>>,
  ): Fn => {
    return withContext(function (this: any, ...args: any[]) {
      var parentActor = inject<ServiceActor>(injectKey);
      var actor = createActor();

      if (parentActor) {
        actor.assign(parentActor);
      }

      if (params) {
        actor.assign(params);
      }

      provide(injectKey, actor);

      return fn.apply(this, args);
    }) as Fn;
  };

  var injectHook = (): AnyServiceActor | undefined => {
    return hasInjectionContext() ? inject<ServiceActor>(injectKey) : undefined;
  };

  var useHok = (): AnyServiceActor => {
    var _actor: AnyServiceActor | undefined;

    if (!hasInjectionContext()) {
      _actor = createActor();
      provide(injectKey, _actor, true);

      return _actor;
    }

    // check for existed
    _actor = inject<AnyServiceActor>(injectKey);

    if (_actor) return _actor;

    _actor = createActor();
    provide(injectKey, _actor);

    return _actor;
  };

  return { with: withHook, use: useHok as any, inject: injectHook as any };
}

var SYM_ACTOR = Symbol();

var ACTOR_PROTO = Object.create(Object.prototype, {
  assign: {
    value: assign,
    enumerable: false,
    writable: false,
    configurable: true,
  },
  [SYM_ACTOR]: {
    value: true,
    enumerable: false,
    writable: false,
    configurable: true,
  },
});

function createServiceActor(): ServiceActor {
  var actor = Object.create(ACTOR_PROTO);

  actor.traceId = '';
  actor.actorId = null;
  actor.actorType = 'unknown';

  return actor as ServiceActor;
}

function assign(this: ServiceActor, params: Record<any, any>) {
  // Fast path: the source is another actor. Its own enumerable props are
  // reserved fields + data only (api functions are non-enumerable), so a
  // native Object.assign is safe.
  if ((params as any)[SYM_ACTOR] === true) {
    Object.assign(this, params);
    return this;
  }

  for (var key of Object.keys(params)) {
    var value = params[key];

    // Own function props are the api bucket; inherited functions
    // (toString, constructor, ...) are not guarded — matches the old trap.
    if (isFunction((this as any)[key]) && Object.hasOwn(this, key)) {
      // Same outcome as the old `set` trap returning false in strict mode.
      throw new TypeError(`Cannot assign guarded actor key '${key}'`);
    }

    if (isFunction(value)) {
      Object.defineProperty(this, key, {
        value,
        enumerable: false,
        writable: false,
        configurable: true,
      });
    } else {
      (this as any)[key] = value;
    }
  }

  return this;
}
