/**
 * Composition root do módulo financial para a borda HTTP (ADR-0006/0025/0027).
 *
 * Espelha `contracts/adapters/http/composition.ts`: monta adapters por driver
 * (memory | mysql) e instancia os use cases. `FinancialHttpDeps` expõe os use
 * cases prontos — o plugin os invoca sem conhecer a infra.
 *
 * Driver memory (default): in-memory repos. Sem DB.
 * Driver mysql: Drizzle/mysql2 via `openMysqlFinancial`; migrations no boot.
 *
 * Outbox (#127): todo evento de domínio é gravado no `fin_outbox` na MESMA tx do agregado, pelos
 * próprios repos (atomicidade — ADR-0015). Não há outbox no nível da composição.
 */

import { ClockReal } from '#src/shared/adapters/clock-real.ts';

import {
  createInMemoryDocumentRepository,
  type DocumentStore,
} from '../persistence/repos/document-repository.in-memory.ts';
import { createInMemoryPayableListView } from '../persistence/repos/payable-list-view.in-memory.ts';
import { createDrizzlePayableListView } from '../persistence/repos/payable-list-view.drizzle.ts';
import type { PayableListView } from '../../application/ports/payable-list-view.ts';
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
// #48: read-port cross-módulo da categorização do contrato (ADR-0006 — só via public-api).
import {
  buildContractsReadPort,
  createInMemoryContractCategorizationReadStore,
  type ContractCategorizationReadPort,
} from '#src/modules/contracts/public-api/index.ts';
import {
  buildPartnersReadPort,
  type ContractorReadPort,
} from '#src/modules/partners/public-api/index.ts';
// #207: read-port cross-módulo do NOME de usuário (ADR-0006 — só via public-api; ADR-0032 — borda).
import { buildAuthUserReadPort, type AuthUserReadPort } from '#src/modules/auth/public-api/read.ts';
import { composePayeeBank, type PayeeBankBlock } from './payee-bank-composition.ts';
import { resolveUserName } from './user-name-composition.ts';
import { createInMemoryCategoryReadStore } from '../persistence/repos/category-read.in-memory.ts';
import { createDrizzleCategoryReadStore } from '../persistence/repos/category-read.drizzle.ts';
import { REFERENCE_CATEGORY_SEED } from '../persistence/seed/reference-categories.ts';
import * as Category from '../../domain/category/category.ts';
import * as CategoryId from '../../domain/category/category-id.ts';
import type { CategoryReadPort } from '../../application/ports/category-read.ts';
import { createInMemoryCostCenterReadStore } from '../persistence/repos/cost-center-read.in-memory.ts';
import { createDrizzleCostCenterReadStore } from '../persistence/repos/cost-center-read.drizzle.ts';
import { REFERENCE_COST_CENTER_SEED } from '../persistence/seed/reference-cost-centers.ts';
import * as CostCenter from '../../domain/cost-center/cost-center.ts';
import * as CostCenterId from '../../domain/cost-center/cost-center-id.ts';
import type { CostCenterReadPort } from '../../application/ports/cost-center-read.ts';
import { createInMemoryProgramReadStore } from '../persistence/repos/program-read.in-memory.ts';
import { createProgramsApiReadStore } from '../persistence/repos/program-read.from-programs.ts';
import { buildProgramsReadPort } from '#src/modules/programs/public-api/index.ts';
import type { ProgramReadPort, ProgramView } from '../../application/ports/program-read.ts';
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
import { registerManualPayment } from '../../application/use-cases/register-manual-payment.ts';
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
import { reopenReconciliationPeriod } from '../../application/use-cases/reopen-reconciliation-period.ts';
import { exportReconciliation } from '../../application/use-cases/export-reconciliation.ts';
import { createCedenteAccount } from '../../application/use-cases/create-cedente-account.ts';
import { listCedenteAccounts } from '../../application/use-cases/list-cedente-accounts.ts';
import { listCedenteAccountsWithBalance } from '../../application/use-cases/list-cedente-accounts-with-balance.ts';
import { closeCedenteAccount } from '../../application/use-cases/close-cedente-account.ts';
import { editCedenteAccount } from '../../application/use-cases/edit-cedente-account.ts';
import { getAccountStatement } from '../../application/use-cases/get-account-statement.ts';
import { getTransactionReconciliation } from '../../application/use-cases/get-transaction-reconciliation.ts';
import { listReconciliationPeriods } from '../../application/use-cases/list-reconciliation-periods.ts';
import { getStatementSuggestions } from '../../application/use-cases/get-statement-suggestions.ts';
import { createStatementBackedAccountHistory } from '../persistence/repos/cedente-account-history.from-statements.ts';
import type { DocumentRepository } from '../../domain/document/repository.ts';
import type { PayeeKind } from '../../domain/document/types.ts';
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
  /** Port de leitura de parceiros (ADR-0032 — composição síncrona do bancário do favorecido).
   *  Injetado em testes; driver mysql constrói automaticamente se ausente. */
  contractorReadPort?: ContractorReadPort;
  /** Port de leitura do NOME de usuário (#207 — ADR-0032; nome do executor/closer da conciliação).
   *  Injetado em testes; driver mysql constrói automaticamente se ausente. */
  authUserReadPort?: AuthUserReadPort;
}>;

