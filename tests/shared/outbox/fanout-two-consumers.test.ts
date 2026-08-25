/**
 * CA1–CA3 da #824 — dois consumidores sobre O MESMO outbox recebem, cada um, TODOS os eventos.
 *
 * ## O buraco de cobertura que este arquivo fecha
 *
 * A suíte inteira do outbox modelava UM consumidor por instância de `WorkerOutboxOps`. Nenhum
 * teste jamais colocou dois consumidores contra a mesma tabela — e é exatamente aí que morava o
 * defeito. Ele só apareceu em ambiente de simulação, medido à mão: 11 fornecedores cadastrados, 1
 * na `fin_supplier_view`, com `pendentes = 0` no outbox. Um teste como este teria pego, e o
 * `LoggerEventDelivery` que "ganhava" a corrida vinha de antes de o segundo consumidor existir.
 *
 * ## O que este teste prova, e o que ele NÃO prova
 *
 * Prova a SEMÂNTICA do fanout: pendência por consumidor, idempotência por consumidor, DLQ por
 * consumidor. Roda sobre o adapter in-memory, então **não** prova o comportamento de lock
 * (`FOR UPDATE SKIP LOCKED`, isolamento, gap lock) — isso é MySQL real e vive nas suítes de
 * integração dos adapters Drizzle. Os dois níveis são necessários: o in-memory guarda a regra, o
 * de integração guarda a tradução dela em SQL.
 */
import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import { runOnce } from '#src/shared/outbox/outbox-worker.ts';
import { deliveryUnavailable } from '#src/shared/outbox/types.ts';
import type { EventDelivery, OutboxRow, DeliveryError } from '#src/shared/outbox/types.ts';
import { InMemoryOutbox } from '#src/modules/partners/adapters/outbox/outbox.in-memory.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';

// ─── cenário ──────────────────────────────────────────────────────────────────

/** Os dois consumidores reais do `par_outbox` em produção — o que só loga e a projeção. */
const LOGGER = 'partners-outbox-logger';
const PROJECTION = 'financial-supplier-view';

const LOOP = { batchSize: 10, maxAttempts: 3, pollIntervalMs: 1, idleSleepMs: 1 };
// Relógio real: nenhuma asserção aqui depende de instante — o que se mede é quem recebeu o quê.
const clock = ClockReal();

const message = (n: number) => ({
  eventId: `0000000${n}-0000-4000-8000-000000000000`,
  aggregateId: 'aaaaaaaa-0000-4000-8000-000000000000',
  aggregateType: 'Supplier',
  eventType: 'SupplierRegistered',
  occurredAt: new Date(`2026-08-21T10:0${n}:00.000Z`),
  payload: `{"n":${n}}`,
});

/** Delivery que registra o que recebeu. `failing` faz toda entrega falhar. */
const recorder = (
  consumerId: string,
  failing = false,
): EventDelivery<OutboxRow> & { received: string[] } => {
  const received: string[] = [];
  return {
    consumerId,
    received,
    deliver: (event: OutboxRow): Promise<Result<void, DeliveryError>> => {
      received.push(event.eventId);
      return Promise.resolve(failing ? err(deliveryUnavailable('teste')) : ok(undefined));
    },
  };
};

const deps = (outbox: ReturnType<typeof InMemoryOutbox>, delivery: EventDelivery<OutboxRow>) => ({
  outbox,
  delivery,
  rowToProcessed: (row: OutboxRow) => ok(row),
  clock,
  tag: '[fanout-test] ',
});

// ─── suíte ────────────────────────────────────────────────────────────────────

