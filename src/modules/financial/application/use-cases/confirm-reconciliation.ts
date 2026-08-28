import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationId from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationId as ReconciliationIdT } from '../../domain/reconciliation/reconciliation-id.ts';
import { confirm } from '../../domain/reconciliation/reconciliation.ts';
import * as PayableId from '../../domain/shared/payable-id.ts';
import type { ReconciliationError } from '../../domain/reconciliation/errors.ts';
import type {
  Difference,
  ReconciliationAllocation,
  ReconciliationType,
} from '../../domain/reconciliation/types.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { isClosed } from '../../domain/cedente/cedente-account.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  PayableReconciliationView,
  PayableReconciliationViewError,
} from '../ports/payable-reconciliation-view.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import type {
  PayableDocumentView,
  PayableDocumentViewError,
} from '../ports/payable-document-view.ts';
import type { TaxonomyPathError, TaxonomyPathRead } from '../ports/taxonomy-path-read.ts';
import type { ReconciliationReclassification } from '../ports/reconciliation-repository.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentTaxonomy } from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import { projectReclassification } from '../../domain/timeline/projection.ts';
import {
  BudgetPlanRef,
  CategoryRef,
  CostCenterRef,
  ProgramRef,
  SubcategoryRef,
} from '../../domain/shared/refs.ts';
import * as UserRefVO from '../../../../shared/kernel/user-ref.ts';
import { newUuid } from '../../../../shared/utils/id.ts';

export type ConfirmReconciliationDeps = Readonly<{
  reconciliationRepo: Pick<ReconciliationRepository, 'confirm'>;
  payables: Pick<PayableReconciliationView, 'findSnapshotsByIds'>;
  statements: Pick<BankStatementRepository, 'findTransaction'>;
  cedenteStore: Pick<CedenteAccountStore, 'findById'>;
  periods: Pick<ReconciliationPeriodStore, 'isClosed'>;
  clock: Pick<Clock, 'now'>;
  // M2: só usados quando `input.taxonomy` vem. Ficam obrigatórios na `Deps` (e não opcionais) porque
  // um caminho de escrita que se desativa sozinho quando a dependência falta é o tipo de degradação
  // que passa despercebida — o composition root que esquecer de ligá-los não compila.
  documents: Pick<DocumentRepository, 'findById'>;
  payableDocs: Pick<PayableDocumentView, 'findByPayableIds'>;
  taxonomyPaths: TaxonomyPathRead;
}>;

// #141/#247: alocação parcial por título vinda da borda (payableId como string; mapeado p/ branded).
export type ConfirmReconciliationAllocationInput = Readonly<{
  payableId: string;
  reconciledValueCents: number;
}>;

// M2 (RN-M2-03/09): os 5 níveis, sempre os 5. A borda recusa antes de chegar aqui um bloco parcial —
// meio caminho não identifica nó nenhum na árvore do plano, e não há o que validar contra ela.
export type ConfirmReconciliationTaxonomyInput = Readonly<{
  programRef: string;
  budgetPlanRef: string;
  costCenterRef: string;
  categoryRef: string;
  subcategoryRef: string;
}>;

export type ConfirmReconciliationInput = Readonly<{
  transactionId: string;
  payableIds: readonly string[];
  difference?: Difference;
  allocations?: readonly ConfirmReconciliationAllocationInput[];
  // M2: reclassificação opcional aplicada aos títulos LÍQUIDOS desta conciliação, cascateando aos
  // títulos de retenção dos mesmos documentos (decisão A da P.O.). Ausente → conciliação como antes.
  taxonomy?: ConfirmReconciliationTaxonomyInput;
  reconciledBy: string;
}>;

export type ConfirmReconciliationOutput = Readonly<{
  reconciliationId: ReconciliationIdT;
  type: ReconciliationType;
  itemCount: number;
}>;