export type FinancialHttpDeps = Readonly<{
  saveDocument: ReturnType<typeof saveDocument>;
  saveDraft: ReturnType<typeof saveDraft>;
  adjustDocument: ReturnType<typeof adjustDocument>;
  approveDocument: ReturnType<typeof approveDocument>;
  /** Baixa manual de título (#219/#224) — POST /documents/:id/payables/:payableId/manual-payment. */
  registerManualPayment: ReturnType<typeof registerManualPayment>;
  undoApproval: ReturnType<typeof undoApproval>;
  cancelDocument: ReturnType<typeof cancelDocument>;
  submitDraft: ReturnType<typeof submitDraft>;
  /** Leitura direta do repositório — usado pelo GET /documents/:id. */
  findDocumentById: DocumentRepository['findById'];
  /** Listagem paginada (US1 — read path no writer pool; split reader/writer diferido — ADR-0003). */
  listDocuments: DocumentRepository['findPaged'];
  /** Listagem payable-centric (#201/#222) — GET /financial/payable-titles (pai+filhos como linhas). */
  listPayables: PayableListView['findPaged'];
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
  /** Reabre período (#203) — POST /reconciliation-periods/:id/reopen. */
  reopenReconciliationPeriod: ReturnType<typeof reopenReconciliationPeriod>;
  /** Exporta conciliação OFX/CSV (US6) — GET /reconciliation-periods/:id/export. */
  exportReconciliation: ReturnType<typeof exportReconciliation>;
  /** Conta-cedente (019) — POST /cedente-accounts. */
  createCedenteAccount: ReturnType<typeof createCedenteAccount>;
  /** Conta-cedente (019) — GET /cedente-accounts. */
  listCedenteAccounts: ReturnType<typeof listCedenteAccounts>;
  /** Conta-cedente + saldo atual (#89c F1) — GET /cedente-accounts (lista com currentBalanceCents). */
  listCedenteAccountsWithBalance: ReturnType<typeof listCedenteAccountsWithBalance>;
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
  /** Lista períodos de conciliação por conta (#173) — GET /reconciliation-periods. */
  listReconciliationPeriods: ReturnType<typeof listReconciliationPeriods>;
  /** Sugestões de match em lote por extrato (#174) — GET /bank-statements/:id/suggestions. */
  getStatementSuggestions: ReturnType<typeof getStatementSuggestions>;
  /** Categorias de referência (020 · US1) — GET /financial/categories. */
  listCategories: CategoryReadPort['list'];
  /** Centros de custo de referência (020 · US2) — GET /financial/cost-centers. */
  listCostCenters: CostCenterReadPort['list'];
  /** Programas (020 · US3) — GET /financial/programs (passthrough cross-módulo). */
  listPrograms: ProgramReadPort['list'];
  /** Composição síncrona do bancário do favorecido (#255 — ADR-0032). */
  resolvePayeeBank: (ref: {
    kind: PayeeKind | null;
    id: string | null;
  }) => Promise<PayeeBankBlock | null>;
  /** Composição síncrona do NOME de usuário (#207 — ADR-0032). null = não-resolvido (graceful). */
  resolveUserName: (id: string | null) => Promise<string | null>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  // #48: leitura cross-módulo da categorização do contrato (ADR-0006). memory: in-memory vazio;
  // mysql: read-port de contracts na MESMA conexão (ctr_* no mesmo DB do monólito).
  contractCategorizationReader: ContractCategorizationReadPort;
  repo: DocumentRepository;
  payableListView: PayableListView;
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
  categoryReader: CategoryReadPort;
  costCenterReader: CostCenterReadPort;
  programReader: ProgramReadPort;
  // #255: port de leitura do contratado (ADR-0032). memory: injetado ou null; mysql: construído.
  contractorReadPort: ContractorReadPort | null;
  // #207: port de leitura do nome de usuário (ADR-0032). memory: injetado ou null; mysql: construído.
  authUserReadPort: AuthUserReadPort | null;
  shutdown: () => Promise<void>;
}>;

