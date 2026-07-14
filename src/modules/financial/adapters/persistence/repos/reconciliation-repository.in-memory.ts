import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Reconciliation } from '#src/modules/financial/domain/reconciliation/types.ts';
import { deriveReconciledStatus } from '#src/modules/financial/domain/payable/reconciled-status.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationEvent } from '#src/modules/financial/domain/reconciliation/events.ts';
import type { StatementTransactionId } from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import type { ExpectedCounterpart } from '#src/modules/financial/domain/expected-counterpart/types.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '#src/modules/financial/application/ports/reconciliation-repository.ts';
import type {
  FinancialOutbox,
  FinancialAppendableEvent,
} from '#src/modules/financial/application/ports/outbox.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { BankStatementStore } from './bank-statement-repository.in-memory.ts';
import type { PayableStore } from './payable-reconciliation-view.in-memory.ts';

export type ReconciliationStore = Map<string, Reconciliation>;

export type InMemoryReconciliationStores = Readonly<{
  reconciliations?: ReconciliationStore;
  payables: PayableStore;
  statements: BankStatementStore;
  // #269/US2: Map de contrapartidas COMPARTILHADO com o expected-counterpart-store in-memory — o
  // `confirmCounterpartMatch` muta a contrapartida (→Matched) na mesma unit-of-work da perna de B.
  expectedCounterparts?: Map<string, ExpectedCounterpart>;
}>;

// Flipa o status de uma transação no statementStore compartilhado (reconstruindo o statement imutável).
// Retorna false se a transação não existe ou não está no status `from` esperado.
const flipTransaction = (
  statements: BankStatementStore,
  transactionId: string,
  from: 'Pending' | 'Reconciled',
  to: 'Pending' | 'Reconciled',
): boolean => {
  for (const [sid, statement] of statements) {
    const idx = statement.transactions.findIndex((t) => String(t.id) === transactionId);
    if (idx < 0) continue;
    const tx = statement.transactions[idx];
    if (tx?.reconciliationStatus !== from) return false;
    const transactions = statement.transactions.map((t, i) =>
      i === idx ? { ...t, reconciliationStatus: to } : t,
    );
    statements.set(sid, { ...statement, transactions });
    return true;
  }
  return false;
};

// #141/#247: soma o valor conciliado contra um título em todas as conciliações ATIVAS (status Active).
// Espelha o SELECT SUM(reconciled_value_cents) WHERE status='Active' do adapter Drizzle.
const sumActiveReconciledFor = (
  reconciliations: ReconciliationStore,
  payableId: string,
): number => {
  let sum = 0;
  for (const rec of reconciliations.values()) {
    if (rec.status !== 'Active') continue;
    for (const item of rec.items) {
      if (String(item.payableId) === payableId) sum += item.reconciledValueCents;
    }
  }
  return sum;
};

