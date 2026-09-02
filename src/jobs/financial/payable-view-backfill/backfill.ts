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
  // #894 — o instante que o backfill carimba como recência das linhas que escreve.
  //
  // O backfill lê a FONTE DE VERDADE (`fin_documents`/`fin_payables`) no momento em que roda, então
  // o que ele escreve é, por construção, o estado mais recente que existe — tem de vencer qualquer
  // evento já enfileirado. Daí o `now` do chamador: evento anterior a esta execução não a desfaz, e
  // evento posterior a ela continua valendo, que é a ordem correta nos dois sentidos.
  occurredAt: Date,
): Promise<Result<BackfillResult, never>> => {
  if (records.length === 0) return ok({ applied: 0, failed: 0 });
  const result = await store.upsert(records, occurredAt);
  return ok(
    result.ok ? { applied: records.length, failed: 0 } : { applied: 0, failed: records.length },
  );
};