// Categorias de referência semeadas (020 · D5) para o driver memory — mesmos UUIDs fixos da
// migration 0012. Itens com id/grupo inválido são descartados (defensivo; não deve ocorrer).
const seededCategories = (): readonly Category.Category[] =>
  REFERENCE_CATEGORY_SEED.flatMap((s) => {
    const idR = CategoryId.rehydrate(s.id);
    if (!idR.ok) return [];
    // #147 F3: parentId opcional no seed (subcategoria). Pai inválido → descarta o item (defensivo).
    let parentId: CategoryId.CategoryId | null = null;
    if (s.parentId !== undefined) {
      const pR = CategoryId.rehydrate(s.parentId);
      if (!pR.ok) return [];
      parentId = pR.value;
    }
    const r = Category.create({ id: idR.value, name: s.name, group: s.group, parentId });
    return r.ok ? [r.value] : [];
  });

const seededCostCenters = (): readonly CostCenter.CostCenter[] =>
  REFERENCE_COST_CENTER_SEED.flatMap((s) => {
    const idR = CostCenterId.rehydrate(s.id);
    if (!idR.ok) return [];
    const r = CostCenter.create({ id: idR.value, code: s.code, name: s.name });
    return r.ok ? [r.value] : [];
  });

// Stub de programas para o driver memory (dev/testes). No driver mysql a fonte real é
// programs/public-api (ADR-0006) via createProgramsApiReadStore.
const seededProgramsStub = (): readonly ProgramView[] => [
  { id: '7b000000-0000-4000-8000-000000000001', name: 'Saúde Comunitária' },
  { id: '7b000000-0000-4000-8000-000000000002', name: 'Educação Infantil' },
  { id: '7b000000-0000-4000-8000-000000000003', name: 'Captação de recursos' },
];

const buildMemoryPools = (
  contractorReadPort: ContractorReadPort | null,
  authUserReadPort: AuthUserReadPort | null,
): Pools => {
  // Store compartilhado entre o document-repo (escreve trilha no save) e o timeline-repo
  // (lê). Garante atomicidade em memória sem tx (timeline-repository.in-memory.ts §store).
  const timelineStore: TimelineStore = new Map<string, FinancialTimelineEntry[]>();
  // Read-model de fornecedor (#47/US2): vazio no driver memory (sem consumer) → grid resolve
  // fornecedor como null. Populado de verdade só no driver mysql (worker de projeção + JOIN).
  const supplierViewStore = createInMemorySupplierViewStore();
  // #222: store compartilhado entre o document-repo e o PayableListView in-memory (deriva os títulos).
  const documentStore: DocumentStore = new Map();
  const repo = createInMemoryDocumentRepository(
    timelineStore,
    supplierViewStore,
    undefined,
    documentStore,
  );
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
  const categoryReader = createInMemoryCategoryReadStore(seededCategories());
  const costCenterReader = createInMemoryCostCenterReadStore(seededCostCenters());
  const programReader = createInMemoryProgramReadStore(seededProgramsStub());
  return {
    contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
    categoryReader,
    costCenterReader,
    programReader,
    repo,
    payableListView: createInMemoryPayableListView(() =>
      [...documentStore.values()].map((e) => ({ ...e.aggregate, version: e.version })),
    ),
    timelineRepo,
    statementRepo,
    payableView,
    reconciliationRepo,
    cedenteStore,
    suggestionView,
    rejectedSuggestionRepo,
    periodStore,
    contractorReadPort,
    authUserReadPort,
    shutdown: () => Promise.resolve(),
  };
};