// Unit-of-work in-memory: espelha a atomicidade do adapter Drizzle sobre stores compartilhados.
export const createInMemoryReconciliationRepository = (
  stores: InMemoryReconciliationStores,
  // #127: outbox onde os eventos são "publicados" — paridade in-memory da atomicidade do Drizzle.
  // Default: outbox interno (acumula, nunca falha). Testes injetam um que falha p/ provar rollback.
  outbox: FinancialOutbox = createInMemoryOutbox().port,
): ReconciliationRepository => {
  const reconciliations = stores.reconciliations ?? new Map<string, Reconciliation>();
  const { payables, statements } = stores;
  const expectedCounterparts =
    stores.expectedCounterparts ?? new Map<string, ExpectedCounterpart>();

  // #127 — atomicidade: publica os eventos ANTES de mutar os stores; falha no outbox → nada muda
  // (espelha o rollback da unit-of-work do Drizzle). No-op quando não há eventos (callers de seed).
  const appendOrFail = async (
    events: readonly FinancialAppendableEvent[] | undefined,
  ): Promise<Result<void, ReconciliationRepositoryError>> => {
    if (events === undefined || events.length === 0) return ok(undefined);
    const appended = await outbox.append(events);
    return appended.ok ? ok(undefined) : err('reconciliation-repository-failure');
  };

  return {
    confirm: async (
      reconciliation: Reconciliation,
      transactionId: StatementTransactionId,
      events?: readonly ReconciliationEvent[],
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      for (const item of reconciliation.items) {
        const rec = payables.get(String(item.payableId));
        if (rec?.status !== 'Paid') {
          return err('reconciliation-repository-failure');
        }
      }
      const published = await appendOrFail(events);
      if (!published.ok) return published;
      if (!flipTransaction(statements, String(transactionId), 'Pending', 'Reconciled')) {
        return err('reconciliation-repository-failure');
      }
      // #141/#247: o status do título é DERIVADO da soma das conciliações ATIVAS (incl. esta). Soma
      // >= valor → Reconciled; > 0 e < valor → PartiallyReconciled (saldo aberto). Persiste a conciliação
      // ANTES de somar para incluir os itens novos no acumulado.
      reconciliations.set(String(reconciliation.id), reconciliation);
      for (const item of reconciliation.items) {
        const rec = payables.get(String(item.payableId));
        if (rec === undefined) continue;
        const reconciledSum = sumActiveReconciledFor(reconciliations, String(item.payableId));
        payables.set(String(item.payableId), {
          ...rec,
          status: deriveReconciledStatus(rec.valueCents, reconciledSum),
        });
      }
      return ok(undefined);
    },

    confirmManualEntry: async (
      reconciliation: Reconciliation,
      transactionId: StatementTransactionId,
      events?: readonly ReconciliationEvent[],
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      // Lançamento manual: sem título → só flipa a transação e guarda a conciliação (com manualEntry).
      const published = await appendOrFail(events);
      if (!published.ok) return published;
      if (!flipTransaction(statements, String(transactionId), 'Pending', 'Reconciled')) {
        return err('reconciliation-repository-failure');
      }
      reconciliations.set(String(reconciliation.id), reconciliation);
      return ok(undefined);
    },

    confirmCounterpartMatch: async (
      reconciliation: Reconciliation,
      counterpart: ExpectedCounterpart,
      transactionId: StatementTransactionId,
      events?: readonly FinancialAppendableEvent[],
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      // #269/US2: perna B (ManualEntry/Transfer) + contrapartida→Matched na MESMA unit-of-work.
      const published = await appendOrFail(events);
      if (!published.ok) return published;
      if (!flipTransaction(statements, String(transactionId), 'Pending', 'Reconciled')) {
        return err('reconciliation-repository-failure');
      }
      reconciliations.set(String(reconciliation.id), reconciliation);
      expectedCounterparts.set(String(counterpart.id), counterpart);
      return ok(undefined);
    },

    findById: async (
      id: ReconciliationId,
    ): Promise<Result<Reconciliation | null, ReconciliationRepositoryError>> =>
      Promise.resolve(ok(reconciliations.get(String(id)) ?? null)),

    findActiveByTransaction: async (
      transactionId: StatementTransactionId,
    ): Promise<Result<Reconciliation | null, ReconciliationRepositoryError>> => {
      for (const rec of reconciliations.values()) {
        if (rec.status === 'Active' && String(rec.transactionId) === String(transactionId)) {
          return Promise.resolve(ok(rec));
        }
      }
      return Promise.resolve(ok(null));
    },

    undo: async (
      reconciliation: Reconciliation,
      events?: readonly ReconciliationEvent[],
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      const published = await appendOrFail(events);
      if (!published.ok) return published;
      // Persiste o Undone ANTES de re-derivar: o acumulado ativo passa a excluir esta conciliação.
      reconciliations.set(String(reconciliation.id), reconciliation);
      // #141/#247: re-deriva o status do título pelas conciliações ativas restantes. Sem nenhuma
      // ativa (soma 0) → volta a Paid; senão → Reconciled/PartiallyReconciled conforme a nova soma.
      for (const item of reconciliation.items) {
        const rec = payables.get(String(item.payableId));
        if (rec === undefined) continue;
        if (rec.status !== 'Reconciled' && rec.status !== 'PartiallyReconciled') continue;
        const reconciledSum = sumActiveReconciledFor(reconciliations, String(item.payableId));
        payables.set(String(item.payableId), {
          ...rec,
          status:
            reconciledSum <= 0 ? 'Paid' : deriveReconciledStatus(rec.valueCents, reconciledSum),
        });
      }
      flipTransaction(statements, String(reconciliation.transactionId), 'Reconciled', 'Pending');
      return ok(undefined);
    },
  };
};
