/**
 * CTR-NODE-LAST-RESORT-HANDLERS
 *
 * Cobre CA1–CA5 via deps injetáveis (sem registrar handlers no process global).
 *
 * CA4/CA5 (CTR-DEVOPS-HARDENING): verifica que o write recebe o stack completo
 * quando causa é Error (não apenas String(cause) que perde o stack).
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

  // CA4 (CTR-DEVOPS-HARDENING — P2): causa é Error com .stack → write deve conter
  // o stack, não apenas String(cause) = "Error: msg" (sem frames).
  // Ref: handbook/reference/nodejs/Process.md §"Warning: Using 'uncaughtException' correctly"
  it('CA4: dado Error com .stack, write contém o stack trace (não só a mensagem)', async () => {
    const h = makeHarness();
    installLastResortHandlers(async () => {
      await Promise.resolve();
    }, h.deps);

    const err = new Error('stack-trace-test');
    // .stack é definido pelo V8 na criação: "Error: stack-trace-test\n    at ..."
    assert.ok(
      typeof err.stack === 'string' && err.stack.includes('at '),
      'pré-condição: .stack contém frames',
    );

    h.listeners.get('uncaughtException')!(err);
    await new Promise((r) => {
      setImmediate(r);
    });

    const written = h.writes.join('');
    // Deve conter o stack completo (com "at " de frames), não apenas "Error: stack-trace-test"
    assert.match(written, /at /, 'write deve conter frames do stack trace');
    assert.match(written, /stack-trace-test/, 'write deve conter a mensagem do erro');
  });

  // CA5 (CTR-DEVOPS-HARDENING — P2): causa NÃO é Error → fallback String(cause) continua
  it('CA5: dado não-Error (string), write cai no fallback String(cause)', async () => {
    const h = makeHarness();
    installLastResortHandlers(async () => {
      await Promise.resolve();
    }, h.deps);

    h.listeners.get('unhandledRejection')!('apenas-uma-string');
    await new Promise((r) => {
      setImmediate(r);
    });

    const written = h.writes.join('');
    assert.match(written, /apenas-uma-string/);
  });
});
