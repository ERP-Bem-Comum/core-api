/**
 * EventDelivery da projeção de contagem de contratos (US6b) — vive no COMPOSITION ROOT
 * (`src/workers/`): cola o evento lido do `ctr_outbox` (contracts) à aplicação no read-model do
 * `partners` (`applyContractCountEvent`, via public-api). Nenhum módulo importa o outro (ADR-0006)
 * — a ligação é aqui. Genérico sobre o `runLoop`/`EventDelivery` de `shared/outbox`.
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { EventDelivery, RowToProcessed, DeliveryError } from '#src/shared/outbox/index.ts';
import { deliveryUnavailable } from '#src/shared/outbox/index.ts';
import { applyContractCountEvent } from '#src/modules/partners/public-api/index.ts';
import type {
  ContractCountStore,
  ContractCountMessage,
} from '#src/modules/partners/public-api/index.ts';

export const rowToMessage: RowToProcessed<ContractCountMessage> = (row) =>
  ok({
    eventId: row.eventId,
    eventType: row.eventType,
    schemaVersion: row.schemaVersion,
    payload: row.payload,
    occurredAt: row.occurredAt,
  });

export const createContractCountProjectionDelivery = (
  store: ContractCountStore,
): EventDelivery<ContractCountMessage> => ({
  consumerId: 'partners-contract-count',
  deliver: async (message): Promise<Result<void, DeliveryError>> => {
    const applied = await applyContractCountEvent({ store })(message);
    if (applied.ok) return ok(undefined);
    // Falha de aplicação (decode / store indisponível) → DeliveryError; o worker genérico
    // incrementa attempts e roteia para DLQ ao atingir maxAttempts (at-least-once).
    return err(deliveryUnavailable(`apply-contract-count-event: ${applied.error}`));
  },
});
