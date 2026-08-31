import type { Result } from '../../../../shared/primitives/result.ts';
import type { PayableView, PayableViewStatus } from '../../domain/payable-view/types.ts';

// #235: port do read-model de payables. Operações set-based (idempotentes por `payableId`) —
// projeção evento-carregada (ADR-0022). O adapter real (Drizzle) usa SELECT-then-UPSERT.
// `payable-view-row-invalid`: linha do banco com enum fora do contrato (o mapper rejeita — não
// reclassifica silenciosamente; .claude/rules/adapters.md).
export type PayableViewStoreError = 'payable-view-store-unavailable' | 'payable-view-row-invalid';

export type PayableViewStore = Readonly<{
  // #894 — `occurredAt` é o instante do EVENTO que originou estas linhas, e o upsert só sobrescreve
  // quando ele é >= o gravado. Vem como parâmetro, e não dentro de `PayableView`, porque a recência
  // é propriedade do evento (uma por entrega), não de cada título projetado por ele.
  //
  // A entrega é at-least-once (ADR-0022): a mesma linha do outbox volta à fila depois de um
  // `markFailed`, e sem o guard uma reentrega do `DocumentSaved` ANTERIOR à reclassificação
  // reescreveria os 5 refs com os valores velhos — silenciosamente, no read-model de onde os
  // relatórios somam. Molde de `SupplierViewStore` (o guard vive no adapter).
  upsert: (
    rows: readonly PayableView[],
    occurredAt: Date,
  ) => Promise<Result<void, PayableViewStoreError>>;
  updateStatus: (
    payableIds: readonly string[],
    status: PayableViewStatus,
  ) => Promise<Result<void, PayableViewStoreError>>;
  // #239: baixa — status='Paid' + data do pagamento (YYYY-MM-DD).
  markPaid: (
    payableIds: readonly string[],
    paidAt: string,
  ) => Promise<Result<void, PayableViewStoreError>>;
  list: () => Promise<Result<readonly PayableView[], PayableViewStoreError>>;
  // #239: widget "Últimos pagamentos" — Top-N pagos por `paidAt` desc.
  listRecentPaid: (limit: number) => Promise<Result<readonly PayableView[], PayableViewStoreError>>;
}>;
