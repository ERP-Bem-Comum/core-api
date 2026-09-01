import type { Result } from '../../../../shared/primitives/result.ts';
import type { Reconciliation } from '../../domain/reconciliation/types.ts';
import type { ReconciliationId } from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationEvent } from '../../domain/reconciliation/events.ts';
import type { StatementTransactionId } from '../../domain/statement/statement-transaction-id.ts';
import type { ExpectedCounterpart } from '../../domain/expected-counterpart/types.ts';
import type { FinancialTimelineEntry } from '../../domain/timeline/types.ts';
import type { FinancialAppendableEvent } from './outbox.ts';

// Port da conciliação (US2/US3/US4). `confirm`/`undo` são unit-of-work ATÔMICOS (uma transação):
// cruzam agregados dentro do mesmo bounded context — conciliação + status do título + status da
// transação — porque a invariante de negócio exige all-or-nothing (issue #123).
//
// `events` (#127): eventos de domínio gravados no `fin_outbox` NA MESMA transação da unit-of-work
//   (atomicidade — ADR-0015; evento durável SSE estado persistido). Opcional/trailing para back-compat
//   (callers sem evento — testes de contrato/seed — passam nada; sem append).
// `document-version-conflict` (M2/#893): a reclassificação escreve `fin_documents`, e essa escrita
// participa do MESMO optimistic lock das outras portas do agregado. Quando a versão lida pelo use
// case já não é a vigente, o desfecho é este slug — e não uma falha de repositório —, porque o
// pedido não está malformado: ele está velho, e refazê-lo sobre o estado atual volta a valer. O
// mapeamento para 409 já existe (`error-mapping.ts`).
export type ReconciliationRepositoryError =
  | 'reconciliation-repository-failure'
  | 'document-version-conflict';

// M2 (RN-M2-03/04/06): a reclassificação de UM documento, já decidida pelo domínio, pronta para ser
// escrita DENTRO da transação da conciliação.
//
// Chega como dado pronto — refs, eventos e trilha — e não como agregado, porque o que falta neste
// ponto é só persistir. O domínio já disse quais são os 5 refs (`reclassifyTaxonomy`), já montou o
// `DocumentSaved` que reprojeta pai e filhos, e já projetou o de→para. Passar o agregado obrigaria
// o adapter a saber montar evento e trilha, que é decisão, não escrita.
//
// ⚠️ Por que isto viaja no `confirm` em vez de um `DocumentRepository.save` antes dele: são duas
// transações distintas, e a RN-M2-06 exige UMA. Salvar o documento primeiro e conciliar depois abre
// a janela em que o título ficou reclassificado sem estar conciliado — exatamente o "órfão em PAGO"
// que a M2 existe para fechar, invertido.
export type ReconciliationReclassification = Readonly<{
  documentId: string;
  // #893 — token do optimistic lock, lido junto com o documento no use case.
  //
  // Sem ele o `UPDATE` afirmaria só "a linha existe", que é uma pré-condição que nada diz sobre o
  // estado em que a decisão foi tomada: um editor concorrente que tivesse lido a mesma versão
  // salvaria depois com `WHERE version = <a mesma>`, casaria, e reescreveria a linha inteira com os
  // refs antigos — a reclassificação sumiria da fonte de verdade E do read-model, sem conflito
  // reportado a ninguém, com a trilha continuando a afirmar o de→para. O critério é a fronteira do
  // AGREGADO, não o caminho de código: reclassificar altera cinco atributos do Root `Document`, e
  // por isso incrementa a versão dele como qualquer outra mutação (Vernon, IDDD p. 483 — "just
  // incrementing the version on our own", quando o incremento automático não acontece).
  expectedVersion: number;
  programRef: string | null;
  budgetPlanRef: string | null;
  costCenterRef: string | null;
  categoryRef: string | null;
  subcategoryRef: string | null;
  // `DocumentSaved` reemitido: é ele que faz a projeção reescrever o `fin_payable_view` do pai E dos
  // filhos com a nova classificação (RN-M2-05). Sem ele a cascata não chega ao relatório.
  events: readonly FinancialAppendableEvent[];
  // RN-M2-07: quem, quando, de→para — no pai e em cada filho. Vazio quando nada mudou (invariante 6).
  timeline: readonly FinancialTimelineEntry[];
}>;

export type ReconciliationRepository = Readonly<{
  // Insere conciliação+itens, `Paid→Reconciled` nos títulos e `Pending→Reconciled` na transação — na mesma tx.
  // `reclassifications` (M2): UPDATE dos 5 refs do documento + outbox + trilha, na MESMA tx.
  confirm: (
    reconciliation: Reconciliation,
    transactionId: StatementTransactionId,
    events?: readonly ReconciliationEvent[],
    reclassifications?: readonly ReconciliationReclassification[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  // Lançamento manual (US5): insere conciliação `ManualEntry` + `fin_manual_entries` e marca a transação
  // `Pending→Reconciled` — mesma tx. SEM título (items vazio). `reconciliation.manualEntry` deve estar setado.
  confirmManualEntry: (
    reconciliation: Reconciliation,
    transactionId: StatementTransactionId,
    events?: readonly ReconciliationEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  // #269/US2: casa a perna de B com a contrapartida esperada — INSERT reconciliação `ManualEntry`/Transfer
  // (perna B) + `Pending→Reconciled` na transação de B + `Pending→Matched` na contrapartida — na MESMA tx
  // (atômico; ManualEntry-espelho da perna A). `events` mistura `ManualEntryRecorded` + `TransferCounterpartMatched`.
  confirmCounterpartMatch: (
    reconciliation: Reconciliation,
    counterpart: ExpectedCounterpart,
    transactionId: StatementTransactionId,
    events?: readonly FinancialAppendableEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  findById: (
    id: ReconciliationId,
  ) => Promise<Result<Reconciliation | null, ReconciliationRepositoryError>>;
  // Lookup reverso (#175): a conciliação ATIVA de uma transação (null se não houver). Destrava o
  // "Desfazer" pós-reload e o modal de detalhes — `fin_reconciliations` tem índice em transaction_id.
  findActiveByTransaction: (
    transactionId: StatementTransactionId,
  ) => Promise<Result<Reconciliation | null, ReconciliationRepositoryError>>;
  // `Active→Undone` (preserva registro), `Reconciled→Paid` nos títulos e `Reconciled→Pending` na transação.
  undo: (
    reconciliation: Reconciliation,
    events?: readonly ReconciliationEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  // #269/US3: desfaz a perna de ORIGEM (A) + trata a contrapartida (Discarded ou reaberta Pending) +
  // desfaz a perna B casada (`matchedLeg`, só no caso Matched) — na MESMA tx (atômico). `origin`/`matchedLeg`
  // já vêm `Undone` do domínio; `Reconciled→Pending` nas transações de A (e B).
  undoCounterpartOrigin: (
    origin: Reconciliation,
    counterpart: ExpectedCounterpart,
    matchedLeg: Reconciliation | null,
    events?: readonly FinancialAppendableEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
  // #450: desfaz a perna de DESTINO (B) casada. Reabre a contrapartida (`reopened`, já Matched→Pending no
  // domínio) + `undone` (perna B, já `Undone`) → `Reconciled→Pending` na transação de B — na MESMA tx
  // (atômico — ADR-0015). Guard de simetria: NÃO cascateia outra conciliação nem toca a origem/perna A.
  undoCounterpartDestination: (
    undone: Reconciliation,
    reopened: ExpectedCounterpart,
    events?: readonly FinancialAppendableEvent[],
  ) => Promise<Result<void, ReconciliationRepositoryError>>;
}>;
