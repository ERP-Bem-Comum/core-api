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
import type { Clock } from '#src/shared/ports/clock.ts';
import { ok, err } from '#src/shared/primitives/result.ts';

import {
  createInMemoryDocumentRepository,
  type DocumentStore,
} from '../persistence/repos/document-repository.in-memory.ts';
import { createInMemoryPayableRepository } from '../persistence/repos/payable-repository.in-memory.ts';
import {
  createInMemoryPayableListView,
  derivePayableListItems,
} from '../persistence/repos/payable-list-view.in-memory.ts';
import { createDrizzlePayableListView } from '../persistence/repos/payable-list-view.drizzle.ts';
import type { PayableListView } from '../../application/ports/payable-list-view.ts';
import { createInMemorySupplierViewStore } from '../persistence/repos/supplier-view-store.in-memory.ts';
import { createDrizzleSupplierViewStore } from '../persistence/repos/supplier-view-store.drizzle.ts';
// #239: read-model de payables (Top-5 "Últimos pagamentos") — molde de supplier-view-store acima.
import { createInMemoryPayableViewStore } from '../persistence/repos/payable-view-store.in-memory.ts';
import { createDrizzlePayableViewStore } from '../persistence/repos/payable-view-store.drizzle.ts';
// #242 DASH-F5: reader da agregação "Fornecedores sem Contrato" (REP-2/#240) reusado para o Top-5
// do Dashboard. memory: fake in-memory (seedável em testes); mysql: reader Drizzle boot-scoped.
import { createInMemorySuppliersWithoutContractReader } from '../persistence/repos/suppliers-without-contract-reader.in-memory.ts';
import {
  openSuppliersWithoutContractReader,
  type SuppliersWithoutContractReader,
} from '../../public-api/suppliers-without-contract-projection.ts';
// #241 DASH-F1: reader do KPI "Despesas por Centro de Custo". memory: fake in-memory (seedável em
// testes); mysql: reader Drizzle boot-scoped. As janelas M-1/M-2 são computadas na borda (clock).
import { createInMemoryDashboardCostCentersReader } from '../persistence/repos/dashboard-cost-centers-reader.in-memory.ts';
import {
  openDashboardCostCentersReader,
  type DashboardCostCentersReader,
} from '../../public-api/dashboard-cost-centers-projection.ts';
// #237: motor de variação PURO (M-1 vs M-2). A referência é o `clock.now()` da composição (borda).
import { comparisonWindows } from '../../domain/dashboard/variation.ts';
import { createInMemoryPayableDocumentView } from '../persistence/repos/payable-document-view.in-memory.ts';
import { createDrizzlePayableDocumentView } from '../persistence/repos/payable-document-view.drizzle.ts';
// M2 (RN-M2-09/10): validação do CAMINHO da taxonomia contra a árvore do plano (ADR-0051), via
// `budget-plans/public-api` — o financeiro nunca toca `bgp_*`.
import {
  buildBudgetPlansReadPort,
  type BudgetPlansReadPort,
} from '#src/modules/budget-plans/public-api/read.ts';
import { createBudgetPlansTaxonomyPathRead } from '../persistence/repos/taxonomy-path-read.from-budget-plans.ts';
import { createInMemoryTaxonomyPathRead } from '../persistence/repos/taxonomy-path-read.in-memory.ts';
import type { TaxonomyPath, TaxonomyPathRead } from '../../application/ports/taxonomy-path-read.ts';