describe('FANOUT — dois consumidores sobre o mesmo outbox (#800, #824)', () => {
  let outbox: ReturnType<typeof InMemoryOutbox>;

  beforeEach(async () => {
    outbox = InMemoryOutbox();
    await outbox.port.append([message(1), message(2), message(3)]);
  });

  it('CA1 — cada consumidor recebe TODOS os eventos, não uma fatia', async () => {
    const logger = recorder(LOGGER);
    const projection = recorder(PROJECTION);

    await runOnce(deps(outbox, logger), LOOP);
    await runOnce(deps(outbox, projection), LOOP);

    // ANTES DA CORREÇÃO: o primeiro a rodar marcava `processed_at` na linha e o segundo via zero.
    // Era a perda silenciosa — `pendentes = 0` no outbox, com linha faltando na projeção.
    assert.deepEqual(logger.received.length, 3, 'o logger deveria receber os 3 eventos');
    assert.deepEqual(projection.received.length, 3, 'a projeção deveria receber os MESMOS 3');
    assert.deepEqual(logger.received, projection.received, 'os dois veem o mesmo conjunto');
  });

  it('CA1b — a ordem de execução não altera o resultado', async () => {
    // Invertido em relação ao CA1. Sob o desenho antigo isto mudava tudo: quem rodasse primeiro
    // levava os eventos. Em produção a corrida era decidida pelo poll — 100ms do grupo `outbox`
    // contra 500ms do `projections`, uma vantagem estrutural de 5x para o consumidor que só loga.
    const projection = recorder(PROJECTION);
    const logger = recorder(LOGGER);

    await runOnce(deps(outbox, projection), LOOP);
    await runOnce(deps(outbox, logger), LOOP);

    assert.equal(projection.received.length, 3);
    assert.equal(logger.received.length, 3);
  });

  it('CA3 — reprocessar não reentrega ao consumidor que já concluiu', async () => {
    const projection = recorder(PROJECTION);

    await runOnce(deps(outbox, projection), LOOP);
    assert.equal(projection.received.length, 3);

    // 2ª rodada do MESMO consumidor: idempotência preservada POR CONSUMIDOR — que é o que se
    // perderia se a marcação global fosse simplesmente removida em favor do fanout.
    await runOnce(deps(outbox, projection), LOOP);
    assert.equal(projection.received.length, 3, 'nada foi reentregue na 2ª rodada');
  });

  it('CA2 — o evento pendente segue pendente para quem ainda não o processou', async () => {
    const logger = recorder(LOGGER);
    await runOnce(deps(outbox, logger), LOOP);

    assert.equal(outbox.pendingFor(LOGGER).length, 0, 'nada pendente para quem já processou');
    assert.equal(outbox.pendingFor(PROJECTION).length, 3, 'tudo pendente para quem não rodou');
  });

  it('a desistência de um consumidor não rouba o evento do outro', async () => {
    // O segundo caminho de perda, que a correção do claim sozinha não fecharia: `moveToDeadLetter`
    // fazia DELETE na linha de origem. Um consumidor esgotar `maxAttempts` apagava o evento para
    // todos — e quebrava a reconstrução prometida no ADR-0022:40, que depende de o log reter a
    // entrada (0022:27-29).
    const failing = recorder(LOGGER, true);

    // `maxAttempts: 3` → 3 rodadas levam os eventos à DLQ deste consumidor.
    await runOnce(deps(outbox, failing), LOOP);
    await runOnce(deps(outbox, failing), LOOP);
    await runOnce(deps(outbox, failing), LOOP);

    assert.equal(outbox.deadLetter().length, 3, 'os 3 eventos foram à DLQ do consumidor que falha');
    assert.equal(outbox.all().length, 3, 'e PERMANECEM no outbox — a origem não é apagada');
    assert.equal(outbox.pendingFor(LOGGER).length, 0, 'ele desistiu: não tenta mais');

    // O outro consumidor nunca falhou e recebe tudo, apesar da desistência do primeiro.
    const healthy = recorder(PROJECTION);
    await runOnce(deps(outbox, healthy), LOOP);
    assert.equal(healthy.received.length, 3, 'a projeção recebe os 3 mesmo assim');
  });

  it('o orçamento de retry é por consumidor — a falha de um não gasta o do outro', async () => {
    // Segundo defeito, distinto da perda: `attempts` era coluna da linha do outbox. Um consumidor
    // falhando 3x levava o outro à DLQ sem que ele jamais tivesse falhado.
    const failing = recorder(LOGGER, true);
    await runOnce(deps(outbox, failing), LOOP);
    await runOnce(deps(outbox, failing), LOOP);

    const healthy = recorder(PROJECTION);
    const [row] = outbox.pendingFor(PROJECTION);
    assert.equal(row?.attempts, 0, 'a projeção começa com zero tentativas, não com as alheias');

    await runOnce(deps(outbox, healthy), LOOP);
    assert.equal(healthy.received.length, 3);
    assert.equal(outbox.deadLetter().length, 0, 'ninguém foi à DLQ por falha de terceiro');
  });
});
