/**
 * Composition root do módulo financial para a borda HTTP (ADR-0006/0025/0027).
 *
 * Espelha `contracts/adapters/http/composition.ts`: monta adapters por driver
 * (memory | mysql) e instancia os use cases. `FinancialHttpDeps` expõe os use
 * cases prontos — o plugin os invoca sem conhecer a infra.
 *
 * Driver memory (default): in-memory repos + in-memory outbox. Sem DB.
 * Driver mysql: Drizzle/mysql2 via `openMysqlFinancial`; migrations no boot.
 *
 * O outbox da Fatia 1 é sempre in-memory (worker de delivery é fatia futura).
 */

import { ClockReal } from '#src/shared/adapters/clock-real.ts';

import { createInMemoryDocumentRepository } from '../persistence/repos/document-repository.in-memory.ts';
import { createInMemorySupplierViewStore } from '../persistence/repos/supplier-view-store.in-memory.ts';
import {
  createInMemoryTimelineRepository,
  type TimelineStore,
} from '../persistence/repos/timeline-repository.in-memory.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '../persistence/repos/bank-statement-repository.in-memory.ts';
import {
  createInMemoryPayableReconciliationView,
  type PayableStore,
} from '../persistence/repos/payable-reconciliation-view.in-memory.ts';
import { createInMemoryReconciliationRepository } from '../persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '../persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemorySuggestionView } from '../persistence/repos/suggestion-view.in-memory.ts';
import { createInMemoryRejectedSuggestionRepository } from '../persistence/repos/rejected-suggestion-repository.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '../persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryOutbox } from '../outbox/outbox.in-memory.ts';
import { createDrizzleDocumentRepository } from '../persistence/repos/document-repository.drizzle.ts';
import { createDrizzleTimelineRepository } from '../persistence/repos/timeline-repository.drizzle.ts';
import { createDrizzleBankStatementRepository } from '../persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzlePayableReconciliationView } from '../persistence/repos/payable-reconciliation-view.drizzle.ts';
import { createDrizzleReconciliationRepository } from '../persistence/repos/reconciliation-repository.drizzle.ts';
import { createDrizzleCedenteAccountStore } from '../persistence/repos/cedente-account-store.drizzle.ts';
import { createDrizzleSuggestionView } from '../persistence/repos/suggestion-view.drizzle.ts';
import { createDrizzleRejectedSuggestionRepository } from '../persistence/repos/rejected-suggestion-repository.drizzle.ts';
import { createDrizzleReconciliationPeriodStore } from '../persistence/repos/reconciliation-period-store.drizzle.ts';
import { reconciliationExporter } from '../export/reconciliation-exporter.ts';
import { bankStatementParser } from '../statement-parsers/bank-statement-parser.ts';
import {
  openMysqlFinancial,
  type FinancialMysqlHandle,
} from '../persistence/drivers/mysql-driver.ts';

import { saveDocument } from '../../application/use-cases/save-document.ts';
import { saveDraft } from '../../application/use-cases/save-draft.ts';
import { adjustDocument } from '../../application/use-cases/adjust-document.ts';
import { approveDocument } from '../../application/use-cases/approve-document.ts';
import { undoApproval } from '../../application/use-cases/undo-approval.ts';
import { cancelDocument } from '../../application/use-cases/cancel-document.ts';
import { submitDraft } from '../../application/use-cases/submit-draft.ts';
import { getDocumentTimeline } from '../../application/use-cases/get-document-timeline.ts';
import { importBankStatement } from '../../application/use-cases/import-bank-statement.ts';
import { confirmReconciliation } from '../../application/use-cases/confirm-reconciliation.ts';
import { undoReconciliation } from '../../application/use-cases/undo-reconciliation.ts';
import { searchPaidPayables } from '../../application/use-cases/search-paid-payables.ts';
import { suggestMatches } from '../../application/use-cases/suggest-matches.ts';
import { rejectSuggestion } from '../../application/use-cases/reject-suggestion.ts';
import { recordManualEntry } from '../../application/use-cases/record-manual-entry.ts';
import { confirmBatch } from '../../application/use-cases/confirm-batch.ts';
import { closeReconciliationPeriod } from '../../application/use-cases/close-reconciliation-period.ts';
import { exportReconciliation } from '../../application/use-cases/export-reconciliation.ts';
import { createCedenteAccount } from '../../application/use-cases/create-cedente-account.ts';
import { listCedenteAccounts } from '../../application/use-cases/list-cedente-accounts.ts';
import { closeCedenteAccount } from '../../application/use-cases/close-cedente-account.ts';
import { editCedenteAccount } from '../../application/use-cases/edit-cedente-account.ts';
import { getAccountStatement } from '../../application/use-cases/get-account-statement.ts';
import { getTransactionReconciliation } from '../../application/use-cases/get-transaction-reconciliation.ts';
import { createStatementBackedAccountHistory } from '../persistence/repos/cedente-account-history.from-statements.ts';
import type { DocumentRepository } from '../../domain/document/repository.ts';
import type { FinancialTimelineRepository } from '../../domain/timeline/repository.ts';
import type { FinancialTimelineEntry } from '../../domain/timeline/types.ts';
import type { BankStatementRepository } from '../../application/ports/bank-statement-repository.ts';
import type { PayableReconciliationView } from '../../application/ports/payable-reconciliation-view.ts';
import type { ReconciliationRepository } from '../../application/ports/reconciliation-repository.ts';
import type { CedenteAccountStore } from '../../application/ports/cedente-account-store.ts';
import type { SuggestionView } from '../../application/ports/suggestion-view.ts';
import type { RejectedSuggestionRepository } from '../../application/ports/rejected-suggestion-repository.ts';
import type { ReconciliationPeriodStore } from '../../application/ports/reconciliation-period-store.ts';