export type ConfirmReconciliationError =
  | ReconciliationError
  | 'statement-transaction-not-found'
  | 'transaction-already-reconciled'
  | 'cedente-account-not-found'
  | 'account-closed'
  | 'period-closed'
  | 'payable-not-found'
  // M2/RN-M2-09/10 + M2-9/M2-10: os 5 refs não formam um caminho existente e vivo da árvore do plano
  // (folha inexistente, ancestral que não bate, ou nó desativado entre a leitura da tela e o confirm).
  | 'taxonomy-path-invalid'
  // M2/RN-M2-11 + M2-7: a seleção não tem nenhum título LÍQUIDO. O imposto retido é alvo da cascata,
  // nunca fonte — reclassificar por ele deixaria o imposto ditando o projeto do gasto.
  | 'reclassification-requires-parent-payable'
  | DocumentError
  | DocumentRepositoryError
  | PayableDocumentViewError
  | TaxonomyPathError
  | ReconciliationRepositoryError
  | PayableReconciliationViewError
  | BankStatementRepositoryError
  | CedenteAccountStoreError
  | ReconciliationPeriodStoreError;

// #141/#247: traduz a alocação parcial da borda (payableId string) em `ReconciliationAllocation`
// (PayableId branded). Ausente → undefined (conciliação cheia). Id malformado → payable-not-found.
const mapAllocations = (
  raw: readonly ConfirmReconciliationAllocationInput[] | undefined,
): Result<readonly ReconciliationAllocation[] | undefined, 'payable-not-found'> => {
  if (raw === undefined) return ok(undefined);
  const mapped: ReconciliationAllocation[] = [];
  for (const a of raw) {
    const pid = PayableId.rehydrate(a.payableId);
    if (!pid.ok) return err('payable-not-found');
    mapped.push({ payableId: pid.value, reconciledValueCents: a.reconciledValueCents });
  }
  return ok(mapped);
};

// M2/RN-M2-09/10: o caminho pedido tem de ser o caminho REAL da folha na árvore do plano, e a folha
// tem de estar viva. A subcategoria determina os quatro ancestrais univocamente, então validar é
// resolver o caminho pela folha e conferir se os outros quatro batem — não há combinação a enumerar.
//
// O `active` cobre o M2-10 (nó desativado entre a leitura da tela e o confirm): o caminho existe, mas
// gravá-lo produziria classificação morta, que some do relatório sem ninguém entender por quê.
const resolveTaxonomy = async (
  taxonomyPaths: TaxonomyPathRead,
  input: ConfirmReconciliationTaxonomyInput,
): Promise<Result<DocumentTaxonomy, ConfirmReconciliationError>> => {
  const pathR = await taxonomyPaths.findPathBySubcategory(input.subcategoryRef);
  if (!pathR.ok) return err(pathR.error);
  const path = pathR.value;
  if (path?.active !== true) return err('taxonomy-path-invalid');
  if (
    path.categoryRef !== input.categoryRef ||
    path.costCenterRef !== input.costCenterRef ||
    path.budgetPlanRef !== input.budgetPlanRef ||
    path.programRef !== input.programRef
  ) {
    return err('taxonomy-path-invalid');
  }

  // Formato só depois da árvore: a rehydrate confirma o que o plano já afirmou existir. Um ref que a
  // árvore devolve e o branded recusa é corrupção do lado do plano, e o slug diz isso.
  const program = ProgramRef.rehydrate(input.programRef);
  const budgetPlan = BudgetPlanRef.rehydrate(input.budgetPlanRef);
  const costCenter = CostCenterRef.rehydrate(input.costCenterRef);
  const category = CategoryRef.rehydrate(input.categoryRef);
  const subcategory = SubcategoryRef.rehydrate(input.subcategoryRef);
  if (!program.ok || !budgetPlan.ok || !costCenter.ok || !category.ok || !subcategory.ok) {
    return err('taxonomy-path-invalid');
  }

  return ok({
    programRef: program.value,
    budgetPlanRef: budgetPlan.value,
    costCenterRef: costCenter.value,
    categoryRef: category.value,
    subcategoryRef: subcategory.value,
  });
};

