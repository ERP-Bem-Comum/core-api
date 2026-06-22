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
