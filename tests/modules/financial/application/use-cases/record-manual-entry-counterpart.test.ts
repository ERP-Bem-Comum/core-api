/**
 * W0 RED — FIN-COUNTERPART-INVESTMENT-REDEMPTION (#428). Estende a criação da contrapartida esperada
 * de só `type='Transfer'` para `Investment` (Aplicação) e `Redemption` (Resgate) quando há
 * `destinationAccountRef`. O movimento esperado no destino segue agnóstico ao tipo
 * (`opposite(transaction.movement)`) — muda só a abrangência do guard e o `type` propagado.
 *
 * RED por: hoje `record-manual-entry.ts:149` só cria a contrapartida quando `type==='Transfer'`
 * (Investment/Redemption caem no guard e NÃO criam) e `expected-counterpart.ts:50` hardcoda
 * `type:'Transfer'`. As asserções novas de Investment/Redemption falham por essa semântica ausente.
 *
 * CA1(#428): Investment + destino → contrapartida Pending type=Investment, movement oposto, valor espelhado.
 * CA2(#428): Redemption + destino → contrapartida Pending type=Redemption, movement oposto.
 * CA3(#428, não-regressão): Transfer continua criando; Payment/FeePenaltyInterest (e qualquer tipo sem
 *   destino) NÃO criam.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction, Movement } from '#src/modules/financial/domain/statement/types.ts';
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
const txOf = (
  raw: string,
  valueCents: number,
  movement: Movement = 'Debit',
): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement,
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

describe('financial/application — recordManualEntry cria contrapartida (Transfer/Investment/Redemption · #428)', () => {
  it('CA3(não-regressão): Transfer + destino → 1 contrapartida Pending em B (movement oposto, valor da transação)', async () => {
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
    assert.equal(cp.type, 'Transfer', 'tipo espelha o lançamento');
    assert.equal(cp.movement, 'Credit', 'oposto ao Debit da origem');
    assert.equal(cp.valueCents, 2500n, 'espelha o valor da transação');
    assert.equal(String(cp.destinationAccountRef), String(dest.id));
  });

  it('CA1(#428): Investment + destino → 1 contrapartida Pending type=Investment (movement oposto)', async () => {
    // Origem Debit (aplica: sai da corrente) → destino espera Credit.
    const w = buildWorld([txOf('f0', 2500, 'Debit')]);
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
    assert.equal(r.ok, true, JSON.stringify(r));

    const pending = await w.counterpartStore.listPendingByAccount(dest.id);
    assert.equal(pending.ok, true);
    if (!pending.ok) return;
    assert.equal(pending.value.length, 1, 'Investment com destino cria contrapartida em B');
    const cp = pending.value[0]!;
    assert.equal(cp.status, 'Pending');
    assert.equal(
      cp.type,
      'Investment',
      'contrapartida herda o tipo do lançamento (não Transfer fixo)',
    );
    assert.equal(cp.movement, 'Credit', 'oposto ao Debit da origem');
    assert.equal(cp.valueCents, 2500n, 'espelha o valor da transação');
    assert.equal(String(cp.destinationAccountRef), String(dest.id));
  });

  it('CA2(#428): Redemption + destino → 1 contrapartida Pending type=Redemption (origem Credit → movement Debit)', async () => {
    // Resgate: entra na corrente → transação Credit → destino espera Debit (direção oposta).
    const w = buildWorld([txOf('f0', 7000, 'Credit')]);
    const dest = cedente('341', '445566');
    await w.cedenteStore.save(w.account);
    await w.cedenteStore.save(dest);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Redemption',
      productLabel: 'Tesouro',
      destinationAccountRef: String(dest.id),
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));

    const pending = await w.counterpartStore.listPendingByAccount(dest.id);
    assert.equal(pending.ok, true);
    if (!pending.ok) return;
    assert.equal(pending.value.length, 1, 'Redemption com destino cria contrapartida em B');
    const cp = pending.value[0]!;
    assert.equal(cp.status, 'Pending');
    assert.equal(cp.type, 'Redemption', 'contrapartida herda o tipo do lançamento');
    assert.equal(cp.movement, 'Debit', 'oposto ao Credit da origem');
    assert.equal(cp.valueCents, 7000n, 'espelha o valor da transação');
  });

  it('CA3(não-regressão): sem destinationAccountRef → nenhuma contrapartida', async () => {
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

  it('CA3(não-regressão): Payment mesmo COM destino → nenhuma contrapartida (fora dos 3 tipos)', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    const dest = cedente('341', '778899');
    await w.cedenteStore.save(w.account);
    await w.cedenteStore.save(dest);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Payment',
      destinationAccountRef: String(dest.id),
      reconciledBy: 'u1',
    });
    // O lançamento pode ser aceito, mas a contrapartida só nasce em Transfer/Investment/Redemption.
    const pending = await w.counterpartStore.listPendingByAccount(dest.id);
    assert.equal(
      pending.ok && pending.value.length === 0,
      true,
      'Payment não gera contrapartida esperada',
    );
    assert.equal(typeof r.ok, 'boolean');
  });
});
