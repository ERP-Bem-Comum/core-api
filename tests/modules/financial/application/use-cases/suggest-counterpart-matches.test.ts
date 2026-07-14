/**
 * W0 RED — FIN-COUNTERPART-MATCH (US2 · spec 029 · #269). Application: `suggestCounterpartMatches` —
 * ao importar o extrato da conta de destino B, casar a transação real × contrapartida esperada
 * (valor exato + janela ~5d, movimento igual ao esperado). RED por inexistência do use-case.
 *
 * CA1: transação de B casa com a contrapartida Pending → sugestão (kind counterpart).
 * CA4: empate → contrapartida mais antiga (expectedDate) primeiro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as ExpectedCounterpart from '#src/modules/financial/domain/expected-counterpart/expected-counterpart.ts';
import * as ExpectedCounterpartId from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { createInMemoryBankStatementRepository } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { suggestCounterpartMatches } from '#src/modules/financial/application/use-cases/suggest-counterpart-matches.ts';

const D = new Date('2026-07-01T00:00:00.000Z');
const daysFrom = (base: Date, days: number) => new Date(base.getTime() + days * 86_400_000);

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};
const creditTx = (raw: string, valueCents: number): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement: 'Credit', // a perna esperada em B
  entryType: 'TED',
  payeeName: 'TRANSFERENCIA',
  memo: 'transf entre contas',
  valueCents,
  balanceAfterCents: 0,
});
const cedenteB = () => {
  const r = createCedente({
    id: CedenteAccountId.generate(),
    bankCode: '341',
    agency: '1234',
    accountNumber: '112233',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!r.ok) throw new Error('setup: cedente B');
  return r.value;
};
const pendingCounterpart = (
  destinationAccountRef: CedenteAccountId.CedenteAccountId,
  valueCents: bigint,
  expectedDate: Date,
) => {
  const r = ExpectedCounterpart.create({
    id: ExpectedCounterpartId.generate(),
    destinationAccountRef,
    originAccountRef: CedenteAccountId.generate(),
    originReconciliationRef: ReconciliationId.generate(),
    originTransactionRef: newUuid(),
    originMovement: 'Debit',
    valueCents,
    expectedDate,
  });
  if (!r.ok) throw new Error('setup: counterpart');
  return r.value.counterpart;
};

const buildWorld = async (counterparts: readonly { valueCents: bigint; expectedDate: Date }[]) => {
  const account = cedenteB();
  const imported = importStatement(
    {
      debitAccountRef: String(account.id),
      period: { start: D, end: D },
      file: { name: 'b.ofx', format: 'OFX', hash: 'hB' },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: [creditTx('fB', 150000)],
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  const statementRepo = createInMemoryBankStatementRepository(new Map([[statement.id, statement]]));
  const counterpartStore = createInMemoryExpectedCounterpartStore();
  const created: { id: string; expectedDate: Date }[] = [];
  for (const c of counterparts) {
    const cp = pendingCounterpart(account.id, c.valueCents, c.expectedDate);
    await counterpartStore.save(cp);
    created.push({ id: String(cp.id), expectedDate: c.expectedDate });
  }
  const suggest = suggestCounterpartMatches({
    statements: statementRepo,
    expectedCounterpartStore: counterpartStore,
  });
  const txId = statement.transactions[0];
  if (txId === undefined) throw new Error('setup: tx');
  return { suggest, txId: String(txId.id), created };
};

describe('financial/application — suggestCounterpartMatches (US2 · #269)', () => {
  it('CA1: casa por valor exato + janela; ignora a de valor divergente', async () => {
    const w = await buildWorld([
      { valueCents: 150000n, expectedDate: daysFrom(D, -1) }, // casa
      { valueCents: 999n, expectedDate: D }, // valor ≠ → não casa
    ]);
    const r = await w.suggest(w.txId);
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.length, 1, 'só a contrapartida de valor exato');
    assert.equal(r.value[0]!.counterpartId, w.created[0]!.id);
  });

  it('CA4: empate (mesmo valor, janela) → mais antiga (expectedDate) primeiro', async () => {
    const older = { valueCents: 150000n, expectedDate: daysFrom(D, -3) };
    const newer = { valueCents: 150000n, expectedDate: daysFrom(D, -1) };
    const w = await buildWorld([newer, older]); // inserida newer antes; ordenação deve trazer older 1º
    const r = await w.suggest(w.txId);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.length, 2);
    assert.equal(r.value[0]!.counterpartId, w.created[1]!.id, 'mais antiga primeiro');
  });

  it('fora da janela de data (>5d) → não sugere', async () => {
    const w = await buildWorld([{ valueCents: 150000n, expectedDate: daysFrom(D, -10) }]);
    const r = await w.suggest(w.txId);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.length, 0, 'distância de data > 5d não casa');
  });
});
