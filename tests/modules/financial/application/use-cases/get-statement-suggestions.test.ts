import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import { getStatementSuggestions } from '#src/modules/financial/application/use-cases/get-statement-suggestions.ts';

const tx = (id: string, status: string): unknown => ({
  id,
  reconciliationStatus: status,
  date: new Date('2026-01-10T12:00:00.000Z'),
  movement: 'Debit',
  entryType: 'PIX',
  payeeName: 'X',
  memo: 'm',
  valueCents: 1000,
  balanceAfterCents: 0,
  fitid: id,
});

const deps = (opts: {
  txs?: readonly unknown[] | null;
  suggestionsByTx?: Record<string, readonly unknown[]>;
}) => ({
  listStatementTransactions: (): Promise<Result<readonly unknown[] | null, never>> =>
    Promise.resolve(ok(opts.txs === undefined ? [] : opts.txs)),
  suggestMatches: (transactionId: string): Promise<Result<readonly unknown[], never>> =>
    Promise.resolve(ok(opts.suggestionsByTx?.[transactionId] ?? [])),
});

describe('financial/application/get-statement-suggestions (#174)', () => {
  it('palpite de topo por transação: Pending usa a sugestão top; conciliada → null', async () => {
    const r = await getStatementSuggestions(
      deps({
        txs: [tx('t1', 'Pending'), tx('t2', 'Reconciled')],
        suggestionsByTx: {
          t1: [
            { payableId: 'p1', score: 90, band: 'alta' },
            { payableId: 'p2', score: 60, band: 'media' },
          ],
        },
      }) as never,
    )({ statementId: 's1' });
    assert.equal(r.ok, true);
    if (r.ok) {
      const items = r.value.items;
      assert.equal(items.length, 2);
      const t1 = items.find((i) => i.transactionId === 't1');
      assert.equal(t1?.topBand, 'alta'); // top (score 90)
      assert.equal(t1?.topScore, 90);
      const t2 = items.find((i) => i.transactionId === 't2');
      assert.equal(t2?.topBand, null); // conciliada → sem palpite
      assert.equal(t2?.topScore, null);
    }
  });

  it('Pending sem candidatos → topBand null', async () => {
    const r = await getStatementSuggestions(
      deps({ txs: [tx('t1', 'Pending')], suggestionsByTx: {} }) as never,
    )({ statementId: 's1' });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.items[0]?.topBand, null);
  });

  it('extrato inexistente (null) → bank-statement-not-found', async () => {
    const r = await getStatementSuggestions(deps({ txs: null }) as never)({ statementId: 's1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'bank-statement-not-found');
  });
});
