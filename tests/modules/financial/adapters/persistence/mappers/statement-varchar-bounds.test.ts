// #161: transactionsToRows deve truncar os campos de texto aos limites do varchar do schema
// (memo 500, payee_name 255, entry_type 16) — senão um extrato com texto longo derruba o INSERT inteiro.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import type { ImportStatementInput } from '#src/modules/financial/domain/statement/types.ts';
import { transactionsToRows } from '#src/modules/financial/adapters/persistence/mappers/statement.mapper.ts';

const fitidOf = (raw: string): Fitid.Fitid => {
  const r = Fitid.fromNative(raw);
  if (!r.ok) throw new Error('test setup: fitid');
  return r.value;
};

const buildStatement = (over?: { memo?: string; payeeName?: string }) => {
  const input: ImportStatementInput = {
    debitAccountRef: '11111111-1111-4111-8111-111111111111',
    period: {
      start: new Date('2024-05-01T00:00:00.000Z'),
      end: new Date('2024-05-31T00:00:00.000Z'),
    },
    file: { name: 'extrato.ofx', format: 'OFX', hash: 'abc123' },
    openingBalanceCents: 0,
    closingBalanceCents: 50000,
    transactions: [
      {
        fitid: fitidOf('ofx-1'),
        date: new Date('2024-05-18T00:00:00.000Z'),
        movement: 'Debit',
        entryType: 'TED',
        payeeName: over?.payeeName ?? 'FORNECEDOR X',
        memo: over?.memo ?? 'pagamento',
        valueCents: 1000,
        balanceAfterCents: 49000,
      },
    ],
    occurredAt: new Date('2024-05-19T09:00:00.000Z'),
  };
  const r = importStatement(input, new Set());
  if (!r.ok) throw new Error('test setup: importStatement');
  return r.value.statement;
};

describe('financial/adapters/persistence/mappers/statement.mapper — bounds varchar (#161)', () => {
  it('CA1: memo de 600 chars → truncado a 500', () => {
    const rows = transactionsToRows(buildStatement({ memo: 'x'.repeat(600) }));
    assert.equal(rows[0]?.memo.length, 500);
  });

  it('CA2: payee_name de 300 chars → truncado a 255', () => {
    const rows = transactionsToRows(buildStatement({ payeeName: 'P'.repeat(300) }));
    assert.equal(rows[0]?.payeeName.length, 255);
  });

  it('valores dentro do limite passam intactos', () => {
    const rows = transactionsToRows(
      buildStatement({ memo: 'pagamento', payeeName: 'FORNECEDOR X' }),
    );
    assert.equal(rows[0]?.memo, 'pagamento');
    assert.equal(rows[0]?.payeeName, 'FORNECEDOR X');
  });
});
