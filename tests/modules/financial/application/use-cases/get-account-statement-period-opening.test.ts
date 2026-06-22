import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { getAccountStatement } from '#src/modules/financial/application/use-cases/get-account-statement.ts';

// #205 — o read-model do extrato deve abrir o período com o saldo REAL acumulado até `from` (abertura
// da conta + Σ assinado das transações anteriores), não com a abertura fixa da conta. Usa o repo
// in-memory REAL (filtra por data) p/ exercitar a partição before/in-range.

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

const txOf = (
  raw: string,
  date: string,
  movement: 'Credit' | 'Debit',
  valueCents: number,
): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: new Date(date),
  movement,
  entryType: 'TED',
  payeeName: 'FORNECEDOR X',
  memo: 'mov',
  valueCents,
  balanceAfterCents: 0,
});

describe('financial/application — getAccountStatement abertura do período (#205)', () => {
  it('CA1/CA2: abertura do período = abertura da conta + Σ assinado das transações anteriores a `from`', async () => {
    const accountId = CedenteAccountId.generate();
    const account = createCedente({
      id: accountId,
      bankCode: '237',
      agency: '1234',
      accountNumber: '567890',
      accountDigit: '1',
      convenio: '9999999',
      document: '12345678000190',
      openingBalanceCents: 10000,
      openingBalanceDate: '2024-01-01',
    });
    if (!account.ok) throw new Error('setup: cedente');
    const cedenteStore = createInMemoryCedenteAccountStore();
    await cedenteStore.save(account.value);

    const imported = importStatement(
      {
        debitAccountRef: String(accountId),
        period: { start: new Date('2024-04-01'), end: new Date('2024-05-31') },
        file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
        openingBalanceCents: 0,
        closingBalanceCents: 0,
        transactions: [
          txOf('f1', '2024-04-15T00:00:00.000Z', 'Credit', 5000), // ANTES de `from`
          txOf('f2', '2024-05-10T00:00:00.000Z', 'Debit', 2000), // no período
          txOf('f3', '2024-05-20T00:00:00.000Z', 'Credit', 1000), // no período
        ],
        occurredAt: new Date('2024-05-31'),
      },
      new Set(),
    );
    if (!imported.ok) throw new Error('setup: importStatement');
    const store: BankStatementStore = new Map([
      [imported.value.statement.id, imported.value.statement],
    ]);
    const statements = createInMemoryBankStatementRepository(store);

    const r = await getAccountStatement({ cedenteStore, statements })({
      accountId: String(accountId),
      from: new Date('2024-05-01T00:00:00.000Z'),
      to: new Date('2024-05-31T23:59:59.999Z'),
    });

    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    // Abertura do período = 10000 (conta) + 5000 (crédito de abril, < from) = 15000.
    assert.equal(r.value.openingBalanceCents, 15000);
    // Fechamento = 15000 - 2000 + 1000 = 14000.
    assert.equal(r.value.closingBalanceCents, 14000);
    // Linhas exibidas só do período [from..to] (as 2 de maio); a de abril fica fora.
    assert.equal(r.value.days.flatMap((d) => d.lines).length, 2);
  });
});
