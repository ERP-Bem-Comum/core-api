/**
 * `runOutboxSweep` — o laço em lotes do sweep de outbox (ADR-0064 §3).
 *
 * O que este arquivo protege não é a performance (isso é EXPLAIN, e vive na validação em MySQL
 * real): é a **propriedade de segurança** do job. O sweep marca `processed_at`, e essa marca
 * REMOVE a linha do claim de todos os consumidores. Marcar cedo demais é perda silenciosa de
 * evento — o defeito que o ADR-0064 fecha. Por isso o caso mais importante aqui é o mais
 * chato: com lista de consumidores vazia, não marcar NADA.
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { outboxQueryUnavailable } from '#src/shared/outbox/types.ts';
import { runOutboxSweep, type OutboxSweepPort } from '#src/jobs/shared/outbox-sweeper/sweep.ts';

const clock = { now: () => new Date('2026-08-23T09:00:00.000Z'), today: () => 'unused' as never };
const CONFIG = { batchSize: 500, maxBatches: 20 };
const CONSUMERS = ['worker-outbox', 'financial-supplier-view'];

/** Port que devolve uma sequência pré-definida de contagens, registrando como foi chamado. */
const portReturning = (
  counts: readonly number[],
): OutboxSweepPort & { calls: { consumerIds: readonly string[]; limit: number }[] } => {
  const calls: { consumerIds: readonly string[]; limit: number }[] = [];
  let i = 0;
  return {
    calls,
    markFullyResolved: ({ consumerIds, limit }) => {
      calls.push({ consumerIds, limit });
      const next = counts[i] ?? 0;
      i += 1;
      return Promise.resolve(ok(next));
    },
  };
};

describe('OUTBOX-SWEEP — marca só o que todos resolveram', () => {
  it('sem consumidor registrado, NÃO marca nada e nem chama o port', async () => {
    // O caso que evita a perda: marcar sem saber quem consome declararia entregue o que ninguém
    // consumiu. Não marcar apenas mantém o claim lento — o lado seguro da assimetria.
    const port = portReturning([500]);
    const result = await runOutboxSweep({ sweeper: port, clock }, CONFIG, []);

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value, { marked: 0, batches: 0, reachedLimit: false });
    assert.equal(port.calls.length, 0, 'não deve nem consultar o banco');
  });

  it('varre em lotes até o primeiro lote vazio', async () => {
    const port = portReturning([500, 500, 137, 0]);
    const result = await runOutboxSweep({ sweeper: port, clock }, CONFIG, CONSUMERS);

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value, {
      marked: 1137,
      batches: 4,
      reachedLimit: false,
    });
  });

  it('para no teto de lotes e sinaliza que sobrou trabalho', async () => {
    // `reachedLimit` existe para o operador distinguir "acabou" de "o job foi interrompido pelo
    // teto" — sem isso, um outbox que cresce mais rápido que o sweep some do radar.
    const port = portReturning(Array.from({ length: 30 }, () => 500));
    const result = await runOutboxSweep(
      { sweeper: port, clock },
      { ...CONFIG, maxBatches: 3 },
      CONSUMERS,
    );

    assert.equal(result.ok, true);
    assert.deepEqual(result.ok && result.value, { marked: 1500, batches: 3, reachedLimit: true });
  });

  it('propaga erro do port sem marcar nada além do que já marcou', async () => {
    const failing: OutboxSweepPort = {
      markFullyResolved: () => Promise.resolve(err(outboxQueryUnavailable('conexão caiu'))),
    };
    const result = await runOutboxSweep({ sweeper: failing, clock }, CONFIG, CONSUMERS);

    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.tag, 'OutboxQueryUnavailable');
  });

  it('repassa a lista de consumidores e o tamanho de lote ao port', async () => {
    // O port traduz a lista em `COUNT(DISTINCT consumer_id) = N`; se ela chegar truncada, o
    // "todos" vira "alguns" e a marca sai cedo.
    const port = portReturning([0]);
    await runOutboxSweep({ sweeper: port, clock }, CONFIG, CONSUMERS);

    assert.deepEqual(port.calls[0]?.consumerIds, CONSUMERS);
    assert.equal(port.calls[0]?.limit, 500);
  });
});
