/**
 * W0 RED — FIN-COUNTERPART-CREATE (US1 · spec 029 · #269). Application: `recordManualEntry` passa a
 * criar a Contrapartida Esperada no destino quando `type='Transfer'` + `destinationAccountRef`.
 * RED por inexistência do store da contrapartida + da integração no use-case.
 *
 * CA1: Transfer+destino → 1 contrapartida Pending em B (movement oposto, valor da transação).
 * CA2: sem destino OU type≠Transfer → nenhuma contrapartida (guard de não-regressão).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { recordManualEntry } from '#src/modules/financial/application/use-cases/record-manual-entry.ts';

const D = new Date('2024-05-18T00:00:00.000Z');
const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};
const txOf = (raw: string, valueCents: number): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement: 'Debit',
  entryType: 'Fee',
  payeeName: 'BANCO',
  memo: 'transf',
  valueCents,
  balanceAfterCents: 0,
});
const cedente = (bankCode: string, acc: string) => {
  const r = createCedente({
    id: CedenteAccountId.generate(),
    bankCode,
    agency: '1234',
    accountNumber: acc,
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!r.ok) throw new Error('setup: cedente');
  return r.value;
};

const buildWorld = (txs: readonly ParsedTransaction[]) => {
  const account = cedente('237', '567890');
  const imported = importStatement(
    {
      debitAccountRef: String(account.id),
      period: { start: D, end: D },
      file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: txs,
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;

  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const cedenteStore = createInMemoryCedenteAccountStore();
  const outbox = createInMemoryOutbox();
  const reconRepo = createInMemoryReconciliationRepository(
    { payables: new Map(), statements: statementStore },
    outbox.port,
  );
  const counterpartStore = createInMemoryExpectedCounterpartStore();
  const record = recordManualEntry({
    reconciliationRepo: reconRepo,
    statements: statementRepo,
    cedenteStore,
    periods: createInMemoryReconciliationPeriodStore(),
    clock: ClockReal(),
    expectedCounterpartStore: counterpartStore,
  });
  return {
    account,
    cedenteStore,
    counterpartStore,
    record,
    transactionIds: statement.transactions.map((t) => String(t.id)),
  };
};

describe('financial/application — recordManualEntry cria contrapartida (US1 · #269)', () => {
  it('CA1: Transfer + destino → 1 contrapartida Pending em B (movement oposto, valor da transação)', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    const dest = cedente('341', '112233');
    await w.cedenteStore.save(w.account);
    await w.cedenteStore.save(dest);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Transfer',
      destinationAccountRef: String(dest.id),
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));

    const pending = await w.counterpartStore.listPendingByAccount(dest.id);
    assert.equal(pending.ok, true);
    if (!pending.ok) return;
    assert.equal(pending.value.length, 1, 'contrapartida criada no destino');
    const cp = pending.value[0]!;
    assert.equal(cp.status, 'Pending');
    assert.equal(cp.movement, 'Credit', 'oposto ao Debit da origem');
    assert.equal(cp.valueCents, 2500n, 'espelha o valor da transação');
    assert.equal(String(cp.destinationAccountRef), String(dest.id));
  });

  it('CA2: sem destinationAccountRef → nenhuma contrapartida (não-regressão)', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'FeePenaltyInterest',
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));

    const pending = await w.counterpartStore.listPendingByAccount(w.account.id);
    assert.equal(
      pending.ok && pending.value.length === 0,
      true,
      'sem destino não cria contrapartida',
    );
  });

  it('CA2: type≠Transfer (mesmo com destino) → nenhuma contrapartida', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    const dest = cedente('341', '112233');
    await w.cedenteStore.save(w.account);
    await w.cedenteStore.save(dest);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Investment',
      productLabel: 'CDB',
      destinationAccountRef: String(dest.id),
      reconciledBy: 'u1',
    });
    // Independente do outcome do lançamento, a contrapartida NÃO nasce fora de Transfer.
    const pending = await w.counterpartStore.listPendingByAccount(dest.id);
    assert.equal(pending.ok && pending.value.length === 0, true, 'só Transfer cria contrapartida');
    assert.equal(typeof r.ok, 'boolean');
  });
});
