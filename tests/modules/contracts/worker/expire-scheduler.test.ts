/**
 * W0 RED — 009-contract-auto-expire (T010). `runExpireScheduler`: roda o sweep ao menos uma vez
 * e encerra ao receber abort; loga a contagem por ciclo (sem timers reais — signal pré-abortado).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { runExpireScheduler } from '#src/modules/contracts/worker/expire-scheduler.ts';

describe('runExpireScheduler', () => {
  it('roda o sweep e para no abort; loga a contagem', async () => {
    let calls = 0;
    const logs: string[] = [];
    const controller = new AbortController();
    controller.abort(); // pré-abortado → roda 1 ciclo e sai (do-while), sem dormir

    await runExpireScheduler(
      {
        expire: () => {
          calls += 1;
          return Promise.resolve(ok({ scanned: 2, expired: 1, failures: [] }));
        },
        abortSignal: controller.signal,
        log: (m) => {
          logs.push(m);
        },
      },
      3_600_000,
    );

    assert.equal(calls, 1);
    assert.ok(logs.some((l) => l.includes('expired=1')));
  });
});
