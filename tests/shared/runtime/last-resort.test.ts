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

  // CA4 — #632. O docstring promete "roda `shutdown` (best-effort — não relança)", e isso NÃO era
  // verdade por construção: `void p.finally(cb)` REPASSA a rejeição de `p`. Em produção não virava
  // `unhandledRejection` só porque `deps.exit(1)` roda DENTRO do `finally` e `process.exit` é
  // síncrono — o processo morre antes de a rejeição ser reportada. Depender de timing de
  // `process.exit` para cumprir contrato declarado é frágil, e aqui o dublê de `exit` não encerra
  // nada: a rejeição fica solta, exatamente como ficaria em qualquer teste do repositório.
  it('CA4: shutdown que REJEITA não vira unhandledRejection, e exit(1) roda mesmo assim', async () => {
    const h = makeHarness();
    const solta: unknown[] = [];
    const capturar = (reason: unknown): void => {
      solta.push(reason);
    };
    process.on('unhandledRejection', capturar);

    try {
      installLastResortHandlers(async () => {
        await Promise.resolve();
        h.order.push('shutdown');
        throw new Error('pool.end falhou');
      }, h.deps);

      h.listeners.get('uncaughtException')!('boom');
      // Duas voltas: a 1ª resolve a cadeia do `finally`, a 2ª deixa o Node reportar rejeição solta.
      await new Promise((r) => {
        setImmediate(r);
      });
      await new Promise((r) => {
        setImmediate(r);
      });

      assert.deepEqual(solta, [], 'shutdown que rejeita produziu unhandledRejection');
      assert.deepEqual(
        h.order,
        ['shutdown', 'exit'],
        'exit(1) MUST rodar mesmo com shutdown falho',
      );
    } finally {
      process.off('unhandledRejection', capturar);
    }
  });
});
