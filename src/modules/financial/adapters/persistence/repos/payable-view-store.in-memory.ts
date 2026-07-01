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
        // `status` e `paidAt` são donos dos eventos de transição: no reprocesso do DocumentSaved
        // preserva o já projetado (não regride status nem apaga paidAt). Linha nova: status do
        // snapshot + paidAt null.
        const existing = rows.get(row.payableId);
        rows.set(
          row.payableId,
          existing === undefined
            ? row
            : { ...row, status: existing.status, paidAt: existing.paidAt },
        );
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

    markPaid: async (
      payableIds: readonly string[],
      paidAt: string,
    ): Promise<Result<void, PayableViewStoreError>> => {
      for (const id of payableIds) {
        const existing = rows.get(id);
        if (existing !== undefined) rows.set(id, { ...existing, status: 'Paid', paidAt });
      }
      return Promise.resolve(ok(undefined));
    },

    list: async (): Promise<Result<readonly PayableView[], PayableViewStoreError>> =>
      Promise.resolve(ok([...rows.values()])),

    listRecentPaid: async (
      limit: number,
    ): Promise<Result<readonly PayableView[], PayableViewStoreError>> =>
      Promise.resolve(
        ok(
          [...rows.values()]
            .filter((r) => r.status === 'Paid' && r.paidAt !== null)
            .sort((a, b) => (b.paidAt ?? '').localeCompare(a.paidAt ?? ''))
            .slice(0, limit),
        ),
      ),
  };
};
