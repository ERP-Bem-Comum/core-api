/**
 * EventDelivery do consumer de projeção de fornecedor (US2 #47) — vive no COMPOSITION ROOT
 * (`src/workers/`, fora dos módulos): cola o evento lido do `par_outbox` (partners) à aplicação
 * no read-model do `financial` (`applySupplierEvent`, via public-api). Nenhum módulo importa o outro
 * (ADR-0006) — a ligação é aqui. Genérico sobre o `runLoop`/`EventDelivery` de `shared/outbox`.
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { EventDelivery, RowToProcessed, DeliveryError } from '#src/shared/outbox/index.ts';
import { deliveryUnavailable } from '#src/shared/outbox/index.ts';
import { applySupplierEvent } from '#src/modules/financial/public-api/index.ts';
import type { SupplierViewStore } from '#src/modules/financial/public-api/index.ts';

/** Mensagem opaca extraída da row do `par_outbox` (sem desserializar evento de domínio). */
export type SupplierProjectionMessage = Readonly<{ eventType: string; payload: string }>;

export const rowToMessage: RowToProcessed<SupplierProjectionMessage> = (row) =>
  ok({ eventType: row.eventType, payload: row.payload });

export const createSupplierProjectionDelivery = (
  store: SupplierViewStore,
): EventDelivery<SupplierProjectionMessage> => ({
  consumerId: 'financial-supplier-view',
  deliver: async (message): Promise<Result<void, DeliveryError>> => {
    const applied = await applySupplierEvent({ store })(message);
    if (applied.ok) return ok(undefined);
    // Falha de aplicação (payload inválido / store indisponível) → DeliveryError; o worker
    // genérico incrementa attempts e roteia para DLQ ao atingir maxAttempts (at-least-once).
    return err(deliveryUnavailable(`apply-supplier-event: ${applied.error}`));
  },
});
