import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/index.ts';
import { getStatementReconciledTitles } from '#src/modules/financial/application/use-cases/get-statement-reconciled-titles.ts';

const item = (transactionId: string, payableId: string, cents: number) => ({
  transactionId,
  reconciliationId: `rec-${transactionId}`,
  payableId,
  reconciledValueCents: cents,
});

const summary = (payableId: string, over: Record<string, unknown> = {}) => ({
  payableId,
  documentId: `doc-${payableId}`,
  documentNumber: `NF ${payableId}`,
  documentType: 'NFS-e',
  valueCents: 1,
  dueDate: new Date('2026-08-27T00:00:00.000Z'),
  status: 'Reconciled',
  paymentMethod: 'TED',
  supplierRef: 's',
  supplierName: `Fornecedor ${payableId}`,
  supplierDocument: null,
  retentionType: null,
  ...over,
});

describe('financial/application/get-statement-reconciled-titles (spec 132)', () => {
  it('agrupa os títulos por transação e usa o valor conciliado, não o do título', async () => {
    const r = await getStatementReconciledTitles({
      reconciliationRepo: {
        findActiveItemsByTransactions: () =>
          Promise.resolve(
            ok([item('t1', 'a', 120000), item('t1', 'b', 150000), item('t2', 'c', 900)]),
          ),
      },
      payableSummary: {
        getPayablesSummaryByIds: () =>
          Promise.resolve(ok([summary('a'), summary('b'), summary('c')])),
      },
    })(['t1', 't2']);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.get('t1')?.reconciliationId, 'rec-t1');
    assert.deepEqual(
      r.value.get('t1')?.titles.map((t) => [t.documentNumber, t.reconciledValueCents]),
      [
        ['NF a', 120000],
        ['NF b', 150000],
      ],
    );
    assert.equal(r.value.get('t2')?.titles.length, 1);
  });

  it('título não resolvido continua na lista com o valor, sem os dados do documento', async () => {
    const r = await getStatementReconciledTitles({
      reconciliationRepo: {
        findActiveItemsByTransactions: () => Promise.resolve(ok([item('t1', 'x', 500)])),
      },
      payableSummary: { getPayablesSummaryByIds: () => Promise.resolve(ok([])) },
    })(['t1']);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const title = r.value.get('t1')?.titles[0];
    assert.equal(title?.documentNumber, null);
    assert.equal(title?.reconciledValueCents, 500);
  });

  it('consulta o resumo uma vez só, sem repetir ids', async () => {
    const calls: (readonly string[])[] = [];
    await getStatementReconciledTitles({
      reconciliationRepo: {
        findActiveItemsByTransactions: () =>
          Promise.resolve(ok([item('t1', 'a', 1), item('t2', 'a', 2), item('t3', 'b', 3)])),
      },
      payableSummary: {
        getPayablesSummaryByIds: (refs) => {
          calls.push(refs);
          return Promise.resolve(ok([]));
        },
      },
    })(['t1', 't2', 't3']);
    assert.deepEqual(calls, [['a', 'b']]);
  });

  it('falha na leitura vira erro: o relatório não pode sair como se não houvesse títulos', async () => {
    const r = await getStatementReconciledTitles({
      reconciliationRepo: {
        findActiveItemsByTransactions: () =>
          Promise.resolve(err('reconciliation-repository-failure' as const)),
      },
      payableSummary: { getPayablesSummaryByIds: () => Promise.resolve(ok([])) },
    })(['t1']);
    assert.equal(r.ok, false);
  });
});
