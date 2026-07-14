import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/index.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create as createCedente,
  close as closeCedente,
} from '#src/modules/financial/domain/cedente/cedente-account.ts';
import { confirm as domainConfirm } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type {
  PayableSnapshot,
  Reconciliation,
} from '#src/modules/financial/domain/reconciliation/types.ts';
import type { StatementTransaction } from '#src/modules/financial/domain/statement/types.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
import type { PaidPayableView } from '#src/modules/financial/application/ports/payable-reconciliation-view.ts';

// W0 RED: use-cases ainda não existem.
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import { undoReconciliation } from '#src/modules/financial/application/use-cases/undo-reconciliation.ts';
import { searchPaidPayables } from '#src/modules/financial/application/use-cases/search-paid-payables.ts';

const WHEN = new Date('2024-05-20T12:00:00.000Z');
const clock = { now: (): Date => WHEN };
const REF = '11111111-1111-4111-8111-111111111111';

const accountWith = (closed: boolean): CedenteAccount => {
  const created = createCedente({
    id: CedenteAccountId.generate(),
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!created.ok) throw new Error('setup: cedente');
  if (!closed) return created.value;
  const c = closeCedente(created.value);
  if (!c.ok) throw new Error('setup: close');
  return c.value;
};

const txOf = (
  valueCents: number,
  status: 'Pending' | 'Reconciled' = 'Pending',
): StatementTransaction => ({
  id: StatementTransactionId.generate(),
  fitid: (() => {
    const f = Fitid.fromNative('f-tx');
    if (!f.ok) throw new Error('setup: fitid');
    return f.value;
  })(),
  date: new Date('2024-05-18T00:00:00.000Z'),
  movement: 'Debit',
  entryType: 'TED',
  payeeName: 'FORNECEDOR X',
  memo: 'pagamento',
  valueCents,
  balanceAfterCents: 0,
  reconciliationStatus: status,
});

const payableOf = (valueCents: number, status: DocumentStatus = 'Paid'): PayableSnapshot => ({
  id: PayableId.generate(),
  status,
  valueCents,
});

interface Captured {
  confirmed: { recon: Reconciliation; txId: string }[];
  undone: Reconciliation[];
  events: unknown[];
  stored: Reconciliation | null;
}
const newCaptured = (): Captured => ({ confirmed: [], undone: [], events: [], stored: null });

const fakeStatements = (tx: StatementTransaction | null) => ({
  findTransaction: (): Promise<
    Result<{ transaction: StatementTransaction; debitAccountRef: string } | null, never>
  > => Promise.resolve(ok(tx === null ? null : { transaction: tx, debitAccountRef: REF })),
});
const fakeCedente = (account: CedenteAccount | null) => ({
  findById: (): Promise<Result<CedenteAccount | null, never>> => Promise.resolve(ok(account)),
});
const fakePayables = (
  snaps: readonly PayableSnapshot[],
  paid: readonly PaidPayableView[] = [],
) => ({
  findSnapshotsByIds: (): Promise<Result<readonly PayableSnapshot[], never>> =>
    Promise.resolve(ok(snaps)),
  searchPaid: (): Promise<Result<readonly PaidPayableView[], never>> => Promise.resolve(ok(paid)),
});

const paidViewOf = (valueCents: number): PaidPayableView => ({
  id: PayableId.generate(),
  documentId: PayableId.generate(),
  valueCents,
  dueDate: new Date('2024-05-30T00:00:00.000Z'),
  paymentMethod: 'PIX',
});
// #127: os eventos são encaminhados PARA DENTRO do repo (`confirm`/`undo`), não mais a um outbox
// separado. O fake captura o que o use-case passa no 3º argumento — prova o threading dos eventos.
const fakeReconRepo = (cap: Captured) => ({
  confirm: (
    recon: Reconciliation,
    txId: string,
    events?: readonly unknown[],
  ): Promise<Result<void, never>> => {
    cap.confirmed.push({ recon, txId });
    if (events !== undefined) cap.events.push(...events);
    return Promise.resolve(ok(undefined));
  },
  findById: (): Promise<Result<Reconciliation | null, never>> => Promise.resolve(ok(cap.stored)),
  undo: (recon: Reconciliation, events?: readonly unknown[]): Promise<Result<void, never>> => {
    cap.undone.push(recon);
    if (events !== undefined) cap.events.push(...events);
    return Promise.resolve(ok(undefined));
  },
  // #269/US3: não exercitado nestes testes (sem contrapartida) — stubs para o Pick expandido.
  findActiveByTransaction: (): Promise<Result<Reconciliation | null, never>> =>
    Promise.resolve(ok(null)),
  undoCounterpartOrigin: (): Promise<Result<void, never>> => Promise.resolve(ok(undefined)),
});
// Período nunca fechado nestes testes (guard R18 do #125 é no-op aqui).
const openPeriods = { isClosed: (): Promise<Result<boolean, never>> => Promise.resolve(ok(false)) };
// #269/US3: sem contrapartida para a origem → o undo segue o caminho normal.
const noCounterpart = {
  findByOriginReconciliation: (): Promise<Result<null, never>> => Promise.resolve(ok(null)),
};

const confirmDeps = (
  cap: Captured,
  tx: StatementTransaction | null,
  account: CedenteAccount | null,
  snaps: readonly PayableSnapshot[],
) => ({
  reconciliationRepo: fakeReconRepo(cap),
  payables: fakePayables(snaps),
  statements: fakeStatements(tx),
  cedenteStore: fakeCedente(account),
  periods: openPeriods,
  clock,
});

describe('financial/application/use-cases/confirm-reconciliation', () => {
  it('CA1: individual — 1 título Paid = transação → Active/Individual, evento PayableReconciled', async () => {
    const cap = newCaptured();
    const r = await confirmReconciliation(
      confirmDeps(cap, txOf(1000), accountWith(false), [payableOf(1000)]),
    )({
      transactionId: '00000000-0000-4000-8000-000000000001',
      payableIds: ['p1'],
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true);
    assert.equal(cap.confirmed.length, 1);
    assert.equal(cap.confirmed[0]?.recon.type, 'Individual');
    assert.equal(cap.confirmed[0]?.recon.status, 'Active');
    assert.equal(cap.events.length, 1);
  });

  it('CA2: múltiplo — 2 títulos Paid somando = transação → Multiple, 2 eventos', async () => {
    const cap = newCaptured();
    const r = await confirmReconciliation(
      confirmDeps(cap, txOf(3000), accountWith(false), [payableOf(1000), payableOf(2000)]),
    )({
      transactionId: '00000000-0000-4000-8000-000000000002',
      payableIds: ['p1', 'p2'],
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true);
    assert.equal(cap.confirmed[0]?.recon.type, 'Multiple');
    assert.equal(cap.events.length, 2);
  });

  it('CA3: parcial — título + difference = transação → Partial', async () => {
    const cap = newCaptured();
    const r = await confirmReconciliation(
      confirmDeps(cap, txOf(1050), accountWith(false), [payableOf(1000)]),
    )({
      transactionId: '00000000-0000-4000-8000-000000000003',
      payableIds: ['p1'],
      difference: { valueCents: 50, treatment: 'Interest' },
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true);
    assert.equal(cap.confirmed[0]?.recon.type, 'Partial');
    assert.equal(cap.confirmed[0]?.recon.difference?.valueCents, 50);
  });

  it('CA4: não balanceado → reconciliation-not-balanced, sem write nem evento', async () => {
    const cap = newCaptured();
    const r = await confirmReconciliation(
      confirmDeps(cap, txOf(9999), accountWith(false), [payableOf(1000)]),
    )({
      transactionId: '00000000-0000-4000-8000-000000000004',
      payableIds: ['p1'],
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reconciliation-not-balanced');
    assert.equal(cap.confirmed.length, 0);
    assert.equal(cap.events.length, 0);
  });

  it('CA5: título não Paid → title-not-paid', async () => {
    const cap = newCaptured();
    const r = await confirmReconciliation(
      confirmDeps(cap, txOf(1000), accountWith(false), [payableOf(1000, 'Open')]),
    )({
      transactionId: '00000000-0000-4000-8000-000000000005',
      payableIds: ['p1'],
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'title-not-paid');
    assert.equal(cap.confirmed.length, 0);
  });

  it('CA6: guard FR-015 — cedente Closed → account-closed, nenhum write', async () => {
    const cap = newCaptured();
    const r = await confirmReconciliation(
      confirmDeps(cap, txOf(1000), accountWith(true), [payableOf(1000)]),
    )({
      transactionId: '00000000-0000-4000-8000-000000000006',
      payableIds: ['p1'],
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'account-closed');
    assert.equal(cap.confirmed.length, 0);
    assert.equal(cap.events.length, 0);
  });
});

describe('financial/application/use-cases/undo-reconciliation', () => {
  const buildActive = (): Reconciliation => {
    const out = domainConfirm({
      reconciliationId: ReconciliationId.generate(),
      transactionId: StatementTransactionId.generate(),
      transactionValueCents: 1000,
      payables: [payableOf(1000)],
      reconciledBy: 'u1',
      occurredAt: WHEN,
    });
    if (!out.ok) throw new Error('setup: confirm');
    return out.value.reconciliation;
  };

  it('CA7: undo Active → Undone, evento ReconciliationUndone', async () => {
    const cap = newCaptured();
    cap.stored = buildActive();
    const r = await undoReconciliation({
      reconciliationRepo: fakeReconRepo(cap),
      statements: fakeStatements(null),
      periods: openPeriods,
      clock,
      expectedCounterpartStore: noCounterpart,
    })({
      reconciliationId: String(cap.stored.id),
      undoneBy: 'u2',
    });
    assert.equal(r.ok, true);
    assert.equal(cap.undone.length, 1);
    assert.equal(cap.undone[0]?.status, 'Undone');
    assert.equal(cap.events.length, 1);
  });

  it('CA8: undo de conciliação inexistente → reconciliation-not-found', async () => {
    const cap = newCaptured();
    cap.stored = null;
    const r = await undoReconciliation({
      reconciliationRepo: fakeReconRepo(cap),
      statements: fakeStatements(null),
      periods: openPeriods,
      clock,
      expectedCounterpartStore: noCounterpart,
    })({
      reconciliationId: '22222222-2222-4222-8222-222222222222',
      undoneBy: 'u2',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reconciliation-not-found');
  });
});

describe('financial/application/use-cases/search-paid-payables', () => {
  it('CA9: retorna os títulos Paid', async () => {
    const paid = [paidViewOf(1000), paidViewOf(2000)];
    const r = await searchPaidPayables({ payables: fakePayables([], paid) })({});
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.length, 2);
  });
});
