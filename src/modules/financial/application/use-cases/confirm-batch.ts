import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { ReconciliationId } from '../../domain/reconciliation/reconciliation-id.ts';
import type { ManualEntryType } from '../../domain/reconciliation/types.ts';
import type { recordManualEntry, RecordManualEntryError } from './record-manual-entry.ts';

// Conciliação em lote (US5): aplica UM template de lançamento manual a N transações selecionadas pelo
// operador (sem auto-detecção — D-A1). Compõe `recordManualEntry`; para na primeira falha (best-effort).
export type ConfirmBatchDeps = Readonly<{
  record: ReturnType<typeof recordManualEntry>;
}>;

export type ConfirmBatchInput = Readonly<{
  transactionIds: readonly string[];
  template: Readonly<{
    type: ManualEntryType;
    supplierRef?: string;
    categoryRef?: string;
    costCenterRef?: string;
    programRef?: string;
    description?: string;
  }>;
  reconciledBy: string;
}>;

// Cada transação que falhou (estado/guard) com o slug — o lote NÃO aborta por uma falha isolada.
export type ConfirmBatchFailure = Readonly<{
  transactionId: string;
  error: RecordManualEntryError;
}>;

export type ConfirmBatchOutput = Readonly<{
  created: number;
  reconciliationIds: readonly ReconciliationId[];
  failed: readonly ConfirmBatchFailure[];
}>;

// `empty-batch` é o único erro de topo (entrada vazia). Falhas por transação são REPORTADAS em `failed`
// (best-effort com relatório) — cada manual entry é unit-of-work atômico individual, então não há
// estado parcial silencioso: o caller vê exatamente o que passou e o que falhou.
export type ConfirmBatchError = 'empty-batch';

export const confirmBatch =
  (deps: ConfirmBatchDeps) =>
  async (input: ConfirmBatchInput): Promise<Result<ConfirmBatchOutput, ConfirmBatchError>> => {
    if (input.transactionIds.length === 0) return err('empty-batch');

    const reconciliationIds: ReconciliationId[] = [];
    const failed: ConfirmBatchFailure[] = [];
    for (const transactionId of input.transactionIds) {
      const r = await deps.record({
        transactionId,
        type: input.template.type,
        ...(input.template.supplierRef !== undefined
          ? { supplierRef: input.template.supplierRef }
          : {}),
        ...(input.template.categoryRef !== undefined
          ? { categoryRef: input.template.categoryRef }
          : {}),
        ...(input.template.costCenterRef !== undefined
          ? { costCenterRef: input.template.costCenterRef }
          : {}),
        ...(input.template.programRef !== undefined
          ? { programRef: input.template.programRef }
          : {}),
        ...(input.template.description !== undefined
          ? { description: input.template.description }
          : {}),
        reconciledBy: input.reconciledBy,
      });
      if (r.ok) reconciliationIds.push(r.value.reconciliationId);
      else failed.push({ transactionId, error: r.error });
    }

    return ok({ created: reconciliationIds.length, reconciliationIds, failed });
  };
