import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { PayableView, PayableViewStatus } from '../../../domain/payable-view/types.ts';
import type {
  PayableViewStore,
  PayableViewStoreError,
} from '../../../application/ports/payable-view-store.ts';

// Adapter in-memory do PayableViewStore (#235) — testes / boot sem DB. Set-based, idempotente.
export const createInMemoryPayableViewStore = (): PayableViewStore => {
  const rows = new Map<string, PayableView>();

  return {
    upsert: async (
      incoming: readonly PayableView[],
    ): Promise<Result<void, PayableViewStoreError>> => {
      for (const row of incoming) {
        // `status` é dono dos eventos de transição: no reprocesso do DocumentSaved preserva o
        // status já projetado (não regride a Open). Linha nova entra com o status do snapshot.
        const existing = rows.get(row.payableId);
        rows.set(row.payableId, existing === undefined ? row : { ...row, status: existing.status });
      }
      return Promise.resolve(ok(undefined));
    },

    updateStatus: async (
      payableIds: readonly string[],
      status: PayableViewStatus,
    ): Promise<Result<void, PayableViewStoreError>> => {
      for (const id of payableIds) {
        const existing = rows.get(id);
        if (existing !== undefined) rows.set(id, { ...existing, status });
      }
      return Promise.resolve(ok(undefined));
    },

    list: async (): Promise<Result<readonly PayableView[], PayableViewStoreError>> =>
      Promise.resolve(ok([...rows.values()])),
  };
};
