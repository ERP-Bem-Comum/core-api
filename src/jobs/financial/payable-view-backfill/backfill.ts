// Core do backfill one-shot do read-model de payables (#236) — puro (testável in-memory).
// Upsert em lote no `PayableViewStore`; idempotente (upsert por `payableId`). O upsert preserva
// `status` de linha existente (status é dono dos eventos de transição do worker), então o backfill
// PREENCHE lacunas sem clobberar linhas geridas pelo worker.

import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { PayableView } from '#src/modules/financial/domain/payable-view/types.ts';
import type { PayableViewStore } from '#src/modules/financial/application/ports/payable-view-store.ts';

export type BackfillResult = Readonly<{ applied: number; failed: number }>;

export const backfillPayableViews = async (
  records: readonly PayableView[],
  store: Pick<PayableViewStore, 'upsert'>,
): Promise<Result<BackfillResult, never>> => {
  if (records.length === 0) return ok({ applied: 0, failed: 0 });
  const result = await store.upsert(records);
  return ok(
    result.ok ? { applied: records.length, failed: 0 } : { applied: 0, failed: records.length },
  );
};
