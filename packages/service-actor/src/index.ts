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

/**
 * The actor is a plain object (prototype Object.prototype) whose behavior
 * lives in non-enumerable own properties. That gives the historic Proxy
 * facade semantics with zero trap machinery:
 *
 * - reserved fields + assigned data are own enumerable props — visible to
 *   Object.keys / spread / serialization, in the same order as before;
 * - api functions (assign, anything function-valued passed to assign()) are
 *   own non-enumerable props — hidden from enumeration and never copied
 *   into child actors, like the old SYM_API bucket;
 * - overwriting an api function throws, like the old `set` trap returning
 *   false in strict mode (non-writable own property behaves the same for
 *   direct assignment).
 */
function createServiceActor(): ServiceActor {
  var actor = {
    traceId: '',
    actorId: null,
    actorType: 'unknown',
  };

  Object.defineProperty(actor, 'assign', {
    value: assign,
    enumerable: false,
    writable: false,
    configurable: true,
  });

  return actor as unknown as ServiceActor;
}

function assign(this: ServiceActor, params: Record<any, any>) {
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
