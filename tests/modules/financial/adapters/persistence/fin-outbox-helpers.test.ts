/**
 * W0 RED (024-fin-transactional-outbox · #127) — helper appendFinOutboxInTx.
 *
 * Núcleo da fundação: mapeia eventos de domínio do Financeiro para linhas do fin_outbox e os insere
 * DENTRO de uma tx (estrutural `{ insert }`), espelhando appendOutboxInTx de contracts. A atomicidade
 * (estado+evento na mesma db.transaction) depende deste helper + da tabela fin_outbox.
 *
 * DEVE FALHAR em W0: `fin-outbox-helpers.ts` ainda não existe.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import { appendFinOutboxInTx } from '#src/modules/financial/adapters/persistence/repos/fin-outbox-helpers.ts';

// Tipo inferido concreto (PayableReconciled tem `occurredAt`) — atribuível a FinancialAppendableEvent.
const payableReconciled = () => ({
  type: 'PayableReconciled' as const,
  payableId: PayableId.generate(),
  reconciliationId: ReconciliationId.generate(),
  transactionId: StatementTransactionId.generate(),
  reconciledValueCents: 1000,
  occurredAt: new Date('2026-06-22T12:00:00.000Z'),
});

describe('#127 — appendFinOutboxInTx', () => {
  it('mapeia eventos para linhas e chama tx.insert(finOutbox).values(...)', async () => {
    let capturedRows: readonly Record<string, unknown>[] | undefined;
    const fakeTx = {
      insert: () => ({
        values: (rows: readonly Record<string, unknown>[]) => {
          capturedRows = rows;
          return Promise.resolve(undefined);
        },
      }),
    };
    const ev = payableReconciled();
    await appendFinOutboxInTx(fakeTx as never, [ev]);

    assert.ok(capturedRows, 'deve inserir 1 linha');
    const row = capturedRows[0]!;
    assert.equal(row['eventType'], 'PayableReconciled');
    assert.equal(row['aggregateType'], 'Reconciliation');
    assert.equal(typeof row['eventId'], 'string');
    assert.equal(typeof row['payload'], 'string'); // payload serializado (varchar, nao JSON nativo)
    assert.equal(row['occurredAt'], ev.occurredAt);
    assert.equal(row['processedAt'], null);
  });

  it('events vazio -> no-op (nao chama insert)', async () => {
    let called = false;
    const fakeTx = {
      insert: () => {
        called = true;
        return { values: () => Promise.resolve(undefined) };
      },
    };
    await appendFinOutboxInTx(fakeTx as never, []);
    assert.equal(called, false);
  });
});

/**
 * #792 / ADR-0065 §2 — a que agregado pertence um evento que carrega DOIS ids.
 *
 * `extractAggregateInfo` deriva o agregado testando `'documentId' in e` ANTES de `'remittanceId' in
 * e`. Até o ADR-0065 isso não decidia nada: nenhum evento carregava os dois, e o comentário do helper
 * dizia justamente que "não colide". `PayableTransmitted` carrega — `documentId` porque é a nota que
 * exibe o marco na trilha (#823), `remittanceId` porque é a resposta a "em qual remessa o título
 * foi".
 *
 * Estes casos existem para que a ordem daqueles dois `if` seja uma PROPRIEDADE verificada e não um
 * acidente que sobreviveu: inverter os dois manda o evento para o agregado `Remittance`, a trilha da
 * nota nunca o encontra, e **nada quebra** — os dois valores são válidos no CHECK da tabela. É a
 * classe de defeito que passa no gate e aparece meses depois, na tela de um operador.
 */
describe('#792 — o agregado de um evento com documentId E remittanceId', () => {
  const captureRow = async (event: Readonly<Record<string, unknown>>) => {
    let captured: readonly Record<string, unknown>[] | undefined;
    const fakeTx = {
      insert: () => ({
        values: (rows: readonly Record<string, unknown>[]) => {
          captured = rows;
          return Promise.resolve(undefined);
        },
      }),
    };
    await appendFinOutboxInTx(fakeTx as never, [event as never]);
    assert.ok(captured);
    return captured[0]!;
  };

  const payableTransmitted = {
    type: 'PayableTransmitted' as const,
    documentId: '11111111-1111-4111-8111-111111111111',
    payableId: '22222222-2222-4222-8222-222222222222',
    remittanceId: '33333333-3333-4333-8333-333333333333',
    nsa: 7,
    fileName: 'PAG_000000.11082026142605_000007.REM',
    occurredAt: new Date('2026-08-24T12:00:00.000Z'),
  };

  it('vai para o agregado Document, e com o id da NOTA — não o da remessa', async () => {
    const row = await captureRow(payableTransmitted);

    assert.equal(row['aggregateType'], 'Document');
    assert.equal(
      row['aggregateId'],
      payableTransmitted.documentId,
      'o agregado é a nota: é a trilha dela que exibe o marco (#823)',
    );
    assert.equal(row['eventType'], 'PayableTransmitted');
  });

  // O contraste que prova que o ramo da remessa segue vivo: evento da PRÓPRIA remessa carrega
  // `payableIds` (plural) e nenhum `documentId`, então cai no ramo certo pelo outro caminho.
  it('o evento da própria remessa continua indo para o agregado Remittance', async () => {
    const row = await captureRow({
      type: 'RemittanceTransmitted' as const,
      remittanceId: '33333333-3333-4333-8333-333333333333',
      nsa: 7,
      fileName: 'PAG_000000.11082026142605_000007.REM',
      payableIds: ['22222222-2222-4222-8222-222222222222'],
      settledAt: '2026-08-24T12:05:00.000Z',
      detail: 'consta em BACKUP',
    });

    assert.equal(row['aggregateType'], 'Remittance');
    assert.equal(row['aggregateId'], '33333333-3333-4333-8333-333333333333');
  });

  // `occurredAt` do evento, não o `now` do append: o marco é o instante da geração, e a distinção
  // importa porque a projeção usa esse campo como guard de recência (ADR-0045).
  it('carimba o instante da transição, não o da gravação', async () => {
    const row = await captureRow(payableTransmitted);
    assert.equal(row['occurredAt'], payableTransmitted.occurredAt);
  });
});