const buildMysqlPools = async (config: FinancialCompositionConfig): Promise<Pools> => {
  const writerUrl = config.writerUrl ?? '';
  const handleR = await openMysqlFinancial({
    connectionString: writerUrl,
    // Boot NÃO migra (CORE-MIGRATE-BOOT-INVERT): o schema é provisionado pelo job
    // `migrate` antes do deploy — evita race multi-instância (M5 do mysql-driver).
    applyMigrations: false,
  });
  if (!handleR.ok) {
    throw new Error(`financial-composition: falha ao abrir pool MySQL (${handleR.error})`);
  }
  const handle: FinancialMysqlHandle = handleR.value;
  // #48: read-port de contracts na MESMA conexão (ctr_* no mesmo DB do monólito — ADR-0006/0014).
  const readPortR = await buildContractsReadPort({ connectionString: writerUrl });
  if (!readPortR.ok) {
    await handle.close();
    throw new Error(
      `financial-composition: falha ao abrir read-port de contracts (${readPortR.error})`,
    );
  }
  const contractsReadPort = readPortR.value;
  // 020 · US3: programa lido da fonte canônica `programs` via public-api (ADR-0006), mesma conexão.
  const programsReadPortR = await buildProgramsReadPort({ connectionString: writerUrl });
  if (!programsReadPortR.ok) {
    await contractsReadPort.close();
    await handle.close();
    throw new Error(
      `financial-composition: falha ao abrir read-port de programs (${programsReadPortR.error})`,
    );
  }
  const programsReadPort = programsReadPortR.value;
  // #255: port de leitura de parceiros (ADR-0032). Injetado tem precedência (testes); o construído
  // abre pool próprio e é fechado no shutdown.
  let contractorReadPort: ContractorReadPort | null = config.contractorReadPort ?? null;
  let closeContractorPort: () => Promise<void> = () => Promise.resolve();
  if (contractorReadPort === null) {
    const portR = await buildPartnersReadPort({ connectionString: writerUrl });
    if (!portR.ok) {
      await programsReadPort.close();
      await contractsReadPort.close();
      await handle.close();
      throw new Error(`financial-composition: falha ao abrir partners read port (${portR.error})`);
    }
    contractorReadPort = portR.value;
    closeContractorPort = portR.value.close;
  }
  // #207: port de leitura do nome de usuário (ADR-0032). Injetado tem precedência (testes); o
  // construído abre pool próprio (auth_* no mesmo DB do monólito) e é fechado no shutdown.
  let authUserReadPort: AuthUserReadPort | null = config.authUserReadPort ?? null;
  let closeAuthUserPort: () => Promise<void> = () => Promise.resolve();
  if (authUserReadPort === null) {
    const authPortR = await buildAuthUserReadPort({ connectionString: writerUrl });
    if (!authPortR.ok) {
      await closeContractorPort();
      await programsReadPort.close();
      await contractsReadPort.close();
      await handle.close();
      throw new Error(
        `financial-composition: falha ao abrir auth user read port (${authPortR.error})`,
      );
    }
    authUserReadPort = authPortR.value;
    closeAuthUserPort = authPortR.value.close;
  }
  return {
    contractCategorizationReader: contractsReadPort,
    repo: createDrizzleDocumentRepository(handle),
    payableListView: createDrizzlePayableListView(handle),
    // Leitura da trilha via pool (a escrita é feita dentro da tx do document-repo.save).
    timelineRepo: createDrizzleTimelineRepository(handle),
    statementRepo: createDrizzleBankStatementRepository(handle),
    payableView: createDrizzlePayableReconciliationView(handle),
    reconciliationRepo: createDrizzleReconciliationRepository(handle),
    cedenteStore: createDrizzleCedenteAccountStore(handle),
    categoryReader: createDrizzleCategoryReadStore(handle),
    costCenterReader: createDrizzleCostCenterReadStore(handle),
    programReader: createProgramsApiReadStore(programsReadPort),
    suggestionView: createDrizzleSuggestionView(handle),
    rejectedSuggestionRepo: createDrizzleRejectedSuggestionRepository(handle),
    periodStore: createDrizzleReconciliationPeriodStore(handle),
    contractorReadPort,
    authUserReadPort,
    shutdown: async () => {
      await closeAuthUserPort();
      await closeContractorPort();
      await programsReadPort.close();
      await contractsReadPort.close();
      await handle.close();
    },
  };
};

