// CA5 (#120): round-trip row↔domínio do extrato. `entryType` (string aberta) preservado; toDomain
// revalida enums vindos do banco (movement). Teste puro — roda no gate (sem Docker).

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import type { ImportStatementInput } from '#src/modules/financial/domain/statement/types.ts';
import {
  statementToRow,
  transactionsToRows,
  toDomain,
} from '#src/modules/financial/adapters/persistence/mappers/statement.mapper.ts';

const fitidOf = (raw: string): Fitid.Fitid => {
  const r = Fitid.fromNative(raw);
  if (!r.ok) throw new Error('test setup: fitid');
  return r.value;
};

const buildStatement = () => {
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
        payeeName: 'FORNECEDOR X',
        memo: 'pagamento',
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

describe('financial/adapters/persistence/mappers/statement.mapper', () => {
  it('CA5: round-trip statement + transação row↔domínio (entryType preservado)', () => {
    const statement = buildStatement();
    const row = statementToRow(statement);
    const txRows = transactionsToRows(statement);

    const back = toDomain(row, txRows);
    assert.equal(back.ok, true);
    if (back.ok) {
      assert.equal(back.value.id, statement.id);
      assert.equal(back.value.debitAccountRef, statement.debitAccountRef);
      assert.equal(back.value.file.format, 'OFX');
      assert.equal(back.value.openingBalanceCents, 0);
      assert.equal(back.value.closingBalanceCents, 50000);
      assert.equal(back.value.transactions.length, 1);
      const tx = back.value.transactions[0];
      assert.ok(tx);
      assert.equal(tx.entryType, 'TED');
      assert.equal(tx.movement, 'Debit');
      assert.equal(tx.valueCents, 1000);
      assert.equal(tx.reconciliationStatus, 'Pending');
      assert.equal(tx.fitid, statement.transactions[0]?.fitid);
    }
  });

  it('CA5: toDomain rejeita movement inválido vindo do banco', () => {
    const statement = buildStatement();
    const row = statementToRow(statement);
    const corrupted = transactionsToRows(statement).map((r) => ({ ...r, movement: 'Sideways' }));
    const back = toDomain(row, corrupted);
    assert.equal(back.ok, false);
    if (!back.ok) assert.equal(back.error, 'invalid-statement-movement');
  });

  // W0 RED (#159 CA4): com o union fechado, toDomain rejeita entry_type fora do conjunto.
  it('CA4: toDomain rejeita entry_type fora do union vindo do banco', () => {
    const statement = buildStatement();
    const row = statementToRow(statement);
    const corrupted = transactionsToRows(statement).map((r) => ({ ...r, entryType: 'XPTO' }));
    const back = toDomain(row, corrupted);
    assert.equal(back.ok, false);
    if (!back.ok) assert.equal(back.error, 'invalid-statement-entry-type');
  });
});
