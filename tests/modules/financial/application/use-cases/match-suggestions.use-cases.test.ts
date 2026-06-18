// CA4/CA5 (#121) — suggestMatches (read-model) + rejectSuggestion. Usa adapters in-memory reais.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import type { StatementTransaction } from '#src/modules/financial/domain/statement/types.ts';
import type { SuggestionCandidate } from '#src/modules/financial/application/ports/suggestion-view.ts';
import {
  createInMemorySuggestionView,
  type SuggestionCandidateStore,
} from '#src/modules/financial/adapters/persistence/repos/suggestion-view.in-memory.ts';
import { createInMemoryRejectedSuggestionRepository } from '#src/modules/financial/adapters/persistence/repos/rejected-suggestion-repository.in-memory.ts';
import { suggestMatches } from '#src/modules/financial/application/use-cases/suggest-matches.ts';
import { rejectSuggestion } from '#src/modules/financial/application/use-cases/reject-suggestion.ts';

const WHEN = new Date('2024-05-20T12:00:00.000Z');
const D = new Date('2024-05-18T00:00:00.000Z');
const TX_ID = '00000000-0000-4000-8000-000000000abc';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const txId = (() => {
  const r = StatementTransactionId.rehydrate(TX_ID);
  if (!r.ok) throw new Error('setup: txId');
  return r.value;
})();
const tx: StatementTransaction = {
  id: txId,
  fitid: (() => {
    const f = Fitid.fromNative('f-tx');
    if (!f.ok) throw new Error('setup');
    return f.value;
  })(),
  date: D,
  movement: 'Debit',
  entryType: 'TED',
  payeeName: 'FORNECEDOR X',
  memo: 'pagamento ref NF-001',
  valueCents: 1000,
  balanceAfterCents: 0,
  reconciliationStatus: 'Pending',
};

const candidate = (
  over: Partial<SuggestionCandidate> & { payableId: string },
): SuggestionCandidate => ({
  valueCents: 1000,
  dueDate: D,
  supplierRef: null,
  supplierName: null,
  documentNumber: null,
  ...over,
});

const fakeStatements = () => ({
  findTransaction: (): Promise<
    Result<{ transaction: StatementTransaction; debitAccountRef: string } | null, never>
  > => Promise.resolve(ok({ transaction: tx, debitAccountRef: 'acc' })),
});

const seededView = (): {
  view: ReturnType<typeof createInMemorySuggestionView>;
  store: SuggestionCandidateStore;
} => {
  const store: SuggestionCandidateStore = new Map([
    [
      A,
      candidate({
        payableId: A,
        supplierName: 'FORNECEDOR X',
        documentNumber: 'NF-001',
        supplierRef: 's1',
      }),
    ],
    [B, candidate({ payableId: B, supplierRef: 's2' })], // só valor + data (+ supplierOpen) → media
    [
      C,
      candidate({
        payableId: C,
        valueCents: 9999,
        dueDate: new Date('2020-01-01T00:00:00.000Z'),
        supplierName: 'OUTRO',
        documentNumber: 'ZZZ',
        supplierRef: 's3',
      }),
    ],
  ]);
  return { view: createInMemorySuggestionView(store), store };
};

describe('financial/application/use-cases/suggest-matches', () => {
  it('CA4: ordena por score desc; exclui band baixa', async () => {
    const { view } = seededView();
    const r = await suggestMatches({
      statements: fakeStatements(),
      suggestions: view,
      rejected: createInMemoryRejectedSuggestionRepository(),
    })(TX_ID);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.length, 2); // A (100/alta) e B (media); C (baixa) excluído
    assert.equal(r.value[0]?.payableId, A);
    assert.equal(r.value[0]?.band, 'alta');
    assert.equal(r.value[0]?.score, 100);
    assert.equal(r.value[1]?.payableId, B);
    assert.equal(r.value[1]?.band, 'media');
    assert.ok((r.value[0]?.score ?? 0) > (r.value[1]?.score ?? 0));
  });

  it('CA5: rejeitar uma sugestão a remove das próximas', async () => {
    const { view } = seededView();
    const rejected = createInMemoryRejectedSuggestionRepository();

    const rej = await rejectSuggestion({ rejected, clock: { now: () => WHEN } })({
      transactionId: TX_ID,
      payableId: A,
      rejectedBy: 'u1',
    });
    assert.equal(rej.ok, true);

    const r = await suggestMatches({
      statements: fakeStatements(),
      suggestions: view,
      rejected,
    })(TX_ID);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.length, 1);
      assert.equal(r.value[0]?.payableId, B);
    }
  });

  it('CA4: transação inexistente → statement-transaction-not-found', async () => {
    const { view } = seededView();
    const r = await suggestMatches({
      statements: {
        findTransaction: () => Promise.resolve(ok(null)),
      },
      suggestions: view,
      rejected: createInMemoryRejectedSuggestionRepository(),
    })(TX_ID);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'statement-transaction-not-found');
  });
});
