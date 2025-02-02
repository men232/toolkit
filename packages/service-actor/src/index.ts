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

type ServiceActorInternal = {
  traceId: unknown;
  actorId: unknown;
  actorType: unknown;
  [SYM_API]: Record<PropertyKey, Function>;
  [SYM_MARKER]: boolean;
  [SYM_RAW]: any;
  [SYM_DATA]: Record<PropertyKey, unknown>;
};

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

const SYM_MARKER = Symbol();
const SYM_RAW = Symbol();
const SYM_DATA = Symbol();
const SYM_API = Symbol();

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
  const injectKey = Symbol();

  let idSeq = 0;

  const createActor = (): AnyServiceActor => {
    const actor = createServiceActor();

    actor.traceId = `trace-${++idSeq}`;

    if (factory) {
      actor.assign(factory());
    }

    return actor;
  };

  const withHook = <Fn extends AnyFunction>(
    fn: Fn,
    params?: Partial<ServiceActor<T>>,
  ): Fn => {
    return withContext(function (this: any, ...args: any[]) {
      const parentActor = inject<ServiceActor>(injectKey);
      const actor = createActor();

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

  const injectHook = (): AnyServiceActor | undefined => {
    return hasInjectionContext() ? inject<ServiceActor>(injectKey) : undefined;
  };

  const useHok = (): AnyServiceActor => {
    if (!hasInjectionContext()) {
      const actor = createActor();
      provide(injectKey, actor, true);

      return actor;
    }

    const existed = inject<AnyServiceActor>(injectKey);

    if (existed) return existed;

    const actor = createActor();
    provide(injectKey, actor);

    return actor;
  };

  return { with: withHook, use: useHok as any, inject: injectHook as any };
}

function createServiceActor(): ServiceActor {
  const actor: ServiceActorInternal = {
    traceId: '',
    actorId: null,
    actorType: 'unknown',
    [SYM_API]: {
      assign,
    },
    [SYM_DATA]: {},
    [SYM_RAW]: null,
    [SYM_MARKER]: true,
  };

  const reservedKeys = new Set(Object.keys(actor));

  actor[SYM_RAW] = actor;

  const newProxy = new Proxy(actor[SYM_DATA], {
    defineProperty(target, key, value) {
      if (key in actor) {
        (actor as any)[key] = value;
      } else {
        target[key] = value;
      }

      return true;
    },
    deleteProperty(target, key) {
      if (key in actor) {
        delete (actor as any)[key];
      } else {
        delete target[key];
      }

      return true;
    },
    has(target, key) {
      return key in actor || key in target;
    },
    ownKeys(target) {
      return [...reservedKeys, ...Object.keys(target)];
    },
    set: function (target, key, value) {
      if (key in actor[SYM_API]) return false;

      if (key in actor) {
        Reflect.set(actor, key, value);
      } else if (isFunction(value)) {
        Reflect.set(actor[SYM_API], key, value);
      } else {
        Reflect.set(target, key, value);
      }

      return true;
    },
    get: (target, key) => {
      let value: any;

      if (key in actor) {
        value = Reflect.get(actor, key, value);
      } else if (key in actor[SYM_API]) {
        value = Reflect.get(actor[SYM_API], key, value).bind(newProxy);
      } else {
        value = Reflect.get(target, key);
      }

      return value;
    },
    getOwnPropertyDescriptor(k) {
      return {
        enumerable: true,
        configurable: true,
      };
    },
  });

  return newProxy as ServiceActor;
}

function assign(this: ServiceActor, params: Record<any, any>) {
  Object.assign(this, params);
  return this;
}
