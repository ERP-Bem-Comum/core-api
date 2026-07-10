/**
 * CORE-WORKER-RUNNER-POOL-REGISTRY — W0 (RED) — runWorkerGroup: roda N loops isolados.
 *
 * O runner roda os workers de um grupo em Promise.allSettled: um loop que rejeita NÃO derruba os
 * irmãos (isolamento de processo/loop). Cada worker roda até o AbortSignal (SIGTERM → drena tudo).
 *
 * DEVE FALHAR: `src/workers/runner/group.ts` (runWorkerGroup) ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { runWorkerGroup, type WorkerSpec } from '#src/workers/runner/group.ts';

// Loop fake: resolve quando o signal aborta (modela um poller long-running).
const untilAbort = (signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener(
      'abort',
      () => {
        resolve();
      },
      { once: true },
    );
  });

const tick = (ms = 15): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('runWorkerGroup — isolamento + shutdown (CORE-WORKER-RUNNER-POOL-REGISTRY)', () => {
  it('CA-6: roda os N loops do grupo em paralelo (todos iniciam antes de qualquer terminar)', async () => {
    const started: string[] = [];
    const specs: WorkerSpec[] = ['a', 'b', 'c'].map((name) => ({
      name,
      run: async (signal: AbortSignal) => {
        started.push(name);
        await untilAbort(signal);
      },
    }));
    const controller = new AbortController();
    const done = runWorkerGroup(specs, controller.signal);
    await tick();
    assert.deepEqual(
      [...started].sort(),
      ['a', 'b', 'c'],
      'os 3 loops devem ter iniciado em paralelo',
    );
    controller.abort();
    await done;
  });

  it('CA-7: um loop que rejeita NÃO derruba os irmãos (allSettled)', async () => {
    const specs: WorkerSpec[] = [
      { name: 'ok1', run: async (s: AbortSignal) => untilAbort(s) },
      { name: 'bad', run: () => Promise.reject(new Error('boom')) },
      { name: 'ok2', run: async (s: AbortSignal) => untilAbort(s) },
    ];
    const controller = new AbortController();
    const done = runWorkerGroup(specs, controller.signal);
    await tick();
    controller.abort();
    const results = await done;
    const bad = results.find((r) => r.name === 'bad');
    assert.equal(bad?.status, 'rejected', 'o worker que lança deve aparecer como rejected');
    assert.equal(
      results.filter((r) => r.status === 'fulfilled').length,
      2,
      'os outros 2 devem completar normalmente',
    );
  });

  it('CA-8: abortar o signal encerra todos os loops (shutdown drena)', async () => {
    const specs: WorkerSpec[] = [{ name: 'a', run: async (s: AbortSignal) => untilAbort(s) }];
    const controller = new AbortController();
    const done = runWorkerGroup(specs, controller.signal);
    controller.abort();
    const results = await done;
    assert.equal(results[0]?.status, 'fulfilled');
  });
});
