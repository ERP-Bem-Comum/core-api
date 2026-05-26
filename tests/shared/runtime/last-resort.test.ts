/**
 * CTR-NODE-LAST-RESORT-HANDLERS — W0 (RED)
 *
 * Cobre CA1, CA2, CA3 via deps injetáveis (sem registrar handlers no process global).
 *
 * Estado W0: RED — `src/shared/runtime/last-resort.ts` não existe →
 *   import falha com ERR_MODULE_NOT_FOUND.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { installLastResortHandlers, type LastResortDeps } from '#src/shared/runtime/last-resort.ts';

type Harness = Readonly<{
  listeners: Map<string, (cause: unknown) => void>;
  writes: string[];
  order: string[];
  deps: LastResortDeps;
}>;

const makeHarness = (): Harness => {
  const listeners = new Map<string, (cause: unknown) => void>();
  const writes: string[] = [];
  const order: string[] = [];
  const deps: LastResortDeps = {
    on: (event, listener) => {
      listeners.set(event, listener);
    },
    exit: () => {
      order.push('exit');
    },
    write: (message) => {
      writes.push(message);
    },
  };
  return { listeners, writes, order, deps };
};

describe('last-resort handlers', () => {
  it('CA1: registra uncaughtException e unhandledRejection', () => {
    const h = makeHarness();
    installLastResortHandlers(async () => {
      await Promise.resolve();
    }, h.deps);
    assert.ok(h.listeners.has('uncaughtException'));
    assert.ok(h.listeners.has('unhandledRejection'));
  });

  it('CA2: em uncaughtException loga o tipo+erro, roda shutdown e sai com 1', async () => {
    const h = makeHarness();
    let shutdownCalls = 0;
    installLastResortHandlers(async () => {
      await Promise.resolve();
      shutdownCalls += 1;
    }, h.deps);

    h.listeners.get('uncaughtException')!(new Error('boom'));
    await new Promise((r) => {
      setImmediate(r);
    });

    assert.equal(shutdownCalls, 1);
    assert.deepEqual(h.order, ['exit']);
    assert.match(h.writes.join(''), /uncaughtException/);
    assert.match(h.writes.join(''), /boom/);
  });

  it('CA3: exit ocorre DEPOIS de shutdown resolver', async () => {
    const h = makeHarness();
    installLastResortHandlers(async () => {
      await Promise.resolve();
      h.order.push('shutdown');
    }, h.deps);

    h.listeners.get('unhandledRejection')!('falha-async');
    await new Promise((r) => {
      setImmediate(r);
    });

    assert.deepEqual(h.order, ['shutdown', 'exit']);
  });
});