const makeDeps = (pools: Pools): FinancialHttpDeps => {
  // #127: NENHUM use-case recebe mais `outbox` — todo evento de domínio do financial é gravado no
  // `fin_outbox` na MESMA tx do agregado/unit-of-work (atomicidade — ADR-0015), via os repos
  // (`save`/`delete`/`confirm`/`confirmManualEntry`/`undo`/`close`). No driver memory cada repo usa
  // um outbox interno (descartável); no mysql → tabela `fin_outbox`. Sem dual-write.
  const clock = ClockReal();
  // Deps base (repo + clock); os 6 use cases mutantes recebem `clock` para
  // carimbar `occurredAt` das entries da trilha (timeline-recording.ts).
  const deps = {
    cedenteAccountStore: pools.cedenteStore,
    repo: pools.repo,
    clock,
    contractCategorizationReader: pools.contractCategorizationReader,
  };
  // Lançamento manual (US5): reaproveitado pelo confirmBatch (1 template × N transações).
  const record = recordManualEntry({
    reconciliationRepo: pools.reconciliationRepo,
    statements: pools.statementRepo,
    cedenteStore: pools.cedenteStore,
    periods: pools.periodStore,
    clock,
  });
  // Sugestões: instância reusada pela rota por-transação (#121) e pelo lote (#174).
  const suggest = suggestMatches({
    statements: pools.statementRepo,
    suggestions: pools.suggestionView,
    rejected: pools.rejectedSuggestionRepo,
  });
  return {
    saveDocument: saveDocument(deps),
    saveDraft: saveDraft(deps),
    adjustDocument: adjustDocument(deps),
    approveDocument: approveDocument(deps),
    registerManualPayment: registerManualPayment(deps),
    undoApproval: undoApproval(deps),
    cancelDocument: cancelDocument({ repo: pools.repo }),
    submitDraft: submitDraft(deps),
    findDocumentById: pools.repo.findById,
    listDocuments: pools.repo.findPaged,
    listPayables: pools.payableListView.findPaged,
    getDocumentTimeline: getDocumentTimeline({ timelineRepo: pools.timelineRepo }),
    importBankStatement: importBankStatement({
      parser: bankStatementParser,
      repo: pools.statementRepo,
      periods: pools.periodStore,
      cedenteStore: pools.cedenteStore,
      clock,
    }),
    listStatementTransactions: pools.statementRepo.listTransactions,
    confirmReconciliation: confirmReconciliation({
      reconciliationRepo: pools.reconciliationRepo,
      payables: pools.payableView,
      statements: pools.statementRepo,
      cedenteStore: pools.cedenteStore,
      periods: pools.periodStore,
      clock,
    }),
    undoReconciliation: undoReconciliation({
      reconciliationRepo: pools.reconciliationRepo,
      statements: pools.statementRepo,
      periods: pools.periodStore,
      clock,
    }),
    searchPaidPayables: searchPaidPayables({ payables: pools.payableView }),
    suggestMatches: suggest,
    getStatementSuggestions: getStatementSuggestions({
      listStatementTransactions: pools.statementRepo.listTransactions,
      suggestMatches: suggest,
    }),
    rejectSuggestion: rejectSuggestion({ rejected: pools.rejectedSuggestionRepo, clock }),
    recordManualEntry: record,
    confirmBatch: confirmBatch({ record }),
    closeReconciliationPeriod: closeReconciliationPeriod({
      periodStore: pools.periodStore,
      statements: pools.statementRepo,
      clock,
    }),
    reopenReconciliationPeriod: reopenReconciliationPeriod({
      periodStore: pools.periodStore,
      clock,
    }),
    exportReconciliation: exportReconciliation({
      periodStore: pools.periodStore,
      statements: pools.statementRepo,
      exporter: reconciliationExporter,
    }),
    createCedenteAccount: createCedenteAccount({ cedenteStore: pools.cedenteStore }),
    listCedenteAccounts: listCedenteAccounts({ cedenteStore: pools.cedenteStore }),
    listCedenteAccountsWithBalance: listCedenteAccountsWithBalance({
      cedenteStore: pools.cedenteStore,
      statements: pools.statementRepo,
      clock,
    }),
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
    listReconciliationPeriods: listReconciliationPeriods({ periodStore: pools.periodStore }),
    listCategories: pools.categoryReader.list,
    listCostCenters: pools.costCenterReader.list,
    listPrograms: pools.programReader.list,
    resolvePayeeBank: (ref) => composePayeeBank(pools.contractorReadPort, ref),
    resolveUserName: (id) => resolveUserName(pools.authUserReadPort, id),
    shutdown: pools.shutdown,
  };
};

export const buildFinancialHttpDeps = async (
  config: FinancialCompositionConfig,
): Promise<FinancialHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(
      buildMemoryPools(config.contractorReadPort ?? null, config.authUserReadPort ?? null),
    );
  }

  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('financial-composition: driver mysql exige writerUrl');
  }
  return makeDeps(await buildMysqlPools(config));
};
