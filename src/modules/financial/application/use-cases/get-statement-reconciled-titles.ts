import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type {
  PayableSummaryByIdsView,
  PayableSummaryByIdsViewError,
} from '../ports/payable-summary-by-ids-view.ts';

export type ReconciledTitle = Readonly<{
  payableId: string;
  documentNumber: string | null;
  payeeName: string | null;
  retentionType: string | null;
  dueDate: Date | null;
  reconciledValueCents: number;
}>;

export type TransactionReconciledTitles = Readonly<{
  reconciliationId: string;
  titles: readonly ReconciledTitle[];
}>;

export type GetStatementReconciledTitlesError =
  | ReconciliationRepositoryError
  | PayableSummaryByIdsViewError;

type Deps = Readonly<{
  reconciliationRepo: Pick<ReconciliationRepository, 'findActiveItemsByTransactions'>;
  payableSummary: Pick<PayableSummaryByIdsView, 'getPayablesSummaryByIds'>;
}>;

// Spec 132: os títulos de cada transação do extrato, em duas leituras no total, para a tela e o relatório
// usarem a mesma fonte. Título que o resumo não resolveu continua na lista, com os dados em null: o valor
// conciliado vem da conciliação e não pode sumir do relatório.
export const getStatementReconciledTitles =
  (deps: Deps) =>
  async (
    transactionIds: readonly string[],
  ): Promise<
    Result<ReadonlyMap<string, TransactionReconciledTitles>, GetStatementReconciledTitlesError>
  > => {
    const itemsR = await deps.reconciliationRepo.findActiveItemsByTransactions(transactionIds);
    if (!itemsR.ok) return err(itemsR.error);

    const summaryR = await deps.payableSummary.getPayablesSummaryByIds([
      ...new Set(itemsR.value.map((item) => item.payableId)),
    ]);
    if (!summaryR.ok) return err(summaryR.error);
    const summaryById = new Map(summaryR.value.map((row) => [row.payableId, row]));

    const byTransaction = new Map<string, TransactionReconciledTitles>();
    for (const item of itemsR.value) {
      const summary = summaryById.get(item.payableId);
      const title: ReconciledTitle = {
        payableId: item.payableId,
        documentNumber: summary?.documentNumber ?? null,
        payeeName: summary?.supplierName ?? null,
        retentionType: summary?.retentionType ?? null,
        dueDate: summary?.dueDate ?? null,
        reconciledValueCents: item.reconciledValueCents,
      };
      const current = byTransaction.get(item.transactionId);
      byTransaction.set(item.transactionId, {
        reconciliationId: item.reconciliationId,
        titles: current === undefined ? [title] : [...current.titles, title],
      });
    }
    return ok(byTransaction);
  };
