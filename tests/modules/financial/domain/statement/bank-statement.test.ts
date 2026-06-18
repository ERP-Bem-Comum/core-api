import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
// W0 RED: o agregado BankStatement ainda não existe.
import * as BankStatement from '#src/modules/financial/domain/statement/bank-statement.ts';

const fit = (raw: string): Fitid.Fitid => {
  const r = Fitid.fromNative(raw);
  if (!r.ok) throw new Error('test setup: fitid');
  return r.value;
};

const tx = (raw: string, valueCents = 1000) => ({
  fitid: fit(raw),
  date: new Date('2024-05-18T00:00:00.000Z'),
  movement: 'Debit' as const,
  entryType: 'TED',
  payeeName: 'FORNECEDOR X',
  memo: 'pagamento',
  valueCents,
  balanceAfterCents: 50000,
});

const baseInput = (transactions: readonly ReturnType<typeof tx>[]) => ({
  debitAccountRef: 'acc-1',
  period: {
    start: new Date('2024-05-01T00:00:00.000Z'),
    end: new Date('2024-05-31T00:00:00.000Z'),
  },
  file: { name: 'extrato.ofx', format: 'OFX' as const, hash: 'abc123' },
  openingBalanceCents: 0,
  closingBalanceCents: 50000,
  transactions,
  occurredAt: new Date('2024-05-19T09:00:00.000Z'),
});

// Critérios de aceite em .claude/.pipeline/FIN-RECON-STATEMENT-DOMAIN/000-request.md (CA1–CA3, CA6).
describe('financial/domain/statement/bank-statement — importStatement (dedup por FITID)', () => {
  it('CA1: 10 transações distintas → 10 Pending, 0 duplicatas', () => {
    const txs = Array.from({ length: 10 }, (_, i) => tx(`fid-${i}`));
    const r = BankStatement.importStatement(baseInput(txs), new Set());
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.statement.transactions.length, 10);
      assert.equal(r.value.discardedDuplicates, 0);
      assert.equal(r.value.statement.transactions[0]?.reconciliationStatus, 'Pending');
    }
  });

  it('CA2: 3 FITID já conhecidos → 7 persistidas, 3 descartadas (silencioso, sem erro)', () => {
    const txs = Array.from({ length: 10 }, (_, i) => tx(`fid-${i}`));
    const known = new Set(['fid-0', 'fid-1', 'fid-2']);
    const r = BankStatement.importStatement(baseInput(txs), known);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.statement.transactions.length, 7);
      assert.equal(r.value.discardedDuplicates, 3);
    }
  });

  it('CA3: FITID duplicado dentro do próprio arquivo → mantém 1, conta 1', () => {
    const r = BankStatement.importStatement(baseInput([tx('dup'), tx('dup')]), new Set());
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.statement.transactions.length, 1);
      assert.equal(r.value.discardedDuplicates, 1);
    }
  });

  it('CA6: emite BankStatementImported com importedCount e debitAccountRef', () => {
    const r = BankStatement.importStatement(baseInput([tx('a'), tx('b')]), new Set());
    assert.equal(r.ok, true);
    if (r.ok) {
      const ev = r.value.events.find((e) => e.type === 'BankStatementImported');
      assert.ok(ev, 'evento BankStatementImported ausente');
      if (ev?.type === 'BankStatementImported') {
        assert.equal(ev.importedCount, 2);
        assert.equal(ev.debitAccountRef, 'acc-1');
      }
    }
  });

  it('atomicidade: importação sem nenhuma transação válida é rejeitada', () => {
    const r = BankStatement.importStatement(baseInput([]), new Set());
    assert.equal(isErr(r), true);
  });
});
