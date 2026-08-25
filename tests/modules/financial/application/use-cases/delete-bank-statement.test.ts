/**
 * FIN-DELETE-BANK-STATEMENT — W0 (RED) — excluir extrato importado, com GUARDA (sem cascata).
 *
 * Regras da P.O.: exclui só se o extrato existe E nenhuma transação conciliada E o período não está
 * fechado. Conciliada → `statement-has-reconciled-transactions`; período fechado → `period-closed`;
 * inexistente → `bank-statement-not-found`. Não faz undo/reopen automático. RED: use-case inexistente.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { deleteBankStatement } from '#src/modules/financial/application/use-cases/delete-bank-statement.ts';
import type {
  StatementTransaction,
  ReconciliationStatus,
} from '#src/modules/financial/domain/statement/types.ts';

const ACC = 'acc-0001';
const tx = (id: string, status: ReconciliationStatus): StatementTransaction =>
  ({
    id,
    fitid: id,
    date: new Date('2026-07-10T00:00:00.000Z'),
    reconciliationStatus: status,
  }) as unknown as StatementTransaction;

// Deps fake: só o que o use-case usa (listTransactions, findTransaction, deleteById, periods.isClosed).
const makeDeps = (opts: { txs: readonly StatementTransaction[] | null; closed?: boolean }) => {
  const deleted: string[] = [];
  const deps = {
    repo: {
      listTransactions: () => Promise.resolve(ok(opts.txs)),
      findTransaction: (id: string) =>
        Promise.resolve(ok({ transaction: tx(id, 'Pending'), debitAccountRef: ACC })),
      deleteById: (id: string) => {
        deleted.push(id);
        return Promise.resolve(ok(undefined));
      },
    },
    periods: { isClosed: () => Promise.resolve(ok(opts.closed ?? false)) },
  } as const;
  return { deps, deleted };
};

describe('deleteBankStatement — guarda (#FIN-DELETE-BANK-STATEMENT)', () => {
  it('CA1: extrato só com Pending → exclui (deleteById chamado)', async () => {
    const { deps, deleted } = makeDeps({ txs: [tx('t1', 'Pending'), tx('t2', 'Pending')] });
    const r = await deleteBankStatement(deps)({ statementId: 'stmt-1' });
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual(deleted, ['stmt-1']);
  });

  it('CA2: alguma transação conciliada → statement-has-reconciled-transactions (não exclui)', async () => {
    const { deps, deleted } = makeDeps({ txs: [tx('t1', 'Pending'), tx('t2', 'Reconciled')] });
    const r = await deleteBankStatement(deps)({ statementId: 'stmt-1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'statement-has-reconciled-transactions');
    assert.deepEqual(deleted, []);
  });

  it('CA2b: lançamento manual (ManualEntry) também bloqueia', async () => {
    const { deps } = makeDeps({ txs: [tx('t1', 'ManualEntry')] });
    const r = await deleteBankStatement(deps)({ statementId: 'stmt-1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'statement-has-reconciled-transactions');
  });

  it('CA3: período fechado → period-closed (não exclui)', async () => {
    const { deps, deleted } = makeDeps({ txs: [tx('t1', 'Pending')], closed: true });
    const r = await deleteBankStatement(deps)({ statementId: 'stmt-1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'period-closed');
    assert.deepEqual(deleted, []);
  });

  it('CA4: extrato inexistente → bank-statement-not-found', async () => {
    const { deps } = makeDeps({ txs: null });
    const r = await deleteBankStatement(deps)({ statementId: 'nope' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'bank-statement-not-found');
  });
});
