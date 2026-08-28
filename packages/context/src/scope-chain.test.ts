import { describe, expect, test } from 'vitest';
import { inject, provide, withContext } from '.';
import { type Scope, createScope, getCurrentScope } from './scope';

/**
 * inject() walks the parent chain without a visited set — that is only
 * sound while chains stay acyclic. These tests pin the invariant the walk
 * relies on: a scope's parent is always a scope that existed before it
 * (strictly smaller id), across every way the library builds chains.
 */

function collectChain(scope: Scope | null): Scope[] {
  const chain: Scope[] = [];
  const seen = new Set<Scope>();

  while (scope) {
    if (seen.has(scope)) {
      throw new Error('cycle detected in scope parent chain');
    }

    seen.add(scope);
    chain.push(scope);
    scope = scope.parent;
  }

  return chain;
}

function expectWellFormedChain(scope: Scope | null): Scope[] {
  const chain = collectChain(scope);

  for (let i = 1; i < chain.length; i++) {
    // A parent is always constructed before its child.
    expect(chain[i].id).toBeLessThan(chain[i - 1].id);
  }

  return chain;
}

describe('scope parent chain invariant', () => {
  test('nested withContext scopes chain to their creators without repeats', () => {
    withContext(() => {
      withContext(() => {
        withContext(() => {
          const chain = expectWellFormedChain(getCurrentScope());
          expect(chain.length).toBeGreaterThanOrEqual(3);
        })();
      })();
    })();
  });

  test('detached scopes start a fresh chain', () => {
    withContext(() => {
      withContext(() => {
        const chain = expectWellFormedChain(getCurrentScope());
        expect(chain.length).toBe(1);
      }, true)();
    })();
  });

  test('re-entering an old scope later still builds a well-formed chain', () => {
    let outerScope: Scope;

    withContext(() => {
      outerScope = getCurrentScope()!;
    })();

    // Re-enter the finished scope (bindContext-style) and create children in
    // it — their parents must be older scopes, never a repeat.
    outerScope!.run(() => {
      withContext(() => {
        const chain = expectWellFormedChain(getCurrentScope());
        expect(chain[1]).toBe(outerScope);
      })();
    });
  });

  test('enterWith provide() creates a child of the current scope', () => {
    withContext(() => {
      const before = getCurrentScope();

      provide('k', 'v', true);

      const chain = expectWellFormedChain(getCurrentScope());
      expect(chain).toContain(before);
    })();
  });

  test('inject resolves through a deep chain and terminates', () => {
    let depth = 0;

    const dive = (): unknown => {
      if (++depth < 500) return withContext(dive)();
      return inject('deep');
    };

    const result = withContext(() => {
      provide('deep', 42);
      return dive();
    })();

    expect(result).toBe(42);
  });

  test('inject does not hang on a manually corrupted (cyclic) chain', () => {
    withContext(() => {
      const scope = getCurrentScope()!;

      // Corrupt the chain by hand: the library never does this, but a walk
      // must still terminate instead of spinning the event loop forever.
      scope.parent = scope;

      expect(inject('missing', 'fallback')).toBe('fallback');
    })();
  });

  test('createScope picks the current scope as parent exactly once', () => {
    withContext(() => {
      const current = getCurrentScope();
      const scope = createScope();

      expect(scope.parent).toBe(current);
      expect(scope.parent).not.toBe(scope);
    })();
  });
});
