/**
 * `isPendingForConsumer` — o predicado do claim por consumidor (#800, #824).
 *
 * Testa a REGRA isolada. O que ela produz em conjunto (dois consumidores recebendo cada um todos
 * os eventos) está em `fanout-two-consumers.test.ts`; a tradução SQL dela, nas suítes de
 * integração dos adapters Drizzle.
 *
 * Por que a regra merece teste próprio, sendo duas linhas: ela é aplicada em DOIS lugares que têm
 * de concordar — o `WHERE … NOT EXISTS` do Drizzle e o filtro do in-memory. Foi a divergência
 * silenciosa entre implementações que deixou dois adapters errados juntos, concordando um com o
 * outro, sem nenhum teste acusar.
 */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  isPendingForConsumer,
  type ConsumerProgress,
} from '#src/shared/outbox/consumer-progress.ts';

const CONSUMER = 'financial-supplier-view';
const EVENT = '11111111-1111-4111-8111-111111111111';

const progress = (patch: Partial<ConsumerProgress> = {}): ConsumerProgress => ({
  consumerId: CONSUMER,
  eventId: EVENT,
  processedAt: null,
  attempts: 0,
  lastError: null,
  deadLetteredAt: null,
  ...patch,
});

describe('isPendingForConsumer — pendência é por consumidor, não da linha', () => {
  it('evento nunca visto por este consumidor está pendente', () => {
    // O caso dominante em fanout — e o que o desenho antigo tornava impossível: o evento que o
    // OUTRO consumidor reivindicasse primeiro já nascia invisível para este.
    assert.equal(isPendingForConsumer(undefined), true);
  });

  it('evento que este consumidor tentou e falhou segue pendente', () => {
    assert.equal(
      isPendingForConsumer(progress({ attempts: 2, lastError: 'DeliveryUnavailable' })),
      true,
    );
  });

  it('evento já processado por este consumidor não é reentregue', () => {
    assert.equal(isPendingForConsumer(progress({ processedAt: new Date() })), false);
  });

  it('evento dead-lettered por este consumidor não é reentregue', () => {
    // Terminal por decisão registrada: não existe caminho automático de volta da DLQ neste
    // repositório, e reentregar giraria para sempre num evento venenoso (não há backoff).
    // A volta é deliberada — limpar `dead_lettered_at`, já que o evento nunca saiu do outbox.
    assert.equal(
      isPendingForConsumer(progress({ deadLetteredAt: new Date(), attempts: 5 })),
      false,
    );
  });

  it('`attempts` alto, sozinho, NÃO barra a entrega', () => {
    // A desistência é decidida por `runOnce` contra `maxAttempts` (config do worker). Repetir o
    // teto neste predicado criaria duas regras para a mesma coisa, e elas divergiriam.
    assert.equal(isPendingForConsumer(progress({ attempts: 999 })), true);
  });
});