export type FinancialDriver = 'memory' | 'mysql';

export type FinancialCompositionConfig = Readonly<{
  driver: FinancialDriver;
  /** URL de conexão MySQL (obrigatório para driver mysql). */
  writerUrl?: string;
}>;

export type FinancialHttpDeps = Readonly<{
  saveDocument: ReturnType<typeof saveDocument>;
  saveDraft: ReturnType<typeof saveDraft>;
  adjustDocument: ReturnType<typeof adjustDocument>;
  approveDocument: ReturnType<typeof approveDocument>;
  undoApproval: ReturnType<typeof undoApproval>;
  cancelDocument: ReturnType<typeof cancelDocument>;
  submitDraft: ReturnType<typeof submitDraft>;
  /** Leitura direta do repositório — usado pelo GET /documents/:id. */
  findDocumentById: DocumentRepository['findById'];
  /** Listagem paginada (US1 — read path no writer pool; split reader/writer diferido — ADR-0003). */
  listDocuments: DocumentRepository['findPaged'];
  /** Trilha por-campo (Time Travel) de um documento — consumido pelo GET /documents/:id/timeline. */
  getDocumentTimeline: ReturnType<typeof getDocumentTimeline>;
  /** Importação de extrato bancário (US1 conciliação) — POST /bank-statements. */
  importBankStatement: ReturnType<typeof importBankStatement>;
  /** Leitura das transações de um extrato — GET /bank-statements/:id/transactions. */
  listStatementTransactions: BankStatementRepository['listTransactions'];
  /** Confirma a conciliação (US2/4) — POST /reconciliations. */
  confirmReconciliation: ReturnType<typeof confirmReconciliation>;
  /** Desfaz a conciliação (US3) — POST /reconciliations/:id/undo. */
  undoReconciliation: ReturnType<typeof undoReconciliation>;
  /** Lista títulos `Paid` (US2) — GET /payables?status=Paid. */
  searchPaidPayables: ReturnType<typeof searchPaidPayables>;
  /** Sugestões de match (US2, read-model) — GET /statement-transactions/:id/suggestions. */
  suggestMatches: ReturnType<typeof suggestMatches>;
  /** Rejeita uma sugestão (US2) — POST /statement-transactions/:id/reject-suggestion. */
  rejectSuggestion: ReturnType<typeof rejectSuggestion>;
  /** Lançamento manual (US5) — POST /statement-transactions/:id/manual-entry. */
  recordManualEntry: ReturnType<typeof recordManualEntry>;
  /** Conciliação em lote (US5) — POST /reconciliations/batch. */
  confirmBatch: ReturnType<typeof confirmBatch>;
  /** Fecha período (US6) — POST /reconciliation-periods/close. */
  closeReconciliationPeriod: ReturnType<typeof closeReconciliationPeriod>;
  /** Exporta conciliação OFX/CSV (US6) — GET /reconciliation-periods/:id/export. */
  exportReconciliation: ReturnType<typeof exportReconciliation>;
  /** Conta-cedente (019) — POST /cedente-accounts. */
  createCedenteAccount: ReturnType<typeof createCedenteAccount>;
  /** Conta-cedente (019) — GET /cedente-accounts. */
  listCedenteAccounts: ReturnType<typeof listCedenteAccounts>;
  /** Conta-cedente (019) — leitura direta para GET /cedente-accounts/:id. */
  findCedenteAccountById: CedenteAccountStore['findById'];
  /** Conta-cedente (019) — POST /cedente-accounts/:id/close. */
  closeCedenteAccount: ReturnType<typeof closeCedenteAccount>;
  /** Conta-cedente (019) — PATCH /cedente-accounts/:id. */
  editCedenteAccount: ReturnType<typeof editCedenteAccount>;
  /** Read-model do extrato (#139) — GET /cedente-accounts/:id/statement. */
  getAccountStatement: ReturnType<typeof getAccountStatement>;
  /** Lookup da conciliação ativa por transação (#175) — GET /statement-transactions/:id/reconciliation. */
  getTransactionReconciliation: ReturnType<typeof getTransactionReconciliation>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  repo: DocumentRepository;
  // Repo de LEITURA da trilha. Na escrita, o `save` do DocumentRepository grava a trilha
  // na mesma transação (memory: store compartilhado; mysql: dentro da tx do save).
  timelineRepo: FinancialTimelineRepository;
  statementRepo: BankStatementRepository;
  payableView: PayableReconciliationView;
  reconciliationRepo: ReconciliationRepository;
  cedenteStore: CedenteAccountStore;
  suggestionView: SuggestionView;
  rejectedSuggestionRepo: RejectedSuggestionRepository;
  periodStore: ReconciliationPeriodStore;
  shutdown: () => Promise<void>;
}>;

