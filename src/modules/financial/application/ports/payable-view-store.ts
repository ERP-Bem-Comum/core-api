import type { Result } from '../../../../shared/primitives/result.ts';
import type { PayableView, PayableViewStatus } from '../../domain/payable-view/types.ts';

// #235: port do read-model de payables. Operações set-based (idempotentes por `payableId`) —
// projeção evento-carregada (ADR-0022). O adapter real (Drizzle) usa SELECT-then-UPSERT.
// `payable-view-row-invalid`: linha do banco com enum fora do contrato (o mapper rejeita — não
// reclassifica silenciosamente; .claude/rules/adapters.md).
export type PayableViewStoreError = 'payable-view-store-unavailable' | 'payable-view-row-invalid';

export type PayableViewStore = Readonly<{
  upsert: (rows: readonly PayableView[]) => Promise<Result<void, PayableViewStoreError>>;
  updateStatus: (
    payableIds: readonly string[],
    status: PayableViewStatus,
  ) => Promise<Result<void, PayableViewStoreError>>;
  list: () => Promise<Result<readonly PayableView[], PayableViewStoreError>>;
}>;