// #268: os 5 refs vigentes de um título, para a leitura do conciliado. Shape plano — é DTO de borda,
// não VO: quem o consome é o `transactionReconciliationToDto`.
export type TitleTaxonomyDto = Readonly<{
  programRef: string | null;
  budgetPlanRef: string | null;
  costCenterRef: string | null;
  categoryRef: string | null;
  subcategoryRef: string | null;
}>;
// #357: resumo de título em lote — POST /financial/payables:batch (ADR-0049).
import {
  createInMemoryPayableSummaryByIdsView,
  payableListItemToSummaryRow,
} from '../persistence/repos/payable-summary-by-ids-view.in-memory.ts';
import { createDrizzlePayableSummaryByIdsView } from '../persistence/repos/payable-summary-by-ids-view.drizzle.ts';
import type { PayableSummaryByIdsView } from '../../application/ports/payable-summary-by-ids-view.ts';
// #358: resumo de documento em lote — POST /financial/documents:batch (ADR-0049).
import {
  createInMemoryDocumentSummaryByIdsView,
  loadedDocumentToSummaryRow,
} from '../persistence/repos/document-summary-by-ids-view.in-memory.ts';
import { createDrizzleDocumentSummaryByIdsView } from '../persistence/repos/document-summary-by-ids-view.drizzle.ts';
import { createDrizzleRemittancePreviewReader } from '../persistence/repos/remittance-preview-reader.drizzle.ts';
import { createInMemoryRemittancePreviewReader } from '../persistence/repos/remittance-preview-reader.in-memory.ts';
import { createDrizzleRemittancePaymentReader } from '../persistence/repos/remittance-payment-reader.drizzle.ts';
import { createInMemoryRemittancePaymentReader } from '../persistence/repos/remittance-payment-reader.in-memory.ts';
import { createDrizzleRemittanceRepository } from '../persistence/repos/remittance-repository.drizzle.ts';
import { createInMemoryRemittanceRepository } from '../persistence/repos/remittance-repository.in-memory.ts';
import { createS3VanStorage } from '../van/van-storage.s3.ts';
import { createInMemoryVanStorage } from '../van/van-storage.in-memory.ts';
import { parseVanS3Env } from '../van/van-s3-config.ts';
import { decideVanStorage } from '../van/van-storage-decision.ts';
import { createBradescoMultipagTranslator } from '../cnab/bradesco-multipag-translator.ts';
import { createRemittanceBatchPlanner } from '../cnab/batch-planner.ts';
import { generateRemittance } from '../../application/use-cases/generate-remittance.ts';
import { discardRemittance } from '../../application/use-cases/discard-remittance.ts';
import { listRemittances } from '../../application/use-cases/list-remittances.ts';
import { getRemittance } from '../../application/use-cases/get-remittance.ts';
import { downloadRemittanceFile } from '../../application/use-cases/download-remittance-file.ts';
import { listVanReturnQuarantine } from '../../application/use-cases/list-van-return-quarantine.ts';
import type { VanReturnQuarantineStore } from '../../application/ports/van-return-quarantine-store.ts';
import { createInMemoryVanReturnQuarantine } from '../persistence/repos/van-return-quarantine-store.in-memory.ts';
import { createDrizzleVanReturnQuarantineStore } from '../persistence/repos/van-return-quarantine-store.drizzle.ts';
import * as RemittanceIdVo from '../../domain/remittance/remittance-id.ts';
import { sha256Hex } from '#src/shared/utils/hash.ts';
import type { RemittancePaymentReader } from '../../application/ports/remittance-payment-reader.ts';
import type { RemittanceRepository } from '../../application/ports/remittance-repository.ts';
import type { VanStoragePort } from '../../application/ports/van-storage.ts';
import type { DocumentSummaryByIdsView } from '../../application/ports/document-summary-by-ids-view.ts';
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
import { createInMemoryExpectedCounterpartStore } from '../persistence/repos/expected-counterpart-store.in-memory.ts';
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
import {
  buildAuthUserReadPort,
  type AuthUserReadPort,
  type ApproverAuthorityReadPort,
} from '#src/modules/auth/public-api/read.ts';
import {
  composePayeeBank,
  readPayeeBank,
  readPayeeContractor,
  type PayeeBankBlock,
} from './payee-bank-composition.ts';
import { resolveUserName } from './user-name-composition.ts';
// #289: adapta o ApproverAuthorityReadPort do auth (ACL) → ApproverAuthorityReader do financial.
import { createAuthApproverAuthorityReader } from '../read/approver-authority-reader.auth.ts';
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
import * as Competencia from '../../domain/document/competencia.ts';
import type { CostCenterReadPort } from '../../application/ports/cost-center-read.ts';
import { createInMemoryProgramReadStore } from '../persistence/repos/program-read.in-memory.ts';
import { createProgramsApiReadStore } from '../persistence/repos/program-read.from-programs.ts';
import { buildProgramsReadPort } from '#src/modules/programs/public-api/index.ts';
import type { ProgramReadPort, ProgramView } from '../../application/ports/program-read.ts';
import { createDrizzleDocumentRepository } from '../persistence/repos/document-repository.drizzle.ts';
import { createDrizzlePayableRepository } from '../persistence/repos/payable-repository.drizzle.ts';
import { createDrizzleTimelineRepository } from '../persistence/repos/timeline-repository.drizzle.ts';
import { createDrizzleBankStatementRepository } from '../persistence/repos/bank-statement-repository.drizzle.ts';
import { createDrizzlePayableReconciliationView } from '../persistence/repos/payable-reconciliation-view.drizzle.ts';
import { createDrizzleReconciliationRepository } from '../persistence/repos/reconciliation-repository.drizzle.ts';
import { createDrizzleExpectedCounterpartStore } from '../persistence/repos/expected-counterpart-store.drizzle.ts';
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
import { ingestDocument } from '../../application/use-cases/ingest-document.ts';
import { parseDocument } from '../../application/use-cases/parse-document.ts';
import { previewRemittance } from '../../application/use-cases/preview-remittance.ts';
import type { RemittancePreviewReader } from '../../application/ports/remittance-preview-reader.ts';
import type { SourceFileStoragePort } from '../../application/ports/source-file-storage.ts';
import { createInMemorySourceFileStorage } from '../storage/source-file-storage.in-memory.ts';
import { createS3SourceFileStorage } from '../storage/source-file-storage.s3.ts';
import { createDocumentReader } from '../document-reader/create-document-reader.ts';
import * as DocumentIdVo from '../../domain/shared/document-id.ts';
import { parseAwsS3Env } from '#src/modules/contracts/public-api/index.ts';
import { adjustDocument } from '../../application/use-cases/adjust-document.ts';
import { bulkUpdateDueDate } from '../../application/use-cases/bulk-update-due-date.ts';
import { approveDocument } from '../../application/use-cases/approve-document.ts';
import { registerManualPayment } from '../../application/use-cases/register-manual-payment.ts';
import { updatePayableDueDate } from '../../application/use-cases/update-payable-due-date.ts';
import { undoApproval } from '../../application/use-cases/undo-approval.ts';
import { cancelDocument } from '../../application/use-cases/cancel-document.ts';
import { submitDraft } from '../../application/use-cases/submit-draft.ts';
import { getDocumentTimeline } from '../../application/use-cases/get-document-timeline.ts';
import { importBankStatement } from '../../application/use-cases/import-bank-statement.ts';
import { deleteBankStatement } from '../../application/use-cases/delete-bank-statement.ts';
import { confirmReconciliation } from '../../application/use-cases/confirm-reconciliation.ts';
import { undoReconciliation } from '../../application/use-cases/undo-reconciliation.ts';
import { searchPaidPayables } from '../../application/use-cases/search-paid-payables.ts';
import { suggestMatches } from '../../application/use-cases/suggest-matches.ts';
import { suggestCounterpartMatches } from '../../application/use-cases/suggest-counterpart-matches.ts';
import { confirmCounterpartMatch } from '../../application/use-cases/confirm-counterpart-match.ts';
import { rejectSuggestion } from '../../application/use-cases/reject-suggestion.ts';
import { recordManualEntry } from '../../application/use-cases/record-manual-entry.ts';
import { confirmBatch } from '../../application/use-cases/confirm-batch.ts';
import { closeReconciliationPeriod } from '../../application/use-cases/close-reconciliation-period.ts';
import { reopenReconciliationPeriod } from '../../application/use-cases/reopen-reconciliation-period.ts';
import { exportReconciliation } from '../../application/use-cases/export-reconciliation.ts';
import { exportReconciliationNibo } from '../../application/use-cases/export-reconciliation-nibo.ts';
import { niboExporter } from '../export/nibo-csv.ts';
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
import type { DocumentRepository, LoadedDocument } from '../../domain/document/repository.ts';
import type { PayableRepository } from '../../domain/payable/repository.ts';
import type { PayeeKind } from '../../domain/document/types.ts';
import type { FinancialTimelineRepository } from '../../domain/timeline/repository.ts';
import type { FinancialTimelineEntry } from '../../domain/timeline/types.ts';
import type { BankStatementRepository } from '../../application/ports/bank-statement-repository.ts';
import type { PayableReconciliationView } from '../../application/ports/payable-reconciliation-view.ts';
import type { ReconciliationRepository } from '../../application/ports/reconciliation-repository.ts';
import type { CedenteAccountStore } from '../../application/ports/cedente-account-store.ts';
import type { ExpectedCounterpartStore } from '../../application/ports/expected-counterpart-store.ts';
import type { ExpectedCounterpart } from '../../domain/expected-counterpart/types.ts';
import type { SuggestionView } from '../../application/ports/suggestion-view.ts';
import type { RejectedSuggestionRepository } from '../../application/ports/rejected-suggestion-repository.ts';
import type { ReconciliationPeriodStore } from '../../application/ports/reconciliation-period-store.ts';
import type { SupplierViewStore } from '../../application/ports/supplier-view-store.ts';
import type { PayableDocumentView } from '../../application/ports/payable-document-view.ts';
// #239: read-model de payables — GET /financial/dashboard/recent-payments (Top-5 pagos).
import type { PayableViewStore } from '../../application/ports/payable-view-store.ts';

export type FinancialDriver = 'memory' | 'mysql';

