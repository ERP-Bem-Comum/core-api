/**
 * EventDelivery do consumer de projeção de payables (#235/#307) — vive no COMPOSITION ROOT
 * (`src/workers/`, fora dos módulos): cola o evento lido do `fin_outbox` (financial) ao read-model
 * `fin_payable_view` (`applyPayableEvent`, via public-api). Genérico sobre o `runLoop`/`EventDelivery`
 * de `shared/outbox`. Payload OPACO — o `applyPayableEvent` desserializa/valida internamente.
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { EventDelivery, RowToProcessed, DeliveryError } from '#src/shared/outbox/index.ts';
import { deliveryUnavailable } from '#src/shared/outbox/index.ts';
import { applyPayableEvent } from '#src/modules/financial/public-api/index.ts';
import type { PayableViewStore } from '#src/modules/financial/public-api/index.ts';

/** Mensagem opaca extraída da row do `fin_outbox` (sem desserializar o evento de domínio). */
export type PayableProjectionMessage = Readonly<{ eventType: string; payload: string }>;

export const rowToMessage: RowToProcessed<PayableProjectionMessage> = (row) =>
  ok({ eventType: row.eventType, payload: row.payload });

export const createPayableProjectionDelivery = (
  store: PayableViewStore,
): EventDelivery<PayableProjectionMessage> => ({
  consumerId: 'financial-payable-view',
  deliver: async (message): Promise<Result<void, DeliveryError>> => {
    const applied = await applyPayableEvent({ store })(message);
    if (applied.ok) return ok(undefined);
    // Falha de aplicação (payload inválido / store indisponível) → DeliveryError; o worker genérico
    // incrementa attempts e roteia para a DLQ ao atingir maxAttempts (at-least-once).
    return err(deliveryUnavailable(`apply-payable-event: ${applied.error}`));
  },
});