// M2/RN-M2-03/04/07: monta a reclassificação de cada documento cujo título LÍQUIDO está na seleção.
//
// A cascata aos filhos não aparece como um laço aqui, e é isso que faz a invariante 2 da spec valer:
// a taxonomia é do documento, e `reclassifyTaxonomy` devolve um `DocumentSaved` cujo snapshot cobre o
// pai E cada filho de retenção. Quem escreve as linhas por título é a projeção do `fin_payable_view`,
// que reescreve todas as do documento de uma vez (RN-M2-05). Não existe estado intermediário em que
// o pai já mudou e o filho não.
const buildReclassifications = async (
  deps: ConfirmReconciliationDeps,
  cmd: Readonly<{
    payableIds: readonly string[];
    taxonomy: DocumentTaxonomy;
    actor: string;
    occurredAt: Date;
  }>,
): Promise<Result<readonly ReconciliationReclassification[], ConfirmReconciliationError>> => {
  const { payableIds, taxonomy, actor, occurredAt } = cmd;
  const rowsR = await deps.payableDocs.findByPayableIds(payableIds);
  if (!rowsR.ok) return err(rowsR.error);

  // RN-M2-11 / M2-7: só o líquido é fonte. Seleção mista (M2-8) reclassifica os documentos dos pais
  // presentes; seleção só de impostos não tem por onde entrar.
  const parents = rowsR.value.filter((r) => r.kind === 'Parent');
  if (parents.length === 0) return err('reclassification-requires-parent-payable');

  // Dois títulos líquidos do MESMO documento não podem gerar duas escritas: a segunda leria o estado
  // já reclassificado e registraria um de→para vazio, enterrando o de→para verdadeiro da primeira.
  const seen = new Set<string>();
  const actorRef = UserRefVO.rehydrate(actor);
  const out: ReconciliationReclassification[] = [];

  for (const row of parents) {
    if (seen.has(row.documentId)) continue;
    seen.add(row.documentId);

    const docIdR = DocumentId.rehydrate(row.documentId);
    if (!docIdR.ok) return err('document-not-found');
    const loadedR = await deps.documents.findById(docIdR.value);
    if (!loadedR.ok) return err(loadedR.error);
    const { document, payables } = loadedR.value;
    // Rascunho não tem título, logo não chega aqui por um `payableId`. O guard existe para estreitar
    // o tipo sem inventar um caminho para um estado que a leitura não produz.
    if (document.status === 'Draft' || payables === null) return err('document-not-found');

    const before = Document.taxonomyOf(document);
    const payableIdR = PayableId.rehydrate(row.payableId);
    if (!payableIdR.ok) return err('payable-not-found');

    const reclassified = Document.reclassifyTaxonomy({
      document,
      payables,
      sourcePayableId: payableIdR.value,
      taxonomy,
    });
    if (!reclassified.ok) return err(reclassified.error);

    out.push({
      documentId: row.documentId,
      programRef: taxonomy.programRef,
      budgetPlanRef: taxonomy.budgetPlanRef,
      costCenterRef: taxonomy.costCenterRef,
      categoryRef: taxonomy.categoryRef,
      subcategoryRef: taxonomy.subcategoryRef,
      events: reclassified.value.events,
      // Invariante 6: mesmo valor → `projectReclassification` devolve [], e a trilha não registra
      // mudança que não houve. O `DocumentSaved` acima segue indo: ele é idempotente por desenho
      // (ADR-0022) e é o que cura uma projeção que tenha ficado para trás.
      timeline: projectReclassification({
        eventId: newUuid(),
        documentId: document.id,
        before,
        after: taxonomy,
        payableIds: [payables.parent.id, ...payables.children.map((child) => child.id)],
        actor: actorRef.ok ? actorRef.value : null,
        occurredAt,
      }),
    });
  }

  return ok(out);
};

