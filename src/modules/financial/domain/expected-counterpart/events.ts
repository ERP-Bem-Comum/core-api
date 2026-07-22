import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { Movement } from '#src/modules/financial/domain/statement/types.ts';
import type { ExpectedCounterpartId } from './expected-counterpart-id.ts';

// Eventos de domínio da contrapartida esperada (#269, EN-passado, discriminados por `type`). Produtor
// via outbox (ADR-0015). Payloads serializáveis (VARCHAR, sem JSON nativo) — `valueCents` como number
// (convenção de cents do módulo: bigint(mode:'number')), Branded IDs → string no wire.

export type TransferCounterpartCreated = Readonly<{
  type: 'TransferCounterpartCreated';
  counterpartId: ExpectedCounterpartId;
  destinationAccountRef: CedenteAccountId;
  originAccountRef: CedenteAccountId;
  originReconciliationRef: ReconciliationId;
  valueCents: number;
  movement: Movement;
  expectedDate: Date;
}>;

export type TransferCounterpartMatched = Readonly<{
  type: 'TransferCounterpartMatched';
  counterpartId: ExpectedCounterpartId;
  matchedTransactionRef: string;
  destinationAccountRef: CedenteAccountId;
}>;

export type TransferCounterpartDiscarded = Readonly<{
  type: 'TransferCounterpartDiscarded';
  counterpartId: ExpectedCounterpartId;
  reason: 'undo-origin' | 'manual';
}>;

export type ExpectedCounterpartEvent =
  | TransferCounterpartCreated
  | TransferCounterpartMatched
  | TransferCounterpartDiscarded;