export type FinancialCompositionConfig = Readonly<{
  driver: FinancialDriver;
  /** URL de conexão MySQL (obrigatório para driver mysql). */
  writerUrl?: string;
  /** Port de leitura de parceiros (ADR-0032 — composição síncrona do bancário do favorecido).
   *  Injetado em testes; driver mysql constrói automaticamente se ausente. */
  contractorReadPort?: ContractorReadPort;
  /** Port de leitura do NOME de usuário + alçada do aprovador (#207/#289 — ADR-0032).
   *  Injetado em testes; driver mysql constrói automaticamente se ausente. */
  authUserReadPort?: AuthUserReadPort & ApproverAuthorityReadPort;
  /** M2 · RN-M2-09/10 — read-port do `budget-plans` (ADR-0051): valida o CAMINHO da taxonomia no
   *  confirm da conciliação. Injetado em testes; driver mysql constrói automaticamente se ausente. */
  budgetPlansReadPort?: BudgetPlansReadPort;
  /** M2 — atalho para os testes (memory): os caminhos de taxonomia aceitos como válidos. Ausente →
   *  nenhum caminho é válido, e toda reclassificação é recusada (default seguro). */
  taxonomyPaths?: readonly TaxonomyPath[];
  /** Read-model de payables (#239 — widget "Últimos pagamentos"). Em produção é alimentado de forma
   *  ASSÍNCRONA pelo worker `payable-view-projection` (ADR-0022) — não pelas rotas de escrita deste
   *  composition root. Injetado em testes HTTP para semear dados determinísticos via `applyPayableEvent`;
   *  ambos os drivers constroem uma store vazia automaticamente se ausente. */
  payableViewStore?: PayableViewStore;
  /** #242 · DASH-F5 — reader da agregação "Fornecedores sem Contrato" (REP-2/#240), reusado para o
   *  Top-5 do Dashboard. Injetado em testes HTTP (memory) com dados determinísticos; ambos os drivers
   *  constroem um reader por padrão se ausente (memory: fake vazio; mysql: reader Drizzle boot-scoped). */
  suppliersWithoutContractReader?: SuppliersWithoutContractReader;
  /** #241 · DASH-F1 — reader do KPI "Despesas por Centro de Custo". Injetado em testes HTTP (memory)
   *  com dados determinísticos; ambos os drivers constroem um reader por padrão se ausente
   *  (memory: fake vazio; mysql: reader Drizzle boot-scoped). */
  dashboardCostCentersReader?: DashboardCostCentersReader;
  /** #241 · DASH-F1 — fonte da referência de "agora" (M-1/M-2). Injetável em testes (ClockFixed) para
   *  asserir as janelas de forma determinística; default `ClockReal()`. */
  clock?: Clock;
  /** #720 · Pré-voo da remessa — leitura crua do documento + destino de pagamento. Injetável em
   *  testes HTTP (memory) com linhas determinísticas; no driver mysql o reader Drizzle é montado
   *  com a leitura de `partners` que preserva indisponibilidade. */
  remittancePreviewReader?: RemittancePreviewReader;
  /** #720 · Títulos prontos para emitir. Injetável em testes HTTP (memory); no driver mysql o
   *  reader Drizzle converte o cadastro pela mesma régua que o pré-voo usa para diagnosticar. */
  remittancePaymentReader?: RemittancePaymentReader;
  /** #728 · Registro de remessa (acompanhamento — GET /financial/remittances[/:id]). Injetável em
   *  testes HTTP (memory) para semear remessas determinísticas; ambos os drivers constroem o repo
   *  por padrão se ausente (memory: in-memory vazio; mysql: adapter Drizzle). */
  remittanceRepo?: RemittanceRepository;
  /** #753 · Quarentena do retorno da VAN. Injetável para semear objetos presos no teste HTTP. */
  vanReturnQuarantine?: VanReturnQuarantineStore;
}>;

export type FinancialHttpDeps = Readonly<{
  saveDocument: ReturnType<typeof saveDocument>;
  saveDraft: ReturnType<typeof saveDraft>;
  ingestDocument: ReturnType<typeof ingestDocument>; // #62: ingestão (leitura + storage + rascunho)
  parseDocument: ReturnType<typeof parseDocument>; // #580: leitura pura (parse-only, sem persistir)
  adjustDocument: ReturnType<typeof adjustDocument>;
  bulkUpdateDueDate: ReturnType<typeof bulkUpdateDueDate>; // #162: vencimento em lote
  approveDocument: ReturnType<typeof approveDocument>;
  /** Baixa manual de título (#219/#224) — POST /documents/:id/payables/:payableId/manual-payment. */
  registerManualPayment: ReturnType<typeof registerManualPayment>;
  /** Vencimento de título isolado (#270) — PATCH /documents/:id/payables/:payableId. */
  updatePayableDueDate: ReturnType<typeof updatePayableDueDate>;
  undoApproval: ReturnType<typeof undoApproval>;
  cancelDocument: ReturnType<typeof cancelDocument>;
  submitDraft: ReturnType<typeof submitDraft>;
  /** Leitura direta do repositório — usado pelo GET /documents/:id. */
  findDocumentById: DocumentRepository['findById'];
  /** #62/Feature 2: serve os bytes do comprovante-fonte INLINE — GET /documents/:id/source-file. */
  downloadSourceFile: SourceFileStoragePort['download'];
  /** #577: sobe o comprovante no create atômico — POST /documents/with-source-file. */
  uploadSourceFile: SourceFileStoragePort['upload'];
  /** #577: compensação (F4) — remove o comprovante órfão se o save falhar após o upload. */
  removeSourceFile: SourceFileStoragePort['remove'];
  /** Listagem paginada (US1 — read path no writer pool; split reader/writer diferido — ADR-0003). */
  listDocuments: DocumentRepository['findPaged'];
  /** Listagem payable-centric (#201/#222) — GET /financial/payable-titles (pai+filhos como linhas). */
  listPayables: PayableListView['findPaged'];
  countPayableTitles: PayableListView['countByStatus'];
  /** Trilha por-campo (Time Travel) de um documento — consumido pelo GET /documents/:id/timeline. */
  getDocumentTimeline: ReturnType<typeof getDocumentTimeline>;
  /** Importação de extrato bancário (US1 conciliação) — POST /bank-statements. */
  importBankStatement: ReturnType<typeof importBankStatement>;
  deleteBankStatement: ReturnType<typeof deleteBankStatement>;
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
  /** Sugestões de contrapartida (#269/US2) — GET /statement-transactions/:id/counterpart-suggestions. */
  suggestCounterpartMatches: ReturnType<typeof suggestCounterpartMatches>;
  /** Confirma casamento de contrapartida (#269/US2) — POST /reconciliations/counterpart. */
  confirmCounterpartMatch: ReturnType<typeof confirmCounterpartMatch>;
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
  /** Exporta conciliação no layout Nibo CSV (#146) — GET /reconciliation-periods/:id/export/nibo. */
  exportReconciliationNibo: ReturnType<typeof exportReconciliationNibo>;
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
  /** #239 · Últimos pagamentos — GET /financial/dashboard/recent-payments. */
  listRecentPaid: PayableViewStore['listRecentPaid'];
  /** #242 · Fornecedores sem contrato (Top-5) — GET /financial/dashboard/no-contract-suppliers. */
  listTopSuppliersWithoutContract: SuppliersWithoutContractReader['listTop'];
  /** #241 · KPI Despesas por Centro de Custo — GET /financial/dashboard/cost-centers. Zero-arg: a
   *  borda computa as janelas M-1/M-2 de `clock.now()` (motor #237) e chama o reader. Devolve o
   *  agregado bruto por CC (o assembler puro monta total/top/distribuição). */
  listDashboardCostCenters: () => ReturnType<DashboardCostCentersReader['list']>;
  /** #357 · Resolução em lote de payableId[] — POST /financial/payables:batch (ADR-0049). */
  getPayablesSummaryByIds: PayableSummaryByIdsView['getPayablesSummaryByIds'];
  /** #358 · Resolução em lote de documentId[] — POST /financial/documents:batch (ADR-0049). */
  getDocumentsSummaryByIds: DocumentSummaryByIdsView['getDocumentsSummaryByIds'];
  /** Composição síncrona do bancário do favorecido (#255 — ADR-0032). */
  resolvePayeeBank: (ref: {
    kind: PayeeKind | null;
    id: string | null;
  }) => Promise<PayeeBankBlock | null>;
  /**
   * #720 · Pré-voo da remessa — POST /financial/remittances:preview.
   *
   * Leitura pura: não consome NSA, não prende documento e não toca no bucket. É o que o operador
   * consulta antes de decidir gerar, e o que responde "o que não sai, e por quê" por título.
   */
  previewRemittance: ReturnType<typeof previewRemittance>;
  /**
   * #720 · Geração da remessa — POST /financial/remittances.
   *
   * Consome NSA, prende os documentos e grava em `saida/`. Gravar ali É enfileirar pagamento
   * (ADR-0060), então esta é a única rota do módulo cuja chamada move dinheiro.
   */
  generateRemittance: ReturnType<typeof generateRemittance>;
  discardRemittance: ReturnType<typeof discardRemittance>;
  /**
   * #728 · Acompanhamento — GET /financial/remittances (lista paginada) e
   * GET /financial/remittances/:id (detalhe). Read-only: leem o registro que o generate/worker já
   * mantém, sem consumir NSA nem tocar no bucket.
   */
  listRemittances: ReturnType<typeof listRemittances>;
  getRemittance: ReturnType<typeof getRemittance>;
  /**
   * GET /financial/remittances/:id/file — o arquivo que foi ao banco. **A rota só é registrada fora
   * de produção**; a dep existe sempre, porque montá-la condicionalmente faria o composition root
   * ter dois formatos e o teste de um deles nunca rodaria.
   */
  downloadRemittanceFile: ReturnType<typeof downloadRemittanceFile>;
  /**
   * #753 · Quarentena do retorno — GET /financial/van-returns/quarantine. Read-only sobre o que o
   * worker `van-return-scan` gravou; a borda nunca escreve na quarentena.
   */
  listVanReturnQuarantine: ReturnType<typeof listVanReturnQuarantine>;
  /** Composição síncrona do NOME de usuário (#207 — ADR-0032). null = não-resolvido (graceful). */
  resolveUserName: (id: string | null) => Promise<string | null>;
  /** Resolve categoryRef → nome (detalhe da conciliação). null = sem ref ou não-resolvido (graceful). */
  resolveCategoryName: (ref: string | null) => Promise<string | null>;
  /** #268: os 5 refs do documento conciliado (payableId → doc). null = sem doc (graceful). Substitui o
   *  `resolveTitleCategoryRef` da fatia 2 — a categoria era o único nível devolvido, e a tela precisa
   *  do caminho inteiro para reabrir o "Editar" na classificação vigente (M2-2). */
  resolveTitleTaxonomy: (payableId: string) => Promise<TitleTaxonomyDto | null>;
  shutdown: () => Promise<void>;
}>;