const buildMemoryPools = (): Pools => {
  // Store compartilhado entre o document-repo (escreve trilha no save) e o timeline-repo
  // (lê). Garante atomicidade em memória sem tx (timeline-repository.in-memory.ts §store).
  const timelineStore: TimelineStore = new Map<string, FinancialTimelineEntry[]>();
  // Read-model de fornecedor (#47/US2): vazio no driver memory (sem consumer) → grid resolve
  // fornecedor como null. Populado de verdade só no driver mysql (worker de projeção + JOIN).
  const supplierViewStore = createInMemorySupplierViewStore();
  const repo = createInMemoryDocumentRepository(timelineStore, supplierViewStore);
  const timelineRepo = createInMemoryTimelineRepository(timelineStore);
  // Stores compartilhados da conciliação: o reconciliationRepo flipa status no MESMO statementStore
  // (transação) e payableStore (título) lidos pelo statementRepo/payableView (atomicidade em memória).
  const statementStore: BankStatementStore = new Map();
  const payableStore: PayableStore = new Map();
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const payableView = createInMemoryPayableReconciliationView(payableStore);
  const reconciliationRepo = createInMemoryReconciliationRepository({
    payables: payableStore,
    statements: statementStore,
  });
  const cedenteStore = createInMemoryCedenteAccountStore();
  // Match/sugestão (US2): stores dedicados (vazios no boot; testes semeiam). mysql faz JOIN real.
  const suggestionView = createInMemorySuggestionView();
  const rejectedSuggestionRepo = createInMemoryRejectedSuggestionRepository();
  const periodStore = createInMemoryReconciliationPeriodStore();
  return {
    repo,
    timelineRepo,
    statementRepo,
    payableView,
    reconciliationRepo,
    cedenteStore,
    suggestionView,
    rejectedSuggestionRepo,
    periodStore,
    shutdown: () => Promise.resolve(),
  };
};

const buildMysqlPools = async (config: FinancialCompositionConfig): Promise<Pools> => {
  const writerUrl = config.writerUrl ?? '';
  const handleR = await openMysqlFinancial({
    connectionString: writerUrl,
    applyMigrations: true,
  });
  if (!handleR.ok) {
    throw new Error(`financial-composition: falha ao abrir pool MySQL (${handleR.error})`);
  }
  const handle: FinancialMysqlHandle = handleR.value;
  return {
    repo: createDrizzleDocumentRepository(handle),
    // Leitura da trilha via pool (a escrita é feita dentro da tx do document-repo.save).
    timelineRepo: createDrizzleTimelineRepository(handle),
    statementRepo: createDrizzleBankStatementRepository(handle),
    payableView: createDrizzlePayableReconciliationView(handle),
    reconciliationRepo: createDrizzleReconciliationRepository(handle),
    cedenteStore: createDrizzleCedenteAccountStore(handle),
    suggestionView: createDrizzleSuggestionView(handle),
    rejectedSuggestionRepo: createDrizzleRejectedSuggestionRepository(handle),
    periodStore: createDrizzleReconciliationPeriodStore(handle),
    shutdown: () => handle.close(),
  };
};

