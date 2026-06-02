/**
 * CTR-DEVOPS-HARDENING — P1 (W0 RED)
 *
 * Prova que makeShutdownOnce() retorna uma função que executa shutdown
 * UMA ÚNICA VEZ, mesmo quando chamada concorrentemente ou em sequência
 * (SIGTERM seguido de uncaughtException, por exemplo).
 *
 * RED: src/shared/runtime/shutdown-once.ts não existe →
 *   import falha com ERR_MODULE_NOT_FOUND.
 *
 * Ref: handbook/reference/nodejs/Process.md §"Warning: Using
 * 'uncaughtException' correctly" — o shutdown deve ser idempotente
 * porque tanto os handlers de sinal (SIGTERM/SIGINT) quanto os handlers
 * de último recurso (uncaughtException/unhandledRejection) podem
 * invocar shutdown no mesmo ciclo de vida do processo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeShutdownOnce } from '#src/shared/runtime/shutdown-once.ts';

describe('makeShutdownOnce', () => {
  it('CA1: primeira chamada executa o shutdown e retorna', async () => {
    let calls = 0;
    const shutdown = makeShutdownOnce(() => {
      calls += 1;
      return Promise.resolve();
    });

    await shutdown();

    assert.equal(calls, 1);
  });

  it('CA2: segunda chamada sequencial NÃO executa o shutdown novamente', async () => {
    let calls = 0;
    const shutdown = makeShutdownOnce(() => {
      calls += 1;
      return Promise.resolve();
    });

    await shutdown();
    await shutdown();

    assert.equal(calls, 1, 'shutdown deve executar exatamente 1 vez');
  });

  it('CA3: chamadas concorrentes (SIGTERM + uncaughtException simultâneos) executam o shutdown 1 vez', async () => {
    let calls = 0;
    const shutdown = makeShutdownOnce(async () => {
      // Simula I/O assíncrono (ex.: app.close() + pool.end())
      await new Promise<void>((r) => {
        setImmediate(r);
      });
      calls += 1;
    });

    // Dispara as duas "ao mesmo tempo", sem await entre elas
    const p1 = shutdown();
    const p2 = shutdown();
    await Promise.all([p1, p2]);

    assert.equal(calls, 1, 'chamadas concorrentes devem executar shutdown só 1 vez');
  });

  it('CA4: efeitos dentro do shutdown (app.close, deps.shutdown) são chamados 1 vez cada', async () => {
    const appCloseCalls: number[] = [];
    const depsShutdownCalls: number[] = [];

    const shutdown = makeShutdownOnce(async () => {
      appCloseCalls.push(1);
      await Promise.resolve();
      depsShutdownCalls.push(1);
    });

    // Simula: sinal SIGTERM → shutdown(); depois uncaughtException → shutdown() de novo
    await shutdown();
    await shutdown();

    assert.equal(appCloseCalls.length, 1, 'app.close() deve rodar 1 vez');
    assert.equal(depsShutdownCalls.length, 1, 'deps.shutdown() deve rodar 1 vez');
  });
});