type Pools = Readonly<{
  // #48: leitura cross-módulo da categorização do contrato (ADR-0006). memory: in-memory vazio;
  // mysql: read-port de contracts na MESMA conexão (ctr_* no mesmo DB do monólito).
  contractCategorizationReader: ContractCategorizationReadPort;
  repo: DocumentRepository;
  // Fatia 1: escrita POR TÍTULO, separada do `repo`. Quem só muda um título não passa pelo `save`
  // do documento — ver `domain/payable/repository.ts`.
  payableRepo: PayableRepository;
  documentStorage: SourceFileStoragePort; // #62: storage do comprovante-fonte
  payableListView: PayableListView;
  // Repo de LEITURA da trilha. Na escrita, o `save` do DocumentRepository grava a trilha
  // na mesma transação (memory: store compartilhado; mysql: dentro da tx do save).
  timelineRepo: FinancialTimelineRepository;
  statementRepo: BankStatementRepository;
  payableView: PayableReconciliationView;
  reconciliationRepo: ReconciliationRepository;
  cedenteStore: CedenteAccountStore;
  // #269: contrapartida esperada de transferência A→B (Pending → Matched | Discarded).
  expectedCounterpartStore: ExpectedCounterpartStore;
  suggestionView: SuggestionView;
  rejectedSuggestionRepo: RejectedSuggestionRepository;
  periodStore: ReconciliationPeriodStore;
  categoryReader: CategoryReadPort;
  costCenterReader: CostCenterReadPort;
  programReader: ProgramReadPort;
  // #47/US2: read-model de fornecedor (fin_supplier_view). memory: in-memory vazio; mysql: drizzle.
  // Exposto nos Pools para que o use-case Nibo (#146) possa resolver nomes de fornecedor.
  supplierViewStore: SupplierViewStore;
  // #146: JOIN fin_payables × fin_documents para o export CSV-Nibo.
  payableDocView: PayableDocumentView;
  // #357: JOIN fin_payables × fin_documents × fin_supplier_view p/ POST /financial/payables:batch.
  payableSummaryByIdsView: PayableSummaryByIdsView;
  // #358: SELECT fin_documents ⟕ recon ⟕ fin_supplier_view p/ POST /financial/documents:batch.
  documentSummaryByIdsView: DocumentSummaryByIdsView;
  // #720: leitura crua do pré-voo (documento + destino de pagamento do favorecido). Quem julga
  // aptidão é `checkPayoutReadiness`, no domínio — este reader não decide nada.
  remittancePreviewReader: RemittancePreviewReader;
  // #720: os mesmos títulos, convertidos para emissão. Tudo-ou-nada, ao contrário do pré-voo.
  remittancePaymentReader: RemittancePaymentReader;
  // #720: registro da remessa (o que segura o documento entre gravar e confirmar) e o bucket.
  remittanceRepo: RemittanceRepository;
  vanStorage: VanStoragePort;
  // #753: a quarentena do prefixo de retorno — quem escreve é o worker `van-return-scan`; a borda
  // só lê. Vive aqui, e não no grupo de leitura, porque é o mesmo assunto operacional da VAN.
  vanReturnQuarantine: VanReturnQuarantineStore;
  // #239: read-model de payables (Top-5 "Últimos pagamentos"). memory: vazio no boot (sem worker de
  // projeção síncrono — injetável em testes via config.payableViewStore); mysql: drizzle.
  payableViewStore: PayableViewStore;
  // #242: reader da agregação "Fornecedores sem Contrato" (REP-2) reusado para o Top-5 do Dashboard.
  // memory: fake in-memory (injetável em testes); mysql: reader Drizzle boot-scoped (pool próprio).
  suppliersWithoutContractReader: SuppliersWithoutContractReader;
  // #241: reader do KPI "Despesas por Centro de Custo". memory: fake in-memory (injetável em testes);
  // mysql: reader Drizzle boot-scoped (pool próprio).
  dashboardCostCentersReader: DashboardCostCentersReader;
  // #255: port de leitura do contratado (ADR-0032). memory: injetado ou null; mysql: construído.
  contractorReadPort: ContractorReadPort | null;
  // M2/RN-M2-09/10: valida o caminho da taxonomia contra a árvore do plano (ADR-0051). No driver
  // `memory` nasce VAZIO — sem plano carregado não há caminho válido, e reclassificar é recusado.
  taxonomyPathRead: TaxonomyPathRead;
  // #207/#289: port de leitura do nome de usuário + alçada do aprovador (ADR-0032). memory:
  // injetado ou null; mysql: construído.
  authUserReadPort: (AuthUserReadPort & ApproverAuthorityReadPort) | null;
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
    // #341: costCenterId opcional no seed (nível Centro→Categoria). Centro inválido → descarta (defensivo).
    let costCenterId: CostCenterId.CostCenterId | null = null;
    if (s.costCenterId !== undefined) {
      const ccR = CostCenterId.rehydrate(s.costCenterId);
      if (!ccR.ok) return [];
      costCenterId = ccR.value;
    }
    const r = Category.create({
      id: idR.value,
      name: s.name,
      group: s.group,
      parentId,
      costCenterId,
    });
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

// Seams injetáveis do driver memory (todos read-models do Dashboard/Reports). Injetados em testes HTTP
// com dados determinísticos; default = fake vazio. Agrupados num objeto para não estourar max-params.
type MemoryPoolSeams = Readonly<{
  // #239: injetável em testes (semear via applyPayableEvent); vazio por padrão — em produção quem
  // popula é o worker payable-view-projection (async), não este composition root (ADR-0022).
  payableViewStore?: PayableViewStore;
  // #242: fake vazio por padrão; testes HTTP injetam um reader semeado (Top-5 determinístico).
  suppliersWithoutContractReader?: SuppliersWithoutContractReader;
  // #241: fake vazio por padrão; testes HTTP injetam um reader semeado/capturador (janelas M-1/M-2).
  dashboardCostCentersReader?: DashboardCostCentersReader;
  // #720: fake vazio por padrão; testes HTTP injetam linhas de pré-voo determinísticas.
  remittancePreviewReader?: RemittancePreviewReader;
  // #720: fake vazio por padrão; testes HTTP injetam pagamentos prontos para emitir.
  remittancePaymentReader?: RemittancePaymentReader;
  // #728: in-memory vazio por padrão; testes HTTP injetam um repo semeado (acompanhamento).
  remittanceRepo?: RemittanceRepository;
  // #753: in-memory vazio por padrão; testes HTTP injetam objetos presos.
  vanReturnQuarantine?: VanReturnQuarantineStore;
  // M2: caminhos de taxonomia aceitos. Ausente → nenhum, e reclassificar é recusado.
  taxonomyPaths?: readonly TaxonomyPath[];
}>;

const buildMemoryPools = (
  contractorReadPort: ContractorReadPort | null,
  authUserReadPort: (AuthUserReadPort & ApproverAuthorityReadPort) | null,
  seams: MemoryPoolSeams = {},
): Pools => {
  const payableViewStore = seams.payableViewStore ?? createInMemoryPayableViewStore();
  const suppliersWithoutContractReader =
    seams.suppliersWithoutContractReader ?? createInMemorySuppliersWithoutContractReader();
  const dashboardCostCentersReader =
    seams.dashboardCostCentersReader ?? createInMemoryDashboardCostCentersReader();
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
  // #269: Map de contrapartidas COMPARTILHADO entre o reconRepo e o store — o `confirmCounterpartMatch`
  // muta a contrapartida (→Matched) na mesma unit-of-work da perna de B (paridade da tx atômica do Drizzle).
  const expectedCounterpartMap = new Map<string, ExpectedCounterpart>();
  const reconciliationRepo = createInMemoryReconciliationRepository({
    payables: payableStore,
    statements: statementStore,
    expectedCounterparts: expectedCounterpartMap,
    // M2: os MESMOS stores que o document-repo e o timeline-repo usam — a reclassificação é escrita
    // na mesma unit-of-work da conciliação (paridade in-memory da tx do Drizzle, RN-M2-06).
    documents: documentStore,
    timeline: timelineStore,
  });
  const cedenteStore = createInMemoryCedenteAccountStore();
  // #269: contrapartida esperada (vazia no boot; nasce ao conciliar uma transferência A→B).
  const expectedCounterpartStore = createInMemoryExpectedCounterpartStore(expectedCounterpartMap);
  // Match/sugestão (US2): stores dedicados (vazios no boot; testes semeiam). mysql faz JOIN real.
  const suggestionView = createInMemorySuggestionView();
  const rejectedSuggestionRepo = createInMemoryRejectedSuggestionRepository();
  const periodStore = createInMemoryReconciliationPeriodStore();
  const categoryReader = createInMemoryCategoryReadStore(seededCategories());
  const costCenterReader = createInMemoryCostCenterReadStore(seededCostCenters());
  const programReader = createInMemoryProgramReadStore(seededProgramsStub());
  // Fonte compartilhada `documentStore → LoadedDocument[]` (payableListView e payableSummaryByIdsView
  // derivam da MESMA leitura — evita duplicar a montagem entre os dois pools, #357 W2 refactor).
  const documentSource = (): readonly LoadedDocument[] =>
    [...documentStore.values()].map((e) => ({ ...e.aggregate, version: e.version }));
  return {
    contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
    documentStorage: createInMemorySourceFileStorage(),
    categoryReader,
    costCenterReader,
    programReader,
    repo,
    // Mesmo `documentStore` do `repo` — o title escrito aqui é o que o `findById` lê (#222).
    payableRepo: createInMemoryPayableRepository(documentStore, timelineStore),
    payableListView: createInMemoryPayableListView(documentSource),
    timelineRepo,
    statementRepo,
    payableView,
    reconciliationRepo,
    cedenteStore,
    expectedCounterpartStore,
    // Read-model de fornecedor: in-memory vazio no boot (sem worker de projeção no driver memory).
    // Exposto para que o use-case Nibo (#146) possa invocar `supplierViewStore.get()`.
    supplierViewStore,
    // #146: derivação lazy do JOIN fin_payables × fin_documents via stores compartilhados.
    // Thunk resolve no momento da chamada — stores mudam após seed (padrão: payable-list-view.in-memory).
    payableDocView: createInMemoryPayableDocumentView(() => {
      const rows = [];
      for (const pay of payableStore.values()) {
        const entry = documentStore.get(pay.documentId);
        if (entry === undefined) continue;
        const doc = entry.aggregate.document;
        // Draft: campos opcionais podem ser null; payable não nasce de Draft, mas
        // payableStore pode conter dados de testes — inclui com campos nullable para robustez.
        rows.push({
          payableId: pay.id,
          documentId: pay.documentId,
          // M2/RN-M2-11: o `PayableStore` da conciliação guarda só id/status/valor — o `kind` vem do
          // agregado, onde ele existe. Pai é UM por documento, então comparar com o id do pai é a
          // mesma pergunta que o `fin_payables.kind` responde no JOIN do Drizzle.
          kind: entry.aggregate.payables?.parent.id === pay.id ? 'Parent' : 'Child',
          supplierRef: doc.supplier ?? null,
          documentNumber: doc.documentNumber ?? null,
          dueDate: doc.dueDate ?? null,
          categoryRef: doc.categoryRef ?? null,
          costCenterRef: doc.costCenterRef ?? null,
          // M2 + #268: os 5 níveis, derivados do documento como no JOIN do Drizzle.
          budgetPlanRef: doc.budgetPlanRef ?? null,
          subcategoryRef: doc.subcategoryRef ?? null,
          programRef: doc.programRef ?? null,
          competencia: doc.competencia !== null ? Competencia.toString(doc.competencia) : null,
          payeeKind: doc.payeeKind ?? null,
        });
      }
      return rows;
    }),
    // #357: derivação lazy do JOIN fin_payables × fin_documents × fin_supplier_view via documentStore
    // (payableStore é da conciliação — não veria o payable recém-criado no create; documentStore é
    // onde saveDocument grava). Reusa `derivePayableListItems` (mesmo loop de payableListView acima)
    // + `payableListItemToSummaryRow` — PayableSummaryRow é subset de PayableListItem;
    // supplierName/supplierDocument = null no driver memory (read-model de fornecedor vazio sem
    // worker — mesma nota de payable-list-view.in-memory §toItem).
    payableSummaryByIdsView: createInMemoryPayableSummaryByIdsView(() =>
      derivePayableListItems(documentSource()).map(payableListItemToSummaryRow),
    ),
    // #358: derivação lazy do resumo de documento via documentSource (mesma fonte do payableListView).
    // status cru + supplier null no driver memory (paridade com o grid in-memory `toListItem`).
    documentSummaryByIdsView: createInMemoryDocumentSummaryByIdsView(() =>
      documentSource().map(loadedDocumentToSummaryRow),
    ),
    // #720: no driver memory o pré-voo nasce VAZIO — sem `partners` ligado não há destino de
    // pagamento a compor, e inventar um faria o pré-voo aprovar título que o arquivo recusaria.
    // Teste HTTP injeta um reader semeado pelo seam, como os demais read-models.
    remittancePreviewReader:
      seams.remittancePreviewReader ?? createInMemoryRemittancePreviewReader(),
    remittancePaymentReader:
      seams.remittancePaymentReader ?? createInMemoryRemittancePaymentReader(),
    remittanceRepo: seams.remittanceRepo ?? createInMemoryRemittanceRepository(),
    vanReturnQuarantine: seams.vanReturnQuarantine ?? createInMemoryVanReturnQuarantine(),
    // In-memory: gravar aqui NÃO enfileira pagamento nenhum. É o que permite exercitar a rota de
    // geração em teste sem a menor chance de tocar no bucket real.
    vanStorage: createInMemoryVanStorage(),
    suggestionView,
    rejectedSuggestionRepo,
    periodStore,
    payableViewStore,
    suppliersWithoutContractReader,
    dashboardCostCentersReader,
    contractorReadPort,
    authUserReadPort,
    // M2: fake dos caminhos válidos. Vazio por padrão — o driver `memory` não tem árvore de plano, e
    // aprovar caminho nenhum é o default que faz o teste falhar do lado certo (RN-M2-09).
    taxonomyPathRead: createInMemoryTaxonomyPathRead(seams.taxonomyPaths ?? []),
    shutdown: () => Promise.resolve(),
  };
};

// #62: storage do comprovante no driver mysql — S3 se o env estiver configurado, senão in-memory
// (boot não quebra sem S3; o deploy real provê as credenciais via env/IAM Role).
const buildDocumentStorage = (): SourceFileStoragePort => {
  const s3 = parseAwsS3Env(process.env);
  return s3.ok
    ? createS3SourceFileStorage({ s3: s3.value, keyPrefix: 'financial-documents' })
    : createInMemorySourceFileStorage();
};

// Bucket da VAN — envs `VAN_S3_*` PRÓPRIAS, nunca o singleton `S3_*`: é outro bucket, possivelmente
// em outra conta (ADR-0060).
//
// O que decide o desfecho é `decideVanStorage` (#798), e não mais um ternário sobre `config.ok`:
// ausência de configuração continua degradando para memória — a VAN ainda não subiu, e derrubar o
// boot por isso derrubaria a borda inteira —, mas agora COM aviso, e configuração presente e
// recusada deixa de ser indistinguível dela.
const buildVanStorage = (): VanStoragePort => {
  const decision = decideVanStorage(parseVanS3Env(process.env), process.env);
  switch (decision.kind) {
    case 's3':
      return createS3VanStorage(decision.config);
    case 'memory':
      process.stderr.write(`${decision.warning}\n`);
      return createInMemoryVanStorage();
    case 'refuse':
      // `throw` é o contrato local desta composição para configuração que não permite subir — o
      // irmão logo abaixo (`buildMysqlPools`) faz o mesmo com pool que não abre.
      throw new Error(decision.error);
  }
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
  // #207/#289: port de leitura do nome de usuário + alçada do aprovador (ADR-0032). Injetado tem
  // precedência (testes); o construído abre pool próprio (auth_* no mesmo DB do monólito) e é
  // fechado no shutdown.
  let authUserReadPort: (AuthUserReadPort & ApproverAuthorityReadPort) | null =
    config.authUserReadPort ?? null;
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
  // #242 DASH-F5: reader boot-scoped (pool próprio — molde dos outros readers do Dashboard), aberto
  // por ÚLTIMO → só seu próprio caminho de erro fecha os anteriores. Injetado tem precedência (testes).
  let suppliersWithoutContractReader: SuppliersWithoutContractReader | null =
    config.suppliersWithoutContractReader ?? null;
  let closeSuppliersReader: () => Promise<void> = () => Promise.resolve();
  if (suppliersWithoutContractReader === null) {
    const readerR = await openSuppliersWithoutContractReader({ connectionString: writerUrl });
    if (!readerR.ok) {
      await closeAuthUserPort();
      await closeContractorPort();
      await programsReadPort.close();
      await contractsReadPort.close();
      await handle.close();
      throw new Error(
        `financial-composition: falha ao abrir suppliers-without-contract reader (${readerR.error})`,
      );
    }
    suppliersWithoutContractReader = readerR.value;
    closeSuppliersReader = readerR.value.close;
  }
  // #241 DASH-F1: reader boot-scoped (pool próprio — molde dos outros readers do Dashboard), aberto
  // por ÚLTIMO → só seu próprio caminho de erro fecha os anteriores. Injetado tem precedência (testes).
  let dashboardCostCentersReader: DashboardCostCentersReader | null =
    config.dashboardCostCentersReader ?? null;
  let closeDashboardCostCentersReader: () => Promise<void> = () => Promise.resolve();
  if (dashboardCostCentersReader === null) {
    const readerR = await openDashboardCostCentersReader({ connectionString: writerUrl });
    if (!readerR.ok) {
      await closeSuppliersReader();
      await closeAuthUserPort();
      await closeContractorPort();
      await programsReadPort.close();
      await contractsReadPort.close();
      await handle.close();
      throw new Error(
        `financial-composition: falha ao abrir dashboard-cost-centers reader (${readerR.error})`,
      );
    }
    dashboardCostCentersReader = readerR.value;
    closeDashboardCostCentersReader = readerR.value.close;
  }
  // M2/RN-M2-09/10: read-port do `budget-plans` para validar o CAMINHO da taxonomia no confirm.
  // Boot-scoped (pool próprio — molde de `buildProgramsReadPort`/`buildPartnersReadPort`), aberto por
  // ÚLTIMO → só o seu próprio caminho de erro fecha os anteriores. Injetado tem precedência (testes).
  let budgetPlansReadPort: BudgetPlansReadPort | null = config.budgetPlansReadPort ?? null;
  let closeBudgetPlansPort: () => Promise<void> = () => Promise.resolve();
  if (budgetPlansReadPort === null) {
    const portR = await buildBudgetPlansReadPort({ connectionString: writerUrl });
    if (!portR.ok) {
      await closeDashboardCostCentersReader();
      await closeSuppliersReader();
      await closeAuthUserPort();
      await closeContractorPort();
      await programsReadPort.close();
      await contractsReadPort.close();
      await handle.close();
      throw new Error(
        `financial-composition: falha ao abrir budget-plans read port (${portR.error})`,
      );
    }
    budgetPlansReadPort = portR.value;
    closeBudgetPlansPort = portR.value.close;
  }
  return {
    contractCategorizationReader: contractsReadPort,
    repo: createDrizzleDocumentRepository(handle),
    payableRepo: createDrizzlePayableRepository(handle),
    documentStorage: buildDocumentStorage(),
    payableListView: createDrizzlePayableListView(handle),
    // Leitura da trilha via pool (a escrita é feita dentro da tx do document-repo.save).
    timelineRepo: createDrizzleTimelineRepository(handle),
    statementRepo: createDrizzleBankStatementRepository(handle),
    payableView: createDrizzlePayableReconciliationView(handle),
    reconciliationRepo: createDrizzleReconciliationRepository(handle),
    cedenteStore: createDrizzleCedenteAccountStore(handle),
    expectedCounterpartStore: createDrizzleExpectedCounterpartStore(handle),
    categoryReader: createDrizzleCategoryReadStore(handle),
    costCenterReader: createDrizzleCostCenterReadStore(handle),
    programReader: createProgramsApiReadStore(programsReadPort),
    // Read-model de fornecedor: adaptador Drizzle lê fin_supplier_view (populado pelo worker de projeção).
    // `clock` é criado localmente (mesmo padrão do makeDeps §clock).
    supplierViewStore: createDrizzleSupplierViewStore(handle, ClockReal()),
    // #146: JOIN fin_payables × fin_documents via Drizzle (inArray — suggestion-view.drizzle.ts precedente).
    payableDocView: createDrizzlePayableDocumentView(handle),
    // #357: JOIN fin_payables × fin_documents × fin_supplier_view via Drizzle.
    payableSummaryByIdsView: createDrizzlePayableSummaryByIdsView(handle),
    documentSummaryByIdsView: createDrizzleDocumentSummaryByIdsView(handle),
    // #720: a leitura do favorecido usa a variante que PRESERVA o erro. Se o `partners` não
    // responder, o pré-voo recusa em bloco — degradar aqui faria o operador ler "sem dados
    // bancários" em títulos cujo cadastro está completo, e agir sobre isso.
    remittancePreviewReader: createDrizzleRemittancePreviewReader(handle, (ref) =>
      readPayeeBank(contractorReadPort, ref),
    ),
    remittancePaymentReader: createDrizzleRemittancePaymentReader(handle, (ref) =>
      readPayeeContractor(contractorReadPort, ref),
    ),
    remittanceRepo: createDrizzleRemittanceRepository(handle),
    vanStorage: buildVanStorage(),
    vanReturnQuarantine: createDrizzleVanReturnQuarantineStore(handle),
    // #239: injetado tem precedência (testes); mysql constrói o adapter Drizzle por padrão.
    payableViewStore: config.payableViewStore ?? createDrizzlePayableViewStore(handle, ClockReal()),
    // #242: reader da agregação REP-2 reusado para o Top-5 do Dashboard (aberto acima, boot-scoped).
    suppliersWithoutContractReader,
    // #241: reader do KPI "Despesas por Centro de Custo" (aberto acima, boot-scoped).
    dashboardCostCentersReader,
    suggestionView: createDrizzleSuggestionView(handle),
    rejectedSuggestionRepo: createDrizzleRejectedSuggestionRepository(handle),
    periodStore: createDrizzleReconciliationPeriodStore(handle),
    contractorReadPort,
    authUserReadPort,
    // M2: ACL do caminho da taxonomia — o financeiro fala com o seu próprio port, e o adapter traduz.
    taxonomyPathRead: createBudgetPlansTaxonomyPathRead(budgetPlansReadPort),
    shutdown: async () => {
      await closeBudgetPlansPort();
      await closeDashboardCostCentersReader();
      await closeSuppliersReader();
      await closeAuthUserPort();
      await closeContractorPort();
      await programsReadPort.close();
      await contractsReadPort.close();
      await handle.close();
    },
  };
};

const makeDeps = (pools: Pools, clock: Clock = ClockReal()): FinancialHttpDeps => {
  // #127: NENHUM use-case recebe mais `outbox` — todo evento de domínio do financial é gravado no
  // `fin_outbox` na MESMA tx do agregado/unit-of-work (atomicidade — ADR-0015), via os repos
  // (`save`/`delete`/`confirm`/`confirmManualEntry`/`undo`/`close`). No driver memory cada repo usa
  // um outbox interno (descartável); no mysql → tabela `fin_outbox`. Sem dual-write.
  // #241: o clock (default ClockReal; ClockFixed em testes) é a fonte da referência M-1/M-2 do KPI
  // de Centro de Custo — mantém o domínio `variation.ts` PURO (a referência é INPUT, não o relógio).
  // #289: leitura cross-módulo da alçada do aprovador (auth/public-api). Opt-in — construído só
  // quando o port existe (memory sem injeção: gate de alçada não roda nos use-cases).
  const approverAuthorityReader =
    pools.authUserReadPort !== null
      ? createAuthApproverAuthorityReader(pools.authUserReadPort)
      : undefined;
  // Deps base (repo + clock); os 6 use cases mutantes recebem `clock` para
  // carimbar `occurredAt` das entries da trilha (timeline-recording.ts).
  const deps = {
    cedenteAccountStore: pools.cedenteStore,
    repo: pools.repo,
    payableRepo: pools.payableRepo,
    clock,
    contractCategorizationReader: pools.contractCategorizationReader,
    ...(approverAuthorityReader !== undefined ? { approverAuthorityReader } : {}),
  };
  // Lançamento manual (US5): reaproveitado pelo confirmBatch (1 template × N transações).
  const record = recordManualEntry({
    reconciliationRepo: pools.reconciliationRepo,
    statements: pools.statementRepo,
    cedenteStore: pools.cedenteStore,
    periods: pools.periodStore,
    clock,
    expectedCounterpartStore: pools.expectedCounterpartStore,
  });
  // Sugestões: instância reusada pela rota por-transação (#121) e pelo lote (#174).
  const suggest = suggestMatches({
    statements: pools.statementRepo,
    suggestions: pools.suggestionView,
    rejected: pools.rejectedSuggestionRepo,
  });
  const saveDraftUseCase = saveDraft(deps);
  // const p/ narrow no closure do resolveSupplierByCnpj (método opcional no port). #FIN-OCR-AUTOFILL:
  // só quando o partners está disponível (driver mysql); memory → sem resolução (seleção manual). Um
  // closure compartilhado por ingest (#560) e parse (#580).
  const resolveSupplierId = pools.contractorReadPort?.findSupplierIdByCnpj;
  const resolveSupplierByCnpj =
    resolveSupplierId !== undefined
      ? async (taxId: string) => {
          const r = await resolveSupplierId(taxId);
          return r.ok ? ok(r.value) : err('supplier-resolve-unavailable' as const);
        }
      : undefined;
  return {
    saveDocument: saveDocument(deps),
    saveDraft: saveDraftUseCase,
    ingestDocument: ingestDocument({
      reader: createDocumentReader(),
      storage: pools.documentStorage,
      saveDraft: saveDraftUseCase,
      idGen: DocumentIdVo.generate,
      ...(resolveSupplierByCnpj !== undefined ? { resolveSupplierByCnpj } : {}),
    }),
    parseDocument: parseDocument({
      reader: createDocumentReader(),
      ...(resolveSupplierByCnpj !== undefined ? { resolveSupplierByCnpj } : {}),
    }),
    // O ajuste de VALOR consulta a remessa antes de decidir: título preso é dinheiro em trânsito, e
    // mudar o valor faria o arquivo já enviado divergir do título.
    adjustDocument: adjustDocument({ ...deps, remittances: pools.remittanceRepo }),
    // #162: delega ao próprio `adjustDocument`, então carrega as mesmas deps — inclusive a remessa.
    // Na prática só percorre o caminho leve (dueDate), que não consulta hold.
    bulkUpdateDueDate: bulkUpdateDueDate({ ...deps, remittances: pools.remittanceRepo }),
    approveDocument: approveDocument(deps),
    registerManualPayment: registerManualPayment(deps),
    updatePayableDueDate: updatePayableDueDate(deps), // #270: mesmas deps (repo + clock)
    undoApproval: undoApproval(deps),
    cancelDocument: cancelDocument({ repo: pools.repo }),
    submitDraft: submitDraft(deps),
    findDocumentById: pools.repo.findById,
    downloadSourceFile: pools.documentStorage.download,
    uploadSourceFile: pools.documentStorage.upload,
    removeSourceFile: pools.documentStorage.remove,
    listDocuments: pools.repo.findPaged,
    listPayables: pools.payableListView.findPaged,
    countPayableTitles: pools.payableListView.countByStatus,
    getDocumentTimeline: getDocumentTimeline({ timelineRepo: pools.timelineRepo }),
    importBankStatement: importBankStatement({
      parser: bankStatementParser,
      repo: pools.statementRepo,
      periods: pools.periodStore,
      cedenteStore: pools.cedenteStore,
      clock,
    }),
    deleteBankStatement: deleteBankStatement({
      repo: pools.statementRepo,
      periods: pools.periodStore,
    }),
    listStatementTransactions: pools.statementRepo.listTransactions,
    confirmReconciliation: confirmReconciliation({
      reconciliationRepo: pools.reconciliationRepo,
      payables: pools.payableView,
      statements: pools.statementRepo,
      cedenteStore: pools.cedenteStore,
      periods: pools.periodStore,
      clock,
      // M2: só exercitados quando o body traz `taxonomy`.
      documents: pools.repo,
      payableDocs: pools.payableDocView,
      taxonomyPaths: pools.taxonomyPathRead,
    }),
    undoReconciliation: undoReconciliation({
      reconciliationRepo: pools.reconciliationRepo,
      statements: pools.statementRepo,
      periods: pools.periodStore,
      clock,
      expectedCounterpartStore: pools.expectedCounterpartStore,
    }),
    searchPaidPayables: searchPaidPayables({ payables: pools.payableView }),
    suggestMatches: suggest,
    suggestCounterpartMatches: suggestCounterpartMatches({
      statements: pools.statementRepo,
      expectedCounterpartStore: pools.expectedCounterpartStore,
    }),
    confirmCounterpartMatch: confirmCounterpartMatch({
      statements: pools.statementRepo,
      cedenteStore: pools.cedenteStore,
      periods: pools.periodStore,
      expectedCounterpartStore: pools.expectedCounterpartStore,
      reconciliationRepo: pools.reconciliationRepo,
      clock,
    }),
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
    exportReconciliationNibo: exportReconciliationNibo({
      periodStore: pools.periodStore,
      statements: pools.statementRepo,
      reconciliationRepo: pools.reconciliationRepo,
      payableDocView: pools.payableDocView,
      categoryRead: pools.categoryReader,
      costCenterRead: pools.costCenterReader,
      supplierViewStore: pools.supplierViewStore,
      cedenteStore: pools.cedenteStore,
      niboExporter,
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
    listRecentPaid: pools.payableViewStore.listRecentPaid,
    listTopSuppliersWithoutContract: pools.suppliersWithoutContractReader.listTop,
    // #241: computa as janelas M-1/M-2 do `clock.now()` (motor #237) e chama o reader por-request.
    listDashboardCostCenters: () => {
      const { m1, m2 } = comparisonWindows(clock.now());
      return pools.dashboardCostCentersReader.list({
        m1Start: m1.start,
        m1End: m1.end,
        m2Start: m2.start,
        m2End: m2.end,
      });
    },
    getPayablesSummaryByIds: pools.payableSummaryByIdsView.getPayablesSummaryByIds,
    getDocumentsSummaryByIds: pools.documentSummaryByIdsView.getDocumentsSummaryByIds,
    previewRemittance: previewRemittance({
      preview: pools.remittancePreviewReader,
      // A conta-cedente e o planejador entram porque o pré-voo passou a devolver a composição dos
      // lotes (#804, CA7): a forma de lançamento depende do banco do cedente, e o agrupamento é o
      // MESMO do emissor — o adapter reusa `batchProfileFor`, sem segunda régua.
      cedenteAccounts: pools.cedenteStore,
      batchPlanner: createRemittanceBatchPlanner(),
    }),
    generateRemittance: generateRemittance({
      cedenteAccounts: pools.cedenteStore,
      remittances: pools.remittanceRepo,
      payments: pools.remittancePaymentReader,
      translator: createBradescoMultipagTranslator(),
      storage: pools.vanStorage,
      now: () => clock.now(),
      newRemittanceId: RemittanceIdVo.generate,
      hashContent: sha256Hex,
    }),
    // O MESMO `vanStorage` da geração, e não é detalhe: o descarte decide olhando se o objeto está
    // no bucket, então os dois têm de enxergar o mesmo armazenamento. Dois storages diferentes
    // fariam o descarte concluir "não há arquivo" sobre um bucket em que ele está.
    discardRemittance: discardRemittance({
      remittances: pools.remittanceRepo,
      storage: pools.vanStorage,
      now: () => clock.now(),
    }),
    listRemittances: listRemittances({ remittances: pools.remittanceRepo }),
    getRemittance: getRemittance({ remittances: pools.remittanceRepo }),
    // `sha256Hex` é o MESMO que o generate usa acima para gravar o `contentHash` — se um dia forem
    // duas funções, a conferência do download passa a reprovar todo arquivo íntegro.
    downloadRemittanceFile: downloadRemittanceFile({
      remittances: pools.remittanceRepo,
      storage: pools.vanStorage,
      hashContent: sha256Hex,
    }),
    listVanReturnQuarantine: listVanReturnQuarantine({ quarantine: pools.vanReturnQuarantine }),
    resolvePayeeBank: (ref) => composePayeeBank(pools.contractorReadPort, ref),
    resolveUserName: (id) => resolveUserName(pools.authUserReadPort, id),
    resolveCategoryName: async (ref) => {
      if (ref === null) return null;
      const r = await pools.categoryReader.list();
      if (!r.ok) return null;
      return r.value.find((c) => String(c.id) === ref)?.name ?? null;
    },
    resolveTitleTaxonomy: async (payableId) => {
      const r = await pools.payableDocView.findByPayableIds([payableId]);
      if (!r.ok) return null;
      const row = r.value[0];
      if (row === undefined) return null;
      return {
        programRef: row.programRef,
        budgetPlanRef: row.budgetPlanRef,
        costCenterRef: row.costCenterRef,
        categoryRef: row.categoryRef,
        subcategoryRef: row.subcategoryRef,
      };
    },
    shutdown: pools.shutdown,
  };
};

export const buildFinancialHttpDeps = async (
  config: FinancialCompositionConfig,
): Promise<FinancialHttpDeps> => {
  if (config.driver === 'memory') {
    return makeDeps(
      buildMemoryPools(config.contractorReadPort ?? null, config.authUserReadPort ?? null, {
        ...(config.payableViewStore !== undefined
          ? { payableViewStore: config.payableViewStore }
          : {}),
        ...(config.suppliersWithoutContractReader !== undefined
          ? { suppliersWithoutContractReader: config.suppliersWithoutContractReader }
          : {}),
        ...(config.dashboardCostCentersReader !== undefined
          ? { dashboardCostCentersReader: config.dashboardCostCentersReader }
          : {}),
        ...(config.remittancePreviewReader !== undefined
          ? { remittancePreviewReader: config.remittancePreviewReader }
          : {}),
        ...(config.remittancePaymentReader !== undefined
          ? { remittancePaymentReader: config.remittancePaymentReader }
          : {}),
        ...(config.remittanceRepo !== undefined ? { remittanceRepo: config.remittanceRepo } : {}),
        ...(config.vanReturnQuarantine !== undefined
          ? { vanReturnQuarantine: config.vanReturnQuarantine }
          : {}),
        ...(config.taxonomyPaths !== undefined ? { taxonomyPaths: config.taxonomyPaths } : {}),
      }),
      config.clock,
    );
  }

  if (config.writerUrl === undefined || config.writerUrl.length === 0) {
    throw new Error('financial-composition: driver mysql exige writerUrl');
  }
  return makeDeps(await buildMysqlPools(config), config.clock);
};
