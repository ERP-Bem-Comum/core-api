import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type {
  StatementTransaction,
  Movement,
  ReconciliationStatus,
} from '#src/modules/financial/domain/statement/types.ts';
// W0 RED (#139): o builder do read-model do extrato ainda não existe.
import { buildStatementView } from '#src/modules/financial/domain/statement/statement-view.ts';

// Fixture mínima: o builder usa date/movement/valueCents/reconciliationStatus + passthrough.
let seq = 0;
const tx = (
  over: Partial<{
    date: string;
    movement: Movement;
    valueCents: number;
    status: ReconciliationStatus;
  }> = {},
): StatementTransaction => {
  seq += 1;
  return {
    id: `tx-${seq}`,
    fitid: `fit-${seq}`,
    date: new Date(over.date ?? '2026-01-10T12:00:00.000Z'),
    movement: over.movement ?? 'Debit',
    entryType: 'PIX',
    payeeName: 'FULANO',
    memo: 'pag',
    valueCents: over.valueCents ?? 1000,
    balanceAfterCents: 0,
    reconciliationStatus: over.status ?? 'Pending',
  } as StatementTransaction;
};

describe('financial/domain/statement/statement-view (#139)', () => {
  it('CA: running balance = saldo de abertura + Σ assinado (Credit:+ / Debit:−)', () => {
    const v = buildStatementView(100000, [
      tx({ date: '2026-01-10T09:00:00.000Z', movement: 'Credit', valueCents: 50000 }),
      tx({ date: '2026-01-10T15:00:00.000Z', movement: 'Debit', valueCents: 30000 }),
    ]);
    const lines = v.days.flatMap((d) => d.lines);
    assert.equal(lines.length, 2);
    assert.equal(lines[0]?.runningBalanceCents, 150000); // 100000 + 50000
    assert.equal(lines[1]?.runningBalanceCents, 120000); // 150000 - 30000
    assert.equal(v.openingBalanceCents, 100000);
    assert.equal(v.closingBalanceCents, 120000);
  });

  it('CA: agrupamento por dia com subtotais (entradas/saídas/saldo do dia)', () => {
    const v = buildStatementView(0, [
      tx({ date: '2026-01-10T09:00:00.000Z', movement: 'Credit', valueCents: 20000 }),
      tx({ date: '2026-01-10T18:00:00.000Z', movement: 'Debit', valueCents: 5000 }),
      tx({ date: '2026-01-11T10:00:00.000Z', movement: 'Debit', valueCents: 7000 }),
    ]);
    assert.equal(v.days.length, 2);
    const d10 = v.days.find((d) => d.date === '2026-01-10');
    assert.ok(d10);
    assert.equal(d10?.inCents, 20000);
    assert.equal(d10?.outCents, 5000);
    assert.equal(d10?.dayBalanceCents, 15000); // saldo corrente ao fim do dia
    const d11 = v.days.find((d) => d.date === '2026-01-11');
    assert.equal(d11?.dayBalanceCents, 8000); // 15000 - 7000
  });

  it('CA: contadores all|in|out|reconciled|pending (conciliada = Reconciled|ManualEntry)', () => {
    const v = buildStatementView(0, [
      tx({ movement: 'Credit', status: 'Reconciled' }),
      tx({ movement: 'Debit', status: 'Pending' }),
      tx({ movement: 'Debit', status: 'ManualEntry' }),
    ]);
    assert.equal(v.counters.all, 3);
    assert.equal(v.counters.in, 1);
    assert.equal(v.counters.out, 2);
    assert.equal(v.counters.reconciled, 2); // Reconciled + ManualEntry
    assert.equal(v.counters.pending, 1);
  });

  it('CA: filtro seleciona linhas exibidas mas preserva running balance e contadores', () => {
    const v = buildStatementView(
      0,
      [
        tx({ date: '2026-01-10T09:00:00.000Z', movement: 'Credit', valueCents: 10000 }),
        tx({ date: '2026-01-10T15:00:00.000Z', movement: 'Debit', valueCents: 4000 }),
      ],
      'out',
    );
    const lines = v.days.flatMap((d) => d.lines);
    assert.equal(lines.length, 1); // só a saída
    assert.equal(lines[0]?.movement, 'Debit');
    assert.equal(lines[0]?.runningBalanceCents, 6000); // cumulativo (10000 - 4000), não isolado
    assert.equal(v.counters.all, 2); // contadores sobre o período inteiro
    assert.equal(v.closingBalanceCents, 6000);
  });
});
