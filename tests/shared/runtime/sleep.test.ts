import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getEventListeners } from 'node:events';

import { sleep } from '#src/shared/runtime/sleep.ts';

describe('sleep', () => {
  it('resolve depois do prazo quando ninguém aborta', async () => {
    const started = performance.now();
    await sleep(20);
    assert.ok(performance.now() - started >= 15);
  });

  it('resolve na hora quando o signal já chega abortado', async () => {
    const started = performance.now();
    await sleep(10_000, AbortSignal.abort());
    assert.ok(performance.now() - started < 1_000);
  });

  it('resolve, sem rejeitar, quando o signal aborta no meio do sono', async () => {
    const controller = new AbortController();
    const started = performance.now();
    const pending = sleep(10_000, controller.signal);
    controller.abort();
    await pending;
    assert.ok(performance.now() - started < 1_000);
  });

  it('sono que vence o prazo não deixa listener de abort no signal compartilhado', async () => {
    const controller = new AbortController();
    for (let i = 0; i < 15; i += 1) await sleep(1, controller.signal);
    assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  });
});