// Imperative Shell (validar → fetch → domain → persist → publish). Concilia sob comando explícito (R1):
// guard FR-015 (conta encerrada) → domínio confirm (R2/R3) → unit-of-work atômico no repo → evento.
export const confirmReconciliation =
  (deps: ConfirmReconciliationDeps) =>
  async (
    input: ConfirmReconciliationInput,
  ): Promise<Result<ConfirmReconciliationOutput, ConfirmReconciliationError>> => {
    const txR = await deps.statements.findTransaction(input.transactionId);
    if (!txR.ok) return err(txR.error);
    if (txR.value === null) return err('statement-transaction-not-found');
    const { transaction, debitAccountRef } = txR.value;
    if (transaction.reconciliationStatus !== 'Pending')
      return err('transaction-already-reconciled');

    // Guard FR-015: conta-cedente encerrada não concilia.
    const accId = CedenteAccountId.rehydrate(debitAccountRef);
    if (!accId.ok) return err('cedente-account-not-found');
    const accR = await deps.cedenteStore.findById(accId.value);
    if (!accR.ok) return err(accR.error);
    if (accR.value === null) return err('cedente-account-not-found');
    if (isClosed(accR.value)) return err('account-closed');

    // Guard R18: a data da transação não pode cair em período fechado.
    const periodClosedR = await deps.periods.isClosed(debitAccountRef, transaction.date);
    if (!periodClosedR.ok) return err(periodClosedR.error);
    if (periodClosedR.value) return err('period-closed');

    const snapsR = await deps.payables.findSnapshotsByIds(input.payableIds);
    if (!snapsR.ok) return err(snapsR.error);
    if (snapsR.value.length !== input.payableIds.length) return err('payable-not-found');

    // #141/#247: mapeia a alocação parcial (payableId string → branded). Id malformado → payable-not-found.
    const allocationsR = mapAllocations(input.allocations);
    if (!allocationsR.ok) return err(allocationsR.error);
    const allocations = allocationsR.value;

    // M2: a reclassificação é preparada ANTES do `confirm` do domínio — se o caminho for inválido ou
    // a seleção não tiver título líquido, a conciliação não acontece. Reclassificar é parte do ato,
    // não um efeito posterior que possa falhar sozinho (RN-M2-06).
    const occurredAt = deps.clock.now();
    let reclassifications: readonly ReconciliationReclassification[] = [];
    if (input.taxonomy !== undefined) {
      const taxonomyR = await resolveTaxonomy(deps.taxonomyPaths, input.taxonomy);
      if (!taxonomyR.ok) return err(taxonomyR.error);
      const builtR = await buildReclassifications(deps, {
        payableIds: input.payableIds,
        taxonomy: taxonomyR.value,
        actor: input.reconciledBy,
        occurredAt,
      });
      if (!builtR.ok) return err(builtR.error);
      reclassifications = builtR.value;
    }

    const confirmed = confirm({
      reconciliationId: ReconciliationId.generate(),
      transactionId: transaction.id,
      transactionValueCents: transaction.valueCents,
      payables: snapsR.value,
      ...(input.difference !== undefined ? { difference: input.difference } : {}),
      ...(allocations !== undefined ? { allocations } : {}),
      reconciledBy: input.reconciledBy,
      // O MESMO instante da trilha da reclassificação: os dois fatos são um ato só, e dois `now()`
      // os deixariam com carimbos diferentes na auditoria.
      occurredAt,
    });
    if (!confirmed.ok) return err(confirmed.error);

    const saved = await deps.reconciliationRepo.confirm(
      confirmed.value.reconciliation,
      transaction.id,
      confirmed.value.events,
      reclassifications,
    );
    if (!saved.ok) return err(saved.error);

    return ok({
      reconciliationId: confirmed.value.reconciliation.id,
      type: confirmed.value.reconciliation.type,
      itemCount: confirmed.value.reconciliation.items.length,
    });
  };