const makeDeps = (pools: Pools): FinancialHttpDeps => {
  const outbox = createInMemoryOutbox();
  const clock = ClockReal();
  // Deps base (repo + outbox); os 6 use cases mutantes também recebem `clock` para
  // carimbar `occurredAt` das entries da trilha (timeline-recording.ts).
  const deps = { repo: pools.repo, outbox: outbox.port, clock };
  // Lançamento manual (US5): reaproveitado pelo confirmBatch (1 template × N transações).
  const record = recordManualEntry({
    reconciliationRepo: pools.reconciliationRepo,
    statements: pools.statementRepo,
    cedenteStore: pools.cedenteStore,
    periods: pools.periodStore,
    clock,
    outbox: outbox.port,
  });
  return {
    saveDocument: saveDocument(deps),
    saveDraft: saveDraft(deps),
    adjustDocument: adjustDocument(deps),
    approveDocument: approveDocument(deps),
    undoApproval: undoApproval(deps),
    cancelDocument: cancelDocument({ repo: pools.repo, outbox: outbox.port }),
    submitDraft: submitDraft(deps),
    findDocumentById: pools.repo.findById,
    listDocuments: pools.repo.findPaged,
    getDocumentTimeline: getDocumentTimeline({ timelineRepo: pools.timelineRepo }),
    importBankStatement: importBankStatement({
      parser: bankStatementParser,
      repo: pools.statementRepo,
      periods: pools.periodStore,
      cedenteStore: pools.cedenteStore,
      clock,
      outbox: outbox.port,
    }),
    listStatementTransactions: pools.statementRepo.listTransactions,
    confirmReconciliation: confirmReconciliation({
      reconciliationRepo: pools.reconciliationRepo,
      payables: pools.payableView,
      statements: pools.statementRepo,
      cedenteStore: pools.cedenteStore,
      periods: pools.periodStore,
      clock,
      outbox: outbox.port,
    }),
    undoReconciliation: undoReconciliation({
      reconciliationRepo: pools.reconciliationRepo,
      statements: pools.statementRepo,
      periods: pools.periodStore,
      clock,
      outbox: outbox.port,
    }),
    searchPaidPayables: searchPaidPayables({ payables: pools.payableView }),
    suggestMatches: suggestMatches({
      statements: pools.statementRepo,
      suggestions: pools.suggestionView,
      rejected: pools.rejectedSuggestionRepo,
    }),
    rejectSuggestion: rejectSuggestion({ rejected: pools.rejectedSuggestionRepo, clock }),
    recordManualEntry: record,
    confirmBatch: confirmBatch({ record }),
    closeReconciliationPeriod: closeReconciliationPeriod({
      periodStore: pools.periodStore,
      statements: pools.statementRepo,
      clock,
      outbox: outbox.port,
    }),
    exportReconciliation: exportReconciliation({
      periodStore: pools.periodStore,
      statements: pools.statementRepo,
      exporter: reconciliationExporter,
    }),
    createCedenteAccount: createCedenteAccount({ cedenteStore: pools.cedenteStore }),
    listCedenteAccounts: listCedenteAccounts({ cedenteStore: pools.cedenteStore }),
    findCedenteAccountById: pools.cedenteStore.findById,
    closeCedenteAccount: closeCedenteAccount({ cedenteStore: pools.cedenteStore }),
    editCedenteAccount: editCedenteAccount({
      cedenteStore: pools.cedenteStore,
      accountHistory: createStatementBackedAccountHistory(pools.statementRepo),
    }),
    getAccountStatement: getAccountStatement({
      cedenteStore: pools.cedenteStore,
      statements: pools.statementRepo,
    }),
    getTransactionReconciliation: getTransactionReconciliation({
      reconciliationRepo: pools.reconciliationRepo,
    }),
    shutdown: pools.shutdown,
  };
};

export const buildFinancialHttpDeps = async (
  config: FinancialCompositionConfig,
): Promise<FinancialHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(buildMemoryPools());
  }

  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('financial-composition: driver mysql exige writerUrl');
  }
  return makeDeps(await buildMysqlPools(config));
};
