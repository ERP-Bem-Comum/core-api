import type { Result } from '../../../../shared/primitives/result.ts';
import type { PayableView, PayableViewStatus } from '../../domain/payable-view/types.ts';

// #235: port do read-model de payables. Operações set-based (idempotentes por `payableId`) —
// projeção evento-carregada (ADR-0022). O adapter real (Drizzle) usa SELECT-then-UPSERT.
export type PayableViewStoreError = 'payable-view-store-unavailable';

export type PayableViewStore = Readonly<{
  upsert: (rows: readonly PayableView[]) => Promise<Result<void, PayableViewStoreError>>;
  updateStatus: (
    payableIds: readonly string[],
    status: PayableViewStatus,
  ) => Promise<Result<void, PayableViewStoreError>>;
  list: () => Promise<Result<readonly PayableView[], PayableViewStoreError>>;
}>;
