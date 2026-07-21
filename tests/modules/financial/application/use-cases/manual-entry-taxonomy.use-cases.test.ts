// W0 RED (FIN-MANUAL-ENTRY-TAXONOMY · S2 do épico Taxonomia Planejável Unificada, #502) —
// o título MANUAL (ManualEntry) passa a carregar Plano Orçamentário + Subcategoria, ao lado dos
// refs irmãos (categoria/centro/programa). Espelha a S1 (documento), aplicada à conciliação.
//
// Camada: application/use-case (`recordManualEntry`) com adapters in-memory reais. Prova, sem HTTP:
//   - CA2/CA3: registrar com budgetPlanRef+subcategoryRef → o `ManualEntry` persistido (lido de volta
//     via `reconRepo.findById`) carrega OS DOIS refs novos convivendo com os TRÊS existentes.
//   - CA4: sem os refs → nascem `null` (back-compat).
//   - CA5: o use-case rehidrata via os VOs (BudgetPlanRef/SubcategoryRef) e REJEITA formato inválido
//     com `financial-ref-invalid` (defense-in-depth, além do Zod da borda).
//   - CA6: vale para `type='Payment'` E `type='Receipt'` — a classificação é agnóstica de direção.
//
// DEVE FALHAR em W0 (pelo motivo certo):
//   - o domínio `ManualEntry` ainda NÃO tem os campos `budgetPlanRef`/`subcategoryRef` (undefined no
//     read-back) e o use-case ainda NÃO rehidrata os refs novos (input.budgetPlanRef é ignorado →
//     `record` devolve `ok` mesmo com ref malformado). RED por inexistência de campo/rehidratação.
//
// Roda em `pnpm test` puro (sem MySQL). Regressão zero (CA8): NÃO edita `manual-entry.use-cases.test.ts`.
// Reusa os VOs da S1 — NÃO recria `SubcategoryRef`/`BudgetPlanRef`.
//
// Código EN, comentários PT-BR.

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
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { recordManualEntry } from '#src/modules/financial/application/use-cases/record-manual-entry.ts';

// Fixtures — UUID v4 VÁLIDOS (grupo 3 começa com '4', grupo 4 com 8/9/a/b). NÃO usar caractere
// não-hexadecimal (a S1 teve um `u` que travou os CAs — não repetir).
const BUDGET = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';
const SUBCATEGORY = '5abca7e9-0000-4000-8000-000000000001';
const CATEGORY = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const COSTCENTER = 'cc000000-0000-4000-8000-000000000002';
const PROGRAM = 'a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2';

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

const D = new Date('2024-05-18T00:00:00.000Z');
const txOf = (raw: string, valueCents: number): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement: 'Debit',
  entryType: 'Fee',
  payeeName: 'BANCO',
  memo: 'tarifa',
  valueCents,
  balanceAfterCents: 0,
});

// Monta o mundo e EXPÕE o reconRepo (findById) p/ ler o ManualEntry persistido de volta.
const buildWorld = (txs: readonly ParsedTransaction[]) => {
  const cedenteId = CedenteAccountId.generate();
  const account = createCedente({
    id: cedenteId,
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!account.ok) throw new Error('setup: cedente');

  const imported = importStatement(
    {
      debitAccountRef: String(cedenteId),
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
  const record = recordManualEntry({
    reconciliationRepo: reconRepo,
    statements: statementRepo,
    cedenteStore,
    periods: createInMemoryReconciliationPeriodStore(),
    clock: ClockReal(),
    expectedCounterpartStore: createInMemoryExpectedCounterpartStore(),
  });
  return {
    account: account.value,
    cedenteStore,
    reconRepo,
    record,
    transactionIds: statement.transactions.map((t) => String(t.id)),
  };
};

// Forma esperada do ManualEntry APÓS o W1 (os 2 refs novos + os 3 irmãos). O cast força o RED por
// inexistência de campo: hoje `budgetPlanRef`/`subcategoryRef` não existem no domínio → undefined.
type ManualEntryRefs = Readonly<{
  budgetPlanRef: string | null;
  subcategoryRef: string | null;
  categoryRef: string | null;
  costCenterRef: string | null;
  programRef: string | null;
}>;

const persistedRefs = async (
  w: ReturnType<typeof buildWorld>,
  reconciliationId: unknown,
): Promise<ManualEntryRefs> => {
  const found = await w.reconRepo.findById(reconciliationId as never);
  assert.equal(found.ok, true);
  if (!found.ok) throw new Error('unreachable');
  const rec = found.value;
  assert.ok(rec !== null, 'conciliação não encontrada no repo');
  assert.ok(rec.manualEntry !== null, 'manualEntry ausente na conciliação');
  return rec.manualEntry as unknown as ManualEntryRefs;
};

describe('financial/use-cases/record-manual-entry — taxonomia planejável (#502 · S2)', () => {
  it('CA2/CA3: Payment com os 2 refs novos → persistem convivendo com os 3 irmãos', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Payment',
      budgetPlanRef: BUDGET,
      subcategoryRef: SUBCATEGORY,
      categoryRef: CATEGORY,
      costCenterRef: COSTCENTER,
      programRef: PROGRAM,
      reconciledBy: 'u1',
    } as never);
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;

    const refs = await persistedRefs(w, r.value.reconciliationId);
    assert.equal(refs.budgetPlanRef, BUDGET);
    assert.equal(refs.subcategoryRef, SUBCATEGORY);
    // Coexistência (CA3): os três irmãos continuam gravados.
    assert.equal(refs.categoryRef, CATEGORY);
    assert.equal(refs.costCenterRef, COSTCENTER);
    assert.equal(refs.programRef, PROGRAM);
  });

  it('CA6: Receipt (recebimento) com os 2 refs novos → persistem (agnóstico de direção)', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Receipt',
      budgetPlanRef: BUDGET,
      subcategoryRef: SUBCATEGORY,
      reconciledBy: 'u1',
    } as never);
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;

    const refs = await persistedRefs(w, r.value.reconciliationId);
    assert.equal(refs.budgetPlanRef, BUDGET);
    assert.equal(refs.subcategoryRef, SUBCATEGORY);
  });

  it('CA4: sem os refs novos → nascem null (back-compat)', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Payment',
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;

    const refs = await persistedRefs(w, r.value.reconciliationId);
    assert.equal(refs.budgetPlanRef, null);
    assert.equal(refs.subcategoryRef, null);
  });

  it('CA5: budgetPlanRef malformado → o use-case rehidrata e devolve financial-ref-invalid', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Payment',
      budgetPlanRef: 'not-a-uuid',
      reconciledBy: 'u1',
    } as never);
    assert.equal(r.ok, false, 'ref malformado deve ser rejeitado pelo use-case');
    if (!r.ok) assert.equal(r.error, 'financial-ref-invalid');
  });

  it('CA5: subcategoryRef malformado → o use-case rehidrata e devolve financial-ref-invalid', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'Receipt',
      subcategoryRef: 'not-a-uuid',
      reconciledBy: 'u1',
    } as never);
    assert.equal(r.ok, false, 'ref malformado deve ser rejeitado pelo use-case');
    if (!r.ok) assert.equal(r.error, 'financial-ref-invalid');
  });
});
