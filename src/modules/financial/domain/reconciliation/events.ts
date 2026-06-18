import type { PayableId } from '../shared/payable-id.ts';
import type { StatementTransactionId } from '../statement/statement-transaction-id.ts';
import type { ReconciliationId } from './reconciliation-id.ts';

// Eventos de domínio da conciliação (EN-passado, discriminados por `type`).
// PayableReconciled é emitido POR título; ReconciliationUndone uma vez por desfazimento.

export type PayableReconciled = Readonly<{
  type: 'PayableReconciled';
  payableId: PayableId;
  reconciliationId: ReconciliationId;
  transactionId: StatementTransactionId;
  reconciledValueCents: number;
  occurredAt: Date;
}>;

export type ReconciliationUndone = Readonly<{
  type: 'ReconciliationUndone';
  reconciliationId: ReconciliationId;
  transactionId: StatementTransactionId;
  payableIds: readonly PayableId[];
  occurredAt: Date;
}>;

export type ReconciliationEvent = PayableReconciled | ReconciliationUndone;
